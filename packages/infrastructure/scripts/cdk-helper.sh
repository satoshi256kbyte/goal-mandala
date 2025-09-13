#!/bin/bash

# CDKヘルパースクリプト
# CDKの各種操作を簡単に実行するためのユーティリティ

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
CDKヘルパースクリプト

使用方法:
    $0 <command> [environment] [options]

コマンド:
    synth       CloudFormationテンプレートを生成
    diff        現在のスタックとの差分を表示
    deploy      スタックをデプロイ
    destroy     スタックを削除
    bootstrap   CDK Bootstrapを実行
    doctor      CDK環境の診断
    list        利用可能なスタックを一覧表示
    outputs     スタックの出力値を表示
    cognito     Cognitoスタック専用操作
    validate    設定ファイルの検証

環境:
    local       ローカル開発環境
    dev         開発環境
    stg         ステージング環境
    prod        本番環境

オプション:
    --profile   AWSプロファイル指定
    --region    AWSリージョン指定
    --help      このヘルプを表示

例:
    $0 synth dev                    # 開発環境のテンプレート生成
    $0 diff prod                    # 本番環境の差分表示
    $0 deploy stg --profile staging # stagingプロファイルでデプロイ
    $0 outputs dev                  # 開発環境の出力値表示

EOF
}

# 引数チェック
if [ $# -eq 0 ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

COMMAND=$1
ENVIRONMENT=${2:-"dev"}
AWS_PROFILE=""
AWS_REGION=""

# オプション解析
shift 2 2>/dev/null || shift 1
while [[ $# -gt 0 ]]; do
    case $1 in
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

# 環境チェック（一部コマンドでは不要）
if [[ "$COMMAND" != "doctor" && "$COMMAND" != "list" ]]; then
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
fi

# コマンド実行
case $COMMAND in
    synth)
        log_info "CloudFormationテンプレートを生成中..."
        cdk synth --context environment="$ENVIRONMENT"
        log_success "テンプレート生成完了"
        ;;

    diff)
        log_info "スタックの差分を表示中..."
        cdk diff --context environment="$ENVIRONMENT"
        ;;

    deploy)
        log_info "スタックをデプロイ中..."
        ./scripts/deploy.sh "$ENVIRONMENT" "$@"
        ;;

    destroy)
        log_warning "スタックを削除しようとしています"
        if [ "$ENVIRONMENT" = "prod" ]; then
            log_error "本番環境の削除は安全のため無効化されています"
            log_error "本当に削除が必要な場合は、直接CDKコマンドを実行してください"
            exit 1
        fi

        read -p "環境 '$ENVIRONMENT' のスタックを削除しますか？ (yes/no): " -r
        if [ "$REPLY" = "yes" ]; then
            cdk destroy --context environment="$ENVIRONMENT"
            log_success "スタック削除完了"
        else
            log_info "削除をキャンセルしました"
        fi
        ;;

    bootstrap)
        log_info "CDK Bootstrapを実行中..."
        if [ -n "$ENVIRONMENT" ]; then
            cdk bootstrap --context environment="$ENVIRONMENT"
        else
            cdk bootstrap
        fi
        log_success "Bootstrap完了"
        ;;

    doctor)
        log_info "CDK環境を診断中..."
        cdk doctor

        log_info "AWS認証情報を確認中..."
        aws sts get-caller-identity

        log_info "Node.jsバージョン:"
        node --version

        log_info "CDKバージョン:"
        cdk --version

        log_info "依存関係の状態:"
        if [ -f "package.json" ]; then
            pnpm list --depth=0 2>/dev/null || npm list --depth=0 2>/dev/null || echo "依存関係の確認に失敗"
        fi
        ;;

    list)
        log_info "利用可能なスタックを一覧表示中..."
        if [ -n "$ENVIRONMENT" ]; then
            cdk list --context environment="$ENVIRONMENT"
        else
            log_info "全環境のスタック:"
            for env in local dev stg prod; do
                if [ -f "config/${env}.json" ]; then
                    echo "=== $env 環境 ==="
                    cdk list --context environment="$env" 2>/dev/null || echo "設定エラー"
                    echo
                fi
            done
        fi
        ;;

    outputs)
        log_info "スタックの出力値を表示中..."

        # CloudFormationから出力値を取得
        STACK_PREFIX=$(jq -r '.stackPrefix' "config/${ENVIRONMENT}.json" 2>/dev/null || echo "goal-mandala-${ENVIRONMENT}")

        log_info "スタックプレフィックス: $STACK_PREFIX"

        aws cloudformation describe-stacks \
            --query "Stacks[?contains(StackName, '${STACK_PREFIX}')].{StackName:StackName,Outputs:Outputs}" \
            --output table 2>/dev/null || log_warning "出力値の取得に失敗しました"
        ;;

    cognito)
        log_info "Cognitoスタック専用操作を実行中..."
        ./scripts/deploy-cognito.sh "$ENVIRONMENT" "$@"
        ;;

    validate)
        log_info "設定ファイルを検証中..."
        ./scripts/validate-cognito-config.sh "$ENVIRONMENT"
        ;;

    *)
        log_error "不明なコマンド: $COMMAND"
        show_usage
        exit 1
        ;;
esac
