#!/bin/bash

# デプロイヘルパースクリプト
# 使用方法: ./deploy-helper.sh [command] [environment] [options]

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# デフォルト設定
COMMAND="${1:-help}"
ENVIRONMENT="${2:-dev}"
VERBOSE="${VERBOSE:-false}"

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
デプロイヘルパースクリプト

使用方法:
    $0 [command] [environment] [options]

コマンド:
    help                    このヘルプを表示
    status                  デプロイ状況を確認
    info                    環境情報を表示
    build                   フロントエンドをビルド
    deploy                  フロントエンドをデプロイ
    invalidate              CloudFrontキャッシュを無効化
    full-deploy             フルデプロイ（ビルド + デプロイ + 無効化）
    rollback                前のバージョンにロールバック
    logs                    デプロイログを表示
    cleanup                 古いファイルをクリーンアップ

環境:
    dev                     開発環境
    stg                     ステージング環境
    prod                    本番環境

環境変数オプション:
    VERBOSE=true           詳細ログを出力
    DRY_RUN=true           実際の操作を行わない（確認のみ）
    FORCE=true             確認をスキップして強制実行

例:
    $0 status dev                   # 開発環境の状況確認
    $0 deploy stg                   # ステージング環境にデプロイ
    $0 full-deploy prod             # 本番環境にフルデプロイ
    VERBOSE=true $0 info dev        # 詳細ログ付きで環境情報表示
    DRY_RUN=true $0 deploy stg      # ステージング環境にドライラン

EOF
}

# 環境変数の検証
validate_environment() {
    case "${ENVIRONMENT}" in
        dev|stg|prod)
            log "対象環境: ${ENVIRONMENT}"
            ;;
        *)
            error "無効な環境: ${ENVIRONMENT}"
            error "有効な環境: dev, stg, prod"
            exit 1
            ;;
    esac
}

# 必要なツールの確認
check_dependencies() {
    local missing_tools=()

    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi

    if ! command -v pnpm &> /dev/null; then
        missing_tools+=("pnpm")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "以下のツールが必要です: ${missing_tools[*]}"
        exit 1
    fi
}

# AWS認証情報の確認
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS認証情報が設定されていません"
        error "aws configure または環境変数を設定してください"
        exit 1
    fi

    local account_id
    account_id=$(aws sts get-caller-identity --query Account --output text)
    verbose "AWS アカウント: ${account_id}"
}

# スタック情報の取得
get_stack_info() {
    local stack_name="GoalMandalaFrontendStack-${ENVIRONMENT}"

    verbose "CDKスタック情報を取得中: ${stack_name}"

    # スタックの存在確認
    if ! aws cloudformation describe-stacks --stack-name "${stack_name}" &> /dev/null; then
        echo "スタックが見つかりません: ${stack_name}"
        echo "先にインフラをデプロイしてください: pnpm run deploy:${ENVIRONMENT}"
        return 1
    fi

    # スタック出力の取得
    local outputs
    outputs=$(aws cloudformation describe-stacks \
        --stack-name "${stack_name}" \
        --query 'Stacks[0].Outputs' \
        --output json)

    # 必要な値を抽出
    S3_BUCKET_NAME=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
    CLOUDFRONT_DISTRIBUTION_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
    WEBSITE_URL=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="WebsiteUrl") | .OutputValue')

    return 0
}

# デプロイ状況の確認
cmd_status() {
    log "デプロイ状況を確認中..."

    if ! get_stack_info; then
        return 1
    fi

    echo "=== デプロイ状況 ==="
    echo "環境: ${ENVIRONMENT}"
    echo "S3バケット: ${S3_BUCKET_NAME}"
    echo "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
    echo "ウェブサイトURL: ${WEBSITE_URL}"
    echo ""

    # S3バケットの状況確認
    echo "=== S3バケット状況 ==="
    local object_count
    object_count=$(aws s3 ls "s3://${S3_BUCKET_NAME}/" --recursive | wc -l)
    echo "オブジェクト数: ${object_count}"

    if [[ "${object_count}" -gt 0 ]]; then
        echo "最新ファイル:"
        aws s3 ls "s3://${S3_BUCKET_NAME}/" --recursive --human-readable | tail -5
    else
        echo "バケットは空です"
    fi
    echo ""

    # CloudFrontディストリビューションの状況確認
    echo "=== CloudFront状況 ==="
    local distribution_status
    distribution_status=$(aws cloudfront get-distribution \
        --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --query 'Distribution.Status' \
        --output text)
    echo "ディストリビューション状態: ${distribution_status}"

    # 進行中の無効化確認
    local invalidations
    invalidations=$(aws cloudfront list-invalidations \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --query 'InvalidationList.Items[?Status==`InProgress`]' \
        --output json)

    local in_progress_count
    in_progress_count=$(echo "${invalidations}" | jq length)

    if [[ "${in_progress_count}" -gt 0 ]]; then
        echo "進行中の無効化: ${in_progress_count} 件"
        if [[ "${VERBOSE}" == "true" ]]; then
            echo "${invalidations}" | jq -r '.[] | "  - ID: \(.Id), 作成日時: \(.CreateTime)"'
        fi
    else
        echo "進行中の無効化: なし"
    fi
}

