#!/bin/bash

# 本番環境マイグレーションスクリプト
# 安全な本番環境でのマイグレーション実行

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
confirm_production() {
    echo -e "${RED}⚠️  本番環境でのマイグレーション実行${NC}"
    echo "この操作は本番データベースに影響を与えます。"
    echo "事前にバックアップが取得されていることを確認してください。"
    echo ""
    read -p "本番環境でのマイグレーション実行を確認します (PRODUCTION と入力): " -r
    if [[ "$REPLY" != "PRODUCTION" ]]; then
        log_info "操作をキャンセルしました"
        exit 0
    fi
}

# 環境変数チェック
check_production_environment() {
    log_info "本番環境変数をチェック中..."
    
    # 必須環境変数
    local required_vars=("DATABASE_URL" "NODE_ENV")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "$var 環境変数が設定されていません"
            exit 1
        fi
    done
    
    # NODE_ENVが本番環境であることを確認
    if [ "${NODE_ENV}" != "production" ]; then
        log_error "NODE_ENV が 'production' に設定されていません (現在: ${NODE_ENV})"
        exit 1
    fi
    
    log_success "本番環境変数チェック完了"
}

# バックアップ確認
verify_backup() {
    log_info "バックアップ確認プロセス..."
    
    echo "以下の確認事項をチェックしてください:"
    echo "1. 最新のデータベースバックアップが取得済み"
    echo "2. バックアップの整合性が確認済み"
    echo "3. 復旧手順が準備済み"
    echo "4. ロールバック計画が策定済み"
    echo ""
    
    read -p "全ての確認事項が完了していますか? (YES と入力): " -r
    if [[ "$REPLY" != "YES" ]]; then
        log_error "バックアップ確認が完了していません"
        exit 1
    fi
    
    log_success "バックアップ確認完了"
}

# データベース接続確認
check_production_database() {
    log_info "本番データベース接続を確認中..."
    
    # 接続テスト
    if ! pnpm prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        log_error "本番データベースに接続できません"
        exit 1
    fi
    
    # データベース情報表示
    log_info "データベース情報:"
    pnpm prisma db execute --stdin <<< "
        SELECT 
            current_database() as database_name,
            current_user as user_name,
            version() as version;
    "
    
    log_success "本番データベース接続確認完了"
}

# マイグレーション前検証
pre_migration_validation() {
    log_info "マイグレーション前検証を実行中..."
    
    # 現在のマイグレーション状態確認
    log_info "現在のマイグレーション状態:"
    pnpm prisma migrate status
    
    # スキーマ検証
    log_info "スキーマ検証を実行中..."
    if ! pnpm prisma validate; then
        log_error "スキーマ検証に失敗しました"
        exit 1
    fi
    
    log_success "マイグレーション前検証完了"
}

# 本番マイグレーション実行
execute_production_migration() {
    log_info "本番マイグレーションを実行中..."
    
    # タイムスタンプ記録
    local start_time=$(date +%s)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    log_info "マイグレーション開始時刻: $timestamp"
    
    # マイグレーション実行
    if pnpm prisma migrate deploy; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "マイグレーション完了 (実行時間: ${duration}秒)"
    else
        log_error "マイグレーション実行に失敗しました"
        exit 1
    fi
}

# マイグレーション後検証
post_migration_validation() {
    log_info "マイグレーション後検証を実行中..."
    
    # マイグレーション状態確認
    log_info "マイグレーション状態確認:"
    pnpm prisma migrate status
    
    # 基本的な接続テスト
    log_info "データベース接続テスト:"
    pnpm prisma db execute --stdin <<< "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
    
    # Prismaクライアント生成
    log_info "Prismaクライアント生成中..."
    pnpm prisma generate
    
    log_success "マイグレーション後検証完了"
}

# 通知送信（Slack等）
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack Webhook URLが設定されている場合は通知送信
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local payload="{\"text\":\"🗄️ 本番マイグレーション $status: $message\"}"
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" || log_warning "Slack通知の送信に失敗しました"
    fi
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --dry-run    ドライラン（実際のマイグレーションは実行しない）"
    echo "  --help       この使用方法を表示"
    echo ""
    echo "環境変数:"
    echo "  DATABASE_URL        本番データベース接続URL（必須）"
    echo "  NODE_ENV           'production' に設定（必須）"
    echo "  SLACK_WEBHOOK_URL   Slack通知用WebhookURL（オプション）"
}

# ドライラン実行
dry_run() {
    log_info "ドライラン実行中..."
    
    check_production_environment
    check_production_database
    pre_migration_validation
    
    log_info "ドライラン完了 - 実際のマイグレーションは実行されませんでした"
    log_info "本番マイグレーションを実行するには --dry-run オプションを外してください"
}

# メイン処理
main() {
    local dry_run_mode=false
    
    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run_mode=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [ "$dry_run_mode" = true ]; then
        dry_run
        return 0
    fi
    
    log_info "本番環境マイグレーション開始"
    
    # 本番環境確認
    confirm_production
    
    # 事前チェック
    check_production_environment
    verify_backup
    check_production_database
    pre_migration_validation
    
    # マイグレーション実行
    send_notification "開始" "本番マイグレーションを開始しました"
    
    if execute_production_migration && post_migration_validation; then
        send_notification "成功" "本番マイグレーションが正常に完了しました"
        log_success "本番環境マイグレーション完了"
    else
        send_notification "失敗" "本番マイグレーションでエラーが発生しました"
        log_error "本番環境マイグレーション失敗"
        exit 1
    fi
}

# スクリプト実行
main "$@"
