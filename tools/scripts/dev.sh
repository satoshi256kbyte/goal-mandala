#!/bin/bash

# 開発サーバー起動スクリプト
# Usage: ./tools/scripts/dev.sh [package-name]

set -e

PACKAGE_NAME=${1:-""}

echo "🚀 開発サーバーを起動します..."

if [ -n "$PACKAGE_NAME" ]; then
    echo "📦 パッケージ '$PACKAGE_NAME' の開発サーバーを起動中..."
    pnpm --filter "$PACKAGE_NAME" dev
else
    echo "📦 全パッケージの開発サーバーを起動中..."
    pnpm dev
fi
