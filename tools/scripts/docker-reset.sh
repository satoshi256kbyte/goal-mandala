#!/bin/bash

# Docker開発環境データリセットスクリプト
# Usage: ./tools/scripts/docker-reset.sh [options]

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

# 確認プロンプト
confirm_action() {
    local message="$1"
    local default_answer="${2:-n}"

    if [ "$FORCE_YES" = "true" ]; then
        return 0
    fi

    echo -n "$message [y/N]: "
    read -r answer
    answer=${answer:-$default_answer}

    case "$answer" in
        [Yy]|[Yy][Ee][Ss])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# データベースデータのリセット
reset_database() {
    log_info "データベースデータをリセット中..."

    cd "$PROJECT_ROOT"

    # PostgreSQLコンテナが起動しているか確認
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "PostgreSQLコンテナを停止中..."
        docker-compose stop postgres
    fi

    # PostgreSQLボリュームを削除
    local postgres_volume
    postgres_volume=$(docker volume ls -q | grep postgres-data || echo "")

    if [ -n "$postgres_volume" ]; then
        log_info "PostgreSQLボリュームを削除中: $postgres_volume"
        docker volume rm "$postgres_volume" || log_warning "ボリューム削除に失敗しました"
    else
        log_info "PostgreSQLボリュームが見つかりません"
    fi

    # PostgreSQLコンテナを再起動
    log_info "PostgreSQLコンテナを再起動中..."
    docker-compose up -d postgres

    # 初期化完了を待機
    log_info "データベース初期化を待機中..."
    sleep 15

    # ヘルスチェック実行
    if [ -f "$SCRIPT_DIR/test-postgres-connection.sh" ]; then
        log_info "データベース接続テスト中..."
        bash "$SCRIPT_DIR/test-postgres-connection.sh" || log_warning "データベース接続テストに失敗しました"
    fi

    log_success "データベースデータのリセットが完了しました"
}

# Cognitoデータのリセット
reset_cognito() {
    log_info "Cognitoデータをリセット中..."

    cd "$PROJECT_ROOT"

    # cognito-localコンテナが起動しているか確認
    if docker-compose ps cognito-local | grep -q "Up"; then
        log_info "cognito-localコンテナを停止中..."
        docker-compose stop cognito-local
    fi

    # cognito-localボリュームを削除
    local cognito_volume
    cognito_volume=$(docker volume ls -q | grep cognito-data || echo "")

    if [ -n "$cognito_volume" ]; then
        log_info "cognito-localボリュームを削除中: $cognito_volume"
        docker volume rm "$cognito_volume" || log_warning "ボリューム削除に失敗しました"
    else
        log_info "cognito-localボリュームが見つかりません"
    fi

    # cognito-localコンテナを再起動
    log_info "cognito-localコンテナを再起動中..."
    docker-compose up -d cognito-local

    # 初期化完了を待機
    log_info "Cognito初期化を待機中..."
    sleep 10

    # ヘルスチェック実行
    if [ -f "$SCRIPT_DIR/validate-cognito-local.sh" ]; then
        log_info "Cognito接続テスト中..."
        bash "$SCRIPT_DIR/validate-cognito-local.sh" || log_warning "Cognito接続テストに失敗しました"
    fi

    log_success "Cognitoデータのリセットが完了しました"
}

# 全データのリセット
reset_all_data() {
    log_info "全データをリセット中..."

    cd "$PROJECT_ROOT"

    # 全コンテナを停止
    log_info "全コンテナを停止中..."
    docker-compose down

    # 全ボリュームを削除
    log_info "プロジェクト関連ボリュームを削除中..."
    docker volume ls -q | grep -E "(postgres-data|cognito-data)" | while read -r volume; do
        if [ -n "$volume" ]; then
            log_info "ボリュームを削除中: $volume"
            docker volume rm "$volume" || log_warning "ボリューム削除に失敗しました: $volume"
        fi
    done

    # 全コンテナを再起動
    log_info "全コンテナを再起動中..."
    docker-compose up -d

    # 初期化完了を待機
    log_info "サービス初期化を待機中..."
    sleep 20

    # ヘルスチェック実行
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        log_info "ヘルスチェック実行中..."
        bash "$SCRIPT_DIR/health-check.sh" || log_warning "ヘルスチェックに失敗しました"
    fi

    log_success "全データのリセットが完了しました"
}

