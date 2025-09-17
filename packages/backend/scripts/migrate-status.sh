#!/bin/bash

# マイグレーション状態確認・管理スクリプト

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

# マイグレーション状態表示
show_migration_status() {
    log_info "マイグレーション状態を確認中..."
    echo "=================================="
    pnpm prisma migrate status
    echo "=================================="
}

# データベーススキーマ情報表示
show_schema_info() {
    log_info "データベーススキーマ情報を取得中..."
    echo "=================================="
    
    # テーブル一覧
    echo "📋 テーブル一覧:"
    pnpm prisma db execute --stdin <<< "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    " | tail -n +2
    
    echo ""
    
    # Enum型一覧
    echo "🏷️  Enum型一覧:"
    pnpm prisma db execute --stdin <<< "
        SELECT typname as enum_name
        FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname;
    " | tail -n +2
    
    echo ""
    
    # インデックス一覧
    echo "🔍 インデックス一覧:"
    pnpm prisma db execute --stdin <<< "
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
    " | tail -n +2
    
    echo "=================================="
}

# マイグレーション履歴表示
show_migration_history() {
    log_info "マイグレーション履歴を確認中..."
    echo "=================================="
    
    if [ -d "prisma/migrations" ]; then
        echo "📚 マイグレーション履歴:"
        ls -la prisma/migrations/ | grep -E '^d' | awk '{print $9}' | grep -v '^\.$' | grep -v '^\.\.$' | sort
        
        echo ""
        echo "📊 マイグレーション統計:"
        local migration_count=$(ls -1 prisma/migrations/ | grep -E '^[0-9]' | wc -l)
        echo "総マイグレーション数: $migration_count"
    else
        log_warning "マイグレーションディレクトリが存在しません"
    fi
    
    echo "=================================="
}

# データベース接続テスト
test_database_connection() {
    log_info "データベース接続をテスト中..."
    
    if pnpm prisma db execute --stdin <<< "SELECT 1 as connection_test;" > /dev/null 2>&1; then
        log_success "データベース接続正常"
    else
        log_error "データベース接続失敗"
        return 1
    fi
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  status    マイグレーション状態を表示 (デフォルト)"
    echo "  schema    データベーススキーマ情報を表示"
    echo "  history   マイグレーション履歴を表示"
    echo "  test      データベース接続をテスト"
    echo "  all       全ての情報を表示"
    echo "  help      この使用方法を表示"
}

# メイン処理
main() {
    local command="${1:-status}"
    
    case "$command" in
        "status")
            test_database_connection
            show_migration_status
            ;;
        "schema")
            test_database_connection
            show_schema_info
            ;;
        "history")
            show_migration_history
            ;;
        "test")
            test_database_connection
            ;;
        "all")
            test_database_connection
            show_migration_status
            show_schema_info
            show_migration_history
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "不明なコマンド: $command"
            show_usage
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"
