#!/bin/bash

# Step Functions Local環境セットアップスクリプト
# Requirements: 11.5 - ローカル実行スクリプト

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Step Functions Local環境セットアップ ===${NC}"

# 1. Docker環境の確認
echo -e "\n${YELLOW}1. Docker環境の確認${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Dockerがインストールされていません${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Dockerが起動していません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker環境OK${NC}"

# 2. 環境変数ファイルの作成
echo -e "\n${YELLOW}2. 環境変数ファイルの作成${NC}"
if [ ! -f .env.local ]; then
    cat > .env.local << EOF
# Step Functions Local
STEPFUNCTIONS_ENDPOINT=http://localhost:8083

# DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000

# PostgreSQL Test
DATABASE_URL=postgresql://goal_mandala_user:test_password@localhost:5433/goal_mandala_test

# Lambda Endpoint (SAM Local)
LAMBDA_ENDPOINT=http://localhost:3001

# テストモード
NODE_ENV=test
EOF
    echo -e "${GREEN}✓ .env.localファイルを作成しました${NC}"
else
    echo -e "${GREEN}✓ .env.localファイルは既に存在します${NC}"
fi

# 3. Dockerコンテナの起動
echo -e "\n${YELLOW}3. Dockerコンテナの起動${NC}"
docker-compose -f docker-compose.local.yml up -d

# 4. ヘルスチェック
echo -e "\n${YELLOW}4. ヘルスチェック${NC}"

# Step Functions Localのヘルスチェック
echo -n "Step Functions Local: "
for i in {1..30}; do
    if curl -s http://localhost:8083/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 起動完了${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ タイムアウト${NC}"
        exit 1
    fi
    sleep 1
done

# DynamoDB Localのヘルスチェック
echo -n "DynamoDB Local: "
for i in {1..30}; do
    if curl -s http://localhost:8000/shell > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 起動完了${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ タイムアウト${NC}"
        exit 1
    fi
    sleep 1
done

# PostgreSQL Testのヘルスチェック
echo -n "PostgreSQL Test: "
for i in {1..30}; do
    if docker-compose -f docker-compose.local.yml exec -T postgres-test pg_isready -U goal_mandala_user -d goal_mandala_test > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 起動完了${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ タイムアウト${NC}"
        exit 1
    fi
    sleep 1
done

# 5. DynamoDBテーブルの作成
echo -e "\n${YELLOW}5. DynamoDBテーブルの作成${NC}"
npm run dynamodb:create-tables-local || echo -e "${YELLOW}⚠ テーブル作成スクリプトが見つかりません（後で実装）${NC}"

echo -e "\n${GREEN}=== セットアップ完了 ===${NC}"
echo -e "\n次のコマンドでワークフローをテストできます:"
echo -e "  ${YELLOW}npm run workflow:validate${NC}       - State Machine定義の検証"
echo -e "  ${YELLOW}npm run workflow:create-local${NC}   - State Machineの作成"
echo -e "  ${YELLOW}npm run workflow:execute-local${NC}  - ワークフローの実行"
echo -e "  ${YELLOW}npm run test:workflow:happy-path${NC} - 正常系テスト"

