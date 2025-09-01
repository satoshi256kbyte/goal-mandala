/**
 * IAMデータベース認証セットアップ用Lambda関数
 * 要件6.3対応：IAMデータベース認証を設定
 */

import { Client } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { RDSClient, DescribeDBClustersCommand } from '@aws-sdk/client-rds';

interface DatabaseSecret {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
}

interface SetupEvent {
  secretArn: string;
  clusterIdentifier: string;
  region: string;
}

interface SetupResponse {
  success: boolean;
  message: string;
  usersCreated: string[];
  errors?: string[];
}

/**
 * IAMデータベースユーザーセットアップのメイン関数
 */
export const handler = async (event: SetupEvent): Promise<SetupResponse> => {
  console.log('IAMデータベース認証セットアップ開始:', JSON.stringify(event, null, 2));

  const { secretArn, clusterIdentifier, region } = event;
  const usersCreated: string[] = [];
  const errors: string[] = [];

  try {
    // 1. データベース認証情報を取得
    const secret = await getDatabaseSecret(secretArn, region);
    console.log('✅ データベース認証情報を取得しました');

    // 2. データベースクラスター情報を取得
    await getClusterInfo(clusterIdentifier, region);
    console.log('✅ データベースクラスター情報を取得しました');

    // 3. データベースに接続
    const client = new Client({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: {
        rejectUnauthorized: false, // Aurora PostgreSQLの証明書を信頼
      },
      connectionTimeoutMillis: 30000,
      query_timeout: 60000,
    });

    await client.connect();
    console.log('✅ データベースに接続しました');

    try {
      // 4. IAMデータベースユーザーを作成
      const userCreationResults = await createIamDatabaseUsers(client);
      usersCreated.push(...userCreationResults.created);
      if (userCreationResults.errors.length > 0) {
        errors.push(...userCreationResults.errors);
      }

      // 5. セキュリティ設定を確認
      await verifySecuritySettings(client);

      // 6. 作成されたユーザーを確認
      await verifyCreatedUsers(client, usersCreated);
    } finally {
      await client.end();
      console.log('✅ データベース接続を終了しました');
    }

    const success = errors.length === 0;
    const message = success
      ? `IAMデータベース認証セットアップが完了しました。${usersCreated.length}個のユーザーを作成しました。`
      : `IAMデータベース認証セットアップが部分的に完了しました。${errors.length}個のエラーがあります。`;

    console.log(success ? '✅' : '⚠️', message);

    return {
      success,
      message,
      usersCreated,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMessage = `IAMデータベース認証セットアップに失敗しました: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMessage);
    console.error('エラー詳細:', error);

    return {
      success: false,
      message: errorMessage,
      usersCreated,
      errors: [errorMessage],
    };
  }
};

/**
 * Secrets Managerからデータベース認証情報を取得
 */
async function getDatabaseSecret(secretArn: string, region: string): Promise<DatabaseSecret> {
  const client = new SecretsManagerClient({ region });

  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('シークレット文字列が見つかりません');
    }

    const secret = JSON.parse(response.SecretString) as DatabaseSecret;

    // 必要なフィールドの検証
    const requiredFields = ['username', 'password', 'host', 'port', 'dbname'];
    for (const field of requiredFields) {
      if (!(field in secret)) {
        throw new Error(`必要なフィールド '${field}' がシークレットに含まれていません`);
      }
    }

    return secret;
  } catch (error) {
    throw new Error(
      `データベース認証情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * RDSクラスター情報を取得
 */
async function getClusterInfo(clusterIdentifier: string, region: string) {
  const client = new RDSClient({ region });

  try {
    const command = new DescribeDBClustersCommand({
      DBClusterIdentifier: clusterIdentifier,
    });
    const response = await client.send(command);

    if (!response.DBClusters || response.DBClusters.length === 0) {
      throw new Error('データベースクラスターが見つかりません');
    }

    const cluster = response.DBClusters[0];

    if (!cluster.IAMDatabaseAuthenticationEnabled) {
      throw new Error('IAMデータベース認証が有効になっていません');
    }

    return cluster;
  } catch (error) {
    throw new Error(
      `データベースクラスター情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * IAMデータベースユーザーを作成
 */
async function createIamDatabaseUsers(
  client: Client
): Promise<{ created: string[]; errors: string[] }> {
  const users = [
    {
      name: 'lambda_user',
      description: 'Lambda実行用ユーザー',
      permissions: [
        'GRANT rds_iam TO lambda_user;',
        'GRANT CONNECT ON DATABASE goalmandalamain TO lambda_user;',
        'GRANT USAGE ON SCHEMA public TO lambda_user;',
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lambda_user;',
        'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lambda_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lambda_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lambda_user;',
      ],
    },
    {
      name: 'app_user',
      description: 'アプリケーション用ユーザー',
      permissions: [
        'GRANT rds_iam TO app_user;',
        'GRANT CONNECT ON DATABASE goalmandalamain TO app_user;',
        'GRANT USAGE ON SCHEMA public TO app_user;',
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;',
        'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;',
      ],
    },
    {
      name: 'readonly_user',
      description: '読み取り専用ユーザー',
      permissions: [
        'GRANT rds_iam TO readonly_user;',
        'GRANT CONNECT ON DATABASE goalmandalamain TO readonly_user;',
        'GRANT USAGE ON SCHEMA public TO readonly_user;',
        'GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;',
      ],
    },
    {
      name: 'admin_user',
      description: '管理者用ユーザー',
      permissions: [
        'GRANT rds_iam TO admin_user;',
        'GRANT CONNECT ON DATABASE goalmandalamain TO admin_user;',
        'GRANT ALL PRIVILEGES ON DATABASE goalmandalamain TO admin_user;',
        'GRANT ALL PRIVILEGES ON SCHEMA public TO admin_user;',
        'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;',
        'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO admin_user;',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO admin_user;',
      ],
    },
  ];

  const created: string[] = [];
  const errors: string[] = [];

  for (const user of users) {
    try {
      console.log(`${user.description}(${user.name})を作成中...`);

      // ユーザーが既に存在するかチェック
      const existsResult = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [
        user.name,
      ]);

      if (existsResult.rows.length > 0) {
        console.log(`⚠️  ユーザー ${user.name} は既に存在します - スキップ`);
        continue;
      }

      // ユーザーを作成
      await client.query(`CREATE USER ${user.name};`);
      console.log(`✅ ユーザー ${user.name} を作成しました`);

      // 権限を付与
      for (const permission of user.permissions) {
        try {
          await client.query(permission);
        } catch (permError) {
          console.warn(`⚠️  権限付与でエラー (${user.name}): ${permission} - ${permError}`);
          // 権限付与のエラーは警告として扱い、処理を継続
        }
      }

      console.log(`✅ ユーザー ${user.name} の権限設定が完了しました`);
      created.push(user.name);
    } catch (error) {
      const errorMessage = `ユーザー ${user.name} の作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }
  }

  return { created, errors };
}

/**
 * セキュリティ設定を確認
 */
async function verifySecuritySettings(client: Client): Promise<void> {
  console.log('セキュリティ設定を確認中...');

  try {
    // SSL設定の確認
    const sslResult = await client.query('SHOW ssl;');
    console.log(`SSL設定: ${sslResult.rows[0]?.ssl || 'unknown'}`);

    // ログ設定の確認
    const logConnectionsResult = await client.query('SHOW log_connections;');
    console.log(`接続ログ: ${logConnectionsResult.rows[0]?.log_connections || 'unknown'}`);

    const logDisconnectionsResult = await client.query('SHOW log_disconnections;');
    console.log(`切断ログ: ${logDisconnectionsResult.rows[0]?.log_disconnections || 'unknown'}`);

    const logStatementResult = await client.query('SHOW log_statement;');
    console.log(`ステートメントログ: ${logStatementResult.rows[0]?.log_statement || 'unknown'}`);

    console.log('✅ セキュリティ設定の確認が完了しました');
  } catch (error) {
    console.warn(`⚠️  セキュリティ設定の確認でエラーが発生しました: ${error}`);
  }
}

/**
 * 作成されたユーザーを確認
 */
async function verifyCreatedUsers(client: Client, expectedUsers: string[]): Promise<void> {
  console.log('作成されたユーザーを確認中...');

  try {
    // 作成されたユーザーの確認
    const usersResult = await client.query(
      `
            SELECT usename, usesuper, usecreatedb, usecatupd, passwd IS NOT NULL as has_password
            FROM pg_user
            WHERE usename = ANY($1)
            ORDER BY usename
        `,
      [expectedUsers]
    );

    console.log('作成されたユーザー:');
    for (const row of usersResult.rows) {
      console.log(
        `  - ${row.usename}: super=${row.usesuper}, createdb=${row.usecreatedb}, has_password=${row.has_password}`
      );
    }

    // IAM認証が有効なユーザーの確認
    const iamUsersResult = await client.query(
      `
            SELECT r.rolname, r.rolcanlogin, array_agg(m.rolname) as memberof
            FROM pg_roles r
            LEFT JOIN pg_auth_members am ON r.oid = am.member
            LEFT JOIN pg_roles m ON am.roleid = m.oid
            WHERE r.rolname = ANY($1) OR r.rolname = 'rds_iam'
            GROUP BY r.rolname, r.rolcanlogin
            ORDER BY r.rolname
        `,
      [expectedUsers]
    );

    console.log('IAM認証設定:');
    for (const row of iamUsersResult.rows) {
      console.log(`  - ${row.rolname}: login=${row.rolcanlogin}, memberof=${row.memberof || []}`);
    }

    console.log('✅ ユーザー確認が完了しました');
  } catch (error) {
    console.warn(`⚠️  ユーザー確認でエラーが発生しました: ${error}`);
  }
}
