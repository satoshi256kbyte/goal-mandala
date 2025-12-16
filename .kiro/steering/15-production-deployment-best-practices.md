---
inclusion: fileMatch
fileMatchPattern: '{.github/workflows/**/*.yml,packages/infrastructure/**/*.ts,docs/{deployment,operations,troubleshooting,rollback}*.md}'
---

# 本番環境デプロイのベストプラクティス

## 概要

このドキュメントは、本番環境デプロイ（Spec 4.3）と本番環境検証・ドキュメント作成（Spec 4.4）の実装を通じて得られた学びとベストプラクティスをまとめたものです。

## プロジェクト概要

- **実装期間**: 2025年12月13日（1日間）
- **実装規模**: 
  - Spec 4.3: 20タスク（Phase 1-3）
  - Spec 4.4: 48タスク（Phase 1-3）
- **成果物**: 
  - GitHub Actionsワークフロー2個（deploy-production.yml, rollback-production.yml）
  - ドキュメント4個（デプロイ手順書、運用マニュアル、トラブルシューティングガイド、ロールバック手順書）
  - CDKスタック1個（CloudTrailStack）
  - 設定ファイル1個（production.json）

## Phase 1: インフラ構築の学び

### 1. 本番環境設定ファイルの管理

#### production.jsonの構造

本番環境の設定は、`packages/infrastructure/config/production.json`で一元管理します：

```json
{
  "environment": "production",
  "region": "ap-northeast-1",
  "accountId": "202633084296",
  "vpc": {
    "cidr": "10.0.0.0/16",
    "maxAzs": 2,
    "natGateways": 1
  },
  "database": {
    "minCapacity": 0.5,
    "maxCapacity": 2,
    "backupRetention": 7,
    "preferredBackupWindow": "03:00-04:00",
    "preferredMaintenanceWindow": "Mon:04:00-Mon:05:00"
  },
  "lambda": {
    "memorySize": 1024,
    "timeout": 30,
    "reservedConcurrentExecutions": 10
  },
  "monitoring": {
    "enableDetailedMonitoring": true,
    "logRetentionDays": 30,
    "alarmEmail": "admin@example.com"
  }
}
```

**学び**:
- 環境別の設定を明確に分離する
- 本番環境では監視を強化する（enableDetailedMonitoring: true）
- バックアップ保持期間を適切に設定する（7日間）
- ログ保持期間を適切に設定する（30日間）

### 2. CloudTrailの設定

#### 監査ログの記録

CloudTrailを使用して、すべてのAPI呼び出しを記録します：

```typescript
// packages/infrastructure/lib/cloudtrail-stack.ts
export class CloudTrailStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3バケット（CloudTrailログ保存用）
    const trailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `goal-mandala-cloudtrail-${props?.env?.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          expiration: Duration.days(90),
        },
      ],
    });

    // CloudTrail
    const trail = new cloudtrail.Trail(this, 'CloudTrail', {
      bucket: trailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
    });
  }
}
```

**学び**:
- CloudTrailは必ず有効化する（セキュリティ監査のため）
- ログは暗号化して保存する（S3_MANAGED）
- ログの保持期間を設定する（90日間）
- ファイル検証を有効化する（改ざん検出のため）

### 3. 既存インフラの確認

#### 実装済みスタックの確認

本番環境デプロイ前に、既存のインフラ実装を確認しました：

| スタック | 実装状況 | 確認内容 |
|---------|---------|---------|
| VPCStack | ✅ 実装済み | VPC、サブネット、NATゲートウェイ |
| DatabaseStack | ✅ 実装済み | Aurora Serverless V2、セキュリティグループ |
| LambdaStack | ✅ 実装済み | Lambda関数、IAMロール |
| ApiStack | ✅ 実装済み | API Gateway、統合設定 |
| FrontendStack | ✅ 実装済み | S3、CloudFront |
| MonitoringStack | ✅ 実装済み | CloudWatch Dashboards、Alarms |

**学び**:
- 新規実装前に既存の実装を確認する
- 重複実装を避ける
- 既存の実装を活用する

## Phase 2: CI/CDパイプラインの学び

### 1. GitHub Actionsワークフローの設計

#### デプロイワークフロー（deploy-production.yml）

```yaml
name: Deploy Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run test:integration
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ vars.AWS_REGION }}
      - name: Deploy CDK
        run: |
          cd packages/infrastructure
          npx cdk deploy --all --require-approval never
      - name: Deploy Frontend
        run: |
          cd packages/frontend
          npm run build
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET_NAME }} --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
      - name: Health Check
        run: |
          curl -f ${{ secrets.API_ENDPOINT }}/health || exit 1
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**学び**:
- テストジョブとデプロイジョブを分離する
- テストが成功した場合のみデプロイを実行する（needs: test）
- GitHub Environmentで手動承認を設定する（environment: production）
- ヘルスチェックでデプロイの成功を確認する
- Slack通知で結果を通知する（if: always()）

