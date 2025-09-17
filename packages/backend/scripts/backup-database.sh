#!/bin/bash

# データベースバックアップスクリプト
# フルバックアップ、スキーマバックアップ、データバックアップ機能

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

# 設定
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 環境変数チェック
check_environment() {
    log_info "環境変数をチェック中..."
    
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL環境変数が設定されていません"
        exit 1
    fi
    
    log_success "環境変数チェック完了"
}

# バックアップディレクトリ作成
setup_backup_directory() {
    log_info "バックアップディレクトリを準備中..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/full"
    mkdir -p "$BACKUP_DIR/schema"
    mkdir -p "$BACKUP_DIR/data"
    
    log_success "バックアップディレクトリ準備完了"
}

# データベース接続確認
verify_database_connection() {
    log_info "データベース接続を確認中..."
    
    if pnpm prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        log_success "データベース接続確認完了"
    else
        log_error "データベースに接続できません"
        exit 1
    fi
}

# フルバックアップ作成
create_full_backup() {
    local backup_file="$BACKUP_DIR/full/full_backup_$TIMESTAMP.sql"
    
    log_info "フルバックアップを作成中: $backup_file"
    
    if command -v pg_dump > /dev/null 2>&1; then
        # pg_dumpを使用したフルバックアップ
        if pg_dump "$DATABASE_URL" > "$backup_file"; then
            log_success "フルバックアップ作成完了: $backup_file"
            
            # バックアップファイルサイズ表示
            local file_size=$(du -h "$backup_file" | cut -f1)
            log_info "バックアップファイルサイズ: $file_size"
        else
            log_error "フルバックアップ作成に失敗しました"
            return 1
        fi
    else
        log_warning "pg_dumpが見つかりません。Prismaを使用してスキーマバックアップを作成します"
        create_schema_backup_with_prisma "$backup_file"
    fi
}

# スキーマバックアップ作成
create_schema_backup() {
    local backup_file="$BACKUP_DIR/schema/schema_backup_$TIMESTAMP.sql"
    
    log_info "スキーマバックアップを作成中: $backup_file"
    
    if command -v pg_dump > /dev/null 2>&1; then
        # スキーマのみのバックアップ
        if pg_dump "$DATABASE_URL" --schema-only > "$backup_file"; then
            log_success "スキーマバックアップ作成完了: $backup_file"
        else
            log_error "スキーマバックアップ作成に失敗しました"
            return 1
        fi
    else
        create_schema_backup_with_prisma "$backup_file"
    fi
}

# Prismaを使用したスキーマバックアップ
create_schema_backup_with_prisma() {
    local backup_file="$1"
    
    log_info "Prismaを使用してスキーマバックアップを作成中..."
    
    # Prismaスキーマファイルをコピー
    cp prisma/schema.prisma "$backup_file.prisma"
    
    # データベーススキーマをPrisma形式で出力
    pnpm prisma db pull --print > "$backup_file.generated.prisma"
    
    log_success "Prismaスキーマバックアップ作成完了: $backup_file.prisma"
}

# データバックアップ作成
create_data_backup() {
    local backup_file="$BACKUP_DIR/data/data_backup_$TIMESTAMP.sql"
    
    log_info "データバックアップを作成中: $backup_file"
    
    if command -v pg_dump > /dev/null 2>&1; then
        # データのみのバックアップ
        if pg_dump "$DATABASE_URL" --data-only > "$backup_file"; then
            log_success "データバックアップ作成完了: $backup_file"
        else
            log_error "データバックアップ作成に失敗しました"
            return 1
        fi
    else
        create_data_backup_with_prisma "$backup_file"
    fi
}

