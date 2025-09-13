import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import { S3FrontendConstruct } from '../constructs/s3-frontend-construct';
import { CloudFrontConstruct } from '../constructs/cloudfront-construct';
import { MonitoringConstruct } from '../constructs/monitoring-construct';

export interface FrontendStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  environment: string;
  userPool?: cognito.IUserPool;
  userPoolClient?: cognito.IUserPoolClient;
  userPoolDomain?: cognito.IUserPoolDomain;
}

/**
 * フロントエンド配信スタック
 *
 * 機能:
 * - S3バケット（静的ウェブサイトホスティング用）
 * - CloudFrontディストリビューション
 * - オリジンアクセスコントロール
 * - SSL証明書設定
 * - セキュリティヘッダー設定
 * - 監視・ログ・アラート設定
 * - コスト監視設定
 * - CloudWatchダッシュボード
 */
export class FrontendStack extends cdk.Stack {
  public readonly s3Construct: S3FrontendConstruct;
  public readonly cloudFrontConstruct: CloudFrontConstruct;
  public readonly monitoringConstruct?: MonitoringConstruct;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config, environment, userPool, userPoolClient, userPoolDomain } = props;

    // アラート用SNSトピックの作成
    this.alertTopic = this.createAlertTopic(config, environment);

    // S3バケットの作成
    this.s3Construct = new S3FrontendConstruct(this, 'S3Frontend', {
      config,
      environment,
    });

    // CloudFrontディストリビューションの作成
    this.cloudFrontConstruct = new CloudFrontConstruct(this, 'CloudFront', {
      config,
      environment,
      bucket: this.s3Construct.bucket,
      alertTopic: this.alertTopic,
    });

    // S3バケットポリシーはCloudFrontコンストラクト内で自動設定される

    // 監視・ログ設定の作成（設定で有効化されている場合）
    if (this.shouldEnableMonitoring(config)) {
      this.monitoringConstruct = new MonitoringConstruct(this, 'Monitoring', {
        config,
        environment,
        distribution: this.cloudFrontConstruct.distribution,
        bucket: this.s3Construct.bucket,
      });
    }

    // 設定の検証
    this.validateConfiguration(config);

    // CloudFormation出力の設定
    this.createOutputs(config, userPool, userPoolClient, userPoolDomain);

    // スタックタグの設定
    this.addStackTags(config, environment);

    // 設定サマリーの出力
    this.logConfigurationSummary(config, environment);
  }

  /**
   * アラート用SNSトピックの作成
   */
  private createAlertTopic(config: EnvironmentConfig, environment: string): sns.Topic {
    const topic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${config.stackPrefix}-frontend-alerts`,
      displayName: `Frontend Alerts for ${config.stackPrefix} (${environment})`,
      fifo: false,
    });

    // メール通知の設定（設定されている場合）
    if (config.monitoring?.alertEmail) {
      topic.addSubscription(new snsSubscriptions.EmailSubscription(config.monitoring.alertEmail));
    }

    return topic;
  }

  /**
   * 監視機能を有効化するかどうかの判定
   */
  private shouldEnableMonitoring(config: EnvironmentConfig): boolean {
    const monitoring = config.frontend.monitoring;
    return !!(
      monitoring.enableAccessLogs ||
      monitoring.enableCloudFrontLogs ||
      monitoring.enableCostMonitoring ||
      monitoring.alertEmail
    );
  }

  /**
   * CloudFormation出力の設定
   */
  private createOutputs(
    config: EnvironmentConfig,
    userPool?: cognito.IUserPool,
    userPoolClient?: cognito.IUserPoolClient,
    userPoolDomain?: cognito.IUserPoolDomain
  ): void {
    // S3バケット情報
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.s3Construct.bucket.bucketName,
      description: 'Frontend S3 bucket name',
      exportName: `${this.stackName}-S3BucketName`,
    });

    new cdk.CfnOutput(this, 'S3BucketArn', {
      value: this.s3Construct.bucket.bucketArn,
      description: 'Frontend S3 bucket ARN',
      exportName: `${this.stackName}-S3BucketArn`,
    });

    // CloudFront情報
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.cloudFrontConstruct.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.cloudFrontConstruct.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${this.stackName}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.cloudFrontConstruct.domainName,
      description: 'CloudFront domain name (custom or distribution)',
      exportName: `${this.stackName}-CloudFrontDomainName`,
    });

    // デプロイメントロール
    const deploymentRoleArn = this.getOrCreateDeploymentRoleArn();
    new cdk.CfnOutput(this, 'DeploymentRoleArn', {
      value: deploymentRoleArn,
      description: 'Deployment role ARN',
      exportName: `${this.stackName}-DeploymentRoleArn`,
    });

    // ウェブサイトURL
    const websiteUrl = this.cloudFrontConstruct.distribution.distributionDomainName.startsWith(
      'https://'
    )
      ? this.cloudFrontConstruct.distribution.distributionDomainName
      : `https://${this.cloudFrontConstruct.distribution.distributionDomainName}`;

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: websiteUrl,
      description: 'Frontend website URL',
      exportName: `${this.stackName}-WebsiteUrl`,
    });

    // アラートトピック
    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS topic ARN for alerts',
      exportName: `${this.stackName}-AlertTopicArn`,
    });

    // Cognito設定情報（フロントエンドアプリケーション用）
    if (userPool) {
      new cdk.CfnOutput(this, 'CognitoUserPoolId', {
        value: userPool.userPoolId,
        description: 'Cognito User Pool ID for frontend',
        exportName: `${this.stackName}-CognitoUserPoolId`,
      });
    }

    if (userPoolClient) {
      new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
        value: userPoolClient.userPoolClientId,
        description: 'Cognito User Pool Client ID for frontend',
        exportName: `${this.stackName}-CognitoUserPoolClientId`,
      });
    }

    if (userPoolDomain) {
      new cdk.CfnOutput(this, 'CognitoUserPoolDomain', {
        value: userPoolDomain.domainName,
        description: 'Cognito User Pool Domain for frontend',
        exportName: `${this.stackName}-CognitoUserPoolDomain`,
      });

      new cdk.CfnOutput(this, 'CognitoUserPoolDomainBaseUrl', {
        value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
        description: 'Cognito User Pool Domain Base URL for frontend',
        exportName: `${this.stackName}-CognitoUserPoolDomainBaseUrl`,
      });
    }

    // フロントエンド環境変数用の設定情報
    const frontendConfig = this.createFrontendConfig(
      config,
      userPool,
      userPoolClient,
      userPoolDomain
    );
    new cdk.CfnOutput(this, 'FrontendConfig', {
      value: JSON.stringify(frontendConfig),
      description: 'Frontend configuration (JSON format)',
      exportName: `${this.stackName}-FrontendConfig`,
    });

    // 監視関連の出力（監視が有効な場合）
    if (this.monitoringConstruct) {
      const monitoringInfo = this.monitoringConstruct.getMonitoringInfo();

      new cdk.CfnOutput(this, 'DashboardUrl', {
        value: monitoringInfo.dashboardUrl,
        description: 'CloudWatch dashboard URL',
        exportName: `${this.stackName}-DashboardUrl`,
      });

      if (monitoringInfo.logsBucketName) {
        new cdk.CfnOutput(this, 'LogsBucketName', {
          value: monitoringInfo.logsBucketName,
          description: 'Logs S3 bucket name',
          exportName: `${this.stackName}-LogsBucketName`,
        });
      }

      if (monitoringInfo.budgetName) {
        new cdk.CfnOutput(this, 'BudgetName', {
          value: monitoringInfo.budgetName,
          description: 'AWS Budget name for cost monitoring',
          exportName: `${this.stackName}-BudgetName`,
        });
      }
    }
  }

  /**
   * スタックタグの設定
   */
  private addStackTags(config: EnvironmentConfig, environment: string): void {
    const tags = {
      ...config.tags,
      StackType: 'frontend',
      Component: 'frontend-distribution',
      Environment: environment,
      ManagedBy: 'cdk',
    };

    Object.entries(tags).forEach(([key, value]) => {
      if (value) {
        cdk.Tags.of(this).add(key, value);
      }
    });
  }

  /**
   * デプロイ用IAMロールの作成
   */
  public createDeploymentRole(): iam.Role {
    const deploymentRole = new iam.Role(this, 'DeploymentRole', {
      roleName: `${this.stackName}-deployment-role`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      description: 'Role for deploying frontend assets to S3 and invalidating CloudFront cache',
    });

    // S3バケットへのアクセス権限を付与
    this.s3Construct.grantDeploymentAccess(deploymentRole);

    // CloudFrontキャッシュ無効化権限を付与
    deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
        ],
        resources: [this.cloudFrontConstruct.distribution.distributionArn],
      })
    );

    return deploymentRole;
  }

  /**
   * キャッシュ無効化用Lambda関数の作成
   */
  public createInvalidationFunction(): lambda.Function {
    const invalidationFunction = new lambda.Function(this, 'InvalidationFunction', {
      functionName: `${this.stackName}-invalidation`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
                const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

                exports.handler = async (event) => {
                    const client = new CloudFrontClient({ region: 'us-east-1' });

                    const params = {
                        DistributionId: process.env.DISTRIBUTION_ID,
                        InvalidationBatch: {
                            Paths: {
                                Quantity: 3,
                                Items: ['/*', '/index.html', '/assets/*']
                            },
                            CallerReference: Date.now().toString()
                        }
                    };

                    try {
                        const result = await client.send(new CreateInvalidationCommand(params));
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ invalidationId: result.Invalidation.Id })
                        };
                    } catch (error) {
                        console.error('Invalidation failed:', error);
                        throw error;
                    }
                };
            `),
      environment: {
        DISTRIBUTION_ID: this.cloudFrontConstruct.distribution.distributionId,
        INVALIDATION_PATHS: '/*,/index.html,/assets/*',
      },
      timeout: cdk.Duration.minutes(5),
      reservedConcurrentExecutions: 1,
    });

    // CloudFront無効化権限を付与
    invalidationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
        ],
        resources: [this.cloudFrontConstruct.distribution.distributionArn],
      })
    );

    return invalidationFunction;
  }

  /**
   * ヘルスチェック用Lambda関数の作成
   */
  public createHealthCheckFunction(): lambda.Function {
    const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
      functionName: `${this.stackName}-health-check`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
                const https = require('https');

                exports.handler = async (event) => {
                    const domain = process.env.DISTRIBUTION_DOMAIN;
                    const healthPath = process.env.HEALTH_CHECK_PATH || '/health';

                    return new Promise((resolve, reject) => {
                        const options = {
                            hostname: domain,
                            path: healthPath,
                            method: 'GET',
                            timeout: 10000
                        };

                        const req = https.request(options, (res) => {
                            if (res.statusCode === 200) {
                                resolve({
                                    statusCode: 200,
                                    body: JSON.stringify({ status: 'healthy' })
                                });
                            } else {
                                reject(new Error(\`Health check failed with status: \${res.statusCode}\`));
                            }
                        });

                        req.on('error', (error) => {
                            reject(error);
                        });

                        req.end();
                    });
                };
            `),
      environment: {
        DISTRIBUTION_DOMAIN: this.cloudFrontConstruct.distribution.distributionDomainName,
        HEALTH_CHECK_PATH: '/health',
      },
      timeout: cdk.Duration.seconds(30),
    });

    return healthCheckFunction;
  }

  /**
   * ロールバック用Lambda関数の作成
   */
  public createRollbackFunction(): lambda.Function {
    const rollbackFunction = new lambda.Function(this, 'RollbackFunction', {
      functionName: `${this.stackName}-rollback`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
                const { S3Client, ListObjectVersionsCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
                const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

                exports.handler = async (event) => {
                    const s3Client = new S3Client({ region: process.env.AWS_REGION });
                    const cfClient = new CloudFrontClient({ region: 'us-east-1' });

                    const bucketName = process.env.S3_BUCKET;
                    const distributionId = process.env.DISTRIBUTION_ID;

                    try {
                        // Get previous version of objects
                        const listParams = {
                            Bucket: bucketName,
                            MaxKeys: 1000
                        };

                        const versions = await s3Client.send(new ListObjectVersionsCommand(listParams));

                        // Restore previous versions
                        for (const version of versions.Versions || []) {
                            if (!version.IsLatest) {
                                const copyParams = {
                                    Bucket: bucketName,
                                    CopySource: \`\${bucketName}/\${version.Key}?versionId=\${version.VersionId}\`,
                                    Key: version.Key
                                };

                                await s3Client.send(new CopyObjectCommand(copyParams));
                            }
                        }

                        // Invalidate CloudFront cache
                        const invalidationParams = {
                            DistributionId: distributionId,
                            InvalidationBatch: {
                                Paths: {
                                    Quantity: 1,
                                    Items: ['/*']
                                },
                                CallerReference: Date.now().toString()
                            }
                        };

                        await cfClient.send(new CreateInvalidationCommand(invalidationParams));

                        return {
                            statusCode: 200,
                            body: JSON.stringify({ message: 'Rollback completed successfully' })
                        };
                    } catch (error) {
                        console.error('Rollback failed:', error);
                        throw error;
                    }
                };
            `),
      environment: {
        S3_BUCKET: this.s3Construct.bucket.bucketName,
        DISTRIBUTION_ID: this.cloudFrontConstruct.distribution.distributionId,
      },
      timeout: cdk.Duration.minutes(15),
    });

    // 必要な権限を付与
    rollbackFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListObjectVersions',
          's3:GetObjectVersion',
          's3:PutObject',
          's3:RestoreObject',
        ],
        resources: [this.s3Construct.bucket.bucketArn, `${this.s3Construct.bucket.bucketArn}/*`],
      })
    );

    rollbackFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
        resources: [this.cloudFrontConstruct.distribution.distributionArn],
      })
    );

    return rollbackFunction;
  }

  /**
   * OIDC Identity Providerの作成
   */
  public createOIDCProvider(): iam.OpenIdConnectProvider {
    return new iam.OpenIdConnectProvider(this, 'GitHubOIDCProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });
  }

  /**
   * GitHub Actions用IAMロールの作成
   */
  public createGitHubActionsRole(repository: string): iam.Role {
    const oidcProvider = this.createOIDCProvider();

    // 環境別のブランチ制限
    const allowedBranches = this.getAllowedBranches();
    const subjectConditions = allowedBranches.map(
      branch => `repo:${repository}:ref:refs/heads/${branch}`
    );

    const githubRole = new iam.Role(this, 'GitHubActionsRole', {
      roleName: `${this.stackName}-github-actions-role`,
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub':
              subjectConditions.length === 1 ? subjectConditions[0] : subjectConditions,
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for GitHub Actions to deploy frontend',
    });

    // デプロイメント権限を付与
    const deploymentRole = this.createDeploymentRole();
    githubRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [deploymentRole.roleArn],
      })
    );

    return githubRole;
  }

  /**
   * 環境別の許可ブランチを取得
   */
  private getAllowedBranches(): string[] {
    const environment = this.node.tryGetContext('environment') || 'dev';

    switch (environment) {
      case 'prod':
        return ['main', 'release/*'];
      case 'stg':
        return ['main', 'develop', 'release/*'];
      case 'dev':
        return ['*']; // 全ブランチ許可
      default:
        return ['*'];
    }
  }

  /**
   * パフォーマンステスト用Lambda関数の作成
   */
  public createPerformanceTestFunction(): lambda.Function {
    const performanceTestFunction = new lambda.Function(this, 'PerformanceTestFunction', {
      functionName: `${this.stackName}-performance-test`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
                const https = require('https');

                exports.handler = async (event) => {
                    const domain = process.env.DISTRIBUTION_DOMAIN;
                    const endpoints = (process.env.TEST_ENDPOINTS || '/,/assets/app.js,/assets/app.css').split(',');

                    const results = [];

                    for (const endpoint of endpoints) {
                        const startTime = Date.now();

                        try {
                            await testEndpoint(domain, endpoint);
                            const responseTime = Date.now() - startTime;

                            results.push({
                                endpoint,
                                responseTime,
                                status: 'success'
                            });
                        } catch (error) {
                            results.push({
                                endpoint,
                                responseTime: Date.now() - startTime,
                                status: 'error',
                                error: error.message
                            });
                        }
                    }

                    // Check if any test failed
                    const failures = results.filter(r => r.status === 'error');
                    if (failures.length > 0) {
                        throw new Error(\`Performance test failed for \${failures.length} endpoints\`);
                    }

                    return {
                        statusCode: 200,
                        body: JSON.stringify({ results })
                    };
                };

                function testEndpoint(domain, path) {
                    return new Promise((resolve, reject) => {
                        const options = {
                            hostname: domain,
                            path: path,
                            method: 'GET',
                            timeout: 10000
                        };

                        const req = https.request(options, (res) => {
                            if (res.statusCode >= 200 && res.statusCode < 400) {
                                resolve();
                            } else {
                                reject(new Error(\`HTTP \${res.statusCode}\`));
                            }
                        });

                        req.on('error', reject);
                        req.end();
                    });
                }
            `),
      environment: {
        DISTRIBUTION_DOMAIN: this.cloudFrontConstruct.distribution.distributionDomainName,
        TEST_ENDPOINTS: '/',
      },
      timeout: cdk.Duration.minutes(15),
    });

    return performanceTestFunction;
  }

  /**
   * スタック情報の取得
   */
  public getStackInfo() {
    // デプロイメントロールARNを取得（既に作成されている場合は再利用）
    const deploymentRoleArn = this.getOrCreateDeploymentRoleArn();

    const baseInfo = {
      stackName: this.stackName,
      s3BucketName: this.s3Construct.bucket.bucketName,
      distributionId: this.cloudFrontConstruct.distribution.distributionId,
      distributionDomainName: this.cloudFrontConstruct.distribution.distributionDomainName,
      deploymentRoleArn,
    };

    // 監視情報を追加（監視が有効な場合）
    if (this.monitoringConstruct) {
      const monitoringInfo = this.monitoringConstruct.getMonitoringInfo();
      return {
        ...baseInfo,
        monitoring: monitoringInfo,
      };
    }

    return baseInfo;
  }

  /**
   * デプロイメントロールARNを取得または作成
   */
  private getOrCreateDeploymentRoleArn(): string {
    try {
      // 既存のロールを探す
      const existingRole = this.node.tryFindChild('DeploymentRole') as iam.Role;
      if (existingRole) {
        return existingRole.roleArn;
      }
    } catch (error) {
      // ロールが存在しない場合は新規作成
    }

    const deploymentRole = this.createDeploymentRole();
    return deploymentRole.roleArn;
  }

  /**
   * デプロイ用の設定情報を取得
   */
  public getDeploymentInfo() {
    return {
      bucketName: this.s3Construct.bucket.bucketName,
      distributionId: this.cloudFrontConstruct.distribution.distributionId,
      domainName: this.cloudFrontConstruct.domainName,
      websiteUrl: `https://${this.cloudFrontConstruct.distribution.distributionDomainName}`,
    };
  }

  /**
   * 環境設定との連携確認
   */
  public validateConfiguration(config: EnvironmentConfig): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    // SSL証明書とドメイン名の整合性チェック
    if (
      config.frontend.domainName &&
      !config.frontend.certificateArn &&
      !this.cloudFrontConstruct.certificate
    ) {
      warnings.push('Custom domain is configured but no SSL certificate is available');
    }

    // 監視設定の整合性チェック
    if (config.frontend.monitoring.enableAccessLogs && !this.monitoringConstruct?.logsBucket) {
      warnings.push('Access logs are enabled but no logs bucket is configured');
    }

    if (config.frontend.monitoring.enableCostMonitoring && !this.monitoringConstruct?.budget) {
      warnings.push('Cost monitoring is enabled but no budget is configured');
    }

    // セキュリティ設定の確認
    if (!config.frontend.security?.enableHsts && config.frontend.domainName) {
      warnings.push('HSTS is disabled for custom domain - consider enabling for better security');
    }

    // 警告の出力
    if (warnings.length > 0) {
      console.warn('Frontend Stack Configuration Warnings:');
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    // エラーがある場合は例外を投げる
    if (errors.length > 0) {
      throw new Error(`Frontend Stack Configuration Errors:\n${errors.join('\n')}`);
    }
  }

  /**
   * フロントエンド用の設定情報を作成
   */
  private createFrontendConfig(
    config: EnvironmentConfig,
    userPool?: cognito.IUserPool,
    userPoolClient?: cognito.IUserPoolClient,
    userPoolDomain?: cognito.IUserPoolDomain
  ): Record<string, any> {
    const frontendConfig: Record<string, any> = {
      region: config.region,
      environment: config.environment,
      apiUrl: `https://api.${config.stackPrefix}.example.com`, // APIスタックから取得する場合は後で更新
      websiteUrl: `https://${this.cloudFrontConstruct.distribution.distributionDomainName}`,
    };

    // Cognito設定を追加
    if (userPool && userPoolClient) {
      frontendConfig.cognito = {
        userPoolId: userPool.userPoolId,
        userPoolClientId: userPoolClient.userPoolClientId,
        region: config.region,
      };

      if (userPoolDomain) {
        frontendConfig.cognito.domain = userPoolDomain.domainName;
        frontendConfig.cognito.baseUrl = `https://${userPoolDomain.domainName}.auth.${config.region}.amazoncognito.com`;
      }

      // OAuth設定
      const oAuthConfig = config.cognito.userPoolClient.oAuth;
      if (oAuthConfig) {
        frontendConfig.cognito.oauth = {
          scopes: oAuthConfig.scopes,
          callbackUrls: oAuthConfig.callbackUrls,
          logoutUrls: oAuthConfig.logoutUrls,
        };
      }
    }

    return frontendConfig;
  }

  /**
   * 設定サマリーの出力
   */
  private logConfigurationSummary(config: EnvironmentConfig, environment: string): void {
    console.log('\n=== Frontend Stack Configuration Summary ===');
    console.log(`Environment: ${environment}`);
    console.log(`Stack Prefix: ${config.stackPrefix}`);
    console.log(`Region: ${config.region}`);

    console.log('\nS3 Configuration:');
    console.log(`  - Bucket Name: ${this.s3Construct.bucketName}`);
    console.log(`  - Versioning: ${config.frontend.s3.enableVersioning ? 'Enabled' : 'Disabled'}`);
    console.log(
      `  - Lifecycle Policy: ${config.frontend.s3.lifecyclePolicyEnabled ? 'Enabled' : 'Disabled'}`
    );

    console.log('\nCloudFront Configuration:');
    console.log(`  - Distribution ID: ${this.cloudFrontConstruct.distribution.distributionId}`);
    console.log(`  - Domain Name: ${config.frontend.domainName || 'Default CloudFront domain'}`);
    console.log(
      `  - SSL Certificate: ${this.cloudFrontConstruct.certificate ? 'Custom' : 'CloudFront default'}`
    );
    console.log(
      `  - Custom Error Responses: ${config.frontend.customErrorResponses ? 'Enabled' : 'Disabled'}`
    );

    console.log('\nSecurity Configuration:');
    console.log(`  - HSTS: ${config.frontend.security?.enableHsts ? 'Enabled' : 'Disabled'}`);
    console.log(
      `  - X-Frame-Options: ${config.frontend.security?.enableFrameOptions ? config.frontend.security.frameOptionsValue : 'Disabled'}`
    );
    console.log(
      `  - X-Content-Type-Options: ${config.frontend.security?.enableContentTypeOptions ? 'Enabled' : 'Disabled'}`
    );
    console.log(`  - CSP: ${config.frontend.security?.enableCsp ? 'Enabled' : 'Disabled'}`);

    if (this.monitoringConstruct) {
      console.log('\nMonitoring Configuration:');
      console.log(
        `  - Access Logs: ${config.frontend.monitoring.enableAccessLogs ? 'Enabled' : 'Disabled'}`
      );
      console.log(
        `  - CloudFront Logs: ${config.frontend.monitoring.enableCloudFrontLogs ? 'Enabled' : 'Disabled'}`
      );
      console.log(
        `  - Cost Monitoring: ${config.frontend.monitoring.enableCostMonitoring ? 'Enabled' : 'Disabled'}`
      );
      console.log(`  - Alert Email: ${config.frontend.monitoring.alertEmail || 'Not configured'}`);
      if (this.monitoringConstruct.logsBucket) {
        console.log(`  - Logs Bucket: ${this.monitoringConstruct.logsBucket.bucketName}`);
      }
    } else {
      console.log('\nMonitoring: Disabled');
    }

    console.log('\n=== End Configuration Summary ===\n');
  }
}
