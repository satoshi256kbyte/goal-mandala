#!/bin/bash

# コード品質チェックスクリプト
# サブ目標・アクション入力フォーム機能のコード品質を総合的にチェック

set -e

echo "🔍 コード品質チェックを開始します..."
echo "========================================"

# 1. TypeScript型チェック
echo "📝 TypeScript型チェック実行中..."
npm run type-check
echo "✅ TypeScript型チェック完了"
echo ""

# 2. ESLintチェック
echo "🔧 ESLintチェック実行中..."
npm run lint
echo "✅ ESLintチェック完了"
echo ""

# 3. Prettierフォーマットチェック
echo "💅 Prettierフォーマットチェック実行中..."
npm run format:check
echo "✅ Prettierフォーマットチェック完了"
echo ""

# 4. ユニットテスト実行
echo "🧪 ユニットテスト実行中..."
npm run test
echo "✅ ユニットテスト完了"
echo ""

# 5. カバレッジ測定
echo "📊 コードカバレッジ測定中..."
npm run test:coverage
echo "✅ コードカバレッジ測定完了"
echo ""

# 6. パフォーマンステスト実行
echo "⚡ パフォーマンステスト実行中..."
npm run test:performance
echo "✅ パフォーマンステスト完了"
echo ""

# 7. アクセシビリティテスト実行
echo "♿ アクセシビリティテスト実行中..."
npm run test:accessibility:unit
echo "✅ アクセシビリティテスト完了"
echo ""

# 8. ビルドテスト
echo "🏗️ ビルドテスト実行中..."
npm run build
echo "✅ ビルドテスト完了"
echo ""

echo "🎉 全てのコード品質チェックが完了しました！"
echo "========================================"
echo "📋 チェック項目:"
echo "  ✅ TypeScript型チェック"
echo "  ✅ ESLintルール適用"
echo "  ✅ Prettierフォーマット"
echo "  ✅ ユニットテスト"
echo "  ✅ コードカバレッジ (80%以上)"
echo "  ✅ パフォーマンステスト"
echo "  ✅ アクセシビリティテスト"
echo "  ✅ ビルド成功"
echo ""
echo "📊 詳細なカバレッジレポートは coverage/index.html で確認できます"
