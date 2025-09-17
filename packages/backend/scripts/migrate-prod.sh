#!/bin/bash

# 本番環境マイグレーションスクリプト
# 安全な本番環境でのマイグレーション実行

set -e

echo "🚀 Goal Mandala - 本番環境マイグレーション"
echo "============================================"

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL環境変数が設定されていません"
    exit 1
fi

if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  NODE_ENV=production が設定されていません"
    read -p "本番環境以外でマイグレーションを実行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ マイグレーションをキャンセルしました"
        exit 1
    fi
fi

# バックアップ確認
echo "📋 事前チェック実行中..."
echo "1. データベースバックアップが作成されていることを確認してください"
echo "2. マイグレーション内容を確認してください"
echo "3. ロールバック手順を準備してください"

read -p "事前チェックが完了していますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 事前チェックを完了してからマイグレーションを実行してください"
    exit 1
fi

# データベース接続確認
echo "🔍 データベース接続確認中..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ データベースに接続できません"
    exit 1
fi
echo "✅ データベース接続確認完了"

# マイグレーション状態確認
echo "📊 現在のマイグレーション状態確認中..."
npx prisma migrate status

echo ""
read -p "マイグレーションを実行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ マイグレーションをキャンセルしました"
    exit 1
fi

# マイグレーション実行
echo "🚀 本番マイグレーション実行中..."
START_TIME=$(date +%s)

if npx prisma migrate deploy; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo "✅ マイグレーション完了 (${DURATION}秒)"
    
    # マイグレーション後の検証
    echo "🔍 マイグレーション後検証中..."
    
    # テーブル存在確認
    TABLES=$(npx prisma db execute --stdin <<< "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE '_prisma_%';
    " | tail -n +3 | head -n -1 | xargs)
    
    echo "📊 作成されたテーブル数: $TABLES"
    
    if [ "$TABLES" -ge 7 ]; then
        echo "✅ テーブル作成確認完了"
    else
        echo "⚠️  期待されるテーブル数と異なります"
    fi
    
    # Prismaクライアント生成
    echo "🔧 Prismaクライアント生成中..."
    npx prisma generate
    
    echo ""
    echo "🎉 本番マイグレーション正常完了！"
    echo "============================================"
    echo "⏱️  実行時間: ${DURATION}秒"
    echo "📊 テーブル数: $TABLES"
    echo "📝 次のステップ:"
    echo "  1. アプリケーションの動作確認"
    echo "  2. 監視ダッシュボードの確認"
    echo "  3. ログの確認"
    echo "============================================"
    
else
    echo "❌ マイグレーション実行中にエラーが発生しました"
    echo "🔄 ロールバック手順:"
    echo "  1. バックアップからの復旧を検討"
    echo "  2. 問題の調査と修正"
    echo "  3. 再実行の準備"
    exit 1
fi