# Prismaを使用したデータバックアップ
create_data_backup_with_prisma() {
    local backup_file="$1"
    
    log_info "Prismaを使用してデータバックアップを作成中..."
    
    # 各テーブルのデータをJSON形式でエクスポート
    local tables=("users" "goals" "sub_goals" "actions" "tasks" "task_reminders" "reflections")
    
    echo "-- Data backup created at $(date)" > "$backup_file"
    
    for table in "${tables[@]}"; do
        log_info "テーブル $table のデータをバックアップ中..."
        
        # テーブルデータをJSON形式で取得
        local table_data=$(pnpm prisma db execute --stdin <<< "
            SELECT json_agg(row_to_json($table.*)) 
            FROM $table;
        " 2>/dev/null | tail -n +2 || echo "null")
        
        echo "-- Table: $table" >> "$backup_file"
        echo "$table_data" >> "$backup_file"
        echo "" >> "$backup_file"
    done
    
    log_success "Prismaデータバックアップ作成完了: $backup_file"
}

# バックアップ検証
verify_backup() {
    local backup_file="$1"
    
    log_info "バックアップファイルを検証中: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log_error "バックアップファイルが存在しません: $backup_file"
        return 1
    fi
    
    # ファイルサイズチェック
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [ "$file_size" -eq 0 ]; then
        log_error "バックアップファイルが空です: $backup_file"
        return 1
    fi
    
    # SQLファイルの基本的な構文チェック
    if [[ "$backup_file" == *.sql ]]; then
        if grep -q "CREATE\|INSERT\|COPY" "$backup_file"; then
            log_success "バックアップファイル検証完了: $backup_file"
        else
            log_warning "バックアップファイルに期待されるSQL文が見つかりません"
        fi
    else
        log_success "バックアップファイル検証完了: $backup_file"
    fi
}

# 古いバックアップファイル削除
cleanup_old_backups() {
    log_info "古いバックアップファイルをクリーンアップ中..."
    
    local cleanup_count=0
    
    # 各バックアップディレクトリで古いファイルを削除
    for backup_type in "full" "schema" "data"; do
        local backup_path="$BACKUP_DIR/$backup_type"
        
        if [ -d "$backup_path" ]; then
            # 30日より古いファイルを削除
            local old_files=$(find "$backup_path" -name "*.sql" -o -name "*.prisma" -mtime +$RETENTION_DAYS 2>/dev/null || true)
            
            if [ -n "$old_files" ]; then
                echo "$old_files" | while read -r file; do
                    if [ -f "$file" ]; then
                        rm "$file"
                        log_info "古いバックアップファイルを削除: $file"
                        ((cleanup_count++))
                    fi
                done
            fi
        fi
    done
    
    if [ $cleanup_count -gt 0 ]; then
        log_success "古いバックアップファイル $cleanup_count 個を削除しました"
    else
        log_info "削除対象の古いバックアップファイルはありません"
    fi
}

# バックアップ統計表示
show_backup_statistics() {
    log_info "バックアップ統計を表示中..."
    
    echo "=================================="
    echo "📊 バックアップ統計"
    echo "=================================="
    
    for backup_type in "full" "schema" "data"; do
        local backup_path="$BACKUP_DIR/$backup_type"
        
        if [ -d "$backup_path" ]; then
            local file_count=$(find "$backup_path" -type f | wc -l)
            local total_size=$(du -sh "$backup_path" 2>/dev/null | cut -f1 || echo "0B")
            
            echo "$backup_type バックアップ: $file_count ファイル, $total_size"
        fi
    done
    
    echo "=================================="
}

# S3アップロード（オプション）
upload_to_s3() {
    local backup_file="$1"
    local s3_bucket="${S3_BACKUP_BUCKET:-}"
    
    if [ -z "$s3_bucket" ]; then
        log_info "S3_BACKUP_BUCKET環境変数が設定されていません。S3アップロードをスキップします"
        return 0
    fi
    
    if ! command -v aws > /dev/null 2>&1; then
        log_warning "AWS CLIが見つかりません。S3アップロードをスキップします"
        return 0
    fi
    
    log_info "S3にバックアップをアップロード中: $s3_bucket"
    
    local s3_key="database-backups/$(basename "$backup_file")"
    
    if aws s3 cp "$backup_file" "s3://$s3_bucket/$s3_key"; then
        log_success "S3アップロード完了: s3://$s3_bucket/$s3_key"
    else
        log_error "S3アップロードに失敗しました"
        return 1
    fi
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  full        フルバックアップを作成（デフォルト）"
    echo "  schema      スキーマのみバックアップを作成"
    echo "  data        データのみバックアップを作成"
    echo "  all         全種類のバックアップを作成"
    echo "  cleanup     古いバックアップファイルを削除"
    echo "  stats       バックアップ統計を表示"
    echo "  help        この使用方法を表示"
    echo ""
    echo "環境変数:"
    echo "  DATABASE_URL        データベース接続URL（必須）"
    echo "  S3_BACKUP_BUCKET    S3バックアップバケット名（オプション）"
}

# メイン処理
main() {
    local command="${1:-full}"
    
    case "$command" in
        "full")
            check_environment
            setup_backup_directory
            verify_database_connection
            if create_full_backup; then
                local backup_file="$BACKUP_DIR/full/full_backup_$TIMESTAMP.sql"
                verify_backup "$backup_file"
                upload_to_s3 "$backup_file"
            fi
            ;;
        "schema")
            check_environment
            setup_backup_directory
            verify_database_connection
            if create_schema_backup; then
                local backup_file="$BACKUP_DIR/schema/schema_backup_$TIMESTAMP.sql"
                verify_backup "$backup_file"
                upload_to_s3 "$backup_file"
            fi
            ;;
        "data")
            check_environment
            setup_backup_directory
            verify_database_connection
            if create_data_backup; then
                local backup_file="$BACKUP_DIR/data/data_backup_$TIMESTAMP.sql"
                verify_backup "$backup_file"
                upload_to_s3 "$backup_file"
            fi
            ;;
        "all")
            check_environment
            setup_backup_directory
            verify_database_connection
            
            local success_count=0
            local total_count=3
            
            if create_full_backup; then
                local full_backup="$BACKUP_DIR/full/full_backup_$TIMESTAMP.sql"
                verify_backup "$full_backup"
                upload_to_s3 "$full_backup"
                ((success_count++))
            fi
            
            if create_schema_backup; then
                local schema_backup="$BACKUP_DIR/schema/schema_backup_$TIMESTAMP.sql"
                verify_backup "$schema_backup"
                upload_to_s3 "$schema_backup"
                ((success_count++))
            fi
            
            if create_data_backup; then
                local data_backup="$BACKUP_DIR/data/data_backup_$TIMESTAMP.sql"
                verify_backup "$data_backup"
                upload_to_s3 "$data_backup"
                ((success_count++))
            fi
            
            log_info "バックアップ完了: $success_count/$total_count"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "stats")
            show_backup_statistics
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
    
    log_success "バックアップ処理完了"
}

# スクリプト実行
main "$@"
