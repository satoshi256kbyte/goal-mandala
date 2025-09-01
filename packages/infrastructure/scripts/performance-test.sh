#!/bin/bash

# フロントエンド配信環境 パフォーマンステストスクリプト
# 使用方法: ./performance-test.sh [environment] [options]

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# デフォルト設定
ENVIRONMENT="${1:-dev}"
VERBOSE="${VERBOSE:-false}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-table}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
TEST_DURATION="${TEST_DURATION:-60}"

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

# ヘルプ表示
show_help() {
    cat << EOF
フロントエンド配信環境 パフォーマンステストスクリプト

使用方法:
    $0 [environment] [options]

引数:
    environment     テスト対象環境 (dev, stg, prod) [デフォルト: dev]

環境変数オプション:
    VERBOSE=true           詳細ログを出力
    OUTPUT_FORMAT=json     出力形式 (table, json, csv) [デフォルト: table]
    CONCURRENT_USERS=10    同時接続ユーザー数 [デフォルト: 10]
    TEST_DURATION=60       テスト実行時間（秒） [デフォルト: 60]

例:
    $0 dev                          # 開発環境のパフォーマンステスト
    $0 prod                         # 本番環境のパフォーマンステスト
    VERBOSE=true $0 stg             # 詳細ログ付きでステージング環境テスト
    OUTPUT_FORMAT=json $0 prod      # JSON形式で本番環境テスト

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

    if ! command -v bc &> /dev/null; then
        missing_tools+=("bc")
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
        error "先にインフラをデプロイしてください"
        exit 1
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

    # 値の検証
    if [[ -z "${WEBSITE_URL}" ]] || [[ "${WEBSITE_URL}" == "null" ]]; then
        error "ウェブサイトURLを取得できませんでした"
        exit 1
    fi

    log "テスト対象URL: ${WEBSITE_URL}"
    log "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
}

# 基本的な接続テスト
test_basic_connectivity() {
    log "基本接続テストを実行中..."

    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "${WEBSITE_URL}")

    if [[ "${response_code}" != "200" ]]; then
        error "基本接続テストが失敗しました: HTTP ${response_code}"
        return 1
    fi

    log "基本接続テスト: 成功 (HTTP ${response_code})"
    return 0
}

# レスポンス時間テスト
test_response_time() {
    log "レスポンス時間テストを実行中..."

    local test_urls=(
        "${WEBSITE_URL}/"
        "${WEBSITE_URL}/index.html"
        "${WEBSITE_URL}/assets/app.js"
        "${WEBSITE_URL}/assets/app.css"
    )

    local total_time=0
    local test_count=0
    local results=()

    for url in "${test_urls[@]}"; do
        verbose "テスト中: ${url}"

        local response_time
        local http_code
        local size_download

        # curlでレスポンス時間を測定
        local curl_output
        curl_output=$(curl -w "%{time_total},%{http_code},%{size_download}" -o /dev/null -s "${url}")

        IFS=',' read -r response_time http_code size_download <<< "${curl_output}"

        if [[ "${http_code}" == "200" ]]; then
            total_time=$(echo "${total_time} + ${response_time}" | bc)
            test_count=$((test_count + 1))

            results+=("${url}:${response_time}:${http_code}:${size_download}")
            verbose "  レスポンス時間: ${response_time}s, サイズ: ${size_download} bytes"
        else
            error "  失敗: HTTP ${http_code}"
        fi
    done

    if [[ ${test_count} -gt 0 ]]; then
        local average_time
        average_time=$(echo "scale=3; ${total_time} / ${test_count}" | bc)
        log "平均レスポンス時間: ${average_time}s (${test_count}件のテスト)"

        # 結果を保存
        RESPONSE_TIME_RESULTS=("${results[@]}")
        AVERAGE_RESPONSE_TIME="${average_time}"
    else
        error "レスポンス時間テストが全て失敗しました"
        return 1
    fi
}

# キャッシュ効率テスト
test_cache_efficiency() {
    log "キャッシュ効率テストを実行中..."

    local test_url="${WEBSITE_URL}/assets/app.js"
    local cache_hits=0
    local total_requests=10

    for i in $(seq 1 ${total_requests}); do
        verbose "キャッシュテスト ${i}/${total_requests}"

        local headers
        headers=$(curl -I -s "${test_url}")

        # X-Cache ヘッダーを確認
        if echo "${headers}" | grep -q "X-Cache.*Hit"; then
            cache_hits=$((cache_hits + 1))
        fi

        # 短い間隔でリクエスト
        sleep 0.1
    done

    local cache_hit_rate
    cache_hit_rate=$(echo "scale=2; ${cache_hits} * 100 / ${total_requests}" | bc)

    log "キャッシュヒット率: ${cache_hit_rate}% (${cache_hits}/${total_requests})"
    CACHE_HIT_RATE="${cache_hit_rate}"
}

