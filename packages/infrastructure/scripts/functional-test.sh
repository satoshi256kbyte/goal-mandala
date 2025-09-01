#!/bin/bash

# フロントエンド配信環境 機能テストスクリプト

set -e

# 設定
DOMAIN="${1:-localhost}"
ENVIRONMENT="${2:-local}"
TEST_RESULTS_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_FILE="$TEST_RESULTS_DIR/functional-test-$TIMESTAMP.json"

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

# 結果ディレクトリの作成
mkdir -p "$TEST_RESULTS_DIR"

# テスト結果の初期化
cat > "$RESULTS_FILE" << EOF
{
  "timestamp": "$(date --
  "domain": "$DOMAIN",
  "environment": "$ENVIRONMENT",
  "tests": {}
}
EOF

# 1. 基本的なHTTPレスポンステスト
log_info "Starting basic HTTP response test..."

http_response_test() {
    local url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        url="http://$DOMAIN:3000"
    fi

    log_info "Testing HTTP response for $url"

    local response=$(curl -s -I "$url")
    local http_code=$(echo "$response" | head -n1 | cut -d' ' -f2)
    local content_type=$(echo "$response" | grep -i "content-type" | cut -d' ' -f2- | tr -d '\r')

    local status="pass"
    local issues=()

    # HTTPステータスコードの確認
    if [ "$http_code" != "200" ]; then
        status="fail"
        issues+=("HTTP status code is $http_code, expected 200")
        log_error "HTTP status code: $http_code (expected 200)"
    else
        log_success "HTTP status code: $http_code"
    fi

    # Content-Typeの確認
    if [[ "$content_type" == *"text/html"* ]]; then
        log_success "Content-Type: $content_type"
    else
        status="fail"
        issues+=("Content-Type is '$content_type', expected text/html")
        log_warning "Content-Type: $content_type (expected text/html)"
    fi

    # 結果をJSONに追加
    local issues_json=$(printf '%s\n' "${issues[@]}" | jq -R . | jq -s .)
    jq -n --arg test "http_response" \
          --arg status "$status" \
          --arg http_code "$http_code" \
          --arg content_type "$content_type" \
          --argjson issues "$issues_json" \
          '{test: $test, status: $status, http_code: $http_code, content_type: $content_type, issues: $issues}' >> "$RESULTS_FILE.tmp"
}

# 2. HTMLコンテンツの検証
log_info "Starting HTML content validation test..."

html_content_test() {
    local url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        url="http://$DOMAIN:3000"
    fi

    log_info "Testing HTML content for $url"

    local content=$(curl -s "$url")
    local status="pass"
    local issues=()
    local found_elements=()

    # 基本的なHTML要素の確認
    local required_elements=(
        "<html"
        "<head"
        "<body"
        "<title"
    )

    for element in "${required_elements[@]}"; do
        if echo "$content" | grep -q "$element"; then
            found_elements+=("$element")
            log_success "Found required element: $element"
        else
            status="fail"
            issues+=("Missing required HTML element: $element")
            log_error "Missing required element: $element"
        fi
    done

    # メタタグの確認
    local meta_tags=(
        "viewport"
        "charset"
    )

    for meta in "${meta_tags[@]}"; do
        if echo "$content" | grep -qi "meta.*$meta"; then
            found_elements+=("meta-$meta")
            log_success "Found meta tag: $meta"
        else
            issues+=("Missing meta tag: $meta")
            log_warning "Missing meta tag: $meta"
        fi
    done

    # React/JSアプリケーションの確認
    if echo "$content" | grep -q "id=\"root\""; then
        found_elements+=("react-root")
        log_success "Found React root element"
    else
        issues+=("React root element not found")
        log_warning "React root element not found"
    fi

    # 結果をJSONに追加
    local issues_json=$(printf '%s\n' "${issues[@]}" | jq -R . | jq -s .)
    local found_json=$(printf '%s\n' "${found_elements[@]}" | jq -R . | jq -s .)
    jq -n --arg test "html_content" \
          --arg status "$status" \
          --argjson found_elements "$found_json" \
          --argjson issues "$issues_json" \
          '{test: $test, status: $status, found_elements: $found_elements, issues: $issues}' >> "$RESULTS_FILE.tmp"
}

