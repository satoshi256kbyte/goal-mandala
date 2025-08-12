#!/bin/bash

# リント実行スクリプト
# Usage: ./tools/scripts/lint.sh [--fix] [package-name]

set -e

FIX_MODE=false
PACKAGE_NAME=""

# 引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_MODE=true
            shift
            ;;
        *)
            if [ -z "$PACKAGE_NAME" ]; then
                PACKAGE_NAME=$1
            fi
            shift
            ;;
    esac
done

echo "🔍 リントチェックを開始します..."

# リントコマンドの構築
LINT_CMD="pnpm"

if [ -n "$PACKAGE_NAME" ]; then
    LINT_CMD="$LINT_CMD --filter $PACKAGE_NAME"
    echo "📦 パッケージ '$PACKAGE_NAME' のリントを実行中..."
else
    echo "📦 全パッケージのリントを実行中..."
fi

if [ "$FIX_MODE" = true ]; then
    LINT_CMD="$LINT_CMD lint:fix"
    echo "🔧 自動修正モードでリントを実行します"
else
    LINT_CMD="$LINT_CMD lint"
fi

# リント実行
eval $LINT_CMD

echo "✅ リントチェックが完了しました！"
