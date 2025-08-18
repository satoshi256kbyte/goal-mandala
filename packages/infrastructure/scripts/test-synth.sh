#!/bin/bash

# CDK synthテストスクリプト

set -e

echo "🏗️  Testing CDK synthesis..."

# 各環境でのsynthテスト
environments=("test" "dev" "stg" "prod")

for env in "${environments[@]}"; do
  echo "📦 Testing synthesis for environment: $env"

  # 環境設定ファイルが存在するかチェック
  if [[ ! -f "config/$env.json" ]]; then
    echo "⚠️  Warning: Configuration file config/$env.json not found, skipping..."
    continue
  fi

  # CDK synthを実行
  npx cdk synth --context environment=$env --quiet > /dev/null

  if [[ $? -eq 0 ]]; then
    echo "✅ Synthesis successful for $env environment"
  else
    echo "❌ Synthesis failed for $env environment"
    exit 1
  fi
done

echo "🎉 All CDK synthesis tests passed!"
