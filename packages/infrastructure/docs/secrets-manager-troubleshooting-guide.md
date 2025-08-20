# Secrets Manager トラブルシューティングガイド

## 概要

AWS Secrets Managerを使用した機密情報管理システムで発生する可能性のある問題と、その解決方法を記載したトラブルシューティングガイドです。

## 目次

1. [一般的な問題](#一般的な問題)
2. [エラーコード別対処法](#エラーコード別対処法)
3. [パフォーマンス問題](#パフォーマンス問題)
4. [セキュリティ関連問題](#セキュリティ関連問題)
5. [ローテーション問題](#ローテーション問題)
6. [監視・アラート問題](#監視アラート問題)
7. [診断ツール](#診断ツール)

## 一般的な問題

### 問題1: シークレットが取得できない

**症状:**

```
Error: SECRET_NOT_FOUND
SecretServiceError: Failed to get database credentials: ResourceNotFoundException
```

**原因と対処法:**

#### 1. シークレット名の間違い

**確認方法:**

```bash
# 現在の環境変数を確認
echo $ENVIRONMENT

# 期待されるシークレット名を確認
echo "goal-mandala-${ENVIRONMENT}-secret-database"

# 実際に存在するシークレットを確認
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `goal-mandala`)].Name' \
  --output table
```

**対処法:**

```bash
# 正しいシークレット名を確認
aws secretsmanager describe-secret \
  --secret-id goal-mandala-prod-secret-database

# 環境変数が正しく設定されているか確認
aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query 'Environment.Variables'
```

#### 2. リージョンの間違い

**確認方法:**

```bash
# 現在のリージョンを確認
aws configure get region

# 他のリージョンでシークレットを検索
aws secretsmanager list-secrets \
  --region us-east-1 \
  --query 'SecretList[?contains(Name, `goal-mandala`)].Name'
```

**対処法:**

```bash
# Lambda関数のリージョン設定を確認
aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query 'Environment.Variables.AWS_REGION'

# 必要に応じて環境変数を更新
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --environment Variables='{AWS_REGION=ap-northeast-1}'
```

#### 3. CDKスタックがデプロイされていない

**確認方法:**

```bash
# CloudFormationスタックの確認
aws cloudformation describe-stacks \
  --stack-name goal-mandala-prod-database-stack \
  --query 'Stacks[0].StackStatus'

# SecretsManagerConstructが含まれているか確認
aws cloudformation describe-stack-resources \
  --stack-name goal-mandala-prod-database-stack \
  --query 'StackResources[?ResourceType==`AWS::SecretsManager::Secret`]'
```

**対処法:**

```bash
# CDKスタックを再デプロイ
cd packages/infrastructure
pnpm cdk deploy goal-mandala-prod-database-stack --require-approval never
```

### 問題2: アクセス権限エラー

**症状:**

```
Error: ACCESS_DENIED
SecretServiceError: Failed to get JWT secret: AccessDeniedException
```

**原因と対処法:**

#### 1. IAMロールの権限不足

**確認方法:**

```bash
# Lambda関数のIAMロールを確認
ROLE_NAME=$(aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query 'Role' --output text | cut -d'/' -f2)

echo "Lambda Role: $ROLE_NAME"

# ロールにアタッチされているポリシーを確認
aws iam list-attached-role-policies --role-name "$ROLE_NAME"
aws iam list-role-policies --role-name "$ROLE_NAME"
```

**対処法:**

```bash
# 必要な権限を持つポリシーをアタッチ
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::123456789012:policy/goal-mandala-prod-secrets-read-policy"

# インラインポリシーの内容を確認
aws iam get-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "goal-mandala-prod-secrets-read-policy"
```

#### 2. KMS暗号化キーへのアクセス権限不足

**確認方法:**

```b
# KMSキーのポリシーを確認
aws kms get-key-policy \
  --key-id alias/goal-mandala-prod-secrets-key \
  --policy-name default \
  --query 'Policy' --output text | jq .
```

**対処法:**

```bash
# KMSキーポリシーにLambdaロールを追加
aws kms put-key-policy \
  --key-id alias/goal-mandala-prod-secrets-key \
  --policy-name default \
  --policy file://kms-key-policy.json
```

**kms-key-policy.json:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/goal-mandala-prod-lambda-secrets-role"
      },
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.ap-northeast-1.amazonaws.com"
        }
      }
    }
  ]
}
```

### 問題3: Lambda関数のタイムアウト

**症状:**

```
Task timed out after 30.00 seconds
```

**原因と対処法:**

#### 1. ネットワーク遅延

**確認方法:**

```bash
# Lambda関数のVPC設定を確認
aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query 'VpcConfig'

# VPCエンドポイントの存在確認
aws ec2 describe-vpc-endpoints \
  --filters Name=service-name,Values=com.amazonaws.ap-northeast-1.secretsmanager \
  --query 'VpcEndpoints[0].State'
```

**対処法:**

```bash
# VPCエンドポイントを作成（CDKで管理されている場合）
cd packages/infrastructure
pnpm cdk deploy goal-mandala-prod-vpc-stack --require-approval never

# または、Lambda関数をVPCから外す（一時的な対処）
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --vpc-config SubnetIds=[],SecurityGroupIds=[]
```

#### 2. 同期処理の問題

**確認方法:**

```bash
# Lambda関数の実行時間を確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "REPORT RequestId" \
  --query 'events[*].message' | grep Duration
```

**対処法:**

```typescript
// 非同期処理とタイムアウト設定の改善
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 10 * 60 * 1000, // キャッシュTTLを延長
  maxSize: 100,
});

