#!/bin/bash

# フロントエンド配信環境 ヘルスチェックスクリプト
# 使用方法: ./health-check.sh [environment] [options]

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# デフォルト設定
ENVIRONMENT="${1:-dev}"
VERBOSE="${VERBOSE:-false}"
CHECK_DEEP="${CHECK_DEEP:-false}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-table}"

# ログ関数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

verbose() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] VERBOSE: $*"
    fi
}

success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*"
}

warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $*"
}

failure() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $*"
}

# ヘルプ表示
show_help() {
    cat << EOF
フロントエンド配信環境 ヘルスチェックスクリプト

使用方法:
    $0 [environment] [options]

引数:
    environment     チェック対象環境 (dev, stg, prod) [デフォルト: dev]

環境変数オプション:
    VERBOSE=true           詳細ログを出力
    CHECK_DEEP=true        詳細なヘルスチェックを実行
    OUTPUT_FORMAT=json     出力形式 (table, json) [デフォルト: table]

例:
    $0 dev                          # 開発環境の基本ヘルスチェック
    $0 prod                         # 本番環境の基本ヘルスチェック
    CHECK_DEEP=true $0 prod         # 本番環境の詳細ヘルスチェック
    OUTPUT_FORMAT=json $0 stg       # JSON形式でステージング環境チェック

EOF
}

# 引数チェック
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# 必要なツールの確認
check_dependencies() {
    local missing_tools=()

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "以下のツールが必要です: ${missing_tools[*]}"
        exit 1
    fi
}

# CDKスタック情報の取得
get_stack_outputs() {
    local stack_name="GoalMandalaFrontendStack-${ENVIRONMENT}"

    verbose "CDKスタック情報を取得中: ${stack_name}"

    # スタックの存在確認
    if ! aws cloudformation describe-stacks --stack-name "${stack_name}" &> /dev/null; then
        error "CDKスタックが見つかりません: ${stack_name}"
        return 1
    fi

    # スタック出力の取得
    local outputs
    outputs=$(aws cloudformation describe-stacks \
        --stack-name "${stack_name}" \
        --query 'Stacks[0].Outputs' \
        --output json)

    # 必要な値を抽出
    WEBSITE_URL=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="WebsiteUrl") | .OutputValue')
    CLOUDFRONT_DISTRIBUTION_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="DistributionId") | .OutputValue')
    S3_BUCKET_NAME=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')

    # 値の検証
    if [[ -z "${WEBSITE_URL}" ]] || [[ "${WEBSITE_URL}" == "null" ]]; then
        error "ウェブサイトURLを取得できませんでした"
        return 1
    fi

    verbose "ウェブサイトURL: ${WEBSITE_URL}"
    verbose "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
    verbose "S3バケット: ${S3_BUCKET_NAME}"

    return 0
}

# 基本接続チェック
check_basic_connectivity() {
    log "基本接続チェックを実行中..."

    local response_code
    local response_time

    # curlでレスポンスコードと時間を取得
    local curl_output
    curl_output=$(curl -w "%{http_code},%{time_total}" -o /dev/null -s --max-time 10 "${WEBSITE_URL}" || echo "000,0")

    IFS=',' read -r response_code response_time <<< "${curl_output}"

    if [[ "${response_code}" == "200" ]]; then
        success "基本接続: 正常 (HTTP ${response_code}, ${response_time}s)"
        BASIC_CONNECTIVITY_STATUS="OK"
        BASIC_CONNECTIVITY_TIME="${response_time}"
        return 0
    else
        failure "基本接続: 失敗 (HTTP ${response_code})"
        BASIC_CONNECTIVITY_STATUS="FAILED"
        BASIC_CONNECTIVITY_TIME="${response_time}"
        return 1
    fi
}

