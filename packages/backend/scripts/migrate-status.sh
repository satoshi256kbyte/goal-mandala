#!/bin/bash

# マイグレーション状態確認スクリプト
# 現在のマイグレーション状態とデータベーススキーマ情報を表示

set -e

echo "📊 Goal Mandala - マイグレーション状態確認"
echo "=========================================="

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL環境変数が設定されていません"
    exit 1
fi

# データベース接続確認
echo "🔍 データベース接続確認中..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ データベースに接続できません"
    exit 1
fi
echo "✅ データベース接続OK"

# マイグレーション履歴表示
echo ""
echo "📋 マイグレーション履歴:"
echo "----------------------------------------"
if npx prisma migrate status > /dev/null 2>&1; then
    npx prisma migrate status
else
    echo "⚠️  マイグレーション情報を取得できませんでした"
fi

# テーブル一覧表示
echo ""
echo "🗃️  データベーステーブル一覧:"
echo "----------------------------------------"
TABLES=$(npx prisma db execute --stdin <<< "
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
" 2>/dev/null | tail -n +3 | head -n -1)

if [ -n "$TABLES" ]; then
    echo "$TABLES" | while IFS='|' read -r schema table owner; do
        schema=$(echo "$schema" | xargs)
        table=$(echo "$table" | xargs)
        owner=$(echo "$owner" | xargs)
        echo "  📄 $table (owner: $owner)"
    done
else
    echo "  ❌ テーブルが見つかりません"
fi

# Enum型一覧表示
echo ""
echo "🏷️  Enum型一覧:"
echo "----------------------------------------"
ENUMS=$(npx prisma db execute --stdin <<< "
SELECT 
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;
" 2>/dev/null | tail -n +3 | head -n -1)

if [ -n "$ENUMS" ]; then
    echo "$ENUMS" | while IFS='|' read -r enum_name values; do
        enum_name=$(echo "$enum_name" | xargs)
        values=$(echo "$values" | xargs)
        echo "  🏷️  $enum_name: [$values]"
    done
else
    echo "  ❌ Enum型が見つかりません"
fi

# インデックス一覧表示
echo ""
echo "📇 インデックス一覧:"
echo "----------------------------------------"
INDEXES=$(npx prisma db execute --stdin <<< "
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
" 2>/dev/null | tail -n +3 | head -n -1)

if [ -n "$INDEXES" ]; then
    echo "$INDEXES" | while IFS='|' read -r schema table index def; do
        schema=$(echo "$schema" | xargs)
        table=$(echo "$table" | xargs)
        index=$(echo "$index" | xargs)
        echo "  📇 $table.$index"
    done
else
    echo "  ℹ️  カスタムインデックスが見つかりません"
fi

# 外部キー制約一覧表示
echo ""
echo "🔗 外部キー制約一覧:"
echo "----------------------------------------"
FOREIGN_KEYS=$(npx prisma db execute --stdin <<< "
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
" 2>/dev/null | tail -n +3 | head -n -1)

if [ -n "$FOREIGN_KEYS" ]; then
    echo "$FOREIGN_KEYS" | while IFS='|' read -r table column foreign_table foreign_column; do
        table=$(echo "$table" | xargs)
        column=$(echo "$column" | xargs)
        foreign_table=$(echo "$foreign_table" | xargs)
        foreign_column=$(echo "$foreign_column" | xargs)
        echo "  🔗 $table.$column → $foreign_table.$foreign_column"
    done
else
    echo "  ❌ 外部キー制約が見つかりません"
fi

# データ件数表示
echo ""
echo "📊 テーブル別データ件数:"
echo "----------------------------------------"
TABLE_NAMES=$(npx prisma db execute --stdin <<< "
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename != '_prisma_migrations'
ORDER BY tablename;
" 2>/dev/null | tail -n +3 | head -n -1)

if [ -n "$TABLE_NAMES" ]; then
    echo "$TABLE_NAMES" | while read -r table; do
        table=$(echo "$table" | xargs)
        if [ -n "$table" ]; then
            COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tail -n +3 | head -n -1 | xargs)
            echo "  📊 $table: $COUNT件"
        fi
    done
else
    echo "  ❌ テーブルが見つかりません"
fi

echo ""
echo "✅ マイグレーション状態確認完了"
echo "=========================================="