// プリロード処理を追加
const initPromise = secretService.preloadSecrets([
  'goal-mandala-prod-secret-database',
  'goal-mandala-prod-secret-jwt',
]);

export const handler = async (event: any) => {
  await initPromise; // 初期化完了を待機
  // 以降の処理...
};
```

## エラーコード別対処法

### SECRET_NOT_FOUND

**エラーメッセージ例:**

```
SecretServiceError: Failed to get database credentials: ResourceNotFoundException
```

**診断手順:**

```bash
# 1. シークレットの存在確認
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `goal-mandala`)].{Name:Name,LastChangedDate:LastChangedDate}'

# 2. 削除されたシークレットの確認
aws secretsmanager list-secrets \
  --include-planned-deletion \
  --query 'SecretList[?contains(Name, `goal-mandala`) && DeletedDate != null]'

# 3. CloudFormationスタックの状態確認
aws cloudformation describe-stacks \
  --query 'Stacks[?contains(StackName, `goal-mandala`)].{Name:StackName,Status:StackStatus}'
```

**対処法:**

```bash
# シークレットが削除されている場合の復元
aws secretsmanager restore-secret \
  --secret-id goal-mandala-prod-secret-database

# CDKスタックの再デプロイ
cd packages/infrastructure
pnpm cdk deploy --all --require-approval never
```

### ACCESS_DENIED

**エラーメッセージ例:**

```
SecretServiceError: Failed to get JWT secret: AccessDeniedException
```

**診断手順:**

```bash
# 1. IAM権限のシミュレーション
aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::123456789012:role/goal-mandala-prod-lambda-secrets-role" \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:goal-mandala-prod-secret-jwt-*"

# 2. シークレットのリソースポリシー確認
aws secretsmanager describe-secret \
  --secret-id goal-mandala-prod-secret-jwt \
  --query 'ReplicationStatus[0].StatusMessage'

# 3. CloudTrailでアクセス試行を確認
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "{ $.eventName = GetSecretValue && $.errorCode = AccessDenied }"
```

**対処法:**

```bash
# IAMポリシーの修正
aws iam put-role-policy \
  --role-name goal-mandala-prod-lambda-secrets-role \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json
```

### THROTTLING_EXCEPTION

**エラーメッセージ例:**

```
SecretServiceError: Failed to get external API credentials: ThrottlingException
```

**診断手順:**

```bash
# 1. API呼び出し頻度の確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "Retrieving secret" | wc -l

# 2. 同時実行数の確認
aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query 'ReservedConcurrencyConfig'

# 3. CloudWatchメトリクスでスロットリングを確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name ThrottledRequests \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**対処法:**