# SSL証明書チェック
check_ssl_certificate() {
    log "SSL証明書チェックを実行中..."

    local domain
    domain=$(echo "${WEBSITE_URL}" | sed 's|https://||' | sed 's|/.*||')

    # SSL証明書の情報を取得
    local cert_info
    cert_info=$(openssl s_client -connect "${domain}:443" -servername "${domain}" -verify_return_error < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")

    if [[ -z "${cert_info}" ]]; then
        failure "SSL証明書: 取得失敗"
        SSL_CERTIFICATE_STATUS="FAILED"
        return 1
    fi

    # 有効期限の確認
    local not_after
    not_after=$(echo "${cert_info}" | grep "notAfter" | cut -d= -f2)

    if [[ -n "${not_after}" ]]; then
        local expiry_epoch
        local current_epoch
        local days_until_expiry

        expiry_epoch=$(date -d "${not_after}" +%s 2>/dev/null || echo "0")
        current_epoch=$(date +%s)
        days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

        if [[ ${days_until_expiry} -gt 30 ]]; then
            success "SSL証明書: 正常 (有効期限まで${days_until_expiry}日)"
            SSL_CERTIFICATE_STATUS="OK"
            SSL_CERTIFICATE_DAYS="${days_until_expiry}"
        elif [[ ${days_until_expiry} -gt 7 ]]; then
            warning "SSL証明書: 期限が近い (有効期限まで${days_until_expiry}日)"
            SSL_CERTIFICATE_STATUS="WARNING"
            SSL_CERTIFICATE_DAYS="${days_until_expiry}"
        else
            failure "SSL証明書: 期限切れまたは期限が近い (有効期限まで${days_until_expiry}日)"
            SSL_CERTIFICATE_STATUS="CRITICAL"
            SSL_CERTIFICATE_DAYS="${days_until_expiry}"
            return 1
        fi
    else
        failure "SSL証明書: 有効期限を取得できませんでした"
        SSL_CERTIFICATE_STATUS="FAILED"
        return 1
    fi

    return 0
}

# セキュリティヘッダーチェック
check_security_headers() {
    log "セキュリティヘッダーチェックを実行中..."

    local headers
    headers=$(curl -I -s --max-time 10 "${WEBSITE_URL}" || echo "")

    if [[ -z "${headers}" ]]; then
        failure "セキュリティヘッダー: ヘッダー取得失敗"
        SECURITY_HEADERS_STATUS="FAILED"
        return 1
    fi

    local security_score=0
    local max_score=5
    local missing_headers=()

    # HSTS ヘッダーの確認
    if echo "${headers}" | grep -qi "strict-transport-security"; then
        security_score=$((security_score + 1))
        verbose "  ✅ HSTS header found"
    else
        missing_headers+=("HSTS")
        verbose "  ❌ HSTS header missing"
    fi

    # X-Content-Type-Options の確認
    if echo "${headers}" | grep -qi "x-content-type-options"; then
        security_score=$((security_score + 1))
        verbose "  ✅ X-Content-Type-Options header found"
    else
        missing_headers+=("X-Content-Type-Options")
        verbose "  ❌ X-Content-Type-Options header missing"
    fi

    # X-Frame-Options の確認
    if echo "${headers}" | grep -qi "x-frame-options"; then
        security_score=$((security_score + 1))
        verbose "  ✅ X-Frame-Options header found"
    else
        missing_headers+=("X-Frame-Options")
        verbose "  ❌ X-Frame-Options header missing"
    fi

    # Referrer-Policy の確認
    if echo "${headers}" | grep -qi "referrer-policy"; then
        security_score=$((security_score + 1))
        verbose "  ✅ Referrer-Policy header found"
    else
        missing_headers+=("Referrer-Policy")
        verbose "  ❌ Referrer-Policy header missing"
    fi

    # Content-Security-Policy の確認
    if echo "${headers}" | grep -qi "content-security-policy"; then
        security_score=$((security_score + 1))
        verbose "  ✅ Content-Security-Policy header found"
    else
        missing_headers+=("Content-Security-Policy")
        verbose "  ❌ Content-Security-Policy header missing"
    fi

    local security_percentage
    security_percentage=$(( security_score * 100 / max_score ))

    if [[ ${security_percentage} -ge 80 ]]; then
        success "セキュリティヘッダー: 良好 (${security_score}/${max_score})"
        SECURITY_HEADERS_STATUS="OK"
    elif [[ ${security_percentage} -ge 60 ]]; then
        warning "セキュリティヘッダー: 改善推奨 (${security_score}/${max_score})"
        SECURITY_HEADERS_STATUS="WARNING"
    else
        failure "セキュリティヘッダー: 不十分 (${security_score}/${max_score})"
        SECURITY_HEADERS_STATUS="FAILED"
    fi

    SECURITY_HEADERS_SCORE="${security_score}"
    SECURITY_HEADERS_MAX="${max_score}"
    SECURITY_HEADERS_MISSING=("${missing_headers[@]}")

    return 0
}

# CloudFrontステータスチェック
check_cloudfront_status() {
    log "CloudFrontステータスチェックを実行中..."

    local distribution_status
    distribution_status=$(aws cloudfront get-distribution \
        --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --query 'Distribution.Status' \
        --output text 2>/dev/null || echo "UNKNOWN")

    if [[ "${distribution_status}" == "Deployed" ]]; then
        success "CloudFront: 正常デプロイ済み"
        CLOUDFRONT_STATUS="OK"
    elif [[ "${distribution_status}" == "InProgress" ]]; then
        warning "CloudFront: デプロイ進行中"
        CLOUDFRONT_STATUS="IN_PROGRESS"
    else
        failure "CloudFront: 異常状態 (${distribution_status})"
        CLOUDFRONT_STATUS="FAILED"
        return 1
    fi

    return 0
}

# S3バケットチェック
check_s3_bucket() {
    log "S3バケットチェックを実行中..."

    # バケットの存在確認
    if ! aws s3 ls "s3://${S3_BUCKET_NAME}/" &> /dev/null; then
        failure "S3バケット: アクセス不可"
        S3_BUCKET_STATUS="FAILED"
        return 1
    fi

    # index.htmlの存在確認
    if aws s3 ls "s3://${S3_BUCKET_NAME}/index.html" &> /dev/null; then
        success "S3バケット: 正常 (index.html存在)"
        S3_BUCKET_STATUS="OK"
    else
        failure "S3バケット: index.htmlが見つかりません"
        S3_BUCKET_STATUS="FAILED"
        return 1
    fi

    return 0
}

# 詳細チェック（オプション）
check_deep_health() {
    if [[ "${CHECK_DEEP}" != "true" ]]; then
        return 0
    fi

    log "詳細ヘルスチェックを実行中..."

    # 主要ファイルの存在確認
    local test_files=(
        "/index.html"
        "/assets/app.js"
        "/assets/app.css"
    )

    local file_check_results=()
    local failed_files=0

    for file in "${test_files[@]}"; do
        local file_url="${WEBSITE_URL}${file}"
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${file_url}" || echo "000")

        if [[ "${response_code}" == "200" ]]; then
            verbose "  ✅ ${file}: 正常 (HTTP ${response_code})"
            file_check_results+=("${file}:OK")
        else
            verbose "  ❌ ${file}: 異常 (HTTP ${response_code})"
            file_check_results+=("${file}:FAILED")
            failed_files=$((failed_files + 1))
        fi
    done

    if [[ ${failed_files} -eq 0 ]]; then
        success "詳細チェック: 全ファイル正常"
        DEEP_CHECK_STATUS="OK"
    else
        failure "詳細チェック: ${failed_files}個のファイルに問題"
        DEEP_CHECK_STATUS="FAILED"
    fi

    DEEP_CHECK_RESULTS=("${file_check_results[@]}")

    # CloudWatchメトリクスの確認
    local error_rate
    error_rate=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name 4xxErrorRate \
        --dimensions Name=DistributionId,Value="${CLOUDFRONT_DISTRIBUTION_ID}" \
        --start-time $(date -d "1 hour ago" --iso-8601) \
        --end-time $(date --iso-8601) \
        --period 3600 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")

    if [[ "${error_rate}" == "None" ]] || [[ -z "${error_rate}" ]]; then
        error_rate="0"
    fi

    CLOUDWATCH_ERROR_RATE="${error_rate}"

    if (( $(echo "${error_rate} < 5.0" | bc -l 2>/dev/null || echo "1") )); then
        verbose "  ✅ エラー率: 正常 (${error_rate}%)"
    else
        verbose "  ⚠️  エラー率: 高い (${error_rate}%)"
    fi

    return 0
}

# 結果の出力
output_results() {
    local timestamp
    timestamp=$(date --iso-8601)

    case "${OUTPUT_FORMAT}" in
        "json")
            output_json_results "${timestamp}"
            ;;
        "table"|*)
            output_table_results "${timestamp}"
            ;;
    esac
}

