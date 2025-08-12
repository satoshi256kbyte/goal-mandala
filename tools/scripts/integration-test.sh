#!/bin/bash

# モノレポ統合テストスクリプト（シェル版）
#
# このスクリプトは以下の動作確認を行います：
# - pnpm install の動作確認
# - pnpm build の動作確認
# - pnpm test の動作確認
# - pnpm lint の動作確認
# - パッケージ間依存関係の正常動作確認

set -e  # エラー時に終了

# 色付きログ出力用の関数
log_info() {
    echo "📋 [$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_success() {
    echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo "❌ [$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

log_warning() {
    echo "⚠️  [$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# パッケージ構造の確認
verify_package_structure() {
    log_info "パッケージ構造の確認を開始"

    local packages=("packages/frontend" "packages/backend" "packages/infrastructure" "packages/shared")
    local missing_packages=()

    for pkg in "${packages[@]}"; do
        if [[ ! -f "$pkg/package.json" ]]; then
            missing_packages+=("$pkg")
        fi
    done

    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        log_error "以下のパッケージが見つかりません: ${missing_packages[*]}"
        return 1
    fi

    log_success "パッケージ構造の確認完了"
}

# workspace設定の確認
verify_workspace_config() {
    log_info "workspace設定の確認を開始"

    # 必要なファイルの存在確認
    local required_files=("pnpm-workspace.yaml" "turbo.json" "package.json")

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "$file が見つかりません"
            return 1
        fi
    done

    # 必要なスクリプトの確認
    local required_scripts=("build" "test" "lint" "type-check")

    for script in "${required_scripts[@]}"; do
        if ! jq -e ".scripts.\"$script\"" package.json > /dev/null 2>&1; then
            log_error "スクリプト '$script' が package.json に見つかりません"
            return 1
        fi
    done

    log_success "workspace設定の確認完了"
}

# コマンド実行用のヘルパー関数
execute_command() {
    local command="$1"
    local description="$2"
    local start_time=$(date +%s%3N)

    log_info "開始: $description"

    if eval "$command"; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        log_success "完了: $description (${duration}ms)"
        return 0
    else
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        log_error "失敗: $description (${duration}ms)"
        return 1
    fi
}

# メイン実行関数
main() {
    log_info "=== モノレポ統合テスト開始 ==="

    local test_results=()
    local failed_tests=()

    # 1. パッケージ構造とworkspace設定の確認
    if verify_package_structure && verify_workspace_config; then
        test_results+=("構造確認: ✅")
    else
        test_results+=("構造確認: ❌")
        failed_tests+=("構造確認")
    fi

    # 2. pnpm install テスト
    log_info "=== pnpm install テスト ==="
    if execute_command "pnpm install" "パッケージインストール"; then
        test_results+=("install: ✅")
    else
        test_results+=("install: ❌")
        failed_tests+=("install")
        log_error "pnpm install が失敗したため、テストを中断します"
        exit 1
    fi

    # 3. pnpm build テスト
    log_info "=== pnpm build テスト ==="
    if execute_command "pnpm build" "プロジェクトビルド"; then
        test_results+=("build: ✅")
    else
        test_results+=("build: ❌")
        failed_tests+=("build")
    fi

    # 4. pnpm test テスト
    log_info "=== pnpm test テスト ==="
    if execute_command "pnpm test" "テスト実行"; then
        test_results+=("test: ✅")
    else
        test_results+=("test: ❌")
        failed_tests+=("test")
        log_warning "テストが失敗しましたが、統合テストを継続します"
    fi

    # 5. pnpm lint テスト
    log_info "=== pnpm lint テスト ==="
    if execute_command "pnpm lint" "リント実行"; then
        test_results+=("lint: ✅")
    else
        test_results+=("lint: ❌")
        failed_tests+=("lint")
        log_warning "リントが失敗しましたが、統合テストを継続します"
    fi

    # 結果サマリーの出力
    log_info "=== テスト結果サマリー ==="
    for result in "${test_results[@]}"; do
        echo "$result"
    done

    if [[ ${#failed_tests[@]} -eq 0 ]]; then
        log_success "=== 全ての統合テストが成功しました ==="
        exit 0
    else
        log_error "=== 以下のテストが失敗しました: ${failed_tests[*]} ==="
        exit 1
    fi
}

# スクリプト実行
main "$@"
