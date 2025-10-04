#!/bin/bash

# 進捗表示機能のパフォーマンステスト実行スクリプト

set -e

echo "🚀 進捗表示機能パフォーマンステストを開始します..."

# 環境変数の設定
export NODE_ENV=test
export VITEST_PERFORMANCE_TEST=true

# パフォーマンステストの実行
echo "📊 進捗表示コンポーネントのパフォーマンステスト..."
npx vitest --run src/test/performance/progress-display.performance.test.tsx --reporter=verbose

echo "📈 進捗履歴表示のパフォーマンステスト..."
npx vitest --run src/test/performance/progress-history.performance.test.tsx --reporter=verbose

# 既存のパフォーマンステストも実行
echo "🔄 既存のパフォーマンステスト..."
npx vitest --run src/test/performance.test.tsx --reporter=verbose

# パフォーマンステスト結果のサマリー
echo "✅ パフォーマンステストが完了しました"
echo ""
echo "📋 テスト結果サマリー:"
echo "- 進捗表示コンポーネント: 大量データでの表示・アニメーション性能"
echo "- 進捗履歴表示: チャート表示・インタラクション性能"
echo "- メモリ使用量: リークの検出とリソース管理"
echo "- レスポンシブ性能: 画面サイズ変更時の対応"
echo ""
echo "🎯 パフォーマンス要件:"
echo "- プログレスバー100個: < 500ms"
echo "- 進捗履歴30日分: < 1000ms"
echo "- アニメーション: 60FPS以上"
echo "- メモリ増加: < 10MB"
