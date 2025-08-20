# Secrets Manager セキュリティ設定ガイド

## 概要

AWS Secrets Managerを使用した機密情報管理システムのセキュリティ設定に関する包括的なガイドです。セキュリティベストプラクティス、設定手順、監査方法を記載しています。

## 目次

1. [セキュリティ原則](#セキュリティ原則)
2. [暗号化設定](#暗号化設定)
3. [アクセス制御](#アクセス制御)
4. [ネットワークセキュリティ](#ネットワークセキュリティ)
5. [監査・ログ](#監査ログ)
6. [脆弱性対策](#脆弱性対策)
7. [インシデント対応](#インシデント対応)
8. [コンプライアンス](#コンプライアンス)

## セキュリティ原則

### 基本原則

1. **最小権限の原則 (Principle of Least Privilege)**
   - 必要最小限の権限のみを付与
   - 定期的な権限の見直し
   - 一時的な権限の適切な管理

2. **多層防御 (Defense in Depth)**
   - 複数のセキュリティ対策を組み合わせ
   - 単一障害点の排除
   - 段階的なセキュリティ制御

3. **ゼロトラスト (Zero Trust)**
   - 全てのアクセスを検証
   - 継続的な認証・認可
   - 最小限のネットワークアクセス

4. **データ保護**
   - 保存時・転送時の暗号化
   - データ分類と適切な取り扱い
   - データライフサイクル管理

### セキュリティ設計パターン

```typescript
// セキュアな設計パターンの例
export class SecureSecretsManagerConstruct extends Construct {
  constructor(scope: Construct, id: string, props: SecureProps) {
    super(scope, id);

    // 1. 専用KMS暗号化キー
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      enableKeyRotation: true,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      policy: this.createRestrictiveKeyPolicy(props),
    });

    // 2. 環境分離されたシークレット
    const secrets = this.createEnvironmentIsolatedSecrets(encryptionKey, props);

    // 3. 最小権限IAMロール
    const roles = this.createMinimalPrivilegeRoles(secrets, props);

    // 4. 包括的な監視
    this.setupComprehensiveMonitoring(secrets, roles, props);
  }
}
```

## 暗号化設定

### KMS暗号化キー設定

#### 1. カスタマーマネージドキーの作成

```typescript
const encryptionKey = new kms.Key(this, 'SecretsEncryptionKey', {
  description: `KMS key for Secrets Manager encryption - ${environment}`,
  enableKeyRotation: true,
  keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
  keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
  alias: `${stackPrefix}-${environment}-secrets-key`,
  removalPolicy: cdk.RemovalPolicy.RETAIN, // 本番環境では保持
  policy: new iam.PolicyDocument({
    statements: [
      // ルートアカウントの完全権限
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: ['kms:*'],
        resources: ['*'],
      }),
      // Secrets Managerサービスの権限
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:CreateGrant', 'kms:DescribeKey'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': `secretsmanager.${region}.amazonaws.com`,
          },
        },
      }),
      // Lambda関数の復号化権限（条件付き）
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal(`arn:aws:iam::${account}:role/${lambdaRoleName}`)],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': `secretsmanager.${region}.amazonaws.com`,
            'aws:PrincipalTag/Environment': environment,
          },
        },
      }),
    ],
  }),
});
```

#### 2. キーローテーション設定

```bash
# 自動キーローテーションの有効化
aws kms enable-key-rotation \
  --key-id alias/goal-mandala-prod-secrets-key

# ローテーション状況の確認
aws kms get-key-rotation-status \
  --key-id alias/goal-mandala-prod-secrets-key
```

#### 3. キー使用量の監視

```typescript
// KMS使用量監視アラーム
const kmsUsageAlarm = new cloudwatch.Alarm(this, 'KMSUsageAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/KMS',
    metricName: 'NumberOfRequestsSucceeded',
    dimensionsMap: {
      KeyId: encryptionKey.keyId,
    },
    statistic: 'Sum',
  }),
  threshold: 1000, // 1時間あたり1000リクエスト
  evaluationPeriods: 1,
  alarmDescription: 'High KMS key usage detected',
});
```

### シークレット暗号化設定

#### 1. 強力な暗号化設定

```typescript
const databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
  secretName: `${stackPrefix}-${environment}-secret-database`,
  description: `Database credentials for ${environment} environment`,
  encryptionKey: encryptionKey, // カスタマーマネージドキー使用
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      username: 'goal_mandala_user',
      engine: 'postgres',
      port: 5432,
      dbname: 'goal_mandala',
    }),
    generateStringKey: 'password',
    excludeCharacters: '"@/\\\'`', // SQLインジェクション対策
    includeSpace: false,
    passwordLength: 32, // 強力なパスワード長
    requireEachIncludedType: true, // 各文字種を含む
  },
});
```

#### 2. 暗号化の検証

```bash
#!/bin/bash
# verify-encryption.sh

SECRET_NAME="goal-mandala-prod-secret-database"

# シークレットの暗号化設定確認
aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --query '{Name:Name,KmsKeyId:KmsKeyId,EncryptionKeyArn:EncryptionKeyArn}' \
  --output table

# KMSキーの詳細確認
KMS_KEY_ID=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --query 'KmsKeyId' --output text)

aws kms describe-key \
  --key-id "$KMS_KEY_ID" \
  --query 'KeyMetadata.{KeyId:KeyId,KeyState:KeyState,KeyUsage:KeyUsage,KeySpec:KeySpec}' \
  --output table
```

## アクセス制御

### IAM権限設計

#### 1. 最小権限ポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerReadAccess",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": [
        "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:goal-mandala-prod-secret-database-*",
        "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:goal-mandala-prod-secret-jwt-*",
        "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:goal-mandala-prod-secret-external-apis-*"
      ],
      "Condition": {
        "StringEquals": {
          "secretsmanager:ResourceTag/Environment": "prod"
        }
      }
    },
    {
      "Sid": "KMSDecryptAccess",
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:ap-northeast-1:123456789012:key/12345678-1234-1234-1234-123456789012",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.ap-northeast-1.amazonaws.com"
        }
      }
    }
  ]
}
```

#### 2. 環境別アクセス制御

```typescript
// 環境別IAMロール作成
const createEnvironmentSpecificRole = (environment: string) => {
  return new iam.Role(this, `LambdaRole-${environment}`, {
    roleName: `goal-mandala-${environment}-lambda-secrets-role`,
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    inlinePolicies: {
      SecretsAccess: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
            resources: [
              `arn:aws:secretsmanager:${region}:${account}:secret:goal-mandala-${environment}-secret-*`,
            ],
            conditions: {
              StringEquals: {
                'secretsmanager:ResourceTag/Environment': environment,
              },
            },
          }),
        ],
      }),
    },
    tags: {
      Environment: environment,
      Application: 'goal-mandala',
      SecurityLevel: environment === 'prod' ? 'high' : 'medium',
    },
  });
};
```

#### 3. 条件付きアクセス

```typescript
// 時間ベースのアクセス制御
const timeBasedPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['*'],
  conditions: {
    DateGreaterThan: {
      'aws:CurrentTime': '08:00Z', // UTC 8:00以降
    },
    DateLessThan: {
      'aws:CurrentTime': '20:00Z', // UTC 20:00まで
    },
    IpAddress: {
      'aws:SourceIp': [
        '10.0.0.0/8', // 社内ネットワーク
        '172.16.0.0/12', // VPCネットワーク
      ],
    },
  },
});

// MFA必須アクセス（管理者用）
const mfaRequiredPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'secretsmanager:UpdateSecret',
    'secretsmanager:DeleteSecret',
    'secretsmanager:RestoreSecret',
  ],
  resources: ['*'],
  conditions: {
    Bool: {
      'aws:MultiFactorAuthPresent': 'true',
    },
    NumericLessThan: {
      'aws:MultiFactorAuthAge': '3600', // 1時間以内のMFA
    },
  },
});
```

### リソースベースポリシー

#### 1. シークレットリソースポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLambdaAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/goal-mandala-prod-lambda-secrets-role"
      },
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalTag/Environment": "prod"
        }
      }
    },
    {
      "Sid": "DenyUnauthorizedAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalTag/Application": "goal-mandala"
        }
      }
    }
  ]
}
```

#### 2. クロスアカウントアクセス制御

```typescript
// 開発アカウントから本番シークレットへのアクセス拒否
const crossAccountDenyPolicy = new iam.PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['secretsmanager:*'],
  resources: ['*'],
  conditions: {
    StringNotEquals: {
      'aws:PrincipalAccount': account, // 同一アカウントのみ許可
    },
  },
});
```

## ネットワークセキュリティ

### VPCエンドポイント設定

#### 1. Secrets Manager VPCエンドポイント

```typescript
const secretsManagerEndpoint = new ec2.VpcEndpoint(this, 'SecretsManagerEndpoint', {
  vpc: vpc,
  service: ec2.VpcEndpointService.SECRETS_MANAGER,
  vpcEndpointType: ec2.VpcEndpointType.INTERFACE,
  subnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [secretsManagerEndpointSG],
  policyDocument: new iam.PolicyDocument({
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
        resources: [`arn:aws:secretsmanager:${region}:${account}:secret:goal-mandala-*`],
        conditions: {
          StringEquals: {
            'aws:PrincipalVpc': vpc.vpcId,
          },
        },
      }),
    ],
  }),
});
```

#### 2. KMS VPCエンドポイント

```typescript
const kmsEndpoint = new ec2.VpcEndpoint(this, 'KMSEndpoint', {
  vpc: vpc,
  service: ec2.VpcEndpointService.KMS,
  vpcEndpointType: ec2.VpcEndpointType.INTERFACE,
  subnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [kmsEndpointSG],
  policyDocument: new iam.PolicyDocument({
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
        resources: [encryptionKey.keyArn],
        conditions: {
          StringEquals: {
            'aws:PrincipalVpc': vpc.vpcId,
          },
        },
      }),
    ],
  }),
});
```

### セキュリティグループ設定

#### 1. Lambda関数用セキュリティグループ

```typescript
const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
  vpc: vpc,
  description: 'Security group for Lambda functions accessing Secrets Manager',
  allowAllOutbound: false, // 明示的なアウトバウンドルール
});

