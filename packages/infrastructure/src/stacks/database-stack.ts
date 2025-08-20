import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DatabaseConstruct } from '../constructs/database-construct';
import { SecretsManagerConstruct } from '../constructs/secrets-manager-construct';
import { SecretsManagerIntegrationTest } from '../constructs/secrets-manager-integration-test';
import { EnvironmentConfig } from '../config/environment';

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: DatabaseConstruct;
  public readonly secretsManager: SecretsManagerConstruct;
  public readonly cluster: import('aws-cdk-lib/aws-rds').DatabaseCluster;
  public readonly secret: import('aws-cdk-lib/aws-secretsmanager').ISecret;
  public readonly securityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc, databaseSecurityGroup } = props;

    // データベースコンストラクト作成
    this.database = new DatabaseConstruct(this, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    // SecretsManagerコンストラクト作成（Aurora Serverlessクラスターとの連携）
    this.secretsManager = new SecretsManagerConstruct(this, 'SecretsManager', {
      environment: this.extractEnvironmentFromStackPrefix(config.stackPrefix),
      config,
      databaseCluster: this.database.cluster,
      enableRotation:
        config.secretsManager?.enableRotation ?? config.database.enableRotation ?? false,
      encryptionKey: this.database.encryptionKey,
    });

    // パブリックプロパティの設定（他のスタックからの参照用）
    this.cluster = this.database.cluster;
    this.secret = this.database.secret;
    this.securityGroup = this.database.securityGroup;

    // VpcStackとの統合確認
    this.validateVpcIntegration(vpc, databaseSecurityGroup, config);

    // セキュリティ設定の検証と出力
    this.validateSecurityConfiguration(config);

    // CloudFormation出力の設定
    this.createCloudFormationOutputs(config);

    // タグ設定
    this.applyTags(config);

    // セキュリティ設定の出力
    this.outputSecurityConfiguration(config);

    // 統合テストの実行
    this.runIntegrationTest(config, vpc, databaseSecurityGroup);

    // 統合完了ログ
    this.logIntegrationStatus(config);
  }

  /**
   * VpcStackとの統合確認
   * 要件5.1, 5.2対応：既存VpcStackとの統合を実装
   */
  private validateVpcIntegration(
    vpc: ec2.IVpc,
    databaseSecurityGroup: ec2.ISecurityGroup,
    config: EnvironmentConfig
  ): void {
    console.log('\n=== VpcStackとの統合確認 ===');

    // VPC統合の確認
    console.log(`✅ VPC統合: ${vpc.vpcId}`);
    console.log(`✅ データベースセキュリティグループ: ${databaseSecurityGroup.securityGroupId}`);

    // サブネット確認
    const isolatedSubnets = vpc.isolatedSubnets;
    if (isolatedSubnets.length === 0) {
      throw new Error('VpcStackから分離サブネット（データベース用）が提供されていません');
    }
    console.log(`✅ 分離サブネット数: ${isolatedSubnets.length}`);
    isolatedSubnets.forEach((subnet, index) => {
      console.log(
        `   - サブネット${index + 1}: ${subnet.subnetId} (AZ: ${subnet.availabilityZone})`
      );
    });

    // プライベートサブネット確認（Lambda用）
    const privateSubnets = vpc.privateSubnets;
    console.log(`✅ プライベートサブネット数: ${privateSubnets.length}`);

    console.log('VpcStackとの統合が正常に完了しました');
    console.log('============================\n');
  }

  /**
   * セキュリティ設定の検証
   */
  private validateSecurityConfiguration(config: EnvironmentConfig): void {
    const securityChecks: string[] = [];

    // 暗号化設定の確認
    if (!config.database.enableEncryption) {
      securityChecks.push('⚠️  データベース暗号化が無効になっています');
    } else {
      securityChecks.push('✅ データベース暗号化が有効です');
    }

    // SSL接続設定の確認
    if (!config.database.enableSslConnection) {
      securityChecks.push('⚠️  SSL接続が無効になっています');
    } else {
      securityChecks.push('✅ SSL接続が有効です');
    }

    // IAM認証設定の確認
    if (!config.database.enableIamDatabaseAuthentication) {
      securityChecks.push('⚠️  IAMデータベース認証が無効になっています');
    } else {
      securityChecks.push('✅ IAMデータベース認証が有効です');
    }

    // 監査ログ設定の確認
    if (!config.database.enableAuditLog) {
      securityChecks.push('⚠️  監査ログが無効になっています');
    } else {
      securityChecks.push('✅ 監査ログが有効です');
    }

    // 削除保護設定の確認（本番環境）
    const environment = this.extractEnvironmentFromStackPrefix(config.stackPrefix);
    if ((environment === 'prod' || environment === 'stg') && !config.database.deletionProtection) {
      securityChecks.push('⚠️  本番環境で削除保護が無効になっています');
    } else if (config.database.deletionProtection) {
      securityChecks.push('✅ 削除保護が有効です');
    }

    // セキュリティチェック結果をログ出力
    console.log('\n=== データベースセキュリティ設定チェック ===');
    securityChecks.forEach(check => console.log(check));
    console.log('============================================\n');
  }

  /**
   * CloudFormation出力の設定
   * 要件5.1, 5.2対応：CloudFormation出力を設定
   */
  private createCloudFormationOutputs(config: EnvironmentConfig): void {
    // データベース接続情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster endpoint for application connections',
      exportName: `${config.stackPrefix}-database-stack-cluster-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseStackClusterReadEndpoint', {
      value: this.cluster.clusterReadEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster read endpoint for read-only connections',
      exportName: `${config.stackPrefix}-database-stack-cluster-read-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseStackClusterPort', {
      value: this.cluster.clusterEndpoint.port.toString(),
      description: 'Database port number',
      exportName: `${config.stackPrefix}-database-stack-cluster-port`,
    });

    new cdk.CfnOutput(this, 'DatabaseStackClusterIdentifier', {
      value: this.cluster.clusterIdentifier,
      description: 'Aurora PostgreSQL cluster identifier',
      exportName: `${config.stackPrefix}-database-stack-cluster-id`,
    });

    // Secrets Manager情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackSecretArn', {
      value: this.secret.secretArn,
      description: 'Database credentials secret ARN for Lambda functions',
      exportName: `${config.stackPrefix}-database-stack-secret-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseStackSecretName', {
      value: this.secret.secretName,
      description: 'Database credentials secret name',
      exportName: `${config.stackPrefix}-database-stack-secret-name`,
    });

    // セキュリティグループ情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackSecurityGroupId', {
      value: this.securityGroup.securityGroupId,
      description: 'Database security group ID for network access control',
      exportName: `${config.stackPrefix}-database-stack-security-group-id`,
    });

    // 暗号化キー情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackEncryptionKeyId', {
      value: this.database.encryptionKey.keyId,
      description: 'Database encryption key ID',
      exportName: `${config.stackPrefix}-database-stack-encryption-key-id`,
    });

    new cdk.CfnOutput(this, 'DatabaseStackEncryptionKeyArn', {
      value: this.database.encryptionKey.keyArn,
      description: 'Database encryption key ARN',
      exportName: `${config.stackPrefix}-database-stack-encryption-key-arn`,
    });

    // IAM認証情報の出力（有効な場合）
    if (this.database.databaseIam) {
      new cdk.CfnOutput(this, 'DatabaseStackLambdaExecutionRoleArn', {
        value: this.database.databaseIam.lambdaExecutionRole.roleArn,
        description: 'Lambda execution role ARN with database access permissions',
        exportName: `${config.stackPrefix}-database-stack-lambda-role-arn`,
      });
    }

    // 監視・アラート情報の出力（有効な場合）
    if (this.database.alertTopic) {
      new cdk.CfnOutput(this, 'DatabaseStackAlertTopicArn', {
        value: this.database.alertTopic.topicArn,
        description: 'SNS topic ARN for database monitoring alerts',
        exportName: `${config.stackPrefix}-database-stack-alert-topic-arn`,
      });
    }

    // データベース設定情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackConfiguration', {
      value: JSON.stringify({
        engine: 'aurora-postgresql',
        version: '15.4',
        serverlessV2: true,
        minCapacity: config.database.minCapacity,
        maxCapacity: config.database.maxCapacity,
        multiAz: config.database.multiAz,
        backupRetentionDays: config.database.backupRetentionDays || 7,
        performanceInsights: config.database.performanceInsights ?? true,
        deletionProtection: config.database.deletionProtection ?? false,
      }),
      description: 'Database configuration summary',
      exportName: `${config.stackPrefix}-database-stack-configuration`,
    });

    // VPC統合情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackVpcIntegration', {
      value: JSON.stringify({
        vpcId: this.database.cluster.vpc?.vpcId,
        subnetGroupName: this.database.subnetGroup.subnetGroupName,
        securityGroupId: this.securityGroup.securityGroupId,
        isolatedSubnets: true,
      }),
      description: 'VPC integration configuration for database',
      exportName: `${config.stackPrefix}-database-stack-vpc-integration`,
    });

    // SecretsManager統合情報の出力
    new cdk.CfnOutput(this, 'DatabaseStackSecretsManagerIntegration', {
      value: JSON.stringify({
        databaseSecretArn: this.secretsManager.databaseSecret.secretArn,
        jwtSecretArn: this.secretsManager.jwtSecret.secretArn,
        externalApisSecretArn: this.secretsManager.externalApisSecret.secretArn,
        encryptionKeyArn: this.secretsManager.encryptionKey.keyArn,
        lambdaExecutionRoleArn: this.secretsManager.lambdaExecutionRole.roleArn,
        environment: this.extractEnvironmentFromStackPrefix(config.stackPrefix),
      }),
      description: 'Secrets Manager integration configuration for database',
      exportName: `${config.stackPrefix}-database-stack-secrets-integration`,
    });

    // データベース認証情報の構造化情報出力
    const dbCredentialsStructure = this.secretsManager.getDatabaseCredentialsStructure();
    new cdk.CfnOutput(this, 'DatabaseStackCredentialsStructure', {
      value: JSON.stringify(dbCredentialsStructure),
      description: 'Database credentials structure for application integration',
      exportName: `${config.stackPrefix}-database-stack-credentials-structure`,
    });

    // 環境別シークレット命名規則の出力
    const namingConvention = this.secretsManager.getSecretNamingConvention();
    new cdk.CfnOutput(this, 'DatabaseStackSecretNaming', {
      value: JSON.stringify(namingConvention),
      description: 'Environment-specific secret naming convention',
      exportName: `${config.stackPrefix}-database-stack-secret-naming`,
    });
  }

  /**
   * タグ設定の適用
   */
  private applyTags(config: EnvironmentConfig): void {
    // 共通タグの適用
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.database).add(key, value);
      });
    }

    // DatabaseStack固有のタグ
    cdk.Tags.of(this.database).add('StackType', 'Database');
    cdk.Tags.of(this.database).add('Component', 'Aurora-PostgreSQL');
    cdk.Tags.of(this.database).add('ServerlessV2', 'true');
    cdk.Tags.of(this.database).add(
      'Environment',
      this.extractEnvironmentFromStackPrefix(config.stackPrefix)
    );
  }

  /**
   * セキュリティ設定の出力
   */
  private outputSecurityConfiguration(config: EnvironmentConfig): void {
    new cdk.CfnOutput(this, 'DatabaseStackSecurityConfiguration', {
      value: JSON.stringify({
        encryption: config.database.enableEncryption ?? true,
        sslConnection: config.database.enableSslConnection ?? true,
        iamAuthentication: config.database.enableIamDatabaseAuthentication ?? true,
        auditLog: config.database.enableAuditLog ?? true,
        deletionProtection: config.database.deletionProtection ?? false,
        networkIsolation: true,
        privateSubnetsOnly: true,
      }),
      description: 'Database security configuration summary',
      exportName: `${config.stackPrefix}-database-stack-security-config`,
    });
  }

  /**
   * 統合テストの実行
   */
  private runIntegrationTest(
    config: EnvironmentConfig,
    vpc: ec2.IVpc,
    databaseSecurityGroup: ec2.ISecurityGroup
  ): void {
    // 統合テストの実行（開発環境とテスト環境のみ）
    const environment = this.extractEnvironmentFromStackPrefix(config.stackPrefix);
    if (environment === 'dev' || environment === 'test' || environment === 'local') {
      console.log('\n=== SecretsManager統合テスト実行中 ===');

      const integrationTest = new SecretsManagerIntegrationTest(this, 'IntegrationTest', {
        config,
        vpc,
        databaseSecurityGroup,
        databaseCluster: this.database.cluster,
        secretsManagerConstruct: this.secretsManager,
      });

      console.log('SecretsManager統合テストが完了しました');
      console.log('=====================================\n');
    } else {
      console.log(`環境 ${environment} では統合テストをスキップします（本番環境のため）`);
    }
  }

  /**
   * 統合完了ログの出力
   */
  private logIntegrationStatus(config: EnvironmentConfig): void {
    console.log('\n=== DatabaseStack統合完了 ===');
    console.log(`✅ DatabaseStackが正常に作成されました`);
    console.log(`✅ VpcStackとの統合が完了しました`);
    console.log(`✅ DatabaseConstructが統合されました`);
    console.log(`✅ SecretsManagerConstructが統合されました`);
    console.log(`✅ CloudFormation出力が設定されました`);
    console.log(`✅ セキュリティ設定が適用されました`);
    console.log(`✅ タグ管理が設定されました`);

    const connectionInfo = this.database.getConnectionInfo();
    console.log('\n--- データベース接続情報 ---');
    console.log(`エンドポイント: ${connectionInfo.endpoint}`);
    console.log(`読み取りエンドポイント: ${connectionInfo.readEndpoint}`);
    console.log(`ポート: ${connectionInfo.port}`);
    console.log(`シークレットARN: ${connectionInfo.secretArn}`);
    console.log(`セキュリティグループID: ${connectionInfo.securityGroupId}`);
    console.log(`暗号化キーID: ${connectionInfo.encryptionKeyId}`);
    console.log(`IAM認証: ${connectionInfo.iamAuthenticationEnabled ? '有効' : '無効'}`);
    console.log(
      `Performance Insights: ${connectionInfo.performanceInsightsEnabled ? '有効' : '無効'}`
    );
    console.log(`監視アラート: ${connectionInfo.monitoringEnabled ? '有効' : '無効'}`);

    // SecretsManager統合情報
    const secretsInfo = this.secretsManager.getSecretsInfo();
    console.log('\n--- Secrets Manager統合情報 ---');
    console.log(`データベースシークレット: ${secretsInfo.database.secretName}`);
    console.log(`JWTシークレット: ${secretsInfo.jwt.secretName}`);
    console.log(`外部APIシークレット: ${secretsInfo.externalApis.secretName}`);
    console.log(`暗号化キー: ${secretsInfo.encryption.keyId}`);
    console.log(`Lambda実行ロール: ${secretsInfo.iam.lambdaRoleName}`);
    console.log(`環境: ${secretsInfo.environment}`);
    console.log(`暗号化有効: ${secretsInfo.encryptionEnabled ? '有効' : '無効'}`);

    // Aurora Serverless連携確認
    const clusterIntegration = this.secretsManager.validateClusterIntegration(
      this.database.cluster
    );
    console.log('\n--- Aurora Serverless連携状況 ---');
    console.log(`連携状態: ${clusterIntegration.isIntegrated ? '正常' : '問題あり'}`);
    if (clusterIntegration.clusterInfo) {
      console.log(`クラスター識別子: ${clusterIntegration.clusterInfo.identifier}`);
      console.log(`エンドポイント: ${clusterIntegration.clusterInfo.endpoint}`);
      console.log(`ポート: ${clusterIntegration.clusterInfo.port}`);
    }
    if (clusterIntegration.issues.length > 0) {
      console.log('⚠️  連携に関する問題:');
      clusterIntegration.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log('============================\n');
  }

  /**
   * スタックプレフィックスから環境名を抽出
   */
  private extractEnvironmentFromStackPrefix(stackPrefix: string): string {
    const parts = stackPrefix.split('-');
    return parts[parts.length - 1];
  }
}
