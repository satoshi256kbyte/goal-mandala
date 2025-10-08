#!/bin/bash

# CDK Synth テストスクリプト
# ネットワークエラーを回避するため、ローカルでビルド済みのCDKを使用

set -e

echo "=========================================="
echo "CDK Synth テスト開始"
echo "=========================================="

# 1. TypeScriptビルドの確認
echo ""
echo "1. TypeScriptビルド確認"
echo "------------------------------------------"
npm run build
echo "✅ TypeScriptビルド成功"

# 2. CDKスタック定義の検証（構文チェック）
echo ""
echo "2. CDKスタック定義の検証"
echo "------------------------------------------"
node -e "
const { VpcStack, DatabaseStack, CognitoStack, ApiStack, FrontendStack } = require('./dist/index.js');
console.log('✅ スタック定義のインポート成功');
console.log('  - VpcStack:', typeof VpcStack);
console.log('  - DatabaseStack:', typeof DatabaseStack);
console.log('  - CognitoStack:', typeof CognitoStack);
console.log('  - ApiStack:', typeof ApiStack);
console.log('  - FrontendStack:', typeof FrontendStack);
"

# 3. 環境設定の検証
echo ""
echo "3. 環境設定の検証"
echo "------------------------------------------"
node -e "
const { getEnvironmentConfig } = require('./dist/config/environment.js');
const environments = ['local', 'dev', 'stg', 'prod'];
environments.forEach(env => {
  try {
    const config = getEnvironmentConfig(env);
    console.log(\`✅ \${env}環境の設定読み込み成功\`);
  } catch (error) {
    console.error(\`❌ \${env}環境の設定読み込み失敗:\`, error.message);
    process.exit(1);
  }
});
"

echo ""
echo "=========================================="
echo "CDK Synth テスト完了"
echo "=========================================="
echo ""
echo "注意: 実際のCDK synthの実行にはAWS認証情報とネットワーク接続が必要です。"
echo "本テストでは、スタック定義の構文とTypeScriptコンパイルを検証しました。"
