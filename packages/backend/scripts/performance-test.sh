#!/bin/bash

# バックエンド進捗計算エンジンのパフォーマンステスト実行スクリプト

set -e

echo "🚀 バックエンド進捗計算エンジンのパフォーマンステストを開始します..."

# 環境変数の設定
export NODE_ENV=test
export DATABASE_URL="file:./test-performance.db"

# テストデータベースの初期化
echo "🗄️ テストデータベースを初期化中..."
rm -f ./test-performance.db

# パフォーマンステストの実行
echo "⚡ 進捗計算エンジンのパフォーマンステスト..."
npx jest src/services/__tests__/progress-calculation.performance.test.ts --verbose --detectOpenHandles

# テストデータベースのクリーンアップ
echo "🧹 テストデータベースをクリーンアップ中..."
rm -f ./test-performance.db

# パフォーマンステスト結果のサマリー
echo "✅ パフォーマンステストが完了しました"
echo ""
echo "📋 テスト結果サマリー:"
echo "- 進捗計算エンジン: 大量データでの計算性能"
echo "- キャッシュ性能: ヒット率とメモリ効率"
echo "- データベース操作: クエリ実行時間"
echo "- メモリ管理: リークの検出とリソース管理"
echo ""
echo "🎯 パフォーマンス要件:"
echo "- 小規模データセット(1目標): < 100ms"
echo "- 中規模データセット(5目標): < 500ms"
echo "- 大規模データセット(10目標): < 2000ms"
echo "- キャッシュヒット時: < 10ms"
echo "- メモリ増加: < 10MB"
