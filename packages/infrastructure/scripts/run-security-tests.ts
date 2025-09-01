#!/usr/bin/env node

/**
 * セキュリティテスト実行スクリプト
 *
 * このスクリプトは以下のセキュリティテストを実行します：
 * - 不正アクセス拒否のテスト
 * - 環境間シークレット分離のテスト
 * - 暗号化機能のテスト
 * - アクセスログ記録のテスト
 * - 脆弱性スキャンの実施
 */

import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityTestConfig {
  region: string;
  environment: string;
  testTimeout: number;
  maxRetries: number;
  enableVulnerabilityScanning: boolean;
}

interface SecurityTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details?: string;
  error?: string;
}

interface SecurityTestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: SecurityTestResult[];
  securityScore: number;
  recommendations: string[];
}

class SecurityTestRunner {
  private config: SecurityTestConfig;
  private secretsManager: AWS.SecretsManager;
  private iam: AWS.IAM;
  private kms: AWS.KMS;
  private cloudTrail: AWS.CloudTrail;
  private results: SecurityTestResult[] = [];

  constructor(config: SecurityTestConfig) {
    this.config = config;
    this.secretsManager = new AWS.SecretsManager({ region: config.region });
    this.iam = new AWS.IAM({ region: config.region });
    this.kms = new AWS.KMS({ region: config.region });
    this.cloudTrail = new AWS.CloudTrail({ region: config.region });
  }

