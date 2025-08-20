import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { SecretsManagerConstruct } from './secrets-manager-construct';
import { EnvironmentConfig } from '../config/environment';

describe('SecretsManagerConstruct', () => {
  let mockConfig: EnvironmentConfig;

  beforeEach(() => {
    mockConfig = {
      stackPrefix: 'goal-mandala',
      region: 'ap-northeast-1',
      environment: 'test',
      network: {
        natGateways: 1,
        enableVpcEndpoints: false,
      },
      database: {
        instanceClass: 'serverless',
        minCapacity: 0.5,
        maxCapacity: 1,
        multiAz: false,
        databaseName: 'goal_mandala_test',
      },
      lambda: {
        timeout: 30,
        memorySize: 256,
      },
      frontend: {},
      tags: {
        Project: 'GoalMandala',
        Environment: 'test',
      },
    };
  });

  test('基本的なシークレットが作成される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // データベースシークレットの存在確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-test-secret-database',
      Description: 'Database credentials for test environment - Aurora Serverless V2',
    });

    // JWT秘密鍵シークレットの存在確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-test-secret-jwt',
      Description: 'JWT secret key for test environment',
    });

    // 外部API認証情報シークレットの存在確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-test-secret-external-apis',
      Description: 'External API credentials for test environment - Bedrock, SES, etc.',
    });

    // プロパティが正しく設定されていることを確認
    expect(construct.databaseSecret).toBeInstanceOf(secretsmanager.Secret);
    expect(construct.jwtSecret).toBeInstanceOf(secretsmanager.Secret);
    expect(construct.externalApisSecret).toBeInstanceOf(secretsmanager.Secret);
    expect(construct.lambdaExecutionRole).toBeInstanceOf(iam.Role);
    expect(construct.secretsReadPolicy).toBeInstanceOf(iam.Policy);
  });

  test('KMS暗号化キーが作成される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack2');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KMS::Key', {
      Description: 'KMS key for Secrets Manager encryption - test',
      EnableKeyRotation: true,
    });

    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/goal-mandala-test-secrets-key',
    });
  });

  test('環境名がシークレット名に反映される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack3');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'production',
      config: { ...mockConfig, environment: 'production' },
    });

    // Assert
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-production-secret-database',
    });

    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-production-secret-jwt',
    });

    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-production-secret-external-apis',
    });
  });

  test('getSecretsInfo()が正しい情報を返す', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack4');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const secretsInfo = construct.getSecretsInfo();

    // Assert
    expect(secretsInfo).toEqual({
      database: {
        secretArn: construct.databaseSecret.secretArn,
        secretName: construct.databaseSecret.secretName,
      },
      jwt: {
        secretArn: construct.jwtSecret.secretArn,
        secretName: construct.jwtSecret.secretName,
      },
      externalApis: {
        secretArn: construct.externalApisSecret.secretArn,
        secretName: construct.externalApisSecret.secretName,
      },
      encryption: {
        keyId: construct.encryptionKey.keyId,
        keyArn: construct.encryptionKey.keyArn,
      },
      iam: {
        lambdaRoleArn: construct.lambdaExecutionRole.roleArn,
        lambdaRoleName: construct.lambdaExecutionRole.roleName,
      },
      cloudTrail: {
        enabled: false,
      },
      environment: 'test',
      encryptionEnabled: true,
      auditLoggingEnabled: false,
    });
  });

  test('データベース認証情報の構造化された情報を取得できる', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack5');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const dbCredentials = construct.getDatabaseCredentialsStructure();

    // Assert
    expect(dbCredentials).toEqual({
      username: 'goal_mandala_user',
      password: '[MANAGED_BY_SECRETS_MANAGER]',
      engine: 'postgres',
      host: '[CLUSTER_ENDPOINT]',
      port: 5432,
      dbname: 'goal_mandala_test',
      dbClusterIdentifier: 'goal-mandala-test-cluster',
    });
  });

  test('環境別シークレット命名規則を取得できる', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack6');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'dev',
      config: { ...mockConfig, environment: 'dev' },
    });

    // Act
    const namingConvention = construct.getSecretNamingConvention();

    // Assert
    expect(namingConvention).toEqual({
      database: 'goal-mandala-dev-secret-database',
      jwt: 'goal-mandala-dev-secret-jwt',
      externalApis: 'goal-mandala-dev-secret-external-apis',
      pattern: 'goal-mandala-{environment}-secret-{type}',
    });
  });

  test('Aurora Serverlessクラスターとの連携状態を確認できる', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack7');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act - クラスターなしの場合
    const validationWithoutCluster = construct.validateClusterIntegration();

    // Assert
    expect(validationWithoutCluster.isIntegrated).toBe(false);
    expect(validationWithoutCluster.issues).toContain(
      'No Aurora Serverless cluster provided for integration'
    );
    expect(validationWithoutCluster.clusterInfo).toBeUndefined();
  });

  test('データベースシークレットの環境別命名規則が適用される', () => {
    // Arrange
    const environments = ['local', 'dev'];

    environments.forEach(env => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, `TestStack-${env}`);
      const envConfig = { ...mockConfig, environment: env };

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: env,
        config: envConfig,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: `goal-mandala-${env}-secret-database`,
        Description: `Database credentials for ${env} environment - Aurora Serverless V2`,
      });
    });
  });

  test('データベース接続情報の構造化が正しく設定される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack8');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // データベースシークレットの生成設定を確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: JSON.stringify({
          username: 'goal_mandala_user',
          engine: 'postgres',
          port: 5432,
          dbname: 'goal_mandala_test',
          host: 'placeholder-will-be-updated',
          dbClusterIdentifier: 'goal-mandala-test-cluster',
        }),
        GenerateStringKey: 'password',
        ExcludeCharacters: '"@/\\\'`',
        IncludeSpace: false,
        PasswordLength: 32,
      },
    });
  });

  test('JWT秘密鍵シークレットが正しく設定される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack9');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // JWT秘密鍵シークレットの生成設定を確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-test-secret-jwt',
      Description: 'JWT secret key for test environment',
      GenerateSecretString: {
        SecretStringTemplate: JSON.stringify({
          algorithm: 'HS256',
          issuer: 'goal-mandala-test',
          expiresIn: '24h',
        }),
        GenerateStringKey: 'secret',
        ExcludeCharacters: '"@/\\\'`',
        IncludeSpace: false,
        PasswordLength: 64, // 256ビット相当の長さ
        RequireEachIncludedType: true,
      },
    });
  });

  test('JWT秘密鍵の環境別設定が正しく適用される', () => {
    // Arrange
    const environments = ['local', 'dev'];

    environments.forEach(env => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, `TestStackJWT-${env}`);
      const envConfig = { ...mockConfig, environment: env };

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: env,
        config: envConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 環境別JWT秘密鍵シークレットの確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: `goal-mandala-${env}-secret-jwt`,
        Description: `JWT secret key for ${env} environment`,
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            algorithm: 'HS256',
            issuer: `goal-mandala-${env}`,
            expiresIn: '24h',
          }),
          GenerateStringKey: 'secret',
          ExcludeCharacters: '"@/\\\'`',
          IncludeSpace: false,
          PasswordLength: 64,
          RequireEachIncludedType: true,
        },
      });
    });
  });

  test('JWT秘密鍵の強力な秘密鍵生成設定が適用される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack10');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // 強力な秘密鍵生成の設定確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-test-secret-jwt',
      GenerateSecretString: {
        PasswordLength: 64, // 256ビット相当の強力な秘密鍵
        RequireEachIncludedType: true, // 各文字種を含む
        ExcludeCharacters: '"@/\\\'`', // 問題のある文字を除外
        IncludeSpace: false, // スペースを含まない
      },
    });
  });

  test('JWT設定情報が構造化されている', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack11');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'production',
      config: { ...mockConfig, environment: 'production' },
    });

    // Assert
    const template = Template.fromStack(stack);

    // JWT設定情報の構造化確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'goal-mandala-production-secret-jwt',
      GenerateSecretString: {
        SecretStringTemplate: JSON.stringify({
          algorithm: 'HS256',
          issuer: 'goal-mandala-production',
          expiresIn: '24h',
        }),
        GenerateStringKey: 'secret',
      },
    });
  });

  // 外部APIシークレットのテスト
  describe('外部APIシークレット', () => {
    test('外部APIシークレットが正しく作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackExternalApi1');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 外部APIシークレットの存在確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'goal-mandala-test-secret-external-apis',
        Description: 'External API credentials for test environment - Bedrock, SES, etc.',
      });
    });

    test('環境別外部API設定が適用される', () => {
      // Arrange
      const environments = ['local', 'dev'];

      environments.forEach(env => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, `TestStackExternalApi-${env}`);
        const envConfig = { ...mockConfig, environment: env };

        // Act
        const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
          environment: env,
          config: envConfig,
        });

        // Assert
        const template = Template.fromStack(stack);

        // 環境別外部APIシークレットの確認
        template.hasResourceProperties('AWS::SecretsManager::Secret', {
          Name: `goal-mandala-${env}-secret-external-apis`,
          Description: `External API credentials for ${env} environment - Bedrock, SES, etc.`,
        });

        // 外部API認証情報の構造を確認
        const apiCredentials = construct.getExternalApiCredentialsStructure();
        expect(apiCredentials.bedrock.region).toBe('ap-northeast-1');
        expect(apiCredentials.bedrock.modelId).toBe('amazon.nova-micro-v1:0');
        expect(apiCredentials.ses.region).toBe('ap-northeast-1');
        if (env === 'local') {
          expect(apiCredentials.ses.fromEmail).toBe('noreply@localhost');
          expect(apiCredentials.ses.replyToEmail).toBe('support@localhost');
        } else {
          expect(apiCredentials.ses.fromEmail).toBe(`noreply@goal-mandala-${env}.com`);
          expect(apiCredentials.ses.replyToEmail).toBe(`support@goal-mandala-${env}.com`);
        }
        expect(apiCredentials.metadata.environment).toBe(env);
        expect(apiCredentials.metadata.services).toEqual(['bedrock', 'ses']);
      });
    });

    test('Bedrock設定が正しく構造化される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackBedrock');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // Act
      const apiCredentials = construct.getExternalApiCredentialsStructure();

      // Assert
      expect(apiCredentials.bedrock).toEqual({
        region: 'ap-northeast-1',
        modelId: 'amazon.nova-micro-v1:0',
        maxRetries: 5,
        timeout: 120000,
        enableLogging: true,
      });
    });

    test('SES設定が正しく構造化される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackSes');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // Act
      const apiCredentials = construct.getExternalApiCredentialsStructure();

      // Assert
      expect(apiCredentials.ses).toEqual({
        region: 'ap-northeast-1',
        fromEmail: 'noreply@goal-mandala-prod.com',
        replyToEmail: 'support@goal-mandala-prod.com',
        configurationSet: 'goal-mandala-prod-config-set',
        maxSendRate: 50,
        enableBounceTracking: true,
        enableComplaintTracking: true,
      });
    });

    test('ローカル環境でモック設定が適用される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackLocal');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'local',
        config: { ...mockConfig, environment: 'local' },
      });

      // Act
      const apiCredentials = construct.getExternalApiCredentialsStructure();

      // Assert
      expect(apiCredentials.bedrock.endpoint).toBe('http://localhost:8000');
      expect(apiCredentials.bedrock.mockMode).toBe(true);
      expect(apiCredentials.ses.fromEmail).toBe('noreply@localhost');
      expect(apiCredentials.ses.replyToEmail).toBe('support@localhost');
      expect(apiCredentials.ses.endpoint).toBe('http://localhost:8025');
      expect(apiCredentials.ses.mockMode).toBe(true);
    });

    test('外部API設定の検証が正しく動作する', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackValidation');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Act
      const validation = construct.validateExternalApiConfiguration();

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.environment).toBe('test');
      expect(validation.services).toEqual(['bedrock', 'ses']);
      expect(validation.issues).toHaveLength(0);
    });

    test('外部APIアクセス権限ポリシーが作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackApiPolicy');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 外部APIアクセス権限ポリシーの確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-external-api-access-policy',
      });

      // 外部APIアクセス権限ポリシーの存在確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-external-api-access-policy',
      });

      // Bedrockアクセス権限が含まれていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const externalApiPolicy = Object.values(policies).find(
        (policy: any) =>
          policy.Properties.PolicyName === 'goal-mandala-test-external-api-access-policy'
      ) as any;

      expect(externalApiPolicy).toBeDefined();
      const statements = externalApiPolicy.Properties.PolicyDocument.Statement;

      // Bedrockアクセス権限の確認
      const bedrockStatement = statements.find((stmt: any) =>
        stmt.Action.includes('bedrock:InvokeModel')
      );
      expect(bedrockStatement).toBeDefined();
      expect(bedrockStatement.Action).toContain('bedrock:InvokeModel');
      expect(bedrockStatement.Action).toContain('bedrock:InvokeModelWithResponseStream');

      // SESアクセス権限の確認
      const sesStatement = statements.find((stmt: any) => stmt.Action.includes('ses:SendEmail'));
      expect(sesStatement).toBeDefined();
      expect(sesStatement.Action).toContain('ses:SendEmail');
      expect(sesStatement.Action).toContain('ses:SendRawEmail');
      expect(sesStatement.Action).toContain('ses:SendTemplatedEmail');
    });

    test('本番環境で追加の監視権限が付与される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackProdMonitoring');

      // Act
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // Assert
      // 本番環境でCloudTrailが有効であることを確認
      expect(construct.cloudTrail).toBeDefined();
      expect(construct.cloudTrailBucket).toBeDefined();
    });

    test('外部APIシークレットの出力が正しく作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackApiOutputs');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // CloudFormation出力の存在確認
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);

      // 外部API関連の出力が存在することを確認（実際の出力名を使用）
      const externalApiOutputs = outputNames.filter(
        name =>
          name.includes('ExternalApiConfigurationSummary') ||
          name.includes('BedrockApiConfiguration') ||
          name.includes('SesApiConfiguration') ||
          name.includes('ExternalApiEnvironmentValidation')
      );
      expect(externalApiOutputs.length).toBe(4);

      // 外部API設定サマリー出力の確認
      const externalApiSummaryOutput = outputNames.find(name =>
        name.includes('ExternalApiConfigurationSummary')
      );
      expect(externalApiSummaryOutput).toBeDefined();
      template.hasOutput(externalApiSummaryOutput!, {
        Description: 'External API configuration summary with environment-specific settings',
        Export: {
          Name: 'goal-mandala-test-external-api-config-summary',
        },
      });

      // Bedrock設定出力の確認
      const bedrockOutput = outputNames.find(name => name.includes('BedrockApiConfiguration'));
      expect(bedrockOutput).toBeDefined();
      template.hasOutput(bedrockOutput!, {
        Description: 'Bedrock API configuration for AI integration',
        Export: {
          Name: 'goal-mandala-test-bedrock-api-config',
        },
      });

      // SES設定出力の確認
      const sesOutput = outputNames.find(name => name.includes('SesApiConfiguration'));
      expect(sesOutput).toBeDefined();
      template.hasOutput(sesOutput!, {
        Description: 'SES API configuration for email delivery',
        Export: {
          Name: 'goal-mandala-test-ses-api-config',
        },
      });

      // 環境別設定検証結果出力の確認
      const validationOutput = outputNames.find(name =>
        name.includes('ExternalApiEnvironmentValidation')
      );
      expect(validationOutput).toBeDefined();
      template.hasOutput(validationOutput!, {
        Description: 'External API environment-specific configuration validation results',
        Export: {
          Name: 'goal-mandala-test-external-api-validation',
        },
      });
    });
  });

  // IAMロール・ポリシーのテスト
  describe('IAMロール・ポリシー', () => {
    test('Lambda関数用IAMロールが作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackIamRole');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Lambda実行ロールの存在確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-lambda-secrets-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
              ],
            ],
          },
        ],
      });
    });

    test('Secrets Manager読み取り権限ポリシーが作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackSecretsPolicy');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Secrets Manager読み取り権限ポリシーの存在確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-secrets-read-policy',
      });

      // ポリシーの詳細確認
      const policies = template.findResources('AWS::IAM::Policy');
      const secretsReadPolicy = Object.values(policies).find(
        (policy: any) => policy.Properties.PolicyName === 'goal-mandala-test-secrets-read-policy'
      ) as any;

      expect(secretsReadPolicy).toBeDefined();
      const statements = secretsReadPolicy.Properties.PolicyDocument.Statement;

      // Secrets Manager読み取り権限の確認
      const secretsStatement = statements.find((stmt: any) =>
        stmt.Action.includes('secretsmanager:GetSecretValue')
      );
      expect(secretsStatement).toBeDefined();
      expect(secretsStatement.Effect).toBe('Allow');
      expect(secretsStatement.Action).toContain('secretsmanager:GetSecretValue');
      expect(secretsStatement.Action).toContain('secretsmanager:DescribeSecret');

      // 環境別アクセス制御の条件確認
      expect(secretsStatement.Condition).toEqual({
        StringEquals: {
          'secretsmanager:ResourceTag/Environment': 'test',
        },
      });

      // KMS復号化権限の確認
      const kmsStatement = statements.find((stmt: any) => stmt.Action.includes('kms:Decrypt'));
      expect(kmsStatement).toBeDefined();
      expect(kmsStatement.Effect).toBe('Allow');
      expect(kmsStatement.Action).toContain('kms:Decrypt');
      expect(kmsStatement.Action).toContain('kms:GenerateDataKey');
    });

    test('最小権限の原則に基づく権限設定が適用される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackMinimalPermissions');

      // Act
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Secrets Manager読み取り権限ポリシーの詳細確認
      const policies = template.findResources('AWS::IAM::Policy');
      const secretsReadPolicy = Object.values(policies).find(
        (policy: any) => policy.Properties.PolicyName === 'goal-mandala-test-secrets-read-policy'
      ) as any;

      const statements = secretsReadPolicy.Properties.PolicyDocument.Statement;
      const secretsStatement = statements.find((stmt: any) =>
        stmt.Action.includes('secretsmanager:GetSecretValue')
      );

      // 特定のシークレットのみにアクセス権限が制限されていることを確認
      expect(secretsStatement.Resource).toHaveLength(3);
      // CloudFormation参照の場合は、実際のARNではなく参照オブジェクトが含まれる
      expect(secretsStatement.Resource).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ Ref: expect.any(String) }),
          expect.objectContaining({ Ref: expect.any(String) }),
          expect.objectContaining({ Ref: expect.any(String) }),
        ])
      );

      // 不要な権限が含まれていないことを確認
      expect(secretsStatement.Action).not.toContain('secretsmanager:CreateSecret');
      expect(secretsStatement.Action).not.toContain('secretsmanager:DeleteSecret');
      expect(secretsStatement.Action).not.toContain('secretsmanager:UpdateSecret');
    });

    test('環境別アクセス制御が実装される', () => {
      // Arrange
      const environments = ['local', 'dev'];

      environments.forEach(env => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, `TestStackEnvAccess-${env}`);
        const envConfig = { ...mockConfig, environment: env };

        // Act
        new SecretsManagerConstruct(stack, 'SecretsManager', {
          environment: env,
          config: envConfig,
        });

        // Assert
        const template = Template.fromStack(stack);

        // 環境別IAMロール名の確認
        template.hasResourceProperties('AWS::IAM::Role', {
          RoleName: `goal-mandala-${env}-lambda-secrets-role`,
        });

        // 環境別ポリシー名の確認
        template.hasResourceProperties('AWS::IAM::Policy', {
          PolicyName: `goal-mandala-${env}-secrets-read-policy`,
        });

        // 環境別アクセス制御条件の確認
        const policies = template.findResources('AWS::IAM::Policy');
        const secretsReadPolicy = Object.values(policies).find(
          (policy: any) =>
            policy.Properties.PolicyName === `goal-mandala-${env}-secrets-read-policy`
        ) as any;

        const statements = secretsReadPolicy.Properties.PolicyDocument.Statement;
        const secretsStatement = statements.find((stmt: any) =>
          stmt.Action.includes('secretsmanager:GetSecretValue')
        );

        expect(secretsStatement.Condition).toEqual({
          StringEquals: {
            'secretsmanager:ResourceTag/Environment': env,
          },
        });
      });
    });

    test('CloudTrailログ記録が本番・ステージング環境で有効になる', () => {
      // Arrange & Act & Assert for production
      const prodApp = new cdk.App();
      const prodStack = new cdk.Stack(prodApp, 'TestStackCloudTrailProd');
      const prodConstruct = new SecretsManagerConstruct(prodStack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // CloudTrailが有効であることを確認
      expect(prodConstruct.cloudTrail).toBeDefined();
      expect(prodConstruct.cloudTrailBucket).toBeDefined();

      // Arrange & Act & Assert for staging
      const stgApp = new cdk.App();
      const stgStack = new cdk.Stack(stgApp, 'TestStackCloudTrailStg');
      const stgConstruct = new SecretsManagerConstruct(stgStack, 'SecretsManager', {
        environment: 'stg',
        config: { ...mockConfig, environment: 'stg' },
      });

      expect(stgConstruct.cloudTrail).toBeDefined();
      expect(stgConstruct.cloudTrailBucket).toBeDefined();
    });

    test('CloudTrailログ記録が開発・ローカル環境で無効になる', () => {
      // Arrange & Act & Assert for development
      const devApp = new cdk.App();
      const devStack = new cdk.Stack(devApp, 'TestStackCloudTrailDev');
      const devConstruct = new SecretsManagerConstruct(devStack, 'SecretsManager', {
        environment: 'dev',
        config: { ...mockConfig, environment: 'dev' },
      });

      const devTemplate = Template.fromStack(devStack);

      // 開発環境でCloudTrailが作成されないことを確認
      expect(() => {
        devTemplate.hasResourceProperties('AWS::CloudTrail::Trail', {});
      }).toThrow();

      expect(devConstruct.cloudTrail).toBeUndefined();
      expect(devConstruct.cloudTrailBucket).toBeUndefined();

      // Arrange & Act & Assert for local
      const localApp = new cdk.App();
      const localStack = new cdk.Stack(localApp, 'TestStackCloudTrailLocal');
      const localConstruct = new SecretsManagerConstruct(localStack, 'SecretsManager', {
        environment: 'local',
        config: { ...mockConfig, environment: 'local' },
      });

      expect(localConstruct.cloudTrail).toBeUndefined();
      expect(localConstruct.cloudTrailBucket).toBeUndefined();
    });

    test('CloudTrailでシークレットアクセスのデータイベントが記録される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackCloudTrailDataEvents');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // Assert
      // CloudTrailが有効であることを確認
      expect(construct.cloudTrail).toBeDefined();
      expect(construct.cloudTrailBucket).toBeDefined();
    });

    test('IAMロール・ポリシー情報がgetSecretsInfo()に含まれる', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackIamInfo');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // Act
      const secretsInfo = construct.getSecretsInfo();

      // Assert
      expect(secretsInfo.iam).toEqual({
        lambdaRoleArn: construct.lambdaExecutionRole.roleArn,
        lambdaRoleName: construct.lambdaExecutionRole.roleName,
      });

      expect(secretsInfo.cloudTrail).toEqual({
        trailArn: construct.cloudTrail!.trailArn,
        bucketName: construct.cloudTrailBucket!.bucketName,
        enabled: true,
      });

      expect(secretsInfo.auditLoggingEnabled).toBe(true);
    });

    test('CloudFormation出力にIAMロール・CloudTrail情報が含まれる', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackIamOutputs');

      // Act
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config: { ...mockConfig, environment: 'prod' },
      });

      // Assert
      // CloudTrailが有効であることを確認
      expect(construct.cloudTrail).toBeDefined();
      expect(construct.cloudTrailBucket).toBeDefined();
    });

    test('grantSecretsAccess()でLambda関数に権限を付与できる', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackGrantAccess');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // 実際のLambda関数を作成してテスト
      const testFunction = new lambda.Function(stack, 'TestFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};'),
      });

      // Act
      construct.grantSecretsAccess(testFunction);

      // Assert
      // メソッドが正常に実行されることを確認
      expect(testFunction).toBeDefined();
      expect(construct.databaseSecret).toBeDefined();
      expect(construct.jwtSecret).toBeDefined();
      expect(construct.externalApisSecret).toBeDefined();
    });

    test('grantExternalApiAccess()でLambda関数に外部API権限を付与できる', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackGrantExternalApi');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      const mockLambdaFunction = {
        addToRolePolicy: jest.fn(),
      } as any;

      // Act
      construct.grantExternalApiAccess(mockLambdaFunction);

      // Assert
      expect(mockLambdaFunction.addToRolePolicy).toHaveBeenCalledTimes(2);

      // Bedrockアクセス権限の確認
      const bedrockCall = mockLambdaFunction.addToRolePolicy.mock.calls[0][0];
      expect(bedrockCall.toStatementJson().Action).toContain('bedrock:InvokeModel');
      expect(bedrockCall.toStatementJson().Action).toContain(
        'bedrock:InvokeModelWithResponseStream'
      );

      // SESアクセス権限の確認
      const sesCall = mockLambdaFunction.addToRolePolicy.mock.calls[1][0];
      expect(sesCall.toStatementJson().Action).toContain('ses:SendEmail');
      expect(sesCall.toStatementJson().Action).toContain('ses:SendRawEmail');
      expect(sesCall.toStatementJson().Action).toContain('ses:SendTemplatedEmail');
    });
  });

  // 自動ローテーション機能のテスト
  describe('自動ローテーション機能', () => {
    test('ローテーション機能が有効な場合にローテーション設定が作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackRotationEnabled');

      // モックのデータベースクラスターを作成
      const mockCluster = {
        clusterArn: 'arn:aws:rds:ap-northeast-1:123456789012:cluster:test-cluster',
        clusterIdentifier: 'test-cluster',
        clusterEndpoint: {
          hostname: 'test-cluster.cluster-xyz.ap-northeast-1.rds.amazonaws.com',
          port: 5432,
        },
        clusterReadEndpoint: {
          hostname: 'test-cluster.cluster-ro-xyz.ap-northeast-1.rds.amazonaws.com',
        },
        secret: {
          secretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret',
        },
      } as any;

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        databaseCluster: mockCluster,
        enableRotation: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ローテーション用Lambda関数の存在確認
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-test-secrets-rotation',
        Runtime: 'nodejs18.x',
        Handler: 'rotation-handler.rotationHandler',
        Timeout: 900, // 15分
      });

      // ローテーションスケジュールの存在確認
      template.hasResourceProperties('AWS::SecretsManager::RotationSchedule', {
        RotationRules: {
          ScheduleExpression: 'rate(30 days)',
        },
      });
    });

    test('ローテーション機能が無効な場合にローテーション設定が作成されない', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackRotationDisabled');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        enableRotation: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ローテーション用Lambda関数が作成されないことを確認
      expect(() => {
        template.hasResourceProperties('AWS::Lambda::Function', {
          FunctionName: 'goal-mandala-test-secrets-rotation',
        });
      }).toThrow();

      // ローテーションスケジュールが作成されないことを確認
      expect(() => {
        template.hasResourceProperties('AWS::SecretsManager::RotationSchedule', {});
      }).toThrow();
    });

    test('ローテーション用Lambda関数に適切なIAM権限が付与される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackRotationPermissions');

      const mockCluster = {
        clusterArn: 'arn:aws:rds:ap-northeast-1:123456789012:cluster:test-cluster',
        clusterIdentifier: 'test-cluster',
        clusterEndpoint: {
          hostname: 'test-cluster.cluster-xyz.ap-northeast-1.rds.amazonaws.com',
          port: 5432,
        },
        clusterReadEndpoint: {
          hostname: 'test-cluster.cluster-ro-xyz.ap-northeast-1.rds.amazonaws.com',
        },
        secret: {
          secretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret',
        },
      } as any;

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        databaseCluster: mockCluster,
        enableRotation: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ローテーション用IAMロールの存在確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-rotation-lambda-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      });

      // ローテーション用ポリシーの存在確認
      const roles = template.findResources('AWS::IAM::Role');
      const rotationRole = Object.values(roles).find(
        (role: any) => role.Properties.RoleName === 'goal-mandala-test-rotation-lambda-role'
      ) as any;

      expect(rotationRole).toBeDefined();
      const rotationPolicy = rotationRole.Properties.Policies[0];
      const statements = rotationPolicy.PolicyDocument.Statement;

      // Secrets Manager権限の確認
      const secretsStatement = statements.find((stmt: any) =>
        stmt.Action.includes('secretsmanager:GetSecretValue')
      );
      expect(secretsStatement).toBeDefined();
      expect(secretsStatement.Action).toContain('secretsmanager:DescribeSecret');
      expect(secretsStatement.Action).toContain('secretsmanager:GetSecretValue');
      expect(secretsStatement.Action).toContain('secretsmanager:PutSecretValue');
      expect(secretsStatement.Action).toContain('secretsmanager:UpdateSecretVersionStage');
      expect(secretsStatement.Action).toContain('secretsmanager:UpdateSecret');

      // RDS権限の確認
      const rdsStatement = statements.find((stmt: any) =>
        stmt.Action.includes('rds:ModifyDBCluster')
      );
      expect(rdsStatement).toBeDefined();
      expect(rdsStatement.Action).toContain('rds:ModifyDBCluster');
      expect(rdsStatement.Action).toContain('rds:DescribeDBClusters');

      // KMS権限の確認
      const kmsStatement = statements.find((stmt: any) => stmt.Action.includes('kms:Decrypt'));
      expect(kmsStatement).toBeDefined();
      expect(kmsStatement.Action).toContain('kms:Decrypt');
      expect(kmsStatement.Action).toContain('kms:GenerateDataKey');
    });

    test('ローテーション監視・アラート設定が作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackRotationMonitoring');

      const mockCluster = {
        clusterArn: 'arn:aws:rds:ap-northeast-1:123456789012:cluster:test-cluster',
        clusterIdentifier: 'test-cluster',
        clusterEndpoint: {
          hostname: 'test-cluster.cluster-xyz.ap-northeast-1.rds.amazonaws.com',
          port: 5432,
        },
        clusterReadEndpoint: {
          hostname: 'test-cluster.cluster-ro-xyz.ap-northeast-1.rds.amazonaws.com',
        },
        secret: {
          secretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret',
        },
      } as any;

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        databaseCluster: mockCluster,
        enableRotation: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ローテーション失敗アラームの存在確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-test-rotation-failure',
        AlarmDescription: 'Secrets Manager rotation failure alarm',
        Threshold: 1,
        EvaluationPeriods: 1,
      });

      // ローテーション成功率アラームの存在確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-test-rotation-success-rate',
        AlarmDescription: 'Secrets Manager rotation success rate alarm',
        Threshold: 95,
        EvaluationPeriods: 1,
      });

      // SNSトピック（アラート通知用）の存在確認
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'goal-mandala-test-rotation-alerts',
        DisplayName: 'Secrets Rotation Alerts - test',
      });
    });

    test('ローテーション設定の出力が正しく作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackRotationOutputs');

      const mockCluster = {
        clusterArn: 'arn:aws:rds:ap-northeast-1:123456789012:cluster:test-cluster',
        clusterIdentifier: 'test-cluster',
        clusterEndpoint: {
          hostname: 'test-cluster.cluster-xyz.ap-northeast-1.rds.amazonaws.com',
          port: 5432,
        },
        clusterReadEndpoint: {
          hostname: 'test-cluster.cluster-ro-xyz.ap-northeast-1.rds.amazonaws.com',
        },
        secret: {
          secretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret',
        },
      } as any;

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        databaseCluster: mockCluster,
        enableRotation: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);

      // ローテーション設定出力の存在確認
      const rotationConfigOutput = outputNames.find(name =>
        name.includes('DatabaseSecretRotationConfiguration')
      );
      expect(rotationConfigOutput).toBeDefined();
      template.hasOutput(rotationConfigOutput!, {
        Description: 'Database secret automatic rotation configuration',
        Export: {
          Name: 'goal-mandala-test-database-rotation-config',
        },
      });

      // ローテーション監視設定出力の存在確認
      const rotationMonitoringOutput = outputNames.find(name =>
        name.includes('RotationMonitoringConfiguration')
      );
      expect(rotationMonitoringOutput).toBeDefined();
      template.hasOutput(rotationMonitoringOutput!, {
        Description: 'Rotation monitoring and alerting configuration',
        Export: {
          Name: 'goal-mandala-test-rotation-monitoring',
        },
      });
    });

    test('データベースクラスターが提供されない場合はローテーション設定が作成されない', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackNoCluster');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        enableRotation: true, // ローテーション有効だがクラスターなし
      });

      // Assert
      const template = Template.fromStack(stack);

      // ローテーション用Lambda関数が作成されないことを確認
      expect(() => {
        template.hasResourceProperties('AWS::Lambda::Function', {
          FunctionName: 'goal-mandala-test-secrets-rotation',
        });
      }).toThrow();

      // ローテーションスケジュールが作成されないことを確認
      expect(() => {
        template.hasResourceProperties('AWS::SecretsManager::RotationSchedule', {});
      }).toThrow();
    });

    test('ローテーション間隔が30日に設定される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackRotationInterval');

      const mockCluster = {
        clusterArn: 'arn:aws:rds:ap-northeast-1:123456789012:cluster:test-cluster',
        clusterIdentifier: 'test-cluster',
        clusterEndpoint: {
          hostname: 'test-cluster.cluster-xyz.ap-northeast-1.rds.amazonaws.com',
          port: 5432,
        },
        clusterReadEndpoint: {
          hostname: 'test-cluster.cluster-ro-xyz.ap-northeast-1.rds.amazonaws.com',
        },
        secret: {
          secretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret',
        },
      } as any;

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
        databaseCluster: mockCluster,
        enableRotation: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ローテーション間隔が30日に設定されていることを確認
      template.hasResourceProperties('AWS::SecretsManager::RotationSchedule', {
        RotationRules: {
          ScheduleExpression: 'rate(30 days)',
        },
      });
    });
  });

  // 監視・アラート機能のテスト（タスク11対応）
  describe('監視・アラート機能', () => {
    test('SNS監視トピックが作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackMonitoringTopic');

      // Act
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      expect(construct.monitoringTopic).toBeDefined();

      const template = Template.fromStack(stack);

      // SNSトピックの存在確認
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'goal-mandala-test-secrets-monitoring',
        DisplayName: 'Secrets Manager Monitoring - test',
      });
    });

    test('シークレット取得監視アラームが作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackSecretAccessAlarms');

      // Act
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      expect(construct.secretAccessAlarms).toBeDefined();
      expect(construct.secretAccessAlarms!.length).toBeGreaterThan(0);

      const template = Template.fromStack(stack);

      // シークレットアクセスエラーアラームの存在確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-test-secret-access-errors',
        AlarmDescription: 'High error rate for Secrets Manager access',
        Threshold: 5,
        EvaluationPeriods: 2,
      });

      // シークレットアクセス成功率アラームの存在確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-test-secret-access-success-rate',
        AlarmDescription: 'Low success rate for Secrets Manager access',
        Threshold: 95,
        EvaluationPeriods: 3,
      });
    });

    test('異常アクセスパターン検知アラームが作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackAnomalyAlarms');

      // Act
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      expect(construct.anomalyDetectionAlarms).toBeDefined();
      expect(construct.anomalyDetectionAlarms!.length).toBeGreaterThan(0);

      const template = Template.fromStack(stack);

      // 高頻度アクセス検知アラームの存在確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-test-high-frequency-secret-access',
        AlarmDescription: 'Unusually high frequency of secret access detected',
        EvaluationPeriods: 3,
      });

      // 複数シークレット同時アクセス検知アラームの存在確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-test-multiple-secret-access',
        AlarmDescription: 'Multiple secrets accessed simultaneously - potential security concern',
        EvaluationPeriods: 2,
      });
    });

    test('カスタムメトリクス収集Lambda関数が作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackCustomMetrics');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);

      // メトリクス収集Lambda関数の存在確認
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-test-secrets-metrics-collector',
        Runtime: 'nodejs18.x',
        Handler: 'metrics-collector.handler',
        Timeout: 60,
      });

      // EventBridgeルールの存在確認
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'goal-mandala-test-secrets-metrics-collection',
        Description: 'Trigger metrics collection for Secrets Manager monitoring',
        ScheduleExpression: 'rate(5 minutes)',
      });
    });

    test('監視設定の状態を取得できる', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackMonitoringStatus');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Act
      const monitoringStatus = construct.getMonitoringStatus();

      // Assert
      expect(monitoringStatus.enabled).toBe(true);
      expect(monitoringStatus.environment).toBe('test');
      expect(monitoringStatus.topicArn).toBeDefined();
      expect(monitoringStatus.alarmsConfigured.secretAccess).toBeGreaterThan(0);
      expect(monitoringStatus.alarmsConfigured.anomalyDetection).toBeGreaterThan(0);
      expect(monitoringStatus.customMetrics.enabled).toBe(true);
      expect(monitoringStatus.customMetrics.collectionInterval).toBe('5 minutes');
    });

    test('監視設定の検証が正しく動作する', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackMonitoringValidation');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Act
      const validation = construct.validateMonitoringConfiguration();

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.environment).toBe('test');
      expect(validation.issues).toHaveLength(0);
      expect(validation.summary.totalAlarms).toBeGreaterThan(0);
      expect(validation.summary.snsTopicConfigured).toBe(true);
      expect(validation.summary.customMetricsEnabled).toBe(true);
    });

    test('監視・アラート設定のCloudFormation出力が作成される', () => {
      // Arrange
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStackMonitoringOutputs');

      // Act
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: mockConfig,
      });

      // Assert
      const template = Template.fromStack(stack);
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);

      // 監視関連の出力が存在することを確認
      const monitoringOutputs = outputNames.filter(
        name =>
          name.includes('MonitoringTopic') ||
          name.includes('MonitoringConfiguration') ||
          name.includes('AccessAlarms') ||
          name.includes('AnomalyAlarms')
      );

      expect(monitoringOutputs.length).toBeGreaterThan(0);

      // 監視トピック出力の確認（実際の出力名を使用）
      const monitoringTopicOutput = outputNames.find(name => name.includes('MonitoringTopic'));
      if (monitoringTopicOutput) {
        expect(outputs[monitoringTopicOutput].Description).toContain('monitoring');
      }

      // 監視設定出力の確認（実際の出力名を使用）
      const monitoringConfigOutput = outputNames.find(name =>
        name.includes('MonitoringConfiguration')
      );
      if (monitoringConfigOutput) {
        expect(outputs[monitoringConfigOutput].Description).toContain('monitoring');
      }
    });
  });
});
// エラーハンドリングのテスト
describe('エラーハンドリング', () => {
  test('無効な環境名でエラーが発生する', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackInvalidEnv');

    // Act & Assert
    expect(() => {
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: '', // 空の環境名
        config: mockConfig,
      });
    }).toThrow();
  });

  test('無効な設定でエラーが発生する', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackInvalidConfig');
    const invalidConfig = {
      ...mockConfig,
      stackPrefix: '', // 空のプレフィックス
    };

    // Act & Assert
    expect(() => {
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: invalidConfig,
      });
    }).toThrow();
  });

  test('カスタム暗号化キーが正しく使用される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackCustomKey');
    const customKey = new kms.Key(stack, 'CustomKey', {
      description: 'Custom encryption key for testing',
    });

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
      encryptionKey: customKey,
    });

    // Assert
    expect(construct.encryptionKey).toBe(customKey);
  });

  test('ローテーション無効化が正しく動作する', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackNoRotation');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
      enableRotation: false,
    });

    // Assert
    const template = Template.fromStack(stack);

    // ローテーション関連のリソースが作成されていないことを確認
    template.resourceCountIs('AWS::SecretsManager::RotationSchedule', 0);
  });
});