// HTTPS通信のみ許可
lambdaSecurityGroup.addEgressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'HTTPS outbound for AWS API calls'
);

// VPCエンドポイント通信許可
lambdaSecurityGroup.addEgressRule(
  ec2.Peer.securityGroupId(secretsManagerEndpointSG.securityGroupId),
  ec2.Port.tcp(443),
  'Access to Secrets Manager VPC endpoint'
);
```

#### 2. VPCエンドポイント用セキュリティグループ

```typescript
const secretsManagerEndpointSG = new ec2.SecurityGroup(this, 'SecretsManagerEndpointSG', {
  vpc: vpc,
  description: 'Security group for Secrets Manager VPC endpoint',
  allowAllOutbound: false,
});

// Lambda関数からのアクセスのみ許可
secretsManagerEndpointSG.addIngressRule(
  ec2.Peer.securityGroupId(lambdaSecurityGroup.securityGroupId),
  ec2.Port.tcp(443),
  'Access from Lambda functions'
);
```

### ネットワークACL設定

```typescript
// プライベートサブネット用のネットワークACL
const privateNetworkAcl = new ec2.NetworkAcl(this, 'PrivateNetworkAcl', {
  vpc: vpc,
  subnetSelection: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
});

// HTTPS通信のみ許可
privateNetworkAcl.addEntry('AllowHTTPSOutbound', {
  ruleNumber: 100,
  protocol: ec2.AclProtocol.TCP,
  ruleAction: ec2.AclTrafficDirection.EGRESS,
  cidr: ec2.AclCidr.anyIpv4(),
  portRange: {
    from: 443,
    to: 443,
  },
});