  /**
   * 全セキュリティテストを実行
   */
  async runAllTests(): Promise<SecurityTestSummary> {
    console.log('🔒 Starting Security Tests...');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Region: ${this.config.region}`);
    console.log('─'.repeat(50));

    const startTime = Date.now();

    // 1. 不正アクセス拒否のテスト
    await this.runAccessControlTests();

    // 2. 環境間シークレット分離のテスト
    await this.runEnvironmentIsolationTests();

    // 3. 暗号化機能のテスト
    await this.runEncryptionTests();

    // 4. アクセスログ記録のテスト
    await this.runAuditLoggingTests();

    // 5. 脆弱性スキャンの実施
    if (this.config.enableVulnerabilityScanning) {
      await this.runVulnerabilityScans();
    }

    const duration = Date.now() - startTime;
    return this.generateSummary(duration);
  }

  /**
   * 1. 不正アクセス拒否のテスト
   */
  private async runAccessControlTests(): Promise<void> {
    console.log('🛡️  Running Access Control Tests...');

    // 1.1 IAMポリシーの最小権限確認
    await this.runTest('IAM Policy Least Privilege', async () => {
      const policies = await this.iam
        .listPolicies({
          Scope: 'Local',
          PathPrefix: '/goal-mandala/',
        })
        .promise();

      for (const policy of policies.Policies || []) {
        if (policy.PolicyName?.includes('secrets')) {
          const policyVersion = await this.iam
            .getPolicyVersion({
              PolicyArn: policy.Arn!,
              VersionId: policy.DefaultVersionId!,
            })
            .promise();

          const policyDocument = JSON.parse(
            decodeURIComponent(policyVersion.PolicyVersion?.Document || '{}')
          );

          // 危険な権限がないことを確認
          for (const statement of policyDocument.Statement || []) {
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];

            for (const action of actions) {
              if (action === '*' || action.endsWith(':*')) {
                throw new Error(`Overly permissive action found: ${action}`);
              }
            }
          }
        }
      }
    });

    // 1.2 不正なロールでのアクセス拒否確認
    await this.runTest('Unauthorized Role Access Denial', async () => {
      try {
        // 不正なロールでシークレットアクセスを試行
        const unauthorizedSecretsManager = new AWS.SecretsManager({
          region: this.config.region,
          credentials: new AWS.Credentials('invalid', 'invalid'),
        });

        await unauthorizedSecretsManager
          .getSecretValue({
            SecretId: `goal-mandala-${this.config.environment}-secret-database`,
          })
          .promise();

        throw new Error('Unauthorized access should have been blocked');
      } catch (error) {
        if (error.code === 'InvalidUserID.NotFound' || error.code === 'UnauthorizedOperation') {
          // 期待されるエラー
          return;
        }
        throw error;
      }
    });

    // 1.3 環境別アクセス制御確認
    await this.runTest('Environment-based Access Control', async () => {
      const secretName = `goal-mandala-${this.config.environment}-secret-database`;

      try {
        const secret = await this.secretsManager
          .describeSecret({
            SecretId: secretName,
          })
          .promise();

        // 環境タグが正しく設定されていることを確認
        const environmentTag = secret.Tags?.find(tag => tag.Key === 'Environment');
        if (!environmentTag || environmentTag.Value !== this.config.environment) {
          throw new Error(
            `Environment tag mismatch. Expected: ${this.config.environment}, Found: ${environmentTag?.Value}`
          );
        }
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          throw new Error(`Secret not found: ${secretName}`);
        }
        throw error;
      }
    });
  }

  /**
   * 2. 環境間シークレット分離のテスト
   */
  private async runEnvironmentIsolationTests(): Promise<void> {
    console.log('🔐 Running Environment Isolation Tests...');

    // 2.1 環境別シークレット命名規則確認
    await this.runTest('Environment-specific Secret Naming', async () => {
      const expectedSecrets = [
        `goal-mandala-${this.config.environment}-secret-database`,
        `goal-mandala-${this.config.environment}-secret-jwt`,
        `goal-mandala-${this.config.environment}-secret-external-apis`,
      ];

      for (const secretName of expectedSecrets) {
        try {
          await this.secretsManager
            .describeSecret({
              SecretId: secretName,
            })
            .promise();
        } catch (error) {
          if (error.code === 'ResourceNotFoundException') {
            throw new Error(`Expected secret not found: ${secretName}`);
          }
          throw error;
        }
      }
    });

    // 2.2 クロス環境アクセス防止確認
    await this.runTest('Cross-environment Access Prevention', async () => {
      const otherEnvironments = ['dev', 'stg', 'prod'].filter(
        env => env !== this.config.environment
      );

      for (const otherEnv of otherEnvironments) {
        const otherSecretName = `goal-mandala-${otherEnv}-secret-database`;

        try {
          await this.secretsManager
            .getSecretValue({
              SecretId: otherSecretName,
            })
            .promise();

          // アクセスできた場合は問題
          throw new Error(`Cross-environment access should be denied for ${otherSecretName}`);
        } catch (error) {
          if (
            error.code === 'ResourceNotFoundException' ||
            error.code === 'AccessDeniedException'
          ) {
            // 期待されるエラー
            continue;
          }
          throw error;
        }
      }
    });

    // 2.3 環境別KMS暗号化キー分離確認
    await this.runTest('Environment-specific KMS Key Isolation', async () => {
      const keyAlias = `alias/goal-mandala-${this.config.environment}-secrets-key`;

      try {
        const keyInfo = await this.kms
          .describeKey({
            KeyId: keyAlias,
          })
          .promise();

        if (!keyInfo.KeyMetadata) {
          throw new Error(`KMS key metadata not found for ${keyAlias}`);
        }

        // キーの説明に環境名が含まれていることを確認
        const expectedDescription = `KMS key for Secrets Manager encryption - ${this.config.environment}`;
        if (keyInfo.KeyMetadata.Description !== expectedDescription) {
          throw new Error(
            `KMS key description mismatch. Expected: ${expectedDescription}, Found: ${keyInfo.KeyMetadata.Description}`
          );
        }
      } catch (error) {
        if (error.code === 'NotFoundException') {
          throw new Error(`KMS key not found: ${keyAlias}`);
        }
        throw error;
      }
    });
  }

  /**
   * 3. 暗号化機能のテスト
   */
  private async runEncryptionTests(): Promise<void> {
    console.log('🔑 Running Encryption Tests...');

    // 3.1 保存時暗号化確認
    await this.runTest('Encryption at Rest', async () => {
      const secretName = `goal-mandala-${this.config.environment}-secret-database`;

      const secret = await this.secretsManager
        .describeSecret({
          SecretId: secretName,
        })
        .promise();

      if (!secret.KmsKeyId) {
        throw new Error('Secret is not encrypted with KMS key');
      }

      // カスタマーマネージドキーが使用されていることを確認
      if (secret.KmsKeyId.includes('aws/secretsmanager')) {
        throw new Error('Default AWS managed key is being used instead of customer managed key');
      }
    });

    // 3.2 KMSキーローテーション確認
    await this.runTest('KMS Key Rotation', async () => {
      const keyAlias = `alias/goal-mandala-${this.config.environment}-secrets-key`;

      const keyInfo = await this.kms
        .describeKey({
          KeyId: keyAlias,
        })
        .promise();

      const rotationStatus = await this.kms
        .getKeyRotationStatus({
          KeyId: keyInfo.KeyMetadata!.KeyId!,
        })
        .promise();

      if (!rotationStatus.KeyRotationEnabled) {
        throw new Error('KMS key rotation is not enabled');
      }
    });

    // 3.3 転送時暗号化確認
    await this.runTest('Encryption in Transit', async () => {
      const keyAlias = `alias/goal-mandala-${this.config.environment}-secrets-key`;

      const keyInfo = await this.kms
        .describeKey({
          KeyId: keyAlias,
        })
        .promise();

      const keyPolicy = await this.kms
        .getKeyPolicy({
          KeyId: keyInfo.KeyMetadata!.KeyId!,
          PolicyName: 'default',
        })
        .promise();

      const policyDocument = JSON.parse(keyPolicy.Policy || '{}');

      // TLS必須ポリシーが設定されていることを確認
      const denyInsecureTransport = policyDocument.Statement?.find(
        (statement: Record<string, unknown>) =>
          statement.Effect === 'Deny' &&
          statement.Condition?.Bool?.['aws:SecureTransport'] === 'false'
      );

      if (!denyInsecureTransport) {
        throw new Error('TLS enforcement policy not found in KMS key policy');
      }
    });
  }

  /**
   * 4. アクセスログ記録のテスト
   */
  private async runAuditLoggingTests(): Promise<void> {
    console.log('📝 Running Audit Logging Tests...');

    // 4.1 CloudTrail設定確認（本番環境のみ）
    if (['prod', 'stg'].includes(this.config.environment)) {
      await this.runTest('CloudTrail Configuration', async () => {
        const trailName = `goal-mandala-${this.config.environment}-secrets-audit-trail`;

        try {
          const trails = await this.cloudTrail
            .describeTrails({
              trailNameList: [trailName],
            })
            .promise();

          if (!trails.trailList || trails.trailList.length === 0) {
            throw new Error(`CloudTrail not found: ${trailName}`);
          }

          const trail = trails.trailList[0];
          if (!trail.IncludeGlobalServiceEvents) {
            throw new Error('CloudTrail should include global service events');
          }

          if (!trail.IsMultiRegionTrail) {
            throw new Error('CloudTrail should be multi-region');
          }

          if (!trail.EnableLogFileValidation) {
            throw new Error('CloudTrail log file validation should be enabled');
          }
        } catch (error) {
          if (error.code === 'TrailNotFoundException') {
            throw new Error(`CloudTrail not found: ${trailName}`);
          }
          throw error;
        }
      });
    } else {
      this.results.push({
        testName: 'CloudTrail Configuration',
        status: 'SKIP',
        duration: 0,
        details: 'CloudTrail only enabled for production and staging environments',
      });
    }

    // 4.2 CloudWatchログ設定確認
    await this.runTest('CloudWatch Logs Configuration', async () => {
      const logGroupName = `/aws/lambda/goal-mandala-${this.config.environment}-secrets-access`;

      const cloudWatchLogs = new AWS.CloudWatchLogs({ region: this.config.region });

      try {
        const logGroups = await cloudWatchLogs
          .describeLogGroups({
            logGroupNamePrefix: logGroupName,
          })
          .promise();

        const logGroup = logGroups.logGroups?.find(lg => lg.logGroupName === logGroupName);
        if (!logGroup) {
          throw new Error(`CloudWatch log group not found: ${logGroupName}`);
        }

        if (!logGroup.retentionInDays || logGroup.retentionInDays > 90) {
          throw new Error('Log retention period should be set and not exceed 90 days');
        }
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          throw new Error(`CloudWatch log group not found: ${logGroupName}`);
        }
        throw error;
      }
    });

    // 4.3 EventBridge設定確認
    await this.runTest('EventBridge Rules Configuration', async () => {
      const eventBridge = new AWS.EventBridge({ region: this.config.region });
      const ruleName = `goal-mandala-${this.config.environment}-secrets-access-events`;

      try {
        const rule = await eventBridge
          .describeRule({
            Name: ruleName,
          })
          .promise();

        if (rule.State !== 'ENABLED') {
          throw new Error(`EventBridge rule should be enabled: ${ruleName}`);
        }

        const eventPattern = JSON.parse(rule.EventPattern || '{}');
        if (!eventPattern.source?.includes('aws.secretsmanager')) {
          throw new Error('EventBridge rule should monitor Secrets Manager events');
        }
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          throw new Error(`EventBridge rule not found: ${ruleName}`);
        }
        throw error;
      }
    });
  }

  /**
   * 5. 脆弱性スキャンの実施
   */
  private async runVulnerabilityScans(): Promise<void> {
    console.log('🔍 Running Vulnerability Scans...');

    // 5.1 IAMポリシー脆弱性スキャン
    await this.runTest('IAM Policy Vulnerability Scan', async () => {
      const policies = await this.iam
        .listPolicies({
          Scope: 'Local',
          PathPrefix: '/goal-mandala/',
        })
        .promise();

      const vulnerabilities: string[] = [];

      for (const policy of policies.Policies || []) {
        if (policy.PolicyName?.includes('secrets')) {
          const policyVersion = await this.iam
            .getPolicyVersion({
              PolicyArn: policy.Arn!,
              VersionId: policy.DefaultVersionId!,
            })
            .promise();

          const policyDocument = JSON.parse(
            decodeURIComponent(policyVersion.PolicyVersion?.Document || '{}')
          );

          // 脆弱性チェック
          for (const statement of policyDocument.Statement || []) {
            // 1. 過度な権限チェック
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            const dangerousActions = ['*', 'secretsmanager:*', 'kms:*', 'iam:*'];

            for (const action of actions) {
              if (dangerousActions.includes(action)) {
                vulnerabilities.push(
                  `Dangerous action found: ${action} in policy ${policy.PolicyName}`
                );
              }
            }

            // 2. リソース制限チェック
            if (statement.Resource === '*' && !statement.Condition) {
              vulnerabilities.push(`Unrestricted resource access in policy ${policy.PolicyName}`);
            }

            // 3. 条件制限チェック
            if (!statement.Condition && statement.Effect === 'Allow') {
              vulnerabilities.push(`Missing conditions in policy ${policy.PolicyName}`);
            }
          }
        }
      }

      if (vulnerabilities.length > 0) {
        throw new Error(`IAM vulnerabilities found:\n${vulnerabilities.join('\n')}`);
      }
    });

    // 5.2 シークレット設定脆弱性スキャン
    await this.runTest('Secret Configuration Vulnerability Scan', async () => {
      const secretNames = [
        `goal-mandala-${this.config.environment}-secret-database`,
        `goal-mandala-${this.config.environment}-secret-jwt`,
        `goal-mandala-${this.config.environment}-secret-external-apis`,
      ];

      const vulnerabilities: string[] = [];

      for (const secretName of secretNames) {
        try {
          const secret = await this.secretsManager
            .describeSecret({
              SecretId: secretName,
            })
            .promise();

          // 1. 暗号化チェック
          if (!secret.KmsKeyId) {
            vulnerabilities.push(`Secret not encrypted: ${secretName}`);
          }

          // 2. ローテーション設定チェック
          if (!secret.RotationEnabled && secretName.includes('database')) {
            vulnerabilities.push(`Database secret rotation not enabled: ${secretName}`);
          }

          // 3. タグチェック
          const environmentTag = secret.Tags?.find(tag => tag.Key === 'Environment');
          if (!environmentTag) {
            vulnerabilities.push(`Missing environment tag: ${secretName}`);
          }

          // 4. アクセス権限チェック
          if (secret.ReplicationStatus && secret.ReplicationStatus.length > 0) {
            // レプリケーションが設定されている場合のセキュリティチェック
            for (const replication of secret.ReplicationStatus) {
              if (!replication.KmsKeyId) {
                vulnerabilities.push(
                  `Replicated secret not encrypted: ${secretName} in ${replication.Region}`
                );
              }
            }
          }
        } catch (error) {
          if (error.code === 'ResourceNotFoundException') {
            vulnerabilities.push(`Secret not found: ${secretName}`);
          }
        }
      }

      if (vulnerabilities.length > 0) {
        throw new Error(
          `Secret configuration vulnerabilities found:\n${vulnerabilities.join('\n')}`
        );
      }
    });

    // 5.3 ネットワークセキュリティスキャン
    await this.runTest('Network Security Scan', async () => {
      const ec2 = new AWS.EC2({ region: this.config.region });

      // セキュリティグループの確認
      const securityGroups = await ec2
        .describeSecurityGroups({
          Filters: [
            {
              Name: 'group-name',
              Values: [`goal-mandala-${this.config.environment}-*`],
            },
          ],
        })
        .promise();

      const vulnerabilities: string[] = [];

      for (const sg of securityGroups.SecurityGroups || []) {
        // インバウンドルールのチェック
        for (const rule of sg.IpPermissions || []) {
          if (rule.IpRanges?.some(range => range.CidrIp === '0.0.0.0/0')) {
            vulnerabilities.push(
              `Security group ${sg.GroupName} allows inbound traffic from anywhere`
            );
          }
        }

        // アウトバウンドルールのチェック
        for (const rule of sg.IpPermissionsEgress || []) {
          if (
            (rule.IpRanges?.some(range => range.CidrIp === '0.0.0.0/0') &&
              rule.IpProtocol !== 'tcp') ||
            rule.FromPort !== 443
          ) {
            vulnerabilities.push(
              `Security group ${sg.GroupName} allows unrestricted outbound traffic`
            );
          }
        }
      }

      if (vulnerabilities.length > 0) {
        throw new Error(`Network security vulnerabilities found:\n${vulnerabilities.join('\n')}`);
      }
    });
  }

  /**
   * 個別テストの実行
   */
  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`  ⏳ ${testName}...`);

      await Promise.race([
        testFunction(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), this.config.testTimeout)
        ),
      ]);

      const duration = Date.now() - startTime;
      console.log(`  ✅ ${testName} (${duration}ms)`);

      this.results.push({
        testName,
        status: 'PASS',
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.log(`  ❌ ${testName} (${duration}ms)`);
      console.log(`     Error: ${errorMessage}`);

      this.results.push({
        testName,
        status: 'FAIL',
        duration,
        error: errorMessage,
      });
    }
  }

  /**
   * テスト結果サマリーの生成
   */
  private generateSummary(totalDuration: number): SecurityTestSummary {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    // セキュリティスコアの計算（0-100）
    const securityScore = total > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

    // 推奨事項の生成
    const recommendations: string[] = [];

    if (failed > 0) {
      recommendations.push('Fix all failed security tests before deploying to production');
    }

    if (securityScore < 90) {
      recommendations.push('Security score is below 90%. Review and improve security controls');
    }

    if (this.config.environment === 'prod' && !this.config.enableVulnerabilityScanning) {
      recommendations.push('Enable vulnerability scanning for production environment');
    }

    return {
      totalTests: total,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      results: this.results,
      securityScore,
      recommendations,
    };
  }
}

/**
 * メイン実行関数
 */
async function main() {
  const config: SecurityTestConfig = {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    environment: process.env.ENVIRONMENT || 'test',
    testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    enableVulnerabilityScanning: process.env.ENABLE_VULNERABILITY_SCANNING === 'true',
  };

  const runner = new SecurityTestRunner(config);

  try {
    const summary = await runner.runAllTests();

    // 結果の表示
    console.log('\n' + '='.repeat(50));
    console.log('🔒 SECURITY TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Skipped: ${summary.skipped} ⏭️`);
    console.log(`Duration: ${summary.duration}ms`);
    console.log(`Security Score: ${summary.securityScore}/100`);

    if (summary.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // 結果をファイルに保存
    const outputPath = path.join(
      __dirname,
      '..',
      'test-results',
      `security-test-results-${config.environment}-${Date.now()}.json`
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Results saved to: ${outputPath}`);

    // 失敗したテストがある場合は終了コード1で終了
    if (summary.failed > 0) {
      console.log('\n❌ Some security tests failed. Please review and fix the issues.');
      process.exit(1);
    }

    console.log('\n✅ All security tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Security test execution failed:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (require.main === module) {
  main().catch(console.error);
}

export { SecurityTestRunner, SecurityTestConfig, SecurityTestResult, SecurityTestSummary };
