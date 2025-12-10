#!/bin/bash

# State Machineのローカル作成スクリプト
# Requirements: 11.5 - ローカル実行スクリプト

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== State Machineのローカル作成 ===${NC}"

# State Machine定義ファイルのパス
STATE_MACHINE_FILE="src/workflows/state-machines/task-generation-workflow.json"
STATE_MACHINE_NAME="TaskGenerationWorkflow-local"
ROLE_ARN="arn:aws:iam::123456789012:role/DummyRole"

# 1. Step Functions Localの確認
echo -e "\n${YELLOW}1. Step Functions Localの確認${NC}"
if ! curl -s http://localhost:8083/ > /dev/null 2>&1; then
    echo -e "${RED}❌ Step Functions Localが起動していません${NC}"
    echo -e "${YELLOW}  以下のコマンドで起動してください:${NC}"
    echo -e "  ${YELLOW}npm run workflow:setup${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step Functions Local起動中${NC}"

# 2. State Machine定義ファイルの確認
echo -e "\n${YELLOW}2. State Machine定義ファイルの確認${NC}"
if [ ! -f "$STATE_MACHINE_FILE" ]; then
    echo -e "${RED}❌ State Machine定義ファイルが見つかりません: $STATE_MACHINE_FILE${NC}"
    exit 1
fi

if ! jq empty "$STATE_MACHINE_FILE" 2>/dev/null; then
    echo -e "${RED}❌ State Machine定義ファイルのJSON構文エラー${NC}"
    exit 1
fi
echo -e "${GREEN}✓ State Machine定義ファイルOK${NC}"

# 3. 既存のState Machineを削除（存在する場合）
echo -e "\n${YELLOW}3. 既存のState Machineの確認${NC}"

if command -v aws &> /dev/null; then
    EXISTING_ARN=$(aws stepfunctions list-state-machines \
        --endpoint-url http://localhost:8083 \
        --query "stateMachines[?name=='$STATE_MACHINE_NAME'].stateMachineArn" \
        --output text 2>/dev/null || echo "")

    if [ -n "$EXISTING_ARN" ]; then
        echo -e "${YELLOW}⚠ 既存のState Machineを削除します: $EXISTING_ARN${NC}"
        aws stepfunctions delete-state-machine \
            --state-machine-arn "$EXISTING_ARN" \
            --endpoint-url http://localhost:8083 > /dev/null 2>&1 || true
        sleep 1
    fi
else
    echo -e "${RED}❌ AWS CLIがインストールされていません${NC}"
    exit 1
fi

# 4. State Machineの作成
echo -e "\n${YELLOW}4. State Machineの作成${NC}"

STATE_MACHINE_ARN=$(aws stepfunctions create-state-machine \
    --name "$STATE_MACHINE_NAME" \
    --definition file://"$STATE_MACHINE_FILE" \
    --role-arn "$ROLE_ARN" \
    --endpoint-url http://localhost:8083 \
    --query 'stateMachineArn' \
    --output text)

if [ -z "$STATE_MACHINE_ARN" ]; then
    echo -e "${RED}❌ State Machineの作成に失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}✓ State Machine作成成功${NC}"
echo -e "  ARN: ${YELLOW}$STATE_MACHINE_ARN${NC}"

# 5. State Machineの詳細を表示
echo -e "\n${YELLOW}5. State Machine詳細${NC}"

aws stepfunctions describe-state-machine \
    --state-machine-arn "$STATE_MACHINE_ARN" \
    --endpoint-url http://localhost:8083 \
    --query '{name: name, status: status, creationDate: creationDate}' \
    --output json | jq .

echo -e "\n${GREEN}=== 作成完了 ===${NC}"
echo -e "\n次のコマンドでワークフローを実行できます:"
echo -e "  ${YELLOW}npm run workflow:execute-local${NC}"
echo -e "\nまたは直接実行:"
echo -e "  ${YELLOW}aws stepfunctions start-execution \\${NC}"
echo -e "    ${YELLOW}--state-machine-arn $STATE_MACHINE_ARN \\${NC}"
echo -e "    ${YELLOW}--name test-execution-\$(date +%s) \\${NC}"
echo -e "    ${YELLOW}--input file://test/fixtures/workflow-input.json \\${NC}"
echo -e "    ${YELLOW}--endpoint-url http://localhost:8083${NC}"