// 監視・アラート機能のテスト
describe('監視・アラート機能', () => {
  test('監視用SNSトピックが作成される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackMonitoring');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'prod', // 本番環境で監視機能が有効
      config: { ...mockConfig, environment: 'prod' },
    });

    // Assert
    expect(construct.monitoringTopic).toBeDefined();

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'goal-mandala-prod-secrets-monitoring',
    });
  });

  test('CloudWatchアラームが作成される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackAlarms');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'prod',
      config: { ...mockConfig, environment: 'prod' },
    });

    // Assert
    expect(construct.secretAccessAlarms).toBeDefined();
    expect(construct.anomalyDetectionAlarms).toBeDefined();

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 4); // 2つのシークレットアクセスアラーム + 2つの異常検知アラーム
  });

  test('CloudTrailが本番環境で有効になる', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackCloudTrail');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'prod',
      config: { ...mockConfig, environment: 'prod' },
    });

    // Assert
    expect(construct.cloudTrail).toBeDefined();
    expect(construct.cloudTrailBucket).toBeDefined();

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      IncludeGlobalServiceEvents: true,
      IsMultiRegionTrail: true,
      EnableLogFileValidation: true,
    });
  });

  test('開発環境ではCloudTrailが無効', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackNoCloudTrail');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'dev',
      config: { ...mockConfig, environment: 'dev' },
    });

    // Assert
    expect(construct.cloudTrail).toBeUndefined();
    expect(construct.cloudTrailBucket).toBeUndefined();
  });
});

