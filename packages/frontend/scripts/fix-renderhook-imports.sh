#!/bin/bash

FILES=(
  "src/hooks/useAuth.test.tsx"
  "src/hooks/useCharacterCounter.test.ts"
  "src/hooks/useErrorHandler.test.ts"
  "src/hooks/useFormActions.test.ts"
  "src/hooks/useGoalForm.test.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # renderHookを@testing-library/reactからインポートに追加
    if grep -q "from '@testing-library/react'" "$file"; then
      sed -i '' "s/from '@testing-library\/react'/&\nimport { renderHook } from '@testing-library/react'/" "$file" 2>/dev/null || \
      sed -i '' "s/} from '@testing-library\/react'/renderHook, &/" "$file"
      echo "✓ $file"
    fi
  fi
done
