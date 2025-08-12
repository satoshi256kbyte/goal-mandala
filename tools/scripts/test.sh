#!/bin/bash

# テスト実行スクリプト
# Usage: ./tools/scripts/test.sh [package-name] [--watch] [--coverage]

set -e

PACKAGE_NAME=""
WATCH_MODE=false
COVERAGE_MODE=false

# 引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --coverage)
            COVERAGE_MODE=true
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

echo "🧪 テストを開始します..."

# テストコマンドの構築
TEST_CMD="pnpm"

if [ -n "$PACKAGE_NAME" ]; then
    TEST_CMD="$TEST_CMD --filter $PACKAGE_NAME"
    echo "📦 パッケージ '$PACKAGE_NAME' のテストを実行中..."
else
    echo "📦 全パッケージのテストを実行中..."
fi

TEST_CMD="$TEST_CMD test"

if [ "$WATCH_MODE" = true ]; then
    TEST_CMD="$TEST_CMD --watch"
    echo "👀 ウォッチモードでテストを実行します"
fi

if [ "$COVERAGE_MODE" = true ]; then
    TEST_CMD="$TEST_CMD --coverage"
    echo "📊 カバレッジレポートを生成します"
fi

# テスト実行
eval $TEST_CMD

echo "✅ テストが完了しました！"
