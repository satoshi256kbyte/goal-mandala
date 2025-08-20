#!/bin/bash

# SecretsManager統合テスト実行準備確認スクリプト
# このスクリプトは統合テストを実行する前に必要な条件が満たされているかを確認します

set -e

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_header() {
    echo -e "\033[1;34m=== $1 ===\033[0m"
}

# 引数の解析
ENVIRONMENT=${1:-test}
REGION=${2:-ap-northeast-1}
STACK_PREFIX=${3:-goal-mandala}

log_header "SecretsManager統合テスト実行準備確認"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack Prefix: $STACK_PREFIX"
echo ""

# 1. AWS CLI設定確認
log_header "AWS CLI設定確認"

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI がインストールされていません"
    exit 1
fi

log_info "AWS CLI バージョン: $(aws --version)"

# AWS認証情報確認
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS認証情報が設定されていません"
    log_info "以下のコマンドで設定してください:"
    log_info "  aws configure"
    log_info "または環境変数を設定:"
    log_info "  export AWS_ACCESS_KEY_ID=your_key"
    log_info "  export AWS_SECRET_ACCESS_KEY=your_secret"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity)
log_info "AWS認証情報: $(echo $CALLER_IDENTITY | jq -r '.Arn // .UserId')"

# 2. 必要なシークレットの存在確認
log_header "シークレット存在確認"

SECRETS=(
    "${STACK_PREFIX}-${ENVIRONMENT}-secret-database"
    "${STACK_PREFIX}-${ENVIRONMENT}-secret-jwt"
    "${STACK_PREFIX}-${ENVIRONMENT}-secret-external-apis"
)

MISSING_SECRETS=()

for SECRET_NAME in "${SECRETS[@]}"; do
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" &> /dev/null; then
        log_info "✅ シークレット存在: $SECRET_NAME"
    else
        log_warn "❌ シークレット不存在: $SECRET_NAME"
        MISSING_SECRETS+=("$SECRET_NAME")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    log_error "必要なシークレットが見つかりません。CDKスタックがデプロイされているか確認してください。"
    log_info "不足しているシークレット:"
    for SECRET in "${MISSING_SECRETS[@]}"; do
        log_info "  - $SECRET"
    done
fi

# 3. 統合テスト用Lambda関数の確認
log_header "統合テスト用Lambda関数確認"

INTEGRATION_TEST_FUNCTION="${STACK_PREFIX}-${ENVIRONMENT}-secrets-integration-test"

if aws lambda get-function --function-name "$INTEGRATION_TEST_FUNCTION" --region "$REGION" &> /dev/null; then
    log_info "✅ 統合テスト用Lambda関数存在: $INTEGRATION_TEST_FUNCTION"

    # Lambda関数の設定確認
    FUNCTION_CONFIG=$(aws lambda get-function-configuration --function-name "$INTEGRATION_TEST_FUNCTION" --region "$REGION")
    TIMEOUT=$(echo $FUNCTION_CONFIG | jq -r '.Timeout')
    MEMORY=$(echo $FUNCTION_CONFIG | jq -r '.MemorySize')

    log_info "  タイムアウト: ${TIMEOUT}秒"
    log_info "  メモリ: ${MEMORY}MB"

    if [ "$TIMEOUT" -lt 300 ]; then
        log_warn "  Lambda関数のタイムアウトが短い可能性があります (推奨: 300秒以上)"
    fi

    if [ "$MEMORY" -lt 512 ]; then
        log_warn "  Lambda関数のメモリが少ない可能性があります (推奨: 512MB以上)"
    fi

else
    log_warn "❌ 統合テスト用Lambda関数が見つかりません: $INTEGRATION_TEST_FUNCTION"
    log_info "  統合テスト用Lambda関数は test, dev 環境でのみ自動作成されます"
    log_info "  Lambda関数なしでも基本的な統合テストは実行可能です"
fi

# 4. IAM権限確認
log_header "IAM権限確認"

# SecretsManager権限確認
log_info "SecretsManager権限確認中..."
if aws secretsmanager list-secrets --region "$REGION" --max-items 1 &> /dev/null; then
    log_info "✅ SecretsManager読み取り権限あり"
else
    log_error "❌ SecretsManager読み取り権限なし"
fi