```typescript
// 指数バックオフリトライの実装確認
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 15 * 60 * 1000, // キャッシュTTLを延長してAPI呼び出しを削減
  maxSize: 200,
});

// バッチ取得の活用
const { database, jwt, externalApis } = await secretService.getAllSecrets();
```

### VALIDATION_ERROR

**エラーメッセージ例:**

```
SecretServiceError: Missing required field: username
```

**診断手順:**

```bash
# 1. シークレットの内容確認（値は表示されない）
aws secretsmanager describe-secret \
  --secret-id goal-mandala-prod-secret-database \
  --query '{Name:Name,Description:Description,LastChangedDate:LastChangedDate}'

# 2. シークレットのバージョン確認
aws secretsmanager list-secret-version-ids \
  --secret-id goal-mandala-prod-secret-database

# 3. 最新バージョンの確認
aws secretsmanager get-secret-value \
  --secret-id goal-mandala-prod-secret-database \
  --query 'SecretString' --output text | jq 'keys'
```

**対処法:**

```bash
# シークレットの値を修正
aws secretsmanager update-secret \
  --secret-id goal-mandala-prod-secret-database \
  --secret-string '{
    "username": "goal_mandala_user",
    "password": "secure-password",
    "engine": "postgres",
    "host": "cluster-endpoint",
    "port": 5432,
    "dbname": "goal_mandala",
    "dbClusterIdentifier": "goal-mandala-prod-cluster"
  }'
```

## パフォーマンス問題

### 問題1: レスポンス時間が遅い

**症状:**

- API応答時間が2秒以上
- Lambda関数の実行時間が長い

**診断手順:**

```bash
# 1. Lambda関数の実行時間分析
aws logs insights start-query \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 day ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @duration | filter @message like /SecretService/ | stats avg(@duration), max(@duration), min(@duration), count()'

# 2. キャッシュヒット率の確認
aws cloudwatch get-metric-statistics \
  --namespace GoalMandala/SecretsManager \
  --metric-name CacheHitRate \
  --start-time $(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average

# 3. VPC設定の確認
aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query 'VpcConfig'
```

**対処法:**

#### 1. キャッシュ設定の最適化

```typescript
// キャッシュTTLを延長
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 15 * 60 * 1000, // 15分
  maxSize: 200,
  enableMetrics: true,
});

// Lambda関数の外側で初期化（コンテナ再利用）
const secretService = new SecretService();
const initPromise = secretService.preloadSecrets([
  'goal-mandala-prod-secret-database',
  'goal-mandala-prod-secret-jwt',
  'goal-mandala-prod-secret-external-apis',
]);

export const handler = async (event: any) => {
  await initPromise;
  // 以降の処理...
};
```

#### 2. VPCエンドポイントの設定

```bash
# VPCエンドポイントの作成
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.ap-northeast-1.secretsmanager \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-12345678 subnet-87654321 \
  --security-group-ids sg-12345678
```

#### 3. Lambda関数の設定最適化

```bash
# メモリサイズの増加
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --memory-size 512

# プロビジョニング済み同時実行数の設定
aws lambda put-provisioned-concurrency-config \
  --function-name goal-mandala-prod-api \
  --provisioned-concurrency-config ProvisionedConcurrencyConfig=10
```

### 問題2: キャッシュヒット率が低い

**症状:**

- キャッシュヒット率が50%以下
- 同じシークレットを頻繁に取得している

**診断手順:**

```bash
# キャッシュメトリクスの詳細確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "Cache miss" | wc -l

aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "Cache hit" | wc -l
```

**対処法:**

#### 1. キャッシュ設定の調整

```typescript
// キャッシュサイズとTTLの最適化
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 30 * 60 * 1000, // 30分に延長
  maxSize: 500, // キャッシュサイズ増加
  enableMetrics: true,
});
```

#### 2. プリロード戦略の改善

```typescript
// 使用頻度の高いシークレットをプリロード
const highFrequencySecrets = ['goal-mandala-prod-secret-database', 'goal-mandala-prod-secret-jwt'];

await secretService.preloadSecrets(highFrequencySecrets, 60 * 60 * 1000); // 1時間キャッシュ
```

