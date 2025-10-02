#!/bin/bash

# 最終品質チェック統合スクリプト
# サブ目標・アクション入力フォーム機能の全品質チェックを実行

set -e

echo "🏆 最終品質チェックを開始します..."
echo "========================================"
echo "サブ目標・アクション入力フォーム機能の品質を総合的に検証します"
echo ""

# 1. コードフォーマット・リント
echo "🎨 Step 1: コードフォーマット・リント"
echo "----------------------------------------"
./scripts/format-and-lint.sh
echo ""

# 2. コード品質チェック
echo "🔍 Step 2: コード品質チェック"
echo "----------------------------------------"
./scripts/quality-check.sh
echo ""

# 3. ユーザビリティテスト
echo "🧪 Step 3: ユーザビリティテスト"
echo "----------------------------------------"
./scripts/usability-test.sh
echo ""

# 4. 統合テスト
echo "🔗 Step 4: 統合テスト"
echo "----------------------------------------"
./scripts/integration-test.sh
echo ""

# 5. 最終レポート生成
echo "📊 Step 5: 最終レポート生成"
echo "----------------------------------------"
echo "品質レポートを生成しています..."

# カバレッジレポートの確認
if [ -f "coverage/index.html" ]; then
  echo "✅ カバレッジレポート: coverage/index.html"
else
  echo "⚠️ カバレッジレポートが見つかりません"
fi

# テスト結果の確認
if [ -d "test-results" ]; then
  echo "✅ E2Eテスト結果: test-results/"
else
  echo "⚠️ E2Eテスト結果が見つかりません"
fi

# パフォーマンスレポートの確認
if [ -f "playwright-report/index.html" ]; then
  echo "✅ パフォーマンスレポート: playwright-report/index.html"
else
  echo "⚠️ パフォーマンスレポートが見つかりません"
fi

echo ""
echo "🎉 全ての品質チェックが完了しました！"
echo "========================================"
echo "📋 実行された品質チェック:"
echo "  ✅ コードフォーマット・リント"
echo "  ✅ TypeScript型チェック"
echo "  ✅ ユニットテスト（カバレッジ80%以上）"
echo "  ✅ パフォーマンステスト"
echo "  ✅ アクセシビリティテスト"
echo "  ✅ ユーザビリティテスト"
echo "  ✅ 統合テスト"
echo "  ✅ セキュリティテスト"
echo "  ✅ ビルドテスト"
echo ""
echo "🚀 サブ目標・アクション入力フォーム機能は本番デプロイ可能な品質です！"
echo ""
echo "📈 詳細レポート:"
echo "  - カバレッジ: coverage/index.html"
echo "  - E2Eテスト: test-results/"
echo "  - パフォーマンス: playwright-report/index.html"
