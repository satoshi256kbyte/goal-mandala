#!/bin/bash

# 初期マイグレーション生成スクリプト
# Prismaスキーマから初期マイグレーションを生成する

set -e

echo "🚀 Goal Mandala - 初期マイグレーション生成"
echo "============================================"

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL環境変数が設定されていません"
    echo "💡 .envファイルを確認してください"
    exit 1
fi

echo "📊 データベース接続確認中..."
# データベース接続テスト
if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ データベースに接続できません"
    echo "💡 Docker Composeが起動しているか確認してください: docker-compose up -d"
    exit 1
fi

echo "✅ データベース接続確認完了"

# 既存のマイグレーションディレクトリをチェック
if [ -d "prisma/migrations" ]; then
    echo "⚠️  既存のマイグレーションが見つかりました"
    read -p "既存のマイグレーションを削除して初期化しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  既存マイグレーションを削除中..."
        rm -rf prisma/migrations
        # データベースもリセット
        npx prisma db push --force-reset
    else
        echo "❌ 初期化をキャンセルしました"
        exit 1
    fi
fi

echo "📝 初期マイグレーション生成中..."
# 初期マイグレーション生成
npx prisma migrate dev --name init

echo "🔍 生成されたマイグレーションを確認中..."
# マイグレーションファイルの存在確認
if [ ! -d "prisma/migrations" ]; then
    echo "❌ マイグレーションの生成に失敗しました"
    exit 1
fi

# テーブル作成確認
echo "📋 データベーステーブル確認中..."
TABLES=$(npx prisma db execute --stdin <<< "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
" | tail -n +3 | head -n -1)

EXPECTED_TABLES=("Action" "Goal" "Reflection" "SubGoal" "Task" "TaskReminder" "User" "_prisma_migrations")
CREATED_TABLES=($TABLES)

echo "作成されたテーブル:"
for table in "${CREATED_TABLES[@]}"; do
    echo "  ✅ $table"
done

# 必要なテーブルがすべて作成されているかチェック
MISSING_TABLES=()
for expected in "${EXPECTED_TABLES[@]}"; do
    if [[ ! " ${CREATED_TABLES[@]} " =~ " ${expected} " ]]; then
        MISSING_TABLES+=("$expected")
    fi
done

if [ ${#MISSING_TABLES[@]} -ne 0 ]; then
    echo "❌ 以下のテーブルが作成されていません:"
    for missing in "${MISSING_TABLES[@]}"; do
        echo "  ❌ $missing"
    done
    exit 1
fi

# Enum型の確認
echo "🏷️  Enum型確認中..."
ENUMS=$(npx prisma db execute --stdin <<< "
SELECT typname 
FROM pg_type 
WHERE typtype = 'e'
ORDER BY typname;
" | tail -n +3 | head -n -1)

echo "作成されたEnum型:"
for enum in $ENUMS; do
    echo "  ✅ $enum"
done

# Prismaクライアント生成
echo "🔧 Prismaクライアント生成中..."
npx prisma generate

echo ""
echo "🎉 初期マイグレーション生成完了！"
echo "============================================"
echo "📁 マイグレーションファイル: prisma/migrations/"
echo "📊 作成されたテーブル数: ${#CREATED_TABLES[@]}"
echo "🏷️  作成されたEnum型数: $(echo "$ENUMS" | wc -l)"
echo ""
echo "次のステップ:"
echo "  1. シードデータ投入: pnpm run seed:dev"
echo "  2. マイグレーション状態確認: ./scripts/migrate-status.sh"
echo "============================================"
