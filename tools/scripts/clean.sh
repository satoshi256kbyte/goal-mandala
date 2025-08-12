#!/bin/bash

# クリーンアップスクリプト
# Usage: ./tools/scripts/clean.sh [--deep]

set -e

DEEP_CLEAN=${1:-""}

echo "🧹 クリーンアップを開始します..."

# ビルド成果物の削除
echo "📁 ビルド成果物を削除中..."
find . -name "dist" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name "build" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.tsbuildinfo" -type f -not -path "./node_modules/*" -delete 2>/dev/null || true

# キャッシュファイルの削除
echo "🗂️  キャッシュファイルを削除中..."
find . -name ".turbo" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name ".next" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true

if [ "$DEEP_CLEAN" = "--deep" ]; then
    echo "🔥 ディープクリーンを実行中..."

    # node_modulesの削除
    echo "📦 node_modulesを削除中..."
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

    # lockファイルの削除
    echo "🔒 lockファイルを削除中..."
    rm -f pnpm-lock.yaml

    echo "📦 依存関係を再インストール中..."
    pnpm install
fi

echo "✅ クリーンアップが完了しました！"
