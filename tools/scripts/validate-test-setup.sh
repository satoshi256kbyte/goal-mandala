#!/bin/bash

# テスト設定検証スクリプト
# 全パッケージのテスト設定とタイムアウト設定を検証

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# プロジェクトルートに移動
cd "$(dirname "$0")/../.."

log_info "テスト設定検証を開始します"

# 1. パッケージ存在確認
check_packages() {
    log_info "パッケージ存在確認"
    local packages=("backend" "frontend" "shared" "infrastructure")
    local missing_packages=()
    
    for package in "${packages[@]}"; do
        if [ -d "packages/$package" ]; then
            log_success "✓ packages/$package"
        else
            log_error "✗ packages/$package (not found)"
            missing_packages+=("$package")
        fi
    done
    
    if [ ${#missing_packages[@]} -gt 0 ]; then
        log_error "Missing packages: ${missing_packages[*]}"
        return 1
    fi
}

# 2. テスト設定ファイル確認
check_test_configs() {
    log_info "テスト設定ファイル確認"
    
    # Backend Jest設定
    if [ -f "packages/backend/jest.config.js" ]; then
        if grep -q "testTimeout.*30000" packages/backend/jest.config.js; then
            log_success "✓ Backend Jest timeout設定"
        else
            log_error "✗ Backend Jest timeout設定が不正"
        fi
        
        if grep -q "forceExit.*true" packages/backend/jest.config.js; then
            log_success "✓ Backend Jest forceExit設定"
        else
            log_error "✗ Backend Jest forceExit設定が不正"
        fi
    else
        log_error "✗ Backend jest.config.js not found"
    fi
    
    # Frontend Vitest設定
    if [ -f "packages/frontend/vitest.config.ts" ]; then
        if grep -q "testTimeout.*30000" packages/frontend/vitest.config.ts; then
            log_success "✓ Frontend Vitest timeout設定"
        else
            log_error "✗ Frontend Vitest timeout設定が不正"
        fi
        
        if grep -q "singleFork.*true" packages/frontend/vitest.config.ts; then
            log_success "✓ Frontend Vitest singleFork設定"
        else
            log_error "✗ Frontend Vitest singleFork設定が不正"
        fi
    else
        log_error "✗ Frontend vitest.config.ts not found"
    fi
    
    # Shared Jest設定
    if [ -f "packages/shared/jest.config.js" ]; then
        if grep -q "testTimeout.*30000" packages/shared/jest.config.js; then
            log_success "✓ Shared Jest timeout設定"
        else
            log_error "✗ Shared Jest timeout設定が不正"
        fi
    else
        log_error "✗ Shared jest.config.js not found"
    fi
}

# 3. タイムアウトスクリプト確認
check_timeout_script() {
    log_info "タイムアウトスクリプト確認"
    
    if [ -f "tools/scripts/test-with-timeout.sh" ]; then
        if [ -x "tools/scripts/test-with-timeout.sh" ]; then
            log_success "✓ タイムアウトスクリプト実行可能"
        else
            log_error "✗ タイムアウトスクリプト実行権限なし"
        fi
    else
        log_error "✗ タイムアウトスクリプトが存在しません"
    fi
}

# 4. package.jsonスクリプト確認
check_package_scripts() {
    log_info "package.jsonスクリプト確認"
    
    if grep -q "test:timeout" package.json; then
        log_success "✓ test:timeout スクリプト"
    else
        log_error "✗ test:timeout スクリプトが不足"
    fi
    
    if grep -q "test:safe" package.json; then
        log_success "✓ test:safe スクリプト"
    else
        log_error "✗ test:safe スクリプトが不足"
    fi
}

# 5. 依存関係確認
check_dependencies() {
    log_info "テスト依存関係確認"
    
    # Backend
    if [ -f "packages/backend/package.json" ]; then
        if grep -q '"jest"' packages/backend/package.json; then
            log_success "✓ Backend Jest依存関係"
        else
            log_error "✗ Backend Jest依存関係が不足"
        fi
    fi
    
    # Frontend
    if [ -f "packages/frontend/package.json" ]; then
        if grep -q '"vitest"' packages/frontend/package.json; then
            log_success "✓ Frontend Vitest依存関係"
        else
            log_error "✗ Frontend Vitest依存関係が不足"
        fi
    fi
}

# 6. 簡単なテスト実行確認
test_execution() {
    log_info "テスト実行確認（ドライラン）"
    
    # Shared（最も軽量）
    if [ -d "packages/shared" ]; then
        log_info "Shared package テスト確認"
        cd packages/shared
        if timeout 10s npx jest --listTests > /dev/null 2>&1; then
            log_success "✓ Shared テスト設定正常"
        else
            log_warning "⚠ Shared テスト設定に問題の可能性"
        fi
        cd ../..
    fi
}

# メイン実行
main() {
    echo "========================================"
    echo "テスト設定検証スクリプト"
    echo "========================================"
    
    local failed=0
    
    check_packages || failed=1
    echo ""
    
    check_test_configs || failed=1
    echo ""
    
    check_timeout_script || failed=1
    echo ""
    
    check_package_scripts || failed=1
    echo ""
    
    check_dependencies || failed=1
    echo ""
    
    test_execution || failed=1
    echo ""
    
    echo "========================================"
    if [ $failed -eq 0 ]; then
        log_success "全ての検証が完了しました"
        echo ""
        log_info "テスト実行コマンド:"
        echo "  pnpm run test:timeout        # 全パッケージ（2分タイムアウト）"
        echo "  pnpm run test:safe           # 全パッケージ（3分タイムアウト）"
        echo "  pnpm run test:timeout:backend # バックエンドのみ"
        echo ""
        return 0
    else
        log_error "検証に失敗しました。上記のエラーを修正してください。"
        return 1
    fi
}

main "$@"
