#!/bin/bash

# Docker開発環境データベース直接接続スクリプト
# Usage: ./tools/scripts/docker-db-connect.sh [options]

set -e

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

# Docker Composeファイルの存在確認
check_docker_compose() {
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.ymlが見つかりません: $PROJECT_ROOT/docker-compose.yml"
        exit 1
    fi
}

# 環境変数の読み込み
load_env_vars() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # .envファイルから環境変数を読み込み（exportなしの変数も含む）
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    else
        log_warning ".envファイルが見つかりません"
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log_info ".env.exampleから.envファイルを作成してください:"
            log_info "cp .env.example .env"
        fi
        exit 1
    fi
}

# PostgreSQLコンテナの状態確認
check_postgres_container() {
    cd "$PROJECT_ROOT"

    if ! docker-compose ps postgres | grep -q "Up"; then
        log_error "PostgreSQLコンテナが起動していません"
        log_info "以下のコマンドでコンテナを起動してください:"
        log_info "docker-compose up -d postgres"
        exit 1
    fi
}

# データベース接続情報の表示
show_connection_info() {
    log_info "データベース接続情報:"
    echo "  ホスト: localhost"
    echo "  ポート: 5432"
    echo "  データベース: ${POSTGRES_DB:-goal_mandala_dev}"
    echo "  ユーザー: ${POSTGRES_USER:-goal_mandala_user}"
    echo "  パスワード: ${POSTGRES_PASSWORD:-[設定されていません]}"
    echo ""
}

# psqlでデータベースに接続
connect_with_psql() {
    local database="${1:-${POSTGRES_DB:-goal_mandala_dev}}"

    log_info "psqlでデータベース '$database' に接続中..."
    show_connection_info

    # PostgreSQLコンテナ内でpsqlを実行
    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database"
}

# pgAdminスタイルの接続情報を表示
show_pgadmin_info() {
    log_info "pgAdmin接続設定:"
    echo "  Name: Goal Mandala Local"
    echo "  Host name/address: localhost"
    echo "  Port: 5432"
    echo "  Maintenance database: ${POSTGRES_DB:-goal_mandala_dev}"
    echo "  Username: ${POSTGRES_USER:-goal_mandala_user}"
    echo "  Password: ${POSTGRES_PASSWORD:-[.envファイルを確認してください]}"
    echo ""
}

# データベース一覧を表示
list_databases() {
    log_info "データベース一覧を取得中..."

    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d postgres -c "\l"
}

# テーブル一覧を表示
list_tables() {
    local database="${1:-${POSTGRES_DB:-goal_mandala_dev}}"

    log_info "データベース '$database' のテーブル一覧:"

    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database" -c "\dt"
}

# データベースサイズを表示
show_database_size() {
    local database="${1:-${POSTGRES_DB:-goal_mandala_dev}}"

    log_info "データベース '$database' のサイズ情報:"

    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database" -c "
        SELECT
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        ORDER BY schemaname, tablename;
    "

    echo ""
    log_info "データベースサイズ:"
    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database" -c "
        SELECT
            pg_database.datname,
            pg_size_pretty(pg_database_size(pg_database.datname)) AS size
        FROM pg_database
        WHERE pg_database.datname = '$database';
    "
}

# SQLファイルを実行
execute_sql_file() {
    local sql_file="$1"
    local database="${2:-${POSTGRES_DB:-goal_mandala_dev}}"

    if [ ! -f "$sql_file" ]; then
        log_error "SQLファイルが見つかりません: $sql_file"
        exit 1
    fi

    log_info "SQLファイルを実行中: $sql_file"
    log_info "対象データベース: $database"

    # SQLファイルをコンテナにコピーして実行
    local container_sql_path="/tmp/$(basename "$sql_file")"
    docker cp "$sql_file" "$(docker-compose ps -q postgres):$container_sql_path"

    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database" -f "$container_sql_path"

    # 一時ファイルを削除
    docker-compose exec postgres rm "$container_sql_path"

    log_success "SQLファイルの実行が完了しました"
}

# データベースバックアップ
backup_database() {
    local database="${1:-${POSTGRES_DB:-goal_mandala_dev}}"
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/${database}_backup_${timestamp}.sql"

    mkdir -p "$backup_dir"

    log_info "データベース '$database' をバックアップ中..."
    log_info "バックアップファイル: $backup_file"

    docker-compose exec postgres pg_dump -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database" > "$backup_file"

    log_success "バックアップが完了しました: $backup_file"
    log_info "バックアップサイズ: $(du -h "$backup_file" | cut -f1)"
}