# 3. 静的アセットの可用性テスト
log_info "Starting static assets availability test..."

static_assets_test() {
    local base_url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        base_url="http://$DOMAIN:3000"
    fi

    log_info "Testing static assets availability for $base_url"

    # HTMLからアセットURLを抽出
    local content=$(curl -s "$base_url")
    local assets=()
    local asset_results=()

    # CSS ファイルの抽出
    local css_files=$(echo "$content" | grep -o 'href="[^"]*\.css[^"]*"' | sed 's/href="//g' | sed 's/"//g')
    # JS ファイルの抽出
    local js_files=$(echo "$content" | grep -o 'src="[^"]*\.js[^"]*"' | sed 's/src="//g' | sed 's/"//g')

    # 一般的な静的アセット
    local common_assets=(
        "/favicon.ico"
        "/logo.png"
        "/manifest.json"
    )

    # 全アセットリストの作成
    for asset in $css_files $js_files "${common_assets[@]}"; do
        # 相対パスを絶対パスに変換
        if [[ "$asset" == /* ]]; then
            assets+=("$base_url$asset")
        elif [[ "$asset" == http* ]]; then
            assets+=("$asset")
        else
            assets+=("$base_url/$asset")
        fi
    done

    local total_assets=${#assets[@]}
    local available_assets=0

    if [ $total_assets -eq 0 ]; then
        log_warning "No static assets found to test"
        jq -n --arg test "static_assets" \
              --arg status "skip" \
              --arg reason "No assets found" \
              '{test: $test, status: $status, reason: $reason}' >> "$RESULTS_FILE.tmp"
        return 0
    fi

    # 各アセットの可用性をテスト
    for asset in "${assets[@]}"; do
        log_info "Testing asset: $asset"

        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$asset")
        local asset_name=$(basename "$asset")

        if [ "$http_code" = "200" ]; then
            available_assets=$((available_assets + 1))
            asset_results+=($(jq -n --arg asset "$asset_name" --arg url "$asset" --arg status "available" --arg http_code "$http_code" '{asset: $asset, url: $url, status: $status, http_code: $http_code}'))
            log_success "Asset available: $asset_name (HTTP $http_code)"
        else
            asset_results+=($(jq -n --arg asset "$asset_name" --arg url "$asset" --arg status "unavailable" --arg http_code "$http_code" '{asset: $asset, url: $url, status: $status, http_code: $http_code}'))
            log_warning "Asset unavailable: $asset_name (HTTP $http_code)"
        fi
    done

    # 可用性率の計算
    local availability_rate=0
    if [ $total_assets -gt 0 ]; then
        availability_rate=$(echo "scale=2; $available_assets * 100 / $total_assets" | bc -l)
    fi

    # ステータスの判定
    local status="pass"
    if (( $(echo "$availability_rate < 90" | bc -l) )); then
        status="fail"
        log_error "Asset availability rate ($availability_rate%) below threshold (90%)"
    else
        log_success "Asset availability rate: $availability_rate%"
    fi

    # 結果をJSONに追加
    local asset_results_json=$(printf '%s\n' "${asset_results[@]}" | jq -s .)
    jq -n --arg test "static_assets" \
          --arg status "$status" \
          --argjson total_assets "$total_assets" \
          --argjson available_assets "$available_assets" \
          --argjson availability_rate "$availability_rate" \
          --argjson results "$asset_results_json" \
          '{test: $test, status: $status, total_assets: $total_assets, available_assets: $available_assets, availability_rate: $availability_rate, results: $results}' >> "$RESULTS_FILE.tmp"
}

# 4. HTTPS リダイレクトテスト
log_info "Starting HTTPS redirect test..."

https_redirect_test() {
    if [ "$ENVIRONMENT" = "local" ]; then
        log_info "Skipping HTTPS redirect test for local environment"
        return 0
    fi

    local http_url="http://$DOMAIN"
    local https_url="https://$DOMAIN"

    log_info "Testing HTTPS redirect from $http_url to $https_url"

    # HTTPアクセス時のリダイレクト確認
    local response=$(curl -s -I "$http_url")
    local http_code=$(echo "$response" | head -n1 | cut -d' ' -f2)
    local location=$(echo "$response" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r')

    local status="pass"
    local issues=()

    # リダイレクトステータスコードの確認
    if [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        log_success "HTTP redirect status: $http_code"
    else
        status="fail"
        issues+=("HTTP request returned $http_code, expected 301 or 302")
        log_error "HTTP redirect status: $http_code (expected 301 or 302)"
    fi

    # リダイレクト先の確認
    if [[ "$location" == https://* ]]; then
        log_success "Redirect location: $location"
    else
        status="fail"
        issues+=("Redirect location is '$location', expected HTTPS URL")
        log_error "Redirect location: $location (expected HTTPS URL)"
    fi

    # 結果をJSONに追加
    local issues_json=$(printf '%s\n' "${issues[@]}" | jq -R . | jq -s .)
    jq -n --arg test "https_redirect" \
          --arg status "$status" \
          --arg http_code "$http_code" \
          --arg location "$location" \
          --argjson issues "$issues_json" \
          '{test: $test, status: $status, http_code: $http_code, location: $location, issues: $issues}' >> "$RESULTS_FILE.tmp"
}

# 5. SPAルーティングテスト
log_info "Starting SPA routing test..."

spa_routing_test() {
    local base_url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        base_url="http://$DOMAIN:3000"
    fi

    log_info "Testing SPA routing for $base_url"

    # 存在しないパスでのテスト（SPAでは通常200を返すべき）
    local test_paths=(
        "/nonexistent-page"
        "/login"
        "/dashboard"
        "/profile"
    )

    local routing_results=()
    local successful_routes=0

    for path in "${test_paths[@]}"; do
        local url="$base_url$path"
        log_info "Testing SPA route: $path"

        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

        if [ "$http_code" = "200" ]; then
            successful_routes=$((successful_routes + 1))
            routing_results+=($(jq -n --arg path "$path" --arg status "success" --arg http_code "$http_code" '{path: $path, status: $status, http_code: $http_code}'))
            log_success "SPA route works: $path (HTTP $http_code)"
        else
            routing_results+=($(jq -n --arg path "$path" --arg status "fail" --arg http_code "$http_code" '{path: $path, status: $status, http_code: $http_code}'))
            log_warning "SPA route issue: $path (HTTP $http_code)"
        fi
    done

    # 成功率の計算
    local total_paths=${#test_paths[@]}
    local success_rate=0
    if [ $total_paths -gt 0 ]; then
        success_rate=$(echo "scale=2; $successful_routes * 100 / $total_paths" | bc -l)
    fi

    # ステータスの判定
    local status="pass"
    if (( $(echo "$success_rate < 75" | bc -l) )); then
        status="fail"
        log_error "SPA routing success rate ($success_rate%) below threshold (75%)"
    else
        log_success "SPA routing success rate: $success_rate%"
    fi

    # 結果をJSONに追加
    local routing_results_json=$(printf '%s\n' "${routing_results[@]}" | jq -s .)
    jq -n --arg test "spa_routing" \
          --arg status "$status" \
          --argjson total_paths "$total_paths" \
          --argjson successful_routes "$successful_routes" \
          --argjson success_rate "$success_rate" \
          --argjson results "$routing_results_json" \
          '{test: $test, status: $status, total_paths: $total_paths, successful_routes: $successful_routes, success_rate: $success_rate, results: $results}' >> "$RESULTS_FILE.tmp"
}

# 6. セキュリティ機能テスト
log_info "Starting security functionality test..."

security_functionality_test() {
    local url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        log_info "Skipping security functionality test for local environment"
        return 0
    fi

    log_info "Testing security functionality for $url"

    local security_results=()
    local security_issues=()

    # セキュリティヘッダーの詳細チェック
    local headers=$(curl -s -I "$url")

    # HSTS ヘッダーの詳細確認
    local hsts_header=$(echo "$headers" | grep -i "strict-transport-security" | cut -d' ' -f2-)
    if [[ "$hsts_header" == *"max-age"* ]]; then
        security_results+=($(jq -n --arg check "hsts" --arg status "pass" --arg value "$hsts_header" '{check: $check, status: $status, value: $value}'))
        log_success "HSTS header properly configured"
    else
        security_results+=($(jq -n --arg check "hsts" --arg status "fail" --arg value "$hsts_header" '{check: $check, status: $status, value: $value}'))
        security_issues+=("HSTS header not properly configured")
        log_error "HSTS header not properly configured"
    fi

    # X-Frame-Options の確認
    local frame_options=$(echo "$headers" | grep -i "x-frame-options" | cut -d' ' -f2- | tr -d '\r')
    if [[ "$frame_options" == *"DENY"* ]] || [[ "$frame_options" == *"SAMEORIGIN"* ]]; then
        security_results+=($(jq -n --arg check "x-frame-options" --arg status "pass" --arg value "$frame_options" '{check: $check, status: $status, value: $value}'))
        log_success "X-Frame-Options properly configured: $frame_options"
    else
        security_results+=($(jq -n --arg check "x-frame-options" --arg status "fail" --arg value "$frame_options" '{check: $check, status: $status, value: $value}'))
        security_issues+=("X-Frame-Options not properly configured")
        log_error "X-Frame-Options not properly configured"
    fi

    # SSL/TLS 設定の確認
    if command -v openssl &> /dev/null; then
        local ssl_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -text 2>/dev/null)

        if [ $? -eq 0 ]; then
            security_results+=($(jq -n --arg check "ssl_certificate" --arg status "pass" --arg value "Valid SSL certificate" '{check: $check, status: $status, value: $value}'))
            log_success "SSL certificate is valid"
        else
            security_results+=($(jq -n --arg check "ssl_certificate" --arg status "fail" --arg value "Invalid SSL certificate" '{check: $check, status: $status, value: $value}'))
            security_issues+=("SSL certificate validation failed")
            log_error "SSL certificate validation failed"
        fi
    fi

    # 全体的なセキュリティステータス
    local status="pass"
    if [ ${#security_issues[@]} -gt 0 ]; then
        status="fail"
    fi

    # 結果をJSONに追加
    local security_results_json=$(printf '%s\n' "${security_results[@]}" | jq -s .)
    local security_issues_json=$(printf '%s\n' "${security_issues[@]}" | jq -R . | jq -s .)
    jq -n --arg test "security_functionality" \
          --arg status "$status" \
          --argjson results "$security_results_json" \
          --argjson issues "$security_issues_json" \
          '{test: $test, status: $status, results: $results, issues: $issues}' >> "$RESULTS_FILE.tmp"
}

# 7. エラーページテスト
log_info "Starting error pages test..."

error_pages_test() {
    local base_url="https://$DOMAIN"
    if [ "$ENVIRONMENT" = "local" ]; then
        base_url="http://$DOMAIN:3000"
    fi

    log_info "Testing error pages for $base_url"

    # 存在しない静的ファイルへのアクセス
    local test_url="$base_url/nonexistent-file.xyz"
    local response=$(curl -s -I "$test_url")
    local http_code=$(echo "$response" | head -n1 | cut -d' ' -f2)

    local status="pass"
    local issues=()

    # SPAの場合、存在しないファイルでも200を返すことがある
    if [ "$http_code" = "404" ] || [ "$http_code" = "200" ]; then
        log_success "Error handling works correctly (HTTP $http_code)"
    else
        status="fail"
        issues+=("Unexpected HTTP code $http_code for nonexistent file")
        log_error "Unexpected error handling (HTTP $http_code)"
    fi

    # 結果をJSONに追加
    local issues_json=$(printf '%s\n' "${issues[@]}" | jq -R . | jq -s .)
    jq -n --arg test "error_pages" \
          --arg status "$status" \
          --arg test_url "$test_url" \
          --arg http_code "$http_code" \
          --argjson issues "$issues_json" \
          '{test: $test, status: $status, test_url: $test_url, http_code: $http_code, issues: $issues}' >> "$RESULTS_FILE.tmp"
}

# テストの実行
log_info "Starting functional tests for $DOMAIN ($ENVIRONMENT environment)"

# 各テストの実行
http_response_test
html_content_test
static_assets_test
https_redirect_test
spa_routing_test
security_functionality_test
error_pages_test

# 結果の統合
log_info "Consolidating test results..."

if [ -f "$RESULTS_FILE.tmp" ]; then
    # 個別テスト結果を統合
    local test_results=$(cat "$RESULTS_FILE.tmp" | jq -s .)

    # 全体的な成功/失敗の判定
    local overall_status="pass"
    local failed_tests=$(echo "$test_results" | jq '[.[] | select(.status == "fail")] | length')
    local skipped_tests=$(echo "$test_results" | jq '[.[] | select(.status == "skip")] | length')

    if [ "$failed_tests" -gt 0 ]; then
        overall_status="fail"
    fi

    # 最終結果ファイルの作成
    jq --argjson tests "$test_results" \
       --arg overall_status "$overall_status" \
       --argjson failed_count "$failed_tests" \
       --argjson skipped_count "$skipped_tests" \
       '. + {tests: $tests, overall_status: $overall_status, failed_tests: $failed_count, skipped_tests: $skipped_count}' "$RESULTS_FILE" > "$RESULTS_FILE.final"

    mv "$RESULTS_FILE.final" "$RESULTS_FILE"
    rm -f "$RESULTS_FILE.tmp"
else
    log_error "No test results found"
    exit 1
fi

# 結果の表示
log_info "Functional test completed"
log_info "Results saved to: $RESULTS_FILE"

echo ""
echo "=== Test Summary ==="
echo "Overall Status: $(jq -r '.overall_status' "$RESULTS_FILE")"
echo "Failed Tests: $(jq -r '.failed_tests' "$RESULTS_FILE")"
echo "Skipped Tests: $(jq -r '.skipped_tests' "$RESULTS_FILE")"
echo "Total Tests: $(jq -r '.tests | length' "$RESULTS_FILE")"

# 失敗したテストの詳細表示
local failed_test_names=$(jq -r '.tests[] | select(.status == "fail") | .test' "$RESULTS_FILE")
if [ -n "$failed_test_names" ]; then
    echo ""
    echo "Failed Tests:"
    echo "$failed_test_names" | while read -r test_name; do
        echo "  - $test_name"
    done
fi

# スキップされたテストの表示
local skipped_test_names=$(jq -r '.tests[] | select(.status == "skip") | .test' "$RESULTS_FILE")
if [ -n "$skipped_test_names" ]; then
    echo ""
    echo "Skipped Tests:"
    echo "$skipped_test_names" | while read -r test_name; do
        echo "  - $test_name"
    done
fi

# 終了コード
if [ "$(jq -r '.overall_status' "$RESULTS_FILE")" = "pass" ]; then
    log_success "All functional tests passed!"
    exit 0
else
    log_error "Some functional tests failed!"
    exit 1
fi
iso-86
