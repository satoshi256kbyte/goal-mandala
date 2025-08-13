#!/bin/bash

# 開発環境ヘルスチェックスクリプト
# Usage: ./tools/scripts/health-check.sh [--verbose] [--fix]

set -e

# デフォルト設定
VERBOSE=false
FIX_ISSUES=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --fix)
            FIX_ISSUES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--verbose] [--fix]"
            echo "  --verbose  詳細なログを表示"
            echo "  --fix      問題を自動修復（可能な場合）"
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

# ヘルスチェック結果
HEALTH_STATUS=0
ISSUES_FOUND=()
WARNINGS_FOUND=()

# 問題を記録する関数
record_issue() {
    ISSUES_FOUND+=("$1")
    HEALTH_STATUS=1
}

record_warning() {
    WARNINGS_FOUND+=("$1")
}

echo "🏥 開発環境ヘルスチェックを開始します..."
echo ""

# 1. 基本依存関係チェック
echo "📋 基本依存関係チェック"
echo "========================"

# Node.js確認
log_info "Node.jsを確認中..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION"
    log_verbose "Node.jsパス: $(which node)"
else
    log_error "Node.jsが見つかりません"
    record_issue "Node.jsがインストールされていません"
fi

# pnpm確認
log_info "pnpmを確認中..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm $PNPM_VERSION"
    log_verbose "pnpmパス: $(which pnpm)"
else
    log_error "pnpmが見つかりません"
    record_issue "pnpmがインストールされていません"
fi

# Docker確認
log_info "Dockerを確認中..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker確認完了"
    log_verbose "$DOCKER_VERSION"
else
    log_error "Dockerが見つかりません"
    record_issue "Dockerがインストールされていません"
fi

# Docker Compose確認
log_info "Docker Composeを確認中..."
if command -v docker-compose &> /dev/null; then
    log_success "Docker Compose確認完了"
    log_verbose "$(docker-compose --version 2>/dev/null || echo 'docker-compose (version unknown)')"
elif docker compose version &> /dev/null; then
    log_success "Docker Compose確認完了"
    log_verbose "$(docker compose version 2>/dev/null || echo 'docker compose (version unknown)')"
else
    log_error "Docker Composeが見つかりません"
    record_issue "Docker Composeがインストールされていません"
fi

echo ""

# 2. 環境設定チェック
echo "⚙️  環境設定チェック"
echo "==================="

# .envファイル確認
log_info ".envファイルを確認中..."
if [ -f .env ]; then
    log_success ".envファイルが存在します"

    # 重要な環境変数の確認
    source .env
    if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_password_here" ]; then
        log_warning "POSTGRES_PASSWORDがデフォルト値のままです"
        record_warning "POSTGRES_PASSWORDを変更することを推奨します"
    else
        log_success "POSTGRES_PASSWORDが設定されています"
    fi

    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URLが設定されていません"
        record_warning "DATABASE_URLの設定を確認してください"
    else
        log_success "DATABASE_URLが設定されています"
    fi

else
    log_error ".envファイルが見つかりません"
    record_issue ".envファイルが存在しません"

    if [ "$FIX_ISSUES" = true ] && [ -f .env.example ]; then
        log_info "自動修復: .env.exampleから.envファイルを作成中..."
        cp .env.example .env
        log_success ".envファイルを作成しました"
    fi
fi

# node_modules確認
log_info "依存関係を確認中..."
if [ -d node_modules ]; then
    log_success "依存関係がインストールされています"

    # package.jsonとの整合性確認
    if [ -f package.json ] && [ -f pnpm-lock.yaml ]; then
        log_verbose "package.jsonとpnpm-lock.yamlが存在します"
    fi
else
    log_error "依存関係がインストールされていません"
    record_issue "node_modulesディレクトリが見つかりません"

    if [ "$FIX_ISSUES" = true ]; then
        log_info "自動修復: 依存関係をインストール中..."
        pnpm install
        log_success "依存関係をインストールしました"
    fi
fi

echo ""

# 3. Docker環境チェック
echo "🐳 Docker環境チェック"
echo "===================="

# Docker Composeファイル確認
log_info "docker-compose.ymlを確認中..."
if [ -f docker-compose.yml ]; then
    log_success "docker-compose.ymlが存在します"

    # 設定ファイルの構文確認
    if docker-compose config &> /dev/null; then
        log_success "docker-compose.ymlの構文が正しいです"
    else
        log_error "docker-compose.ymlの構文にエラーがあります"
        record_issue "docker-compose.ymlの構文エラー"
    fi
