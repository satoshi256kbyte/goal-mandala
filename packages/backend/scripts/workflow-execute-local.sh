#!/bin/bash

# ワークフローのローカル実行スクリプト
# Requirements: 11.5 - ローカル実行スクリプト

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# デフォルト値
INPUT_FILE="test/fixtures/workflow-input.json"
STATE_MACHINE_ARN="arn:aws:states:us-east-1:123456789012:stateMachine:TaskGenerationWorkflow-local"

# 引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --input)
            INPUT_FILE="$2"
            shift 2
            ;;
        --state-machine-arn)
            STATE_MACHINE_ARN="$2"
            shift 2
            ;;
        --help)
            echo "使用方法: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --input FILE              入力ファイル（デフォルト: test/fixtures/workflow-input.json）"
            echo "  --state-machine-arn ARN   State Machine ARN"
            echo "  --help                    このヘルプを表示"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 不明なオプション: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}=== ワークフローのローカル実行 ===${NC}"

# 1. Step Functions Localの確認
echo -e "\n${YELLOW}1. Step Functions Localの確認${NC}"
if ! curl -s http://localhost:8083/ > /dev/null 2>&1; then
    echo -e "${RED}❌ Step Functions Localが起動していません${NC}"
    echo -e "${YELLOW}  以下のコマンドで起動してください:${NC}"
    echo -e "  ${YELLOW}npm run workflow:setup${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step Functions Local起動中${NC}"

# 2. 入力ファイルの確認
echo -e "\n${YELLOW}2. 入力ファイルの確認${NC}"
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ 入力ファイルが見つかりません: $INPUT_FILE${NC}"
    exit 1
fi

if ! jq empty "$INPUT_FILE" 2>/dev/null; then
    echo -e "${RED}❌ 入力ファイルのJSON構文エラー${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 入力ファイルOK: $INPUT_FILE${NC}"

# 3. ワークフローの実行
echo -e "\n${YELLOW}3. ワークフローの実行${NC}"

EXECUTION_NAME="test-execution-$(date +%s)"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLIがインストールされていません${NC}"
    exit 1
fi

EXECUTION_ARN=$(aws stepfunctions start-execution \
    --state-machine-arn "$STATE_MACHINE_ARN" \
    --name "$EXECUTION_NAME" \
    --input file://"$INPUT_FILE" \
    --endpoint-url http://localhost:8083 \
    --query 'executionArn' \
    --output text)

if [ -z "$EXECUTION_ARN" ]; then
    echo -e "${RED}❌ ワークフローの実行に失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}✓ ワークフロー実行開始${NC}"
echo -e "  実行ARN: ${YELLOW}$EXECUTION_ARN${NC}"

# 4. 実行状況の監視
echo -e "\n${YELLOW}4. 実行状況の監視${NC}"

MAX_WAIT=300  # 最大5分待機
WAIT_INTERVAL=2
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(aws stepfunctions describe-execution \
        --execution-arn "$EXECUTION_ARN" \
        --endpoint-url http://localhost:8083 \
        --query 'status' \
        --output text)

    echo -ne "\r  ステータス: ${YELLOW}$STATUS${NC} (経過時間: ${ELAPSED}秒)"

    if [ "$STATUS" = "SUCCEEDED" ]; then
        echo -e "\n${GREEN}✓ ワークフロー実行成功${NC}"
        break
    elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "TIMED_OUT" ] || [ "$STATUS" = "ABORTED" ]; then
        echo -e "\n${RED}❌ ワークフロー実行失敗: $STATUS${NC}"

        # エラー詳細を表示
        echo -e "\n${YELLOW}エラー詳細:${NC}"
        aws stepfunctions describe-execution \
            --execution-arn "$EXECUTION_ARN" \
            --endpoint-url http://localhost:8083 \
            --query '{status: status, error: error, cause: cause}' \
            --output json | jq .

        exit 1
    fi

    sleep $WAIT_INTERVAL
    ELAPSED=$((ELAPSED + WAIT_INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "\n${RED}❌ タイムアウト（${MAX_WAIT}秒）${NC}"
    exit 1
fi

# 5. 実行結果の表示
echo -e "\n${YELLOW}5. 実行結果${NC}"

aws stepfunctions describe-execution \
    --execution-arn "$EXECUTION_ARN" \
    --endpoint-url http://localhost:8083 \
    --query '{status: status, startDate: startDate, stopDate: stopDate, output: output}' \
    --output json | jq .

# 6. 実行履歴の表示
echo -e "\n${YELLOW}6. 実行履歴（最新10件）${NC}"

aws stepfunctions get-execution-history \
    --execution-arn "$EXECUTION_ARN" \
    --max-results 10 \
    --endpoint-url http://localhost:8083 \
    --query 'events[].{timestamp: timestamp, type: type, id: id}' \
    --output table

echo -e "\n${GREEN}=== 実行完了 ===${NC}"
echo -e "\n詳細な実行履歴を確認するには:"
echo -e "  ${YELLOW}aws stepfunctions get-execution-history \\${NC}"
echo -e "    ${YELLOW}--execution-arn $EXECUTION_ARN \\${NC}"
echo -e "    ${YELLOW}--endpoint-url http://localhost:8083${NC}"
