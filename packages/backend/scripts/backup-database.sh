#!/bin/bash

# データベースバックアップスクリプト
# PostgreSQLデータベースの完全バックアップを作成

set -e

echo "💾 Goal Mandala - データベースバックアップ"
echo "=========================================="

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL環境変数が設定されていません"
    exit 1
fi

# バックアップディレクトリ作成
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# タイムスタンプ生成
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/goal_mandala_backup_$TIMESTAMP.sql"

echo "📅 バックアップ開始: $(date)"
echo "📁 バックアップファイル: $BACKUP_FILE"

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

# pg_dumpでバックアップ実行
echo "🔄 バックアップ実行中..."
export PGPASSWORD="$DB_PASS"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE.custom"; then
    
    # SQLファイルも作成（可読性のため）
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=plain \
        --file="$BACKUP_FILE"
    
    # ファイルサイズ確認
    CUSTOM_SIZE=$(du -h "$BACKUP_FILE.custom" | cut -f1)
    SQL_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo "✅ バックアップ完了"
    echo "📊 バックアップ情報:"
    echo "  - カスタム形式: $BACKUP_FILE.custom ($CUSTOM_SIZE)"
    echo "  - SQL形式: $BACKUP_FILE ($SQL_SIZE)"
    echo "  - 作成日時: $(date)"
    
    # バックアップファイルの整合性チェック
    echo "🔍 バックアップ整合性チェック中..."
    if pg_restore --list "$BACKUP_FILE.custom" > /dev/null 2>&1; then
        echo "✅ バックアップファイルの整合性確認完了"
    else
        echo "⚠️  バックアップファイルの整合性に問題がある可能性があります"
    fi
    
    # 古いバックアップファイルのクリーンアップ（7日以上古いファイル）
    echo "🧹 古いバックアップファイルのクリーンアップ中..."
    find "$BACKUP_DIR" -name "goal_mandala_backup_*.sql*" -mtime +7 -delete
    
    echo ""
    echo "🎉 バックアップ処理完了！"
    echo "=========================================="
    
else
    echo "❌ バックアップ実行中にエラーが発生しました"
    exit 1
fi

unset PGPASSWORD
