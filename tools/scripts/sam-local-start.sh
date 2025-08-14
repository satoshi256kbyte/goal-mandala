#!/bin/bash

# SAM Local API起動スクリプト
# AWS SAM CLIを使用してローカル開発環境でAPI Gatewayとlambda関数をエミュレートします

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# 使用方法を表示
show_usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -p, --port PORT     APIサーバーのポート番号 (デフォルト: 3001)"
    echo "  -h, --host HOST     APIサーバーのホスト (デフォルト: 0.0.0.0)"
    echo "  -e, --env ENV       環境設定 (default|dev|staging|production, デフォルト: default)"
    echo "  --no-build          ビルドをスキップ"
    echo "  --debug             デバッグモードで実行"
    echo "  --help              このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0                  # デフォルト設定で起動"
    echo "  $0 -p 3002          # ポート3002で起動"
    echo "  $0 -e dev           # dev環境設定で起動"
    echo "  $0 --no-build       # ビルドをスキップして起動"
}

# デフォルト値
PORT=3001
HOST="0.0.0.0"
ENV="default"
SKIP_BUILD=false
DEBUG_MODE=false

# コマンドライン引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        --no-build)
            SKIP_BUILD=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --help)
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

# 必要なコマンドの存在確認
check_dependencies() {
    log_info "依存関係をチェック中..."

    if ! command -v sam &> /dev/null; then
        log_error "AWS SAM CLIがインストールされていません"
        log_error "インストール方法: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_error "Node.jsがインストールされていません"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpmがインストールされていません"
        log_error "インストール方法: npm install -g pnpm"
        exit 1
    fi

    log_info "✓ 依存関係チェック完了"
}

# プロジェクトのビルド
build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warn "ビルドをスキップしています"
        return
    fi

    log_info "プロジェクトをビルド中..."

    # プロジェクトルートに移動
    cd "$PROJECT_ROOT"

    # 依存関係のインストール
    log_info "依存関係をインストール中..."
    pnpm install

    # TypeScriptのビルド
    log_info "TypeScriptをビルド中..."
    cd "$BACKEND_DIR"
    pnpm run build

    log_info "✓ ビルド完了"
}

# 環境変数の設定
setup_environment() {
    log_info "環境変数を設定中..."

    # .envファイルが存在する場合は読み込み
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info ".envファイルを読み込み中..."
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    else
        log_warn ".envファイルが見つかりません。デフォルト値を使用します。"
    fi

    # デバッグモードの場合は環境変数を表示
    if [ "$DEBUG_MODE" = true ]; then
        log_info "環境変数 (デバッグモード):"
        echo "  NODE_ENV: ${NODE_ENV:-development}"
        echo "  DATABASE_URL: ${DATABASE_URL:-postgresql://goal_mandala_user:goal_mandala_dev_password_2024@localhost:5432/goal_mandala_dev}"
        echo "  JWT_SECRET: ${JWT_SECRET:-development-secret-key-change-in-production}"
        echo "  FRONTEND_URL: ${FRONTEND_URL:-http://localhost:5173}"
    fi
}

# SAM Local API の起動
start_sam_local() {
    log_info "SAM Local APIを起動中..."
    log_info "設定:"
    log_info "  ポート: $PORT"
    log_info "  ホスト: $HOST"
    log_info "  環境: $ENV"
    log_info "  デバッグモード: $DEBUG_MODE"

    cd "$BACKEND_DIR"

    # SAM local start-apiコマンドの構築
    SAM_CMD="sam local start-api"
    SAM_CMD="$SAM_CMD --port $PORT"
    SAM_CMD="$SAM_CMD --host $HOST"
    SAM_CMD="$SAM_CMD --config-env $ENV"

    # ホットリロード機能の有効化
    SAM_CMD="$SAM_CMD --warm-containers EAGER"

    # デバッグモードの場合は詳細ログを有効化
    if [ "$DEBUG_MODE" = true ]; then
        SAM_CMD="$SAM_CMD --debug"
    fi

    log_info "実行コマンド: $SAM_CMD"
    log_info ""
    log_info "🚀 SAM Local APIを起動しています..."
    log_info "📡 API エンドポイント: http://$HOST:$PORT"
    log_info "🔄 ホットリロード: 有効"
    log_info ""
    log_info "停止するには Ctrl+C を押してください"
    log_info "----------------------------------------"

    # SAM Local API を起動
    exec $SAM_CMD
}

# メイン処理
main() {
    log_info "SAM Local API起動スクリプトを開始します"
    log_info "プロジェクトルート: $PROJECT_ROOT"
    log_info "バックエンドディレクトリ: $BACKEND_DIR"

    # 依存関係チェック
    check_dependencies

    # プロジェクトビルド
    build_project

    # 環境変数設定
    setup_environment

    # SAM Local API起動
    start_sam_local
}

# エラーハンドリング
trap 'log_error "スクリプトが中断されました"; exit 1' ERR
trap 'log_info "SAM Local APIを停止しています..."; exit 0' INT TERM

# メイン処理実行
main "$@"