else
    log_error "docker-compose.ymlが見つかりません"
    record_issue "docker-compose.ymlが存在しません"
fi

# コンテナ状態確認
log_info "Dockerコンテナ状態を確認中..."
if docker-compose ps -q &> /dev/null; then
    RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l)
    TOTAL_SERVICES=$(docker-compose ps --services | wc -l)

    if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_SERVICES" ] && [ "$RUNNING_CONTAINERS" -gt 0 ]; then
        log_success "全てのDockerサービスが実行中です ($RUNNING_CONTAINERS/$TOTAL_SERVICES)"
    elif [ "$RUNNING_CONTAINERS" -gt 0 ]; then
        log_warning "一部のDockerサービスが停止しています ($RUNNING_CONTAINERS/$TOTAL_SERVICES)"
        record_warning "一部のDockerサービスが停止中"

        if [ "$FIX_ISSUES" = true ]; then
            log_info "自動修復: Dockerサービスを起動中..."
            docker-compose up -d
            sleep 10
            log_success "Dockerサービスを起動しました"
        fi
    else
        log_error "Dockerサービスが起動していません"
        record_issue "Dockerサービスが停止中"

        if [ "$FIX_ISSUES" = true ]; then
            log_info "自動修復: Dockerサービスを起動中..."
            docker-compose up -d
            sleep 10
            log_success "Dockerサービスを起動しました"
        fi
    fi
else
    log_error "Docker Composeプロジェクトが見つかりません"
    record_issue "Docker Composeプロジェクトが初期化されていません"
fi

echo ""

# 4. PostgreSQLヘルスチェック
echo "🐘 PostgreSQLヘルスチェック"
echo "=========================="

log_info "PostgreSQL接続を確認中..."
if docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev &> /dev/null; then
    log_success "PostgreSQL接続が正常です"

    # データベース詳細確認
    log_verbose "データベース詳細を確認中..."

    # 開発用データベース確認
    if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" &> /dev/null; then
        log_success "開発用データベース (goal_mandala_dev) が利用可能です"
    else
        log_error "開発用データベースにアクセスできません"
        record_issue "開発用データベースアクセスエラー"

        # エラー診断
        log_verbose "開発用データベースエラーの詳細を確認中..."
        DEV_DB_ERROR=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" 2>&1 || echo "Connection failed")
        log_verbose "エラー詳細: $DEV_DB_ERROR"
    fi

    # テスト用データベース確認
    if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -c "SELECT 1;" &> /dev/null; then
        log_success "テスト用データベース (goal_mandala_test) が利用可能です"
    else
        log_warning "テスト用データベースにアクセスできません"
        record_warning "テスト用データベースアクセスエラー"

        # エラー診断
        log_verbose "テスト用データベースエラーの詳細を確認中..."
        TEST_DB_ERROR=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -c "SELECT 1;" 2>&1 || echo "Connection failed")
        log_verbose "エラー詳細: $TEST_DB_ERROR"
    fi

    # UUID拡張機能確認
    UUID_EXT_CHECK=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');" 2>/dev/null | tr -d ' \n')
    if [ "$UUID_EXT_CHECK" = "t" ]; then
        log_success "uuid-ossp拡張機能が有効です"
    else
        log_warning "uuid-ossp拡張機能が無効です"
        record_warning "uuid-ossp拡張機能が無効"

        # 修復提案
        if [ "$FIX_ISSUES" = true ]; then
            log_info "自動修復: uuid-ossp拡張機能を有効化中..."
            docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" &> /dev/null
            docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" &> /dev/null
            log_success "uuid-ossp拡張機能を有効化しました"
        fi
    fi

    # データベース統計情報
    log_verbose "データベース統計情報を取得中..."
    DEV_DB_SIZE=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT pg_size_pretty(pg_database_size('goal_mandala_dev'));" 2>/dev/null | tr -d ' \n' || echo "unknown")
    TEST_DB_SIZE=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -t -c "SELECT pg_size_pretty(pg_database_size('goal_mandala_test'));" 2>/dev/null | tr -d ' \n' || echo "unknown")
    log_verbose "データベースサイズ - 開発用: $DEV_DB_SIZE, テスト用: $TEST_DB_SIZE"