## セキュリティ関連問題

### 問題1: 不正アクセスの検知

**症状:**

- CloudTrailで異常なアクセスパターンを検知
- 未知のIPアドレスからのアクセス

**診断手順:**

```bash
# 1. 異常なアクセスパターンの確認
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "{ $.eventName = GetSecretValue && $.sourceIPAddress != \"10.0.*\" }"

# 2. アクセス頻度の分析
aws logs insights start-query \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, sourceIPAddress, userIdentity.type | filter eventName = "GetSecretValue" | stats count() by sourceIPAddress | sort count desc'

# 3. 失敗したアクセス試行の確認
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "{ $.eventName = GetSecretValue && $.errorCode exists }"
```

**対処法:**

#### 1. 緊急時の対応

```bash
# 1. 疑わしいIPアドレスをブロック
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 443 \
  --source-group sg-87654321 \
  --group-owner-id 123456789012

# 2. Lambda関数の一時停止
aws lambda put-function-concurrency \
  --function-name goal-mandala-prod-api \
  --reserved-concurrent-executions 0

# 3. シークレットのアクセス権限を一時的に制限
aws secretsmanager put-resource-policy \
  --secret-id goal-mandala-prod-secret-database \
  --resource-policy file://emergency-policy.json
```

#### 2. 長期的な対策

```bash
# VPCエンドポイントポリシーの設定
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-12345678 \
  --policy-document file://vpc-endpoint-policy.json

# CloudTrailアラームの設定
aws cloudwatch put-metric-alarm \
  --alarm-name "UnauthorizedSecretsAccess" \
  --alarm-description "Unauthorized access to secrets detected" \
  --metric-name "UnauthorizedApiCalls" \
  --namespace "CWLogs" \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1
```

### 問題2: KMS暗号化エラー

**症状:**

```
KMSInvalidStateException: The key is disabled
```

**診断手順:**

```bash
# 1. KMSキーの状態確認
aws kms describe-key \
  --key-id alias/goal-mandala-prod-secrets-key \
  --query 'KeyMetadata.{KeyId:KeyId,KeyState:KeyState,Enabled:Enabled}'

# 2. キーの使用履歴確認
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=goal-mandala-prod-secrets-key \
  --start-time $(date -d '24 hours ago' -u +%Y-%m-%dT%H:%M:%S)

# 3. キーポリシーの確認
aws kms get-key-policy \
  --key-id alias/goal-mandala-prod-secrets-key \
  --policy-name default
```

**対処法:**

```bash
# 1. キーの有効化
aws kms enable-key \
  --key-id alias/goal-mandala-prod-secrets-key

# 2. キーローテーションの確認
aws kms get-key-rotation-status \
  --key-id alias/goal-mandala-prod-secrets-key

# 3. 必要に応じてローテーションを有効化
aws kms enable-key-rotation \
  --key-id alias/goal-mandala-prod-secrets-key
```

## ローテーション問題

### 問題1: 自動ローテーションの失敗

**症状:**

```
RotationFailed: The rotation function failed to complete successfully
```

**診断手順:**

```bash
# 1. ローテーション設定の確認
aws secretsmanager describe-secret \
  --secret-id goal-mandala-prod-secret-database \
  --query '{RotationEnabled:RotationEnabled,RotationRules:RotationRules,RotationLambdaARN:RotationLambdaARN}'

# 2. ローテーション履歴の確認
aws secretsmanager list-secret-version-ids \
  --secret-id goal-mandala-prod-secret-database \
  --include-deprecated

# 3. ローテーション用Lambda関数のログ確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-rotation-handler" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "ERROR"
```

**対処法:**

#### 1. ローテーション用Lambda関数の修正

