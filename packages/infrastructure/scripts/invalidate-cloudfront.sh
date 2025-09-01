#!/bin/bash

# CloudFrontキャッシュ無効化スクリプト
# 使用方法: ./invalidate-cloudfront.sh [environment] [paths...]

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# デフォルト設定
ENVIRONMENT="${1:-dev}"
WAIT_FOR_COMPLETION="${WAIT_FOR_COMPLETION:-false}"
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
CloudFrontキャッシュ無効化スクリプト

使用方法:
    $0 [environment] [paths...]

引数:
    environment     対象環境 (dev, stg, prod) [デフォルト: dev]
    paths          無効化するパス [デフォルト: /*]

環境変数オプション:
    WAIT_FOR_COMPLETION=true    無効化完了まで待機
    VERBOSE=true               詳細ログを出力

例:
    $0 dev                              # 開発環境の全キャッシュを無効化
    $0 prod /index.html /assets/*       # 本番環境の特定パスを無効化
    WAIT_FOR_COMPLETION=true $0 stg     # ステージング環境で完了まで待機
    VERBOSE=true $0 prod                # 詳細ログ付きで本番環境を無効化

よく使用されるパスパターン:
    /*                  全てのファイル
    /index.html         トップページのみ
    /assets/*           アセットファイルのみ
    /*.html             全HTMLファイル
    /*.js               全JavaScriptファイル
    /*.css              全CSSファイル

EOF
}

# 引数チェック
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

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

# CloudFrontディストリビューションIDの取得
get_distribution_id() {
    local stack_name="GoalMandalaFrontendStack-${ENVIRONMENT}"

    verbose "CDKスタック情報を取得中: ${stack_name}"

    # スタックの存在確認
    if ! aws cloudformation describe-stacks --stack-name "${stack_name}" &> /dev/null; then
        error "CDKスタックが見つかりません: ${stack_name}"
        error "先にインフラをデプロイしてください: pnpm run deploy:${ENVIRONMENT}"
        exit 1
    fi

    # スタック出力の取得
    local outputs
    outputs=$(aws cloudformation describe-stacks \
        --stack-name "${stack_name}" \
        --query 'Stacks[0].Outputs' \
        --output json)

    # CloudFrontディストリビューションIDを抽出
    CLOUDFRONT_DISTRIBUTION_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')

    # 値の検証
    if [[ -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]] || [[ "${CLOUDFRONT_DISTRIBUTION_ID}" == "null" ]]; then
        error "CloudFrontディストリビューションIDを取得できませんでした"
        exit 1
    fi

    log "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"

    # ディストリビューションの状態確認
    local distribution_status
    distribution_status=$(aws cloudfront get-distribution \
        --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --query 'Distribution.Status' \
        --output text)

    verbose "ディストリビューション状態: ${distribution_status}"

    if [[ "${distribution_status}" != "Deployed" ]]; then
        log "警告: ディストリビューションが 'Deployed' 状態ではありません (現在: ${distribution_status})"
        log "無効化は実行されますが、完了まで時間がかかる可能性があります"
    fi
}

# 無効化パスの準備
prepare_invalidation_paths() {
    # 引数からパスを取得（最初の引数は環境名なのでスキップ）
    shift || true  # 環境名をスキップ

    if [[ $# -eq 0 ]]; then
        # デフォルトパス
        INVALIDATION_PATHS=("/*")
        log "デフォルトパスを使用: /*"
    else
        # 指定されたパス
        INVALIDATION_PATHS=("$@")
        log "指定されたパス: ${INVALIDATION_PATHS[*]}"
    fi

    # パスの検証
    for path in "${INVALIDATION_PATHS[@]}"; do
        if [[ ! "${path}" =~ ^/ ]]; then
            error "無効なパス: ${path} (パスは / で始まる必要があります)"
            exit 1
        fi
    done

    verbose "無効化対象パス数: ${#INVALIDATION_PATHS[@]}"
}

# 既存の無効化状況の確認
check_existing_invalidations() {
    verbose "既存の無効化を確認中..."

    local existing_invalidations
    existing_invalidations=$(aws cloudfront list-invalidations \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --query 'InvalidationList.Items[?Status==`InProgress`]' \
        --output json)

    local in_progress_count
    in_progress_count=$(echo "${existing_invalidations}" | jq length)

    if [[ "${in_progress_count}" -gt 0 ]]; then
        log "警告: ${in_progress_count} 件の無効化が進行中です"

        if [[ "${VERBOSE}" == "true" ]]; then
            echo "${existing_invalidations}" | jq -r '.[] | "  - ID: \(.Id), 作成日時: \(.CreateTime)"'
        fi

        log "新しい無効化を実行しますが、完了まで時間がかかる可能性があります"
    else
        verbose "進行中の無効化はありません"
    fi
}

# CloudFrontキャッシュ無効化の実行
execute_invalidation() {
    log "CloudFrontキャッシュ無効化を実行中..."
    log "対象パス: ${INVALIDATION_PATHS[*]}"

    # 無効化の実行
    local invalidation_result
    invalidation_result=$(aws cloudfront create-invalidation \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --paths "${INVALIDATION_PATHS[@]}" \
        --output json)

    # 無効化IDの取得
    INVALIDATION_ID=$(echo "${invalidation_result}" | jq -r '.Invalidation.Id')
    local invalidation_status
    invalidation_status=$(echo "${invalidation_result}" | jq -r '.Invalidation.Status')

    log "無効化を開始しました"
    log "無効化ID: ${INVALIDATION_ID}"
    log "初期状態: ${invalidation_status}"

    # 無効化の詳細情報
    if [[ "${VERBOSE}" == "true" ]]; then
        local create_time
        create_time=$(echo "${invalidation_result}" | jq -r '.Invalidation.CreateTime')
        local caller_reference
        caller_reference=$(echo "${invalidation_result}" | jq -r '.Invalidation.InvalidationBatch.CallerReference')

        verbose "作成日時: ${create_time}"
        verbose "呼び出し参照: ${caller_reference}"
    fi
}

# 無効化完了の待機
wait_for_completion() {
    if [[ "${WAIT_FOR_COMPLETION}" != "true" ]]; then
        log "無効化は非同期で実行されます（通常5-10分で完了）"
        log "進捗確認: aws cloudfront get-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
        return
    fi

    log "無効化の完了を待機中..."
    log "これには数分かかる場合があります..."

    local start_time
    start_time=$(date +%s)

    # AWS CLIの wait コマンドを使用
    if aws cloudfront wait invalidation-completed \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --id "${INVALIDATION_ID}"; then

        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log "無効化が完了しました（所要時間: ${duration}秒）"
    else
        error "無効化の待機中にエラーが発生しました"
        exit 1
    fi
}

# 無効化結果の表示
show_invalidation_result() {
    log "=== 無効化完了 ==="
    log "環境: ${ENVIRONMENT}"
    log "ディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
    log "無効化ID: ${INVALIDATION_ID}"
    log "対象パス: ${INVALIDATION_PATHS[*]}"
    log ""

    if [[ "${WAIT_FOR_COMPLETION}" == "true" ]]; then
        log "キャッシュ無効化が完了しました。変更は即座に反映されます。"
    else
        log "キャッシュ無効化を開始しました。通常5-10分で完了します。"
        log ""
        log "進捗確認コマンド:"
        log "  aws cloudfront get-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
        log ""
        log "完了まで待機する場合:"
        log "  aws cloudfront wait invalidation-completed --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
    fi
}

# メイン処理
main() {
    log "CloudFrontキャッシュ無効化を開始します"

    validate_environment
    check_dependencies
    check_aws_credentials
    get_distribution_id
    prepare_invalidation_paths "$@"
    check_existing_invalidations
    execute_invalidation
    wait_for_completion
    show_invalidation_result

    log "無効化処理が正常に完了しました"
}

# エラーハンドリング
trap 'error "無効化処理中にエラーが発生しました"; exit 1' ERR

# メイン処理の実行
main "$@"
