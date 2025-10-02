#!/bin/bash

# コードフォーマット・リント実行スクリプト
# サブ目標・アクション入力フォーム機能のコード品質を最終確認

set -e

echo "🎨 コードフォーマット・リント実行を開始します..."
echo "========================================"

# 1. Prettierによるコードフォーマット実行
echo "💅 Prettierによるコードフォーマット実行中..."
echo "  - TypeScript/JavaScript ファイル"
echo "  - CSS/SCSS ファイル"
echo "  - JSON ファイル"
echo "  - Markdown ファイル"
npm run format
echo "✅ コードフォーマット完了"
echo ""

# 2. ESLintによるリントチェック実行
echo "🔧 ESLintによるリントチェック実行中..."
echo "  - TypeScript ルール"
echo "  - React ルール"
echo "  - React Hooks ルール"
echo "  - アクセシビリティルール"
npm run lint
echo "✅ リントチェック完了"
echo ""

# 3. エラー・警告の確認
echo "⚠️ エラー・警告の確認中..."
echo "  - TypeScript エラー"
echo "  - ESLint 警告"
echo "  - 未使用変数"
echo "  - 型安全性"

# TypeScriptエラーチェック
echo "📝 TypeScript型チェック実行中..."
npm run type-check || {
  echo "❌ TypeScriptエラーが検出されました"
  echo "修正が必要なエラーがあります。上記のエラーを確認してください。"
  exit 1
}
echo "✅ TypeScript型チェック完了"
echo ""

# 4. コミット前の最終確認
echo "🔍 コミット前の最終確認中..."
echo "  - フォーマット済みファイルの確認"
echo "  - リント警告の確認"
echo "  - 型エラーの確認"

# フォーマットチェック
echo "💅 フォーマットチェック実行中..."
npm run format:check || {
  echo "❌ フォーマットされていないファイルが検出されました"
  echo "npm run format を実行してフォーマットしてください。"
  exit 1
}
echo "✅ フォーマットチェック完了"
echo ""

# ESLint警告数チェック
echo "🔧 ESLint警告数チェック中..."
LINT_OUTPUT=$(npm run lint 2>&1 || true)
WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -c "warning" || true)
ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "error" || true)

if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "❌ ESLintエラーが $ERROR_COUNT 個検出されました"
  echo "$LINT_OUTPUT"
  exit 1
fi

if [ "$WARNING_COUNT" -gt 30 ]; then
  echo "⚠️ ESLint警告が $WARNING_COUNT 個検出されました（上限: 30個）"
  echo "警告を減らしてください。"
  echo "$LINT_OUTPUT"
  exit 1
fi

echo "✅ ESLint警告数チェック完了（警告: $WARNING_COUNT 個）"
echo ""

# 5. 最終ビルドテスト
echo "🏗️ 最終ビルドテスト実行中..."
npm run build
echo "✅ 最終ビルドテスト完了"
echo ""

echo "🎉 全てのコードフォーマット・リントチェックが完了しました！"
echo "========================================"
echo "📋 実行項目:"
echo "  ✅ Prettierによるコードフォーマット"
echo "  ✅ ESLintによるリントチェック"
echo "  ✅ TypeScript型チェック"
echo "  ✅ フォーマットチェック"
echo "  ✅ ESLint警告数チェック（$WARNING_COUNT/30個）"
echo "  ✅ 最終ビルドテスト"
echo ""
echo "🚀 コードはコミット可能な状態です！"