```typescript
// rotation-handler.ts の修正例
export const rotationHandler = async (event: RotationEvent): Promise<void> => {
  try {
    const { SecretId, ClientRequestToken, Step } = event;

    switch (Step) {
      case 'createSecret':
        await createNewSecret(SecretId, ClientRequestToken);
        break;
      case 'setSecret':
        await setSecretInDatabase(SecretId, ClientRequestToken);
        break;
      case 'testSecret':
        await testSecretConnection(SecretId, ClientRequestToken);
        break;
      case 'finishSecret':
        await finishSecretRotation(SecretId, ClientRequestToken);
        break;
    }
  } catch (error) {
    console.error('Rotation failed:', error);
    throw error;
  }
};
```

#### 2. データベース接続の確認

```bash
# データベースクラスターの状態確認
aws rds describe-db-clusters \
  --db-cluster-identifier goal-mandala-prod-cluster \
  --query 'DBClusters[0].Status'

# セキュリティグループの確認
aws ec2 describe-security-groups \
  --group-ids sg-12345678 \
  --query 'SecurityGroups[0].IpPermissions'
```

#### 3. 手動ローテーションの実行

```bash
# 手動でローテーションを開始
aws secretsmanager rotate-secret \
  --secret-id goal-mandala-prod-secret-database \
  --force-rotate-immediately
```

### 問題2: ローテーション後のアプリケーションエラー

**症状:**

- ローテーション後にデータベース接続エラー
- 古いパスワードでの接続試行

**診断手順:**

```bash
# 1. 現在のシークレットバージョンの確認
aws secretsmanager get-secret-value \
  --secret-id goal-mandala-prod-secret-database \
  --version-stage AWSCURRENT \
  --query 'VersionId'

# 2. アプリケーションログでの接続エラー確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "database connection"

# 3. キャッシュの状態確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "Cache hit"
```

**対処法:**

#### 1. キャッシュの強制クリア

```typescript
// Lambda関数でキャッシュをクリア
const secretService = new SecretService();
secretService.clearCache();

// 特定のシークレットのキャッシュを無効化
secretService.invalidateSecret('goal-mandala-prod-secret-database');
```

#### 2. Lambda関数の再起動

```bash
# Lambda関数の設定を更新してコンテナを強制再起動
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --environment Variables='{CACHE_CLEAR=true}'

# 設定を元に戻す
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --environment Variables='{CACHE_CLEAR=false}'
```

## 監視・アラート問題

### 問題1: アラートが発火しない

**症状:**

- エラーが発生してもアラートが来ない
- CloudWatchメトリクスが更新されない

**診断手順:**

```bash
# 1. CloudWatchアラームの状態確認
aws cloudwatch describe-alarms \
  --alarm-names "SecretsManager-HighErrorRate-Prod" \
  --query 'MetricAlarms[0].{State:StateValue,Reason:StateReason}'

# 2. メトリクスデータの確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name ErrorCount \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# 3. SNSトピックの確認
aws sns get-topic-attributes \
  --topic-arn "arn:aws:sns:ap-northeast-1:123456789012:goal-mandala-prod-alerts"
```

**対処法:**

#### 1. アラーム設定の修正

```bash
# アラームの閾値を調整
aws cloudwatch put-metric-alarm \
  --alarm-name "SecretsManager-HighErrorRate-Prod" \
  --alarm-description "High error rate for secrets retrieval" \
  --metric-name "ErrorCount" \
  --namespace "AWS/SecretsManager" \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:ap-northeast-1:123456789012:goal-mandala-prod-alerts"
```

#### 2. カスタムメトリクスの追加

```typescript
// Lambda関数でカスタムメトリクスを送信
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudWatch = new CloudWatchClient({ region: 'ap-northeast-1' });

const sendMetric = async (metricName: string, value: number) => {
  await cloudWatch.send(
    new PutMetricDataCommand({
      Namespace: 'GoalMandala/SecretsManager',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: 'Count',
          Timestamp: new Date(),
        },
      ],
    })
  );
};

// エラー発生時にメトリクスを送信
try {
  await secretService.getDatabaseCredentials();
  await sendMetric('SecretAccessSuccess', 1);
} catch (error) {
  await sendMetric('SecretAccessError', 1);
  throw error;
}
```

### 問題2: 大量のアラートが発生

**症状:**

- 短時間で大量のアラートメール
- アラート疲れによる重要な通知の見落とし

**対処法:**

