#!/bin/bash

# テスト実行タイムアウト管理スクリプト
# Usage: ./test-with-timeout.sh [package] [timeout_seconds]

# set -e を削除してエラーハンドリングを改善

# デフォルト設定
DEFAULT_TIMEOUT=120  # 2分
PACKAGE=${1:-"all"}
TIMEOUT=${2:-$DEFAULT_TIMEOUT}

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
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

# タイムアウト付きコマンド実行（macOS対応）
run_with_timeout() {
    local cmd="$1"
    local timeout="$2"
    local description="$3"
    
    log_info "Running: $description (timeout: ${timeout}s)"
    
    # バックグラウンドでコマンド実行
    eval "$cmd" &
    local pid=$!
    
    # タイムアウト監視
    local count=0
    while kill -0 $pid 2>/dev/null; do
        if [ $count -ge $timeout ]; then
            log_error "Timeout reached for: $description"
            kill -TERM $pid 2>/dev/null || true
            sleep 2
            kill -KILL $pid 2>/dev/null || true
            return 124  # timeout exit code
        fi
        sleep 1
        ((count++))
    done
    
    # プロセス終了を待機
    wait $pid
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Completed: $description"
    else
        log_error "Failed: $description (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# パッケージ別テスト実行
run_package_tests() {
    local package_name="$1"
    local package_path="packages/$package_name"
    
    if [ ! -d "$package_path" ]; then
        log_error "Package not found: $package_name"
        return 1
    fi
    
    log_info "Testing package: $package_name"
    
    case "$package_name" in
        "backend")
            run_with_timeout "cd $package_path && npx jest --passWithNoTests --maxWorkers=1 --forceExit --detectOpenHandles --testTimeout=30000 --verbose" $TIMEOUT "Backend Jest tests"
            ;;
        "frontend")
            run_with_timeout "cd $package_path && npx vitest run --reporter=verbose --config=vitest.config.ts" $TIMEOUT "Frontend Vitest tests"
            ;;
        "shared")
            run_with_timeout "cd $package_path && npx jest --passWithNoTests --maxWorkers=1 --forceExit --testTimeout=30000 --verbose" $TIMEOUT "Shared Jest tests"
            ;;
        "infrastructure")
            if [ -f "$package_path/package.json" ] && grep -q '"test"' "$package_path/package.json"; then
                run_with_timeout "cd $package_path && npm test" $TIMEOUT "Infrastructure tests"
            else
                log_warning "No test script found for infrastructure package"
                return 0
            fi
            ;;
        *)
            log_error "Unknown package: $package_name"
            return 1
            ;;
    esac
}

# 全パッケージテスト実行
run_all_tests() {
    local failed_packages=()
    local packages=("shared" "backend" "frontend" "infrastructure")
    
    log_info "Running tests for all packages with timeout: ${TIMEOUT}s each"
    
    for package in "${packages[@]}"; do
        if [ -d "packages/$package" ]; then
            log_info "Starting tests for: $package"
            if run_package_tests "$package"; then
                log_success "Tests passed for: $package"
            else
                local exit_code=$?
                if [ $exit_code -eq 124 ]; then
                    log_error "Tests timed out for: $package"
                else
                    log_error "Tests failed for: $package (exit code: $exit_code)"
                fi
                failed_packages+=("$package")
            fi
            echo "----------------------------------------"
        else
            log_warning "Package directory not found: $package"
        fi
    done
    
    # 結果サマリー
    echo ""
    log_info "Test Summary:"
    if [ ${#failed_packages[@]} -eq 0 ]; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Failed packages: ${failed_packages[*]}"
        return 1
    fi
}

# メイン実行
main() {
    # プロジェクトルートに移動
    cd "$(dirname "$0")/../.."
    
    log_info "Test execution with timeout management"
    log_info "Package: $PACKAGE, Timeout: ${TIMEOUT}s"
    
    if [ "$PACKAGE" = "all" ]; then
        run_all_tests
    else
        run_package_tests "$PACKAGE"
    fi
}

# ヘルプ表示
show_help() {
    echo "Usage: $0 [package] [timeout_seconds]"
    echo ""
    echo "Arguments:"
    echo "  package         Package to test (all|backend|frontend|shared|infrastructure)"
    echo "  timeout_seconds Timeout in seconds (default: $DEFAULT_TIMEOUT)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Test all packages with default timeout"
    echo "  $0 backend           # Test backend package with default timeout"
    echo "  $0 frontend 60       # Test frontend package with 60s timeout"
    echo "  $0 all 180           # Test all packages with 180s timeout each"
}

# 引数チェック
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 実行
main "$@"