#### ロールバックワークフロー（rollback-production.yml）

```yaml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to (tag or commit SHA)'
        required: true
      confirmation:
        description: 'Type "rollback" to confirm'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Validate Confirmation
        run: |
          if [ "${{ github.event.inputs.confirmation }}" != "rollback" ]; then
            echo "Confirmation failed. Please type 'rollback' to confirm."
            exit 1
          fi
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
      - name: Deploy CDK
        run: |
          cd packages/infrastructure
          npx cdk deploy --all --require-approval never
      - name: Deploy Frontend
        run: |
          cd packages/frontend
          npm run build
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET_NAME }} --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
      - name: Health Check
        run: |
          curl -f ${{ secrets.API_ENDPOINT }}/health || exit 1
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
```

**学び**:
- ロールバックは手動実行のみ（workflow_dispatch）
- バージョン指定を必須にする（version input）
- 確認メッセージで誤操作を防ぐ（confirmation input）
- 指定バージョンをチェックアウトする（ref: ${{ github.event.inputs.version }}）
- ヘルスチェックでロールバックの成功を確認する

### 2. GitHub Secrets管理のベストプラクティス

#### 必須シークレット

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | IAMユーザー作成時に取得 |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | IAMユーザー作成時に取得 |
| `S3_BUCKET_NAME` | フロントエンド用S3バケット名 | CDKデプロイ後に確認 |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFrontディストリビューションID | CDKデプロイ後に確認 |
| `API_ENDPOINT` | APIエンドポイントURL | CDKデプロイ後に確認 |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL（オプション） | Slackアプリ設定で作成 |

#### GitHub Variables

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `AWS_REGION` | `ap-northeast-1` | AWSリージョン |
| `AWS_ACCOUNT_ID` | `202633084296` | AWSアカウントID |

**学び**:
- シークレットは一度設定すると値を確認できないため、安全に保管する
- 定期的なアクセスキーローテーション（推奨：90日毎）
- 最小権限の原則を適用する
- GitHub Variablesは公開情報のみ（リージョン、アカウントID）

### 3. GitHub Environment設定

#### 本番環境の保護

```yaml
# GitHub Settings > Environments > production
Environment name: production

Protection rules:
  - Required reviewers: 1名以上
  - Deployment branches: main ブランチのみ
```

**学び**:
- 本番環境には必ず手動承認を設定する
- 承認者を複数設定する（1名以上）
- デプロイ可能なブランチを制限する（mainのみ）

## Phase 3: 監視・アラートの学び

### 1. CloudWatch Dashboardsの設計

#### 監視メトリクス