# JSON形式での結果出力
output_json_results() {
    local timestamp="$1"

    cat << EOF
{
  "timestamp": "${timestamp}",
  "environment": "${ENVIRONMENT}",
  "website_url": "${WEBSITE_URL}",
  "overall_status": "${OVERALL_STATUS}",
  "checks": {
    "basic_connectivity": {
      "status": "${BASIC_CONNECTIVITY_STATUS:-UNKNOWN}",
      "response_time": ${BASIC_CONNECTIVITY_TIME:-0}
    },
    "ssl_certificate": {
      "status": "${SSL_CERTIFICATE_STATUS:-UNKNOWN}",
      "days_until_expiry": ${SSL_CERTIFICATE_DAYS:-0}
    },
    "security_headers": {
      "status": "${SECURITY_HEADERS_STATUS:-UNKNOWN}",
      "score": ${SECURITY_HEADERS_SCORE:-0},
      "max_score": ${SECURITY_HEADERS_MAX:-5}
    },
    "cloudfront": {
      "status": "${CLOUDFRONT_STATUS:-UNKNOWN}"
    },
    "s3_bucket": {
      "status": "${S3_BUCKET_STATUS:-UNKNOWN}"
    }
  }
}
EOF
}

# テーブル形式での結果出力
output_table_results() {
    local timestamp="$1"

    echo ""
    echo "=== フロントエンド配信環境 ヘルスチェック結果 ==="
    echo "実行日時: ${timestamp}"
    echo "環境: ${ENVIRONMENT}"
    echo "対象URL: ${WEBSITE_URL}"
    echo ""
    echo "【チェック結果】"

    # 基本接続
    echo -n "  基本接続: "
    case "${BASIC_CONNECTIVITY_STATUS:-UNKNOWN}" in
        "OK") echo "✅ 正常 (${BASIC_CONNECTIVITY_TIME}s)" ;;
        "FAILED") echo "❌ 失敗" ;;
        *) echo "❓ 不明" ;;
    esac

    # SSL証明書
    echo -n "  SSL証明書: "
    case "${SSL_CERTIFICATE_STATUS:-UNKNOWN}" in
        "OK") echo "✅ 正常 (有効期限まで${SSL_CERTIFICATE_DAYS}日)" ;;
        "WARNING") echo "⚠️  期限が近い (有効期限まで${SSL_CERTIFICATE_DAYS}日)" ;;
        "CRITICAL") echo "❌ 期限切れ間近 (有効期限まで${SSL_CERTIFICATE_DAYS}日)" ;;
        "FAILED") echo "❌ 失敗" ;;
        *) echo "❓ 不明" ;;
    esac

    # セキュリティヘッダー
    echo -n "  セキュリティヘッダー: "
    case "${SECURITY_HEADERS_STATUS:-UNKNOWN}" in
        "OK") echo "✅ 良好 (${SECURITY_HEADERS_SCORE}/${SECURITY_HEADERS_MAX})" ;;
        "WARNING") echo "⚠️  改善推奨 (${SECURITY_HEADERS_SCORE}/${SECURITY_HEADERS_MAX})" ;;
        "FAILED") echo "❌ 不十分 (${SECURITY_HEADERS_SCORE}/${SECURITY_HEADERS_MAX})" ;;
        *) echo "❓ 不明" ;;
    esac

    # CloudFront
    echo -n "  CloudFront: "
    case "${CLOUDFRONT_STATUS:-UNKNOWN}" in
        "OK") echo "✅ 正常" ;;
        "IN_PROGRESS") echo "⚠️  デプロイ中" ;;
        "FAILED") echo "❌ 異常" ;;
        *) echo "❓ 不明" ;;
    esac

    # S3バケット
    echo -n "  S3バケット: "
    case "${S3_BUCKET_STATUS:-UNKNOWN}" in
        "OK") echo "✅ 正常" ;;
        "FAILED") echo "❌ 異常" ;;
        *) echo "❓ 不明" ;;
    esac

    # 詳細チェック結果（実行された場合）
    if [[ "${CHECK_DEEP}" == "true" ]]; then
        echo -n "  詳細チェック: "
        case "${DEEP_CHECK_STATUS:-UNKNOWN}" in
            "OK") echo "✅ 正常" ;;
            "FAILED") echo "❌ 異常" ;;
            *) echo "❓ 不明" ;;
        esac

        if [[ -n "${CLOUDWATCH_ERROR_RATE:-}" ]]; then
            echo "  エラー率 (過去1時間): ${CLOUDWATCH_ERROR_RATE}%"
        fi
    fi

    echo ""
    echo "【総合評価】"
    case "${OVERALL_STATUS}" in
        "HEALTHY") echo "✅ 正常: 全てのチェックが成功しました" ;;
        "WARNING") echo "⚠️  警告: 一部に改善が必要な項目があります" ;;
        "UNHEALTHY") echo "❌ 異常: 重要な問題が検出されました" ;;
        *) echo "❓ 不明: チェックが完了していません" ;;
    esac

    echo ""
}