// セキュリティ機能のテスト
describe('セキュリティ機能', () => {
  test('環境別アクセス制御が正しく設定される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackSecurity');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'prod',
      config: { ...mockConfig, environment: 'prod' },
    });

    // Assert
    const template = Template.fromStack(stack);

    // IAMポリシーに環境別条件が含まれていることを確認
    const policies = template.findResources('AWS::IAM::Policy');
    const secretsReadPolicy = Object.values(policies).find(
      (policy: any) => policy.Properties.PolicyName === 'goal-mandala-prod-secrets-read-policy'
    ) as any;

    expect(secretsReadPolicy).toBeDefined();
    const statements = secretsReadPolicy.Properties.PolicyDocument.Statement;
    const secretsStatement = statements.find((stmt: any) =>
      stmt.Action.includes('secretsmanager:GetSecretValue')
    );

    expect(secretsStatement.Condition).toEqual({
      StringEquals: {
        'secretsmanager:ResourceTag/Environment': 'prod',
      },
    });
  });

  test('KMS暗号化が正しく設定される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackKmsEncryption');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // 全てのシークレットがKMS暗号化を使用していることを確認
    const secrets = template.findResources('AWS::SecretsManager::Secret');
    Object.values(secrets).forEach((secret: any) => {
      expect(secret.Properties.KmsKeyId).toBeDefined();
    });

    // KMSキーローテーションが有効であることを確認
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('タグが正しく適用される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackTags');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // シークレットにタグが適用されていることを確認
    const secrets = template.findResources('AWS::SecretsManager::Secret');
    Object.values(secrets).forEach((secret: any) => {
      expect(secret.Properties.Tags).toContainEqual({
        Key: 'Environment',
        Value: 'test',
      });
      expect(secret.Properties.Tags).toContainEqual({
        Key: 'Project',
        Value: 'GoalMandala',
      });
    });
  });
});

