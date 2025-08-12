#!/bin/bash

# 開発環境セットアップスクリプト
# Usage: ./tools/scripts/setup.sh

set -e

echo "🚀 開発環境のセットアップを開始します..."

# Node.jsバージョンチェック
echo "📋 Node.jsバージョンを確認中..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION が検出されました"
else
    echo "❌ Node.jsが見つかりません。asdfを使用してNode.js 23.10.0をインストールしてください。"
    exit 1
fi

# pnpmの確認・インストール
echo "📋 pnpmを確認中..."
if ! command -v pnpm &> /dev/null; then
    echo "📦 pnpmをインストール中..."
    npm install -g pnpm
else
    echo "✅ pnpmが既にインストールされています"
fi

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
pnpm install

# 環境変数ファイルの作成
if [ ! -f .env ]; then
    echo "📝 .envファイルを作成中..."
    cp .env.example .env
    echo "✅ .env.exampleから.envファイルを作成しました"
    echo "⚠️  必要に応じて.envファイルを編集してください"
fi

echo "🎉 開発環境のセットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. .envファイルを確認・編集"
echo "2. pnpm dev でローカル開発サーバーを起動"
