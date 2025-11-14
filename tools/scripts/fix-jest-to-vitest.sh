#!/bin/bash

# jest → vitest への一括変換スクリプト

set -e

echo "=== jest → vitest 変換開始 ==="

# 対象ファイルを取得（統合テストを除く）
FILES=$(find packages/frontend/src -name "*.test.ts" -o -name "*.test.tsx" | grep -v integration | grep -v node_modules)

TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')
CURRENT=0

for file in $FILES; do
  CURRENT=$((CURRENT + 1))

  # jestを使っているファイルのみ処理
  if grep -q "jest\." "$file"; then
    echo "[$CURRENT/$TOTAL] 処理中: $file"

    # 1. import文にvi追加（まだない場合）
    if ! grep -q "import.*vi.*from 'vitest'" "$file"; then
      # @testing-library/reactのimportの後にviのimportを追加
      if grep -q "from '@testing-library/react'" "$file"; then
        sed -i '' "/from '@testing-library\/react'/a\\
import { vi } from 'vitest';
" "$file"
      # それ以外の場合は最初のimportの後に追加
      elif grep -q "^import" "$file"; then
        sed -i '' "1a\\
import { vi } from 'vitest';
" "$file"
      fi
    fi

    # 2. jest.mock → vi.mock
    sed -i '' 's/jest\.mock(/vi.mock(/g' "$file"

    # 3. jest.fn() → vi.fn()
    sed -i '' 's/jest\.fn()/vi.fn(/g' "$file"
    sed -i '' 's/jest\.fn(/vi.fn(/g' "$file"

    # 4. jest.spyOn → vi.spyOn
    sed -i '' 's/jest\.spyOn(/vi.spyOn(/g' "$file"

    # 5. jest.MockedFunction → ReturnType<typeof vi.fn>
    sed -i '' 's/jest\.MockedFunction</ReturnType<typeof vi.fn> \&\& /g' "$file"

    # 6. jest.Mocked → ReturnType<typeof vi.fn>
    sed -i '' 's/jest\.Mocked</ReturnType<typeof vi.fn> \&\& /g' "$file"

    # 7. jest.clearAllMocks → vi.clearAllMocks
    sed -i '' 's/jest\.clearAllMocks()/vi.clearAllMocks()/g' "$file"

    # 8. jest.resetAllMocks → vi.resetAllMocks
    sed -i '' 's/jest\.resetAllMocks()/vi.resetAllMocks()/g' "$file"

    # 9. jest.restoreAllMocks → vi.restoreAllMocks
    sed -i '' 's/jest\.restoreAllMocks()/vi.restoreAllMocks()/g' "$file"

    # 10. jest.useFakeTimers → vi.useFakeTimers
    sed -i '' 's/jest\.useFakeTimers()/vi.useFakeTimers()/g' "$file"

    # 11. jest.useRealTimers → vi.useRealTimers
    sed -i '' 's/jest\.useRealTimers()/vi.useRealTimers()/g' "$file"

    # 12. jest.advanceTimersByTime → vi.advanceTimersByTime
    sed -i '' 's/jest\.advanceTimersByTime(/vi.advanceTimersByTime(/g' "$file"

    # 13. jest.runAllTimers → vi.runAllTimers
    sed -i '' 's/jest\.runAllTimers()/vi.runAllTimers()/g' "$file"

    # 14. jest.runOnlyPendingTimers → vi.runOnlyPendingTimers
    sed -i '' 's/jest\.runOnlyPendingTimers()/vi.runOnlyPendingTimers()/g' "$file"

    echo "  ✓ 変換完了"
  fi
done

echo ""
echo "=== 変換完了 ==="
echo "変換されたファイル数: $(echo "$FILES" | xargs grep -l "vi\." | wc -l | tr -d ' ')"