# 総合ステータスの判定
determine_overall_status() {
    local failed_checks=0
    local warning_checks=0

    # 各チェックの結果を評価
    case "${BASIC_CONNECTIVITY_STATUS:-UNKNOWN}" in
        "FAILED") failed_checks=$((failed_checks + 1)) ;;
    esac

    case "${SSL_CERTIFICATE_STATUS:-UNKNOWN}" in
        "FAILED"|"CRITICAL") failed_checks=$((failed_checks + 1)) ;;
        "WARNING") warning_checks=$((warning_checks + 1)) ;;
    esac

    case "${SECURITY_HEADERS_STATUS:-UNKNOWN}" in
        "FAILED") failed_checks=$((failed_checks + 1)) ;;
        "WARNING") warning_checks=$((warning_checks + 1)) ;;
    esac

    case "${CLOUDFRONT_STATUS:-UNKNOWN}" in
        "FAILED") failed_checks=$((failed_checks + 1)) ;;
        "IN_PROGRESS") warning_checks=$((warning_checks + 1)) ;;
    esac

    case "${S3_BUCKET_STATUS:-UNKNOWN}" in
        "FAILED") failed_checks=$((failed_checks + 1)) ;;
    esac

    if [[ "${CHECK_DEEP}" == "true" ]]; then
        case "${DEEP_CHECK_STATUS:-UNKNOWN}" in
            "FAILED") failed_checks=$((failed_checks + 1)) ;;
        esac
    fi

    # 総合ステータスの決定
    if [[ ${failed_checks} -gt 0 ]]; then
        OVERALL_STATUS="UNHEALTHY"
        return 1
    elif [[ ${warning_checks} -gt 0 ]]; then
        OVERALL_STATUS="WARNING"
        return 0
    else
        OVERALL_STATUS="HEALTHY"
        return 0
    fi
}

# メイン処理
main() {
    log "フロントエンド配信環境のヘルスチェックを開始します"
    log "環境: ${ENVIRONMENT}"

    check_dependencies

    if ! get_stack_outputs; then
        error "スタック情報の取得に失敗しました"
        exit 1
    fi

    # 各種チェックの実行
    check_basic_connectivity
    check_ssl_certificate
    check_security_headers
    check_cloudfront_status
    check_s3_bucket
    check_deep_health

    # 総合ステータスの判定
    determine_overall_status
    local exit_code=$?

    # 結果の出力
    output_results

    if [[ ${exit_code} -eq 0 ]]; then
        log "ヘルスチェックが完了しました: ${OVERALL_STATUS}"
    else
        log "ヘルスチェックで問題が検出されました: ${OVERALL_STATUS}"
    fi

    exit ${exit_code}
}

# エラーハンドリング
trap 'error "ヘルスチェック中にエラーが発生しました"; exit 1' ERR

# メイン処理の実行
main "$@"
