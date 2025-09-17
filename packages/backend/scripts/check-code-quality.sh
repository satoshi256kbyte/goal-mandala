#!/bin/bash

# コード品質とセキュリティチェックスクリプト

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

# チェック結果
CHECKS_PASSED=0
CHECKS_FAILED=0

# チェック実行
run_check() {
    local check_name="$1"
    local check_command="$2"
    
    log_info "チェック実行: $check_name"
    
    if eval "$check_command" > /dev/null 2>&1; then
        log_success "✓ $check_name"
        ((CHECKS_PASSED++))
    else
        log_error "✗ $check_name"
        ((CHECKS_FAILED++))
    fi
}

# ESLint品質チェック
check_eslint() {
    log_info "ESLint品質チェック"
    
    run_check "ESLint構文チェック" "pnpm run lint"
    run_check "ESLint自動修正可能項目" "pnpm run lint:fix --dry-run"
}

# Prettier フォーマットチェック
check_prettier() {
    log_info "Prettierフォーマットチェック"
    
    run_check "Prettierフォーマット確認" "pnpm run format:check"
}

# TypeScript型チェック
check_typescript() {
    log_info "TypeScript型チェック"
    
    run_check "TypeScript型チェック" "pnpm run type-check"
    run_check "TypeScriptビルド" "pnpm run build:tsc"
}

# セキュリティ脆弱性チェック
check_security() {
    log_info "セキュリティ脆弱性チェック"
    
    # npm audit
    run_check "npm audit" "pnpm audit --audit-level moderate"
    
    # 機密情報チェック
    run_check "機密情報チェック" "! grep -r 'password\|secret\|key' src/ --include='*.ts' --include='*.js' | grep -v 'PASSWORD\|SECRET\|KEY' | grep -v 'password:' | grep -v 'secretKey:'"
}

# ファイル権限チェック
check_file_permissions() {
    log_info "ファイル権限チェック"
    
    # スクリプトファイルの実行権限確認
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
        run_check "実行権限: $script" "[ -x '$script' ]"
    done
}

# コード複雑度チェック
check_code_complexity() {
    log_info "コード複雑度チェック"
    
    # 大きすぎるファイルをチェック
    run_check "ファイルサイズチェック" "! find src/ -name '*.ts' -size +10k"
    
    # 長すぎる関数をチェック
    run_check "関数長チェック" "! grep -n 'function\|=>' src/**/*.ts | wc -l | awk '{if(\$1>100) exit 1}'"
}

# 依存関係チェック
check_dependencies() {
    log_info "依存関係チェック"
    
    run_check "package.json構文チェック" "node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\"))'"
    run_check "依存関係整合性" "pnpm install --frozen-lockfile --dry-run"
}

# テストカバレッジチェック
check_test_coverage() {
    log_info "テストカバレッジチェック"
    
    # マイグレーション関連テストの存在確認
    run_check "マイグレーションテスト存在" "[ -f 'tests/migration.test.ts' ]"
    run_check "パフォーマンステスト存在" "[ -f 'tests/migration-performance.test.ts' ]"
}

# ドキュメント品質チェック
check_documentation() {
    log_info "ドキュメント品質チェック"
    
    run_check "README存在" "[ -f 'prisma/README.md' ]"
    run_check "マイグレーションガイド存在" "[ -f '../../docs/migration-guide.md' ]"
    
    # スクリプトにヘルプオプションがあることを確認
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
        run_check "ヘルプオプション: $script" "grep -q 'show_usage\|--help' '$script'"
    done
}

# ベストプラクティスチェック
check_best_practices() {
    log_info "ベストプラクティスチェック"
    
    # スクリプトのset -euo pipefailチェック
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
        run_check "エラーハンドリング: $script" "grep -q 'set -euo pipefail' '$script'"
    done
    
    # ログ関数の使用確認
    for script in "${scripts[@]}"; do
        run_check "ログ関数使用: $script" "grep -q 'log_info\|log_error\|log_success\|log_warning' '$script'"
    done
}

# 品質レポート生成
generate_quality_report() {
    local total_checks=$((CHECKS_PASSED + CHECKS_FAILED))
    local success_rate=0
    
    if [ $total_checks -gt 0 ]; then
        success_rate=$(( (CHECKS_PASSED * 100) / total_checks ))
    fi
    
    echo "=================================="
    echo "📊 コード品質チェック結果"
    echo "=================================="
    echo "総チェック数: $total_checks"
    echo "成功: $CHECKS_PASSED"
    echo "失敗: $CHECKS_FAILED"
    echo "品質スコア: ${success_rate}%"
    echo "=================================="
    
    # 品質レベル判定
    local quality_level="POOR"
    if [ $success_rate -ge 95 ]; then
        quality_level="EXCELLENT"
    elif [ $success_rate -ge 85 ]; then
        quality_level="GOOD"
    elif [ $success_rate -ge 70 ]; then
        quality_level="FAIR"
    fi
    
    echo "品質レベル: $quality_level"
    
    # JSON形式でレポート出力
    cat > code-quality-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_checks": $total_checks,
  "passed": $CHECKS_PASSED,
  "failed": $CHECKS_FAILED,
  "success_rate": $success_rate,
  "quality_level": "$quality_level",
  "status": "$([ $CHECKS_FAILED -eq 0 ] && echo "PASSED" || echo "FAILED")"
}
EOF
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "全ての品質チェックが成功しました"
        return 0
    else
        log_error "$CHECKS_FAILED 個のチェックが失敗しました"
        return 1
    fi
}

# メイン処理
main() {
    log_info "コード品質とセキュリティチェック開始"
    
    check_eslint
    check_prettier
    check_typescript
    check_security
    check_file_permissions
    check_code_complexity
    check_dependencies
    check_test_coverage
    check_documentation
    check_best_practices
    
    generate_quality_report
}

# スクリプト実行
main "$@"
