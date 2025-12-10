#!/bin/bash

# Lambda handler の any 型を LambdaEvent/LambdaResult に置換するスクリプト

HANDLERS_DIR="packages/backend/src/workflows/handlers"

# 対象ファイル一覧
FILES=(
  "cancel-workflow.ts"
  "update-progress.ts"
  "aggregate-results.ts"
  "get-status.ts"
  "task-generation.ts"
  "handle-error.ts"
  "start-workflow.ts"
  "save-tasks.ts"
  "task-generation-wrapper.ts"
  "get-actions.ts"
  "create-batches.ts"
  "update-goal-status.ts"
)

for file in "${FILES[@]}"; do
  filepath="$HANDLERS_DIR/$file"

  if [ -f "$filepath" ]; then
    echo "Processing $file..."

    # import文を追加（既に存在する場合はスキップ）
    if ! grep -q "import { LambdaEvent" "$filepath"; then
      # PrismaClient の import の後に追加
      sed -i '' "/import { PrismaClient/a\\
import { LambdaEvent, LambdaResult } from '../types/handler';
" "$filepath"
    fi

    # handler 関数の型を置換
    sed -i '' 's/export async function handler(event: any): Promise<any>/export async function handler(event: LambdaEvent): Promise<LambdaResult>/g' "$filepath"

    # 特定の出力型を持つ場合は LambdaResult に変更しない
    # （既に型定義がある場合はそのまま）

    echo "✓ $file processed"
  else
    echo "✗ $file not found"
  fi
done

echo ""
echo "All files processed. Please review the changes."
