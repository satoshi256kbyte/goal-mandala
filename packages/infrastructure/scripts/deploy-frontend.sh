#!/bin/bash

# フロントエンドデプロイスクリプト
# 使用方法: ./deploy-frontend.sh [environment] [options]

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# デフォルト設定
ENVIRONMENT="${1:-dev}"
BUILD_ONLY="${BUILD_ONLY:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_INVALIDATION="${SKIP_INVALIDATION:-false}"
DRY_RUN="${DRY_RUN:-false}"
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
フロントエンドデプロイスクリプト

使用方法:
    $0 [environment] [options]

引数:
    environment     デプロイ環境 (dev, stg, prod) [デフォルト: dev]

環境変数オプション:
    BUILD_ONLY=true         ビルドのみ実行（S3アップロードなし）
    SKIP_BUILD=true         ビルドをスキップ（既存のdistを使用）
    SKIP_INVALIDATION=true  CloudFrontキャッシュ無効化をスキップ
    DRY_RUN=true           実際のアップロードを行わない（確認のみ）
    VERBOSE=true           詳細ログを出力

例:
    $0 dev                          # 開発環境にデプロイ
    $0 prod                         # 本番環境にデプロイ
    BUILD_ONLY=true $0 dev          # ビルドのみ実行
    DRY_RUN=true $0 stg             # ステージング環境にドライラン
    VERBOSE=true $0 prod            # 詳細ログ付きで本番デプロイ

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
            log "デプロイ環境: ${ENVIRONMENT}"
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
    log "AWS アカウント: ${account_id}"
}

# CDKスタック情報の取得
get_stack_outputs() {
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

    # 必要な値を抽出
    S3_BUCKET_NAME=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
    CLOUDFRONT_DISTRIBUTION_ID=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
    WEBSITE_URL=$(echo "${outputs}" | jq -r '.[] | select(.OutputKey=="WebsiteUrl") | .OutputValue')

    # 値の検証
    if [[ -z "${S3_BUCKET_NAME}" ]] || [[ "${S3_BUCKET_NAME}" == "null" ]]; then
        error "S3バケット名を取得できませんでした"
        exit 1
    fi

    if [[ -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]] || [[ "${CLOUDFRONT_DISTRIBUTION_ID}" == "null" ]]; then
        error "CloudFrontディストリビューションIDを取得できませんでした"
        exit 1
    fi

    log "S3バケット: ${S3_BUCKET_NAME}"
    log "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
    log "ウェブサイトURL: ${WEBSITE_URL}"
}

# フロントエンドビルド
build_frontend() {
    if [[ "${SKIP_BUILD}" == "true" ]]; then
        log "ビルドをスキップします"
        return
    fi

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

    # index.htmlの存在確認
    if [[ ! -f "${dist_dir}/index.html" ]]; then
        error "index.htmlが見つかりません"
        exit 1
    fi

    verbose "ビルド結果:"
    if [[ "${VERBOSE}" == "true" ]]; then
        find "${dist_dir}" -type f -exec ls -lh {} \; | head -20
    fi
}