#### 1. アラート頻度の制限

```bash
# アラームの評価期間を延長
aws cloudwatch put-metric-alarm \
  --alarm-name "SecretsManager-HighErrorRate-Prod" \
  --evaluation-periods 3 \
  --datapoints-to-alarm 2
```

#### 2. アラートの重要度分類

```bash
# 重要度別のSNSトピック作成
aws sns create-topic --name goal-mandala-prod-alerts-critical
aws sns create-topic --name goal-mandala-prod-alerts-warning
aws sns create-topic --name goal-mandala-prod-alerts-info
```

## 診断ツール

### 包括的診断スクリプト

```bash
#!/bin/bash
# secrets-manager-diagnostics.sh

echo "=== Secrets Manager Diagnostics ==="

ENVIRONMENT=${1:-prod}
REGION=${2:-ap-northeast-1}

echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Timestamp: $(date)"
echo ""

# 1. シークレットの存在確認
echo "1. Checking secrets existence..."
aws secretsmanager list-secrets \
  --region "$REGION" \
  --query "SecretList[?contains(Name, 'goal-mandala-$ENVIRONMENT')].{Name:Name,LastChangedDate:LastChangedDate,RotationEnabled:RotationEnabled}" \
  --output table

# 2. Lambda関数の設定確認
echo "2. Checking Lambda function configuration..."
aws lambda get-function-configuration \
  --function-name "goal-mandala-$ENVIRONMENT-api" \
  --region "$REGION" \
  --query '{Runtime:Runtime,MemorySize:MemorySize,Timeout:Timeout,Role:Role,VpcConfig:VpcConfig}' \
  --output table

# 3. IAM権限の確認
echo "3. Checking IAM permissions..."
ROLE_NAME=$(aws lambda get-function-configuration \
  --function-name "goal-mandala-$ENVIRONMENT-api" \
  --region "$REGION" \
  --query 'Role' --output text | cut -d'/' -f2)

aws iam list-attached-role-policies --role-name "$ROLE_NAME" --output table
aws iam list-role-policies --role-name "$ROLE_NAME" --output table

# 4. KMS暗号化キーの確認
echo "4. Checking KMS encryption key..."
aws kms describe-key \
  --key-id "alias/goal-mandala-$ENVIRONMENT-secrets-key" \
  --region "$REGION" \
  --query 'KeyMetadata.{KeyId:KeyId,KeyState:KeyState,Enabled:Enabled}' \
  --output table

# 5. 最近のエラーログ確認
echo "5. Checking recent error logs..."
aws logs filter-log-events \
  --log-group-name "/aws/lambda/goal-mandala-$ENVIRONMENT-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR" \
  --region "$REGION" \
  --query 'events[*].message' \
  --output text | head -10

# 6. CloudWatchメトリクスの確認
echo "6. Checking CloudWatch metrics..."
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name SuccessfulRequestCount \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region "$REGION" \
  --query 'Datapoints[0].Sum' \
  --output text

echo ""
echo "=== Diagnostics Complete ==="
```

### パフォーマンス分析スクリプト

```bash
#!/bin/bash
# performance-analysis.sh

echo "=== Performance Analysis ==="

FUNCTION_NAME="goal-mandala-prod-api"
LOG_GROUP="/aws/lambda/$FUNCTION_NAME"

# 1. 実行時間の統計
echo "1. Lambda execution time statistics (last 24 hours):"
aws logs insights start-query \
  --log-group-name "$LOG_GROUP" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @duration | filter @type = "REPORT" | stats avg(@duration), max(@duration), min(@duration), count()'

# 2. メモリ使用量の分析
echo "2. Memory usage analysis:"
aws logs insights start-query \
  --log-group-name "$LOG_GROUP" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @maxMemoryUsed | filter @type = "REPORT" | stats avg(@maxMemoryUsed), max(@maxMemoryUsed)'

# 3. エラー率の計算
echo "3. Error rate calculation:"
TOTAL_INVOCATIONS=$(aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "REPORT RequestId" | jq '.events | length')

ERROR_COUNT=$(aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "ERROR" | jq '.events | length')

if [ "$TOTAL_INVOCATIONS" -gt 0 ]; then
  ERROR_RATE=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_INVOCATIONS" | bc)
  echo "Error Rate: $ERROR_RATE% ($ERROR_COUNT/$TOTAL_INVOCATIONS)"
else
  echo "No invocations found in the last 24 hours"
fi

# 4. キャッシュヒット率の確認
echo "4. Cache hit rate:"
aws cloudwatch get-metric-statistics \
  --namespace GoalMandala/SecretsManager \
  --metric-name CacheHitRate \
  --start-time $(date -d '24 hours ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average \
  --query 'Datapoints[*].Average' \
  --output text
```

