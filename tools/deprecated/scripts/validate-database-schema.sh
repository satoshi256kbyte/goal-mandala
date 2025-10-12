#!/bin/bash

# データベーススキーマ検証スクリプト
# Usage: ./tools/scripts/validate-database-schema.sh

set -e

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

echo "🔍 データベーススキーマの検証を開始します..."

# PostgreSQL接続確認
log_info "PostgreSQL接続を確認中..."
if docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev &> /dev/null; then
    log_success "PostgreSQL接続が確認できました"
else
    log_error "PostgreSQLに接続できません。Docker環境が起動していることを確認してください。"
    exit 1
fi

# データベース存在確認
log_info "データベースの存在を確認中..."

# 開発用データベース確認
DEV_DB_EXISTS=$(docker-compose exec -T postgres psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'goal_mandala_dev';" | tr -d ' \n')
if [ "$DEV_DB_EXISTS" = "1" ]; then
    log_success "開発用データベース (goal_mandala_dev) が存在します"
else
    log_error "開発用データベース (goal_mandala_dev) が見つかりません"
    exit 1
fi

# テスト用データベース確認
TEST_DB_EXISTS=$(docker-compose exec -T postgres psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'goal_mandala_test';" | tr -d ' \n')
if [ "$TEST_DB_EXISTS" = "1" ]; then
    log_success "テスト用データベース (goal_mandala_test) が存在します"
else
    log_error "テスト用データベース (goal_mandala_test) が見つかりません"
    exit 1
fi

# ユーザー権限確認
log_info "ユーザー権限を確認中..."
USER_EXISTS=$(docker-compose exec -T postgres psql -U postgres -t -c "SELECT 1 FROM pg_user WHERE usename = 'goal_mandala_user';" | tr -d ' \n')
if [ "$USER_EXISTS" = "1" ]; then
    log_success "データベースユーザー (goal_mandala_user) が存在します"
else
    log_error "データベースユーザー (goal_mandala_user) が見つかりません"
    exit 1
fi

# 拡張機能確認
log_info "拡張機能を確認中..."

# 開発用データベースのUUID拡張機能確認
DEV_UUID_EXT=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');" | tr -d ' \n')
if [ "$DEV_UUID_EXT" = "t" ]; then
    log_success "開発用データベースでuuid-ossp拡張機能が有効です"
else
    log_error "開発用データベースでuuid-ossp拡張機能が無効です"
    exit 1
fi

# テスト用データベースのUUID拡張機能確認
TEST_UUID_EXT=$(docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');" | tr -d ' \n')
if [ "$TEST_UUID_EXT" = "t" ]; then
    log_success "テスト用データベースでuuid-ossp拡張機能が有効です"
else
    log_error "テスト用データベースでuuid-ossp拡張機能が無効です"
    exit 1
fi

# 接続テスト
log_info "データベース接続テストを実行中..."

# 開発用データベース接続テスト
if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT current_database(), current_user, version();" &> /dev/null; then
    log_success "開発用データベースへの接続テストが成功しました"
else
    log_error "開発用データベースへの接続テストが失敗しました"
    exit 1
fi

# テスト用データベース接続テスト
if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_test -c "SELECT current_database(), current_user, version();" &> /dev/null; then
    log_success "テスト用データベースへの接続テストが成功しました"
else
    log_error "テスト用データベースへの接続テストが失敗しました"
    exit 1
fi

echo ""
log_success "データベーススキーマの検証が完了しました"
echo ""
echo "📊 検証結果:"
echo "   ✅ PostgreSQL接続"
echo "   ✅ 開発用データベース (goal_mandala_dev)"
echo "   ✅ テスト用データベース (goal_mandala_test)"
echo "   ✅ データベースユーザー (goal_mandala_user)"
echo "   ✅ UUID拡張機能 (uuid-ossp)"
echo "   ✅ データベース接続テスト"
