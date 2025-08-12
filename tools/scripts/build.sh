#!/bin/bash

# ビルドスクリプト
# Usage: ./tools/scripts/build.sh [package-name]

set -e

PACKAGE_NAME=${1:-""}

echo "🔨 ビルドを開始します..."

if [ -n "$PACKAGE_NAME" ]; then
    echo "📦 パッケージ '$PACKAGE_NAME' をビルド中..."
    pnpm --filter "$PACKAGE_NAME" build
else
    echo "📦 全パッケージをビルド中..."
    pnpm build
fi

echo "✅ ビルドが完了しました！"
