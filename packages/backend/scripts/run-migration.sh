#!/bin/bash

# 変更履歴テーブル追加マイグレーション実行スクリプト

set -e

echo "=========================================="
echo "変更履歴テーブル追加マイグレーション"
echo "=========================================="
echo ""

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 現在のディレクトリを確認
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}エラー: このスクリプトはpackages/backendディレクトリから実行してください${NC}"
    exit 1
fi

# 1. Dockerコンテナの起動確認
echo "1. Dockerコンテナの起動確認..."
if ! docker ps | grep -q "goal-mandala-postgres"; then
    echo -e "${YELLOW}PostgreSQLコンテナが起動していません。起動します...${NC}"
    cd ../.. && docker-compose up -d postgres && cd packages/backend
    echo "コンテナの起動を待機中..."
    sleep 10
else
    echo -e "${GREEN}PostgreSQLコンテナは起動しています${NC}"
fi

# 2. データベース接続確認
echo ""
echo "2. データベース接続確認..."
if docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}データベース接続成功${NC}"
else
    echo -e "${RED}エラー: データベースに接続できません${NC}"
    echo "以下を確認してください："
    echo "  - PostgreSQLコンテナが起動しているか"
    echo "  - .envファイルのDATABASE_URLが正しいか"
    exit 1
fi

# 3. Prismaクライアント生成
echo ""
echo "3. Prismaクライアント生成..."
npx prisma generate

# 4. マイグレーション実行
echo ""
echo "4. マイグレーション実行..."
echo -e "${YELLOW}マイグレーションを実行しますか？ (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    npx prisma migrate deploy
    echo -e "${GREEN}マイグレーション完了${NC}"
else
    echo "マイグレーションをキャンセルしました"
    exit 0
fi

# 5. テーブル作成確認
echo ""
echo "5. テーブル作成確認..."
if docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\dt change_history" | grep -q "change_history"; then
    echo -e "${GREEN}change_historyテーブルが正常に作成されました${NC}"
else
    echo -e "${RED}エラー: change_historyテーブルが見つかりません${NC}"
    exit 1
fi

# 6. テーブル構造表示
echo ""
echo "6. テーブル構造:"
docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\d change_history"

# 7. テスト実行確認
echo ""
echo "7. マイグレーションテストを実行しますか？ (y/n)"
read -r test_response

if [[ "$test_response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "テストを実行中..."
    npm test -- tests/migration-change-history.test.ts --run
    echo -e "${GREEN}テスト完了${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}マイグレーションが正常に完了しました！${NC}"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "  1. バックエンドAPI実装（更新系）"
echo "  2. 変更履歴記録機能の実装"
echo "  3. フロントエンド編集コンポーネントの実装"