// 内部通信許可
privateNetworkAcl.addEntry('AllowInternalInbound', {
  ruleNumber: 200,
  protocol: ec2.AclProtocol.TCP,
  ruleAction: ec2.AclTrafficDirection.INGRESS,
  cidr: ec2.AclCidr.ipv4(vpc.vpcCidrBlock),
  portRange: {
    from: 1024,
    to: 65535,
  },
});
```

## 監査・ログ

### CloudTrail設定

#### 1. 包括的なCloudTrail設定

```typescript
const auditTrail = new cloudtrail.Trail(this, 'SecretsManagerAuditTrail', {
  trailName: `goal-mandala-${environment}-secrets-audit-trail`,
  bucket: auditLogsBucket,
  includeGlobalServiceEvents: true,
  isMultiRegionTrail: true,
  enableFileValidation: true,
  encryptionKey: auditEncryptionKey,
  eventSelectors: [
    {
      readWriteType: cloudtrail.ReadWriteType.ALL,
      includeManagementEvents: true,
      dataResources: [
        {
          type: 'AWS::SecretsManager::Secret',
          values: [`arn:aws:secretsmanager:*:${account}:secret:goal-mandala-*`],
        },
        {
          type: 'AWS::KMS::Key',
          values: [encryptionKey.keyArn],
        },
      ],
    },
  ],
});
```

#### 2. CloudTrailログ分析

```bash
#!/bin/bash
# analyze-cloudtrail-logs.sh