# シードデータの投入
seed_database() {
    log_info "シードデータを投入中..."

    if [ -f "$SCRIPT_DIR/seed-database.sh" ]; then
        bash "$SCRIPT_DIR/seed-database.sh"
        log_success "シードデータの投入が完了しました"
    else
        log_warning "シードデータスクリプトが見つかりません: $SCRIPT_DIR/seed-database.sh"
    fi
}

# Docker環境の完全クリーンアップ
cleanup_docker() {
    log_warning "Docker環境の完全クリーンアップを実行します"
    log_warning "これにより、プロジェクト関連の全てのコンテナ、ボリューム、ネットワークが削除されます"

    if ! confirm_action "本当に実行しますか？"; then
        log_info "クリーンアップをキャンセルしました"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Docker Composeリソースを完全削除
    log_info "Docker Composeリソースを削除中..."
    docker-compose down --volumes --remove-orphans

    # 未使用のDockerリソースをクリーンアップ
    log_info "未使用のDockerリソースをクリーンアップ中..."
    docker system prune -f

    log_success "Docker環境の完全クリーンアップが完了しました"
}

# ヘルプ表示
show_help() {
    echo "Docker開発環境データリセットスクリプト"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  database      データベースデータのみをリセット"
    echo "  cognito       Cognitoデータのみをリセット"
    echo "  all           全データをリセット (デフォルト)"
    echo "  seed          シードデータを投入"
    echo "  cleanup       Docker環境の完全クリーンアップ"
    echo "  help          このヘルプを表示"
    echo ""
    echo "Options:"
    echo "  -y, --yes     確認プロンプトをスキップ"
    echo "  -h, --help    このヘルプを表示"
    echo ""
    echo "Examples:"
    echo "  $0                    # 全データをリセット"
    echo "  $0 database           # データベースのみリセット"
    echo "  $0 cognito            # Cognitoのみリセット"
    echo "  $0 all --yes          # 確認なしで全データリセット"
    echo "  $0 seed               # シードデータを投入"
    echo "  $0 cleanup            # 完全クリーンアップ"
    echo ""
    echo "注意:"
    echo "  - このスクリプトはローカル開発環境でのみ使用してください"
    echo "  - 本番環境では絶対に実行しないでください"
    echo "  - データは完全に削除され、復元できません"
}

# メイン処理
main() {
    local command="all"
    local force_yes=false

    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            database|cognito|all|seed|cleanup)
                command="$1"
                shift
                ;;
            -y|--yes)
                export FORCE_YES="true"
                shift
                ;;
            -h|--help|help)
                show_help
                return 0
                ;;
            *)
                log_error "不明なオプション: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done

    check_docker_compose

    # 環境確認
    if [ "$NODE_ENV" = "production" ] || [ "$ENVIRONMENT" = "production" ]; then
        log_error "本番環境でのデータリセットは禁止されています"
        exit 1
    fi

    case "$command" in
        database)
            if confirm_action "データベースデータをリセットしますか？"; then
                reset_database
            else
                log_info "データベースリセットをキャンセルしました"
            fi
            ;;
        cognito)
            if confirm_action "Cognitoデータをリセットしますか？"; then
                reset_cognito
            else
                log_info "Cognitoリセットをキャンセルしました"
            fi
            ;;
        all)
            if confirm_action "全データをリセットしますか？"; then
                reset_all_data
            else
                log_info "データリセットをキャンセルしました"
            fi
            ;;
        seed)
            if confirm_action "シードデータを投入しますか？"; then
                seed_database
            else
                log_info "シードデータ投入をキャンセルしました"
            fi
            ;;
        cleanup)
            cleanup_docker
            ;;
        *)
            log_error "不明なコマンド: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