# 負荷テスト
test_load_performance() {
    log "負荷テストを実行中..."
    log "同時ユーザー数: ${CONCURRENT_USERS}, 実行時間: ${TEST_DURATION}秒"

    local temp_dir
    temp_dir=$(mktemp -d)
    local results_file="${temp_dir}/load_test_results.txt"

    # 並列でcurlを実行
    local pids=()
    local start_time
    start_time=$(date +%s)

    for i in $(seq 1 "${CONCURRENT_USERS}"); do
        (
            local user_requests=0
            local user_errors=0
            local end_time=$((start_time + TEST_DURATION))

            while [[ $(date +%s) -lt ${end_time} ]]; do
                local response_code
                response_code=$(curl -s -o /dev/null -w "%{http_code}" "${WEBSITE_URL}")

                if [[ "${response_code}" == "200" ]]; then
                    user_requests=$((user_requests + 1))
                else
                    user_errors=$((user_errors + 1))
                fi

                sleep 0.1
            done

            echo "${user_requests},${user_errors}" >> "${results_file}"
        ) &
        pids+=($!)
    done

    # 全てのプロセスの完了を待機
    for pid in "${pids[@]}"; do
        wait "${pid}"
    done

    # 結果の集計
    local total_requests=0
    local total_errors=0

    while IFS=',' read -r requests errors; do
        total_requests=$((total_requests + requests))
        total_errors=$((total_errors + errors))
    done < "${results_file}"

    local requests_per_second
    requests_per_second=$(echo "scale=2; ${total_requests} / ${TEST_DURATION}" | bc)

    local error_rate
    if [[ ${total_requests} -gt 0 ]]; then
        error_rate=$(echo "scale=2; ${total_errors} * 100 / (${total_requests} + ${total_errors})" | bc)
    else
        error_rate="0"
    fi

    log "負荷テスト結果:"
    log "  総リクエスト数: ${total_requests}"
    log "  エラー数: ${total_errors}"
    log "  リクエスト/秒: ${requests_per_second}"
    log "  エラー率: ${error_rate}%"

    # 結果を保存
    LOAD_TEST_REQUESTS="${total_requests}"
    LOAD_TEST_ERRORS="${total_errors}"
    LOAD_TEST_RPS="${requests_per_second}"
    LOAD_TEST_ERROR_RATE="${error_rate}"

    # 一時ディレクトリの削除
    rm -rf "${temp_dir}"
}

# セキュリティヘッダーテスト
test_security_headers() {
    log "セキュリティヘッダーテストを実行中..."

    local headers
    headers=$(curl -I -s "${WEBSITE_URL}")

    local security_score=0
    local max_score=5
    local security_results=()

    # HSTS ヘッダーの確認
    if echo "${headers}" | grep -qi "strict-transport-security"; then
        security_score=$((security_score + 1))
        security_results+=("HSTS:OK")
        verbose "  ✅ HSTS header found"
    else
        security_results+=("HSTS:MISSING")
        verbose "  ❌ HSTS header missing"
    fi

    # X-Content-Type-Options の確認
    if echo "${headers}" | grep -qi "x-content-type-options"; then
        security_score=$((security_score + 1))
        security_results+=("ContentTypeOptions:OK")
        verbose "  ✅ X-Content-Type-Options header found"
    else
        security_results+=("ContentTypeOptions:MISSING")
        verbose "  ❌ X-Content-Type-Options header missing"
    fi

    # X-Frame-Options の確認
    if echo "${headers}" | grep -qi "x-frame-options"; then
        security_score=$((security_score + 1))
        security_results+=("FrameOptions:OK")
        verbose "  ✅ X-Frame-Options header found"
    else
        security_results+=("FrameOptions:MISSING")
        verbose "  ❌ X-Frame-Options header missing"
    fi

    # Referrer-Policy の確認
    if echo "${headers}" | grep -qi "referrer-policy"; then
        security_score=$((security_score + 1))
        security_results+=("ReferrerPolicy:OK")
        verbose "  ✅ Referrer-Policy header found"
    else
        security_results+=("ReferrerPolicy:MISSING")
        verbose "  ❌ Referrer-Policy header missing"
    fi

    # Content-Security-Policy の確認
    if echo "${headers}" | grep -qi "content-security-policy"; then
        security_score=$((security_score + 1))
        security_results+=("CSP:OK")
        verbose "  ✅ Content-Security-Policy header found"
    else
        security_results+=("CSP:MISSING")
        verbose "  ❌ Content-Security-Policy header missing"
    fi

    local security_percentage
    security_percentage=$(echo "scale=2; ${security_score} * 100 / ${max_score}" | bc)

    log "セキュリティヘッダースコア: ${security_score}/${max_score} (${security_percentage}%)"

    # 結果を保存
    SECURITY_SCORE="${security_score}"
    SECURITY_MAX_SCORE="${max_score}"
    SECURITY_RESULTS=("${security_results[@]}")
}

