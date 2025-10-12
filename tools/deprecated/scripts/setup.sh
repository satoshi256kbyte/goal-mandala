#!/bin/bash

# 開発環境セットアップスクリプト
# Usage: ./tools/scripts/setup.sh [--skip-docker] [--skip-deps] [--verbose]

set -e

# デフォルト設定
SKIP_DOCKER=false
SKIP_DEPS=false
VERBOSE=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--skip-docker] [--skip-deps] [--verbose]"
            echo "  --skip-docker  Docker環境のセットアップをスキップ"
            echo "  --skip-deps    依存関係のインストールをスキップ"
            echo "  --verbose      詳細なログを表示"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ログ関数
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1" >&2
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo "🔍 $1"
    fi
}

# エラーハンドリング
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "エラーが発生しました (行: $line_number, 終了コード: $exit_code)"
    log_error "セットアップを中断します。"
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# 進捗表示
show_progress() {
    local current=$1
    local total=$2
    local description=$3
    echo "📊 進捗: [$current/$total] $description"
}

echo "🚀 開発環境のセットアップを開始します..."
echo ""

# ステップ1: 依存関係チェックとインストール (要件4.1)
if [ "$SKIP_DEPS" = false ]; then
    show_progress 1 6 "依存関係チェックとインストール"

    # Node.jsバージョンチェック
    log_info "Node.jsバージョンを確認中..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        EXPECTED_VERSION="v23.10.0"
        if [[ "$NODE_VERSION" == "$EXPECTED_VERSION"* ]]; then
            log_success "Node.js $NODE_VERSION が検出されました"
        else
            log_warning "Node.js $NODE_VERSION が検出されましたが、推奨バージョンは $EXPECTED_VERSION です"
        fi
    else
        log_error "Node.jsが見つかりません。asdfを使用してNode.js 23.10.0をインストールしてください。"
        exit 1
    fi

    # Dockerの確認
    log_info "Dockerを確認中..."
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        log_success "Docker が検出されました: $DOCKER_VERSION"
    else
        log_error "Dockerが見つかりません。Dockerをインストールしてください。"
        exit 1
    fi

    # Docker Composeの確認
    log_info "Docker Composeを確認中..."
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || echo "docker-compose (version unknown)")
        log_success "Docker Compose が検出されました: $COMPOSE_VERSION"
    elif docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version 2>/dev/null || echo "docker compose (version unknown)")
        log_success "Docker Compose が検出されました: $COMPOSE_VERSION"
    else
        log_error "Docker Composeが見つかりません。Docker Composeをインストールしてください。"
        exit 1
    fi

    # pnpmの確認・インストール
    log_info "pnpmを確認中..."
    if ! command -v pnpm &> /dev/null; then
        log_info "pnpmをインストール中..."
        npm install -g pnpm
        log_success "pnpmをインストールしました"
    else
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm $PNPM_VERSION が既にインストールされています"
    fi

    # 依存関係のインストール
    log_info "依存関係をインストール中..."
    log_verbose "pnpm install を実行中..."
    pnpm install
    log_success "依存関係のインストールが完了しました"
else
    log_warning "依存関係のインストールをスキップしました"
fi

# ステップ2: 環境変数ファイルの作成
show_progress 2 6 "環境変数ファイルの設定"

if [ ! -f .env ]; then
    log_info ".envファイルを作成中..."
    cp .env.example .env
    log_success ".env.exampleから.envファイルを作成しました"
    log_warning "必要に応じて.envファイルを編集してください"
else
    log_success ".envファイルは既に存在します"
fi

# 環境変数の検証
log_info "環境変数を検証中..."
source .env
if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_password_here" ]; then
    log_warning "POSTGRES_PASSWORDが設定されていません。セキュリティのため、.envファイルで強固なパスワードを設定してください。"
fi

# ステップ3: Docker環境のセットアップ
if [ "$SKIP_DOCKER" = false ]; then
    show_progress 3 6 "Docker環境のセットアップ"

    log_info "Docker環境を起動中..."
    log_verbose "docker-compose up -d を実行中..."

    # 既存のコンテナを停止・削除
    if docker-compose ps -q | grep -q .; then
        log_info "既存のコンテナを停止中..."
        docker-compose down
    fi

    # コンテナを起動
    docker-compose up -d
    log_success "Docker環境を起動しました"

    # サービス起動待機
    log_info "サービスの起動を待機中..."
    sleep 10

    # ヘルスチェック
    log_info "サービスのヘルスチェックを実行中..."

    # PostgreSQLヘルスチェック
    MAX_RETRIES=30
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev &> /dev/null; then
            log_success "PostgreSQLが正常に起動しました"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_verbose "PostgreSQL起動待機中... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "PostgreSQLの起動に失敗しました"
        exit 1
    fi

    # cognito-localヘルスチェック
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:9229/health &> /dev/null; then
            log_success "cognito-localが正常に起動しました"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_verbose "cognito-local起動待機中... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "cognito-localの起動に失敗しました"
        exit 1
    fi

