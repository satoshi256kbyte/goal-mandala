#!/bin/bash

# 非Reactテストファイルからcleanup()を削除するスクリプト

# 対象ファイルリスト（非Reactコンポーネントのテスト）
FILES=(
  "src/services/__tests__/progress-data-validator.test.ts"
  "src/services/__tests__/progress-history-service.test.ts"
  "src/services/__tests__/progress-history-analysis.test.ts"
  "src/services/__tests__/progress-security-manager.test.ts"
  "src/utils/__tests__/error-classifier.test.ts"
  "src/utils/__tests__/security.test.ts"
  "src/utils/__tests__/progress-colors.test.ts"
  "src/utils/authUtils.test.ts"
  "src/utils/validation.test.ts"
  "src/utils/sanitize.test.ts"
)

MODIFIED=0
SKIPPED=0
ERRORS=0

echo "========================================="
echo "非Reactテストファイルのcleanup()削除開始"
echo "========================================="

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  スキップ: $file (ファイルが存在しません)"
    ((SKIPPED++))
    continue
  fi

  # cleanup()の行を削除
  if grep -q "cleanup();" "$file"; then
    sed -i '' '/cleanup();/d' "$file"
    echo "✓ 修正: $file"
    ((MODIFIED++))
  else
    echo "⊘ スキップ: $file (cleanup()が見つかりません)"
    ((SKIPPED++))
  fi
done

echo ""
echo "========================================="
echo "Cleanup削除完了"
echo "========================================="
echo "修正: $MODIFIED ファイル"
echo "スキップ: $SKIPPED ファイル"
echo "エラー: $ERRORS ファイル"