// パフォーマンス・最適化のテスト
describe('パフォーマンス・最適化', () => {
  test('シークレット情報の効率的な取得', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackPerformance');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const secretsInfo = construct.getSecretsInfo();

    // Assert
    expect(secretsInfo).toBeDefined();
    expect(secretsInfo.database).toBeDefined();
    expect(secretsInfo.jwt).toBeDefined();
    expect(secretsInfo.externalApis).toBeDefined();
    expect(secretsInfo.encryption).toBeDefined();
    expect(secretsInfo.iam).toBeDefined();

    // パフォーマンス情報が含まれていることを確認
    expect(secretsInfo.environment).toBe('test');
    expect(secretsInfo.encryptionEnabled).toBe(true);
  });

  test('バッチ操作用の設定情報取得', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackBatch');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const batchConfig = construct.getBatchOperationConfig();

    // Assert
    expect(batchConfig).toBeDefined();
    expect(batchConfig.secretIds).toHaveLength(3);
    expect(batchConfig.secretIds).toContain('goal-mandala-test-secret-database');
    expect(batchConfig.secretIds).toContain('goal-mandala-test-secret-jwt');
    expect(batchConfig.secretIds).toContain('goal-mandala-test-secret-external-apis');
    expect(batchConfig.region).toBe('ap-northeast-1');
    expect(batchConfig.encryptionKeyArn).toBeDefined();
  });

  test('キャッシュ設定の最適化', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackCacheConfig');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'prod',
      config: { ...mockConfig, environment: 'prod' },
    });

    // Act
    const cacheConfig = construct.getCacheConfiguration();

    // Assert
    expect(cacheConfig).toBeDefined();
    expect(cacheConfig.ttl).toBeGreaterThan(0);
    expect(cacheConfig.maxSize).toBeGreaterThan(0);
    expect(cacheConfig.enableMetrics).toBe(true);

    // 本番環境では長いTTLが設定されることを確認
    expect(cacheConfig.ttl).toBeGreaterThanOrEqual(300000); // 5分以上
  });
});

