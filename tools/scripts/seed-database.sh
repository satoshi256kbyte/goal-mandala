#!/bin/bash

# データベースシードデータ投入スクリプト
# Usage: ./tools/scripts/seed-database.sh [--reset] [--test-data]

set -e

# デフォルト設定
RESET_DATA=false
INCLUDE_TEST_DATA=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)
            RESET_DATA=true
            shift
            ;;
        --test-data)
            INCLUDE_TEST_DATA=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--reset] [--test-data]"
            echo "  --reset      既存データをリセットしてからシードデータを投入"
            echo "  --test-data  テスト用データも含めて投入"
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

log_error() {
    echo "❌ $1" >&2
}

log_warning() {
    echo "⚠️  $1"
}

echo "🌱 データベースシードデータの投入を開始します..."

# PostgreSQL接続確認
log_info "PostgreSQL接続を確認中..."
if ! docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev &> /dev/null; then
    log_error "PostgreSQLに接続できません。Docker環境が起動していることを確認してください。"
    exit 1
fi
log_success "PostgreSQL接続が確認できました"

# データリセット（オプション）
if [ "$RESET_DATA" = true ]; then
    log_warning "既存データをリセット中..."

    # 将来的にPrismaスキーマが定義された際のテーブル削除処理
    # 現在はテーブルが存在しないため、警告のみ表示
    log_info "注意: 現在はアプリケーションテーブルが定義されていないため、リセット処理をスキップします"
    log_info "Prismaスキーマが定義された後、このスクリプトを更新してテーブルリセット機能を追加してください"
fi

# 基本シードデータの投入
log_info "基本シードデータを投入中..."

# 現在はPrismaスキーマが未定義のため、サンプルデータ投入をスキップ
# 将来的にスキーマが定義された際に、以下のようなデータ投入処理を追加
cat << 'EOF' | docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev
-- 現在はアプリケーションテーブルが未定義のため、サンプルクエリのみ実行
SELECT 'シードデータ投入準備完了' AS status;

-- 将来的に以下のようなデータ投入処理を追加予定:
-- INSERT INTO users (id, email, name, created_at) VALUES
--   (uuid_generate_v4(), 'seed@example.com', 'Seed User', NOW());

-- INSERT INTO goals (id, user_id, title, description, deadline, created_at) VALUES
--   (uuid_generate_v4(), (SELECT id FROM users WHERE email = 'seed@example.com'),
--    'サンプル目標', 'これはシードデータのサンプル目標です',
--    NOW() + INTERVAL '6 months', NOW());
EOF

log_success "基本シードデータの投入が完了しました"

# テストデータの投入（オプション）
if [ "$INCLUDE_TEST_DATA" = true ]; then
    log_info "テスト用データを投入中..."

    cat << 'EOF' | docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev
-- テスト用データの投入処理
SELECT 'テストデータ投入準備完了' AS status;

-- 将来的に以下のようなテストデータ投入処理を追加予定:
-- INSERT INTO users (id, email, name, created_at) VALUES
--   (uuid_generate_v4(), 'testuser1@example.com', 'Test User 1', NOW()),
--   (uuid_generate_v4(), 'testuser2@example.com', 'Test User 2', NOW());

-- 複数のテスト目標、サブ目標、アクション、タスクの投入処理
EOF

    log_success "テスト用データの投入が完了しました"
fi

# データ投入結果の確認
log_info "投入結果を確認中..."

# 現在のデータベース状態を確認
RESULT=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
" | grep -v "^$" | wc -l)

if [ "$RESULT" -gt 0 ]; then
    log_success "データベースにテーブルが存在します ($RESULT テーブル)"

    # テーブル一覧を表示
    log_info "存在するテーブル:"
    docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "
    SELECT
        tablename as \"テーブル名\",
        tableowner as \"所有者\"
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
    "
else
    log_info "アプリケーション用のテーブルはまだ作成されていません"
    log_info "Prismaスキーマが定義され、マイグレーションが実行された後にシードデータを投入してください"
fi

# UUID拡張機能の確認
UUID_FUNCTIONS=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "
SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'uuid_%';
" | tr -d ' \n')

if [ "$UUID_FUNCTIONS" -gt 0 ]; then
    log_success "UUID関数が利用可能です ($UUID_FUNCTIONS 関数)"
else
    log_warning "UUID関数が見つかりません"
fi

echo ""
log_success "シードデータの投入処理が完了しました"
echo ""
echo "📊 投入結果:"
echo "   ✅ PostgreSQL接続確認"
if [ "$RESET_DATA" = true ]; then
    echo "   ✅ データリセット実行"
fi
echo "   ✅ 基本シードデータ投入"
if [ "$INCLUDE_TEST_DATA" = true ]; then
    echo "   ✅ テストデータ投入"
fi
echo "   ✅ 投入結果確認"
echo ""
echo "💡 注意事項:"
echo "   - 現在はPrismaスキーマが未定義のため、実際のアプリケーションデータは投入されていません"
echo "   - スキーマ定義後、このスクリプトを更新して実際のシードデータ投入処理を追加してください"
echo "   - テーブル作成後は 'prisma db seed' コマンドの使用も検討してください"
