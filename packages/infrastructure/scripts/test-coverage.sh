#!/bin/bash

# テストカバレッジレポート生成スクリプト

set -e

echo "🧪 Running tests with coverage..."

# テストを実行してカバレッジを生成
npx jest --coverage --ci --watchAll=false

echo "📊 Coverage report generated in coverage/ directory"

# カバレッジ閾値をチェック
echo "🎯 Checking coverage thresholds..."

# カバレッジレポートをHTMLで開く（macOSの場合）
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "🌐 Opening coverage report in browser..."
  open coverage/lcov-report/index.html
fi

echo "✅ Test coverage analysis complete!"
