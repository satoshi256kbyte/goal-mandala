#!/bin/bash

# マイグレーションロールバックスクリプト
# 安全なロールバック機能を提供

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

# 確認プロンプト
confirm_action() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    read -p "続行しますか? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作をキャンセルしました"
        exit 0
    fi
}

# データベースバックアップ作成
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    log_info "データベースバックアップを作成中: $backup_name"
    
    # バックアップディレクトリ作成
    mkdir -p backups
    
    # スキーマとデータのバックアップ
    if command -v pg_dump > /dev/null 2>&1; then
        # DATABASE_URLからパラメータを抽出
        local db_url="${DATABASE_URL}"
        pg_dump "$db_url" > "backups/${backup_name}.sql"
        log_success "バックアップ作成完了: backups/${backup_name}.sql"
    else
        log_warning "pg_dumpが見つかりません。Prismaを使用してスキーマバックアップを作成します"
        pnpm prisma db pull --print > "backups/${backup_name}_schema.prisma"
        log_success "スキーマバックアップ作成完了: backups/${backup_name}_schema.prisma"
    fi
}

# マイグレーション履歴表示
show_migration_list() {
    log_info "利用可能なマイグレーション:"
    echo "=================================="
    
    if [ -d "prisma/migrations" ]; then
        local migrations=($(ls -1 prisma/migrations/ | grep -E '^[0-9]' | sort))
        local count=1
        
        for migration in "${migrations[@]}"; do
            echo "$count. $migration"
            ((count++))
        done
    else
        log_error "マイグレーションディレクトリが存在しません"
        exit 1
    fi
    
    echo "=================================="
}

# データベースリセット
reset_database() {
    confirm_action "データベースを完全にリセットします。全てのデータが失われます。"
    
    create_backup
    
    log_info "データベースをリセット中..."
    pnpm prisma migrate reset --force
    log_success "データベースリセット完了"
}

# 特定のマイグレーションまでロールバック
rollback_to_migration() {
    local target_migration="$1"
    
    if [ -z "$target_migration" ]; then
        log_error "ロールバック対象のマイグレーションを指定してください"
        show_migration_list
        exit 1
    fi
    
    confirm_action "マイグレーション '$target_migration' までロールバックします"
    
    create_backup
    
    log_info "マイグレーション '$target_migration' までロールバック中..."
    
    # Prismaには直接的なロールバック機能がないため、
    # データベースリセット後に指定マイグレーションまで適用
    log_warning "Prismaの制限により、データベースリセット後に指定マイグレーションまで再適用します"
    
    # 一時的にマイグレーションファイルを退避
    local temp_dir="temp_migrations_$(date +%s)"
    mkdir -p "$temp_dir"
    
    if [ -d "prisma/migrations" ]; then
        cp -r prisma/migrations/* "$temp_dir/"
        
        # 指定されたマイグレーション以降を削除
        local found=false
        for migration in $(ls -1 prisma/migrations/ | grep -E '^[0-9]' | sort -r); do
            if [ "$migration" = "$target_migration" ]; then
                found=true
                break
            fi
            rm -rf "prisma/migrations/$migration"
        done
        
        if [ "$found" = false ]; then
            log_error "指定されたマイグレーション '$target_migration' が見つかりません"
            # 退避したファイルを復元
            rm -rf prisma/migrations
            mv "$temp_dir" prisma/migrations
            exit 1
        fi
        
        # データベースリセットして再適用
        pnpm prisma migrate reset --force
        
        # 退避したファイルを復元
        rm -rf prisma/migrations
        mv "$temp_dir" prisma/migrations
        
        log_success "ロールバック完了"
    else
        log_error "マイグレーションディレクトリが存在しません"
        exit 1
    fi
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [コマンド] [オプション]"
    echo ""
    echo "コマンド:"
    echo "  reset                    データベースを完全にリセット"
    echo "  to <migration_name>      指定したマイグレーションまでロールバック"
    echo "  list                     利用可能なマイグレーション一覧を表示"
    echo "  help                     この使用方法を表示"
    echo ""
    echo "例:"
    echo "  $0 reset"
    echo "  $0 to 20231201000000_init"
    echo "  $0 list"
}

# メイン処理
main() {
    local command="${1:-help}"
    
    case "$command" in
        "reset")
            reset_database
            ;;
        "to")
            rollback_to_migration "${2:-}"
            ;;
        "list")
            show_migration_list
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
