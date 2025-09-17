#!/bin/bash

# デプロイ準備チェックリストスクリプト

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
WARNINGS=0

# チェック実行
run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_warning="${3:-false}"
    
    log_info "チェック: $check_name"
    
    if eval "$check_command" > /dev/null 2>&1; then
        log_success "✓ $check_name"
        ((CHECKS_PASSED++))
    else
        if [ "$is_warning" = "true" ]; then
            log_warning "⚠ $check_name"
            ((WARNINGS++))
        else
            log_error "✗ $check_name"
            ((CHECKS_FAILED++))
        fi
    fi
}

# 環境設定チェック
check_environment_setup() {
    log_info "=== 環境設定チェック ==="
    
    run_check "Node.js バージョン確認" "node --version | grep -E 'v(18|20|22|24)'"
    run_check "pnpm インストール確認" "command -v pnpm"
    run_check "Docker インストール確認" "command -v docker" "true"
    run_check "AWS CLI インストール確認" "command -v aws" "true"
}

# プロジェクト構成チェック
check_project_structure() {
    log_info "=== プロジェクト構成チェック ==="
    
    # 必須ファイル
    local required_files=(
        "package.json"
        "prisma/schema.prisma"
        "src/utils/migration-logger.ts"
        "src/utils/migration-metrics.ts"
        "tests/migration.test.ts"
        "tests/migration-performance.test.ts"
    )
    
    for file in "${required_files[@]}"; do
        run_check "必須ファイル存在: $file" "[ -f '$file' ]"
    done
    
    # 必須スクリプト
    local required_scripts=(
        "scripts/migrate-dev.sh"
        "scripts/migrate-status.sh"
        "scripts/migrate-rollback.sh"
        "scripts/migrate-prod.sh"
        "scripts/backup-database.sh"
        "scripts/restore-database.sh"
        "scripts/setup-db-security.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        run_check "必須スクリプト存在: $script" "[ -f '$script' ]"
        run_check "スクリプト実行権限: $script" "[ -x '$script' ]"
    done
}

# 依存関係チェック
check_dependencies() {
    log_info "=== 依存関係チェック ==="
    
    run_check "package.json 構文確認" "node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\"))'"
    run_check "依存関係インストール確認" "[ -d 'node_modules' ]"
    run_check "Prisma クライアント生成確認" "[ -d 'src/generated/prisma-client' ]" "true"
}

# コード品質チェック
check_code_quality() {
    log_info "=== コード品質チェック ==="
    
    run_check "TypeScript 型チェック" "pnpm run type-check"
    run_check "ESLint チェック" "pnpm run lint"
    run_check "Prettier フォーマット確認" "pnpm run format:check"
}

# セキュリティチェック
check_security() {
    log_info "=== セキュリティチェック ==="
    
    run_check "npm audit" "pnpm audit --audit-level moderate" "true"
    run_check "機密情報チェック" "! find . -name '*.ts' -o -name '*.js' | xargs grep -l 'password.*=.*['\''\"]\|secret.*=.*['\''\"]\|key.*=.*['\''\"']' | grep -v node_modules" "true"
}

# ドキュメントチェック
check_documentation() {
    log_info "=== ドキュメントチェック ==="
    
    run_check "マイグレーションガイド存在" "[ -f '../../docs/migration-guide.md' ]"
    run_check "GitHub Actions ワークフロー存在" "[ -f '../../.github/workflows/database-migration.yml' ]"
    run_check "Prisma README 存在" "[ -f 'prisma/README.md' ]"
}

# CI/CD設定チェック
check_cicd_setup() {
    log_info "=== CI/CD設定チェック ==="
    
    run_check "GitHub Actions ワークフロー構文" "grep -q 'name: Database Migration' '../../.github/workflows/database-migration.yml'"
    run_check "package.json スクリプト設定" "grep -q 'migrate:' package.json"
}

# 本番環境準備チェック
check_production_readiness() {
    log_info "=== 本番環境準備チェック ==="
    
    # 環境変数テンプレート確認
    run_check ".env.example 存在" "[ -f '../../.env.example' ]"
    
    # 本番用スクリプト確認
    run_check "本番マイグレーションスクリプト" "grep -q 'NODE_ENV.*production' scripts/migrate-prod.sh"
    run_check "バックアップスクリプト" "grep -q 'S3_BACKUP_BUCKET' scripts/backup-database.sh" "true"
}

# パフォーマンス要件チェック
check_performance_requirements() {
    log_info "=== パフォーマンス要件チェック ==="
    
    run_check "パフォーマンステスト存在" "[ -f 'tests/migration-performance.test.ts' ]"
    run_check "メトリクス収集機能" "grep -q 'migrationMetrics' src/utils/migration-metrics.ts"
    run_check "ログ機能" "grep -q 'migrationLogger' src/utils/migration-logger.ts"
}

# 監視・アラート設定チェック
check_monitoring_setup() {
    log_info "=== 監視・アラート設定チェック ==="
    
    run_check "CloudWatch ログ設定" "grep -q 'CloudWatchLogsClient' src/utils/migration-logger.ts"
    run_check "CloudWatch メトリクス設定" "grep -q 'CloudWatchClient' src/utils/migration-metrics.ts"
    run_check "Slack 通知設定" "grep -q 'SLACK_WEBHOOK_URL' scripts/migrate-prod.sh" "true"
}

# デプロイチェックリスト生成
generate_deployment_checklist() {
    local total_checks=$((CHECKS_PASSED + CHECKS_FAILED + WARNINGS))
    local success_rate=0
    
    if [ $total_checks -gt 0 ]; then
        success_rate=$(( (CHECKS_PASSED * 100) / total_checks ))
    fi
    
    echo "=================================="
    echo "🚀 デプロイ準備チェック結果"
    echo "=================================="
    echo "総チェック数: $total_checks"
    echo "成功: $CHECKS_PASSED"
    echo "失敗: $CHECKS_FAILED"
    echo "警告: $WARNINGS"
    echo "準備度: ${success_rate}%"
    echo "=================================="
    
    # デプロイ準備レベル判定
    local readiness_level="NOT_READY"
    if [ $CHECKS_FAILED -eq 0 ] && [ $success_rate -ge 90 ]; then
        readiness_level="READY"
    elif [ $CHECKS_FAILED -eq 0 ] && [ $success_rate -ge 80 ]; then
        readiness_level="MOSTLY_READY"
    elif [ $CHECKS_FAILED -le 2 ]; then
        readiness_level="NEEDS_WORK"
    fi
    
    echo "デプロイ準備レベル: $readiness_level"
    echo ""
    
    # 推奨アクション
    echo "📋 推奨アクション:"
    if [ $CHECKS_FAILED -gt 0 ]; then
        echo "• $CHECKS_FAILED 個の必須項目を修正してください"
    fi
    if [ $WARNINGS -gt 0 ]; then
        echo "• $WARNINGS 個の警告項目を確認してください"
    fi
    if [ "$readiness_level" = "READY" ]; then
        echo "• デプロイ準備完了です！"
    fi
    
    echo ""
    echo "🔗 次のステップ:"
    echo "1. 統合テスト実行: ./scripts/test-migration-integration.sh"
    echo "2. コード品質チェック: ./scripts/check-code-quality.sh"
    echo "3. 本番環境でのドライラン: pnpm run migrate:prod:dry"
    echo "4. 本番デプロイ実行"
    
    # JSON形式でレポート出力
    cat > deployment-checklist-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_checks": $total_checks,
  "passed": $CHECKS_PASSED,
  "failed": $CHECKS_FAILED,
  "warnings": $WARNINGS,
  "success_rate": $success_rate,
  "readiness_level": "$readiness_level",
  "deployment_ready": $([ "$readiness_level" = "READY" ] && echo "true" || echo "false")
}
EOF
    
    if [ "$readiness_level" = "READY" ]; then
        log_success "デプロイ準備完了！"
        return 0
    else
        log_warning "デプロイ前に修正が必要な項目があります"
        return 1
    fi
}

# メイン処理
main() {
    log_info "🚀 デプロイ準備チェック開始"
    echo ""
    
    check_environment_setup
    echo ""
    check_project_structure
    echo ""
    check_dependencies
    echo ""
    check_code_quality
    echo ""
    check_security
    echo ""
    check_documentation
    echo ""
    check_cicd_setup
    echo ""
    check_production_readiness
    echo ""
    check_performance_requirements
    echo ""
    check_monitoring_setup
    echo ""
    
    generate_deployment_checklist
}

# スクリプト実行
main "$@"
