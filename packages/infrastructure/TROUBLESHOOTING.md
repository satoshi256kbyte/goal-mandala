# CDKプロジェクト トラブルシューティングガイド

## 目次

1. [一般的な問題](#一般的な問題)
2. [CDK関連の問題](#cdk関連の問題)
3. [AWS認証の問題](#aws認証の問題)
4. [デプロイ関連の問題](#デプロイ関連の問題)
5. [テスト関連の問題](#テスト関連の問題)
6. [パフォーマンス問題](#パフォーマンス問題)
7. [セキュリティ問題](#セキュリティ問題)
8. [ログとデバッグ](#ログとデバッグ)

## 一般的な問題

### Node.jsバージョンの不一致

**症状**: CDKコマンドが失敗する、依存関係のインストールエラー

**原因**: Node.jsのバージョンが要件と一致していない

**解決方法**:

```bash
# asdfでNode.jsバージョンを確認
asdf current nodejs

# 正しいバージョンをインストール
asdf install nodejs 23.10.0
asdf local nodejs 23.10.0

# 依存関係を再インストール
rm -rf node_modules package-lock.json
pnpm install
```

### pnpmの問題

**症状**: パッケージのインストールや実行が失敗する

**解決方法**:

```bash
# pnpmのキャッシュをクリア
pnpm store prune

# node_modulesを削除して再インストール
rm -rf node_modules
pnpm install

# pnpmを最新版に更新
npm install -g pnpm@latest
```

### TypeScriptコンパイルエラー

**症状**: `tsc` コマンドでエラーが発生する

**解決方法**:

```bash
# TypeScript設定の確認
pnpm run type-check

# 型定義ファイルの再インストール
pnpm install --frozen-lockfile

# tsconfig.jsonの設定確認
cat tsconfig.json
```

## CDK関連の問題

### CDK Bootstrapの問題

**症状**: `cdk deploy` 時に「bootstrap stack not found」エラー

**解決方法**:

```bash
# Bootstrap状態の確認
aws cloudformation describe-stacks --stack-name CDKToolkit

# Bootstrapの実行
pnpm run cdk:bootstrap

# 特定のリージョンでのBootstrap
pnpm run cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

### CDK Synthの失敗

**症状**: `cdk synth` コマンドが失敗する

**診断手順**:

```bash
# 詳細なエラー情報を表示
pnpm run cdk:synth --verbose

# 特定のスタックのみをsynth
pnpm run cdk synth goal-mandala-dev-database

# デバッグモードでの実行
CDK_DEBUG=true pnpm run cdk:synth
```

**一般的な解決方法**:

```bash
# 設定ファイルの確認
cat config/dev.json

# 環境変数の確認
env | grep -E "(AWS|CDK|ENVIRONMENT)"

# CDKのバージョン確認
npx cdk --version
```

### Feature Flagsの警告

**症状**: 「feature flags are not configured」警告

**解決方法**:

```bash
# 利用可能なfeature flagsを確認
pnpm run cdk --unstable=flags flags

# cdk.jsonに必要なflagsを追加（既に設定済み）
```

## AWS認証の問題

### 認証情報が見つからない

**症状**: 「Unable to locate credentials」エラー

**診断手順**:

```bash
# AWS認証情報の確認
aws sts get-caller-identity

# 認証情報の設定場所確認
aws configure list

# 環境変数の確認
env | grep AWS
```

**解決方法**:

```bash
# AWS CLIの設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=ap-northeast-1

# プロファイルを使用する場合
export AWS_PROFILE=your_profile_name
```

### 権限不足エラー

**症状**: 「Access Denied」や「User is not authorized」エラー

**必要な権限**:

- CloudFormation: フルアクセス
- IAM: 必要なロール・ポリシーの作成権限
- EC2: VPC、セキュリティグループ等の管理権限
- RDS: Aurora クラスターの管理権限
- S3: バケットの作成・管理権限
- Lambda: 関数の作成・管理権限
- API Gateway: API の作成・管理権限
- CloudFront: ディストリビューションの管理権限

**解決方法**:

```bash
# 現在のユーザー/ロールの確認
aws sts get-caller-identity

# 必要な権限をIAM管理者に依頼
# または適切なIAMポリシーをアタッチ
```

### リージョンの問題

**症状**: 「region not supported」エラー

**解決方法**:

```bash
# 現在のリージョン確認
aws configure get region

# リージョンの変更
aws configure set region ap-northeast-1

# または環境変数で設定
export AWS_DEFAULT_REGION=ap-northeast-1
```

## デプロイ関連の問題

### スタック作成の失敗

**症状**: CloudFormationスタックの作成が失敗する

**診断手順**:

```bash
# CloudFormationイベントの確認
aws cloudformation describe-stack-events --stack-name goal-mandala-dev-database

# スタックの状態確認
aws cloudformation describe-stacks --stack-name goal-mandala-dev-database
```

**一般的な原因と解決方法**:

1. **リソース名の重複**

```bash
# 既存リソースの確認
aws rds describe-db-clusters --db-cluster-identifier goal-mandala-dev-cluster

# 設定ファイルでスタックプレフィックスを変更
```

2. **容量制限の超過**

```bash
# サービス制限の確認
aws service-quotas get-service-quota --service-code rds --quota-code L-952B80B8

# 制限緩和の申請またはリソース設定の調整
```

3. **依存関係の問題**

```bash
# スタックの依存関係を確認
pnpm run cdk:synth | grep -A 10 -B 10 "DependsOn"

# 正しい順序でデプロイ
pnpm run cdk deploy goal-mandala-dev-database
pnpm run cdk deploy goal-mandala-dev-api
pnpm run cdk deploy goal-mandala-dev-frontend
```

### デプロイのタイムアウト

**症状**: デプロイが長時間実行されてタイムアウトする

**解決方法**:

```bash
# CloudFormationコンソールでスタックの状態を確認
# https://console.aws.amazon.com/cloudformation/

# 必要に応じてスタックをロールバック
aws cloudformation cancel-update-stack --stack-name goal-mandala-dev-database

# リソース設定を調整してから再デプロイ
```

### ロールバックの失敗

**症状**: スタックのロールバックが失敗する

**解決方法**:

```bash
# 失敗したリソースを手動で削除
aws rds delete-db-cluster --db-cluster-identifier stuck-cluster --skip-final-snapshot

# スタックを強制削除
aws cloudformation delete-stack --stack-name goal-mandala-dev-database

# 再度デプロイ
pnpm run cdk:deploy
```

## テスト関連の問題

### ユニットテストの失敗

**症状**: Jest テストが失敗する

**診断手順**:

```bash
# 詳細なテスト結果を表示
pnpm run test --verbose

# 特定のテストファイルのみ実行
pnpm run test src/stacks/database-stack.test.ts

# デバッグモードでテスト実行
node --inspect-brk node_modules/.bin/jest --runInBand
```

**一般的な解決方法**:

```bash
# テストの依存関係を更新
pnpm install

# Jestキャッシュをクリア
pnpm run test --clearCache

# スナップショットを更新
pnpm run test --updateSnapshot
```

### CDK Synthテストの失敗

**症状**: CDK synthテストが失敗する

**解決方法**:

```bash
# テスト用設定ファイルの確認
cat config/test.json

# テスト環境でのsynth実行
ENVIRONMENT=test pnpm run cdk:synth

# テストケースの期待値を調整
```

### カバレッジ不足

**症状**: テストカバレッジが閾値を下回る

**解決方法**:

```bash
# カバレッジレポートの詳細確認
pnpm run test:coverage

# 未テストファイルの確認
open coverage/lcov-report/index.html

# 必要なテストケースを追加
```

## パフォーマンス問題

### Aurora Serverless V2の遅延

**症状**: データベース接続が遅い

**診断手順**:

```bash
# Aurora クラスターの状態確認
aws rds describe-db-clusters --db-cluster-identifier goal-mandala-dev-cluster

# CloudWatch メトリクスの確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBClusterIdentifier,Value=goal-mandala-dev-cluster \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

**解決方法**:

```json
// config/dev.json
{
  "database": {
    "minCapacity": 1.0, // 最小容量を上げる
    "maxCapacity": 4.0, // 最大容量を調整
    "autoPause": false // 自動一時停止を無効化
  }
}
```

### Lambda関数のコールドスタート

**症状**: Lambda関数の初回実行が遅い

**解決方法**:

```json
// config/dev.json
{
  "lambda": {
    "timeout": 60, // タイムアウトを延長
    "memorySize": 1024, // メモリサイズを増加
    "reservedConcurrency": 5 // 予約済み同時実行数を設定
  }
}
```

### CloudFrontキャッシュの問題

**症状**: 静的コンテンツの更新が反映されない

**解決方法**:

```bash
# CloudFrontキャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"

# キャッシュ設定の確認
aws cloudfront get-distribution-config --id E1234567890123
```

## セキュリティ問題

### VPCとネットワーク関連の問題

#### 統合テストスクリプトの活用

VPCスタックの問題診断には、専用のテストスクリプトを使用できます：

```bash
# VPCスタック全体の統合テスト
./packages/infrastructure/scripts/test-vpc-integration.sh

# VPC接続性の詳細テスト
./packages/infrastructure/scripts/test-vpc-connectivity.sh

# セキュリティグループルールのテスト
./packages/infrastructure/scripts/test-security-group-rules.sh
```

これらのスクリプトは自動的に問題を検出し、詳細な診断情報を提供します。

#### セキュリティグループの設定

**症状**: ネットワーク接続ができない

**診断手順**:

```bash
# セキュリティグループの確認
aws ec2 describe-security-groups --group-names goal-mandala-dev-database-sg

# VPCの設定確認
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=goal-mandala-dev-vpc"

# VPCフローログの確認
aws logs filter-log-events \
  --log-group-name "/aws/vpc/flowlogs/goal-mandala-dev" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "{ $.action = \"REJECT\" }"

# 自動診断スクリプトの実行
STACK_NAME=goal-mandala-dev-vpc ./packages/infrastructure/scripts/test-security-group-rules.sh
```

**解決方法**:

- セキュリティグループのルールを確認
- 必要なポートが開放されているか確認
- ソースIPアドレスの設定を確認
- 最小権限の原則に従っているか確認

#### VPCエンドポイントの問題

**症状**: AWSサービスへの接続が失敗する（本番環境）

**診断手順**:

```bash
# VPCエンドポイントの状態確認
aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=vpc-12345678"

# VPCエンドポイントのDNS解決確認
nslookup s3.ap-northeast-1.amazonaws.com

# VPCエンドポイント用セキュリティグループの確認
aws ec2 describe-security-groups --group-names goal-mandala-prod-vpc-endpoint-sg
```

**解決方法**:

```bash
# VPCエンドポイントのポリシー確認
aws ec2 describe-vpc-endpoints --vpc-endpoint-ids vpce-12345678 \
  --query 'VpcEndpoints[0].PolicyDocument'

# セキュリティグループでHTTPS(443)が許可されているか確認
# 必要に応じてVPCエンドポイントを再作成
```

#### NATゲートウェイの問題

**症状**: プライベートサブネットからインターネットアクセスができない

**診断手順**:

```bash
# NATゲートウェイの状態確認
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-12345678"

# ルートテーブルの確認
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-12345678"

# Elastic IPの確認
aws ec2 describe-addresses --filters "Name=domain,Values=vpc"
```

**解決方法**:

- NATゲートウェイの状態が「available」であることを確認
- ルートテーブルに0.0.0.0/0 -> NAT Gatewayのルートが存在することを確認
- Elastic IPが正しく割り当てられていることを確認

#### サブネット設定の問題

**症状**: リソースが期待されるサブネットに配置されない

**診断手順**:

```bash
# サブネットの確認
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-12345678"

# サブネットのタグ確認
aws ec2 describe-subnets --subnet-ids subnet-12345678 \
  --query 'Subnets[0].Tags'

# アベイラビリティゾーンの確認
aws ec2 describe-availability-zones --region ap-northeast-1
```

**解決方法**:

- サブネットのCIDRブロックが重複していないか確認
- 適切なアベイラビリティゾーンに配置されているか確認
- サブネットタイプ（パブリック/プライベート/分離）が正しいか確認

#### VPCフローログの問題

**症状**: ネットワークトラフィックのログが記録されない

**診断手順**:

```bash
# VPCフローログの状態確認
aws ec2 describe-flow-logs --filter "Name=resource-id,Values=vpc-12345678"

# CloudWatch Logsグループの確認
aws logs describe-log-groups --log-group-name-prefix "/aws/vpc/flowlogs"

# IAMロールの権限確認
aws iam get-role-policy --role-name goal-mandala-dev-vpc-flowlog-role \
  --policy-name VpcFlowLogRoleDefaultPolicy
```

**解決方法**:

```bash
# VPCフローログの再作成
aws ec2 create-flow-log \
  --resource-type VPC \
  --resource-ids vpc-12345678 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs/goal-mandala-dev \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/flowlogsRole

# CloudWatch Logsの権限確認
aws logs put-log-events --log-group-name /aws/vpc/flowlogs/goal-mandala-dev \
  --log-stream-name test-stream --log-events timestamp=$(date +%s)000,message="test"
```

### IAMロールの権限不足

**症状**: Lambda関数でAWSサービスにアクセスできない

**診断手順**:

```bash
# Lambda関数のIAMロール確認
aws lambda get-function --function-name goal-mandala-dev-api

# IAMロールのポリシー確認
aws iam list-attached-role-policies --role-name goal-mandala-dev-lambda-role
```

**解決方法**:

- 必要な権限をIAMポリシーに追加
- リソースARNの設定を確認
- 最小権限の原則に従って権限を調整

## ログとデバッグ

### CloudWatch Logsの確認

```bash
# ログストリームの一覧表示
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/goal-mandala-dev-api" \
  --order-by LastEventTime \
  --descending

# ログイベントの取得
aws logs get-log-events \
  --log-group-name "/aws/lambda/goal-mandala-dev-api" \
  --log-stream-name "2024/01/01/[\$LATEST]abcd1234"
```

### CDKデバッグ

```bash
# CDKデバッグモードの有効化
export CDK_DEBUG=true

# 詳細なログ出力
pnpm run cdk:synth --verbose

# CloudFormationテンプレートの確認
cat cdk.out/goal-mandala-dev-database.template.json
```

### Lambda関数のローカルデバッグ

```bash
# SAM CLIを使用したローカルテスト
sam local start-api --template-file cdk.out/goal-mandala-dev-api.template.json

# Lambda関数の個別テスト
sam local invoke "GoalMandalaDevApiFunction" --event test-event.json
```

## 緊急時の対応

### サービス停止時の対応

1. **CloudFrontの無効化**

```bash
aws cloudfront update-distribution \
  --id E1234567890123 \
  --distribution-config file://disabled-distribution.json
```

2. **Lambda関数の無効化**

```bash
aws lambda put-function-configuration \
  --function-name goal-mandala-dev-api \
  --reserved-concurrency-config ReservedConcurrencyConfig=0
```

3. **Aurora クラスターの停止**

```bash
aws rds stop-db-cluster --db-cluster-identifier goal-mandala-dev-cluster
```

### データ復旧

1. **RDSスナップショットからの復元**

```bash
# 利用可能なスナップショット確認
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier goal-mandala-dev-cluster

# スナップショットからの復元
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier goal-mandala-dev-cluster-restored \
  --snapshot-identifier goal-mandala-dev-cluster-snapshot-20240101
```

2. **S3バックアップからの復元**

```bash
# S3バックアップの確認
aws s3 ls s3://goal-mandala-backups/

# ファイルの復元
aws s3 sync s3://goal-mandala-backups/latest/ ./restored-files/
```

## サポートとエスカレーション

### AWSサポートへの問い合わせ

1. **サポートケースの作成**
   - AWS Management Console > Support Center
   - 問題の詳細、エラーメッセージ、再現手順を記載

2. **必要な情報**
   - AWSアカウントID
   - リージョン
   - スタック名
   - エラーメッセージ
   - CloudFormationイベント
   - CloudWatch Logs

### 開発チームへのエスカレーション

1. **問題の詳細を記録**
   - 発生時刻
   - 実行したコマンド
   - エラーメッセージ
   - 環境情報

2. **再現手順の文書化**
   - 問題を再現するための手順
   - 期待される結果と実際の結果
   - 関連するログやスクリーンショット

## 予防策

### 定期的なメンテナンス

```bash
# 依存関係の更新確認
pnpm outdated

# セキュリティ脆弱性のチェック
pnpm audit

# CDKの最新版確認
npm outdated -g aws-cdk
```

### 監視とアラート

- CloudWatch アラームの設定
- AWS Config による設定変更の監視
- AWS CloudTrail による API 呼び出しの監視
- コスト監視とアラート設定

### バックアップ戦略

- RDS 自動バックアップの有効化
- S3 バケットのバージョニング有効化
- クロスリージョンレプリケーションの設定
- 定期的な復旧テストの実施