echo "=== Secrets Manager Access Analysis ==="

# 1. 過去24時間のシークレットアクセス
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern '{ $.eventName = "GetSecretValue" }' \
  --query 'events[*].{Time:eventTime,User:userIdentity.type,IP:sourceIPAddress,Secret:requestParameters.secretId}' \
  --output table

# 2. 失敗したアクセス試行
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern '{ $.eventName = "GetSecretValue" && $.errorCode exists }' \
  --query 'events[*].{Time:eventTime,Error:errorCode,User:userIdentity.type,IP:sourceIPAddress}' \
  --output table

# 3. 管理操作の確認
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '7 days ago' +%s)000 \
  --filter-pattern '{ $.eventName = "UpdateSecret" || $.eventName = "DeleteSecret" || $.eventName = "CreateSecret" }' \
  --query 'events[*].{Time:eventTime,Action:eventName,User:userIdentity.userName,Secret:requestParameters.secretId}' \
  --output table
```

### アプリケーションログ

#### 1. セキュリティログ設定

```typescript
// セキュリティイベントログ
class SecurityLogger {
  static logSecretAccess(secretId: string, success: boolean, userId?: string, ip?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'secret_access',
      secretId: this.maskSecretId(secretId),
      success,
      userId: userId || 'unknown',
      sourceIP: ip || 'unknown',
      environment: process.env.ENVIRONMENT,
    };

    console.log(JSON.stringify(logEntry));

    // 失敗時は追加のセキュリティログ
    if (!success) {
      this.logSecurityIncident('secret_access_failed', logEntry);
    }
  }

  static logSecurityIncident(type: string, details: any) {
    const incident = {
      timestamp: new Date().toISOString(),
      incidentType: type,
      severity: this.calculateSeverity(type),
      details,
      environment: process.env.ENVIRONMENT,
    };

    console.error(JSON.stringify(incident));

    // 重要なインシデントはアラート送信
    if (incident.severity === 'high' || incident.severity === 'critical') {
      this.sendSecurityAlert(incident);
    }
  }

  private static maskSecretId(secretId: string): string {
    // シークレットIDの一部をマスク
    const parts = secretId.split('-');
    if (parts.length > 3) {
      return `${parts[0]}-${parts[1]}-***-${parts[parts.length - 1]}`;
    }
    return secretId;
  }
}
```

#### 2. 監査ログフィルター

```bash
# CloudWatchログフィルターの設定
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --filter-name "SecurityIncidents" \
  --filter-pattern '[timestamp, requestId, level="ERROR", message="SECURITY_INCIDENT*"]' \
  --metric-transformations \
    metricName=SecurityIncidentCount,metricNamespace=GoalMandala/Security,metricValue=1

# 異常なアクセスパターンフィルター
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --filter-name "HighFrequencySecretAccess" \
  --filter-pattern '[timestamp, requestId, level, message="secret_access", secretId, success="false"]' \
  --metric-transformations \
    metricName=FailedSecretAccessCount,metricNamespace=GoalMandala/Security,metricValue=1
```

### セキュリティメトリクス

#### 1. カスタムセキュリティメトリクス

```typescript
// セキュリティメトリクス送信
class SecurityMetrics {
  private cloudWatch = new CloudWatchClient({ region: 'ap-northeast-1' });

  async recordSecretAccess(success: boolean, secretType: string) {
    const metricData = [
      {
        MetricName: 'SecretAccessAttempts',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Success', Value: success.toString() },
          { Name: 'SecretType', Value: secretType },
          { Name: 'Environment', Value: process.env.ENVIRONMENT || 'unknown' },
        ],
        Timestamp: new Date(),
      },
    ];

