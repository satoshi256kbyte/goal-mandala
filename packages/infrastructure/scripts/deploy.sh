#!/bin/bash

# CDKデプロイスクリプト
# 使用方法: ./scripts/deploy.sh [environment] [options]

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 使用方法を表示
show_usage() {
    cat << EOF
CDKデプロイスクリプト

使用方法:
    $0 <environment> [options]

引数:
    environment     デプロイ環境 (local|dev|stg|prod)

オプション:
    --diff-only     差分表示のみ実行（デプロイは行わない）
    --no-approval   承認なしでデプロイ実行
    --profile       AWSプロファイル指定
    --region        AWSリージョン指定
    --help          このヘルプを表示

例:
    $0 dev                          # 開発環境にデプロイ
    $0 prod --diff-only             # 本番環境の差分のみ表示
    $0 stg --profile staging        # stagingプロファイルでステージング環境にデプロイ
    $0 dev --no-approval            # 承認なしで開発環境にデプロイ

EOF
}

# 引数チェック
if [ $# -eq 0 ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

ENVIRONMENT=$1
DIFF_ONLY=false
NO_APPROVAL=false
AWS_PROFILE=""
AWS_REGION=""

# オプション解析
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --diff-only)
            DIFF_ONLY=true
            shift
            ;;
        --no-approval)
            NO_APPROVAL=true
            shift
            ;;
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        *)
            log_error "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 環境チェック
case $ENVIRONMENT in
    local|dev|stg|prod)
        log_info "環境: $ENVIRONMENT"
        ;;
    *)
        log_error "無効な環境: $ENVIRONMENT"
        log_error "有効な環境: local, dev, stg, prod"
        exit 1
        ;;
esac

# 設定ファイル存在チェック
CONFIG_FILE="config/${ENVIRONMENT}.json"
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "設定ファイルが見つかりません: $CONFIG_FILE"
    exit 1
fi

log_info "設定ファイル: $CONFIG_FILE"

# AWSプロファイル設定
if [ -n "$AWS_PROFILE" ]; then
    export AWS_PROFILE
    log_info "AWSプロファイル: $AWS_PROFILE"
fi

# AWSリージョン設定
if [ -n "$AWS_REGION" ]; then
    export AWS_REGION
    log_info "AWSリージョン: $AWS_REGION"
fi

# AWS認証確認
log_info "AWS認証情報を確認中..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log_error "AWS認証に失敗しました"
    log_error "以下を確認してください:"
    log_error "  - AWS認証情報が設定されているか"
    log_error "  - 指定したプロファイルが存在するか"
    log_error "  - 必要な権限があるか"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity)
ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | jq -r '.Account')
USER_ARN=$(echo "$CALLER_IDENTITY" | jq -r '.Arn')

log_success "AWS認証成功"
log_info "アカウントID: $ACCOUNT_ID"
log_info "ユーザー: $USER_ARN"

# 依存関係インストール確認
log_info "依存関係を確認中..."
if [ ! -d "node_modules" ]; then
    log_warning "node_modulesが見つかりません。依存関係をインストールします..."
    pnpm install
fi

# ビルド実行
log_info "プロジェクトをビルド中..."
pnpm build

# CDK Bootstrap確認（本番環境の場合のみ）
if [ "$ENVIRONMENT" = "prod" ]; then
    log_info "CDK Bootstrapを確認中..."
    if ! cdk bootstrap --context environment="$ENVIRONMENT" > /dev/null 2>&1; then
        log_warning "CDK Bootstrapが必要です"
        read -p "CDK Bootstrapを実行しますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cdk bootstrap --context environment="$ENVIRONMENT"
        else
            log_error "CDK Bootstrapが必要です。先に実行してください。"
            exit 1
        fi
    fi
fi

# CDK差分表示
log_info "CDK差分を表示中..."
cdk diff --context environment="$ENVIRONMENT"

# 差分のみの場合はここで終了
if [ "$DIFF_ONLY" = true ]; then
    log_success "差分表示完了"
    exit 0
fi

# デプロイ確認（本番環境の場合）
if [ "$ENVIRONMENT" = "prod" ] && [ "$NO_APPROVAL" = false ]; then
    log_warning "本番環境へのデプロイを実行しようとしています"
    log_warning "この操作は本番システムに影響を与える可能性があります"
    read -p "本当にデプロイを実行しますか？ (yes/no): " -r
    if [ "$REPLY" != "yes" ]; then
        log_info "デプロイをキャンセルしました"
        exit 0
    fi
fi

# CDKデプロイ実行
log_info "CDKデプロイを開始します..."
DEPLOY_START_TIME=$(date +%s)

if [ "$NO_APPROVAL" = true ]; then
    APPROVAL_FLAG="--require-approval never"
else
    APPROVAL_FLAG=""
fi

if cdk deploy --all $APPROVAL_FLAG --context environment="$ENVIRONMENT"; then
    DEPLOY_END_TIME=$(date +%s)
    DEPLOY_DURATION=$((DEPLOY_END_TIME - DEPLOY_START_TIME))

    log_success "デプロイが完了しました！"
    log_info "デプロイ時間: ${DEPLOY_DURATION}秒"
    log_info "環境: $ENVIRONMENT"
    log_info "完了時刻: $(date)"

    # デプロイ後の確認
    log_info "デプロイされたスタックを確認中..."
    aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query "StackSummaries[?contains(StackName, 'goal-mandala-${ENVIRONMENT}')].{Name:StackName,Status:StackStatus,Updated:LastUpdatedTime}" \
        --output table

else
    log_error "デプロイに失敗しました"
    exit 1
fi

# 後処理
log_info "デプロイ後の処理を実行中..."

# CloudFormationスタックの出力値を表示
log_info "スタック出力値:"
aws cloudformation describe-stacks \
    --query "Stacks[?contains(StackName, 'goal-mandala-${ENVIRONMENT}')].Outputs" \
    --output table 2>/dev/null || log_warning "スタック出力値の取得に失敗しました"

log_success "全ての処理が完了しました！"