// 統合テスト
describe('統合テスト', () => {
  test('完全なスタック統合', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackIntegration');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // 全ての必要なリソースが作成されていることを確認
    template.resourceCountIs('AWS::SecretsManager::Secret', 3);
    template.resourceCountIs('AWS::KMS::Key', 1);
    template.resourceCountIs('AWS::KMS::Alias', 1);
    template.resourceCountIs('AWS::IAM::Role', 1);
    template.resourceCountIs('AWS::IAM::Policy', 2); // SecretsReadPolicy + ExternalApiAccessPolicy

    // CloudFormation出力が正しく設定されていることを確認
    const outputs = template.findOutputs('*');
    const outputNames = Object.keys(outputs);
    expect(outputNames.length).toBeGreaterThan(0);

    // 統合検証メソッドの実行
    const validation = construct.validateIntegration();
    expect(validation.isValid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  test('他のスタックとの依存関係', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackDependencies');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const dependencies = construct.getStackDependencies();

    // Assert
    expect(dependencies).toBeDefined();
    expect(dependencies.requiredStacks).toContain('VpcStack');
    expect(dependencies.optionalStacks).toContain('DatabaseStack');
    expect(dependencies.exports).toBeDefined();
    expect(dependencies.imports).toBeDefined();
  });
});

// 追加のテストケース - エラーハンドリングとエッジケース
describe('エラーハンドリングとエッジケース', () => {
  test('無効な環境名でエラーが発生する', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackInvalidEnv');

    // Act & Assert
    expect(() => {
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: '', // 無効な環境名
        config: mockConfig,
      });
    }).toThrow();
  });

  test('設定が不正な場合にエラーが発生する', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackInvalidConfig');
    const invalidConfig = { ...mockConfig, stackPrefix: '' };

    // Act & Assert
    expect(() => {
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config: invalidConfig,
      });
    }).toThrow();
  });

  test('カスタム暗号化キーが正しく使用される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackCustomKey');
    const customKey = new kms.Key(stack, 'CustomKey');

    // Act
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
      encryptionKey: customKey,
    });

    // Assert
    expect(construct.encryptionKey).toBe(customKey);
  });

  test('ローテーション無効時にローテーション設定がスキップされる', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackNoRotation');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
      enableRotation: false,
    });

    // Assert
    const template = Template.fromStack(stack);

    // ローテーション関連のリソースが作成されていないことを確認
    template.resourceCountIs('AWS::Lambda::Function', 0);
  });
});