    await this.cloudWatch.send(
      new PutMetricDataCommand({
        Namespace: 'GoalMandala/Security',
        MetricData: metricData,
      })
    );
  }

  async recordAnomalousActivity(activityType: string, severity: string) {
    await this.cloudWatch.send(
      new PutMetricDataCommand({
        Namespace: 'GoalMandala/Security',
        MetricData: [
          {
            MetricName: 'AnomalousActivity',
            Value: 1,
            Unit: 'Count',
            Dimensions: [
              { Name: 'ActivityType', Value: activityType },
              { Name: 'Severity', Value: severity },
            ],
            Timestamp: new Date(),
          },
        ],
      })
    );
  }
}
```

#### 2. セキュリティダッシュボード

```typescript
const securityDashboard = new cloudwatch.Dashboard(this, 'SecurityDashboard', {
  dashboardName: `goal-mandala-${environment}-security-dashboard`,
  widgets: [
    [
      new cloudwatch.GraphWidget({
        title: 'Secret Access Success Rate',
        left: [
          new cloudwatch.Metric({
            namespace: 'GoalMandala/Security',
            metricName: 'SecretAccessAttempts',
            dimensionsMap: { Success: 'true' },
            statistic: 'Sum',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'GoalMandala/Security',
            metricName: 'SecretAccessAttempts',
            dimensionsMap: { Success: 'false' },
            statistic: 'Sum',
          }),
        ],
      }),
    ],
    [
      new cloudwatch.GraphWidget({
        title: 'Security Incidents',
        left: [
          new cloudwatch.Metric({
            namespace: 'GoalMandala/Security',
            metricName: 'SecurityIncidentCount',
            statistic: 'Sum',
          }),
        ],
      }),
    ],
  ],
});
```

## 脆弱性対策

### 依存関係管理

#### 1. 脆弱性スキャン

```bash
#!/bin/bash
# vulnerability-scan.sh

echo "=== Vulnerability Scan ==="

# 1. npm audit
echo "1. Running npm audit..."
cd packages/backend
npm audit --audit-level moderate

# 2. Snyk scan (if available)
if command -v snyk &> /dev/null; then
  echo "2. Running Snyk scan..."
  snyk test --severity-threshold=medium
fi

# 3. Docker image scan (if using containers)
if command -v docker &> /dev/null; then
  echo "3. Scanning Docker images..."
  docker scan goal-mandala-backend:latest
fi

# 4. AWS Inspector (if configured)
echo "4. Checking AWS Inspector findings..."
aws inspector2 list-findings \
  --filter-criteria '{"resourceType":[{"comparison":"EQUALS","value":"ECR_IMAGE"}]}' \
  --query 'findings[?severity==`HIGH` || severity==`CRITICAL`]'
```

#### 2. 自動更新設定

```json
{
  "scripts": {
    "security-update": "npm audit fix --force",
    "dependency-check": "npm outdated",
    "security-scan": "./scripts/vulnerability-scan.sh"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run security-scan"
    }
  }
}
```

### コードセキュリティ

#### 1. 静的コード解析

```bash
# ESLint セキュリティルール
npm install --save-dev eslint-plugin-security

# .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error'
  }
};
```

#### 2. セキュアコーディング規約

```typescript
// ❌ 悪い例：機密情報のログ出力
console.log('Database password:', credentials.password);

// ✅ 良い例：機密情報のマスク
console.log('Database credentials loaded for user:', credentials.username);

// ❌ 悪い例：SQLインジェクション脆弱性
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 良い例：パラメータ化クエリ
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// ❌ 悪い例：ハードコードされた機密情報
const API_KEY = 'sk-1234567890abcdef';

// ✅ 良い例：Secrets Managerから取得
const apiCredentials = await secretService.getExternalApiCredentials();
const API_KEY = apiCredentials.bedrock.apiKey;
```

### 入力検証

#### 1. 包括的な入力検証

```typescript
import { z } from 'zod';

// シークレットID検証スキーマ
const SecretIdSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9/_+=.@-]+$/, 'Invalid characters in secret ID')
  .refine(id => id.startsWith('goal-mandala-'), 'Secret ID must start with goal-mandala-');

// 環境名検証スキーマ
const EnvironmentSchema = z.enum(['local', 'dev', 'stg', 'prod']);

