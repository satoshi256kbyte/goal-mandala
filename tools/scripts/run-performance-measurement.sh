#!/bin/bash

# パフォーマンス測定統合スクリプト
# 使用方法: ./run-performance-measurement.sh

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# スクリプトディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# レポート出力先
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
REPORT_DIR=".kiro/specs/2.4.b-test-performance-verification/reports"
REPORT_FILE="${REPORT_DIR}/performance-report-${TIMESTAMP}.md"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}テストパフォーマンス測定開始${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# レポートテンプレート生成
echo -e "${BLUE}レポートテンプレート生成中...${NC}"
"${SCRIPT_DIR}/generate-performance-report.sh" "$REPORT_FILE"
echo ""

# 一時ファイル
TEMP_DIR="${TMPDIR:-/tmp}"
RESULTS_FILE="${TEMP_DIR}/perf_results_$$.txt"
ANALYSIS_FILE="${TEMP_DIR}/perf_analysis_$$.txt"

# 既存の一時ファイルをクリア
> "$RESULTS_FILE"
> "$ANALYSIS_FILE"

# テストコマンド定義
declare -A TEST_COMMANDS=(
  ["test:unit"]="pnpm --filter @goal-mandala/frontend test:unit"
  ["test:integration"]="pnpm --filter @goal-mandala/frontend test:integration"
  ["test:coverage"]="pnpm --filter @goal-mandala/frontend test:coverage"
  ["test:frontend"]="pnpm test:frontend"
)

declare -A TARGET_TIMES=(
  ["test:unit"]=30
  ["test:integration"]=45
  ["test:coverage"]=60
  ["test:frontend"]=60
)

# 各テストコマンドを測定
for cmd_name in "${!TEST_COMMANDS[@]}"; do
  cmd="${TEST_COMMANDS[$cmd_name]}"
  target="${TARGET_TIMES[$cmd_name]}"

  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}測定: ${cmd_name}${NC}"
  echo -e "${BLUE}========================================${NC}"

  # 測定実行
  if "${SCRIPT_DIR}/measure-test-performance.sh" "$cmd" "$target" 3; then
    echo -e "${GREEN}✓ 測定完了${NC}"
  else
    echo -e "${YELLOW}⚠ 測定完了（目標未達成または失敗あり）${NC}"
  fi

  # 結果記録
  "${SCRIPT_DIR}/record-performance-result.sh" \
    "$cmd_name" \
    "$PERF_MIN_TIME" \
    "$PERF_MAX_TIME" \
    "$PERF_AVG_TIME" \
    "$PERF_TARGET_TIME" \
    "$PERF_ACHIEVED" \
    "$PERF_SUCCESS_COUNT" \
    "$PERF_TOTAL_COUNT" >> "$RESULTS_FILE" 2>&1

  # 分析データを追記
  cat "${TEMP_DIR}/perf_analysis_$$.txt" >> "$ANALYSIS_FILE"

  echo ""
done

# レポート完成
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}レポート生成中...${NC}"
echo -e "${BLUE}========================================${NC}"

"${SCRIPT_DIR}/finalize-performance-report.py" "$REPORT_FILE" "$RESULTS_FILE" "$ANALYSIS_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}測定完了！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "レポート: ${YELLOW}${REPORT_FILE}${NC}"
echo ""

# 一時ファイル削除
rm -f "$RESULTS_FILE" "$ANALYSIS_FILE" "${TEMP_DIR}/perf_analysis_$$.txt"
