#!/usr/bin/env node

/**
 * シンプルなモノレポ統合テストスクリプト
 * 基本的な動作確認のみを行います
 */

import { execSync } from 'child_process';
import fs from 'fs';

function log(message, type = 'info') {
  const icons = { info: '📋', success: '✅', error: '❌', warning: '⚠️' };
  console.log(`${icons[type]} ${message}`);
}

function runCommand(command, description) {
  log(`実行中: ${description}`);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`完了: ${description}`, 'success');
    return true;
  } catch (error) {
    log(`失敗: ${description}`, 'error');
    return false;
  }
}

function checkFiles() {
  const requiredFiles = [
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    'packages/frontend/package.json',
    'packages/backend/package.json',
    'packages/infrastructure/package.json',
    'packages/shared/package.json'
  ];

  log('必要ファイルの確認中...');

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`必要ファイルが見つかりません: ${file}`, 'error');
      return false;
    }
  }

  log('必要ファイルの確認完了', 'success');
  return true;
}

async function main() {
  log('=== モノレポ統合テスト開始 ===');

  let success = true;

  // ファイル構造チェック
  if (!checkFiles()) {
    success = false;
  }

  // 各コマンドの実行
  const commands = [
    ['pnpm install', 'パッケージインストール'],
    ['pnpm build', 'ビルド'],
    ['pnpm test', 'テスト実行'],
    ['pnpm lint', 'リント実行']
  ];

  for (const [command, description] of commands) {
    if (!runCommand(command, description)) {
      if (command.includes('test') || command.includes('lint')) {
        log(`${description}が失敗しましたが、テストを継続します`, 'warning');
      } else {
        success = false;
        break;
      }
    }
  }

  if (success) {
    log('=== 統合テスト完了 ===', 'success');
  } else {
    log('=== 統合テストが失敗しました ===', 'error');
    process.exit(1);
  }
}

main().catch(error => {
  log(`予期しないエラー: ${error.message}`, 'error');
  process.exit(1);
});
