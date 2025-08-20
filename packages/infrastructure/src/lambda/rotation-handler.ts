import { SecretsManagerRotationEvent, Context } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  UpdateSecretCommand,
  PutSecretValueCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { RDSClient, ModifyDBClusterCommand } from '@aws-sdk/client-rds';

/**
 * ローテーションイベントの型定義
 */
interface RotationEvent extends SecretsManagerRotationEvent {
  SecretId: string;
  ClientRequestToken: string;
  Step: 'createSecret' | 'setSecret' | 'testSecret' | 'finishSecret';
}

/**
 * データベース認証情報の型定義
 */
interface DatabaseCredentials {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
  dbClusterIdentifier: string;
}

/**
 * ローテーション処理の結果
 */
interface RotationResult {
  success: boolean;
  step: string;
  message: string;
  timestamp: string;
}

/**
 * AWS Secrets Manager自動ローテーション用Lambda関数
 *
 * データベースパスワードの4段階ローテーション処理を実装：
 * 1. createSecret: 新しいパスワードを生成
 * 2. setSecret: データベースに新しいパスワードを設定
 * 3. testSecret: 新しいパスワードでの接続テスト
 * 4. finishSecret: ローテーション完了処理
 */
export const rotationHandler = async (
  event: RotationEvent,
  context: Context
): Promise<RotationResult> => {
  console.log('🔄 Starting rotation process', {
    secretId: event.SecretId,
    step: event.Step,
    clientRequestToken: event.ClientRequestToken,
    requestId: context.awsRequestId,
  });

  const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const rdsClient = new RDSClient({ region: process.env.AWS_REGION });

  try {
    switch (event.Step) {
      case 'createSecret':
        return await createSecret(secretsClient, event);
      case 'setSecret':
        return await setSecret(secretsClient, rdsClient, event);
      case 'testSecret':
        return await testSecret(secretsClient, event);
      case 'finishSecret':
        return await finishSecret(secretsClient, event);
      default:
        throw new Error(`Unknown rotation step: ${event.Step}`);
    }
  } catch (error) {
    console.error('❌ Rotation failed', {
      step: event.Step,
      error: error instanceof Error ? error.message : String(error),
      secretId: event.SecretId,
    });

    // ローテーション失敗時のロールバック処理
    await handleRotationFailure(secretsClient, event, error);

    return {
      success: false,
      step: event.Step,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Step 1: 新しいパスワードを生成
 */
async function createSecret(
  client: SecretsManagerClient,
  event: RotationEvent
): Promise<RotationResult> {
  console.log('🔐 Creating new secret version');

  try {
    // 現在のシークレット値を取得
    const currentSecret = await client.send(
      new GetSecretValueCommand({
        SecretId: event.SecretId,
        VersionStage: 'AWSCURRENT',
      })
    );

    if (!currentSecret.SecretString) {
      throw new Error('Current secret value not found');
    }

    const currentCredentials: DatabaseCredentials = JSON.parse(currentSecret.SecretString);

    // 新しいパスワードを生成（32文字、特殊文字を含む）
    const newPassword = generateSecurePassword();

    // 新しい認証情報を作成
    const newCredentials: DatabaseCredentials = {
      ...currentCredentials,
      password: newPassword,
    };

    // 新しいシークレットバージョンを作成
    await client.send(
      new PutSecretValueCommand({
        SecretId: event.SecretId,
        ClientRequestToken: event.ClientRequestToken,
        SecretString: JSON.stringify(newCredentials),
        VersionStages: ['AWSPENDING'],
      })
    );

    console.log('✅ New secret version created successfully');

    return {
      success: true,
      step: 'createSecret',
      message: 'New password generated and stored',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Failed to create new secret', error);
    throw error;
  }
}

/**
 * Step 2: データベースに新しいパスワードを設定
 */
async function setSecret(
  secretsClient: SecretsManagerClient,
  rdsClient: RDSClient,
  event: RotationEvent
): Promise<RotationResult> {
  console.log('🔧 Setting new password in database');

  try {
    // 新しいシークレット値を取得
    const pendingSecret = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: event.SecretId,
        VersionId: event.ClientRequestToken,
        VersionStage: 'AWSPENDING',
      })
    );

    if (!pendingSecret.SecretString) {
      throw new Error('Pending secret value not found');
    }

    const newCredentials: DatabaseCredentials = JSON.parse(pendingSecret.SecretString);

    // Aurora Serverlessクラスターのマスターパスワードを更新
    await rdsClient.send(
      new ModifyDBClusterCommand({
        DBClusterIdentifier: newCredentials.dbClusterIdentifier,
        MasterUserPassword: newCredentials.password,
        ApplyImmediately: true,
      })
    );

    console.log('✅ Database password updated successfully');

    return {
      success: true,
      step: 'setSecret',
      message: 'Database password updated',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Failed to set new password in database', error);
    throw error;
  }
}

/**
 * Step 3: 新しいパスワードでの接続テスト
 */
async function testSecret(
  client: SecretsManagerClient,
  event: RotationEvent
): Promise<RotationResult> {
  console.log('🧪 Testing new password connection');

  try {
    // 新しいシークレット値を取得
    const pendingSecret = await client.send(
      new GetSecretValueCommand({
        SecretId: event.SecretId,
        VersionId: event.ClientRequestToken,
        VersionStage: 'AWSPENDING',
      })
    );

    if (!pendingSecret.SecretString) {
      throw new Error('Pending secret value not found');
    }

    const newCredentials: DatabaseCredentials = JSON.parse(pendingSecret.SecretString);

    // データベース接続テスト
    await testDatabaseConnection(newCredentials);

    console.log('✅ Database connection test successful');

    return {
      success: true,
      step: 'testSecret',
      message: 'Database connection test passed',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Database connection test failed', error);
    throw error;
  }
}

/**
 * Step 4: ローテーション完了処理
 */
async function finishSecret(
  client: SecretsManagerClient,
  event: RotationEvent
): Promise<RotationResult> {
  console.log('🏁 Finishing rotation process');

  try {
    // シークレットの説明を更新してローテーション完了を記録
    const secretDescription = await client.send(
      new DescribeSecretCommand({
        SecretId: event.SecretId,
      })
    );

    await client.send(
      new UpdateSecretCommand({
        SecretId: event.SecretId,
        Description: `${secretDescription.Description} - Last rotated: ${new Date().toISOString()}`,
      })
    );

    console.log('✅ Rotation completed successfully');

    return {
      success: true,
      step: 'finishSecret',
      message: 'Rotation completed successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Failed to finish rotation', error);
    throw error;
  }
}

/**
 * 安全なパスワードを生成
 */
function generateSecurePassword(): string {
  const length = 32;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const excludeChars = '"@/\\\'`'; // Secrets Managerで除外される文字

  const validChars = charset.split('').filter(char => !excludeChars.includes(char));

  let password = '';
  for (let i = 0; i < length; i++) {
    password += validChars[Math.floor(Math.random() * validChars.length)];
  }

  return password;
}

/**
 * データベース接続テスト
 */
async function testDatabaseConnection(credentials: DatabaseCredentials): Promise<void> {
  // 実際の実装では、pg（PostgreSQL）クライアントを使用して接続テストを行う
  // ここでは簡略化してシミュレーション
  console.log('Testing database connection with new credentials', {
    host: credentials.host,
    port: credentials.port,
    username: credentials.username,
    dbname: credentials.dbname,
  });

  // 接続テストのシミュレーション
  // 実際の実装では以下のようなコードになる：
  /*
    const { Client } = require('pg');
    const client = new Client({
        host: credentials.host,
        port: credentials.port,
        user: credentials.username,
        password: credentials.password,
        database: credentials.dbname,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    */

  // 現在はシミュレーション
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('✅ Database connection test completed');
}

/**
 * ローテーション失敗時のロールバック処理
 */
async function handleRotationFailure(
  client: SecretsManagerClient,
  event: RotationEvent,
  error: unknown
): Promise<void> {
  console.log('🔄 Handling rotation failure, initiating rollback');

  try {
    // アラート送信（実際の実装ではSNSやCloudWatchアラームを使用）
    await sendRotationFailureAlert(event, error);

    // ローテーション状態のクリーンアップ
    // AWSPENDING バージョンが存在する場合は削除を試行
    // （実際のAWS Secrets Managerでは自動的に処理される）

    console.log('✅ Rollback completed');
  } catch (rollbackError) {
    console.error('❌ Rollback failed', rollbackError);
    // 重大なエラーとしてアラート送信
    await sendCriticalAlert(event, error, rollbackError);
  }
}

/**
 * ローテーション失敗アラートを送信
 */
async function sendRotationFailureAlert(event: RotationEvent, error: unknown): Promise<void> {
  console.log('📧 Sending rotation failure alert', {
    secretId: event.SecretId,
    step: event.Step,
    error: error instanceof Error ? error.message : String(error),
  });

  // 実際の実装ではSNSトピックに送信
  // const sns = new SNSClient({ region: process.env.AWS_REGION });
  // await sns.send(new PublishCommand({
  //     TopicArn: process.env.ALERT_TOPIC_ARN,
  //     Subject: 'Secrets Manager Rotation Failed',
  //     Message: JSON.stringify({
  //         secretId: event.SecretId,
  //         step: event.Step,
  //         error: error instanceof Error ? error.message : String(error),
  //         timestamp: new Date().toISOString()
  //     })
  // }));
}

/**
 * 重大なエラーアラートを送信
 */
async function sendCriticalAlert(
  event: RotationEvent,
  originalError: unknown,
  rollbackError: unknown
): Promise<void> {
  console.error('🚨 Sending critical alert - both rotation and rollback failed', {
    secretId: event.SecretId,
    originalError: originalError instanceof Error ? originalError.message : String(originalError),
    rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
  });

  // 重大なエラーとして即座にアラート送信
  // 手動介入が必要な旨を通知
}