| メトリクス | 正常範囲 | 異常時の対応 |
|-----------|---------|-------------|
| Lambda実行回数 | 0-10,000/日 | 急激な増加時は原因調査 |
| Lambda実行時間 | 平均 < 1秒 | 1秒超過時は最適化検討 |
| Lambda エラー率 | < 1% | 1%超過時は原因調査 |
| API Gateway リクエスト数 | 0-10,000/日 | 急激な増加時は原因調査 |
| API Gateway レイテンシー | 95%ile < 2秒 | 2秒超過時は最適化検討 |
| Aurora接続数 | < 50 | 50超過時はコネクションプール確認 |
| Aurora CPU使用率 | < 70% | 70%超過時はスケーリング検討 |

**学び**:
- 重要なメトリクスを一元管理する
- 正常範囲を明確に定義する
- 異常時の対応手順を明確にする

### 2. CloudWatch Alarmsの設定

#### アラーム設定

| アラーム名 | 条件 | 通知先 |
|-----------|------|--------|
| `goal-mandala-production-high-error-rate` | エラー率 > 5% | SNS → Slack |
| `goal-mandala-production-high-latency` | レイテンシー > 2秒 | SNS → Slack |
| `goal-mandala-production-database-connection-error` | DB接続エラー | SNS → Slack |

**学び**:
- 重要なメトリクスにアラームを設定する
- 閾値を適切に設定する（エラー率5%、レイテンシー2秒）
- SNS経由でSlackに通知する

### 3. X-Ray トレーシングの活用

#### トレーシングの有効化

```typescript
// Lambda関数でX-Rayを有効化
const apiFunction = new lambda.Function(this, 'ApiFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist'),
  tracing: lambda.Tracing.ACTIVE, // X-Rayを有効化
});
```

**学び**:
- すべてのLambda関数でX-Rayを有効化する
- トレースでボトルネックを特定する
- エラーの原因を迅速に特定する

## Phase 4: ドキュメント作成の学び

### 1. デプロイ手順書の構成

#### 必須セクション

1. **事前準備**: GitHub Secrets設定、IAMユーザー作成、GitHub Environment設定
2. **初回デプロイ**: CDK Bootstrap、Secrets Manager設定、CDKデプロイ、フロントエンドデプロイ
3. **通常デプロイ**: mainブランチへのpush、GitHub Actionsでの自動デプロイ、承認手順
4. **デプロイ後の確認**: ヘルスチェック、CloudWatch Dashboards、CloudWatch Alarms、X-Ray トレーシング
5. **トラブルシューティング**: デプロイ失敗、ヘルスチェック失敗、CloudFrontキャッシュ問題

**学び**:
- 初回デプロイと通常デプロイを明確に分ける
- 各手順にコマンド例を記載する
- トラブルシューティングを充実させる

### 2. 運用マニュアルの構成

#### 必須セクション

1. **日常的な監視**: CloudWatch Dashboards、CloudWatch Alarms、コスト確認
2. **アラート対応**: エラー率上昇、レイテンシー上昇、データベース接続エラー
3. **バックアップ・リストア**: データベースバックアップ、S3バックアップ、リストア手順
4. **スケーリング**: Lambda同時実行数調整、データベースACU調整、CloudFrontキャッシュ設定
5. **セキュリティ対応**: Secrets Manager認証情報ローテーション、IAMポリシー見直し、CloudTrail監査ログ確認

**学び**:
- 日常的な運用手順を明確にする
- アラート対応手順を詳細に記載する
- セキュリティ対応を定期的に実施する

### 3. トラブルシューティングガイドの構成

#### 必須セクション

1. **よくある問題**: デプロイ失敗、ヘルスチェック失敗、CloudFrontキャッシュ問題、データベース接続エラー
2. **ログの確認方法**: CloudWatch Logs、X-Ray トレーシング、CloudTrail
3. **メトリクスの確認方法**: CloudWatch Dashboards、CloudWatch Alarms
4. **緊急時の対応**: ロールバック実行、サービス停止、問題調査
5. **エスカレーション**: 連絡先リスト、エスカレーション基準、エスカレーション手順

**学び**:
- よくある問題と解決方法を明確にする
- ログとメトリクスの確認方法を詳細に記載する
- エスカレーション手順を明確にする

