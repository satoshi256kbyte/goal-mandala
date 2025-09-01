#!/bin/bash

# フロントエンド配信環境 統合テストスクリプト

set -e

# 設定
ENVIRONMENT="${1:-local}"
DOMAIN="${2}"
TEST_RESULTS_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_FILE="$TEST_RESULTS_DIR/integration-test-$TIMESTAMP.json"

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

# 使用方法の表示
show_usage() {
    echo "Usage: $0 <environment> [domain]"
    echo ""
    echo "Environments:"
    echo "  local    - Local development environment (http://localhost:3000)"
    echo "  dev      - Development environment"
    echo "  stg      - Staging environment"
    echo "  prd      - Production environment"
    echo ""
    echo "Examples:"
    echo "  $0 local"
    echo "  $0 dev dev.goal-mandala.example.com"
    echo "  $0 prd goal-mandala.example.com"
    exit 1
}

# 引数の検証
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    show_usage
fi

# ドメインの設定
if [ -z "$DOMAIN" ]; then
    case "$ENVIRONMENT" in
        "local")
            DOMAIN="localhost"
            ;;
        "dev")
            DOMAIN="dev.goal-mandala.example.com"
            ;;
        "stg")
            DOMAIN="stg.goal-mandala.example.com"
            ;;
        "prd")
            DOMAIN="goal-mandala.example.com"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            show_usage
            ;;
    esac
fi

log_info "Starting integration tests for $ENVIRONMENT environment"
log_info "Domain: $DOMAIN"

# 結果ディレクトリの作成
mkdir -p "$TEST_RESULTS_DIR"

# テスト結果の初期化
cat > "$RESULTS_FILE" << EOF
{
  "timestamp": "$(date --iso-8601)",
  "environment": "$ENVIRONMENT",
  "domain": "$DOMAIN",
  "test_suites": {}
}
EOF

# 1. インフラストラクチャの確認
log_info "=== Infrastructure Verification ==="

infrastructure_test() {
    log_info "Verifying infrastructure components..."

    local infra_results=()
    local infra_status="pass"

    if [ "$ENVIRONMENT" != "local" ]; then
        # AWS CLI の確認
        if command -v aws &> /dev/null; then
            log_success "AWS CLI is available"
            infra_results+=($(jq -n --arg component "aws_cli" --arg status "available" '{component: $component, status: $status}'))
        else
            log_error "AWS CLI is not available"
            infra_results+=($(jq -n --arg component "aws_cli" --arg status "unavailable" '{component: $component, status: $status}'))
            infra_status="fail"
        fi

        # CloudFormationスタックの確認
        local stack_name="FrontendStack-$ENVIRONMENT"
        if aws cloudformation describe-stacks --stack-name "$stack_name" &>/dev/null; then
            log_success "CloudFormation stack exists: $stack_name"
            infra_results+=($(jq -n --arg component "cloudformation_stack" --arg status "exists" --arg stack_name "$stack_name" '{component: $component, status: $status, stack_name: $stack_name}'))
        else
            log_error "CloudFormation stack not found: $stack_name"
            infra_results+=($(jq -n --arg component "cloudformation_stack" --arg status "missing" --arg stack_name "$stack_name" '{component: $component, status: $status, stack_name: $stack_name}'))
            infra_status="fail"
        fi
    else
        log_info "Skipping AWS infrastructure checks for local environment"
        infra_results+=($(jq -n --arg component "local_environment" --arg status "skipped" '{component: $component, status: $status}'))
    fi

    # 結果をJSONに追加
    local infra_results_json=$(printf '%s\n' "${infra_results[@]}" | jq -s .)
    jq --argjson infrastructure "$infra_results_json" \
       --arg infra_status "$infra_status" \
       '.test_suites.infrastructure = {status: $infra_status, results: $infrastructure}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
    mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
}

# 2. 機能テストの実行
log_info "=== Functional Tests ==="