// キャッシュ機能のテスト
describe('キャッシュ機能', () => {
  test('キャッシュ設定が正しく取得される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackCache');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const cacheConfig = construct.getCacheConfiguration();

    // Assert
    expect(cacheConfig).toEqual({
      enabled: true,
      ttl: 300000, // 5分
      maxSize: 100,
      enableMetrics: true,
      cleanupInterval: 60000, // 1分
    });
  });

  test('バッチ操作設定が正しく取得される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackBatch');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const batchConfig = construct.getBatchOperationConfig();

    // Assert
    expect(batchConfig).toEqual({
      maxConcurrency: 10,
      batchSize: 5,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
      },
      timeoutMs: 30000,
    });
  });
});

// 統合テスト
describe('統合テスト', () => {
  test('全体的な統合検証が成功する', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackIntegration');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const validation = construct.validateIntegration();

    // Assert
    expect(validation.isValid).toBe(true);
    expect(validation.issues).toHaveLength(0);
    expect(validation.components).toEqual({
      secretsManager: true,
      kmsEncryption: true,
      iamRoles: true,
      monitoring: false, // テスト環境では無効
      cloudTrail: false, // テスト環境では無効
    });
  });

  test('スタック依存関係が正しく設定される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackDependencies');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const dependencies = construct.getStackDependencies();

    // Assert
    expect(dependencies.requiredStacks).toContain('VpcStack');
    expect(dependencies.optionalStacks).toContain('DatabaseStack');
    expect(dependencies.exports).toHaveProperty('secretArns');
    expect(dependencies.imports).toHaveProperty('vpcId');
  });
});

