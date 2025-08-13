#!/bin/bash

# Docker環境テストランナー
# 異なるテストスイートを実行するためのメインスクリプト

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 色付きログ出力
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [テストスイート]"
    echo ""
    echo "利用可能なテストスイート:"
    echo "  quick  - 基本的な動作確認（約2分）"
    echo "  full   - 完全なテスト（約5分）"
    echo "  ci     - CI/CD用テスト（約3分）"
    echo "  all    - 全てのテストスイートを実行"
    echo ""
    echo "例:"
    echo "  $0 quick"
    echo "  $0 full"
    echo "  $0 ci"
    echo ""
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件チェック..."

    # Dockerの確認
    if ! command -v docker &> /dev/null; then
        log_error "Dockerがインストールされていません"
        return 1
    fi

    # Docker Composeの確認
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Composeがインストールされていません"
        return 1
    fi

    # プロジェクトルートの確認
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.ymlが見つかりません"
        return 1
    fi

    log_success "前提条件チェック完了"
    return 0
}

# テストスイート実行
run_test_suite() {
    local suite="$1"
    local script_name=""
    local description=""

    case "$suite" in
        "quick")
            script_name="test-docker-quick.sh"
            description="クイックテスト"
            ;;
        "full")
            script_name="test-docker-env.sh"
            description="完全テスト"
            ;;
        "ci")
            script_name="test-docker-ci.sh"
            description="CI/CDテスト"
            ;;
        *)
            log_error "不明なテストスイート: $suite"
            show_usage
            return 1
            ;;
    esac

    local script_path="$SCRIPT_DIR/$script_name"

    if [ ! -f "$script_path" ]; then
        log_error "テストスクリプトが見つかりません: $script_path"
        return 1
    fi

    log_info "$description を開始..."
    echo "========================================="

    # プロジェクトルートで実行
    cd "$PROJECT_ROOT"

    # テスト実行
    if bash "$script_path"; then
        log_success "$description が成功しました"
        return 0
    else
        log_error "$description が失敗しました"
        return 1
    fi
}

# 全テストスイート実行
run_all_tests() {
    log_info "全テストスイートを実行します..."

    local suites=("quick" "full" "ci")
    local passed=0
    local failed=0
    local failed_suites=()

    for suite in "${suites[@]}"; do
        echo ""
        echo "========================================="
        echo "テストスイート: $suite"
        echo "========================================="

        if run_test_suite "$suite"; then
            passed=$((passed + 1))
        else
            failed=$((failed + 1))
            failed_suites+=("$suite")
        fi
    done

    echo ""
    echo "========================================="
    echo "全テストスイート結果"
    echo "========================================="
    echo "成功: $passed"
    echo "失敗: $failed"
    echo "合計: $((passed + failed))"

    if [ $failed -gt 0 ]; then
        echo ""
        echo "失敗したテストスイート:"
        for suite in "${failed_suites[@]}"; do
            echo "  - $suite"
        done
        return 1
    else
        log_success "全てのテストスイートが成功しました！"
        return 0
    fi
}

# メイン処理
main() {
    local test_suite="${1:-}"

    # 引数チェック
    if [ -z "$test_suite" ]; then
        log_error "テストスイートを指定してください"
        show_usage
        exit 1
    fi

    # 前提条件チェック
    if ! check_prerequisites; then
        exit 1
    fi

    # テスト実行
    case "$test_suite" in
        "all")
            run_all_tests
            ;;
        "quick"|"full"|"ci")
            run_test_suite "$test_suite"
            ;;
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            log_error "不明なテストスイート: $test_suite"
            show_usage
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"