run_functional_tests() {
    log_info "Running functional tests..."

    if [ -f "./packages/infrastructure/scripts/functional-test.sh" ]; then
        if ./packages/infrastructure/scripts/functional-test.sh "$DOMAIN" "$ENVIRONMENT"; then
            log_success "Functional tests passed"
            jq '.test_suites.functional = {status: "pass", executed: true}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
        else
            log_error "Functional tests failed"
            jq '.test_suites.functional = {status: "fail", executed: true}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
        fi
        mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    else
        log_warning "Functional test script not found"
        jq '.test_suites.functional = {status: "skip", executed: false, reason: "Script not found"}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
        mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    fi
}

# 3. パフォーマンステストの実行
log_info "=== Performance Tests ==="

run_performance_tests() {
    log_info "Running performance tests..."

    if [ -f "./packages/infrastructure/scripts/performance-test.sh" ]; then
        if ./packages/infrastructure/scripts/performance-test.sh "$DOMAIN" "$ENVIRONMENT"; then
            log_success "Performance tests passed"
            jq '.test_suites.performance = {status: "pass", executed: true}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
        else
            log_error "Performance tests failed"
            jq '.test_suites.performance = {status: "fail", executed: true}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
        fi
        mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    else
        log_warning "Performance test script not found"
        jq '.test_suites.performance = {status: "skip", executed: false, reason: "Script not found"}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
        mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    fi
}

# 4. セキュリティテストの実行
log_info "=== Security Tests ==="