# CloudWatchメトリクス取得
get_cloudwatch_metrics() {
    log "CloudWatchメトリクスを取得中..."

    local end_time
    local start_time
    end_time=$(date --iso-8601)
    start_time=$(date -d "1 hour ago" --iso-8601)

    # リクエスト数の取得
    local requests
    requests=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name Requests \
        --dimensions Name=DistributionId,Value="${CLOUDFRONT_DISTRIBUTION_ID}" \
        --start-time "${start_time}" \
        --end-time "${end_time}" \
        --period 3600 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")

    # エラー率の取得
    local error_rate
    error_rate=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name 4xxErrorRate \
        --dimensions Name=DistributionId,Value="${CLOUDFRONT_DISTRIBUTION_ID}" \
        --start-time "${start_time}" \
        --end-time "${end_time}" \
        --period 3600 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")

    # キャッシュヒット率の取得
    local cache_hit_rate_cw
    cache_hit_rate_cw=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name CacheHitRate \
        --dimensions Name=DistributionId,Value="${CLOUDFRONT_DISTRIBUTION_ID}" \
        --start-time "${start_time}" \
        --end-time "${end_time}" \
        --period 3600 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")

    log "CloudWatchメトリクス (過去1時間):"
    log "  リクエスト数: ${requests}"
    log "  4xxエラー率: ${error_rate}%"
    log "  キャッシュヒット率: ${cache_hit_rate_cw}%"

    # 結果を保存
    CLOUDWATCH_REQUESTS="${requests}"
    CLOUDWATCH_ERROR_RATE="${error_rate}"
    CLOUDWATCH_CACHE_HIT_RATE="${cache_hit_rate_cw}"
}

# 結果の出力
output_results() {
    local timestamp
    timestamp=$(date --iso-8601)

    case "${OUTPUT_FORMAT}" in
        "json")
            output_json_results "${timestamp}"
            ;;
        "csv")
            output_csv_results "${timestamp}"
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
  "performance": {
    "average_response_time": ${AVERAGE_RESPONSE_TIME:-0},
    "cache_hit_rate": ${CACHE_HIT_RATE:-0},
    "load_test": {
      "total_requests": ${LOAD_TEST_REQUESTS:-0},
      "total_errors": ${LOAD_TEST_ERRORS:-0},
      "requests_per_second": ${LOAD_TEST_RPS:-0},
      "error_rate": ${LOAD_TEST_ERROR_RATE:-0}
    }
  },
  "security": {
    "score": ${SECURITY_SCORE:-0},
    "max_score": ${SECURITY_MAX_SCORE:-5},
    "percentage": $(echo "scale=2; ${SECURITY_SCORE:-0} * 100 / ${SECURITY_MAX_SCORE:-5}" | bc)
  },
  "cloudwatch": {
    "requests": ${CLOUDWATCH_REQUESTS:-0},
    "error_rate": ${CLOUDWATCH_ERROR_RATE:-0},
    "cache_hit_rate": ${CLOUDWATCH_CACHE_HIT_RATE:-0}
  }
}
EOF
}

# CSV形式での結果出力
output_csv_results() {
    local timestamp="$1"

    echo "timestamp,environment,avg_response_time,cache_hit_rate,load_requests,load_errors,load_rps,load_error_rate,security_score,security_max,cw_requests,cw_error_rate,cw_cache_hit_rate"
    echo "${timestamp},${ENVIRONMENT},${AVERAGE_RESPONSE_TIME:-0},${CACHE_HIT_RATE:-0},${LOAD_TEST_REQUESTS:-0},${LOAD_TEST_ERRORS:-0},${LOAD_TEST_RPS:-0},${LOAD_TEST_ERROR_RATE:-0},${SECURITY_SCORE:-0},${SECURITY_MAX_SCORE:-5},${CLOUDWATCH_REQUESTS:-0},${CLOUDWATCH_ERROR_RATE:-0},${CLOUDWATCH_CACHE_HIT_RATE:-0}"
}