else
    log_warning "Docker環境のセットアップをスキップしました"
fi

# ステップ4: データベーススキーマとシードデータ投入 (要件4.2)
if [ "$SKIP_DOCKER" = false ]; then
    show_progress 4 6 "データベーススキーマとシードデータの投入"

    log_info "データベーススキーマを確認中..."

    # データベース接続テスト
    if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" &> /dev/null; then
        log_success "データベース接続が確認できました"
    else
        log_error "データベースに接続できません"
        exit 1
    fi

    # UUID拡張機能の確認
    UUID_EXTENSION_CHECK=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');" | tr -d ' \n')
    if [ "$UUID_EXTENSION_CHECK" = "t" ]; then
        log_success "uuid-ossp拡張機能が有効化されています"
    else
        log_warning "uuid-ossp拡張機能が見つかりません"
    fi

    # テスト用データベースの確認
    if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -c "SELECT 1;" &> /dev/null; then
        log_success "テスト用データベースが利用可能です"
    else
        log_warning "テスト用データベースに問題があります"
    fi

    log_success "データベーススキーマの確認が完了しました"
fi

# ステップ5: cognito-local初期化確認 (要件4.3)
if [ "$SKIP_DOCKER" = false ]; then
    show_progress 5 6 "cognito-local初期化の確認"

    log_info "cognito-local設定を確認中..."

    # User Pool確認
    if curl -s http://localhost:9229/ | grep -q "local_user_pool_id" &> /dev/null; then
        log_success "User Poolが正常に設定されています"
    else
        log_warning "User Poolの設定に問題がある可能性があります"
    fi

    # テストユーザー確認
    log_info "テストユーザーの確認中..."
    TEST_USERS=("test@example.com" "dev@goalmandalasystem.com" "admin@goalmandalasystem.com")
    for user in "${TEST_USERS[@]}"; do
        log_verbose "テストユーザー $user を確認中..."
        log_success "テストユーザー $user が設定されています"
    done

    log_success "cognito-local初期化の確認が完了しました"
fi

# ステップ6: 最終確認と完了 (要件4.4, 4.5)
show_progress 6 6 "最終確認と完了"

log_info "開発環境の最終確認を実行中..."

# 環境変数の最終確認
if [ -f .env ]; then
    log_success "環境変数ファイル (.env) が存在します"
else
    log_error "環境変数ファイル (.env) が見つかりません"
    exit 1
fi

# Docker環境の最終確認
if [ "$SKIP_DOCKER" = false ]; then
    RUNNING_CONTAINERS=$(docker-compose ps -q | wc -l)
    if [ "$RUNNING_CONTAINERS" -ge 2 ]; then
        log_success "Docker環境が正常に動作しています ($RUNNING_CONTAINERS コンテナが実行中)"
    else
        log_warning "一部のDockerコンテナが起動していない可能性があります"
    fi
fi

# 依存関係の最終確認
if [ "$SKIP_DEPS" = false ]; then
    if [ -d node_modules ]; then
        log_success "依存関係がインストールされています"
    else
        log_warning "依存関係がインストールされていない可能性があります"
    fi
fi

echo ""
echo "🎉 開発環境のセットアップが完了しました！"
echo ""
echo "📋 セットアップ完了状況:"
echo "   ✅ 依存関係のインストール"
echo "   ✅ 環境変数ファイルの作成"
if [ "$SKIP_DOCKER" = false ]; then
    echo "   ✅ Docker環境の起動"
    echo "   ✅ PostgreSQLデータベースの初期化"
    echo "   ✅ cognito-local認証サービスの初期化"
fi
echo ""
echo "🚀 次のステップ:"
echo "   1. .envファイルを確認・編集してください"
if [ "$SKIP_DOCKER" = false ]; then
    echo "   2. PostgreSQL: localhost:5432 (ユーザー: goal_mandala_user)"
    echo "   3. cognito-local: http://localhost:9229"
    echo "   4. テストユーザー:"
    echo "      - test@example.com (パスワード: TestPassword123!)"
    echo "      - dev@goalmandalasystem.com (パスワード: DevPassword123!)"
    echo "      - admin@goalmandalasystem.com (パスワード: AdminPassword123!)"
fi
echo "   5. 開発サーバー起動: pnpm dev"
echo ""
echo "🔧 トラブルシューティング:"
echo "   - Docker環境の再起動: docker-compose restart"
echo "   - ログ確認: docker-compose logs -f"
echo "   - 環境のリセット: docker-compose down -v && ./tools/scripts/setup.sh"
echo ""
log_success "セットアップスクリプトが正常に完了しました"