# Lambda権限確認（統合テスト用Lambda関数が存在する場合）
if aws lambda get-function --function-name "$INTEGRATION_TEST_FUNCTION" --region "$REGION" &> /dev/null; then
    log_info "Lambda権限確認中..."
    if aws lambda invoke --function-name "$INTEGRATION_TEST_FUNCTION" --payload '{"test": true}' /tmp/test-response.json --region "$REGION" &> /dev/null; then
        log_info "✅ Lambda実行権限あり"
        rm -f /tmp/test-response.json
    else
        log_error "❌ Lambda実行権限なし"
    fi
fi

# CloudWatch権限確認
log_info "CloudWatch権限確認中..."
if aws cloudwatch list-metrics --namespace "AWS/Lambda" --region "$REGION" --max-records 1 &> /dev/null; then
    log_info "✅ CloudWatch読み取り権限あり"
else
    log_warn "❌ CloudWatch読み取り権限なし（パフォーマンステストに影響する可能性があります）"
fi

# 5. Node.js環境確認
log_header "Node.js環境確認"

if ! command -v node &> /dev/null; then
    log_error "Node.js がインストールされていません"
    exit 1
fi

NODE_VERSION=$(node --version)
log_info "Node.js バージョン: $NODE_VERSION"

# Node.js 18以上を推奨
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    log_warn "Node.js 18以上を推奨します (現在: $NODE_VERSION)"
fi

# pnpm確認
if command -v pnpm &> /dev/null; then
    log_info "pnpm バージョン: $(pnpm --version)"
else
    log_warn "pnpm がインストールされていません。npm を使用します。"
fi

# 6. 依存関係確認
log_header "依存関係確認"

if [ -f "package.json" ]; then
    log_info "✅ package.json 存在"

    # TypeScript確認
    if command -v tsc &> /dev/null; then
        log_info "✅ TypeScript インストール済み"
    else
        log_warn "TypeScript がグローバルにインストールされていません"
    fi

    # ts-node確認
    if command -v ts-node &> /dev/null; then
        log_info "✅ ts-node インストール済み"
    else
        log_warn "ts-node がグローバルにインストールされていません"
        log_info "  以下のコマンドでインストールできます:"
        log_info "  npm install -g ts-node"
    fi

else
    log_error "package.json が見つかりません"
    exit 1
fi

# 7. 統合テストスクリプト確認
log_header "統合テストスクリプト確認"

INTEGRATION_TEST_SCRIPT="scripts/run-secrets-integration-tests.ts"

if [ -f "$INTEGRATION_TEST_SCRIPT" ]; then
    log_info "✅ 統合テストスクリプト存在: $INTEGRATION_TEST_SCRIPT"
else
    log_error "❌ 統合テストスクリプトが見つかりません: $INTEGRATION_TEST_SCRIPT"
    exit 1
fi

# 8. 結果サマリー
log_header "実行準備確認結果"

READY=true

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    log_error "必要なシークレットが不足しています"
    READY=false
fi

if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS認証情報が設定されていません"
    READY=false
fi

if [ "$READY" = true ]; then
    log_info "🎉 統合テスト実行準備完了!"
    echo ""
    log_info "以下のコマンドで統合テストを実行できます:"
    echo ""
    echo "  # 基本実行"
    echo "  pnpm run test:integration:secrets"
    echo ""
    echo "  # 環境指定実行"
    echo "  ts-node scripts/run-secrets-integration-tests.ts --env=$ENVIRONMENT --region=$REGION"
    echo ""
    echo "  # パフォーマンステスト付き実行"
    echo "  ts-node scripts/run-secrets-integration-tests.ts --env=$ENVIRONMENT --perf-duration=60000 --perf-concurrency=5"
    echo ""

    if aws lambda get-function --function-name "$INTEGRATION_TEST_FUNCTION" --region "$REGION" &> /dev/null; then
        echo "  # Lambda関数指定実行"
        echo "  ts-node scripts/run-secrets-integration-tests.ts --env=$ENVIRONMENT --test-lambda=$INTEGRATION_TEST_FUNCTION"
        echo ""
    fi

    exit 0
else
    log_error "❌ 統合テスト実行準備が完了していません"
    log_info "上記のエラーを解決してから再度実行してください"
    exit 1
fi
