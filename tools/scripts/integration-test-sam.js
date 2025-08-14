#!/usr/bin/env node

/**
 * SAM CLI統合テストスクリプト
 *
 * このスクリプトは以下のテストを実行します：
 * 1. SAM local start-apiコマンドでローカルAPIが起動することを確認
 * 2. ヘルスチェックエンドポイントにアクセスして正常なレスポンスを確認
 * 3. CORS設定が正しく動作することを確認
 * 4. Docker Compose環境との連携を確認
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'packages/backend');

// テスト設定
const TEST_CONFIG = {
  SAM_PORT: 3001,
  SAM_HOST: '127.0.0.1',
  TIMEOUT: 60000, // 60秒
  RETRY_ATTEMPTS: 5,
  RETRY_DELAY: 2000, // 2秒
};

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

// 遅延関数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTPリクエストを送信する関数
async function makeRequest(url, options = {}) {
  const { default: fetch } = await import('node-fetch');

  const defaultOptions = {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
}

// Docker Composeが起動しているかチェック
async function checkDockerCompose() {
  log.info('Docker Compose環境をチェック中...');

  try {
    const { stdout } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}"', {
      cwd: PROJECT_ROOT,
    });
    const isPostgresRunning = stdout.includes('goal-mandala-postgres') && stdout.includes('Up');
    const isCognitoRunning = stdout.includes('goal-mandala-cognito-local') && stdout.includes('Up');

    recordTest(
      'Docker Compose PostgreSQL起動確認',
      isPostgresRunning,
      isPostgresRunning ? '' : 'PostgreSQLコンテナが起動していません'
    );

    recordTest(
      'Docker Compose Cognito Local起動確認',
      isCognitoRunning,
      isCognitoRunning ? '' : 'Cognito Localコンテナが起動していません'
    );

    return isPostgresRunning && isCognitoRunning;
  } catch (error) {
    recordTest('Docker Compose環境チェック', false, error.message);
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

// SAM Local APIを起動
async function startSamLocal() {
  log.info('SAM Local APIを起動中...');

  return new Promise((resolve, reject) => {
    const samProcess = spawn(
      'sam',
      [
        'local',
        'start-api',
        '--port',
        TEST_CONFIG.SAM_PORT.toString(),
        '--host',
        TEST_CONFIG.SAM_HOST,
        '--warm-containers',
        'EAGER',
      ],
      {
        cwd: BACKEND_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let startupComplete = false;
    let startupTimeout;

    // 起動完了を検出
    samProcess.stdout.on('data', data => {
      const output = data.toString();
      console.log(output);

      if (output.includes('Running on') || output.includes('Press CTRL+C to quit')) {
        if (!startupComplete) {
          startupComplete = true;
          clearTimeout(startupTimeout);
          recordTest('SAM Local API起動', true);
          resolve(samProcess);
        }
      }
    });

    samProcess.stderr.on('data', data => {
      const output = data.toString();
      console.error(output);
    });

    samProcess.on('error', error => {
      if (!startupComplete) {
        recordTest('SAM Local API起動', false, error.message);
        reject(error);
      }
    });

    samProcess.on('exit', code => {
      if (!startupComplete && code !== 0) {
        recordTest('SAM Local API起動', false, `プロセスが終了しました (code: ${code})`);
        reject(new Error(`SAM process exited with code ${code}`));
      }
    });

    // タイムアウト設定
    startupTimeout = setTimeout(() => {
      if (!startupComplete) {
        recordTest('SAM Local API起動', false, 'タイムアウト');
        samProcess.kill();
        reject(new Error('SAM startup timeout'));
      }
    }, TEST_CONFIG.TIMEOUT);
  });
}

// APIが応答するまで待機
async function waitForApi() {
  log.info('APIの応答を待機中...');

  for (let i = 0; i < TEST_CONFIG.RETRY_ATTEMPTS; i++) {
    try {
      const response = await makeRequest(
        `http://${TEST_CONFIG.SAM_HOST}:${TEST_CONFIG.SAM_PORT}/health`
      );
      if (response.ok) {
        recordTest('API応答待機', true);
        return true;
      }
    } catch (error) {
      log.warn(`API応答待機 (試行 ${i + 1}/${TEST_CONFIG.RETRY_ATTEMPTS}): ${error.message}`);
    }

    if (i < TEST_CONFIG.RETRY_ATTEMPTS - 1) {
      await delay(TEST_CONFIG.RETRY_DELAY);
    }
  }

  recordTest('API応答待機', false, '最大試行回数に達しました');
  return false;
}

// ヘルスチェックエンドポイントのテスト
async function testHealthEndpoint() {
  log.info('ヘルスチェックエンドポイントをテスト中...');

  try {
    const response = await makeRequest(
      `http://${TEST_CONFIG.SAM_HOST}:${TEST_CONFIG.SAM_PORT}/health`
    );

    if (!response.ok) {
      recordTest('ヘルスチェックエンドポイント', false, `HTTPステータス: ${response.status}`);
      return false;
    }

    const data = await response.json();

    // レスポンス形式の確認
    const hasStatus = data.status === 'ok';
    const hasTimestamp = typeof data.timestamp === 'string';
    const hasEnvironment = typeof data.environment === 'string';
    const hasVersion = typeof data.version === 'string';

    recordTest(
      'ヘルスチェック - ステータス',
      hasStatus,
      hasStatus ? '' : `期待値: 'ok', 実際: '${data.status}'`
    );
    recordTest(
      'ヘルスチェック - タイムスタンプ',
      hasTimestamp,
      hasTimestamp ? '' : 'タイムスタンプが文字列ではありません'
    );
    recordTest(
      'ヘルスチェック - 環境',
      hasEnvironment,
      hasEnvironment ? '' : '環境情報が文字列ではありません'
    );
    recordTest(
      'ヘルスチェック - バージョン',
      hasVersion,
      hasVersion ? '' : 'バージョン情報が文字列ではありません'
    );

    return hasStatus && hasTimestamp && hasEnvironment && hasVersion;
  } catch (error) {
    recordTest('ヘルスチェックエンドポイント', false, error.message);
    return false;
  }
}

// CORS設定のテスト
async function testCorsSettings() {
  log.info('CORS設定をテスト中...');

  try {
    // プリフライトリクエストのテスト
    const preflightResponse = await makeRequest(
      `http://${TEST_CONFIG.SAM_HOST}:${TEST_CONFIG.SAM_PORT}/health`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      }
    );

    const corsHeaders = {
      'access-control-allow-origin': preflightResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': preflightResponse.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': preflightResponse.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': preflightResponse.headers.get(
        'access-control-allow-credentials'
      ),
    };

    // CORS ヘッダーの確認
    const hasOrigin = corsHeaders['access-control-allow-origin'] === 'http://localhost:5173';
    const hasMethods = corsHeaders['access-control-allow-methods']?.includes('GET');
    const hasHeaders = corsHeaders['access-control-allow-headers']?.includes('Content-Type');
    const hasCredentials = corsHeaders['access-control-allow-credentials'] === 'true';

    recordTest(
      'CORS - Origin',
      hasOrigin,
      hasOrigin ? '' : `実際: ${corsHeaders['access-control-allow-origin']}`
    );
    recordTest(
      'CORS - Methods',
      hasMethods,
      hasMethods ? '' : `実際: ${corsHeaders['access-control-allow-methods']}`
    );
    recordTest(
      'CORS - Headers',
      hasHeaders,
      hasHeaders ? '' : `実際: ${corsHeaders['access-control-allow-headers']}`
    );
    recordTest(
      'CORS - Credentials',
      hasCredentials,
      hasCredentials ? '' : `実際: ${corsHeaders['access-control-allow-credentials']}`
    );

    // 実際のリクエストでのCORSヘッダー確認
    const actualResponse = await makeRequest(
      `http://${TEST_CONFIG.SAM_HOST}:${TEST_CONFIG.SAM_PORT}/health`,
      {
        headers: {
          Origin: 'http://localhost:5173',
        },
      }
    );

    const actualCorsOrigin = actualResponse.headers.get('access-control-allow-origin');
    const hasActualOrigin = actualCorsOrigin === 'http://localhost:5173';

    recordTest(
      'CORS - 実際のリクエスト',
      hasActualOrigin,
      hasActualOrigin ? '' : `実際: ${actualCorsOrigin}`
    );

    return hasOrigin && hasMethods && hasHeaders && hasCredentials && hasActualOrigin;
  } catch (error) {
    recordTest('CORS設定テスト', false, error.message);
    return false;
  }
}

// API v1エンドポイントのテスト
async function testApiV1Endpoint() {
  log.info('API v1エンドポイントをテスト中...');

  try {
    const response = await makeRequest(
      `http://${TEST_CONFIG.SAM_HOST}:${TEST_CONFIG.SAM_PORT}/api/v1`
    );

    if (!response.ok) {
      recordTest('API v1エンドポイント', false, `HTTPステータス: ${response.status}`);
      return false;
    }

    const data = await response.json();

    const hasMessage =
      typeof data.message === 'string' && data.message.includes('Goal Mandala API v1');
    const hasTimestamp = typeof data.timestamp === 'string';

    recordTest('API v1 - メッセージ', hasMessage, hasMessage ? '' : `実際: ${data.message}`);
    recordTest(
      'API v1 - タイムスタンプ',
      hasTimestamp,
      hasTimestamp ? '' : 'タイムスタンプが文字列ではありません'
    );

    return hasMessage && hasTimestamp;
  } catch (error) {
    recordTest('API v1エンドポイント', false, error.message);
    return false;
  }
}

// 404エラーハンドリングのテスト
async function testNotFoundHandling() {
  log.info('404エラーハンドリングをテスト中...');

  try {
    const response = await makeRequest(
      `http://${TEST_CONFIG.SAM_HOST}:${TEST_CONFIG.SAM_PORT}/nonexistent`
    );

    if (response.status !== 404) {
      recordTest('404エラーハンドリング', false, `期待ステータス: 404, 実際: ${response.status}`);
      return false;
    }

    const data = await response.json();

    const hasError = data.error === 'Not Found';
    const hasMessage = typeof data.message === 'string';
    const hasTimestamp = typeof data.timestamp === 'string';

    recordTest('404 - エラーメッセージ', hasError, hasError ? '' : `実際: ${data.error}`);
    recordTest(
      '404 - 詳細メッセージ',
      hasMessage,
      hasMessage ? '' : 'メッセージが文字列ではありません'
    );
    recordTest(
      '404 - タイムスタンプ',
      hasTimestamp,
      hasTimestamp ? '' : 'タイムスタンプが文字列ではありません'
    );

    return hasError && hasMessage && hasTimestamp;
  } catch (error) {
    recordTest('404エラーハンドリング', false, error.message);
    return false;
  }
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
  log.info('SAM CLI統合テストを開始します...');

  let samProcess = null;

  try {
    // Docker Compose環境のチェック
    const dockerOk = await checkDockerCompose();
    if (!dockerOk) {
      log.warn('Docker Compose環境が完全に起動していませんが、テストを続行します');
    }

    // プロジェクトのビルド
    const buildOk = await buildProject();
    if (!buildOk) {
      log.error('プロジェクトのビルドに失敗しました');
      process.exit(1);
    }

    // SAM Local APIの起動
    samProcess = await startSamLocal();

    // APIの応答を待機
    const apiReady = await waitForApi();
    if (!apiReady) {
      log.error('APIが応答しません');
      process.exit(1);
    }

    // 各種テストの実行
    await testHealthEndpoint();
    await testCorsSettings();
    await testApiV1Endpoint();
    await testNotFoundHandling();
  } catch (error) {
    log.error(`テスト実行中にエラーが発生しました: ${error.message}`);
  } finally {
    // SAM プロセスの終了
    if (samProcess) {
      log.info('SAM Local APIを停止中...');
      samProcess.kill('SIGTERM');

      // プロセスが終了するまで少し待機
      await delay(2000);

      if (!samProcess.killed) {
        log.warn('SAM プロセスを強制終了します');
        samProcess.kill('SIGKILL');
      }
    }
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