# S3へのアップロード
upload_to_s3() {
    if [[ "${BUILD_ONLY}" == "true" ]]; then
        log "BUILD_ONLYが設定されているため、S3アップロードをスキップします"
        return
    fi

    log "S3にアップロード中..."

    local dist_dir="${PROJECT_ROOT}/packages/frontend/dist"
    local sync_args=(
        "${dist_dir}/"
        "s3://${S3_BUCKET_NAME}/"
        --delete
        --exact-timestamps
    )

    # ドライランの場合
    if [[ "${DRY_RUN}" == "true" ]]; then
        sync_args+=(--dryrun)
        log "ドライラン: 実際のアップロードは行いません"
    fi

    # 詳細ログの場合
    if [[ "${VERBOSE}" == "true" ]]; then
        sync_args+=(--debug)
    fi

    # キャッシュ設定
    # HTMLファイル: 短期キャッシュ
    verbose "HTMLファイルをアップロード中（短期キャッシュ）..."
    aws s3 sync "${dist_dir}/" "s3://${S3_BUCKET_NAME}/" \
        --exclude "*" \
        --include "*.html" \
        --cache-control "public, max-age=300, must-revalidate" \
        --metadata-directive REPLACE \
        ${DRY_RUN:+--dryrun}

    # CSSファイル: 長期キャッシュ
    verbose "CSSファイルをアップロード中（長期キャッシュ）..."
    aws s3 sync "${dist_dir}/" "s3://${S3_BUCKET_NAME}/" \
        --exclude "*" \
        --include "*.css" \
        --cache-control "public, max-age=31536000, immutable" \
        --metadata-directive REPLACE \
        ${DRY_RUN:+--dryrun}

    # JavaScriptファイル: 長期キャッシュ
    verbose "JavaScriptファイルをアップロード中（長期キャッシュ）..."
    aws s3 sync "${dist_dir}/" "s3://${S3_BUCKET_NAME}/" \
        --exclude "*" \
        --include "*.js" \
        --cache-control "public, max-age=31536000, immutable" \
        --metadata-directive REPLACE \
        ${DRY_RUN:+--dryrun}

    # 画像ファイル: 長期キャッシュ
    verbose "画像ファイルをアップロード中（長期キャッシュ）..."
    aws s3 sync "${dist_dir}/" "s3://${S3_BUCKET_NAME}/" \
        --exclude "*" \
        --include "*.png" \
        --include "*.jpg" \
        --include "*.jpeg" \
        --include "*.gif" \
        --include "*.svg" \
        --include "*.webp" \
        --include "*.ico" \
        --cache-control "public, max-age=31536000, immutable" \
        --metadata-directive REPLACE \
        ${DRY_RUN:+--dryrun}

    # その他のファイル: 標準キャッシュ
    verbose "その他のファイルをアップロード中..."
    aws s3 sync "${dist_dir}/" "s3://${S3_BUCKET_NAME}/" \
        --exclude "*.html" \
        --exclude "*.css" \
        --exclude "*.js" \
        --exclude "*.png" \
        --exclude "*.jpg" \
        --exclude "*.jpeg" \
        --exclude "*.gif" \
        --exclude "*.svg" \
        --exclude "*.webp" \
        --exclude "*.ico" \
        --cache-control "public, max-age=86400" \
        --metadata-directive REPLACE \
        ${DRY_RUN:+--dryrun}

    if [[ "${DRY_RUN}" != "true" ]]; then
        log "S3アップロード完了"
    else
        log "S3アップロード（ドライラン）完了"
    fi
}

# CloudFrontキャッシュ無効化
invalidate_cloudfront() {
    if [[ "${BUILD_ONLY}" == "true" ]] || [[ "${SKIP_INVALIDATION}" == "true" ]]; then
        log "CloudFrontキャッシュ無効化をスキップします"
        return
    fi

    if [[ "${DRY_RUN}" == "true" ]]; then
        log "ドライラン: CloudFrontキャッシュ無効化をスキップします"
        return
    fi

    log "CloudFrontキャッシュを無効化中..."

    local invalidation_paths=(
        "/*"
    )

    local invalidation_id
    invalidation_id=$(aws cloudfront create-invalidation \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --paths "${invalidation_paths[@]}" \
        --query 'Invalidation.Id' \
        --output text)

    log "キャッシュ無効化を開始: ${invalidation_id}"

    # 無効化の完了を待機（オプション）
    if [[ "${WAIT_FOR_INVALIDATION:-false}" == "true" ]]; then
        log "キャッシュ無効化の完了を待機中..."
        aws cloudfront wait invalidation-completed \
            --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
            --id "${invalidation_id}"
        log "キャッシュ無効化完了"
    else
        log "キャッシュ無効化は非同期で実行されます（通常5-10分で完了）"
    fi
}

# デプロイ結果の表示
show_deployment_result() {
    log "=== デプロイ完了 ==="
    log "環境: ${ENVIRONMENT}"
    log "S3バケット: ${S3_BUCKET_NAME}"
    log "CloudFrontディストリビューション: ${CLOUDFRONT_DISTRIBUTION_ID}"
    log "ウェブサイトURL: ${WEBSITE_URL}"
    log ""
    log "デプロイされたファイルは数分後に反映されます。"
    log "ウェブサイトにアクセス: ${WEBSITE_URL}"
}

# メイン処理
main() {
    log "フロントエンドデプロイを開始します"
    log "環境: ${ENVIRONMENT}"

    validate_environment
    check_dependencies
    check_aws_credentials
    get_stack_outputs
    build_frontend
    upload_to_s3
    invalidate_cloudfront
    show_deployment_result

    log "デプロイが正常に完了しました"
}

# エラーハンドリング
trap 'error "デプロイ中にエラーが発生しました"; exit 1' ERR

# メイン処理の実行
main "$@"
