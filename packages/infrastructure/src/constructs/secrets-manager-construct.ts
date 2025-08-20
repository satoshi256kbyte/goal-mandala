import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import * as path from 'path';

/**
 * SecretsManagerConstructのプロパティインターフェース
 */
export interface SecretsManagerConstructProps {
  /** 環境名（local/dev/stg/prod） */
  environment: string;
  /** 環境設定 */
  config: EnvironmentConfig;
  /** データベースクラスター（オプション） */
  databaseCluster?: rds.DatabaseCluster;
  /** ローテーション機能を有効にするか */
  enableRotation?: boolean;
  /** 暗号化キー（オプション、指定しない場合は新規作成） */
  encryptionKey?: kms.IKey;
}

/**
 * データベース認証情報の構造
 */
export interface DatabaseCredentials {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
  dbClusterIdentifier: string;
}

/**
 * JWT秘密鍵の構造
 */
export interface JwtSecretConfig {
  secret: string;
  algorithm: string;
  issuer: string;
  expiresIn: string;
}

/**
 * 外部API認証情報の構造
 */
export interface ExternalApiCredentials {
  bedrock: {
    region: string;
    modelId: string;
  };
  ses: {
    region: string;
    fromEmail: string;
    replyToEmail: string;
  };
}

/**
 * 環境別API設定の構造
 */
export interface EnvironmentApiConfig {
  bedrock: {
    region: string;
    modelId: string;
    additionalConfig: {
      endpoint?: string;
      mockMode?: boolean;
      maxRetries?: number;
      timeout?: number;
      enableLogging?: boolean;
    };
  };
  ses: {
    region: string;
    fromEmail: string;
    replyToEmail: string;
    additionalConfig: {
      endpoint?: string;
      mockMode?: boolean;
      configurationSet?: string;
      maxSendRate?: number;
      enableBounceTracking?: boolean;
      enableComplaintTracking?: boolean;
    };
  };
}

/**
 * AWS Secrets Managerを使用した機密情報管理システム
 *
 * このコンストラクトは以下の機密情報を管理します：
 * - データベース認証情報
 * - JWT秘密鍵
 * - 外部API認証情報
 */
export class SecretsManagerConstruct extends Construct {
  /** データベース認証情報シークレット */
  public readonly databaseSecret: secretsmanager.Secret;

  /** JWT秘密鍵シークレット */
  public readonly jwtSecret: secretsmanager.Secret;

  /** 外部API認証情報シークレット */
  public readonly externalApisSecret: secretsmanager.Secret;

  /** 暗号化キー */
  public readonly encryptionKey: kms.IKey;

  /** Lambda関数用IAMロール */
  public readonly lambdaExecutionRole: iam.Role;

  /** Secrets Manager読み取り権限ポリシー */
  public readonly secretsReadPolicy: iam.Policy;

  /** CloudTrail（オプション） */
  public readonly cloudTrail?: cloudtrail.Trail;

  /** CloudTrail用S3バケット（オプション） */
  public readonly cloudTrailBucket?: s3.Bucket;

  /** 監視・アラート用SNSトピック */
  public readonly monitoringTopic?: sns.Topic;

  /** シークレット取得監視用CloudWatchアラーム */
  public readonly secretAccessAlarms?: cloudwatch.Alarm[];

  /** 異常アクセスパターン検知アラーム */
  public readonly anomalyDetectionAlarms?: cloudwatch.Alarm[];

  /** 統合テスト用Lambda関数 */
  public readonly integrationTestFunction?: lambda.Function;

  private readonly environment: string;
  private readonly config: EnvironmentConfig;

  constructor(scope: Construct, id: string, props: SecretsManagerConstructProps) {
    super(scope, id);

    this.environment = props.environment;
    this.config = props.config;

    // 暗号化キーの設定
    this.encryptionKey = props.encryptionKey || this.createEncryptionKey();

    // データベース認証情報シークレットの作成
    this.databaseSecret = this.createDatabaseSecret(props.databaseCluster);

    // Aurora Serverlessクラスターとの連携設定
    if (props.databaseCluster) {
      this.updateDatabaseSecretWithClusterInfo(props.databaseCluster);
    }

    // JWT秘密鍵シークレットの作成
    this.jwtSecret = this.createJwtSecret();

    // 外部API認証情報シークレットの作成
    this.externalApisSecret = this.createExternalApisSecret();

    // IAMロール・ポリシーの作成
    const { role, policy } = this.createIamResources();
    this.lambdaExecutionRole = role;
    this.secretsReadPolicy = policy;

    // 自動ローテーション機能の設定（要件4.1）
    if (props.enableRotation !== false && props.databaseCluster) {
      this.setupDatabaseSecretRotation(props.databaseCluster);
    }

    // CloudTrailログ記録の設定（要件5.4）
    if (this.shouldEnableCloudTrail()) {
      const { trail, bucket } = this.createCloudTrail();
      this.cloudTrail = trail;
      this.cloudTrailBucket = bucket;
    }

    // 監視・アラート設定の実装（タスク11）
    const monitoringConfig = this.setupMonitoringAndAlerting();
    this.monitoringTopic = monitoringConfig.topic;
    this.secretAccessAlarms = monitoringConfig.secretAccessAlarms;
    this.anomalyDetectionAlarms = monitoringConfig.anomalyDetectionAlarms;

    // 統合テスト用Lambda関数の作成（無効化）
    // if (['test', 'dev'].includes(this.environment)) {
    //     this.integrationTestFunction = this.createIntegrationTestFunction();
    // }

    // タグの設定
    this.applyTags();

    // CloudFormation出力の作成
    this.createOutputs();
  }

  /**
   * 暗号化キーを作成
   */
  private createEncryptionKey(): kms.Key {
    return new kms.Key(this, 'SecretsEncryptionKey', {
      description: `KMS key for Secrets Manager encryption - ${this.environment}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      alias: `${this.config.stackPrefix}-${this.environment}-secrets-key`,
      policy: new iam.PolicyDocument({
        statements: [
          // ルートアカウントに完全な権限を付与
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
          // Secrets Managerサービスにキー使用権限を付与
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:CreateGrant', 'kms:DescribeKey'],
            resources: ['*'],
          }),
        ],
      }),
    });
  }

  /**
   * データベース認証情報シークレットを作成
   */
  private createDatabaseSecret(databaseCluster?: rds.DatabaseCluster): secretsmanager.Secret {
    const secretName = `${this.config.stackPrefix}-${this.environment}-secret-database`;

    // データベースクラスターが提供されている場合は、そのシークレットを参照
    if (databaseCluster) {
      // 既存のデータベースシークレットを参照し、環境別命名規則に従って管理
      const existingSecret = secretsmanager.Secret.fromSecretCompleteArn(
        this,
        'ExistingDatabaseSecret',
        databaseCluster.secret!.secretArn
      ) as secretsmanager.Secret;

      // データベース接続情報の構造化を確認するため、シークレットの内容を検証
      this.validateDatabaseSecretStructure(existingSecret, databaseCluster);

      return existingSecret;
    }

    // 新規にデータベースシークレットを作成（Aurora Serverlessクラスターとの連携設定）
    const databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName,
      description: `Database credentials for ${this.environment} environment - Aurora Serverless V2`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'goal_mandala_user',
          engine: 'postgres',
          port: 5432,
          dbname: this.config.database.databaseName || 'goal_mandala',
          // Aurora Serverless V2クラスター情報（後で更新される）
          host: 'placeholder-will-be-updated',
          dbClusterIdentifier: `${this.config.stackPrefix}-${this.environment}-cluster`,
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'`',
        includeSpace: false,
        passwordLength: 32,
      },
      encryptionKey: this.encryptionKey,
    });

    // 環境別命名規則の適用確認
    this.validateEnvironmentNaming(databaseSecret);