// 入力検証関数
export const validateSecretRequest = (secretId: string, environment: string) => {
  try {
    SecretIdSchema.parse(secretId);
    EnvironmentSchema.parse(environment);

    // 環境とシークレットIDの整合性チェック
    if (!secretId.includes(`-${environment}-`)) {
      throw new Error('Secret ID and environment mismatch');
    }

    return true;
  } catch (error) {
    throw new SecurityError('Invalid secret request parameters', error);
  }
};
```

#### 2. レート制限

```typescript
// Lambda関数でのレート制限
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests = 100; // 1時間あたり100リクエスト
  private readonly windowMs = 60 * 60 * 1000; // 1時間

  checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 古いリクエストを削除
    const clientRequests = this.requests.get(clientId) || [];
    const validRequests = clientRequests.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return false; // レート制限に達している
    }

    // 新しいリクエストを記録
    validRequests.push(now);
    this.requests.set(clientId, validRequests);

    return true;
  }
}
```

## インシデント対応

### インシデント分類

#### 1. セキュリティインシデントレベル

| レベル | 説明                         | 対応時間  | 対応者                   |
| ------ | ---------------------------- | --------- | ------------------------ |
| P1     | 機密情報の漏洩・不正アクセス | 15分以内  | セキュリティチーム + CTO |
| P2     | 認証・認可システムの障害     | 30分以内  | セキュリティチーム       |
| P3     | 異常なアクセスパターン検知   | 1時間以内 | 運用チーム               |
| P4     | セキュリティ設定の不備       | 4時間以内 | 開発チーム               |

#### 2. インシデント対応フロー

```bash
#!/bin/bash
# security-incident-response.sh

INCIDENT_LEVEL="$1"
INCIDENT_TYPE="$2"

echo "=== Security Incident Response ==="
echo "Level: $INCIDENT_LEVEL"
echo "Type: $INCIDENT_TYPE"
echo "Timestamp: $(date)"

case "$INCIDENT_LEVEL" in
  "P1")
    echo "CRITICAL: Executing P1 incident response..."

    # 1. 即座にアクセスを制限
    aws lambda put-function-concurrency \
      --function-name goal-mandala-prod-api \
      --reserved-concurrent-executions 0

    # 2. 疑わしいIPをブロック
    # (実装は環境に依存)

    # 3. 緊急通知
    aws sns publish \
      --topic-arn "arn:aws:sns:ap-northeast-1:123456789012:security-alerts" \
      --message "P1 Security Incident: $INCIDENT_TYPE" \
      --subject "URGENT: Security Incident"

    # 4. フォレンジック証拠保全
    ./scripts/preserve-evidence.sh
    ;;

  "P2")
    echo "HIGH: Executing P2 incident response..."

    # 1. 影響範囲の特定
    ./scripts/assess-impact.sh

    # 2. 一時的な対策実施
    ./scripts/apply-temporary-fix.sh

    # 3. 通知
    aws sns publish \
      --topic-arn "arn:aws:sns:ap-northeast-1:123456789012:security-alerts" \
      --message "P2 Security Incident: $INCIDENT_TYPE"
    ;;

  *)
    echo "Standard incident response..."
    ./scripts/standard-incident-response.sh "$INCIDENT_LEVEL" "$INCIDENT_TYPE"
    ;;
esac
```

### フォレンジック対応

#### 1. 証拠保全

```bash
#!/bin/bash
# preserve-evidence.sh

EVIDENCE_DIR="/tmp/security-evidence-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

echo "=== Preserving Security Evidence ==="

# 1. CloudTrailログの保全
aws logs create-export-task \
  --log-group-name "/aws/cloudtrail" \
  --from $(date -d '24 hours ago' +%s)000 \
  --to $(date +%s)000 \
  --destination "goal-mandala-security-evidence" \
  --destination-prefix "cloudtrail-$(date +%Y%m%d)"

# 2. Lambda関数ログの保全
aws logs create-export-task \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --from $(date -d '24 hours ago' +%s)000 \
  --to $(date +%s)000 \
  --destination "goal-mandala-security-evidence" \
  --destination-prefix "lambda-logs-$(date +%Y%m%d)"

# 3. VPCフローログの保全
aws logs create-export-task \
  --log-group-name "/aws/vpc/flowlogs" \
  --from $(date -d '24 hours ago' +%s)000 \
  --to $(date +%s)000 \
  --destination "goal-mandala-security-evidence" \
  --destination-prefix "vpc-flows-$(date +%Y%m%d)"