# テーブル形式での結果出力
output_table_results() {
    local timestamp="$1"

    echo ""
    echo "=== パフォーマンステスト結果 ==="
    echo "実行日時: ${timestamp}"
    echo "環境: ${ENVIRONMENT}"
    echo "テスト対象: ${WEBSITE_URL}"
    echo ""
    echo "【パフォーマンス】"
    echo "  平均レスポンス時間: ${AVERAGE_RESPONSE_TIME:-N/A}秒"
    echo "  キャッシュヒット率: ${CACHE_HIT_RATE:-N/A}%"
    echo ""
    echo "【負荷テスト】"
    echo "  総リクエスト数: ${LOAD_TEST_REQUESTS:-N/A}"
    echo "  エラー数: ${LOAD_TEST_ERRORS:-N/A}"
    echo "  リクエスト/秒: ${LOAD_TEST_RPS:-N/A}"
    echo "  エラー率: ${LOAD_TEST_ERROR_RATE:-N/A}%"
    echo ""
    echo "【セキュリティ】"
    echo "  セキュリティスコア: ${SECURITY_SCORE:-N/A}/${SECURITY_MAX_SCORE:-5}"
    echo ""
    echo "【CloudWatchメトリクス】"
    echo "  リクエスト数 (過去1時間): ${CLOUDWATCH_REQUESTS:-N/A}"
    echo "  4xxエラー率: ${CLOUDWATCH_ERROR_RATE:-N/A}%"
    echo "  キャッシュヒット率: ${CLOUDWATCH_CACHE_HIT_RATE:-N/A}%"
    echo ""

    # パフォーマンス評価
    echo "【評価】"

    # レスポンス時間の評価
    if [[ -n "${AVERAGE_RESPONSE_TIME:-}" ]]; then
        if (( $(echo "${AVERAGE_RESPONSE_TIME} < 1.0" | bc -l) )); then
            echo "  ✅ レスポンス時間: 優秀 (<1.0秒)"
        elif (( $(echo "${AVERAGE_RESPONSE_TIME} < 3.0" | bc -l) )); then
            echo "  ⚠️  レスポンス時間: 良好 (<3.0秒)"
        else
            echo "  ❌ レスポンス時間: 改善が必要 (≥3.0秒)"
        fi
    fi

    # キャッシュヒット率の評価
    if [[ -n "${CACHE_HIT_RATE:-}" ]]; then
        if (( $(echo "${CACHE_HIT_RATE} >= 90" | bc -l) )); then
            echo "  ✅ キャッシュ効率: 優秀 (≥90%)"
        elif (( $(echo "${CACHE_HIT_RATE} >= 80" | bc -l) )); then
            echo "  ⚠️  キャッシュ効率: 良好 (≥80%)"
        else
            echo "  ❌ キャッシュ効率: 改善が必要 (<80%)"
        fi
    fi

    # エラー率の評価
    if [[ -n "${LOAD_TEST_ERROR_RATE:-}" ]]; then
        if (( $(echo "${LOAD_TEST_ERROR_RATE} < 1.0" | bc -l) )); then
            echo "  ✅ エラー率: 優秀 (<1%)"
        elif (( $(echo "${LOAD_TEST_ERROR_RATE} < 5.0" | bc -l) )); then
            echo "  ⚠️  エラー率: 良好 (<5%)"
        else
            echo "  ❌ エラー率: 改善が必要 (≥5%)"
        fi
    fi

    # セキュリティスコアの評価
    if [[ -n "${SECURITY_SCORE:-}" ]]; then
        local security_percentage
        security_percentage=$(echo "scale=0; ${SECURITY_SCORE} * 100 / ${SECURITY_MAX_SCORE:-5}" | bc)

        if [[ ${security_percentage} -ge 80 ]]; then
            echo "  ✅ セキュリティ: 優秀 (≥80%)"
        elif [[ ${security_percentage} -ge 60 ]]; then
            echo "  ⚠️  セキュリティ: 良好 (≥60%)"
        else
            echo "  ❌ セキュリティ: 改善が必要 (<60%)"
        fi
    fi

    echo ""
}

# メイン処理
main() {
    log "パフォーマンステストを開始します"
    log "環境: ${ENVIRONMENT}"

    check_dependencies
    get_stack_outputs

    # 基本接続テスト
    if ! test_basic_connectivity; then
        error "基本接続テストが失敗したため、テストを中止します"
        exit 1
    fi

    # 各種テストの実行
    test_response_time
    test_cache_efficiency
    test_load_performance
    test_security_headers
    get_cloudwatch_metrics

    # 結果の出力
    output_results

    log "パフォーマンステストが完了しました"
}

# エラーハンドリング
trap 'error "パフォーマンステスト中にエラーが発生しました"; exit 1' ERR

# メイン処理の実行
main "$@"
