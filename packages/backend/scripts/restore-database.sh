#!/bin/bash

# データベース復旧スクリプト
# バックアップからのデータベース復旧機能

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

# 確認プロンプト
confirm_restore() {
    local backup_file="$1"
    echo -e "${RED}⚠️  データベース復旧操作${NC}"
    echo "この操作により現在のデータベースが置き換えられます。"
    echo "復旧対象ファイル: $backup_file"
    echo ""
    read -p "データベース復旧を実行しますか? (RESTORE と入力): " -r
    if [[ "$REPLY" != "RESTORE" ]]; then
        log_info "復旧操作をキャンセルしました"
        exit 0
    fi
}

# 環境変数チェック
check_environment() {
    log_info "環境変数をチェック中..."
    
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL環境変数が設定されていません"
        exit 1
    fi
    
    log_success "環境変数チェック完了"
}

# バックアップファイル一覧表示
list_backup_files() {
    local backup_type="${1:-all}"
    
    log_info "利用可能なバックアップファイル:"
    echo "=================================="
    
    local file_count=0
    
    if [ "$backup_type" = "all" ] || [ "$backup_type" = "full" ]; then
        if [ -d "$BACKUP_DIR/full" ]; then
            echo "📁 フルバックアップ:"
            ls -la "$BACKUP_DIR/full"/*.sql 2>/dev/null | while read -r line; do
                echo "  $line"
                ((file_count++))
            done || echo "  バックアップファイルなし"
            echo ""
        fi
    fi
    
    if [ "$backup_type" = "all" ] || [ "$backup_type" = "schema" ]; then
        if [ -d "$BACKUP_DIR/schema" ]; then
            echo "📁 スキーマバックアップ:"
            ls -la "$BACKUP_DIR/schema"/*.sql 2>/dev/null | while read -r line; do
                echo "  $line"
                ((file_count++))
            done || echo "  バックアップファイルなし"
            echo ""
        fi
    fi
    
    if [ "$backup_type" = "all" ] || [ "$backup_type" = "data" ]; then
        if [ -d "$BACKUP_DIR/data" ]; then
            echo "📁 データバックアップ:"
            ls -la "$BACKUP_DIR/data"/*.sql 2>/dev/null | while read -r line; do
                echo "  $line"
                ((file_count++))
            done || echo "  バックアップファイルなし"
            echo ""
        fi
    fi
    
    echo "=================================="
}

# バックアップファイル検証
verify_backup_file() {
    local backup_file="$1"
    
    log_info "バックアップファイルを検証中: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log_error "バックアップファイルが存在しません: $backup_file"
        exit 1
    fi
    
    # ファイルサイズチェック
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [ "$file_size" -eq 0 ]; then
        log_error "バックアップファイルが空です: $backup_file"
        exit 1
    fi
    
    # SQLファイルの基本的な構文チェック
    if [[ "$backup_file" == *.sql ]]; then
        if grep -q "CREATE\|INSERT\|COPY" "$backup_file"; then
            log_success "バックアップファイル検証完了"
        else
            log_warning "バックアップファイルに期待されるSQL文が見つかりません"
        fi
    fi
    
    # ファイル情報表示
    local file_size_human=$(du -h "$backup_file" | cut -f1)
    log_info "ファイルサイズ: $file_size_human"
}

# 現在のデータベースバックアップ作成
create_pre_restore_backup() {
    log_info "復旧前の現在のデータベースをバックアップ中..."
    
    local pre_restore_backup="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # バックアップディレクトリ作成
    mkdir -p "$BACKUP_DIR"
    
    if command -v pg_dump > /dev/null 2>&1; then
        if pg_dump "$DATABASE_URL" > "$pre_restore_backup"; then
            log_success "復旧前バックアップ作成完了: $pre_restore_backup"
        else
            log_error "復旧前バックアップ作成に失敗しました"
            exit 1
        fi
    else
        log_warning "pg_dumpが見つかりません。復旧前バックアップをスキップします"
    fi
}

# データベース復旧実行
restore_database() {
    local backup_file="$1"
    
    log_info "データベース復旧を実行中: $backup_file"
    
    if command -v psql > /dev/null 2>&1; then
        # psqlを使用した復旧
        restore_with_psql "$backup_file"
    else
        # Prismaを使用した復旧
        restore_with_prisma "$backup_file"
    fi
}

# psqlを使用した復旧
restore_with_psql() {
    local backup_file="$1"
    
    log_info "psqlを使用してデータベースを復旧中..."
    
    # データベースをリセット
    log_warning "既存のデータベースをクリア中..."
    if pnpm prisma migrate reset --force --skip-seed; then
        log_success "データベースリセット完了"
    else
        log_error "データベースリセットに失敗しました"
        exit 1
    fi
    
    # バックアップから復旧
    if psql "$DATABASE_URL" < "$backup_file"; then
        log_success "データベース復旧完了"
    else
        log_error "データベース復旧に失敗しました"
        exit 1
    fi
}

# Prismaを使用した復旧
restore_with_prisma() {
    local backup_file="$1"
    
    log_info "Prismaを使用してデータベースを復旧中..."
    
    if [[ "$backup_file" == *.prisma ]]; then
        # Prismaスキーマファイルからの復旧
        log_info "Prismaスキーマファイルから復旧中..."
        
        # 現在のスキーマをバックアップ
        cp prisma/schema.prisma "prisma/schema.prisma.backup.$(date +%s)"
        
        # バックアップスキーマをコピー
        cp "$backup_file" prisma/schema.prisma
        
        # マイグレーション実行
        pnpm prisma migrate reset --force --skip-seed
        pnpm prisma db push
        
        log_success "Prismaスキーマからの復旧完了"
    else
        log_error "Prismaでの復旧はPrismaスキーマファイル(.prisma)のみサポートされています"
        exit 1
    fi
}

# 復旧後検証
verify_restore() {
    log_info "復旧後検証を実行中..."
    
    # データベース接続確認
    if pnpm prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        log_success "データベース接続確認完了"
    else
        log_error "データベース接続に失敗しました"
        exit 1
    fi
    
    # テーブル存在確認
    local table_count=$(pnpm prisma db execute --stdin <<< "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
    " | tail -n +2 | tr -d ' \n')
    
    log_info "復旧されたテーブル数: $table_count"
    
    # マイグレーション状態確認
    log_info "マイグレーション状態確認:"
    pnpm prisma migrate status || log_warning "マイグレーション状態の確認に失敗しました"
    
    # Prismaクライアント再生成
    log_info "Prismaクライアント再生成中..."
    pnpm prisma generate
    
    log_success "復旧後検証完了"
}

# S3からダウンロード
download_from_s3() {
    local s3_path="$1"
    local local_file="$2"
    
    if ! command -v aws > /dev/null 2>&1; then
        log_error "AWS CLIが見つかりません"
        exit 1
    fi
    
    log_info "S3からバックアップをダウンロード中: $s3_path"
    
    if aws s3 cp "$s3_path" "$local_file"; then
        log_success "S3ダウンロード完了: $local_file"
    else
        log_error "S3ダウンロードに失敗しました"
        exit 1
    fi
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [コマンド] [オプション]"
    echo ""
    echo "コマンド:"
    echo "  restore <backup_file>    指定したバックアップファイルから復旧"
    echo "  list [type]              利用可能なバックアップファイルを表示"
    echo "                          type: full, schema, data, all (デフォルト: all)"
    echo "  s3-restore <s3_path>     S3からバックアップをダウンロードして復旧"
    echo "  help                     この使用方法を表示"
    echo ""
    echo "例:"
    echo "  $0 restore backups/full/full_backup_20231201_120000.sql"
    echo "  $0 list full"
    echo "  $0 s3-restore s3://my-bucket/database-backups/backup.sql"
    echo ""
    echo "環境変数:"
    echo "  DATABASE_URL    データベース接続URL（必須）"
}

# メイン処理
main() {
    local command="${1:-help}"
    
    case "$command" in
        "restore")
            local backup_file="${2:-}"
            if [ -z "$backup_file" ]; then
                log_error "バックアップファイルを指定してください"
                show_usage
                exit 1
            fi
            
            check_environment
            verify_backup_file "$backup_file"
            confirm_restore "$backup_file"
            create_pre_restore_backup
            restore_database "$backup_file"
            verify_restore
            ;;
        "list")
            local backup_type="${2:-all}"
            list_backup_files "$backup_type"
            ;;
        "s3-restore")
            local s3_path="${2:-}"
            if [ -z "$s3_path" ]; then
                log_error "S3パスを指定してください"
                show_usage
                exit 1
            fi
            
            check_environment
            
            # 一時ファイルにダウンロード
            local temp_file="/tmp/s3_backup_$(date +%s).sql"
            download_from_s3 "$s3_path" "$temp_file"
            
            verify_backup_file "$temp_file"
            confirm_restore "$temp_file"
            create_pre_restore_backup
            restore_database "$temp_file"
            verify_restore
            
            # 一時ファイル削除
            rm "$temp_file"
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
    
    log_success "復旧処理完了"
}

# スクリプト実行
main "$@"