else
    log_error "PostgreSQLに接続できません"
    record_issue "PostgreSQL接続エラー"

    # エラー診断
    log_verbose "PostgreSQL接続エラーの詳細を確認中..."

    # コンテナログ確認
    if docker-compose logs postgres --tail=10 &> /dev/null; then
        log_verbose "PostgreSQLコンテナログ（最新10行）:"
        docker-compose logs postgres --tail=10 2>&1 | while read line; do
            log_verbose "  $line"
        done
    fi

    # ポート確認
    if netstat -an 2>/dev/null | grep -q ":5432.*LISTEN" || ss -an 2>/dev/null | grep -q ":5432.*LISTEN"; then
        log_verbose "ポート5432はリッスン中です"
    else
        log_verbose "ポート5432がリッスンしていません"
    fi

    # 修復提案
    if [ "$FIX_ISSUES" = true ]; then
        log_info "自動修復: PostgreSQLコンテナを再起動中..."
        docker-compose restart postgres
        sleep 15

        if docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev &> /dev/null; then
            log_success "PostgreSQL接続が復旧しました"
        else
            log_error "PostgreSQL接続の復旧に失敗しました"
        fi
    fi
fi

echo ""

# 5. cognito-localヘルスチェック
echo "🔐 cognito-localヘルスチェック"
echo "============================="

log_info "cognito-local接続を確認中..."

# 最大30秒待機してから接続テスト
COGNITO_CONNECTED=false
for i in {1..6}; do
    if curl -f http://localhost:9229/health &> /dev/null; then
        log_success "cognito-local接続が正常です"
        COGNITO_CONNECTED=true
        break
    else
        if [ $i -eq 6 ]; then
            log_error "cognito-localに接続できません"
            record_issue "cognito-local接続エラー"

            # エラー診断
            log_verbose "cognito-local接続エラーの詳細を確認中..."

            # コンテナ状態確認
            if docker-compose ps cognito-local --format "table {{.State}}" | tail -n +2 | grep -q "Up"; then
                log_verbose "cognito-localコンテナは起動中です"
            else
                log_verbose "cognito-localコンテナが停止しています"

                if [ "$FIX_ISSUES" = true ]; then
                    log_info "自動修復: cognito-localコンテナを起動中..."
                    docker-compose up -d cognito-local
                    sleep 10

                    if curl -f http://localhost:9229/health &> /dev/null; then
                        log_success "cognito-local接続が復旧しました"
                        COGNITO_CONNECTED=true
                    else
                        log_error "cognito-local接続の復旧に失敗しました"
                    fi
                fi
            fi

            # コンテナログ確認
            if docker-compose logs cognito-local --tail=10 &> /dev/null; then
                log_verbose "cognito-localコンテナログ（最新10行）:"
                docker-compose logs cognito-local --tail=10 2>&1 | while read line; do
                    log_verbose "  $line"
                done
            fi

            # ポート確認
            if netstat -an 2>/dev/null | grep -q ":9229.*LISTEN" || ss -an 2>/dev/null | grep -q ":9229.*LISTEN"; then
                log_verbose "ポート9229はリッスン中です"
            else
                log_verbose "ポート9229がリッスンしていません"
            fi

        else
            log_verbose "cognito-local接続待機中... ($i/6)"
            sleep 5
        fi
    fi
done

