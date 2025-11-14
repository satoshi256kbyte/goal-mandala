#!/bin/bash

# パフォーマンス測定結果記録スクリプト
# 使用方法: ./record-performance-result.sh <test-name> <min-time> <max-time> <avg-time> <target-time> <achieved> <success-count> <total-count>

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 8 ]; then
  echo -e "${RED}エラー: 引数が不足しています${NC}"
  echo "使用方法: $0 <test-name> <min-time> <max-time> <avg-time> <target-time> <achieved> <success-count> <total-count>"
  exit 1
fi

TEST_NAME="$1"
MIN_TIME="$2"
MAX_TIME="$3"
AVG_TIME="$4"
TARGET_TIME="$5"
ACHIEVED="$6"
SUCCESS_COUNT="$7"
TOTAL_COUNT="$8"

# レポートディレクトリ作成
REPORT_DIR=".kiro/specs/2.4.b-test-performance-verification/reports"
mkdir -p "$REPORT_DIR"

# タイムスタンプ生成
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="$REPORT_DIR/performance-result-${TEST_NAME}-${TIMESTAMP}.md"

# 目標達成判定テキスト
if [ "$ACHIEVED" = "true" ]; then
  ACHIEVED_TEXT="✅ 達成"
  ACHIEVED_EMOJI="🎉"
else
  ACHIEVED_TEXT="❌ 未達成"
  ACHIEVED_EMOJI="⚠️"
fi

# レポート生成
cat > "$REPORT_FILE" << EOF
# パフォーマンス測定結果: ${TEST_NAME}

## 測定日時

${TIMESTAMP}

## 測定結果サマリー

| 項目 | 値 |
|------|-----|
| テスト名 | ${TEST_NAME} |
| 最小実行時間 | ${MIN_TIME}秒 |
| 最大実行時間 | ${MAX_TIME}秒 |
| 平均実行時間 | ${AVG_TIME}秒 |
| 目標時間 | ${TARGET_TIME}秒 |
| 目標達成 | ${ACHIEVED_TEXT} |
| 成功回数 | ${SUCCESS_COUNT}/${TOTAL_COUNT} |

## 目標達成状況

${ACHIEVED_EMOJI} **${ACHIEVED_TEXT}**

EOF

# 目標未達成の場合、推奨事項を追加
if [ "$ACHIEVED" = "false" ]; then
  cat >> "$REPORT_FILE" << EOF
## 推奨事項

- 平均実行時間が目標時間を超えています
- テストの最適化を検討してください
- テストの失敗がある場合は、まずテストを修正してください

EOF
fi

# 詳細情報を追加
cat >> "$REPORT_FILE" << EOF
## 詳細情報

### 実行環境

- OS: $(uname -s)
- アーキテクチャ: $(uname -m)
- 測定回数: ${TOTAL_COUNT}回

### 測定コマンド

\`\`\`bash
pnpm --filter @goal-mandala/frontend ${TEST_NAME}
\`\`\`

### 備考

- 測定は複数回実行して平均値を算出しています
- 実行時間にはテストのセットアップ時間も含まれます
- 測定中は他のプロセスを最小限にすることを推奨します

EOF

echo -e "${GREEN}✓ レポートを生成しました: ${REPORT_FILE}${NC}"
echo ""
cat "$REPORT_FILE"

exit 0
