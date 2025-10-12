#!/usr/bin/env node

/**
 * 完全版モノレポ統合テストスクリプト
 *
 * このスクリプトは以下の動作確認を行います：
 * - モノレポ構造の検証
 * - pnpm install の動作確認
 * - pnpm build の動作確認
 * - pnpm test の動作確認
 * - pnpm lint の動作確認
 * - パッケージ間依存関係の正常動作確認
 * - TypeScript設定の検証
 * - turbo設定の検証
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// テスト結果を記録するオブジェクト
const testResults = {
  structure: { status: 'pending', duration: 0, error: null, details: [] },
  workspace: { status: 'pending', duration: 0, error: null, details: [] },
  install: { status: 'pending', duration: 0, error: null, details: [] },
  build: { status: 'pending', duration: 0, error: null, details: [] },
  test: { status: 'pending', duration: 0, error: null, details: [] },
  lint: { status: 'pending', duration: 0, error: null, details: [] },
  dependencies: { status: 'pending', duration: 0, error: null, details: [] },
  typescript: { status: 'pending', duration: 0, error: null, details: [] },
  turbo: { status: 'pending', duration: 0, error: null, details: [] }
};

// ログ出力用のヘルパー関数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
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
    if (!options.silent) {
      log(`エラー: ${error.message}`, 'error');
    }

    return { success: false, error: error.message, duration };
  }
}

// パッケージ構造の詳細検証
function verifyPackageStructure() {
  log('パッケージ構造の詳細検証を開始');
  const startTime = Date.now();
  const details = [];

  try {
    const expectedPackages = [
      { path: 'packages/frontend', name: '@goal-mandala/frontend' },
      { path: 'packages/backend', name: '@goal-mandala/backend' },
      { path: 'packages/infrastructure', name: '@goal-mandala/infrastructure' },
      { path: 'packages/shared', name: '@goal-mandala/shared' }
    ];

    const missingPackages = [];
    const packageDetails = [];

    for (const pkg of expectedPackages) {
      const packageJsonPath = path.join(pkg.path, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        missingPackages.push(pkg.path);
        details.push(`❌ ${pkg.path}/package.json が見つかりません`);
      } else {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageDetails.push({
          path: pkg.path,
          name: packageJson.name,
          version: packageJson.version,
          expectedName: pkg.name
        });

        if (packageJson.name === pkg.name) {
          details.push(`✅ ${pkg.path}: ${packageJson.name} v${packageJson.version}`);
        } else {
          details.push(`⚠️ ${pkg.path}: パッケージ名が期待値と異なります (期待: ${pkg.name}, 実際: ${packageJson.name})`);
        }
      }
    }

    if (missingPackages.length > 0) {
      throw new Error(`以下のパッケージが見つかりません: ${missingPackages.join(', ')}`);
    }

    // ツールディレクトリの確認
    const toolsDir = 'tools';
    if (fs.existsSync(toolsDir)) {
      const toolsContents = fs.readdirSync(toolsDir);
      details.push(`✅ tools ディレクトリ: ${toolsContents.join(', ')}`);
    } else {
      details.push(`⚠️ tools ディレクトリが見つかりません`);
    }

    testResults.structure = {
      status: 'success',
      duration: Date.now() - startTime,
      error: null,
      details
    };

    log('パッケージ構造の詳細検証完了', 'success');

  } catch (error) {
    testResults.structure = {
      status: 'failed',
      duration: Date.now() - startTime,
      error: error.message,
      details
    };
    throw error;
  }
}

// workspace設定の詳細検証
function verifyWorkspaceConfig() {
  log('workspace設定の詳細検証を開始');
  const startTime = Date.now();
  const details = [];

  try {
    // pnpm-workspace.yamlの検証
    if (!fs.existsSync('pnpm-workspace.yaml')) {
      throw new Error('pnpm-workspace.yamlが見つかりません');
    }

    const workspaceContent = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
    details.push(`✅ pnpm-workspace.yaml が存在します`);

    if (workspaceContent.includes('packages/*')) {
      details.push(`✅ packages/* が設定されています`);
    } else {
      details.push(`⚠️ packages/* の設定が見つかりません`);
    }

    // turbo.jsonの検証
    if (!fs.existsSync('turbo.json')) {
      throw new Error('turbo.jsonが見つかりません');
    }

    const turboConfig = JSON.parse(fs.readFileSync('turbo.json', 'utf8'));
    details.push(`✅ turbo.json が存在します`);

    const expectedTasks = ['build', 'test', 'lint', 'type-check'];
    const configuredTasks = Object.keys(turboConfig.pipeline || {});

    for (const task of expectedTasks) {
      if (configuredTasks.includes(task)) {
        details.push(`✅ turbo タスク '${task}' が設定されています`);
      } else {
        details.push(`⚠️ turbo タスク '${task}' が設定されていません`);
      }
    }

    // ルートpackage.jsonの検証
    if (!fs.existsSync('package.json')) {
      throw new Error('ルートpackage.jsonが見つかりません');
    }

    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    details.push(`✅ ルートpackage.json: ${rootPackage.name} v${rootPackage.version}`);

    // 必要なスクリプトの確認
    const requiredScripts = ['build', 'test', 'lint', 'type-check'];
    const missingScripts = requiredScripts.filter(script => !rootPackage.scripts[script]);

    if (missingScripts.length > 0) {
      details.push(`⚠️ 以下のスクリプトが見つかりません: ${missingScripts.join(', ')}`);
    } else {
      details.push(`✅ 必要なスクリプトがすべて設定されています`);
    }

    // Node.jsバージョンの確認
    if (rootPackage.engines && rootPackage.engines.node) {
      details.push(`✅ Node.js バージョン制約: ${rootPackage.engines.node}`);
    } else {
      details.push(`⚠️ Node.js バージョン制約が設定されていません`);
    }

    testResults.workspace = {
      status: 'success',
      duration: Date.now() - startTime,
      error: null,
      details
    };

    log('workspace設定の詳細検証完了', 'success');

  } catch (error) {
    testResults.workspace = {
      status: 'failed',
      duration: Date.now() - startTime,
      error: error.message,
      details
    };
    throw error;
  }
}

// TypeScript設定の検証
function verifyTypeScriptConfig() {
  log('TypeScript設定の検証を開始');
  const startTime = Date.now();
  const details = [];

  try {
    // ルートtsconfig.jsonの確認
    if (!fs.existsSync('tsconfig.json')) {
      throw new Error('ルートtsconfig.jsonが見つかりません');
    }

    const rootTsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    details.push(`✅ ルートtsconfig.json が存在します`);

    // 各パッケージのtsconfig.jsonの確認
    const packages = ['packages/frontend', 'packages/backend', 'packages/infrastructure', 'packages/shared'];

    for (const pkg of packages) {
      const tsconfigPath = path.join(pkg, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        details.push(`✅ ${pkg}/tsconfig.json が存在します`);
      } else {
        details.push(`⚠️ ${pkg}/tsconfig.json が見つかりません`);
      }
    }

    testResults.typescript = {
      status: 'success',
      duration: Date.now() - startTime,
      error: null,
      details
    };

    log('TypeScript設定の検証完了', 'success');

  } catch (error) {
    testResults.typescript = {
      status: 'failed',
      duration: Date.now() - startTime,
      error: error.message,
      details
    };
    throw error;
  }
}

// turbo設定の詳細検証
function verifyTurboConfig() {
  log('turbo設定の詳細検証を開始');
  const startTime = Date.now();
  const details = [];

  try {
    if (!fs.existsSync('turbo.json')) {
      throw new Error('turbo.jsonが見つかりません');
    }

    const turboConfig = JSON.parse(fs.readFileSync('turbo.json', 'utf8'));

    // パイプライン設定の確認
    if (turboConfig.pipeline) {
      const tasks = Object.keys(turboConfig.pipeline);
      details.push(`✅ 設定されているタスク: ${tasks.join(', ')}`);

      // 各タスクの依存関係確認
      for (const [task, config] of Object.entries(turboConfig.pipeline)) {
        if (config.dependsOn && config.dependsOn.length > 0) {
          details.push(`✅ ${task}: 依存関係 ${config.dependsOn.join(', ')}`);
        }

        if (config.outputs && config.outputs.length > 0) {
          details.push(`✅ ${task}: 出力 ${config.outputs.join(', ')}`);
        }
      }
    } else {
      details.push(`⚠️ pipeline 設定が見つかりません`);
    }

    testResults.turbo = {
      status: 'success',
      duration: Date.now() - startTime,
      error: null,
      details
    };

    log('turbo設定の詳細検証完了', 'success');

  } catch (error) {
    testResults.turbo = {
      status: 'failed',
      duration: Date.now() - startTime,
      error: error.message,
      details
    };
    throw error;
  }
}

// パッケージ間依存関係の詳細確認
function verifyPackageDependencies() {
  log('パッケージ間依存関係の詳細確認を開始');
  const startTime = Date.now();
  const details = [];

  try {
    // sharedパッケージを参照しているパッケージの確認
    const packagesUsingShared = [
      { path: 'packages/frontend', name: 'frontend' },
      { path: 'packages/backend', name: 'backend' },
      { path: 'packages/infrastructure', name: 'infrastructure' }
    ];

    for (const pkg of packagesUsingShared) {
      const packageJsonPath = path.join(pkg.path, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // sharedパッケージへの依存関係があるかチェック
        if (dependencies['@goal-mandala/shared']) {
          details.push(`✅ ${pkg.name}: shared パッケージに依存しています (${dependencies['@goal-mandala/shared']})`);
        } else {
          details.push(`⚠️ ${pkg.name}: shared パッケージへの依存関係が見つかりません`);
        }

        // その他の依存関係の確認
        const depCount = Object.keys(dependencies).length;
        details.push(`📋 ${pkg.name}: ${depCount} 個の依存関係があります`);
      }
    }

    testResults.dependencies = {
      status: 'success',
      duration: Date.now() - startTime,
      error: null,
      details
    };

    log('パッケージ間依存関係の詳細確認完了', 'success');

  } catch (error) {
    testResults.dependencies = {
      status: 'failed',
      duration: Date.now() - startTime,
      error: error.message,
      details
    };
    throw error;
  }
}

// 各コマンドのテスト実行
function testCommand(command, testKey, description, allowFailure = false) {
  log(`=== ${description} テスト ===`);
  const result = executeCommand(command, description);

  testResults[testKey] = {
    status: result.success ? 'success' : 'failed',
    duration: result.duration,
    error: result.error,
    details: result.success ? [`✅ ${description} が正常に完了しました`] : [`❌ ${description} が失敗しました: ${result.error}`]
  };

  if (!result.success && !allowFailure) {
    throw new Error(`${description}が失敗しました`);
  }

  if (!result.success && allowFailure) {
    log(`${description}が失敗しましたが、テストを継続します`, 'warning');
  }

  return result.success;
}

// メイン実行関数
async function runIntegrationTests() {
  log('=== モノレポ完全統合テスト開始 ===');

  try {
    // 1. パッケージ構造の詳細検証
    verifyPackageStructure();

    // 2. workspace設定の詳細検証
    verifyWorkspaceConfig();

    // 3. TypeScript設定の検証
    verifyTypeScriptConfig();

    // 4. turbo設定の詳細検証
    verifyTurboConfig();

    // 5. pnpm install テスト
    testCommand('pnpm install', 'install', 'パッケージインストール');

    // 6. パッケージ間依存関係の詳細確認
    verifyPackageDependencies();

    // 7. pnpm build テスト
    testCommand('pnpm build', 'build', 'プロジェクトビルド');

    // 8. pnpm test テスト（失敗を許可）
    testCommand('pnpm test', 'test', 'テスト実行', true);

    // 9. pnpm lint テスト（失敗を許可）
    testCommand('pnpm lint', 'lint', 'リント実行', true);

    // 結果サマリーの出力
    generateDetailedTestReport();

    log('=== モノレポ完全統合テスト完了 ===', 'success');

  } catch (error) {
    log(`統合テストが失敗しました: ${error.message}`, 'error');
    generateDetailedTestReport();
    process.exit(1);
  }
}

// 詳細テストレポートの生成
function generateDetailedTestReport() {
  log('=== 詳細テスト結果サマリー ===');

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

    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
    }

    if (result.error) {
      log(`   エラー: ${result.error}`, 'error');
    }
  });

  log(`\n📊 合計: ${report.summary.total}, 成功: ${report.summary.passed}, 失敗: ${report.summary.failed}, 保留: ${report.summary.pending}`);

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
