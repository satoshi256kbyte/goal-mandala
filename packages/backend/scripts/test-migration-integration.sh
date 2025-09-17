#!/bin/bash

# マイグレーション統合テストスクリプト
# Docker環境なしでの統合テスト実行

set -euo pipefail

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# テスト結果
TESTS_PASSED=0
TESTS_FAILED=0

# テスト実行
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log_info "テスト実行: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        log_success "✓ $test_name"
        ((TESTS_PASSED++))
    else
        log_error "✗ $test_name"
        ((TESTS_FAILED++))
    fi
}

# スクリプト存在確認テスト
test_scripts_exist() {
    log_info "マイグレーションスクリプト存在確認テスト"
    
    local scripts=(
        "scripts/migrate-dev.sh"
        "scripts/migrate-status.sh"
        "scripts/migrate-rollback.sh"
        "scripts/migrate-prod.sh"
        "scripts/backup-database.sh"
        "scripts/restore-database.sh"
        "scripts/setup-db-security.sh"
    )
    
    for script in "${scripts[@]}"; do
        run_test "スクリプト存在: $script" "[ -f '$script' ]"
        run_test "実行権限: $script" "[ -x '$script' ]"
    done
}

# テストファイル存在確認
test_files_exist() {
    log_info "テストファイル存在確認"
    
    local test_files=(
        "tests/migration.test.ts"
        "tests/migration-performance.test.ts"
        "src/utils/migration-logger.ts"
        "src/utils/migration-metrics.ts"
    )
    
    for file in "${test_files[@]}"; do
        run_test "テストファイル存在: $file" "[ -f '$file' ]"
    done
}

# Prismaスキーマ検証
test_prisma_schema() {
    log_info "Prismaスキーマ検証テスト"
    
    run_test "Prismaスキーマ構文チェック" "pnpm prisma validate"
    run_test "Prismaクライアント生成" "pnpm prisma generate"
}

# TypeScript型チェック
test_typescript() {
    log_info "TypeScript型チェックテスト"
    
    run_test "TypeScript型チェック" "pnpm run type-check"
}

# ESLintチェック
test_eslint() {
    log_info "ESLintチェックテスト"
    
    run_test "ESLint構文チェック" "pnpm run lint"
}

# スクリプトヘルプ表示テスト
test_script_help() {
    log_info "スクリプトヘルプ表示テスト"
    
    local scripts=(
        "scripts/migrate-dev.sh"
        "scripts/migrate-status.sh"
        "scripts/migrate-rollback.sh"
        "scripts/migrate-prod.sh"
        "scripts/backup-database.sh"
        "scripts/restore-database.sh"
        "scripts/setup-db-security.sh"
    )
    
    for script in "${scripts[@]}"; do
        run_test "ヘルプ表示: $script" "./$script --help"
    done
}

# package.jsonスクリプト確認
test_package_scripts() {
    log_info "package.jsonスクリプト確認テスト"
    
    local scripts=(
        "migrate:dev"
        "migrate:status"
        "migrate:rollback"
        "migrate:prod"
        "backup:create"
        "restore:list"
        "security:check"
        "test:migration"
    )
    
    for script in "${scripts[@]}"; do
        run_test "package.jsonスクリプト存在: $script" "grep -q '\"$script\"' package.json"
    done
}

# ドキュメント存在確認
test_documentation() {
    log_info "ドキュメント存在確認テスト"
    
    run_test "マイグレーションガイド存在" "[ -f '../../docs/migration-guide.md' ]"
    run_test "GitHub Actionsワークフロー存在" "[ -f '../../.github/workflows/database-migration.yml' ]"
}

# 統合テスト結果レポート生成
generate_test_report() {
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=0
    
    if [ $total_tests -gt 0 ]; then
        success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
    fi
    
    echo "=================================="
    echo "📊 マイグレーション統合テスト結果"
    echo "=================================="
    echo "総テスト数: $total_tests"
    echo "成功: $TESTS_PASSED"
    echo "失敗: $TESTS_FAILED"
    echo "成功率: ${success_rate}%"
    echo "=================================="
    
    # JSON形式でレポート出力
    cat > integration-test-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_tests": $total_tests,
  "passed": $TESTS_PASSED,
  "failed": $TESTS_FAILED,
  "success_rate": $success_rate,
  "status": "$([ $TESTS_FAILED -eq 0 ] && echo "PASSED" || echo "FAILED")"
}
EOF
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "全ての統合テストが成功しました"
        return 0
    else
        log_error "$TESTS_FAILED 個のテストが失敗しました"
        return 1
    fi
}

# メイン処理
main() {
    log_info "マイグレーション統合テスト開始"
    
    test_scripts_exist
    test_files_exist
    test_prisma_schema
    test_typescript
    test_eslint
    test_script_help
    test_package_scripts
    test_documentation
    
    generate_test_report
}

# スクリプト実行
main "$@"