if [ "$COGNITO_CONNECTED" = true ]; then
    # User Pool設定確認
    log_verbose "User Pool設定を確認中..."
    USER_POOL_RESPONSE=$(curl -s http://localhost:9229/ 2>/dev/null || echo "")
    if echo "$USER_POOL_RESPONSE" | grep -q "local_user_pool_id" &> /dev/null; then
        log_success "User Pool設定が正常です"
    else
        log_warning "User Pool設定に問題があります"
        record_warning "User Pool設定エラー"
        log_verbose "User Pool応答: $USER_POOL_RESPONSE"
    fi

    # User Pool Client設定確認
    if echo "$USER_POOL_RESPONSE" | grep -q "local_client_id" &> /dev/null; then
        log_success "User Pool Client設定が正常です"
    else
        log_warning "User Pool Client設定に問題があります"
        record_warning "User Pool Client設定エラー"
    fi

    # テストユーザー確認
    TEST_USERS_FOUND=0
    TEST_USERS=("test@example.com" "dev@goalmandalasystem.com" "admin@goalmandalasystem.com")

    for user in "${TEST_USERS[@]}"; do
        if echo "$USER_POOL_RESPONSE" | grep -q "$user" &> /dev/null; then
            ((TEST_USERS_FOUND++))
        fi
    done

    if [ $TEST_USERS_FOUND -eq ${#TEST_USERS[@]} ]; then
        log_success "全てのテストユーザーが設定されています ($TEST_USERS_FOUND/${#TEST_USERS[@]})"
    elif [ $TEST_USERS_FOUND -gt 0 ]; then
        log_warning "一部のテストユーザーが設定されています ($TEST_USERS_FOUND/${#TEST_USERS[@]})"
        record_warning "一部テストユーザー設定エラー"
    else
        log_warning "テストユーザーが設定されていません"
        record_warning "テストユーザー設定エラー"
    fi

    # 応答時間測定
    log_verbose "cognito-local応答時間を測定中..."
    COGNITO_RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:9229/health 2>/dev/null || echo "0")
    if (( $(echo "$COGNITO_RESPONSE_TIME > 0" | bc -l 2>/dev/null || echo "0") )); then
        log_verbose "cognito-local応答時間: ${COGNITO_RESPONSE_TIME}秒"
    fi
fi

echo ""

# 6. ポート使用状況チェック
echo "🔌 ポート使用状況チェック"
echo "======================="

REQUIRED_PORTS=(5432 9229)
for port in "${REQUIRED_PORTS[@]}"; do
    log_info "ポート $port を確認中..."
    if netstat -an 2>/dev/null | grep -q ":$port.*LISTEN" || ss -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
        log_success "ポート $port が使用中です"
    else
        log_warning "ポート $port が使用されていません"
        record_warning "ポート $port が未使用"
    fi
done

echo ""

# 7. 結果サマリー
echo "📊 ヘルスチェック結果"
echo "==================="

if [ ${#ISSUES_FOUND[@]} -eq 0 ] && [ ${#WARNINGS_FOUND[@]} -eq 0 ]; then
    log_success "全てのヘルスチェックが正常に完了しました！"
    echo ""
    echo "🎉 開発環境は正常に動作しています"
    echo ""
    echo "🚀 利用可能なサービス:"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - cognito-local: http://localhost:9229"
    echo ""
    echo "🔑 テストユーザー:"
    echo "   - test@example.com (パスワード: TestPassword123!)"
    echo "   - dev@goalmandalasystem.com (パスワード: DevPassword123!)"
    echo "   - admin@goalmandalasystem.com (パスワード: AdminPassword123!)"

elif [ ${#ISSUES_FOUND[@]} -eq 0 ]; then
    log_success "重大な問題は見つかりませんでした"
    echo ""
    echo "⚠️  警告 (${#WARNINGS_FOUND[@]}件):"
    for warning in "${WARNINGS_FOUND[@]}"; do
        echo "   - $warning"
    done
    echo ""
    echo "💡 これらの警告は開発には影響しませんが、修正することを推奨します"

else
    log_error "問題が見つかりました"
    echo ""
    echo "❌ エラー (${#ISSUES_FOUND[@]}件):"
    for issue in "${ISSUES_FOUND[@]}"; do
        echo "   - $issue"
    done

    if [ ${#WARNINGS_FOUND[@]} -gt 0 ]; then
        echo ""
        echo "⚠️  警告 (${#WARNINGS_FOUND[@]}件):"
        for warning in "${WARNINGS_FOUND[@]}"; do
            echo "   - $warning"
        done
    fi

    echo ""
    echo "🔧 修復方法:"
    echo "   1. 自動修復を試す: $0 --fix"
    echo "   2. セットアップスクリプトを再実行: ./tools/scripts/setup.sh"
    echo "   3. Docker環境をリセット: docker-compose down -v && docker-compose up -d"
    echo ""
    echo "🔍 詳細診断:"
    echo "   - PostgreSQL詳細確認: ./tools/scripts/test-postgres-connection.sh --verbose"
    echo "   - cognito-local詳細確認: ./tools/scripts/validate-cognito-local.sh --verbose"
    echo "   - Docker環境確認: docker-compose ps && docker-compose logs"
    echo "   - ポート使用状況確認: netstat -an | grep -E ':(5432|9229)'"
fi

echo ""
echo "🔍 詳細な診断情報が必要な場合は --verbose オプションを使用してください"

exit $HEALTH_STATUS
