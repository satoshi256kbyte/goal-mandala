#!/bin/bash

# データベース復旧スクリプト
# バックアップファイルからデータベースを復旧

set -e

echo "🔄 Goal Mandala - データベース復旧"
echo "=================================="

# 引数チェック
if [ $# -eq 0 ]; then
    echo "使用方法: $0 <バックアップファイルパス>"
    echo ""
    echo "利用可能なバックアップファイル:"
    find ./backups -name "goal_mandala_backup_*.sql*" -type f | sort -r | head -10
    exit 1
fi

BACKUP_FILE="$1"

# バックアップファイル存在チェック
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ バックアップファイルが見つかりません: $BACKUP_FILE"
    exit 1
fi

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL環境変数が設定されていません"
    exit 1
fi

echo "📁 復旧対象ファイル: $BACKUP_FILE"
echo "📊 ファイルサイズ: $(du -h "$BACKUP_FILE" | cut -f1)"

# 危険な操作の確認
echo ""
echo "⚠️  警告: この操作は既存のデータベースを完全に置き換えます"
echo "現在のデータは全て失われます。"
echo ""
read -p "復旧を実行しますか？ (yes/no): " -r
if [ "$REPLY" != "yes" ]; then
    echo "❌ 復旧をキャンセルしました"
    exit 1
fi

# データベース接続情報を抽出
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ DATABASE_URLの形式が正しくありません"
    exit 1
fi

export PGPASSWORD="$DB_PASS"

# データベース接続確認
echo "🔍 データベース接続確認中..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ データベースに接続できません"
    exit 1
fi

# 復旧前バックアップ作成
echo "💾 復旧前バックアップ作成中..."
RESTORE_BACKUP_FILE="./backups/pre_restore_backup_$(date +"%Y%m%d_%H%M%S").sql"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    --format=custom \
    --file="$RESTORE_BACKUP_FILE"
echo "✅ 復旧前バックアップ作成完了: $RESTORE_BACKUP_FILE"

# データベース復旧実行
echo "🔄 データベース復旧実行中..."

# ファイル形式判定と復旧実行
if [[ "$BACKUP_FILE" == *.custom ]]; then
    # カスタム形式の復旧
    echo "📦 カスタム形式バックアップから復旧中..."
    
    # 既存データ削除
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    
    # データ復旧
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --no-password \
        --clean \
        --if-exists \
        "$BACKUP_FILE"
        
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    # SQL形式の復旧
    echo "📄 SQL形式バックアップから復旧中..."
    
    # 既存データ削除
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    
    # データ復旧
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        -f "$BACKUP_FILE"
else
    echo "❌ サポートされていないファイル形式です"
    exit 1
fi

# 復旧後検証
echo "🔍 復旧後検証中..."

# テーブル数確認
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)

echo "📊 復旧されたテーブル数: $TABLE_COUNT"

if [ "$TABLE_COUNT" -ge 7 ]; then
    echo "✅ 復旧後検証完了"
    
    # Prismaクライアント再生成
    echo "🔧 Prismaクライアント再生成中..."
    npx prisma generate
    
    echo ""
    echo "🎉 データベース復旧完了！"
    echo "=================================="
    echo "📊 復旧されたテーブル数: $TABLE_COUNT"
    echo "💾 復旧前バックアップ: $RESTORE_BACKUP_FILE"
    echo "📝 次のステップ:"
    echo "  1. アプリケーションの動作確認"
    echo "  2. データ整合性の確認"
    echo "  3. 必要に応じてマイグレーション実行"
    echo "=================================="
else
    echo "⚠️  復旧されたテーブル数が期待値と異なります"
    echo "復旧前バックアップから再度復旧することを検討してください: $RESTORE_BACKUP_FILE"
fi

unset PGPASSWORD
