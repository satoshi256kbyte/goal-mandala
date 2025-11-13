#!/bin/bash

# テスト実行タイムアウト管理スクリプト
# Usage: ./test-with-timeout.sh [package] [timeout_seconds] [--quiet]

# set -e を削除してエラーハンドリングを改善

# デフォルト設定
DEFAULT_TIMEOUT=120  # 2分
PACKAGE=${1:-"all"}
TIMEOUT=${2:-$DEFAULT_TIMEOUT}
QUIET_MODE=false

# 引数解析
for arg in "$@"; do
    case $arg in
        --quiet)
            QUIET_MODE=true
            shift
            ;;
    esac
done

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    if [ "$QUIET_MODE" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    if [ "$QUIET_MODE" = false ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${BLUE}▶${NC} $1"
}

# タイムアウト付きコマンド実行（macOS対応）
run_with_timeout() {
    local cmd="$1"
    local timeout="$2"
    local description="$3"

    if [ "$QUIET_MODE" = true ]; then
        log_progress "Testing $description..."
        # quietモードでは出力を抑制
        eval "$cmd" >/dev/null 2>&1 &
    else
        log_info "Running: $description (timeout: ${timeout}s)"
        eval "$cmd" &
    fi

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
        if [ "$QUIET_MODE" = true ]; then
            echo -e "${GREEN}✓${NC} $description"
        else
            log_success "Completed: $description"
        fi
    else
        if [ "$QUIET_MODE" = true ]; then
            echo -e "${RED}✗${NC} $description (exit code: $exit_code)"
        else
            log_error "Failed: $description (exit code: $exit_code)"
        fi
    fi

    return $exit_code
}

# パッケージ別テスト実行
run_package_tests() {
    local package_name="$1"
    local package_path="packages/$package_name"
    local package_timeout=$TIMEOUT

    if [ ! -d "$package_path" ]; then
        log_error "Package not found: $package_name"
        return 1
    fi

    # フロントエンドテストのデフォルトタイムアウトを60秒に設定
    if [ "$package_name" = "frontend" ] && [ "$TIMEOUT" -eq "$DEFAULT_TIMEOUT" ]; then
        package_timeout=60
    fi

    if [ "$QUIET_MODE" = false ]; then
        log_info "Testing package: $package_name"
    fi

    case "$package_name" in
        "backend")
            run_with_timeout "cd $package_path && npx jest --passWithNoTests --maxWorkers=1 --forceExit --detectOpenHandles --testTimeout=30000 --silent" $package_timeout "backend"
            ;;
        "frontend")
            run_with_timeout "cd $package_path && npx vitest run --reporter=basic --no-coverage --isolate=false --config=vitest.config.ts" $package_timeout "frontend"
            ;;
        "shared")
            run_with_timeout "cd $package_path && npx jest --passWithNoTests --maxWorkers=1 --forceExit --testTimeout=30000 --silent" $package_timeout "shared"
            ;;
        "infrastructure")
            if [ -f "$package_path/package.json" ] && grep -q '"test"' "$package_path/package.json"; then
                run_with_timeout "cd $package_path && npm test" $package_timeout "infrastructure"
            else
                if [ "$QUIET_MODE" = false ]; then
                    log_warning "No test script found for infrastructure package"
                fi
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

    if [ "$QUIET_MODE" = true ]; then
        echo "Running tests (timeout: ${TIMEOUT}s each)..."
    else
        log_info "Running tests for all packages with timeout: ${TIMEOUT}s each"
    fi

    for package in "${packages[@]}"; do
        if [ -d "packages/$package" ]; then
            if run_package_tests "$package"; then
                if [ "$QUIET_MODE" = false ]; then
                    log_success "Tests passed for: $package"
                fi
            else
                local exit_code=$?
                if [ $exit_code -eq 124 ]; then
                    log_error "Tests timed out for: $package"
                else
                    log_error "Tests failed for: $package (exit code: $exit_code)"
                fi
                failed_packages+=("$package")
            fi
            if [ "$QUIET_MODE" = false ]; then
                echo "----------------------------------------"
            fi
        else
            if [ "$QUIET_MODE" = false ]; then
                log_warning "Package directory not found: $package"
            fi
        fi
    done

    # 結果サマリー
    if [ "$QUIET_MODE" = false ]; then
        echo ""
        log_info "Test Summary:"
    fi

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

    if [ "$QUIET_MODE" = false ]; then
        log_info "Test execution with timeout management"
        log_info "Package: $PACKAGE, Timeout: ${TIMEOUT}s"
    fi

    if [ "$PACKAGE" = "all" ]; then
        run_all_tests
    else
        run_package_tests "$PACKAGE"
    fi
}

# ヘルプ表示
show_help() {
    echo "Usage: $0 [package] [timeout_seconds] [--quiet]"
    echo ""
    echo "Arguments:"
    echo "  package         Package to test (all|backend|frontend|shared|infrastructure)"
    echo "  timeout_seconds Timeout in seconds (default: $DEFAULT_TIMEOUT)"
    echo "  --quiet         Minimal output mode"
    echo ""
    echo "Examples:"
    echo "  $0                    # Test all packages with default timeout"
    echo "  $0 backend           # Test backend package with default timeout"
    echo "  $0 frontend 60       # Test frontend package with 60s timeout"
    echo "  $0 all 180 --quiet   # Test all packages quietly with 180s timeout each"
}

# 引数チェック
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 実行
main "$@"
