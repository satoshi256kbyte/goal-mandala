#!/bin/bash

# テストをバッチで実行してメモリ不足を回避

set -e

BATCH_SIZE=${BATCH_SIZE:-3}
FAILED_TESTS=()
TOTAL_TESTS=0
PASSED_TESTS=0

# テストファイルを取得
TEST_FILES=$(find src -name "*.test.tsx" -o -name "*.test.ts" | \
  grep -v "integration.test" | \
  sort)

# 配列に変換
TEST_ARRAY=($TEST_FILES)
TOTAL_FILES=${#TEST_ARRAY[@]}

echo "総テストファイル数: $TOTAL_FILES"
echo "バッチサイズ: $BATCH_SIZE"
echo ""

# バッチごとに実行
for ((i=0; i<$TOTAL_FILES; i+=$BATCH_SIZE)); do
  BATCH_NUM=$((i/$BATCH_SIZE + 1))
  END=$((i + $BATCH_SIZE))
  if [ $END -gt $TOTAL_FILES ]; then
    END=$TOTAL_FILES
  fi
  
  echo "バッチ $BATCH_NUM: ファイル $((i+1))-$END / $TOTAL_FILES"
  
  # バッチのファイルを取得
  BATCH_FILES="${TEST_ARRAY[@]:$i:$BATCH_SIZE}"
  
  # テスト実行
  if pnpm vitest run $BATCH_FILES --reporter=dot --no-coverage 2>&1; then
    echo "✓ バッチ $BATCH_NUM 成功"
  else
    echo "✗ バッチ $BATCH_NUM 失敗"
    FAILED_TESTS+=("Batch $BATCH_NUM")
  fi
  
  echo ""
  
  # メモリをクリア
  sleep 1
done

# 結果サマリー
echo "========================================="
echo "テスト実行完了"
echo "========================================="

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
  echo "✓ 全てのバッチが成功しました"
  exit 0
else
  echo "✗ 失敗したバッチ: ${#FAILED_TESTS[@]}"
  for batch in "${FAILED_TESTS[@]}"; do
    echo "  - $batch"
  done
  exit 1
fi
