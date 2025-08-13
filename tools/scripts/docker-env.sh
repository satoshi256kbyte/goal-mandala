#!/bin/bash

# Docker開発環境管理スクリプト
# Usage: ./tools/scripts/docker-env.sh [start|stop|restart|status]

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

# 環境変数ファイルの確認
check_env_file() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".envファイルが見つかりません"
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log_info ".env.exampleから.envファイルを作成してください:"
            log_info "cp .env.example .env"
        fi
        exit 1
    fi
}

# Docker環境起動
start_environment() {
    log_info "Docker開発環境を起動しています..."

    check_docker_compose
    check_env_file

    cd "$PROJECT_ROOT"

    # Docker Composeでサービス起動
    docker-compose up -d

    log_info "サービス起動を待機中..."
    sleep 10

    # ヘルスチェック実行
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        log_info "ヘルスチェックを実行中..."
        bash "$SCRIPT_DIR/health-check.sh"
    fi

    log_success "Docker開発環境が正常に起動しました"
    log_info "サービス状況:"
    docker-compose ps
}

# Docker環境停止
stop_environment() {
    log_info "Docker開発環境を停止しています..."

    check_docker_compose
    cd "$PROJECT_ROOT"

    docker-compose down

    log_success "Docker開発環境を停止しました"
}

# Docker環境再起動
restart_environment() {
    log_info "Docker開発環境を再起動しています..."
    stop_environment
    sleep 3
    start_environment
}

# Docker環境状態確認
status_environment() {
    log_info "Docker開発環境の状態を確認中..."

    check_docker_compose
    cd "$PROJECT_ROOT"

    echo ""
    log_info "=== コンテナ状態 ==="
    docker-compose ps

    echo ""
    log_info "=== ネットワーク状態 ==="
    docker network ls | grep goal-mandala || log_warning "goal-mandalaネットワークが見つかりません"

    echo ""
    log_info "=== ボリューム状態 ==="
    docker volume ls | grep goal-mandala || log_warning "goal-mandalaボリュームが見つかりません"

    # ヘルスチェック実行
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        echo ""
        log_info "=== ヘルスチェック ==="
        bash "$SCRIPT_DIR/health-check.sh" || true
    fi
}

# ヘルプ表示
show_help() {
    echo "Docker開発環境管理スクリプト"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Docker開発環境を起動"
    echo "  stop      Docker開発環境を停止"
    echo "  restart   Docker開発環境を再起動"
    echo "  status    Docker開発環境の状態確認"
    echo "  help      このヘルプを表示"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 stop"
    echo "  $0 restart"
    echo "  $0 status"
}

# メイン処理
main() {
    case "${1:-help}" in
        start)
            start_environment
            ;;
        stop)
            stop_environment
            ;;
        restart)
            restart_environment
            ;;
        status)
            status_environment
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "不明なコマンド: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
