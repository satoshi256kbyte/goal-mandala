#!/bin/bash

# 全テストファイルにcleanup処理を追加

set -e

MODIFIED=0
SKIPPED=0
ERRORS=0

# テストファイルを取得
TEST_FILES=$(find src -name "*.test.tsx" -o -name "*.test.ts" | grep -v "integration.test" | sort)

for file in $TEST_FILES; do
  # afterEachが既に存在する場合はスキップ
  if grep -q "afterEach" "$file"; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # バックアップ作成
  cp "$file" "$file.bak"

  # cleanupをインポートに追加
  if grep -q "from '@testing-library/react'" "$file"; then
    if ! grep -q "cleanup" "$file"; then
      sed -i '' "s/{ render/{ render, cleanup/" "$file"
    fi
  fi

  # vi, afterEachをインポートに追加
  if grep -q "from 'vitest'" "$file"; then
    # 既存のvitestインポートにafterEachを追加
    if ! grep -q "afterEach" "$file"; then
      sed -i '' "s/} from 'vitest'/, afterEach } from 'vitest'/" "$file"
    fi
    if ! grep -q "vi" "$file"; then
      sed -i '' "s/} from 'vitest'/, vi } from 'vitest'/" "$file"
    fi
  fi

  # 最初のdescribeの前にafterEachを追加
  awk '
    BEGIN { added = 0 }
    /^describe\(/ && added == 0 {
      print ""
      print "afterEach(() => {"
      print "  cleanup();"
      print "  vi.clearAllMocks();"
      print "  vi.clearAllTimers();"
      print "});"
      print ""
      added = 1
    }
    { print }
  ' "$file" > "$file.tmp"

  # 変更があったか確認
  if ! diff -q "$file" "$file.tmp" > /dev/null 2>&1; then
    mv "$file.tmp" "$file"
    rm "$file.bak"
    MODIFIED=$((MODIFIED + 1))
    echo "✓ Modified: $file"
  else
    mv "$file.bak" "$file"
    rm "$file.tmp"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "========================================="
echo "Cleanup追加完了"
echo "========================================="
echo "修正: $MODIFIED ファイル"
echo "スキップ: $SKIPPED ファイル"
echo "エラー: $ERRORS ファイル"