# 4. システム状態のスナップショット
aws secretsmanager list-secrets > "$EVIDENCE_DIR/secrets-list.json"
aws iam list-roles > "$EVIDENCE_DIR/iam-roles.json"
aws kms list-keys > "$EVIDENCE_DIR/kms-keys.json"

echo "Evidence preserved in: $EVIDENCE_DIR"
```

#### 2. インシデント分析

```bash
#!/bin/bash
# analyze-security-incident.sh

echo "=== Security Incident Analysis ==="

# 1. 異常なアクセスパターンの分析
echo "1. Analyzing access patterns..."
aws logs insights start-query \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, sourceIPAddress, userIdentity.type, eventName
    | filter eventName = "GetSecretValue"
    | stats count() by sourceIPAddress
    | sort count desc
    | limit 20
  '

# 2. 失敗したアクセス試行の分析
echo "2. Analyzing failed access attempts..."
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern '{ $.eventName = "GetSecretValue" && $.errorCode exists }' \
  --query 'events[*].{Time:eventTime,Error:errorCode,IP:sourceIPAddress,User:userIdentity.type}' \
  --output table

# 3. 権限昇格の確認
echo "3. Checking for privilege escalation..."
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '7 days ago' +%s)000 \
  --filter-pattern '{ $.eventName = "AttachRolePolicy" || $.eventName = "PutRolePolicy" || $.eventName = "CreateRole" }' \
  --query 'events[*].{Time:eventTime,Action:eventName,User:userIdentity.userName,Resource:requestParameters}' \
  --output table
```

## コンプライアンス

### 規制要件対応

#### 1. GDPR対応

```typescript
// 個人データの暗号化と削除
class GDPRCompliance {
  async encryptPersonalData(data: any): Promise<string> {
    // 個人データの暗号化
    const encryptedData = await this.encrypt(JSON.stringify(data));
    return encryptedData;
  }

  async deletePersonalData(userId: string): Promise<void> {
    // 個人データの完全削除
    await this.deleteUserSecrets(userId);
    await this.deleteUserLogs(userId);
    await this.deleteUserBackups(userId);
  }

  async generateDataExport(userId: string): Promise<any> {
    // データポータビリティ対応
    const userData = await this.collectUserData(userId);
    return {
      personalData: userData,
      exportDate: new Date().toISOString(),
      format: 'JSON',
    };
  }
}
```

#### 2. SOC 2対応

```typescript
// SOC 2 コントロール実装
class SOC2Controls {
  // CC6.1: 論理・物理アクセス制御
  async implementAccessControls(): Promise<void> {
    // 最小権限の原則
    await this.enforceMinimalPrivileges();

    // 多要素認証
    await this.enforceMFA();

    // アクセスレビュー
    await this.scheduleAccessReview();
  }

  // CC6.2: 認証前の論理アクセス制御
  async implementAuthenticationControls(): Promise<void> {
    // 強力なパスワードポリシー
    await this.enforcePasswordPolicy();

    // セッション管理
    await this.implementSessionManagement();
  }

  // CC7.1: システム境界の検知
  async implementBoundaryDetection(): Promise<void> {
    // ネットワーク監視
    await this.setupNetworkMonitoring();

    // 侵入検知
    await this.setupIntrusionDetection();
  }
}
```

### 監査証跡

#### 1. 監査ログの保持

```typescript
const auditLogRetention = {
  cloudTrail: {
    retentionPeriod: '7 years', // 法的要件に応じて
    storageClass: 'GLACIER',
    encryption: 'AES-256',
  },
  applicationLogs: {
    retentionPeriod: '3 years',
    storageClass: 'STANDARD_IA',
    encryption: 'AES-256',
  },
  securityLogs: {
    retentionPeriod: '10 years',
    storageClass: 'DEEP_ARCHIVE',
    encryption: 'AES-256',
  },
};
```

#### 2. 監査レポート生成

```bash
#!/bin/bash
# generate-audit-report.sh

REPORT_DATE=$(date +%Y-%m)
REPORT_FILE="security-audit-report-${REPORT_DATE}.json"

echo "=== Generating Security Audit Report ==="

