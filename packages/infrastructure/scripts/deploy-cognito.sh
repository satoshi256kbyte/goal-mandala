#!/bin/bash

# Cognitoスタック専用デプロイスクリプト
# 使用方法: ./scripts/deploy-cognito.sh [environment] [options]

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
Cognitoスタック専用デプロイスクリプト

使用方法:
    $0 <environment> [options]

引数:
    environment     デプロイ環境 (local|dev|stg|prod)

オプション:
    --diff-only     差分表示のみ実行（デプロイは行わない）
    --no-approval   承認なしでデプロイ実行
    --profile       AWSプロファイル指定
    --region        AWSリージョン指定
    --outputs       デプロイ後に出力値を表示
    --help          このヘルプを表示

例:
    $0 dev                          # 開発環境のCognitoスタックをデプロイ
    $0 prod --diff-only             # 本番環境のCognito差分のみ表示
    $0 stg --profile staging        # stagingプロファイルでステージング環境にデプロイ
    $0 dev --no-approval --outputs  # 承認なしでデプロイし、出力値を表示

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
SHOW_OUTPUTS=false
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
        --outputs)
            SHOW_OUTPUTS=true
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

# スタック名を設定ファイルから取得
STACK_PREFIX=$(jq -r '.stackPrefix' "$CONFIG_FILE")
COGNITO_STACK_NAME="${STACK_PREFIX}-cognito"

log_info "Cognitoスタック名: $COGNITO_STACK_NAME"

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

# Cognito設定の検証
log_info "Cognito設定を検証中..."
COGNITO_CONFIG=$(jq '.cognito' "$CONFIG_FILE")

# 必須設定の確認
USER_POOL_CONFIG=$(echo "$COGNITO_CONFIG" | jq '.userPool')
CLIENT_CONFIG=$(echo "$COGNITO_CONFIG" | jq '.userPoolClient')

if [ "$USER_POOL_CONFIG" = "null" ] || [ "$CLIENT_CONFIG" = "null" ]; then
    log_error "Cognito設定が不完全です"
    exit 1
fi

log_success "Cognito設定検証完了"

# CDK差分表示
log_info "Cognitoスタックの差分を表示中..."
cdk diff "$COGNITO_STACK_NAME" --context environment="$ENVIRONMENT"

# 差分のみの場合はここで終了
if [ "$DIFF_ONLY" = true ]; then
    log_success "差分表示完了"
    exit 0
fi

# デプロイ確認（本番環境の場合）
if [ "$ENVIRONMENT" = "prod" ] && [ "$NO_APPROVAL" = false ]; then
    log_warning "本番環境のCognitoスタックをデプロイしようとしています"
    log_warning "この操作は認証システムに影響を与える可能性があります"
    read -p "本当にデプロイを実行しますか？ (yes/no): " -r
    if [ "$REPLY" != "yes" ]; then
        log_info "デプロイをキャンセルしました"
        exit 0
    fi
fi

# CDKデプロイ実行
log_info "Cognitoスタックのデプロイを開始します..."
DEPLOY_START_TIME=$(date +%s)

if [ "$NO_APPROVAL" = true ]; then
    APPROVAL_FLAG="--require-approval never"
else
    APPROVAL_FLAG=""
fi

if cdk deploy "$COGNITO_STACK_NAME" $APPROVAL_FLAG --context environment="$ENVIRONMENT"; then
    DEPLOY_END_TIME=$(date +%s)
    DEPLOY_DURATION=$((DEPLOY_END_TIME - DEPLOY_START_TIME))

    log_success "Cognitoスタックのデプロイが完了しました！"
    log_info "デプロイ時間: ${DEPLOY_DURATION}秒"
    log_info "環境: $ENVIRONMENT"
    log_info "スタック名: $COGNITO_STACK_NAME"
    log_info "完了時刻: $(date)"

    # デプロイ後の確認
    log_info "デプロイされたCognitoスタックを確認中..."
    aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --query "Stacks[0].{Name:StackName,Status:StackStatus,Updated:LastUpdatedTime}" \
        --output table 2>/dev/null || log_warning "スタック情報の取得に失敗しました"

else
    log_error "Cognitoスタックのデプロイに失敗しました"
    exit 1
fi

# 出力値の表示
if [ "$SHOW_OUTPUTS" = true ]; then
    log_info "Cognitoスタックの出力値を表示中..."
    aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --query "Stacks[0].Outputs" \
        --output table 2>/dev/null || log_warning "出力値の取得に失敗しました"

    # 重要な出力値を個別に表示
    log_info "重要な設定値:"

    USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
        --output text 2>/dev/null || echo "取得失敗")

    CLIENT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
        --output text 2>/dev/null || echo "取得失敗")

    DOMAIN_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolDomainOutput'].OutputValue" \
        --output text 2>/dev/null || echo "取得失敗")

    echo "User Pool ID: $USER_POOL_ID"
    echo "User Pool Client ID: $CLIENT_ID"
    echo "User Pool Domain: $DOMAIN_NAME"

    # 環境変数設定例を表示
    log_info "フロントエンド用環境変数設定例:"
    echo "VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID"
    echo "VITE_COGNITO_CLIENT_ID=$CLIENT_ID"
    echo "VITE_COGNITO_REGION=$(jq -r '.region' "$CONFIG_FILE")"
fi

log_success "全ての処理が完了しました！"
