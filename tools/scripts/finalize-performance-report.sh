#!/bin/bash

# パフォーマンスレポート完成スクリプト
# 使用方法: ./finalize-performance-report.sh <report-file> <results-file> <analysis-file>

set -e

# 色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 3 ]; then
  echo "エラー: 引数が不足しています"
  echo "使用方法: $0 <report-file> <results-file> <analysis-file>"
  exit 1
fi

REPORT_FILE="$1"
RESULTS_FILE="$2"
ANALYSIS_FILE="$3"

# ファイル存在チェック
if [ ! -f "$REPORT_FILE" ]; then
  echo "エラー: レポートファイルが見つかりません: $REPORT_FILE"
  exit 1
fi

if [ ! -f "$RESULTS_FILE" ]; then
  echo "エラー: 結果ファイルが見つかりません: $RESULTS_FILE"
  exit 1
fi

if [ ! -f "$ANALYSIS_FILE" ]; then
  echo "エラー: 分析ファイルが見つかりません: $ANALYSIS_FILE"
  exit 1
fi

# 結果を読み込み
RESULTS_CONTENT=$(cat "$RESULTS_FILE")
ANALYSIS_CONTENT=$(cat "$ANALYSIS_FILE")

# 目標達成数をカウント
ACHIEVED_COUNT=$(echo "$RESULTS_CONTENT" | grep -c "✅" || echo "0")
TOTAL_TESTS=$(echo "$RESULTS_CONTENT" | wc -l | tr -d ' ')

# 達成率計算
if [ "$TOTAL_TESTS" -gt 0 ]; then
  ACHIEVEMENT_RATE=$(echo "scale=1; $ACHIEVED_COUNT * 100 / $TOTAL_TESTS" | bc)
else
  ACHIEVEMENT_RATE="0"
fi

# 目標達成状況分析
if [ "$ACHIEVED_COUNT" -eq "$TOTAL_TESTS" ]; then
  ACHIEVEMENT_ANALYSIS="✅ **すべてのテストコマンドが目標時間を達成しました！**

パフォーマンス改善の効果が確認できました。すべてのテストが目標時間内に完了しています。"
elif [ "$ACHIEVED_COUNT" -gt 0 ]; then
  ACHIEVEMENT_ANALYSIS="⚠️ **一部のテストコマンドが目標時間を達成しました**

達成率: ${ACHIEVEMENT_RATE}% (${ACHIEVED_COUNT}/${TOTAL_TESTS})

未達成のテストコマンドについては、さらなる最適化が必要です。"
else
  ACHIEVEMENT_ANALYSIS="❌ **すべてのテストコマンドが目標時間を未達成です**

パフォーマンス改善が必要です。以下の推奨事項を確認してください。"
fi

# パフォーマンス評価
PERFORMANCE_EVALUATION="測定結果から以下の評価を行いました：

- **測定回数**: 各コマンド3回実行
- **測定環境**: ローカル開発環境
- **測定精度**: 平均値を使用して評価

実行時間のばらつきが大きい場合は、測定環境の影響を受けている可能性があります。"

# 推奨事項
if [ "$ACHIEVED_COUNT" -eq "$TOTAL_TESTS" ]; then
  RECOMMENDATIONS="現在のパフォーマンスは良好です。以下の点に注意して維持してください：

1. **定期的な測定**: パフォーマンスの劣化を早期に検出
2. **テストの追加**: 新しいテストを追加する際は実行時間に注意
3. **CI/CD環境での確認**: ローカル環境だけでなくCI/CD環境でも測定"
else
  RECOMMENDATIONS="以下の改善を検討してください：

1. **並列実行の最適化**: maxConcurrencyの調整
2. **テスト分離の見直し**: 不要な分離を削減
3. **タイムアウト設定の調整**: 適切なタイムアウト値の設定
4. **カバレッジ計算の最適化**: 必要な場合のみ実行
5. **テストデータの最適化**: テストデータのサイズを削減"
fi

# 結論
if [ "$ACHIEVED_COUNT" -eq "$TOTAL_TESTS" ]; then
  CONCLUSION="テストパフォーマンス改善は成功しました。すべてのテストコマンドが目標時間を達成しています。

今後も定期的な測定を行い、パフォーマンスの維持に努めてください。"
else
  CONCLUSION="テストパフォーマンス改善は部分的に成功しました。

達成率: **${ACHIEVEMENT_RATE}%** (${ACHIEVED_COUNT}/${TOTAL_TESTS})

未達成のテストコマンドについては、推奨事項を参考にさらなる改善を行ってください。"
fi

# 一時ファイルを使用してレポートを更新
TEMP_REPORT="${REPORT_FILE}.tmp"
cp "$REPORT_FILE" "$TEMP_REPORT"

# プレースホルダーを置換
awk -v results="$RESULTS_CONTENT" '{gsub(/RESULTS_PLACEHOLDER/, results); print}' "$TEMP_REPORT" > "${TEMP_REPORT}.1"
awk -v analysis="$ACHIEVEMENT_ANALYSIS" '{gsub(/ACHIEVEMENT_ANALYSIS_PLACEHOLDER/, analysis); print}' "${TEMP_REPORT}.1" > "${TEMP_REPORT}.2"
awk -v eval="$PERFORMANCE_EVALUATION" '{gsub(/PERFORMANCE_EVALUATION_PLACEHOLDER/, eval); print}' "${TEMP_REPORT}.2" > "${TEMP_REPORT}.3"
awk -v rec="$RECOMMENDATIONS" '{gsub(/RECOMMENDATIONS_PLACEHOLDER/, rec); print}' "${TEMP_REPORT}.3" > "${TEMP_REPORT}.4"
awk -v conc="$CONCLUSION" '{gsub(/CONCLUSION_PLACEHOLDER/, conc); print}' "${TEMP_REPORT}.4" > "${TEMP_REPORT}.5"

# 分析内容を追加
awk -v analysis="$ANALYSIS_CONTENT" '/### 目標達成状況/ {print; print analysis; next} {print}' "${TEMP_REPORT}.5" > "$REPORT_FILE"

# 一時ファイル削除
rm -f "$TEMP_REPORT" "${TEMP_REPORT}".{1,2,3,4,5}

# バックアップファイル削除
rm -f "${REPORT_FILE}.bak"

echo -e "${GREEN}✓ レポートを完成させました: ${REPORT_FILE}${NC}"
echo -e "${YELLOW}達成率: ${ACHIEVEMENT_RATE}% (${ACHIEVED_COUNT}/${TOTAL_TESTS})${NC}"
