#!/bin/bash

# 最終統合テストスクリプト
# サブ目標・アクション入力フォーム機能の統合テストを実行

set -e

echo "🔗 最終統合テストを開始します..."
echo "========================================"

# 1. 全機能の統合テスト
echo "🧩 全機能統合テスト実行中..."
echo "  - サブ目標編集機能"
echo "  - アクション編集機能"
echo "  - ドラッグ&ドロップ機能"
echo "  - 一括編集機能"
echo "  - 下書き保存機能"
echo "  - API統合"
npm run test:e2e:subgoal-action
echo "✅ 全機能統合テスト完了"
echo ""

# 2. データ整合性の確認
echo "🗄️ データ整合性テスト実行中..."
echo "  - フォームデータの整合性"
echo "  - API レスポンスの整合性"
echo "  - 状態管理の整合性"
npm run test -- --grep "データ整合性"
echo "✅ データ整合性テスト完了"
echo ""

# 3. パフォーマンス要件の確認
echo "⚡ パフォーマンス要件テスト実行中..."
echo "  - レンダリング性能"
echo "  - メモリ使用量"
echo "  - ネットワーク効率"
npm run test:performance
echo "✅ パフォーマンス要件テスト完了"
echo ""

# 4. セキュリティ要件の確認
echo "🔒 セキュリティ要件テスト実行中..."
echo "  - XSS攻撃対策"
echo "  - CSRF攻撃対策"
echo "  - 入力値サニタイズ"
echo "  - 認証・認可"
npm run test -- --grep "セキュリティ"
echo "✅ セキュリティ要件テスト完了"
echo ""

# 5. クロスブラウザテスト（基本）
echo "🌐 クロスブラウザテスト実行中..."
echo "  - Chrome"
echo "  - Firefox"
echo "  - Safari (WebKit)"
npm run test:e2e -- --project=chromium --project=firefox --project=webkit
echo "✅ クロスブラウザテスト完了"
echo ""

# 6. レスポンシブテスト
echo "📱 レスポンシブテスト実行中..."
echo "  - モバイル (375px)"
echo "  - タブレット (768px)"
echo "  - デスクトップ (1024px)"
npm run test:e2e -- --grep "レスポンシブ"
echo "✅ レスポンシブテスト完了"
echo ""

echo "🎉 全ての統合テストが完了しました！"
echo "========================================"
echo "📋 テスト項目:"
echo "  ✅ 全機能の統合テスト"
echo "  ✅ データ整合性の確認"
echo "  ✅ パフォーマンス要件の確認"
echo "  ✅ セキュリティ要件の確認"
echo "  ✅ クロスブラウザテスト"
echo "  ✅ レスポンシブテスト"
echo ""
echo "📊 詳細なテスト結果は test-results/ ディレクトリで確認できます"
echo "📈 パフォーマンスレポートは coverage/ ディレクトリで確認できます"