run_security_tests() {
    log_info "Running security tests..."

    local security_results=()
    local security_status="pass"

    if [ "$ENVIRONMENT" != "local" ]; then
        # セキュリティヘッダーのテスト
        if [ -f "./packages/infrastructure/scripts/security-headers-test.sh" ]; then
            if ./packages/infrastructure/scripts/security-headers-test.sh "$DOMAIN"; then
                log_success "Security headers test passed"
                security_results+=($(jq -n --arg test "security_headers" --arg status "pass" '{test: $test, status: $status}'))
            else
                log_error "Security headers test failed"
                security_results+=($(jq -n --arg test "security_headers" --arg status "fail" '{test: $test, status: $status}'))
                security_status="fail"
            fi
        else
            log_info "Creating and running basic security headers test..."

            # 基本的なセキュリティヘッダーテスト
            local headers=$(curl -s -I "https://$DOMAIN")
            local required_headers=("strict-transport-security" "x-content-type-options" "x-frame-options")
            local missing_headers=()

            for header in "${required_headers[@]}"; do
                if echo "$headers" | grep -qi "$header"; then
                    log_success "Security header found: $header"
                else
                    log_warning "Security header missing: $header"
                    missing_headers+=("$header")
                fi
            done

            if [ ${#missing_headers[@]} -eq 0 ]; then
                security_results+=($(jq -n --arg test "basic_security_headers" --arg status "pass" '{test: $test, status: $status}'))
            else
                security_results+=($(jq -n --arg test "basic_security_headers" --arg status "fail" --argjson missing_headers "$(printf '%s\n' "${missing_headers[@]}" | jq -R . | jq -s .)" '{test: $test, status: $status, missing_headers: $missing_headers}'))
                security_status="fail"
            fi
        fi

        # SSL/TLS設定のテスト
        if command -v openssl &> /dev/null; then
            log_info "Testing SSL/TLS configuration..."
            if echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" &>/dev/null; then
                log_success "SSL/TLS connection successful"
                security_results+=($(jq -n --arg test "ssl_tls" --arg status "pass" '{test: $test, status: $status}'))
            else
                log_error "SSL/TLS connection failed"
                security_results+=($(jq -n --arg test "ssl_tls" --arg status "fail" '{test: $test, status: $status}'))
                security_status="fail"
            fi
        fi
    else
        log_info "Skipping security tests for local environment"
        security_results+=($(jq -n --arg test "local_environment" --arg status "skipped" '{test: $test, status: $status}'))
    fi

    # 結果をJSONに追加
    local security_results_json=$(printf '%s\n' "${security_results[@]}" | jq -s .)
    jq --argjson security "$security_results_json" \
       --arg security_status "$security_status" \
       '.test_suites.security = {status: $security_status, results: $security}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
    mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
}

# 5. エンドツーエンドテスト
log_info "=== End-to-End Tests ==="

run_e2e_tests() {
    log_info "Running end-to-end tests..."

    local e2e_results=()
    local e2e_status="pass"

    # 基本的なユーザーフローのテスト
    local url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        url="http://$DOMAIN:3000"
    fi

    # 1. ホームページアクセス
    log_info "Testing homepage access..."
    local homepage_response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$homepage_response" = "200" ]; then
        log_success "Homepage accessible"
        e2e_results+=($(jq -n --arg test "homepage_access" --arg status "pass" '{test: $test, status: $status}'))
    else
        log_error "Homepage not accessible (HTTP $homepage_response)"
        e2e_results+=($(jq -n --arg test "homepage_access" --arg status "fail" --arg http_code "$homepage_response" '{test: $test, status: $status, http_code: $http_code}'))
        e2e_status="fail"
    fi

    # 2. 静的リソースの読み込み
    log_info "Testing static resources loading..."
    local content=$(curl -s "$url")
    local has_css=$(echo "$content" | grep -c "\.css" || true)
    local has_js=$(echo "$content" | grep -c "\.js" || true)

    if [ "$has_css" -gt 0 ] && [ "$has_js" -gt 0 ]; then
        log_success "Static resources referenced in HTML"
        e2e_results+=($(jq -n --arg test "static_resources" --arg status "pass" --argjson css_count "$has_css" --argjson js_count "$has_js" '{test: $test, status: $status, css_count: $css_count, js_count: $js_count}'))
    else
        log_warning "Static resources may not be properly referenced"
        e2e_results+=($(jq -n --arg test "static_resources" --arg status "warning" --argjson css_count "$has_css" --argjson js_count "$has_js" '{test: $test, status: $status, css_count: $css_count, js_count: $js_count}'))
    fi

    # 3. API エンドポイントのテスト（存在する場合）
    if [ "$ENVIRONMENT" != "local" ]; then
        log_info "Testing API endpoints..."
        local api_url="https://$DOMAIN/api/health"
        local api_response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url" || echo "000")

        if [ "$api_response" = "200" ]; then
            log_success "API endpoint accessible"
            e2e_results+=($(jq -n --arg test "api_endpoint" --arg status "pass" '{test: $test, status: $status}'))
        else
            log_info "API endpoint not available or not implemented (HTTP $api_response)"
            e2e_results+=($(jq -n --arg test "api_endpoint" --arg status "skip" --arg reason "Not implemented or not available" '{test: $test, status: $status, reason: $reason}'))
        fi
    fi

    # 結果をJSONに追加
    local e2e_results_json=$(printf '%s\n' "${e2e_results[@]}" | jq -s .)
    jq --argjson e2e "$e2e_results_json" \
       --arg e2e_status "$e2e_status" \
       '.test_suites.e2e = {status: $e2e_status, results: $e2e}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
    mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
}

# 6. 監視・ログの確認
log_info "=== Monitoring and Logging ==="

check_monitoring() {
    log_info "Checking monitoring and logging..."

    local monitoring_results=()
    local monitoring_status="pass"

    if [ "$ENVIRONMENT" != "local" ]; then
        # CloudWatchメトリクスの確認
        if aws cloudwatch list-metrics --namespace AWS/CloudFront &>/dev/null; then
            log_success "CloudWatch metrics accessible"
            monitoring_results+=($(jq -n --arg component "cloudwatch_metrics" --arg status "accessible" '{component: $component, status: $status}'))
        else
            log_warning "CloudWatch metrics not accessible"
            monitoring_results+=($(jq -n --arg component "cloudwatch_metrics" --arg status "inaccessible" '{component: $component, status: $status}'))
        fi

        # CloudTrailの確認
        if aws cloudtrail describe-trails &>/dev/null; then
            log_success "CloudTrail accessible"
            monitoring_results+=($(jq -n --arg component "cloudtrail" --arg status "accessible" '{component: $component, status: $status}'))
        else
            log_warning "CloudTrail not accessible"
            monitoring_results+=($(jq -n --arg component "cloudtrail" --arg status "inaccessible" '{component: $component, status: $status}'))
        fi
    else
        log_info "Skipping monitoring checks for local environment"
        monitoring_results+=($(jq -n --arg component "local_environment" --arg status "skipped" '{component: $component, status: $status}'))
    fi

    # 結果をJSONに追加
    local monitoring_results_json=$(printf '%s\n' "${monitoring_results[@]}" | jq -s .)
    jq --argjson monitoring "$monitoring_results_json" \
       --arg monitoring_status "$monitoring_status" \
       '.test_suites.monitoring = {status: $monitoring_status, results: $monitoring}' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
    mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
}

# テストの実行
infrastructure_test
run_functional_tests
run_performance_tests
run_security_tests
run_e2e_tests
check_monitoring

# 全体結果の計算
log_info "Calculating overall results..."

# 各テストスイートの結果を集計
local failed_suites=$(jq '[.test_suites[] | select(.status == "fail")] | length' "$RESULTS_FILE")
local passed_suites=$(jq '[.test_suites[] | select(.status == "pass")] | length' "$RESULTS_FILE")
local skipped_suites=$(jq '[.test_suites[] | select(.status == "skip")] | length' "$RESULTS_FILE")
local total_suites=$(jq '.test_suites | length' "$RESULTS_FILE")

# 全体ステータスの決定
local overall_status="pass"
if [ "$failed_suites" -gt 0 ]; then
    overall_status="fail"
elif [ "$passed_suites" -eq 0 ]; then
    overall_status="skip"
fi

# 最終結果の追加
jq --arg overall_status "$overall_status" \
   --argjson failed_suites "$failed_suites" \
   --argjson passed_suites "$passed_suites" \
   --argjson skipped_suites "$skipped_suites" \
   --argjson total_suites "$total_suites" \
   '. + {
     overall_status: $overall_status,
     summary: {
       total_suites: $total_suites,
       passed_suites: $passed_suites,
       failed_suites: $failed_suites,
       skipped_suites: $skipped_suites
     }
   }' "$RESULTS_FILE" > "$RESULTS_FILE.tmp"
mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"

# 結果の表示
log_info "Integration test completed"
log_info "Results saved to: $RESULTS_FILE"

echo ""
echo "=== Integration Test Summary ==="
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"
echo "Overall Status: $(jq -r '.overall_status' "$RESULTS_FILE")"
echo "Total Test Suites: $(jq -r '.summary.total_suites' "$RESULTS_FILE")"
echo "Passed: $(jq -r '.summary.passed_suites' "$RESULTS_FILE")"
echo "Failed: $(jq -r '.summary.failed_suites' "$RESULTS_FILE")"
echo "Skipped: $(jq -r '.summary.skipped_suites' "$RESULTS_FILE")"

# 失敗したテストスイートの詳細表示
local failed_suite_names=$(jq -r '.test_suites | to_entries[] | select(.value.status == "fail") | .key' "$RESULTS_FILE")
if [ -n "$failed_suite_names" ]; then
    echo ""
    echo "Failed Test Suites:"
    echo "$failed_suite_names" | while read -r suite_name; do
        echo "  - $suite_name"
    done
fi

# 推奨事項の表示
echo ""
echo "=== Recommendations ==="

if [ "$overall_status" = "pass" ]; then
    log_success "All critical tests passed! The frontend deployment is ready for use."

    if [ "$ENVIRONMENT" = "local" ]; then
        echo "  - Consider running tests against a deployed environment"
        echo "  - Verify all static assets are properly built"
    else
        echo "  - Monitor CloudWatch metrics for performance"
        echo "  - Set up automated monitoring alerts"
        echo "  - Consider implementing additional security measures"
    fi
else
    log_error "Some tests failed. Please review the issues before proceeding."

    echo "  - Check failed test details in the results file"
    echo "  - Verify infrastructure deployment"
    echo "  - Review security configurations"
    echo "  - Test manually to confirm functionality"
fi

# 終了コード
if [ "$overall_status" = "pass" ]; then
    exit 0
else
    exit 1
fi
