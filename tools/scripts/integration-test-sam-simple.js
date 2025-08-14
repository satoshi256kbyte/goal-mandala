#!/usr/bin/env node

/**
 * SAM CLI統合テストスクリプト（簡略版）
 *
 * Docker認証の問題を回避し、以下のテストを実行します：
 * 1. プロジェクトのビルドが成功することを確認
 * 2. SAMビルドが成功することを確認
 * 3. ビルド成果物が正しく生成されることを確認
 * 4. Lambda関数のハンドラーが正しくエクスポートされることを確認
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'packages/backend');

// ログ出力用のユーティリティ
const log = {
  info: msg => console.log(`\x1b[32m[INFO]\x1b[0m ${msg}`),
  warn: msg => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: msg => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  success: msg => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
};

// テスト結果を格納する配列
const testResults = [];

// テスト結果を記録する関数
function recordTest(name, passed, message = '') {
  testResults.push({ name, passed, message });
  if (passed) {
    log.success(`✓ ${name}`);
  } else {
    log.error(`✗ ${name}: ${message}`);
  }
}

// ファイルの存在確認
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// プロジェクトをビルド
async function buildProject() {
  log.info('プロジェクトをビルド中...');

  try {
    // 依存関係のインストール
    await execAsync('pnpm install', { cwd: PROJECT_ROOT });

    // TypeScriptのビルド
    await execAsync('pnpm run build', { cwd: BACKEND_DIR });

    recordTest('プロジェクトビルド', true);
    return true;
  } catch (error) {
    recordTest('プロジェクトビルド', false, error.message);
    return false;
  }
}

// ビルド成果物の確認
async function checkBuildArtifacts() {
  log.info('ビルド成果物を確認中...');

  const distDir = path.join(BACKEND_DIR, 'dist');
  const indexFile = path.join(distDir, 'index.js');

  const distExists = await fileExists(distDir);
  const indexExists = await fileExists(indexFile);

  recordTest(
    'distディレクトリ存在確認',
    distExists,
    distExists ? '' : 'distディレクトリが存在しません'
  );
  recordTest(
    'index.jsファイル存在確認',
    indexExists,
    indexExists ? '' : 'index.jsファイルが存在しません'
  );

  if (indexExists) {
    try {
      const content = await fs.readFile(indexFile, 'utf-8');
      const hasHandler = content.includes('handler') || content.includes('exports');
      recordTest(
        'ハンドラーエクスポート確認',
        hasHandler,
        hasHandler ? '' : 'ハンドラーがエクスポートされていません'
      );
      return hasHandler;
    } catch (error) {
      recordTest('ビルド成果物内容確認', false, error.message);
      return false;
    }
  }

  return distExists && indexExists;
}

// SAMテンプレートの検証
async function validateSamTemplate() {
  log.info('SAMテンプレートを検証中...');

  try {
    await execAsync('sam validate', { cwd: BACKEND_DIR });
    recordTest('SAMテンプレート検証', true);
    return true;
  } catch (error) {
    recordTest('SAMテンプレート検証', false, error.message);
    return false;
  }
}

// SAMビルドの実行
async function buildSam() {
  log.info('SAMビルドを実行中...');

  try {
    await execAsync('sam build', { cwd: BACKEND_DIR });
    recordTest('SAMビルド', true);
    return true;
  } catch (error) {
    recordTest('SAMビルド', false, error.message);
    return false;
  }
}

// SAMビルド成果物の確認
async function checkSamBuildArtifacts() {
  log.info('SAMビルド成果物を確認中...');

  const samBuildDir = path.join(BACKEND_DIR, '.aws-sam', 'build');
  const templateFile = path.join(samBuildDir, 'template.yaml');
  const functionDir = path.join(samBuildDir, 'ApiFunction');
  const functionHandler = path.join(functionDir, 'index.js');

  const buildDirExists = await fileExists(samBuildDir);
  const templateExists = await fileExists(templateFile);
  const functionDirExists = await fileExists(functionDir);
  const handlerExists = await fileExists(functionHandler);

  recordTest(
    'SAMビルドディレクトリ存在確認',
    buildDirExists,
    buildDirExists ? '' : '.aws-sam/buildディレクトリが存在しません'
  );
  recordTest(
    'SAMテンプレートファイル存在確認',
    templateExists,
    templateExists ? '' : 'template.yamlファイルが存在しません'
  );
  recordTest(
    'Lambda関数ディレクトリ存在確認',
    functionDirExists,
    functionDirExists ? '' : 'ApiFunctionディレクトリが存在しません'
  );
  recordTest(
    'Lambda関数ハンドラー存在確認',
    handlerExists,
    handlerExists ? '' : 'index.jsハンドラーが存在しません'
  );

  return buildDirExists && templateExists && functionDirExists && handlerExists;
}

// 設定ファイルの確認
async function checkConfigFiles() {
  log.info('設定ファイルを確認中...');

  const templateFile = path.join(BACKEND_DIR, 'template.yaml');
  const samConfigFile = path.join(BACKEND_DIR, 'samconfig.toml');
  const packageFile = path.join(BACKEND_DIR, 'package.json');

  const templateExists = await fileExists(templateFile);
  const samConfigExists = await fileExists(samConfigFile);
  const packageExists = await fileExists(packageFile);

  recordTest(
    'template.yaml存在確認',
    templateExists,
    templateExists ? '' : 'template.yamlファイルが存在しません'
  );
  recordTest(
    'samconfig.toml存在確認',
    samConfigExists,
    samConfigExists ? '' : 'samconfig.tomlファイルが存在しません'
  );
  recordTest(
    'package.json存在確認',
    packageExists,
    packageExists ? '' : 'package.jsonファイルが存在しません'
  );

  if (templateExists) {
    try {
      const templateContent = await fs.readFile(templateFile, 'utf-8');
      const hasApiFunction = templateContent.includes('ApiFunction');
      const hasApiGateway = templateContent.includes('ApiGateway');
      const hasCors = templateContent.includes('Cors');

      recordTest(
        'template.yaml - ApiFunction定義',
        hasApiFunction,
        hasApiFunction ? '' : 'ApiFunction定義が見つかりません'
      );
      recordTest(
        'template.yaml - ApiGateway定義',
        hasApiGateway,
        hasApiGateway ? '' : 'ApiGateway定義が見つかりません'
      );
      recordTest('template.yaml - CORS設定', hasCors, hasCors ? '' : 'CORS設定が見つかりません');
    } catch (error) {
      recordTest('template.yaml内容確認', false, error.message);
    }
  }

  return templateExists && samConfigExists && packageExists;
}

// 環境変数設定の確認
async function checkEnvironmentConfig() {
  log.info('環境変数設定を確認中...');

  const envExampleFile = path.join(PROJECT_ROOT, '.env.example');
  const envExampleExists = await fileExists(envExampleFile);

  recordTest(
    '.env.example存在確認',
    envExampleExists,
    envExampleExists ? '' : '.env.exampleファイルが存在しません'
  );

  if (envExampleExists) {
    try {
      const envContent = await fs.readFile(envExampleFile, 'utf-8');
      const hasDatabaseUrl = envContent.includes('DATABASE_URL');
      const hasJwtSecret = envContent.includes('JWT_SECRET');
      const hasFrontendUrl = envContent.includes('FRONTEND_URL');

      recordTest(
        '環境変数 - DATABASE_URL',
        hasDatabaseUrl,
        hasDatabaseUrl ? '' : 'DATABASE_URL設定が見つかりません'
      );
      recordTest(
        '環境変数 - JWT_SECRET',
        hasJwtSecret,
        hasJwtSecret ? '' : 'JWT_SECRET設定が見つかりません'
      );
      recordTest(
        '環境変数 - FRONTEND_URL',
        hasFrontendUrl,
        hasFrontendUrl ? '' : 'FRONTEND_URL設定が見つかりません'
      );
    } catch (error) {
      recordTest('環境変数設定確認', false, error.message);
    }
  }

  return envExampleExists;
}

// スクリプトファイルの確認
async function checkScriptFiles() {
  log.info('スクリプトファイルを確認中...');

  const samLocalScript = path.join(PROJECT_ROOT, 'tools/scripts/sam-local-start.sh');
  const samBuildScript = path.join(PROJECT_ROOT, 'tools/scripts/sam-build.sh');

  const samLocalExists = await fileExists(samLocalScript);
  const samBuildExists = await fileExists(samBuildScript);

  recordTest(
    'sam-local-start.sh存在確認',
    samLocalExists,
    samLocalExists ? '' : 'sam-local-start.shスクリプトが存在しません'
  );
  recordTest(
    'sam-build.sh存在確認',
    samBuildExists,
    samBuildExists ? '' : 'sam-build.shスクリプトが存在しません'
  );

  return samLocalExists && samBuildExists;
}

// テスト結果のサマリーを表示
function displayTestSummary() {
  log.info('\n=== テスト結果サマリー ===');

  const passed = testResults.filter(test => test.passed).length;
  const total = testResults.length;
  const failed = total - passed;

  console.log(`\n総テスト数: ${total}`);
  console.log(`\x1b[32m成功: ${passed}\x1b[0m`);
  console.log(`\x1b[31m失敗: ${failed}\x1b[0m`);

  if (failed > 0) {
    console.log('\n失敗したテスト:');
    testResults
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  ✗ ${test.name}: ${test.message}`);
      });
  }

  const success = failed === 0;
  console.log(
    `\n\x1b[${success ? '32' : '31'}m${success ? '✓ 全てのテストが成功しました！' : '✗ 一部のテストが失敗しました'}\x1b[0m`
  );

  return success;
}

// メイン処理
async function main() {
  log.info('SAM CLI統合テスト（簡略版）を開始します...');

  try {
    // 設定ファイルの確認
    await checkConfigFiles();

    // 環境変数設定の確認
    await checkEnvironmentConfig();

    // スクリプトファイルの確認
    await checkScriptFiles();

    // プロジェクトのビルド
    const buildOk = await buildProject();
    if (!buildOk) {
      log.error('プロジェクトのビルドに失敗しました');
    }

    // ビルド成果物の確認
    await checkBuildArtifacts();

    // SAMテンプレートの検証
    await validateSamTemplate();

    // SAMビルドの実行
    const samBuildOk = await buildSam();
    if (samBuildOk) {
      // SAMビルド成果物の確認
      await checkSamBuildArtifacts();
    }
  } catch (error) {
    log.error(`テスト実行中にエラーが発生しました: ${error.message}`);
  }

  // テスト結果の表示
  const success = displayTestSummary();

  process.exit(success ? 0 : 1);
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  log.info('\nテストが中断されました');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log.info('\nテストが終了されました');
  process.exit(1);
});

// メイン処理の実行
main().catch(error => {
  log.error(`予期しないエラー: ${error.message}`);
  process.exit(1);
});