### ヘルスチェックスクリプト

```bash
#!/bin/bash
# health-check.sh

echo "=== Secrets Manager Health Check ==="

ENVIRONMENT="prod"
REGION="ap-northeast-1"
HEALTH_STATUS="HEALTHY"

# 1. シークレットアクセステスト
echo "1. Testing secret access..."
for secret in "database" "jwt" "external-apis"; do
  SECRET_NAME="goal-mandala-$ENVIRONMENT-secret-$secret"

  if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "✅ $SECRET_NAME: Accessible"
  else
    echo "❌ $SECRET_NAME: Not accessible"
    HEALTH_STATUS="UNHEALTHY"
  fi
done

# 2. Lambda関数テスト
echo "2. Testing Lambda function..."
RESPONSE=$(aws lambda invoke \
  --function-name "goal-mandala-$ENVIRONMENT-api" \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  --region "$REGION" \
  response.json 2>&1)

if echo "$RESPONSE" | grep -q "StatusCode.*200"; then
  echo "✅ Lambda function: Responsive"
else
  echo "❌ Lambda function: Not responsive"
  HEALTH_STATUS="UNHEALTHY"
fi

# 3. KMS暗号化キーテスト
echo "3. Testing KMS encryption key..."
if aws kms describe-key \
  --key-id "alias/goal-mandala-$ENVIRONMENT-secrets-key" \
  --region "$REGION" \
  --query 'KeyMetadata.Enabled' \
  --output text | grep -q "True"; then
  echo "✅ KMS key: Enabled"
else
  echo "❌ KMS key: Disabled or not found"
  HEALTH_STATUS="UNHEALTHY"
fi

# 4. 監視アラームの状態確認
echo "4. Checking monitoring alarms..."
ALARM_STATE=$(aws cloudwatch describe-alarms \
  --alarm-names "SecretsManager-HighErrorRate-Prod" \
  --region "$REGION" \
  --query 'MetricAlarms[0].StateValue' \
  --output text)

if [ "$ALARM_STATE" = "OK" ]; then
  echo "✅ Monitoring alarms: OK"
else
  echo "⚠️  Monitoring alarms: $ALARM_STATE"
fi

echo ""
echo "Overall Health Status: $HEALTH_STATUS"

# 5. 結果をCloudWatchメトリクスに送信
aws cloudwatch put-metric-data \
  --namespace "GoalMandala/SecretsManager" \
  --metric-data MetricName=HealthStatus,Value=$([ "$HEALTH_STATUS" = "HEALTHY" ] && echo 1 || echo 0),Unit=Count \
  --region "$REGION"

exit $([ "$HEALTH_STATUS" = "HEALTHY" ] && echo 0 || echo 1)
```

## 関連ドキュメント

- [API仕様書](./secrets-manager-api-specification.md)
- [運用手順書](./secrets-manager-operations-guide.md)
- [セキュリティ設定ガイド](./secrets-manager-security-guide.md)
- [統合テストガイド](./secrets-manager-integration-tests.md)

## サポート連絡先

### 技術サポート

- **Email**: <tech-support@goal-mandala.com>
- **Slack**: #secrets-manager-support
- **緊急時**: +81-XX-XXXX-XXXX

### エスカレーション

1. **Level 1**: 運用チーム（即座に対応）
2. **Level 2**: 開発チーム（30分以内）
3. **Level 3**: アーキテクト（1時間以内）
4. **Level 4**: CTO（重大インシデント）ash
