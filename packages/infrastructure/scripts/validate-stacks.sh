#!/bin/bash

# CDKスタック検証スクリプト
# このスクリプトはCDKスタックの定義を検証します

set -e

echo "=========================================="
echo "CDKスタック検証開始"
echo "=========================================="

# 作業ディレクトリの確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo ""
echo "1. TypeScriptコンパイルチェック"
echo "------------------------------------------"
if npm run build; then
    echo "✅ TypeScriptコンパイル成功"
else
    echo "❌ TypeScriptコンパイルエラー"
    echo "エラーを修正してから再実行してください"
    exit 1
fi

echo ""
echo "2. CDK Synthチェック"
echo "------------------------------------------"
if npm run cdk:synth -- --quiet; then
    echo "✅ CDK Synth成功"
else
    echo "❌ CDK Synthエラー"
    echo "スタック定義を確認してください"
    exit 1
fi

echo ""
echo "3. スタック構成の確認"
echo "------------------------------------------"
echo "以下のスタックが定義されています："
npm run cdk:synth -- --quiet | grep "Stack" | grep -v "^  " || true

echo ""
echo "4. 出力ファイルの確認"
echo "------------------------------------------"
if [ -d "cdk.out" ]; then
    echo "✅ cdk.outディレクトリが生成されました"
    echo "生成されたファイル："
    ls -la cdk.out/ | head -10
else
    echo "❌ cdk.outディレクトリが見つかりません"
    exit 1
fi

echo ""
echo "=========================================="
echo "CDKスタック検証完了"
echo "=========================================="
