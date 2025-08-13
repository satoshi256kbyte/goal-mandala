#!/usr/bin/env node

/**
 * 環境変数検証CLIツール
 *
 * Node.js環境で環境変数の検証を行います。
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートに移動
process.chdir(path.join(__dirname, '../..'));

// .envファイルが存在する場合は読み込み
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// 簡易的な環境変数検証（TypeScriptコンパイルなしで実行）
function validateBasicEnv() {
  console.log('🔍 環境変数検証を開始します...\n');

  const requiredVars = [
    'DATABASE_URL',
    'POSTGRES_PASSWORD',
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL',
    'AWS_REGION',
    'JWT_SECRET',
  ];

  const missingVars = [];
  const warnings = [];

  // 必須変数のチェック
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.log('❌ 以下の必須環境変数が設定されていません:');
    missingVars.forEach(varName => {
      console.log(`  - ${varName}`);
    });
    return false;
  }

  // 基本的な値のチェック
  if (process.env.JWT_SECRET === 'your_jwt_secret_key_here_change_in_production') {
    warnings.push('JWT_SECRETがデフォルト値のままです');
  }

  if (process.env.POSTGRES_PASSWORD === 'your_secure_password_here') {
    warnings.push('POSTGRES_PASSWORDがデフォルト値のままです');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRETが短すぎます（32文字以上を推奨）');
  }

  // PORT番号のチェック
  const port = parseInt(process.env.PORT || '0');
  if (isNaN(port) || port < 1 || port > 65535) {
    warnings.push('PORTの値が不正です');
  }

  // NODE_ENVのチェック
  const validEnvs = ['development', 'test', 'production'];
  if (!validEnvs.includes(process.env.NODE_ENV || '')) {
    warnings.push('NODE_ENVの値が標準的ではありません');
  }

  // 結果表示
  console.log('✅ 必須環境変数はすべて設定されています');

  if (warnings.length > 0) {
    console.log('\n⚠️  警告:');
    warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  console.log('\n📋 設定値サマリー:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`PORT: ${process.env.PORT}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  console.log(`AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '設定済み' : '未設定'}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '設定済み' : '未設定'}`);

  return true;
}

try {
  const success = validateBasicEnv();

  if (success) {
    console.log('\n✅ 環境変数検証が完了しました。');
  } else {
    console.log('\n💡 ヒント:');
    console.log('1. .env.exampleファイルをコピーして.envファイルを作成してください:');
    console.log('   cp .env.example .env');
    console.log('2. .envファイル内の値を適切に設定してください');
    console.log('3. 特にJWT_SECRETやPOSTGRES_PASSWORDはデフォルト値から変更してください');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ 環境変数検証でエラーが発生しました:');
  console.error(error.message);
  process.exit(1);
}