# データベースリストア
restore_database() {
    local backup_file="$1"
    local database="${2:-${POSTGRES_DB:-goal_mandala_dev}}"

    if [ ! -f "$backup_file" ]; then
        log_error "バックアップファイルが見つかりません: $backup_file"
        exit 1
    fi

    log_warning "データベース '$database' をリストアします"
    log_warning "既存のデータは全て削除されます"

    echo -n "続行しますか？ [y/N]: "
    read -r answer
    case "$answer" in
        [Yy]|[Yy][Ee][Ss])
            ;;
        *)
            log_info "リストアをキャンセルしました"
            return 0
            ;;
    esac

    log_info "データベース '$database' をリストア中..."
    log_info "バックアップファイル: $backup_file"

    # バックアップファイルをコンテナにコピー
    local container_backup_path="/tmp/$(basename "$backup_file")"
    docker cp "$backup_file" "$(docker-compose ps -q postgres):$container_backup_path"

    # データベースをドロップして再作成
    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d postgres -c "DROP DATABASE IF EXISTS $database;"
    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d postgres -c "CREATE DATABASE $database;"

    # バックアップをリストア
    docker-compose exec postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "$database" -f "$container_backup_path"

    # 一時ファイルを削除
    docker-compose exec postgres rm "$container_backup_path"

    log_success "リストアが完了しました"
}

# ヘルプ表示
show_help() {
    echo "Docker開発環境データベース直接接続スクリプト"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  connect [DB]          psqlでデータベースに接続 (デフォルト)"
    echo "  info                  接続情報を表示"
    echo "  pgadmin               pgAdmin接続設定を表示"
    echo "  list-db               データベース一覧を表示"
    echo "  list-tables [DB]      テーブル一覧を表示"
    echo "  size [DB]             データベースサイズを表示"
    echo "  exec-sql FILE [DB]    SQLファイルを実行"
    echo "  backup [DB]           データベースをバックアップ"
    echo "  restore FILE [DB]     バックアップからリストア"
    echo "  help                  このヘルプを表示"
    echo ""
    echo "Arguments:"
    echo "  DB                    データベース名 (デフォルト: \$POSTGRES_DB)"
    echo "  FILE                  SQLファイルまたはバックアップファイルのパス"
    echo ""
    echo "Examples:"
    echo "  $0                              # デフォルトDBに接続"
    echo "  $0 connect goal_mandala_test    # テストDBに接続"
    echo "  $0 info                         # 接続情報を表示"
    echo "  $0 list-tables                  # テーブル一覧を表示"
    echo "  $0 exec-sql schema.sql          # SQLファイルを実行"
    echo "  $0 backup                       # データベースをバックアップ"
    echo "  $0 restore backup.sql           # バックアップからリストア"
    echo ""
    echo "注意:"
    echo "  - PostgreSQLコンテナが起動している必要があります"
    echo "  - .envファイルに接続情報が設定されている必要があります"
}

# メイン処理
main() {
    local command="connect"
    local arg1=""
    local arg2=""

    # 引数解析
    if [ $# -gt 0 ]; then
        case "$1" in
            connect|info|pgadmin|list-db|list-tables|size|exec-sql|backup|restore|help)
                command="$1"
                arg1="$2"
                arg2="$3"
                ;;
            -h|--help)
                show_help
                return 0
                ;;
            *)
                # 最初の引数がコマンドでない場合、データベース名として扱う
                command="connect"
                arg1="$1"
                ;;
        esac
    fi

    check_docker_compose
    load_env_vars
    check_postgres_container

    case "$command" in
        connect)
            connect_with_psql "$arg1"
            ;;
        info)
            show_connection_info
            ;;
        pgadmin)
            show_pgadmin_info
            ;;
        list-db)
            list_databases
            ;;
        list-tables)
            list_tables "$arg1"
            ;;
        size)
            show_database_size "$arg1"
            ;;
        exec-sql)
            if [ -z "$arg1" ]; then
                log_error "SQLファイルを指定してください"
                show_help
                exit 1
            fi
            execute_sql_file "$arg1" "$arg2"
            ;;
        backup)
            backup_database "$arg1"
            ;;
        restore)
            if [ -z "$arg1" ]; then
                log_error "バックアップファイルを指定してください"
                show_help
                exit 1
            fi
            restore_database "$arg1" "$arg2"
            ;;
        help)
            show_help
            ;;
        *)
            log_error "不明なコマンド: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
