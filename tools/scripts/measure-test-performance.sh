#!/bin/bash

# パフォーマンス測定スクリプト
# 使用方法: ./measure-test-performance.sh <test-command> <target-time-seconds> [iterations]

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 2 ]; then
  echo -e "${RED}エラー: 引数が不足しています${NC}"
  echo "使用方法: $0 <test-command> <target-time-seconds> [iterations]"
  echo "例: $0 'pnpm --filter @goal-mandala/frontend test:unit' 30 3"
  exit 1
fi

TEST_COMMAND="$1"
TARGET_TIME="$2"
ITERATIONS="${3:-3}"  # デフォルト3回

# 結果保存用配列
declare -a EXECUTION_TIMES
declare -a EXIT_CODES

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}パフォーマンス測定開始${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "テストコマンド: ${YELLOW}${TEST_COMMAND}${NC}"
echo -e "目標時間: ${YELLOW}${TARGET_TIME}秒${NC}"
echo -e "実行回数: ${YELLOW}${ITERATIONS}回${NC}"
echo ""

# 測定実行
for i in $(seq 1 $ITERATIONS); do
  echo -e "${BLUE}[${i}/${ITERATIONS}] 測定実行中...${NC}"

  # 時間測定
  START_TIME=$(date +%s.%N)

  # テストコマンド実行（進捗表示付き）
  echo -e "${YELLOW}実行中...${NC}"
  if eval "$TEST_COMMAND" 2>&1 | while IFS= read -r line; do
    # テスト実行の進捗を表示（最後の行のみ上書き表示）
    echo -ne "\r${line:0:100}                    "
  done; then
    EXIT_CODE=${PIPESTATUS[0]}
  else
    EXIT_CODE=$?
  fi
  echo "" # 改行

  END_TIME=$(date +%s.%N)

  # 実行時間計算（秒）
  EXECUTION_TIME=$(echo "$END_TIME - $START_TIME" | bc)

  # 結果保存
  EXECUTION_TIMES+=("$EXECUTION_TIME")
  EXIT_CODES+=("$EXIT_CODE")

  # 結果表示
  if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ 成功${NC} - 実行時間: ${EXECUTION_TIME}秒"
  else
    echo -e "${RED}✗ 失敗${NC} (終了コード: ${EXIT_CODE}) - 実行時間: ${EXECUTION_TIME}秒"
  fi

  echo ""
done

# 統計計算
MIN_TIME=$(printf '%s\n' "${EXECUTION_TIMES[@]}" | sort -n | head -1)
MAX_TIME=$(printf '%s\n' "${EXECUTION_TIMES[@]}" | sort -n | tail -1)

# 平均時間計算
SUM=0
for time in "${EXECUTION_TIMES[@]}"; do
  SUM=$(echo "$SUM + $time" | bc)
done
AVG_TIME=$(echo "scale=3; $SUM / $ITERATIONS" | bc)

# 成功回数カウント
SUCCESS_COUNT=0
for code in "${EXIT_CODES[@]}"; do
  if [ $code -eq 0 ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  fi
done

# 目標達成判定
if (( $(echo "$AVG_TIME <= $TARGET_TIME" | bc -l) )); then
  ACHIEVED=true
  ACHIEVED_TEXT="${GREEN}達成${NC}"
else
  ACHIEVED=false
  ACHIEVED_TEXT="${RED}未達成${NC}"
fi

# 結果サマリー表示
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}測定結果サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "最小実行時間: ${YELLOW}${MIN_TIME}秒${NC}"
echo -e "最大実行時間: ${YELLOW}${MAX_TIME}秒${NC}"
echo -e "平均実行時間: ${YELLOW}${AVG_TIME}秒${NC}"
echo -e "目標時間: ${YELLOW}${TARGET_TIME}秒${NC}"
echo -e "目標達成: ${ACHIEVED_TEXT}"
echo -e "成功回数: ${YELLOW}${SUCCESS_COUNT}/${ITERATIONS}${NC}"
echo ""

# 結果をグローバル変数として保存（他のスクリプトから参照可能）
export PERF_MIN_TIME="$MIN_TIME"
export PERF_MAX_TIME="$MAX_TIME"
export PERF_AVG_TIME="$AVG_TIME"
export PERF_TARGET_TIME="$TARGET_TIME"
export PERF_ACHIEVED="$ACHIEVED"
export PERF_SUCCESS_COUNT="$SUCCESS_COUNT"
export PERF_TOTAL_COUNT="$ITERATIONS"

# 終了コード決定（すべて成功かつ目標達成なら0、それ以外は1）
if [ $SUCCESS_COUNT -eq $ITERATIONS ] && [ "$ACHIEVED" = true ]; then
  exit 0
else
  exit 1
fi