# 環境情報の表示
cmd_info() {
    log "環境情報を表示中..."

    if ! get_stack_info; then
        return 1
    fi

    echo "=== 環境情報 ==="
    echo "環境: ${ENVIRONMENT}"
    echo "リージョン: $(aws configure get region)"
    echo "アカウントID: $(aws sts get-caller-identity --query Account --output text)"
    echo ""

    echo "=== インフラ情報 ==="
    echo "S3バケット: ${S3_BUCKET_NAME}"
    echo "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
    echo "ウェブサイトURL: ${WEBSITE_URL}"
    echo ""

    # 設定ファイルの情報
    local config_file="${PROJECT_ROOT}/packages/infrastructure/config/${ENVIRONMENT}.json"
    if [[ -f "${config_file}" ]]; then
        echo "=== 設定情報 ==="
        echo "設定ファイル: ${config_file}"

        if command -v jq &> /dev/null; then
            local domain_name
            domain_name=$(jq -r '.frontend.domainName // "なし"' "${config_file}")
            echo "カスタムドメイン: ${domain_name}"

            local monitoring_enabled
            monitoring_enabled=$(jq -r '.frontend.monitoring.enableAccessLogs // false' "${config_file}")
            echo "アクセスログ: ${monitoring_enabled}"

            local cost_monitoring
            cost_monitoring=$(jq -r '.frontend.monitoring.enableCostMonitoring // false' "${config_file}")
            echo "コスト監視: ${cost_monitoring}"
        fi
    fi
}

# フロントエンドビルド
cmd_build() {
    log "フロントエンドをビルド中..."

    cd "${PROJECT_ROOT}"

    # 依存関係のインストール
    verbose "依存関係をインストール中..."
    pnpm install --frozen-lockfile

    # フロントエンドのビルド
    verbose "フロントエンドをビルド中..."
    pnpm --filter frontend build

    # ビルド結果の確認
    local dist_dir="${PROJECT_ROOT}/packages/frontend/dist"
    if [[ ! -d "${dist_dir}" ]]; then
        error "ビルド結果が見つかりません: ${dist_dir}"
        exit 1
    fi

    local file_count
    file_count=$(find "${dist_dir}" -type f | wc -l)
    log "ビルド完了: ${file_count} ファイル生成"
}

# フロントエンドデプロイ
cmd_deploy() {
    log "フロントエンドをデプロイ中..."

    "${SCRIPT_DIR}/deploy-frontend.sh" "${ENVIRONMENT}"
}

# CloudFrontキャッシュ無効化
cmd_invalidate() {
    log "CloudFrontキャッシュを無効化中..."

    "${SCRIPT_DIR}/invalidate-cloudfront.sh" "${ENVIRONMENT}"
}

# フルデプロイ
cmd_full_deploy() {
    log "フルデプロイを開始します"

    cmd_build
    cmd_deploy
    cmd_invalidate

    log "フルデプロイが完了しました"
}

# ロールバック
cmd_rollback() {
    log "ロールバック機能は未実装です"
    error "現在、ロールバック機能は利用できません"
    error "手動でGitの前のコミットに戻してから再デプロイしてください"
    exit 1
}

# ログ表示
cmd_logs() {
    log "デプロイログを表示中..."

    # CloudWatchログの表示（実装予定）
    log "CloudWatchログ機能は未実装です"
    echo "GitHub Actionsのログを確認してください:"
    echo "https://github.com/your-org/goal-mandala/actions"
}

# クリーンアップ
cmd_cleanup() {
    log "クリーンアップを実行中..."

    cd "${PROJECT_ROOT}"

    # ビルドファイルのクリーンアップ
    if [[ -d "packages/frontend/dist" ]]; then
        rm -rf packages/frontend/dist
        log "フロントエンドビルドファイルを削除しました"
    fi

    # node_modulesのクリーンアップ（オプション）
    if [[ "${FORCE:-false}" == "true" ]]; then
        log "node_modulesをクリーンアップ中..."
        find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
        log "node_modulesを削除しました"
    fi

    log "クリーンアップが完了しました"
}

# メイン処理
main() {
    case "${COMMAND}" in
        help|--help|-h)
            show_help
            ;;
        status)
            validate_environment
            check_dependencies
            check_aws_credentials
            cmd_status
            ;;
        info)
            validate_environment
            check_dependencies
            check_aws_credentials
            cmd_info
            ;;
        build)
            cmd_build
            ;;
        deploy)
            validate_environment
            check_dependencies
            check_aws_credentials
            cmd_deploy
            ;;
        invalidate)
            validate_environment
            check_dependencies
            check_aws_credentials
            cmd_invalidate
            ;;
        full-deploy)
            validate_environment
            check_dependencies
            check_aws_credentials
            cmd_full_deploy
            ;;
        rollback)
            cmd_rollback
            ;;
        logs)
            cmd_logs
            ;;
        cleanup)
            cmd_cleanup
            ;;
        *)
            error "無効なコマンド: ${COMMAND}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# エラーハンドリング
trap 'error "処理中にエラーが発生しました"; exit 1' ERR

# メイン処理の実行
main "$@"