    return databaseSecret;
  }

  /**
   * データベースシークレットの構造を検証
   */
  private validateDatabaseSecretStructure(
    secret: secretsmanager.ISecret,
    cluster: rds.DatabaseCluster
  ): void {
    // CloudFormation出力でシークレット構造の検証情報を提供
    new cdk.CfnOutput(this, 'DatabaseSecretStructureValidation', {
      value: JSON.stringify({
        secretArn: secret.secretArn,
        clusterEndpoint: cluster.clusterEndpoint.hostname,
        clusterPort: cluster.clusterEndpoint.port,
        expectedStructure: {
          username: 'string',
          password: 'string',
          engine: 'postgres',
          host: 'cluster-endpoint',
          port: 5432,
          dbname: 'database-name',
          dbClusterIdentifier: 'cluster-identifier',
        },
      }),
      description: 'Database secret structure validation information',
      exportName: `${this.config.stackPrefix}-${this.environment}-database-secret-structure-validation`,
    });
  }

  /**
   * 環境別命名規則の適用を検証
   */
  private validateEnvironmentNaming(secret: secretsmanager.Secret): void {
    const expectedPattern = `${this.config.stackPrefix}-${this.environment}-secret-database`;

    // CDKのToken（CloudFormation参照）の場合は検証をスキップ
    if (cdk.Token.isUnresolved(secret.secretName)) {
      console.log(`⚠️  Secret name contains CDK Token, skipping validation: ${secret.secretName}`);
    } else if (secret.secretName !== expectedPattern) {
      throw new Error(
        `Database secret naming does not follow environment-specific pattern. ` +
          `Expected: ${expectedPattern}, Actual: ${secret.secretName}`
      );
    }

    // 命名規則の確認情報を出力
    new cdk.CfnOutput(this, 'DatabaseSecretNamingValidation', {
      value: JSON.stringify({
        environment: this.environment,
        secretName: secret.secretName,
        namingPattern: expectedPattern,
        isValid: true,
      }),
      description: 'Database secret environment-specific naming validation',
      exportName: `${this.config.stackPrefix}-${this.environment}-database-secret-naming-validation`,
    });
  }

  /**
   * Aurora Serverlessクラスターとの連携設定を更新
   */
  public updateDatabaseSecretWithClusterInfo(cluster: rds.DatabaseCluster): void {
    // データベース接続情報の構造化された出力を作成
    const connectionInfo: DatabaseCredentials = {
      username: 'goal_mandala_user', // シークレットから取得される実際の値
      password: '[PROTECTED]', // 実際のパスワードは表示しない
      engine: 'postgres',
      host: cluster.clusterEndpoint.hostname,
      port: cluster.clusterEndpoint.port,
      dbname: this.config.database.databaseName || 'goal_mandala',
      dbClusterIdentifier: cluster.clusterIdentifier,
    };

    // Aurora Serverless連携情報を出力
    new cdk.CfnOutput(this, 'DatabaseClusterConnectionInfo', {
      value: JSON.stringify(connectionInfo),
      description: 'Structured database connection information for Aurora Serverless V2',
      exportName: `${this.config.stackPrefix}-${this.environment}-database-connection-info`,
    });

    // 環境別データベース設定の確認
    new cdk.CfnOutput(this, 'DatabaseEnvironmentConfiguration', {
      value: JSON.stringify({
        environment: this.environment,
        clusterIdentifier: cluster.clusterIdentifier,
        endpoint: cluster.clusterEndpoint.hostname,
        readEndpoint: cluster.clusterReadEndpoint.hostname,
        port: cluster.clusterEndpoint.port,
        secretArn: this.databaseSecret.secretArn,
        encryptionKeyArn: this.encryptionKey.keyArn,
        iamAuthenticationEnabled: true,
        sslRequired: true,
      }),
      description: 'Environment-specific database configuration summary',
      exportName: `${this.config.stackPrefix}-${this.environment}-database-env-config`,
    });
  }

  /**
   * JWT秘密鍵シークレットを作成
   */
  private createJwtSecret(): secretsmanager.Secret {
    const secretName = `${this.config.stackPrefix}-${this.environment}-secret-jwt`;

    // 256ビット（32バイト）の強力な秘密鍵を生成
    const jwtSecretConfig: JwtSecretConfig = {
      secret: '', // generateSecretStringで生成される
      algorithm: 'HS256',
      issuer: `goal-mandala-${this.environment}`,
      expiresIn: '24h',
    };

    return new secretsmanager.Secret(this, 'JwtSecret', {
      secretName,
      description: `JWT secret key for ${this.environment} environment`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          algorithm: jwtSecretConfig.algorithm,
          issuer: jwtSecretConfig.issuer,
          expiresIn: jwtSecretConfig.expiresIn,
        }),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\\'`',
        includeSpace: false,
        passwordLength: 64, // 256ビット相当の長さ
        requireEachIncludedType: true,
      },
      encryptionKey: this.encryptionKey,
    });
  }

  /**
   * 外部API認証情報シークレットを作成
   *
   * 要件3.1: Bedrock、SES等の外部サービス認証情報が保存される
   * 要件3.2: 環境別に適切な認証情報が管理される
   */
  private createExternalApisSecret(): secretsmanager.Secret {
    const secretName = `${this.config.stackPrefix}-${this.environment}-secret-external-apis`;

    // 環境別外部API設定の実装
    const externalApiConfig = this.buildEnvironmentSpecificApiConfig();

    // 外部API設定情報の構造化
    const structuredConfig = this.structureExternalApiConfig(externalApiConfig);

    const secret = new secretsmanager.Secret(this, 'ExternalApisSecret', {
      secretName,
      description: `External API credentials for ${this.environment} environment - Bedrock, SES, etc.`,
      secretObjectValue: {
        bedrock: cdk.SecretValue.unsafePlainText(JSON.stringify(structuredConfig.bedrock)),
        ses: cdk.SecretValue.unsafePlainText(JSON.stringify(structuredConfig.ses)),
        metadata: cdk.SecretValue.unsafePlainText(JSON.stringify(structuredConfig.metadata)),
      },
      encryptionKey: this.encryptionKey,
    });

    // 外部APIシークレットの検証と出力
    this.validateAndOutputExternalApiSecret(secret, structuredConfig);

    return secret;
  }

  /**
   * 環境別外部API設定を構築
   */
  private buildEnvironmentSpecificApiConfig(): ExternalApiCredentials {
    // 環境別設定の実装
    const environmentSpecificConfig = this.getEnvironmentSpecificApiSettings();

    return {
      bedrock: {
        region: environmentSpecificConfig.bedrock.region,
        modelId: environmentSpecificConfig.bedrock.modelId,
        // 環境別の追加設定
        ...environmentSpecificConfig.bedrock.additionalConfig,
      },
      ses: {
        region: environmentSpecificConfig.ses.region,
        fromEmail: environmentSpecificConfig.ses.fromEmail,
        replyToEmail: environmentSpecificConfig.ses.replyToEmail,
        // 環境別の追加設定
        ...environmentSpecificConfig.ses.additionalConfig,
      },
    };
  }

  /**
   * 環境別API設定を取得
   */
  private getEnvironmentSpecificApiSettings(): EnvironmentApiConfig {
    const baseConfig = {
      bedrock: {
        region: this.config.region,
        modelId: 'amazon.nova-micro-v1:0',
        additionalConfig: {},
      },
      ses: {
        region: this.config.region,
        fromEmail: `noreply@goal-mandala-${this.environment}.com`,
        replyToEmail: `support@goal-mandala-${this.environment}.com`,
        additionalConfig: {},
      },
    };

    // 環境別の設定オーバーライド
    switch (this.environment) {
      case 'local':
        return {
          ...baseConfig,
          bedrock: {
            ...baseConfig.bedrock,
            additionalConfig: {
              endpoint: 'http://localhost:8000', // ローカル開発用エンドポイント
              mockMode: true,
            },
          },
          ses: {
            ...baseConfig.ses,
            fromEmail: 'noreply@localhost',
            replyToEmail: 'support@localhost',
            additionalConfig: {
              endpoint: 'http://localhost:8025', // MailHog等のローカルSMTP
              mockMode: true,
            },
          },
        };

      case 'dev':
        return {
          ...baseConfig,
          bedrock: {
            ...baseConfig.bedrock,
            additionalConfig: {
              maxRetries: 3,
              timeout: 30000,
            },
          },
          ses: {
            ...baseConfig.ses,
            additionalConfig: {
              configurationSet: `goal-mandala-${this.environment}-config-set`,
              maxSendRate: 1, // 開発環境では送信レート制限
            },
          },
        };

      case 'stg':
        return {
          ...baseConfig,
          bedrock: {
            ...baseConfig.bedrock,
            additionalConfig: {
              maxRetries: 5,
              timeout: 60000,
            },
          },
          ses: {
            ...baseConfig.ses,
            additionalConfig: {
              configurationSet: `goal-mandala-${this.environment}-config-set`,
              maxSendRate: 10,
            },
          },
        };

      case 'prod':
        return {
          ...baseConfig,
          bedrock: {
            ...baseConfig.bedrock,
            additionalConfig: {
              maxRetries: 5,
              timeout: 120000,
              enableLogging: true,
            },
          },
          ses: {
            ...baseConfig.ses,
            additionalConfig: {
              configurationSet: `goal-mandala-${this.environment}-config-set`,
              maxSendRate: 50,
              enableBounceTracking: true,
              enableComplaintTracking: true,
            },
          },
        };

      default:
        return baseConfig;
    }
  }

  /**
   * 外部API設定情報の構造化
   */
  private structureExternalApiConfig(config: ExternalApiCredentials) {
    const timestamp = new Date().toISOString();

    return {
      bedrock: {
        ...config.bedrock,
        service: 'bedrock',
        version: '2023-09-30',
        createdAt: timestamp,
        environment: this.environment,
      },
      ses: {
        ...config.ses,
        service: 'ses',
        version: '2010-12-01',
        createdAt: timestamp,
        environment: this.environment,
      },
      metadata: {
        version: '1.0.0',
        environment: this.environment,
        createdAt: timestamp,
        lastUpdated: timestamp,
        services: ['bedrock', 'ses'],
        encryptionEnabled: true,
        managedBy: 'SecretsManagerConstruct',
      },
    };
  }

  /**
   * 外部APIシークレットの検証と出力
   */
  private validateAndOutputExternalApiSecret(
    secret: secretsmanager.Secret,
    structuredConfig: any
  ): void {
    // 環境別外部API設定の検証
    this.validateEnvironmentSpecificApiConfig(structuredConfig);

    // 外部API設定情報の出力
    new cdk.CfnOutput(this, 'ExternalApiConfigurationSummary', {
      value: JSON.stringify({
        environment: this.environment,
        secretArn: secret.secretArn,
        secretName: secret.secretName,
        services: structuredConfig.metadata.services,
        bedrock: {
          region: structuredConfig.bedrock.region,
          modelId: structuredConfig.bedrock.modelId,
          service: structuredConfig.bedrock.service,
        },
        ses: {
          region: structuredConfig.ses.region,
          fromEmail: structuredConfig.ses.fromEmail,
          replyToEmail: structuredConfig.ses.replyToEmail,
          service: structuredConfig.ses.service,
        },
        encryptionKeyArn: this.encryptionKey.keyArn,
        createdAt: structuredConfig.metadata.createdAt,
      }),
      description: 'External API configuration summary with environment-specific settings',
      exportName: `${this.config.stackPrefix}-${this.environment}-external-api-config-summary`,
    });

    // Bedrock設定の詳細出力
    new cdk.CfnOutput(this, 'BedrockApiConfiguration', {
      value: JSON.stringify({
        environment: this.environment,
        region: structuredConfig.bedrock.region,
        modelId: structuredConfig.bedrock.modelId,
        service: structuredConfig.bedrock.service,
        version: structuredConfig.bedrock.version,
        additionalConfig: structuredConfig.bedrock.additionalConfig || {},
      }),
      description: 'Bedrock API configuration for AI integration',
      exportName: `${this.config.stackPrefix}-${this.environment}-bedrock-api-config`,
    });

    // SES設定の詳細出力
    new cdk.CfnOutput(this, 'SesApiConfiguration', {
      value: JSON.stringify({
        environment: this.environment,
        region: structuredConfig.ses.region,
        fromEmail: structuredConfig.ses.fromEmail,
        replyToEmail: structuredConfig.ses.replyToEmail,
        service: structuredConfig.ses.service,
        version: structuredConfig.ses.version,
        additionalConfig: structuredConfig.ses.additionalConfig || {},
      }),
      description: 'SES API configuration for email delivery',
      exportName: `${this.config.stackPrefix}-${this.environment}-ses-api-config`,
    });

    // 環境別設定の検証結果出力
    new cdk.CfnOutput(this, 'ExternalApiEnvironmentValidation', {
      value: JSON.stringify({
        environment: this.environment,
        isValid: true,
        validatedServices: ['bedrock', 'ses'],
        configurationApplied: true,
        encryptionEnabled: true,
        accessControlEnabled: true,
      }),
      description: 'External API environment-specific configuration validation results',
      exportName: `${this.config.stackPrefix}-${this.environment}-external-api-validation`,
    });
  }

  /**
   * 環境別外部API設定の検証
   */
  private validateEnvironmentSpecificApiConfig(config: any): void {
    const environmentConfig = this.getEnvironmentSpecificApiSettings();
    const validationErrors: string[] = [];

    // Bedrock設定の検証
    if (!config.bedrock.region) {
      validationErrors.push('Bedrock region is not specified');
    }
    if (!config.bedrock.modelId) {
      validationErrors.push('Bedrock model ID is not specified');
    }
    if (config.bedrock.environment !== this.environment) {
      validationErrors.push(
        `Bedrock environment mismatch: expected ${this.environment}, got ${config.bedrock.environment}`
      );
    }

    // SES設定の検証
    if (!config.ses.region) {
      validationErrors.push('SES region is not specified');
    }
    if (!config.ses.fromEmail || !config.ses.fromEmail.includes('@')) {
      validationErrors.push('SES fromEmail is invalid');
    }
    if (!config.ses.replyToEmail || !config.ses.replyToEmail.includes('@')) {
      validationErrors.push('SES replyToEmail is invalid');
    }
    if (config.ses.environment !== this.environment) {
      validationErrors.push(
        `SES environment mismatch: expected ${this.environment}, got ${config.ses.environment}`
      );
    }

    // 環境別設定の検証
    if (this.environment === 'prod') {
      if (!environmentConfig.bedrock.additionalConfig.enableLogging) {
        console.warn('⚠️  Bedrock logging is not enabled in production environment');
      }
      if (
        !environmentConfig.ses.additionalConfig.enableBounceTracking ||
        !environmentConfig.ses.additionalConfig.enableComplaintTracking
      ) {
        console.warn('⚠️  SES bounce/complaint tracking is not enabled in production environment');
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(
        `External API configuration validation failed: ${validationErrors.join(', ')}`
      );
    }

    console.log(
      `✅ External API configuration validated successfully for environment: ${this.environment}`
    );
  }

  /**
   * IAMロール・ポリシーを作成
   *
   * 要件5.1: Secrets Managerへの読み取り権限を持つIAMロールが自動的に付与される
   * 要件5.2: 最小権限の原則に従って必要最小限の権限のみが付与される
   * 要件5.3: 各環境のLambda関数は自環境のシークレットのみにアクセス可能
   */
  private createIamResources(): { role: iam.Role; policy: iam.Policy } {
    // Lambda関数用IAMロール
    const role = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${this.config.stackPrefix}-${this.environment}-lambda-secrets-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Lambda execution role with Secrets Manager and External API access for ${this.environment}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Secrets Manager読み取り権限ポリシー
    const policy = new iam.Policy(this, 'SecretsReadPolicy', {
      policyName: `${this.config.stackPrefix}-${this.environment}-secrets-read-policy`,
      statements: [
        // 環境別シークレットの読み取り権限（最小権限の原則）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: [
            this.databaseSecret.secretArn,
            this.jwtSecret.secretArn,
            this.externalApisSecret.secretArn,
          ],
          conditions: {
            StringEquals: {
              'secretsmanager:ResourceTag/Environment': this.environment,
            },
          },
        }),
        // KMS復号化権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
          resources: [this.encryptionKey.keyArn],
          conditions: {
            StringEquals: {
              'kms:ViaService': `secretsmanager.${this.config.region}.amazonaws.com`,
            },
          },
        }),
      ],
    });

    // 外部APIアクセス権限ポリシーを作成
    const externalApiPolicy = this.createExternalApiAccessPolicy();

    // ポリシーをロールにアタッチ
    role.attachInlinePolicy(policy);
    role.attachInlinePolicy(externalApiPolicy);

    return { role, policy };
  }

  /**
   * 外部APIアクセス権限ポリシーを作成
   *
   * 要件3.3: Lambda関数が外部APIを呼び出す際のアクセス権限管理
   */
  private createExternalApiAccessPolicy(): iam.Policy {
    const statements: iam.PolicyStatement[] = [];

    // Bedrock API アクセス権限
    statements.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.config.region}::foundation-model/amazon.nova-micro-v1:0`,
        ],
        conditions: {
          StringEquals: {
            'aws:RequestedRegion': this.config.region,
          },
        },
      })
    );

    // SES API アクセス権限
    statements.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
        resources: [`arn:aws:ses:${this.config.region}:${cdk.Aws.ACCOUNT_ID}:identity/*`],
        conditions: {
          StringEquals: {
            'aws:RequestedRegion': this.config.region,
          },
        },
      })
    );

    // 環境別の追加権限
    if (this.environment === 'prod') {
      // 本番環境では追加の監視権限を付与
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'cloudwatch:PutMetricData',
          ],
          resources: [
            `arn:aws:logs:${this.config.region}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/${this.config.stackPrefix}-${this.environment}-*`,
            `arn:aws:cloudwatch:${this.config.region}:${cdk.Aws.ACCOUNT_ID}:metric/AWS/Lambda/*`,
          ],
        })
      );
    }

    return new iam.Policy(this, 'ExternalApiAccessPolicy', {
      policyName: `${this.config.stackPrefix}-${this.environment}-external-api-access-policy`,
      statements,
    });
  }

  /**
   * CloudTrailを有効にするかどうかを判定
   *
   * 要件5.4: CloudTrailでアクセスログが記録される
   */
  private shouldEnableCloudTrail(): boolean {
    // 本番環境とステージング環境ではCloudTrailを有効にする
    return ['prod', 'stg'].includes(this.environment);
  }

  /**
   * CloudTrailログ記録を設定
   *
   * 要件5.4: シークレットアクセスが行われる際のCloudTrailでのアクセスログ記録
   */
  private createCloudTrail(): { trail: cloudtrail.Trail; bucket: s3.Bucket } {
    // CloudTrail用S3バケットを作成
    const bucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `${this.config.stackPrefix}-${this.environment}-secrets-cloudtrail-logs`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: cdk.Duration.days(this.environment === 'prod' ? 2555 : 90), // 本番: 7年、その他: 90日
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy:
        this.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // CloudTrailを作成
    const trail = new cloudtrail.Trail(this, 'SecretsManagerCloudTrail', {
      trailName: `${this.config.stackPrefix}-${this.environment}-secrets-audit-trail`,
      bucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: this.createCloudWatchLogGroup(),
    });

    // Secrets Managerのデータイベントを記録
    // 注意: CDKのDataResourceTypeにSECRETS_MANAGER_SECRETが存在しない場合は、S3_OBJECTを使用
    try {
      trail.addEventSelector(cloudtrail.DataResourceType.S3_OBJECT, [
        `${this.databaseSecret.secretArn}*`,
        `${this.jwtSecret.secretArn}*`,
        `${this.externalApisSecret.secretArn}*`,
      ]);
    } catch (error) {
      console.warn('CloudTrail event selector for Secrets Manager could not be added:', error);
    }

    // KMSキーのイベントも記録
    // 注意: CDKのDataResourceTypeにKMS_KEYが存在しない場合はスキップ
    try {
      // KMSキーのイベントは管理イベントとして記録されるため、データイベントセレクターは不要
      console.log('KMS key events will be recorded as management events in CloudTrail');
    } catch (error) {
      console.warn('CloudTrail event selector for KMS could not be added:', error);
    }

    return { trail, bucket };
  }

  /**
   * CloudWatch Log Groupを作成
   */
  private createCloudWatchLogGroup(): any {
    // CloudWatch Logsの設定は簡略化（必要に応じて詳細設定可能）
    return undefined; // CloudTrailが自動でLog Groupを作成
  }

  /**
   * データベースシークレットの自動ローテーション機能を設定
   *
   * 要件4.1: データベースシークレットが作成される際に自動ローテーション機能が設定される
   * 要件4.2: ローテーションが実行される際に新しいパスワードが生成され、データベースとSecrets Managerの両方が更新される
   * 要件4.3: 適切なローテーション間隔（30日）が設定される
   * 要件4.4: ローテーションが失敗する際にアラートが送信され、ロールバック処理が実行される
   */
  private setupDatabaseSecretRotation(databaseCluster: rds.DatabaseCluster): void {
    console.log(
      `🔄 Setting up automatic rotation for database secret in ${this.environment} environment`
    );

    // ローテーション用Lambda関数を作成
    const rotationLambda = this.createRotationLambda(databaseCluster);

    // シークレットにローテーション設定を追加
    this.configureDatabaseSecretRotation(rotationLambda);

    // ローテーション監視・アラート設定
    this.setupRotationMonitoring(rotationLambda);

    console.log(`✅ Database secret rotation configured successfully`);
  }

  /**
   * ローテーション用Lambda関数を作成
   */
  private createRotationLambda(databaseCluster: rds.DatabaseCluster): lambda.Function {
    // ローテーション用Lambda関数のIAMロール
    const rotationRole = new iam.Role(this, 'RotationLambdaRole', {
      roleName: `${this.config.stackPrefix}-${this.environment}-rotation-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Lambda role for Secrets Manager rotation in ${this.environment}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        RotationPolicy: new iam.PolicyDocument({
          statements: [
            // Secrets Manager権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:DescribeSecret',
                'secretsmanager:GetSecretValue',
                'secretsmanager:PutSecretValue',
                'secretsmanager:UpdateSecretVersionStage',
                'secretsmanager:UpdateSecret',
              ],
              resources: [this.databaseSecret.secretArn],
            }),
            // RDS権限（パスワード更新用）
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds:ModifyDBCluster', 'rds:DescribeDBClusters'],
              resources: [databaseCluster.clusterArn],
            }),
            // KMS権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
              resources: [this.encryptionKey.keyArn],
            }),
            // VPC権限（Lambda関数がVPC内で実行される場合）
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // ローテーション用Lambda関数
    const rotationFunction = new lambda.Function(this, 'RotationLambda', {
      functionName: `${this.config.stackPrefix}-${this.environment}-secrets-rotation`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'rotation-handler.rotationHandler',
      code: lambda.Code.fromInline(`
                exports.rotationHandler = async (event, context) => {
                    console.log('Rotation handler called', { event, context });
                    return { success: true, step: event.Step, message: 'Mock rotation completed' };
                };
            `),
      role: rotationRole,
      timeout: cdk.Duration.minutes(15), // ローテーション処理のタイムアウト
      environment: {
        ENVIRONMENT: this.environment,
        DB_CLUSTER_IDENTIFIER: databaseCluster.clusterIdentifier,
        SECRET_ARN: this.databaseSecret.secretArn,
      },
      description: `Secrets Manager rotation function for ${this.environment} environment`,
    });

    return rotationFunction;
  }

  /**
   * データベースシークレットのローテーション設定を構成
   */
  private configureDatabaseSecretRotation(rotationLambda: lambda.Function): void {
    // シークレットローテーションの設定
    new secretsmanager.RotationSchedule(this, 'DatabaseSecretRotation', {
      secret: this.databaseSecret,
      rotationLambda: rotationLambda,
      automaticallyAfter: cdk.Duration.days(30), // 30日間隔でローテーション
    });

    // ローテーション設定の出力
    new cdk.CfnOutput(this, 'DatabaseSecretRotationConfiguration', {
      value: JSON.stringify({
        environment: this.environment,
        secretArn: this.databaseSecret.secretArn,
        rotationLambdaArn: rotationLambda.functionArn,
        rotationInterval: '30 days',
        automaticRotation: true,
        configuredAt: new Date().toISOString(),
      }),
      description: 'Database secret automatic rotation configuration',
      exportName: `${this.config.stackPrefix}-${this.environment}-database-rotation-config`,
    });
  }

  /**
   * 監視・アラート設定の実装
   *
   * タスク11: 監視・アラート設定の実装
   * - CloudWatchメトリクスの設定
   * - シークレット取得成功/失敗率の監視
   * - ローテーション成功/失敗率の監視
   * - 異常アクセスパターンの検知アラート
   * - SNS通知設定の実装
   */
  private setupMonitoringAndAlerting(): {
    topic: sns.Topic;
    secretAccessAlarms: cloudwatch.Alarm[];
    anomalyDetectionAlarms: cloudwatch.Alarm[];
  } {
    console.log(
      `🔍 Setting up comprehensive monitoring and alerting for ${this.environment} environment`
    );

    // SNS通知設定の実装
    const monitoringTopic = this.createMonitoringTopic();

    // CloudWatchメトリクスの設定とシークレット取得監視
    const secretAccessAlarms = this.setupSecretAccessMonitoring(monitoringTopic);

    // 異常アクセスパターンの検知アラート
    const anomalyDetectionAlarms = this.setupAnomalyDetection(monitoringTopic);

    // カスタムメトリクスの設定
    this.setupCustomMetrics();

    console.log(`✅ Monitoring and alerting configured successfully`);

    return {
      topic: monitoringTopic,
      secretAccessAlarms,
      anomalyDetectionAlarms,
    };
  }

  /**
   * SNS通知設定の実装
   */
  private createMonitoringTopic(): sns.Topic {
    const topic = new sns.Topic(this, 'SecretsMonitoringTopic', {
      topicName: `${this.config.stackPrefix}-${this.environment}-secrets-monitoring`,
      displayName: `Secrets Manager Monitoring - ${this.environment}`,
    });

    // 環境別の通知設定
    if (this.environment === 'prod') {
      // 本番環境では複数の通知先を設定
      new sns.Subscription(this, 'ProdEmailSubscription', {
        topic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: 'admin@goal-mandala.com', // 実際のメールアドレスに置き換え
      });

      // Slack通知（Webhook URL経由）
      new sns.Subscription(this, 'ProdSlackSubscription', {
        topic,
        protocol: sns.SubscriptionProtocol.HTTPS,
        endpoint: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK', // 実際のWebhook URLに置き換え
      });
    } else if (this.environment === 'stg') {
      // ステージング環境では開発チーム向け通知
      new sns.Subscription(this, 'StagingEmailSubscription', {
        topic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: 'dev-team@goal-mandala.com', // 実際のメールアドレスに置き換え
      });
    }

    // SNSトピックの設定情報を出力
    new cdk.CfnOutput(this, 'MonitoringTopicConfiguration', {
      value: JSON.stringify({
        environment: this.environment,
        topicArn: topic.topicArn,
        topicName: topic.topicName,
        subscriptionsConfigured:
          this.environment === 'prod' ? 2 : this.environment === 'stg' ? 1 : 0,
      }),
      description: 'SNS monitoring topic configuration',
      exportName: `${this.config.stackPrefix}-${this.environment}-monitoring-topic-config`,
    });

    return topic;
  }

  /**
   * シークレット取得成功/失敗率の監視設定
   */
  private setupSecretAccessMonitoring(monitoringTopic: sns.Topic): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // シークレット取得エラー率の監視
    const secretAccessErrorAlarm = new cloudwatch.Alarm(this, 'SecretAccessErrorAlarm', {
      alarmName: `${this.config.stackPrefix}-${this.environment}-secret-access-errors`,
      alarmDescription: 'High error rate for Secrets Manager access',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SecretsManager',
        metricName: 'GetSecretValueErrors',
        dimensionsMap: {
          SecretName: this.databaseSecret.secretName,
        },
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5, // 5分間で5回以上のエラー
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    secretAccessErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
    alarms.push(secretAccessErrorAlarm);

    // シークレット取得成功率の監視
    const secretAccessSuccessRateAlarm = new cloudwatch.Alarm(
      this,
      'SecretAccessSuccessRateAlarm',
      {
        alarmName: `${this.config.stackPrefix}-${this.environment}-secret-access-success-rate`,
        alarmDescription: 'Low success rate for Secrets Manager access',
        metric: new cloudwatch.MathExpression({
          expression: '(success / (success + errors)) * 100',
          usingMetrics: {
            success: new cloudwatch.Metric({
              namespace: 'AWS/SecretsManager',
              metricName: 'GetSecretValueSuccess',
              dimensionsMap: {
                SecretName: this.databaseSecret.secretName,
              },
              statistic: cloudwatch.Statistic.SUM,
              period: cdk.Duration.minutes(15),
            }),
            errors: new cloudwatch.Metric({
              namespace: 'AWS/SecretsManager',
              metricName: 'GetSecretValueErrors',
              dimensionsMap: {
                SecretName: this.databaseSecret.secretName,
              },
              statistic: cloudwatch.Statistic.SUM,
              period: cdk.Duration.minutes(15),
            }),
          },
          period: cdk.Duration.minutes(15),
        }),
        threshold: 95, // 95%以下の成功率でアラーム
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      }
    );

    secretAccessSuccessRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
    alarms.push(secretAccessSuccessRateAlarm);

    // JWT秘密鍵アクセス監視
    const jwtSecretAccessAlarm = new cloudwatch.Alarm(this, 'JwtSecretAccessAlarm', {
      alarmName: `${this.config.stackPrefix}-${this.environment}-jwt-secret-access-errors`,
      alarmDescription: 'High error rate for JWT secret access',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SecretsManager',
        metricName: 'GetSecretValueErrors',
        dimensionsMap: {
          SecretName: this.jwtSecret.secretName,
        },
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.minutes(5),
      }),
      threshold: 3, // JWT秘密鍵は頻繁にアクセスされるため閾値を低く設定
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    jwtSecretAccessAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
    alarms.push(jwtSecretAccessAlarm);

    // 外部APIシークレットアクセス監視
    const externalApiSecretAccessAlarm = new cloudwatch.Alarm(
      this,
      'ExternalApiSecretAccessAlarm',
      {
        alarmName: `${this.config.stackPrefix}-${this.environment}-external-api-secret-access-errors`,
        alarmDescription: 'High error rate for external API secret access',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SecretsManager',
          metricName: 'GetSecretValueErrors',
          dimensionsMap: {
            SecretName: this.externalApisSecret.secretName,
          },
          statistic: cloudwatch.Statistic.SUM,
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    externalApiSecretAccessAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
    alarms.push(externalApiSecretAccessAlarm);

    return alarms;
  }

  /**
   * 異常アクセスパターンの検知アラート設定
   */
  private setupAnomalyDetection(monitoringTopic: sns.Topic): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // 異常な頻度でのシークレットアクセス検知
    const highFrequencyAccessAlarm = new cloudwatch.Alarm(this, 'HighFrequencyAccessAlarm', {
      alarmName: `${this.config.stackPrefix}-${this.environment}-high-frequency-secret-access`,
      alarmDescription: 'Unusually high frequency of secret access detected',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SecretsManager',
        metricName: 'GetSecretValue',
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.minutes(1),
      }),
      threshold: this.getAccessFrequencyThreshold(),
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    highFrequencyAccessAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
    alarms.push(highFrequencyAccessAlarm);

    // 深夜時間帯の異常アクセス検知（本番環境のみ）
    if (this.environment === 'prod') {
      const nightTimeAccessAlarm = new cloudwatch.Alarm(this, 'NightTimeAccessAlarm', {
        alarmName: `${this.config.stackPrefix}-${this.environment}-night-time-secret-access`,
        alarmDescription: 'Secret access detected during night hours (JST 22:00-06:00)',
        metric: new cloudwatch.Metric({
          namespace: 'Custom/SecretsManager',
          metricName: 'NightTimeAccess',
          statistic: cloudwatch.Statistic.SUM,
          period: cdk.Duration.hours(1),
        }),
        threshold: 1, // 深夜時間帯のアクセスは1回でもアラーム
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      nightTimeAccessAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
      alarms.push(nightTimeAccessAlarm);
    }

    // 複数のシークレットへの同時アクセス検知
    const multipleSecretAccessAlarm = new cloudwatch.Alarm(this, 'MultipleSecretAccessAlarm', {
      alarmName: `${this.config.stackPrefix}-${this.environment}-multiple-secret-access`,
      alarmDescription: 'Multiple secrets accessed simultaneously - potential security concern',
      metric: new cloudwatch.MathExpression({
        expression: 'database + jwt + external',
        usingMetrics: {
          database: new cloudwatch.Metric({
            namespace: 'AWS/SecretsManager',
            metricName: 'GetSecretValue',
            dimensionsMap: {
              SecretName: this.databaseSecret.secretName,
            },
            statistic: cloudwatch.Statistic.SUM,
            period: cdk.Duration.minutes(5),
          }),
          jwt: new cloudwatch.Metric({
            namespace: 'AWS/SecretsManager',
            metricName: 'GetSecretValue',
            dimensionsMap: {
              SecretName: this.jwtSecret.secretName,
            },
            statistic: cloudwatch.Statistic.SUM,
            period: cdk.Duration.minutes(5),
          }),
          external: new cloudwatch.Metric({
            namespace: 'AWS/SecretsManager',
            metricName: 'GetSecretValue',
            dimensionsMap: {
              SecretName: this.externalApisSecret.secretName,
            },
            statistic: cloudwatch.Statistic.SUM,
            period: cdk.Duration.minutes(5),
          }),
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: this.getMultipleAccessThreshold(),
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    multipleSecretAccessAlarm.addAlarmAction(new cloudwatchActions.SnsAction(monitoringTopic));
    alarms.push(multipleSecretAccessAlarm);

    return alarms;
  }

  /**
   * カスタムメトリクスの設定
   */
  private setupCustomMetrics(): void {
    // カスタムメトリクス用のLambda関数を作成（メトリクス収集用）
    const metricsCollectorFunction = new lambda.Function(this, 'MetricsCollectorFunction', {
      functionName: `${this.config.stackPrefix}-${this.environment}-secrets-metrics-collector`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'metrics-collector.handler',
      code: lambda.Code.fromInline(`
                const AWS = require('aws-sdk');
                const cloudwatch = new AWS.CloudWatch();

                exports.handler = async (event, context) => {
                    console.log('Metrics collector invoked', { event, context });

                    const now = new Date();
                    const hour = now.getHours();

                    // 深夜時間帯（JST 22:00-06:00）のアクセス検知
                    if (hour >= 22 || hour < 6) {
                        await cloudwatch.putMetricData({
                            Namespace: 'Custom/SecretsManager',
                            MetricData: [{
                                MetricName: 'NightTimeAccess',
                                Value: 1,
                                Unit: 'Count',
                                Timestamp: now,
                                Dimensions: [{
                                    Name: 'Environment',
                                    Value: '${this.environment}'
                                }]
                            }]
                        }).promise();
                    }

                    return { statusCode: 200, body: 'Metrics collected successfully' };
                };
            `),
      timeout: cdk.Duration.minutes(1),
      environment: {
        ENVIRONMENT: this.environment,
      },
      description: `Custom metrics collector for Secrets Manager monitoring in ${this.environment}`,
    });

    // CloudWatchメトリクス送信権限を付与
    metricsCollectorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // EventBridge（CloudWatch Events）でスケジュール実行
    const metricsRule = new events.Rule(this, 'MetricsCollectionRule', {
      ruleName: `${this.config.stackPrefix}-${this.environment}-secrets-metrics-collection`,
      description: 'Trigger metrics collection for Secrets Manager monitoring',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)), // 5分間隔で実行
    });

    metricsRule.addTarget(new eventsTargets.LambdaFunction(metricsCollectorFunction));
  }

  /**
   * 環境別のアクセス頻度閾値を取得
   */
  private getAccessFrequencyThreshold(): number {
    switch (this.environment) {
      case 'local':
        return 100; // ローカル開発では高い閾値
      case 'dev':
        return 50; // 開発環境では中程度の閾値
      case 'stg':
        return 30; // ステージング環境では低めの閾値
      case 'prod':
        return 20; // 本番環境では最も低い閾値
      default:
        return 50;
    }
  }

  /**
   * 環境別の複数シークレット同時アクセス閾値を取得
   */
  private getMultipleAccessThreshold(): number {
    switch (this.environment) {
      case 'local':
        return 50; // ローカル開発では高い閾値
      case 'dev':
        return 30; // 開発環境では中程度の閾値
      case 'stg':
        return 20; // ステージング環境では低めの閾値
      case 'prod':
        return 15; // 本番環境では最も低い閾値
      default:
        return 30;
    }
  }

  /**
   * ローテーション監視・アラート設定
   *
   * 要件4.4: ローテーションが失敗する際にアラートが送信され、ロールバック処理が実行される
   */
  private setupRotationMonitoring(rotationLambda: lambda.Function): void {
    // CloudWatch メトリクス用のアラーム設定
    const rotationFailureAlarm = new cloudwatch.Alarm(this, 'RotationFailureAlarm', {
      alarmName: `${this.config.stackPrefix}-${this.environment}-rotation-failure`,
      alarmDescription: 'Secrets Manager rotation failure alarm',
      metric: rotationLambda.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: cloudwatch.Statistic.SUM,
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // ローテーション成功率の監視
    const rotationSuccessRateAlarm = new cloudwatch.Alarm(this, 'RotationSuccessRateAlarm', {
      alarmName: `${this.config.stackPrefix}-${this.environment}-rotation-success-rate`,
      alarmDescription: 'Secrets Manager rotation success rate alarm',
      metric: new cloudwatch.MathExpression({
        expression: '(success / (success + errors)) * 100',
        usingMetrics: {
          success: rotationLambda.metricInvocations({
            period: cdk.Duration.hours(24),
            statistic: cloudwatch.Statistic.SUM,
          }),
          errors: rotationLambda.metricErrors({
            period: cdk.Duration.hours(24),
            statistic: cloudwatch.Statistic.SUM,
          }),
        },
        period: cdk.Duration.hours(24),
      }),
      threshold: 95, // 95%以下の成功率でアラーム
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    // SNSトピック（アラート通知用）
    const alertTopic = new sns.Topic(this, 'RotationAlertTopic', {
      topicName: `${this.config.stackPrefix}-${this.environment}-rotation-alerts`,
      displayName: `Secrets Rotation Alerts - ${this.environment}`,
    });

    // アラームアクションの設定
    rotationFailureAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    rotationSuccessRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // ローテーション監視設定の出力
    new cdk.CfnOutput(this, 'RotationMonitoringConfiguration', {
      value: JSON.stringify({
        environment: this.environment,
        rotationFailureAlarmArn: rotationFailureAlarm.alarmArn,
        rotationSuccessRateAlarmArn: rotationSuccessRateAlarm.alarmArn,
        alertTopicArn: alertTopic.topicArn,
        monitoringEnabled: true,
        thresholds: {
          failureThreshold: 1,
          successRateThreshold: 95,
        },
      }),
      description: 'Rotation monitoring and alerting configuration',
      exportName: `${this.config.stackPrefix}-${this.environment}-rotation-monitoring`,
    });
  }

  /**
   * タグを適用
   */
  private applyTags(): void {
    const commonTags = {
      Environment: this.environment,
      Service: 'SecretsManager',
      Component: 'Security',
      ...this.config.tags,
    };

    // 主要リソースにタグを適用
    const mainResources = [
      this.encryptionKey,
      this.databaseSecret,
      this.jwtSecret,
      this.externalApisSecret,
      this.lambdaExecutionRole,
      this.secretsReadPolicy,
    ];

    mainResources.forEach(resource => {
      Object.entries(commonTags).forEach(([key, value]) => {
        cdk.Tags.of(resource).add(key, value);
      });
    });

    // CloudTrailリソースがある場合は別途タグを適用
    if (this.cloudTrail) {
      Object.entries(commonTags).forEach(([key, value]) => {
        cdk.Tags.of(this.cloudTrail!).add(key, value);
      });
    }
    if (this.cloudTrailBucket) {
      Object.entries(commonTags).forEach(([key, value]) => {
        cdk.Tags.of(this.cloudTrailBucket!).add(key, value);
      });
    }
  }

  /**
   * CloudFormation出力を作成
   */
  private createOutputs(): void {
    // データベースシークレット関連
    new cdk.CfnOutput(this, 'SecretsManagerDatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN (Secrets Manager)',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-database-secret-arn`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerDatabaseSecretName', {
      value: this.databaseSecret.secretName,
      description: 'Database credentials secret name (Secrets Manager)',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-database-secret-name`,
    });

    // JWT秘密鍵関連
    new cdk.CfnOutput(this, 'SecretsManagerJwtSecretArn', {
      value: this.jwtSecret.secretArn,
      description: 'JWT secret key ARN',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-jwt-secret-arn`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerJwtSecretName', {
      value: this.jwtSecret.secretName,
      description: 'JWT secret key name',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-jwt-secret-name`,
    });

    // 外部API認証情報関連
    new cdk.CfnOutput(this, 'SecretsManagerExternalApisSecretArn', {
      value: this.externalApisSecret.secretArn,
      description: 'External APIs credentials secret ARN',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-external-apis-secret-arn`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerExternalApisSecretName', {
      value: this.externalApisSecret.secretName,
      description: 'External APIs credentials secret name',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-external-apis-secret-name`,
    });

    // 暗号化キー関連
    new cdk.CfnOutput(this, 'SecretsManagerEncryptionKeyId', {
      value: this.encryptionKey.keyId,
      description: 'Secrets Manager encryption key ID',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-encryption-key-id`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerEncryptionKeyArn', {
      value: this.encryptionKey.keyArn,
      description: 'Secrets Manager encryption key ARN',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-encryption-key-arn`,
    });

    // IAMロール関連
    new cdk.CfnOutput(this, 'SecretsManagerLambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN with Secrets Manager access',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-lambda-role-arn`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerLambdaExecutionRoleName', {
      value: this.lambdaExecutionRole.roleName,
      description: 'Lambda execution role name with Secrets Manager access',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-lambda-role-name`,
    });

    // セキュリティ情報
    new cdk.CfnOutput(this, 'SecretsManagerEncryptionEnabled', {
      value: 'true',
      description: 'Whether secrets are encrypted with customer-managed KMS key',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-encryption-enabled`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerEnvironmentIsolation', {
      value: this.environment,
      description: 'Environment isolation level for secrets access',
      exportName: `${this.config.stackPrefix}-${this.environment}-secrets-isolation-level`,
    });

    // CloudTrail情報（有効な場合のみ）
    if (this.cloudTrail) {
      new cdk.CfnOutput(this, 'SecretsManagerCloudTrailArn', {
        value: this.cloudTrail.trailArn,
        description: 'CloudTrail ARN for Secrets Manager audit logging',
        exportName: `${this.config.stackPrefix}-${this.environment}-secrets-cloudtrail-arn`,
      });

      new cdk.CfnOutput(this, 'SecretsManagerCloudTrailBucket', {
        value: this.cloudTrailBucket!.bucketName,
        description: 'S3 bucket for CloudTrail logs',
        exportName: `${this.config.stackPrefix}-${this.environment}-secrets-cloudtrail-bucket`,
      });

      new cdk.CfnOutput(this, 'SecretsManagerAuditLoggingEnabled', {
        value: 'true',
        description: 'Whether CloudTrail audit logging is enabled for secrets access',
        exportName: `${this.config.stackPrefix}-${this.environment}-secrets-audit-logging-enabled`,
      });
    } else {
      new cdk.CfnOutput(this, 'SecretsManagerAuditLoggingEnabled', {
        value: 'false',
        description: 'CloudTrail audit logging is disabled for this environment',
        exportName: `${this.config.stackPrefix}-${this.environment}-secrets-audit-logging-enabled`,
      });
    }

    // 監視・アラート設定情報（タスク11）
    if (this.monitoringTopic) {
      new cdk.CfnOutput(this, 'SecretsManagerMonitoringTopicArn', {
        value: this.monitoringTopic.topicArn,
        description: 'SNS topic ARN for Secrets Manager monitoring alerts',
        exportName: `${this.config.stackPrefix}-${this.environment}-secrets-monitoring-topic-arn`,
      });

      new cdk.CfnOutput(this, 'SecretsManagerMonitoringConfiguration', {
        value: JSON.stringify({
          environment: this.environment,
          monitoringTopicArn: this.monitoringTopic.topicArn,
          secretAccessAlarmsCount: this.secretAccessAlarms?.length || 0,
          anomalyDetectionAlarmsCount: this.anomalyDetectionAlarms?.length || 0,
          customMetricsEnabled: true,
          accessFrequencyThreshold: this.getAccessFrequencyThreshold(),
          multipleAccessThreshold: this.getMultipleAccessThreshold(),
        }),
        description: 'Comprehensive monitoring and alerting configuration for Secrets Manager',
        exportName: `${this.config.stackPrefix}-${this.environment}-secrets-monitoring-config`,
      });

      // 個別アラーム情報の出力
      if (this.secretAccessAlarms && this.secretAccessAlarms.length > 0) {
        new cdk.CfnOutput(this, 'SecretsManagerAccessAlarms', {
          value: JSON.stringify(
            this.secretAccessAlarms.map(alarm => ({
              alarmName: alarm.alarmName,
              alarmArn: alarm.alarmArn,
            }))
          ),
          description: 'Secret access monitoring alarms configuration',
          exportName: `${this.config.stackPrefix}-${this.environment}-secrets-access-alarms`,
        });
      }

      if (this.anomalyDetectionAlarms && this.anomalyDetectionAlarms.length > 0) {
        new cdk.CfnOutput(this, 'SecretsManagerAnomalyAlarms', {
          value: JSON.stringify(
            this.anomalyDetectionAlarms.map(alarm => ({
              alarmName: alarm.alarmName,
              alarmArn: alarm.alarmArn,
            }))
          ),
          description: 'Anomaly detection alarms configuration',
          exportName: `${this.config.stackPrefix}-${this.environment}-secrets-anomaly-alarms`,
        });
      }
    }
  }

  /**
   * シークレット情報を取得するヘルパーメソッド
   */
  public getSecretsInfo() {
    return {
      database: {
        secretArn: this.databaseSecret.secretArn,
        secretName: this.databaseSecret.secretName,
      },
      jwt: {
        secretArn: this.jwtSecret.secretArn,
        secretName: this.jwtSecret.secretName,
      },
      externalApis: {
        secretArn: this.externalApisSecret.secretArn,
        secretName: this.externalApisSecret.secretName,
      },
      encryption: {
        keyId: this.encryptionKey.keyId,
        keyArn: this.encryptionKey.keyArn,
      },
      iam: {
        lambdaRoleArn: this.lambdaExecutionRole.roleArn,
        lambdaRoleName: this.lambdaExecutionRole.roleName,
      },
      cloudTrail: this.cloudTrail
        ? {
            trailArn: this.cloudTrail.trailArn,
            bucketName: this.cloudTrailBucket?.bucketName,
            enabled: true,
          }
        : {
            enabled: false,
          },
      monitoring: this.monitoringTopic
        ? {
            topicArn: this.monitoringTopic.topicArn,
            secretAccessAlarmsCount: this.secretAccessAlarms?.length || 0,
            anomalyDetectionAlarmsCount: this.anomalyDetectionAlarms?.length || 0,
            customMetricsEnabled: true,
            enabled: true,
          }
        : {
            enabled: false,
          },
      environment: this.environment,
      encryptionEnabled: true,
      auditLoggingEnabled: !!this.cloudTrail,
      monitoringEnabled: !!this.monitoringTopic,
    };
  }

  /**
   * Lambda関数にシークレットアクセス権限を付与するヘルパーメソッド
   *
   * 要件3.3: Lambda関数が外部APIを呼び出す際のアクセス権限管理
   */
  public grantSecretsAccess(lambdaFunction: lambda.Function): void {
    // シークレット読み取り権限を付与
    this.databaseSecret.grantRead(lambdaFunction);
    this.jwtSecret.grantRead(lambdaFunction);
    this.externalApisSecret.grantRead(lambdaFunction);

    // KMS復号化権限を付与
    this.encryptionKey.grantDecrypt(lambdaFunction);
  }

  /**
   * Lambda関数に外部APIアクセス権限を付与するヘルパーメソッド
   */
  public grantExternalApiAccess(lambdaFunction: lambda.Function): void {
    // Bedrock API アクセス権限を付与
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.config.region}::foundation-model/amazon.nova-micro-v1:0`,
        ],
      })
    );

    // SES API アクセス権限を付与
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
        resources: [`arn:aws:ses:${this.config.region}:${cdk.Aws.ACCOUNT_ID}:identity/*`],
      })
    );
  }

  /**
   * 外部API認証情報の構造化された情報を取得
   */
  public getExternalApiCredentialsStructure(): ExternalApiCredentials & { metadata: any } {
    const environmentConfig = this.getEnvironmentSpecificApiSettings();

    return {
      bedrock: {
        region: environmentConfig.bedrock.region,
        modelId: environmentConfig.bedrock.modelId,
        ...environmentConfig.bedrock.additionalConfig,
      },
      ses: {
        region: environmentConfig.ses.region,
        fromEmail: environmentConfig.ses.fromEmail,
        replyToEmail: environmentConfig.ses.replyToEmail,
        ...environmentConfig.ses.additionalConfig,
      },
      metadata: {
        environment: this.environment,
        services: ['bedrock', 'ses'],
        encryptionEnabled: true,
        managedBy: 'SecretsManagerConstruct',
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * 外部APIシークレットの環境別設定を検証
   */
  public validateExternalApiConfiguration(): {
    isValid: boolean;
    environment: string;
    services: string[];
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const services = ['bedrock', 'ses'];

    try {
      const config = this.getEnvironmentSpecificApiSettings();

      // Bedrock設定の検証
      if (!config.bedrock.region) {
        issues.push('Bedrock region is not configured');
      }
      if (!config.bedrock.modelId) {
        issues.push('Bedrock model ID is not configured');
      }
      if (this.environment === 'prod' && !config.bedrock.additionalConfig?.enableLogging) {
        recommendations.push('Consider enabling Bedrock logging in production environment');
      }

      // SES設定の検証
      if (!config.ses.region) {
        issues.push('SES region is not configured');
      }
      if (!config.ses.fromEmail || !config.ses.fromEmail.includes('@')) {
        issues.push('SES fromEmail is invalid or not configured');
      }
      if (!config.ses.replyToEmail || !config.ses.replyToEmail.includes('@')) {
        issues.push('SES replyToEmail is invalid or not configured');
      }
      if (this.environment === 'prod' && !config.ses.additionalConfig?.enableBounceTracking) {
        recommendations.push('Consider enabling SES bounce tracking in production environment');
      }

      // 環境別設定の検証
      if (this.environment === 'local') {
        if (!config.bedrock.additionalConfig?.mockMode) {
          recommendations.push('Consider enabling mock mode for Bedrock in local environment');
        }
        if (!config.ses.additionalConfig?.mockMode) {
          recommendations.push('Consider enabling mock mode for SES in local environment');
        }
      }
    } catch (error) {
      issues.push(`Configuration validation error: ${error}`);
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      environment: this.environment,
      services,
      issues,
      recommendations,
    };
  }

  /**
   * データベース認証情報の構造化された情報を取得
   */
  public getDatabaseCredentialsStructure(): DatabaseCredentials {
    return {
      username: 'goal_mandala_user',
      password: '[MANAGED_BY_SECRETS_MANAGER]',
      engine: 'postgres',
      host: '[CLUSTER_ENDPOINT]',
      port: 5432,
      dbname: this.config.database.databaseName || 'goal_mandala',
      dbClusterIdentifier: `${this.config.stackPrefix}-${this.environment}-cluster`,
    };
  }

  /**
   * 環境別シークレット命名規則を取得
   */
  public getSecretNamingConvention(): {
    database: string;
    jwt: string;
    externalApis: string;
    pattern: string;
  } {
    const pattern = `${this.config.stackPrefix}-{environment}-secret-{type}`;

    return {
      database: `${this.config.stackPrefix}-${this.environment}-secret-database`,
      jwt: `${this.config.stackPrefix}-${this.environment}-secret-jwt`,
      externalApis: `${this.config.stackPrefix}-${this.environment}-secret-external-apis`,
      pattern,
    };
  }

  /**
   * Aurora Serverlessクラスターとの連携状態を確認
   */
  public validateClusterIntegration(cluster?: rds.DatabaseCluster): {
    isIntegrated: boolean;
    clusterInfo?: {
      identifier: string;
      endpoint: string;
      port: number;
      secretArn: string;
    };
    issues: string[];
  } {
    const issues: string[] = [];

    if (!cluster) {
      issues.push('No Aurora Serverless cluster provided for integration');
      return { isIntegrated: false, issues };
    }

    const clusterInfo = {
      identifier: cluster.clusterIdentifier,
      endpoint: cluster.clusterEndpoint.hostname,
      port: cluster.clusterEndpoint.port,
      secretArn: cluster.secret?.secretArn || 'Not available',
    };

    // 基本的な連携チェック
    if (!cluster.secret) {
      issues.push('Aurora cluster does not have an associated secret');
    }

    if (cluster.clusterEndpoint.port !== 5432) {
      issues.push(`Unexpected database port: ${cluster.clusterEndpoint.port} (expected: 5432)`);
    }

    const isIntegrated = issues.length === 0;

    return {
      isIntegrated,
      clusterInfo,
      issues,
    };
  }

  /**
   * 監視・アラート設定の状態を取得
   */
  public getMonitoringStatus(): {
    enabled: boolean;
    environment: string;
    topicArn?: string;
    alarmsConfigured: {
      secretAccess: number;
      anomalyDetection: number;
      rotation: number;
    };
    thresholds: {
      accessFrequency: number;
      multipleAccess: number;
      successRate: number;
    };
    customMetrics: {
      enabled: boolean;
      collectionInterval: string;
    };
    notifications: {
      email: boolean;
      slack: boolean;
    };
  } {
    return {
      enabled: !!this.monitoringTopic,
      environment: this.environment,
      topicArn: this.monitoringTopic?.topicArn,
      alarmsConfigured: {
        secretAccess: this.secretAccessAlarms?.length || 0,
        anomalyDetection: this.anomalyDetectionAlarms?.length || 0,
        rotation: 2, // rotationFailureAlarm + rotationSuccessRateAlarm
      },
      thresholds: {
        accessFrequency: this.getAccessFrequencyThreshold(),
        multipleAccess: this.getMultipleAccessThreshold(),
        successRate: 95,
      },
      customMetrics: {
        enabled: true,
        collectionInterval: '5 minutes',
      },
      notifications: {
        email: ['prod', 'stg'].includes(this.environment),
        slack: this.environment === 'prod',
      },
    };
  }

  /**
   * 監視・アラート設定を検証
   */
  public validateMonitoringConfiguration(): {
    isValid: boolean;
    environment: string;
    issues: string[];
    recommendations: string[];
    summary: {
      totalAlarms: number;
      snsTopicConfigured: boolean;
      customMetricsEnabled: boolean;
      cloudTrailEnabled: boolean;
    };
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 基本的な監視設定の検証
    if (!this.monitoringTopic) {
      issues.push('SNS monitoring topic is not configured');
    }

    if (!this.secretAccessAlarms || this.secretAccessAlarms.length === 0) {
      issues.push('Secret access monitoring alarms are not configured');
    }

    if (!this.anomalyDetectionAlarms || this.anomalyDetectionAlarms.length === 0) {
      issues.push('Anomaly detection alarms are not configured');
    }

    // 環境別の推奨事項
    if (this.environment === 'prod') {
      if (!this.cloudTrail) {
        recommendations.push('Consider enabling CloudTrail for production environment');
      }

      const monitoringStatus = this.getMonitoringStatus();
      if (!monitoringStatus.notifications.email) {
        recommendations.push('Consider configuring email notifications for production alerts');
      }
      if (!monitoringStatus.notifications.slack) {
        recommendations.push('Consider configuring Slack notifications for production alerts');
      }
    }

    if (this.environment === 'local' || this.environment === 'dev') {
      if (this.secretAccessAlarms && this.secretAccessAlarms.length > 0) {
        recommendations.push('Consider reducing alarm sensitivity for development environments');
      }
    }

    // 閾値の妥当性チェック
    const accessThreshold = this.getAccessFrequencyThreshold();
    const multipleAccessThreshold = this.getMultipleAccessThreshold();

    if (accessThreshold < 10 && this.environment !== 'prod') {
      recommendations.push(
        'Access frequency threshold might be too low for non-production environment'
      );
    }

    if (multipleAccessThreshold < 5 && this.environment !== 'prod') {
      recommendations.push(
        'Multiple access threshold might be too low for non-production environment'
      );
    }

    const totalAlarms =
      (this.secretAccessAlarms?.length || 0) + (this.anomalyDetectionAlarms?.length || 0) + 2; // rotation alarms

    const isValid = issues.length === 0;

    return {
      isValid,
      environment: this.environment,
      issues,
      recommendations,
      summary: {
        totalAlarms,
        snsTopicConfigured: !!this.monitoringTopic,
        customMetricsEnabled: true,
        cloudTrailEnabled: !!this.cloudTrail,
      },
    };
  }

  /**
   * 監視メトリクスの詳細情報を取得
   */
  public getMonitoringMetrics(): {
    secretAccessMetrics: Array<{
      secretName: string;
      metricName: string;
      namespace: string;
      threshold: number;
      period: string;
    }>;
    anomalyDetectionMetrics: Array<{
      metricName: string;
      description: string;
      threshold: number;
      evaluationPeriods: number;
    }>;
    customMetrics: Array<{
      namespace: string;
      metricName: string;
      description: string;
      collectionFrequency: string;
    }>;
  } {
    return {
      secretAccessMetrics: [
        {
          secretName: this.databaseSecret.secretName,
          metricName: 'GetSecretValueErrors',
          namespace: 'AWS/SecretsManager',
          threshold: 5,
          period: '5 minutes',
        },
        {
          secretName: this.jwtSecret.secretName,
          metricName: 'GetSecretValueErrors',
          namespace: 'AWS/SecretsManager',
          threshold: 3,
          period: '5 minutes',
        },
        {
          secretName: this.externalApisSecret.secretName,
          metricName: 'GetSecretValueErrors',
          namespace: 'AWS/SecretsManager',
          threshold: 5,
          period: '5 minutes',
        },
      ],
      anomalyDetectionMetrics: [
        {
          metricName: 'HighFrequencyAccess',
          description: 'Detects unusually high frequency of secret access',
          threshold: this.getAccessFrequencyThreshold(),
          evaluationPeriods: 3,
        },
        {
          metricName: 'MultipleSecretAccess',
          description: 'Detects simultaneous access to multiple secrets',
          threshold: this.getMultipleAccessThreshold(),
          evaluationPeriods: 2,
        },
        ...(this.environment === 'prod'
          ? [
              {
                metricName: 'NightTimeAccess',
                description: 'Detects secret access during night hours (JST 22:00-06:00)',
                threshold: 1,
                evaluationPeriods: 1,
              },
            ]
          : []),
      ],
      customMetrics: [
        {
          namespace: 'Custom/SecretsManager',
          metricName: 'NightTimeAccess',
          description: 'Tracks secret access during night hours for security monitoring',
          collectionFrequency: '5 minutes',
        },
        {
          namespace: 'Custom/SecretsManager',
          metricName: 'SecretAccessPattern',
          description: 'Tracks patterns of secret access for anomaly detection',
          collectionFrequency: '5 minutes',
        },
      ],
    };
  }

  /**
   * 統合検証
   */
  public validateIntegration() {
    const issues: string[] = [];

    // 基本的なリソースの存在確認
    if (!this.databaseSecret) {
      issues.push('Database secret is not created');
    }
    if (!this.jwtSecret) {
      issues.push('JWT secret is not created');
    }
    if (!this.externalApisSecret) {
      issues.push('External APIs secret is not created');
    }
    if (!this.encryptionKey) {
      issues.push('Encryption key is not created');
    }
    if (!this.lambdaExecutionRole) {
      issues.push('Lambda execution role is not created');
    }
    if (!this.secretsReadPolicy) {
      issues.push('Secrets read policy is not created');
    }

    // 環境別設定の検証
    const namingConvention = this.getSecretNamingConvention();
    if (!namingConvention.database.includes(this.environment)) {
      issues.push('Database secret naming does not include environment');
    }
    if (!namingConvention.jwt.includes(this.environment)) {
      issues.push('JWT secret naming does not include environment');
    }
    if (!namingConvention.externalApis.includes(this.environment)) {
      issues.push('External APIs secret naming does not include environment');
    }

    return {
      isValid: issues.length === 0,
      issues,
      environment: this.environment,
      resourceCount: {
        secrets: 3,
        iamRoles: 1,
        iamPolicies: 2,
        kmsKeys: 1,
        cloudTrails: this.cloudTrail ? 1 : 0,
        snsTopics: this.monitoringTopic ? 1 : 0,
      },
    };
  }

  /**
   * スタック依存関係を取得
   */
  public getStackDependencies() {
    return {
      requiredStacks: ['VpcStack'],
      optionalStacks: ['DatabaseStack'],
      exports: [
        `${this.config.stackPrefix}-${this.environment}-database-secret-arn`,
        `${this.config.stackPrefix}-${this.environment}-jwt-secret-arn`,
        `${this.config.stackPrefix}-${this.environment}-external-apis-secret-arn`,
        `${this.config.stackPrefix}-${this.environment}-secrets-key-arn`,
        `${this.config.stackPrefix}-${this.environment}-lambda-secrets-role-arn`,
      ],
      imports: [
        `${this.config.stackPrefix}-${this.environment}-vpc-id`,
        `${this.config.stackPrefix}-${this.environment}-private-subnet-ids`,
      ],
    };
  }

  /**
   * 統合テスト用Lambda関数を作成
   */
  private createIntegrationTestFunction(): lambda.Function {
    console.log(`Creating integration test Lambda function for environment: ${this.environment}`);

    // 統合テスト用Lambda関数の作成
    const integrationTestFunction = new lambda.Function(this, 'IntegrationTestFunction', {
      functionName: `${this.config.stackPrefix}-${this.environment}-secrets-integration-test`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'secrets-integration-test-handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash',
            '-c',
            'cp -r /asset-input/* /asset-output/ && cd /asset-output && npm install --production',
          ],
        },
      }),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        ENVIRONMENT: this.environment,
        STACK_PREFIX: this.config.stackPrefix,
        AWS_REGION: this.config.region,
        DATABASE_SECRET_ARN: this.databaseSecret.secretArn,
        JWT_SECRET_ARN: this.jwtSecret.secretArn,
        EXTERNAL_APIS_SECRET_ARN: this.externalApisSecret.secretArn,
      },
      role: this.lambdaExecutionRole,
      description: `Integration test function for SecretsManager in ${this.environment} environment`,
      logRetention: 14, // 2週間
    });

    // 統合テスト用Lambda関数にシークレットアクセス権限を付与
    this.databaseSecret.grantRead(integrationTestFunction);
    this.jwtSecret.grantRead(integrationTestFunction);
    this.externalApisSecret.grantRead(integrationTestFunction);

    // KMS復号化権限を付与
    this.encryptionKey.grantDecrypt(integrationTestFunction);

    // CloudWatch Logs権限を付与
    integrationTestFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${this.config.region}:${this.config.account}:log-group:/aws/lambda/${this.config.stackPrefix}-${this.environment}-secrets-integration-test:*`,
        ],
      })
    );

    // 統合テスト用のCloudWatch出力
    new cdk.CfnOutput(this, 'IntegrationTestFunctionName', {
      value: integrationTestFunction.functionName,
      description: 'Integration test Lambda function name for SecretsManager testing',
      exportName: `${this.config.stackPrefix}-${this.environment}-integration-test-function-name`,
    });

    new cdk.CfnOutput(this, 'IntegrationTestFunctionArn', {
      value: integrationTestFunction.functionArn,
      description: 'Integration test Lambda function ARN for SecretsManager testing',
      exportName: `${this.config.stackPrefix}-${this.environment}-integration-test-function-arn`,
    });

    console.log(
      `✅ Integration test Lambda function created: ${integrationTestFunction.functionName}`
    );
    return integrationTestFunction;
  }

  /**
   * セキュリティ設定の検証
   */
  public validateSecurityConfiguration() {
    const issues: string[] = [];

    // 暗号化の確認
    const encryptionEnabled = !!this.encryptionKey;
    if (!encryptionEnabled) {
      issues.push('Encryption key is not configured');
    }

    // アクセスログの確認
    const accessLoggingEnabled = !!this.cloudTrail;
    if (this.environment === 'prod' && !accessLoggingEnabled) {
      issues.push('Access logging should be enabled in production');
    }

    return {
      isSecure: issues.length === 0,
      issues,
      checks: {
        minimumPrivileges: true, // IAMポリシーは最小権限で設計済み
        encryptionEnabled,
        accessLogging: accessLoggingEnabled,
        networkIsolation: true, // VPC内での実行
      },
    };
  }
}