# 1. アクセス統計
ACCESS_STATS=$(aws logs insights start-query \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '1 month ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, eventName, userIdentity.type
    | filter eventName = "GetSecretValue"
    | stats count() by eventName, userIdentity.type
  ')

# 2. セキュリティインシデント統計
INCIDENT_STATS=$(aws cloudwatch get-metric-statistics \
  --namespace GoalMandala/Security \
  --metric-name SecurityIncidentCount \
  --start-time $(date -d '1 month ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum)

# 3. コンプライアンス状況
COMPLIANCE_STATUS=$(./scripts/check-compliance-status.sh)

# レポート生成
cat > "$REPORT_FILE" << EOF
{
  "reportDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "reportPeriod": {
    "start": "$(date -d '1 month ago' -u +%Y-%m-%dT%H:%M:%SZ)",
    "end": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "accessStatistics": $ACCESS_STATS,
  "incidentStatistics": $INCIDENT_STATS,
  "complianceStatus": $COMPLIANCE_STATUS,
  "recommendations": [
    "Review and update access policies quarterly",
    "Conduct security awareness training",
    "Implement additional monitoring controls"
  ]
}
EOF

echo "Audit report generated: $REPORT_FILE"
```

## セキュリティ自動化

### 自動修復

```typescript
// セキュリティ問題の自動修復
class SecurityAutoRemediation {
  async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    switch (event.type) {
      case 'UNAUTHORIZED_ACCESS':
        await this.blockSuspiciousIP(event.sourceIP);
        await this.disableCompromisedCredentials(event.credentials);
        break;

      case 'PRIVILEGE_ESCALATION':
        await this.revertPrivilegeChanges(event.changes);
        await this.notifySecurityTeam(event);
        break;

      case 'ANOMALOUS_ACTIVITY':
        await this.increaseMonitoring(event.resource);
        await this.requireAdditionalAuthentication(event.user);
        break;
    }
  }

  private async blockSuspiciousIP(ip: string): Promise<void> {
    // WAFルールでIPをブロック
    await this.updateWAFRule('block-suspicious-ips', ip);
  }

  private async disableCompromisedCredentials(credentials: string): Promise<void> {
    // 侵害された認証情報を無効化
    await this.revokeCredentials(credentials);
    await this.forcePasswordReset(credentials);
  }
}
```

### セキュリティ監視自動化

```bash
#!/bin/bash
# automated-security-monitoring.sh

# Cron設定例
# 0 */6 * * * /opt/goal-mandala/scripts/automated-security-monitoring.sh

echo "=== Automated Security Monitoring ==="

# 1. 異常なアクセスパターンの検知
ANOMALOUS_ACCESS=$(aws logs insights start-query \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '6 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, sourceIPAddress, eventName
    | filter eventName = "GetSecretValue"
    | stats count() by sourceIPAddress
    | sort count desc
    | limit 5
  ')

# 2. 閾値を超えたアクセスの確認
if [ "$(echo "$ANOMALOUS_ACCESS" | jq '.results[0].data[0].value // 0')" -gt 100 ]; then
  echo "ALERT: Anomalous access pattern detected"

  # 自動対応
  ./scripts/security-incident-response.sh "P3" "ANOMALOUS_ACCESS"
fi

# 3. セキュリティ設定の自動チェック
./scripts/security-configuration-check.sh

# 4. 脆弱性スキャンの実行
./scripts/vulnerability-scan.sh

echo "Automated security monitoring completed"
```

## 関連ドキュメント

- [API仕様書](./secrets-manager-api-specification.md)
- [運用手順書](./secrets-manager-operations-guide.md)
- [トラブルシューティングガイド](./secrets-manager-troubleshooting-guide.md)
- [統合テストガイド](./secrets-manager-integration-tests.md)
- [セキュリティチェックリスト](./security-checklist.md)

## セキュリティ連絡先

### セキュリティチーム

- **Email**: <security@goal-mandala.com>
- **緊急時**: <security-emergency@goal-mandala.com>
- **Slack**: #security-alerts

### インシデント報告

- **P1インシデント**: +81-XX-XXXX-XXXX（24時間対応）
- **一般報告**: <security-incident@goal-mandala.com>
- **匿名報告**: <https://security-report.goal-mandala.com>

### 外部セキュリティ監査

- **監査法人**: セキュリティ監査パートナー株式会社
- **ペネトレーションテスト**: セキュリティテスト株式会社
- **コンプライアンス**: コンプライアンス・アドバイザリー株式会社
