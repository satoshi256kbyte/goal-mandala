#!/bin/bash

# State Machine定義の検証スクリプト
# Requirements: 11.4 - State Machine定義検証

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== State Machine定義の検証 ===${NC}"

# State Machine定義ファイルのパス
STATE_MACHINE_FILE="src/workflows/state-machines/task-generation-workflow.json"

# ファイルの存在確認
if [ ! -f "$STATE_MACHINE_FILE" ]; then
    echo -e "${RED}❌ State Machine定義ファイルが見つかりません: $STATE_MACHINE_FILE${NC}"
    exit 1
fi

echo -e "\n${YELLOW}1. JSON構文チェック${NC}"
if jq empty "$STATE_MACHINE_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ JSON構文OK${NC}"
else
    echo -e "${RED}❌ JSON構文エラー${NC}"
    exit 1
fi

echo -e "\n${YELLOW}2. AWS Step Functions構文チェック${NC}"

# Step Functions Localが起動しているか確認
if ! curl -s http://localhost:8083/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Step Functions Localが起動していません${NC}"
    echo -e "${YELLOW}  以下のコマンドで起動してください:${NC}"
    echo -e "  ${YELLOW}npm run workflow:setup${NC}"
    exit 1
fi

# AWS CLIを使用してState Machine定義を検証
if command -v aws &> /dev/null; then
    if aws stepfunctions validate-state-machine-definition \
        --definition file://"$STATE_MACHINE_FILE" \
        --endpoint-url http://localhost:8083 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Step Functions構文OK${NC}"
    else
        echo -e "${RED}❌ Step Functions構文エラー${NC}"
        aws stepfunctions validate-state-machine-definition \
            --definition file://"$STATE_MACHINE_FILE" \
            --endpoint-url http://localhost:8083
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ AWS CLIがインストールされていません${NC}"
    echo -e "${YELLOW}  構文チェックをスキップします${NC}"
fi

echo -e "\n${YELLOW}3. 必須フィールドの確認${NC}"

# 必須フィールドの確認
REQUIRED_FIELDS=("Comment" "StartAt" "States")
for field in "${REQUIRED_FIELDS[@]}"; do
    if jq -e ".$field" "$STATE_MACHINE_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $field フィールドが存在します${NC}"
    else
        echo -e "${RED}❌ $field フィールドが見つかりません${NC}"
        exit 1
    fi
done

echo -e "\n${YELLOW}4. タイムアウト設定の確認${NC}"

# タイムアウト設定の確認
if jq -e '.TimeoutSeconds' "$STATE_MACHINE_FILE" > /dev/null 2>&1; then
    TIMEOUT=$(jq -r '.TimeoutSeconds' "$STATE_MACHINE_FILE")
    echo -e "${GREEN}✓ タイムアウト設定: ${TIMEOUT}秒${NC}"

    # 15分（900秒）以内であることを確認
    if [ "$TIMEOUT" -le 900 ]; then
        echo -e "${GREEN}✓ タイムアウト設定が適切です（≤900秒）${NC}"
    else
        echo -e "${YELLOW}⚠ タイムアウトが15分を超えています: ${TIMEOUT}秒${NC}"
    fi
else
    echo -e "${YELLOW}⚠ タイムアウト設定が見つかりません${NC}"
fi

echo -e "\n${GREEN}=== 検証完了 ===${NC}"