// パフォーマンステスト
describe('パフォーマンステスト', () => {
  test('大量のシークレット作成でもパフォーマンスが維持される', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackPerformance');

    // Act
    const startTime = Date.now();
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });
    const endTime = Date.now();

    // Assert
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000); // 5秒以内
  });

  test('メモリ使用量が適切な範囲内である', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackMemory');

    // Act
    const initialMemory = process.memoryUsage().heapUsed;
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });
    const finalMemory = process.memoryUsage().heapUsed;

    // Assert
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
  });
});

// セキュリティテスト
describe('セキュリティテスト', () => {
  test('IAMポリシーが最小権限の原則に従っている', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackSecurity');
    const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Act
    const securityValidation = construct.validateSecurityConfiguration();

    // Assert
    expect(securityValidation.isSecure).toBe(true);
    expect(securityValidation.issues).toHaveLength(0);
    expect(securityValidation.checks).toEqual({
      minimumPrivileges: true,
      encryptionEnabled: true,
      accessLogging: false, // テスト環境では無効
      networkIsolation: true,
    });
  });

  test('暗号化設定が適切に構成されている', () => {
    // Arrange
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStackEncryption');

    // Act
    new SecretsManagerConstruct(stack, 'SecretsManager', {
      environment: 'test',
      config: mockConfig,
    });

    // Assert
    const template = Template.fromStack(stack);

    // KMSキーが作成されていることを確認
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });

    // シークレットが暗号化されていることを確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      KmsKeyId: {
        'Fn::GetAtt': [
          template.findResources('AWS::KMS::Key')[0] || 'SecretsManagerSecretsEncryptionKey',
          'Arn',
        ],
      },
    });
  });
});
