#!/bin/bash

# Docker Compose設定検証スクリプト

set -e

echo "=== Docker Compose設定検証開始 ==="

# Docker Composeファイルの存在確認
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml が見つかりません"
    exit 1
fi

echo "✅ docker-compose.yml が存在します"

# .env.exampleファイルの存在確認
if [ ! -f ".env.example" ]; then
    echo "❌ .env.example が見つかりません"
    exit 1
fi

echo "✅ .env.example が存在します"

# 必要なディレクトリとファイルの存在確認
required_files=(
    "tools/docker/postgres/init.sql"
    "tools/docker/cognito-local/config.json"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ $file が見つかりません"
        exit 1
    fi
    echo "✅ $file が存在します"
done

# Docker Composeの設定検証（Docker Composeがインストールされている場合）
if command -v docker-compose &> /dev/null; then
    echo "Docker Composeで設定を検証中..."
    if docker-compose config > /dev/null 2>&1; then
        echo "✅ Docker Compose設定は有効です"
    else
        echo "❌ Docker Compose設定にエラーがあります"
        docker-compose config
        exit 1
    fi
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "Docker Composeで設定を検証中..."
    if docker compose config > /dev/null 2>&1; then
        echo "✅ Docker Compose設定は有効です"
    else
        echo "❌ Docker Compose設定にエラーがあります"
        docker compose config
        exit 1
    fi
else
    echo "⚠️  Docker Composeがインストールされていないため、設定の構文検証をスキップします"
fi

# .envファイルの存在確認（任意）
if [ -f ".env" ]; then
    echo "✅ .env ファイルが存在します"
else
    echo "ℹ️  .env ファイルが存在しません（.env.example をコピーして作成してください）"
fi

echo "=== Docker Compose設定検証完了 ==="
echo ""
echo "次のステップ:"
echo "1. .env.example を .env にコピー: cp .env.example .env"
echo "2. 必要に応じて .env ファイルを編集"
echo "3. Docker Compose環境を起動: docker-compose up -d"
