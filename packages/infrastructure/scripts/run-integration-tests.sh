#!/bin/bash

# SecretsManager統合テスト実行スクリプト
#
# 使用方法:
#   ./scripts/run-integration-tests.sh [environment] [options]
#
# 例:
#   ./scripts/run-integration-tests.sh test
#   ./scripts/run-integration-tests.sh dev --performance
#   ./scripts/run-integration-tests.sh prod --lambda-function my-function

set -e

# デフォルト設定
ENVIRONMENT=${1:-test}
ENABLE_PERFORMANCE_TEST=false
LAMBDA_FUNCTION_NAME=""
AWS_REGION=${AWS_REGION:-ap-northeast-1}
PERFORMANCE_CONCURRENCY=5
PERFORMANCE_DURATION=30000

# 引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --performance)
            ENABLE_PERFORMANCE_TEST=true
            shift
            ;;
        --lambda-function)
            LAMBDA_FUNCTION_NAME="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --concurrency)
            PERFORMANCE_CONCURRENCY="$2"
            shift 2
            ;;
        --duration)
            PERFORMANCE_DURATION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [environment] [options]"
            echo ""
            echo "Arguments:"
            echo "  environment              Target environment (test, dev, stg, prod)"
            echo ""
            echo "Options:"
            echo "  --performance           Enable performance tests"
            echo "  --lambda-function NAME  Lambda function name for testing"
            echo "  --region REGION         AWS region (default: ap-northeast-1)"
            echo "  --concurrency N         Performance test concurrency (default: 5)"
            echo "  --duration MS           Performance test duration in ms (default: 30000)"
            echo "  --help                  Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 test"
            echo "  $0 dev --performance"
            echo "  $0 prod --lambda-function goal-mandala-prod-secret-service"
            exit 0
            ;;
        *)
            if [[ -z "$ENVIRONMENT" ]]; then
                ENVIRONMENT="$1"
            fi
            shift
            ;;
    esac
done

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# 環境変数の設定
export ENVIRONMENT
export AWS_REGION
export ENABLE_PERFORMANCE_TEST
export LAMBDA_FUNCTION_NAME
export PERFORMANCE_CONCURRENCY
export PERFORMANCE_DURATION

log_info "Starting SecretsManager Integration Tests"
log_info "Environment: $ENVIRONMENT"
log_info "Region: $AWS_REGION"
log_info "Performance Test: $ENABLE_PERFORMANCE_TEST"

if [[ -n "$LAMBDA_FUNCTION_NAME" ]]; then
    log_info "Lambda Function: $LAMBDA_FUNCTION_NAME"
fi

# AWS認証情報の確認
log_info "Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log_error "AWS credentials not configured or invalid"
    log_error "Please run 'aws configure' or set AWS environment variables"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity)
ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | jq -r '.Account')
USER_ARN=$(echo "$CALLER_IDENTITY" | jq -r '.Arn')

log_success "AWS credentials verified"
log_info "Account ID: $ACCOUNT_ID"
log_info "User/Role: $USER_ARN"

# 必要なツールの確認
log_info "Checking required tools..."

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null && ! command -v pnpm &> /dev/null; then
    log_error "npm or pnpm is not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. Some output formatting may be limited."
fi

log_success "Required tools verified"

# プロジェクトディレクトリの確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    log_error "package.json not found in $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# 依存関係のインストール確認
log_info "Checking dependencies..."
if [[ ! -d "node_modules" ]]; then
    log_info "Installing dependencies..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
fi

# TypeScriptのコンパイル
log_info "Compiling TypeScript..."
if command -v pnpm &> /dev/null; then
    pnpm run build
else
    npm run build
fi

# Lambda関数名の自動検出（指定されていない場合）
if [[ -z "$LAMBDA_FUNCTION_NAME" ]]; then
    log_info "Attempting to auto-detect Lambda function name..."

    # CDKスタック名からLambda関数名を推測
    STACK_NAME="goal-mandala-${ENVIRONMENT}-secrets-manager"

    # CloudFormationスタックからLambda関数を検索
    LAMBDA_FUNCTIONS=$(aws cloudformation describe-stack-resources \
        --stack-name "$STACK_NAME" \
        --resource-type "AWS::Lambda::Function" \
        --query 'StackResources[?contains(LogicalResourceId, `Secret`)].PhysicalResourceId' \
        --output text 2>/dev/null || echo "")

    if [[ -n "$LAMBDA_FUNCTIONS" ]]; then
        LAMBDA_FUNCTION_NAME=$(echo "$LAMBDA_FUNCTIONS" | head -n1)
        export LAMBDA_FUNCTION_NAME
        log_success "Auto-detected Lambda function: $LAMBDA_FUNCTION_NAME"
    else
        log_warning "Could not auto-detect Lambda function name"
        log_warning "Lambda access tests will be skipped"
    fi
fi

# 統合テストの実行
log_info "Running integration tests..."

# 結果ファイルのパス
RESULTS_FILE="integration-test-results-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"

# テスト実行
if ts-node scripts/run-secrets-integration-tests.ts; then
    log_success "Integration tests completed successfully"

    # 結果ファイルが存在する場合、サマリーを表示
    if [[ -f "$RESULTS_FILE" ]]; then
        log_info "Test results saved to: $RESULTS_FILE"

        if command -v jq &> /dev/null; then
            log_info "Test Summary:"
            jq -r '.summary | "  Total Tests: \(.totalTests)\n  Passed: \(.passedTests)\n  Failed: \(.failedTests)\n  Success Rate: \(.successRate)%"' "$RESULTS_FILE"
        fi
    fi

    exit 0
else
    log_error "Integration tests failed"

    # 結果ファイルが存在する場合、エラー情報を表示
    if [[ -f "$RESULTS_FILE" ]] && command -v jq &> /dev/null; then
        log_error "Failed tests:"
        jq -r '.summary | "  Total Tests: \(.totalTests)\n  Passed: \(.passedTests)\n  Failed: \(.failedTests)\n  Success Rate: \(.successRate)%"' "$RESULTS_FILE"
    fi

    exit 1
fi
