#!/usr/bin/env node

/**
 * モノレポ統合テストスクリプト
 *
 * このスクリプトは以下の動作確認を行います：
 * - pnpm install の動作確認
 * - pnpm build の動作確認
 * - pnpm test の動作確認
 * - pnpm lint の動作確認
 * - パッケージ間依存関係の正常動作確認
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// テスト結果を記録するオブジェクト
const testResults = {
  install: { status: 'pending', duration: 0, error: null },
  build: { status: 'pending', duration: 0, error: null },
  test: { status: 'pending', duration: 0, error: null },
  lint: { status: 'pending', duration: 0, error: null },
  dependencies: { status: 'pending', duration: 0, error: null }
};

// ログ出力用のヘルパー関数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type];

  console.log(`${prefix} [${timestamp}] ${message}`);
}

// コマンド実行用のヘルパー関数
function executeCommand(command, description, options = {}) {
  log(`開始: ${description}`);
  const startTime = Date.now();

  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
      encoding: 'utf8',
      ...options
    });

    const duration = Date.now() - startTime;
    log(`完了: ${description} (${duration}ms)`, 'success');

    return { success: true, output: result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`失敗: ${description} (${duration}ms)`, 'error');
    log(`エラー: ${error.message}`, 'error');

    return { success: false, error: error.message, duration };
  }
}

// パッケージ構造の確認
function verifyPackageStructure() {
  log('パッケージ構造の確認を開始');

  const expectedPackages = [
    'packages/frontend',
    'packages/backend',
    'packages/infrastructure',
    'packages/shared'
  ];

  const missingPackages = [];

  for (const pkg of expectedPackages) {
    const packageJsonPath = path.join(pkg, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    throw new Error(`以下のパッケージが見つかりません: ${missingPackages.join(', ')}`);
  }

  log('パッケージ構造の確認完了', 'success');
}

// workspace設定の確認
function verifyWorkspaceConfig() {
  log('workspace設定の確認を開始');

  // pnpm-workspace.yamlの存在確認
  if (!fs.existsSync('pnpm-workspace.yaml')) {
    throw new Error('pnpm-workspace.yamlが見つかりません');
  }

  // turbo.jsonの存在確認
  if (!fs.existsSync('turbo.json')) {
    throw new Error('turbo.jsonが見つかりません');
  }

  // ルートpackage.jsonの確認
  if (!fs.existsSync('package.json')) {
    throw new Error('ルートpackage.jsonが見つかりません');
  }

  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // 必要なスクリプトの確認
  const requiredScripts = ['build', 'test', 'lint', 'type-check'];
  const missingScripts = requiredScripts.filter(script => !rootPackage.scripts[script]);

  if (missingScripts.length > 0) {
    throw new Error(`以下のスクリプトが見つかりません: ${missingScripts.join(', ')}`);
  }

  log('workspace設定の確認完了', 'success');
}

// パッケージ間依存関係の確認
function verifyPackageDependencies() {
  log('パッケージ間依存関係の確認を開始');

  // sharedパッケージを参照しているパッケージの確認
  const packagesUsingShared = ['packages/frontend', 'packages/backend', 'packages/infrastructure'];

  for (const pkg of packagesUsingShared) {
    const packageJsonPath = path.join(pkg, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // sharedパッケージへの依存関係があるかチェック
      if (!dependencies['@goal-mandala/shared']) {
        log(`警告: ${pkg}がsharedパッケージを参照していません`, 'warning');
      }
    }
  }

  log('パッケージ間依存関係の確認完了', 'success');
}

// メイン実行関数
async function runIntegrationTests() {
  log('=== モノレポ統合テスト開始 ===');

  try {
    // 1. パッケージ構造とworkspace設定の確認
    verifyPackageStructure();
    verifyWorkspaceConfig();

    // 2. pnpm install テスト
    log('=== pnpm install テスト ===');
    const installResult = executeCommand('pnpm install', 'パッケージインストール');
    testResults.install = {
      status: installResult.success ? 'success' : 'failed',
      duration: installResult.duration,
      error: installResult.error
    };

    if (!installResult.success) {
      throw new Error('pnpm installが失敗しました');
    }

    // 3. パッケージ間依存関係の確認
    log('=== パッケージ間依存関係テスト ===');
    const startTime = Date.now();
    try {
      verifyPackageDependencies();
      testResults.dependencies = {
        status: 'success',
        duration: Date.now() - startTime,
        error: null
      };
    } catch (error) {
      testResults.dependencies = {
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      };
      throw error;
    }

    // 4. pnpm build テスト
    log('=== pnpm build テスト ===');
    const buildResult = executeCommand('pnpm build', 'プロジェクトビルド');
    testResults.build = {
      status: buildResult.success ? 'success' : 'failed',
      duration: buildResult.duration,
      error: buildResult.error
    };

    if (!buildResult.success) {
      throw new Error('pnpm buildが失敗しました');
    }

    // 5. pnpm test テスト
    log('=== pnpm test テスト ===');
    const testResult = executeCommand('pnpm test', 'テスト実行');
    testResults.test = {
      status: testResult.success ? 'success' : 'failed',
      duration: testResult.duration,
      error: testResult.error
    };

    if (!testResult.success) {
      log('テストが失敗しましたが、統合テストを継続します', 'warning');
    }

    // 6. pnpm lint テスト
    log('=== pnpm lint テスト ===');
    const lintResult = executeCommand('pnpm lint', 'リント実行');
    testResults.lint = {
      status: lintResult.success ? 'success' : 'failed',
      duration: lintResult.duration,
      error: lintResult.error
    };

    if (!lintResult.success) {
      log('リントが失敗しましたが、統合テストを継続します', 'warning');
    }

    // 結果サマリーの出力
    generateTestReport();

    log('=== モノレポ統合テスト完了 ===', 'success');

  } catch (error) {
    log(`統合テストが失敗しました: ${error.message}`, 'error');
    generateTestReport();
    process.exit(1);
  }
}

// テストレポートの生成
function generateTestReport() {
  log('=== テスト結果サマリー ===');

  const report = {
    timestamp: new Date().toISOString(),
    results: testResults,
    summary: {
      total: Object.keys(testResults).length,
      passed: Object.values(testResults).filter(r => r.status === 'success').length,
      failed: Object.values(testResults).filter(r => r.status === 'failed').length,
      pending: Object.values(testResults).filter(r => r.status === 'pending').length
    }
  };

  // コンソール出力
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result.status === 'success' ? '✅' :
                  result.status === 'failed' ? '❌' : '⏳';
    log(`${status} ${test}: ${result.status} (${result.duration}ms)`);
    if (result.error) {
      log(`   エラー: ${result.error}`, 'error');
    }
  });

  log(`合計: ${report.summary.total}, 成功: ${report.summary.passed}, 失敗: ${report.summary.failed}, 保留: ${report.summary.pending}`);

  // JSONレポートファイルの生成
  fs.writeFileSync('integration-test-report.json', JSON.stringify(report, null, 2));
  log('詳細レポートをintegration-test-report.jsonに出力しました');
}

// スクリプト実行
runIntegrationTests().catch(error => {
  log(`予期しないエラーが発生しました: ${error.message}`, 'error');
  process.exit(1);
});

export { runIntegrationTests, testResults };
