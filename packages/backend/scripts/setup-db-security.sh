#!/bin/bash

# データベース接続セキュリティ設定スクリプト
# SSL/TLS設定、権限管理、接続タイムアウト設定

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

# 環境変数チェック
check_environment() {
    log_info "セキュリティ設定用環境変数をチェック中..."
    
    local required_vars=("DATABASE_URL" "NODE_ENV")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "$var 環境変数が設定されていません"
            exit 1
        fi
    done
    
    log_success "環境変数チェック完了"
}

# SSL接続確認
verify_ssl_connection() {
    log_info "SSL接続を確認中..."
    
    # DATABASE_URLからSSLパラメータを確認
    if [[ "$DATABASE_URL" == *"sslmode=require"* ]] || [[ "$DATABASE_URL" == *"sslmode=verify-full"* ]]; then
        log_success "SSL接続が設定されています"
    elif [ "$NODE_ENV" = "production" ]; then
        log_error "本番環境でSSL接続が設定されていません"
        log_info "DATABASE_URLに ?sslmode=require を追加してください"
        exit 1
    else
        log_warning "開発環境でSSL接続が設定されていません"
    fi
}

# 接続タイムアウト設定確認
verify_connection_timeouts() {
    log_info "接続タイムアウト設定を確認中..."
    
    # DATABASE_URLからタイムアウト設定を確認
    if [[ "$DATABASE_URL" == *"connect_timeout="* ]]; then
        log_success "接続タイムアウトが設定されています"
    else
        log_warning "接続タイムアウトが設定されていません"
        log_info "推奨設定: ?connect_timeout=10"
    fi
    
    if [[ "$DATABASE_URL" == *"statement_timeout="* ]]; then
        log_success "ステートメントタイムアウトが設定されています"
    else
        log_warning "ステートメントタイムアウトが設定されていません"
        log_info "推奨設定: &statement_timeout=30000"
    fi
}

# データベースユーザー権限確認
check_database_permissions() {
    log_info "データベースユーザー権限を確認中..."
    
    # 現在のユーザー権限を確認
    local user_info=$(pnpm prisma db execute --stdin <<< "
        SELECT 
            current_user as username,
            session_user as session_user,
            current_database() as database_name;
    " 2>/dev/null || echo "")
    
    if [ -n "$user_info" ]; then
        log_success "データベース接続確認完了"
        echo "$user_info"
    else
        log_error "データベース接続に失敗しました"
        exit 1
    fi
    
    # スーパーユーザー権限チェック
    local is_superuser=$(pnpm prisma db execute --stdin <<< "
        SELECT usesuper FROM pg_user WHERE usename = current_user;
    " 2>/dev/null | tail -n +2 | tr -d ' \n' || echo "")
    
    if [ "$is_superuser" = "t" ]; then
        log_warning "現在のユーザーはスーパーユーザー権限を持っています"
        if [ "$NODE_ENV" = "production" ]; then
            log_error "本番環境でスーパーユーザー権限は推奨されません"
        fi
    else
        log_success "適切な権限レベルです"
    fi
}

# 接続プール設定確認
verify_connection_pool() {
    log_info "接続プール設定を確認中..."
    
    # Prismaの接続プール設定を確認
    if [[ "$DATABASE_URL" == *"connection_limit="* ]]; then
        log_success "接続プール制限が設定されています"
    else
        log_warning "接続プール制限が設定されていません"
        log_info "推奨設定: ?connection_limit=10"
    fi
    
    if [[ "$DATABASE_URL" == *"pool_timeout="* ]]; then
        log_success "プールタイムアウトが設定されています"
    else
        log_warning "プールタイムアウトが設定されていません"
        log_info "推奨設定: &pool_timeout=10"
    fi
}

# セキュリティ推奨設定生成
generate_security_recommendations() {
    log_info "セキュリティ推奨設定を生成中..."
    
    local base_url="${DATABASE_URL%%\?*}"
    local security_params=""
    
    # 本番環境の推奨設定
    if [ "$NODE_ENV" = "production" ]; then
        security_params="?sslmode=require&connect_timeout=10&statement_timeout=30000&connection_limit=10&pool_timeout=10"
    else
        # 開発環境の推奨設定
        security_params="?connect_timeout=10&statement_timeout=30000&connection_limit=5&pool_timeout=10"
    fi
    
    local recommended_url="${base_url}${security_params}"
    
    echo "=================================="
    echo "🔒 セキュリティ推奨設定"
    echo "=================================="
    echo "環境: $NODE_ENV"
    echo ""
    echo "推奨DATABASE_URL:"
    echo "$recommended_url"
    echo ""
    echo "設定項目の説明:"
    echo "• sslmode=require: SSL接続を強制（本番環境のみ）"
    echo "• connect_timeout=10: 接続タイムアウト10秒"
    echo "• statement_timeout=30000: ステートメントタイムアウト30秒"
    echo "• connection_limit=10: 最大接続数制限"
    echo "• pool_timeout=10: プールタイムアウト10秒"
    echo "=================================="
}

# セキュリティ監査実行
run_security_audit() {
    log_info "セキュリティ監査を実行中..."
    
    # データベース設定確認
    local db_settings=$(pnpm prisma db execute --stdin <<< "
        SHOW ssl;
        SHOW log_connections;
        SHOW log_disconnections;
        SHOW log_statement;
    " 2>/dev/null || echo "設定確認に失敗")
    
    echo "=================================="
    echo "🔍 データベースセキュリティ設定"
    echo "=================================="
    echo "$db_settings"
    echo "=================================="
    
    # 接続統計確認
    local connection_stats=$(pnpm prisma db execute --stdin <<< "
        SELECT 
            datname,
            numbackends,
            xact_commit,
            xact_rollback
        FROM pg_stat_database 
        WHERE datname = current_database();
    " 2>/dev/null || echo "統計確認に失敗")
    
    echo "📊 接続統計"
    echo "=================================="
    echo "$connection_stats"
    echo "=================================="
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  check       セキュリティ設定をチェック（デフォルト）"
    echo "  recommend   推奨セキュリティ設定を表示"
    echo "  audit       セキュリティ監査を実行"
    echo "  all         全てのチェックを実行"
    echo "  help        この使用方法を表示"
}

# メイン処理
main() {
    local command="${1:-check}"
    
    case "$command" in
        "check")
            check_environment
            verify_ssl_connection
            verify_connection_timeouts
            check_database_permissions
            verify_connection_pool
            ;;
        "recommend")
            check_environment
            generate_security_recommendations
            ;;
        "audit")
            check_environment
            run_security_audit
            ;;
        "all")
            check_environment
            verify_ssl_connection
            verify_connection_timeouts
            check_database_permissions
            verify_connection_pool
            generate_security_recommendations
            run_security_audit
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
    
    log_success "セキュリティチェック完了"
}

# スクリプト実行
main "$@"