### 4. ロールバック手順書の構成

#### 必須セクション

1. **ロールバックの判断基準**: エラー率が5%を超える、ヘルスチェック失敗、重大なバグ発見
2. **ロールバックの実行手順**: GitHub Actionsでロールバックワークフロー実行、進行状況確認
3. **ロールバック後の確認**: ヘルスチェック、CloudWatch Dashboards、CloudWatch Alarms
4. **ロールバック失敗時の対処**: 手動ロールバック、問題調査、修正デプロイ
5. **ロールバック後の復旧**: 問題修正、再デプロイ、動作確認

**学び**:
- ロールバックの判断基準を明確にする
- ロールバック手順を詳細に記載する
- ロールバック失敗時の対処方法を明確にする

## 実装で得られた主要な学び

### 1. インフラ構築

- 本番環境設定ファイルで一元管理する
- CloudTrailで監査ログを記録する
- 既存インフラを確認して重複実装を避ける

### 2. CI/CDパイプライン

- テストジョブとデプロイジョブを分離する
- GitHub Environmentで手動承認を設定する
- ロールバックワークフローを用意する
- GitHub Secretsを適切に管理する

### 3. 監視・アラート

- CloudWatch Dashboardsで重要なメトリクスを監視する
- CloudWatch Alarmsで異常を検知する
- X-Ray トレーシングでボトルネックを特定する

### 4. ドキュメント作成

- デプロイ手順書で初回デプロイと通常デプロイを分ける
- 運用マニュアルで日常的な運用手順を明確にする
- トラブルシューティングガイドでよくある問題を記載する
- ロールバック手順書でロールバック手順を詳細に記載する

### 5. セキュリティ

- IAMユーザーに最小権限を付与する
- アクセスキーを定期的にローテーションする（90日毎）
- CloudTrailで監査ログを記録する
- Secrets Managerで認証情報を管理する

### 6. コスト最適化

- 無料利用枠を活用する
- 予算アラートを設定する（月間$18）
- 定期的にコストを確認する（毎週）

## トラブルシューティングのベストプラクティス

### 1. デプロイ失敗時

1. GitHub Actionsのログを確認
2. エラーメッセージを確認
3. ローカル環境で再現
4. 問題を修正
5. 再度push

### 2. ヘルスチェック失敗時

1. Lambda関数のログを確認
2. データベース接続を確認
3. API Gatewayの設定を確認
4. 問題を修正
5. ロールバックを検討

### 3. CloudFrontキャッシュ問題

1. CloudFrontキャッシュを無効化
2. ブラウザキャッシュをクリア
3. 再度アクセス

## まとめ

本番環境デプロイと検証の実装を通じて、以下の重要なポイントを学びました：

1. **インフラ構築**: 本番環境設定ファイルで一元管理、CloudTrailで監査ログ記録
2. **CI/CDパイプライン**: テストとデプロイの分離、手動承認、ロールバックワークフロー
3. **監視・アラート**: CloudWatch Dashboards、Alarms、X-Ray トレーシング
4. **ドキュメント作成**: デプロイ手順書、運用マニュアル、トラブルシューティングガイド、ロールバック手順書
5. **セキュリティ**: 最小権限、アクセスキーローテーション、CloudTrail、Secrets Manager
6. **コスト最適化**: 無料利用枠活用、予算アラート、定期的なコスト確認

これらのベストプラクティスに従うことで、安全で信頼性の高い本番環境を構築・運用できます。

## 参考資料

- [Spec 4.3: 本番環境デプロイ](./../specs/4.3-production-deployment/)
- [Spec 4.4: 本番環境検証・ドキュメント作成](./../specs/4.4-production-verification/)
- [デプロイ手順書](./../../docs/deployment-guide.md)
- [運用マニュアル](./../../docs/operations-manual.md)
- [トラブルシューティングガイド](./../../docs/troubleshooting-guide.md)
- [ロールバック手順書](./../../docs/rollback-guide.md)
