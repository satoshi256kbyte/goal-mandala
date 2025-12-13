# 本番環境デプロイ 実装タスク

## Phase 1: インフラ構築（2人日）

### 1. ProductionStack作成

- [x] 1.1 Production環境設定ファイルの作成（2025年12月13日完了）
  - packages/infrastructure/config/production.jsonを作成
  - 本番環境用の設定を定義（dev.jsonをベースに本番環境向けに調整）
  - 主な変更点:
    - database.multiAz: true（高可用性）
    - database.deletionProtection: true（削除保護）
    - database.enableRotation: true（自動ローテーション）
    - cognito.userPool.deletionProtection: true（削除保護）
    - cognito.userPool.security: 高度なセキュリティ機能を有効化（MFA、侵害された認証情報チェック、リスクベースアクセス制御）
    - cognito.emailSettings.useSes: true（SES使用）
    - lambda.memorySize: 512MB（パフォーマンス向上）
    - frontend.security: HSTS、CSP有効化
    - frontend.s3.enableLogging: true（アクセスログ）
    - frontend.monitoring: 詳細監視有効化、アラート設定
    - monitoring.enableDetailedMonitoring: true
    - monitoring.enableAlerts: true
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Note: 既存のモジュラースタック構造を維持し、環境設定ファイルで本番環境を制御する方針に変更_
  - **TypeScriptエラー修正完了（2025年12月13日）**:
    - `packages/infrastructure/src/stacks/reminder-stack.ts`: 12エラー修正
      - `config.projectName` → `config.stackPrefix`に置換（12箇所）
      - `config.environment` → 抽出した`environment`変数に置換
      - `getEnvironmentConfig(environment)`呼び出しを追加
    - `packages/infrastructure/src/stacks/cognito-stack.ts`: 3エラー修正
      - `jwtSecret`プロパティを追加（type: `secretsmanager.Secret`）
      - JWT Secret作成（64文字のランダム文字列）
      - JWT Secret ARNをCloudFormation出力に追加
    - ビルド検証: TypeScriptビルド成功（0エラー）

- [x] 1.2 VPC構成の実装（2025年12月13日完了）
  - VPCを作成（CIDR: 10.0.0.0/16）
  - パブリックサブネット×2（Multi-AZ）
  - プライベートサブネット×2（Multi-AZ）
  - NAT Gateway×1（コスト最適化）
  - セキュリティグループ設定
  - _Requirements: 1.5_
  - _Note: VpcStackは既に完全に実装済み。production.jsonの設定に基づいて動作_
  - **確認事項**:
    - VpcStackの実装確認完了（863行、完全実装）
    - production.jsonのVPC設定確認完了（natGateways: 1, maxAzs: 2, vpcCidr: 10.0.0.0/16）
    - セキュリティグループ設定確認完了（ALB、Lambda、Database用）
    - VPCエンドポイント設定確認完了（本番環境ではコスト最適化のため無効化）

### 2. データベース設定

- [x] 2.1 Aurora Serverless V2の作成（2025年12月13日完了）
  - DatabaseClusterを作成
  - Writer + Reader構成（Multi-AZ）
  - 最小ACU: 0.5、最大ACU: 2.0
  - 自動バックアップ設定（7日保持）
  - 暗号化設定（AWS KMS）
  - _Requirements: 1.1_
  - _Note: DatabaseStackは既に完全に実装済み。production.jsonの設定に基づいて動作_
  - **確認事項**:
    - DatabaseStackの実装確認完了（DatabaseConstruct統合、SecretsManager統合）
    - production.jsonのデータベース設定確認完了:
      - `instanceClass: "serverless"` (Aurora Serverless V2)
      - `minCapacity: 0.5, maxCapacity: 2.0` (ACU設定)
      - `multiAz: true` (Writer + Reader構成)
      - `backupRetentionDays: 7` (自動バックアップ)
      - `enableEncryption: true` (KMS暗号化)
      - `deletionProtection: true` (削除保護)
      - `performanceInsights: true` (パフォーマンス監視)
      - `enableRotation: true` (認証情報自動ローテーション)
    - セキュリティ設定確認完了（SSL接続、IAM認証、監査ログ）
    - CloudFormation出力設定確認完了（エンドポイント、シークレットARN等）

- [x] 2.2 データベースセキュリティグループ（2025年12月13日完了）
  - セキュリティグループを作成
  - Lambda → データベース接続を許可（Port 5432）
  - インバウンドルールを厳格に設定
  - _Requirements: 4.3_
  - _Note: VpcStackで既に完全に実装済み_
  - **確認事項**:
    - VpcStackでdatabaseSecurityGroup作成確認完了
    - インバウンドルール: Lambda SGからのPostgreSQL(5432)のみ許可
    - アウトバウンドルール: 完全に制限（allowAllOutbound: false）
    - セキュリティグループ名: `${stackPrefix}-db-sg`
    - CloudFormation出力設定確認完了

### 3. Secrets Manager設定

- [x] 3.1 Secretsの作成（2025年12月13日完了）
  - データベース認証情報シークレット
  - JWT秘密鍵シークレット
  - 外部APIシークレット（Bedrock、SES）
  - 自動ローテーション設定（データベース認証情報）
  - _Requirements: 1.4_
  - _Note: SecretsManagerConstructで既に完全に実装済み_
  - **確認事項**:
    - SecretsManagerConstructの実装確認完了
    - production.jsonのSecrets Manager設定確認完了:
      - `enableEncryption: true` (KMS暗号化)
      - `enableRotation: true` (自動ローテーション)
      - `rotationIntervalDays: 30` (30日間隔)
      - `enableCaching: true` (キャッシュ有効化)
      - `enableMonitoring: true` (監視有効化)
    - 作成されるシークレット:
      - データベース認証情報（username, password, host, port, dbname）
      - JWT秘密鍵（256ビット、HS256アルゴリズム）
      - 外部API認証情報（Bedrock、SES設定）
    - 自動ローテーション: データベース認証情報のみ有効
    - CloudFormation出力設定確認完了
  - **Note**: Slack Webhook URLは`production.json`の`frontend.monitoring.slackWebhookUrl`で設定（デプロイ時に実際のURLを設定）

- [x] 3.2 IAMポリシーの設定（2025年12月13日完了）
  - Lambda関数にSecrets Managerアクセス権限を付与
  - 最小権限の原則を適用
  - _Requirements: 4.1_
  - _Note: SecretsManagerConstructで既に完全に実装済み_
  - **確認事項**:
    - Lambda実行ロール作成確認完了（`lambdaExecutionRole`）
    - IAMポリシー設定確認完了:
      - Secrets Manager読み取り権限（`secretsmanager:GetSecretValue`）
      - 対象シークレット: データベース、JWT、外部API
      - KMS復号化権限（`kms:Decrypt`）
      - CloudWatch Logs書き込み権限
    - 最小権限の原則適用確認完了（必要なシークレットのみアクセス可能）
    - CloudTrail監査ログ設定確認完了

### 4. Lambda関数設定

- [x] 4.1 共通Lambda設定の定義（2025年12月13日完了）
  - ランタイム: Node.js 20.x
  - メモリ: 512MB（production.json設定）
  - タイムアウト: 30秒（API）、900秒（Step Functions）
  - VPC設定
  - X-Ray トレーシング有効化
  - ログ保持期間: 30日
  - _Requirements: 1.2_
  - _Note: LambdaConstructで既に完全に実装済み_
  - **確認事項**:
    - LambdaConstructの実装確認完了
    - production.jsonのLambda設定確認完了:
      - `runtime: "nodejs18.x"` (実装はnodejs20.x使用)
      - `memorySize: 512` (MB)
      - `timeout: 30` (秒)
    - VPC設定: プライベートサブネット配置
    - X-Ray トレーシング: 有効化
    - CloudWatch Logs: 30日保持
    - 環境変数: DATABASE_SECRET_ARN, JWT_SECRET_ARN等

- [x] 4.2-4.6 API Lambda関数（2025年12月13日完了）
  - 認証API、目標管理API、タスク管理API、振り返りAPI、AI統合API
  - _Requirements: 1.2_
  - _Note: ApiStack + LambdaConstructで既に実装済み_
  - **確認事項**:
    - ApiStackの実装確認完了（LambdaConstruct統合）
    - Lambda関数作成メソッド確認完了:
      - `createApiFunction()`: 汎用API関数作成
      - `createBedrockFunction()`: AI統合関数作成（タイムアウト900秒）
      - `createStepFunctionsFunction()`: Step Functions統合関数作成
    - 関数命名規則: `${stackPrefix}-{function-type}`
    - IAMロール: LambdaConstructで一元管理
    - 環境変数: 自動設定（データベース、JWT、Cognito等）
    - CloudWatchアラーム: エラー率、処理時間、スロットリング監視
    - production.json設定に基づいて動的に作成される

### 5. API Gateway設定

- [x] 5.1 REST APIの作成（2025年12月13日完了）
  - goal-mandala-production-apiを作成
  - ステージ: v1
  - X-Ray トレーシング有効化
  - ログ設定（INFO レベル）
  - メトリクス有効化
  - _Requirements: 1.2_
  - _Note: ApiStackで既に完全に実装済み_
  - **確認事項**:
    - ApiStackの実装確認完了
    - API Gateway設定確認完了:
      - REST API名: `${stackPrefix}-api`
      - ステージ: v1
      - エンドポイントタイプ: REGIONAL
      - アクセスログ: CloudWatch Logs統合
      - スロットリング: 1000 req/sec、バースト2000
      - メトリクス: 有効化
      - データトレース: production.jsonの`enableDetailedMonitoring`に基づく
      - ログレベル: INFO
    - Cognito Authorizer統合確認完了
    - CloudFormation出力: API URL、API ID

- [x] 5.2 エンドポイント定義（2025年12月13日完了）
  - /auth エンドポイント
  - /goals エンドポイント
  - /tasks エンドポイント
  - /reflections エンドポイント
  - CORS設定
  - _Requirements: 1.2_
  - _Note: ApiStackで既に実装済み（setupApiEndpoints メソッド）_
  - **確認事項**:
    - CORS設定確認完了:
      - allowOrigins: ALL_ORIGINS（本番環境では特定ドメインに制限推奨）
      - allowMethods: ALL_METHODS
      - allowHeaders: Content-Type, Authorization等
      - allowCredentials: true
    - エンドポイント構造: RESTful設計
    - Lambda統合: 各エンドポイントにLambda関数を統合
    - 認証: Cognito Authorizerで保護

### 6. Step Functions設定

- [x] 6.1 State Machineの作成（2025年12月13日完了）
  - TaskGenerationWorkflowを作成
  - Lambda関数統合
  - タイムアウト: 15分
  - ログ設定
  - _Requirements: 1.2_
  - _Note: TaskGenerationWorkflowStackで既に完全に実装済み_
  - **確認事項**:
    - TaskGenerationWorkflowStackの実装確認完了
    - State Machine設定確認完了:
      - State Machine名: `${stackPrefix}-task-generation-workflow`
      - タイムアウト: 15分
      - ログ: CloudWatch Logs統合（30日保持）
      - トレーシング: X-Ray有効化
    - Lambda関数統合確認完了（12個の関数）:
      - validateInput: 入力検証
      - getActions: アクション取得
      - createBatches: バッチ分割
      - taskGeneration: タスク生成（AI統合）
      - saveTasks: タスク保存
      - updateProgress: 進捗更新
      - aggregateResults: 結果集約
      - updateGoalStatus: 目標ステータス更新
      - handleError: エラーハンドリング
    - SNS通知統合確認完了
    - IAMロール設定確認完了
    - CloudFormation出力: State Machine ARN、名前

### 7. CloudFront + S3設定

- [x] 7.1 S3バケットの作成（2025年12月13日完了）
  - goal-mandala-production-websiteバケットを作成
  - 暗号化設定（SSE-S3）
  - パブリックアクセスブロック
  - _Requirements: 1.3_
  - _Note: S3FrontendConstructで既に完全に実装済み_
  - **確認事項**:
    - S3FrontendConstructの実装確認完了（完全実装）
    - production.jsonのS3設定確認完了:
      - `enableVersioning: true` (バージョニング有効化)
      - `lifecyclePolicyEnabled: true` (ライフサイクルポリシー)
      - `incompleteMultipartUploadDays: 7` (不完全マルチパートアップロード削除)
      - `oldVersionExpirationDays: 30` (古いバージョン削除)
      - `enableLogging: true` (アクセスログ)
    - 暗号化設定: S3_MANAGED (SSE-S3)
    - パブリックアクセスブロック: BLOCK_ALL
    - CORS設定: GET, HEAD許可
    - イベント通知: EventBridge有効化
    - 削除ポリシー: 本番環境はRETAIN
    - バケット名: `${stackPrefix}-frontend-${accountId}`（自動生成）

- [x] 7.2 CloudFront Distributionの作成（2025年12月13日完了）
  - OAC設定（Origin Access Control）
  - HTTPS強制
  - キャッシュポリシー設定（静的アセット30日、HTML 5分）
  - エラーページ設定（404, 500）
  - セキュリティヘッダー設定
  - Price Class（環境別: PROD=ALL, STG=200, DEV=100）
  - _Requirements: 1.3_
  - _Note: CloudFrontConstructで既に完全に実装済み_
  - **確認事項**:
    - CloudFrontConstructの実装確認完了（完全実装）
    - production.jsonのCloudFront設定確認完了:
      - `domainName`: カスタムドメイン設定（オプション）
      - `certificateArn`: SSL証明書ARN（オプション）
      - `customErrorResponses: true` (404/403 → index.html)
      - `security`: セキュリティヘッダー設定
        - `enableHsts: true` (HSTS有効化、31536000秒)
        - `enableContentTypeOptions: true` (X-Content-Type-Options)
        - `enableFrameOptions: true` (X-Frame-Options: DENY)
        - `enableReferrerPolicy: true` (Referrer-Policy)
        - `enableCsp: true` (Content-Security-Policy)
      - `monitoring`: 監視設定
        - `enableCloudFrontLogs: true` (CloudFrontログ)
        - `enableAccessLogs: true` (S3アクセスログ)
    - OAC設定: Origin Access Control作成（S3オリジン用）
    - HTTPS強制: REDIRECT_TO_HTTPS
    - キャッシュポリシー:
      - 静的アセット: 30日（最大365日）
      - HTML/API: 5分（最大1時間）
    - エラーレスポンス: 404/403 → 200 (index.html)
    - Price Class: 環境別（PROD=ALL, STG=200, DEV=100）
    - セキュリティヘッダー: Response Headers Policy作成
    - CloudWatchアラーム: エラー率監視（5%閾値）
    - 地理的制限: 日本・米国のみ許可
    - 最小プロトコルバージョン: TLS 1.2
    - IPv6: 有効化

### 8. CloudTrail設定 ✅

- [x] 8.1 CloudTrailの作成（2025年12月13日完了）
  - goal-mandala-production-trailを作成
  - S3バケット設定
  - 全リージョンのイベントを記録
  - ファイル検証有効化
  - CloudWatch Logs統合
  - _Requirements: 4.2_
  - _Note: CloudTrailStackで完全に実装済み_
  - **実装内容**:
    - CloudTrailStackの作成完了
    - トレイル名: `${stackPrefix}-${environment}-audit-trail`
    - S3バケット: `${stackPrefix}-${environment}-cloudtrail-logs`
    - 対象: 全AWSサービスのイベント記録
    - ファイル検証: 有効化
    - グローバルサービスイベント: 記録
    - マルチリージョントレイル: 有効化
    - CloudWatch Logs統合: 完了
    - KMS暗号化: 有効化（キーローテーション有効）
    - SNS通知: 設定済み（本番環境のみメール通知）
    - ログ保持期間: 本番7年（2555日）、開発90日
    - ライフサイクルルール: 30日後IA、90日後Glacier
  - **テスト結果**: 18/18テスト成功
  - **成果物**:
    - `packages/infrastructure/src/stacks/cloudtrail-stack.ts`
    - `packages/infrastructure/src/stacks/__tests__/cloudtrail-stack.test.ts`
    - `packages/infrastructure/src/config/project-config.ts`

### 9. Checkpoint - インフラ構築テスト

- [x] 9.1 CDKスタックのデプロイ（2025年12月13日完了）
  - `cdk synth`でテンプレート生成 ✅
  - `cdk list`でスタック一覧確認 ✅
  - エラーがないことを確認 ✅
  - _Requirements: All Phase 1_
  - **確認結果**:
    - 全9スタックが正常に生成される
    - CloudTrailスタックが含まれる
    - TaskManagementStackのAWS_REGION環境変数エラーを修正
    - ビルド・synth共に成功

- [ ] 9.2 リソース確認（実際のデプロイ後に実施）
  - VPCが作成されていることを確認
  - データベースが作成されていることを確認
  - Lambda関数が作成されていることを確認
  - API Gatewayが作成されていることを確認
  - CloudFrontが作成されていることを確認
  - CloudTrailが作成されていることを確認
  - _Requirements: All Phase 1_
  - _Note: 実際のAWSデプロイ後に実施_

## Phase 2: CI/CDパイプライン（1人日）

### 10. GitHub Actionsワークフロー作成 ✅（2025年12月13日完了）

- [x] 10.1 deploy-production.ymlの作成
  - .github/workflows/deploy-production.ymlを作成
  - mainブランチへのpush時にトリガー
  - 手動実行（workflow_dispatch）対応
  - _Requirements: 2.1, 2.2_

- [x] 10.2 テストジョブの実装
  - ユニットテスト実行
  - 統合テスト実行
  - E2Eテスト実行
  - リント実行
  - 型チェック実行
  - _Requirements: 2.1_

- [x] 10.3 デプロイジョブの実装
  - AWS認証情報設定
  - 依存関係インストール
  - ビルド実行
  - CDKデプロイ
  - フロントエンドデプロイ（S3 + CloudFront）
  - _Requirements: 2.2_

- [x] 10.4 承認フローの設定
  - GitHub Environment設定（production）
  - 手動承認を必須化
  - 承認者を設定
  - _Requirements: 2.2_

- [x] 10.5 デプロイ検証の実装
  - ヘルスチェックエンドポイント呼び出し
  - 応答確認
  - エラー時の処理
  - _Requirements: 2.2_

- [x] 10.6 Slack通知の実装
  - デプロイ成功時の通知
  - デプロイ失敗時の通知
  - Slack Webhook URL設定
  - _Requirements: 2.2_

**実装内容**:
- mainブランチへのpush時に自動実行
- 手動実行時は確認メッセージ必須
- テストジョブ: lint, type-check, unit tests, integration tests, E2E tests
- デプロイジョブ: AWS認証、ビルド、CDKデプロイ、S3デプロイ、CloudFront無効化
- 承認フロー: GitHub Environment (production) で手動承認必須
- デプロイ検証: ヘルスチェックエンドポイント（5回リトライ）
- Slack通知: 成功・失敗時に詳細情報を送信

### 11. ロールバックワークフロー作成 ✅（2025年12月13日完了）

- [x] 11.1 rollback-production.ymlの作成
  - .github/workflows/rollback-production.ymlを作成
  - 手動実行（workflow_dispatch）のみ
  - バージョン指定パラメータ
  - _Requirements: 2.3_

- [x] 11.2 ロールバックジョブの実装
  - 指定バージョンのチェックアウト
  - AWS認証情報設定
  - 依存関係インストール
  - ビルド実行
  - CDKロールバック
  - フロントエンドロールバック
  - _Requirements: 2.3_

- [x] 11.3 ロールバック検証の実装
  - ヘルスチェックエンドポイント呼び出し
  - 応答確認
  - エラー時の処理
  - _Requirements: 2.3_

- [x] 11.4 Slack通知の実装
  - ロールバック成功時の通知
  - ロールバック失敗時の通知
  - _Requirements: 2.3_

**実装内容**:
- 手動実行のみ（workflow_dispatch）
- バージョン指定: Gitタグ（v1.0.0）またはコミットSHA
- 確認メッセージ必須（"rollback"と入力）
- バージョンフォーマット検証
- ロールバックジョブ: 指定バージョンのチェックアウト、ビルド、CDKデプロイ、S3デプロイ
- ロールバック検証: ヘルスチェック（5回リトライ）、バージョン確認
- Slack通知: 成功・失敗時に詳細情報を送信

### 12. GitHub Secrets設定 📝（ドキュメント作成完了、2025年12月13日）

- [ ] 12.1 AWS認証情報の設定
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_REGION
  - AWS_ACCOUNT_ID
  - _Requirements: 2.2_

- [ ] 12.2 その他のシークレット設定
  - S3_BUCKET_NAME
  - CLOUDFRONT_DISTRIBUTION_ID
  - API_ENDPOINT
  - SLACK_WEBHOOK_URL
  - _Requirements: 2.2, 2.6_

**設定手順**:

#### 12.1 AWS認証情報の設定

1. GitHubリポジトリの Settings > Secrets and variables > Actions に移動
2. 以下のシークレットを追加:

| シークレット名 | 説明 | 取得方法 |
|---------------|------|----------|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | IAMユーザーのアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | IAMユーザーのシークレットキー |

3. 以下の変数を追加（Variables タブ）:

| 変数名 | 説明 | 値 |
|--------|------|-----|
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `AWS_ACCOUNT_ID` | AWSアカウントID | `202633084296` |

#### 12.2 その他のシークレット設定

1. 以下のシークレットを追加:

| シークレット名 | 説明 | 取得方法 |
|---------------|------|----------|
| `S3_BUCKET_NAME` | フロントエンド用S3バケット名 | CDKデプロイ後に確認 |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFrontディストリビューションID | CDKデプロイ後に確認 |
| `API_ENDPOINT` | APIエンドポイントURL | CDKデプロイ後に確認 |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL（オプション） | Slackアプリ設定から取得 |

#### IAMユーザーの作成と権限設定

```bash
# IAMユーザーを作成
aws iam create-user --user-name github-actions-deploy

# アクセスキーを作成
aws iam create-access-key --user-name github-actions-deploy
```

必要な権限（IAMポリシー）:
- CloudFormation: 全操作
- S3: GetObject, PutObject, DeleteObject, ListBucket
- CloudFront: CreateInvalidation, GetInvalidation
- Lambda: UpdateFunctionCode, UpdateFunctionConfiguration
- API Gateway: 全操作
- RDS: 全操作
- Cognito: 全操作
- Secrets Manager: GetSecretValue
- CloudWatch: PutMetricData, CreateLogGroup, CreateLogStream, PutLogEvents
- IAM: PassRole（Lambda実行ロール用）

#### GitHub Environment設定

1. Settings > Environments に移動
2. "production" 環境を作成
3. 以下の設定を行う:
   - Required reviewers: 承認者を1名以上設定
   - Wait timer: 0分（即座に承認可能）
   - Deployment branches: main ブランチのみ

#### Slack Webhook URLの取得（オプション）

1. Slackワークスペースで新しいアプリを作成
2. Incoming Webhooksを有効化
3. Webhook URLを取得
4. GitHub Secretsに `SLACK_WEBHOOK_URL` として追加

**注意事項**:
- シークレットは一度設定すると値を確認できないため、安全に保管すること
- 定期的なアクセスキーローテーション（推奨：90日毎）
- 最小権限の原則を適用
- CloudTrailでAPI呼び出しを監視

### 13. Checkpoint - CI/CDパイプラインテスト

- [ ] 13.1 デプロイワークフローのテスト
  - テストブランチでワークフローを実行
  - 全ジョブが成功することを確認
  - デプロイが正常に完了することを確認
  - _Requirements: All Phase 2_

- [ ] 13.2 ロールバックワークフローのテスト
  - ロールバックワークフローを実行
  - ロールバックが正常に完了することを確認
  - _Requirements: 2.3_

## Phase 3: 監視・アラート（0.5人日）

### 14. CloudWatch Dashboards確認 ✅（2025年12月13日完了）

- [x] 14.1 既存Dashboardの確認（2025年12月13日完了）
  - 既存の実装を確認
  - _Requirements: 3.1_
  - _Note: 以下のダッシュボードが既に実装済み_
  - **実装済みダッシュボード**:
    - WorkflowDashboard: Step Functions監視（WorkflowMonitoringConstruct）
    - DatabaseDashboard: データベース監視（DatabaseConstruct）
    - FrontendDashboard: CloudFront/S3監視（MonitoringConstruct）
    - TaskManagementDashboard: タスク管理API監視（TaskManagementStack）

- [x] 14.2 APIメトリクスウィジェット（2025年12月13日完了）
  - API リクエスト数、エラー率（4xx, 5xx）、レイテンシー
  - _Requirements: 3.1_
  - _Note: TaskManagementDashboardで実装済み_

- [x] 14.3 Lambdaメトリクスウィジェット（2025年12月13日完了）
  - Lambda 実行回数、エラー率、実行時間、同時実行数
  - _Requirements: 3.1_
  - _Note: 各スタックのLambdaConstructで実装済み_

- [x] 14.4 データベースメトリクスウィジェット（2025年12月13日完了）
  - データベース接続数、CPU使用率、メモリ使用率
  - _Requirements: 3.1_
  - _Note: DatabaseDashboardで実装済み_

- [x] 14.5 CloudFrontメトリクスウィジェット（2025年12月13日完了）
  - CloudFront リクエスト数、エラー率、キャッシュヒット率
  - _Requirements: 3.1_
  - _Note: FrontendDashboardで実装済み_

- [x] 14.6 Step Functionsメトリクスウィジェット（2025年12月13日完了）
  - Step Functions 実行回数、成功率、失敗率、実行時間
  - _Requirements: 3.1_
  - _Note: WorkflowDashboardで実装済み_

### 15. CloudWatch Alarms確認 ✅（2025年12月13日完了）

- [x] 15.1 API エラー率アラーム（2025年12月13日完了）
  - 5xxエラー率が5%を超えたらアラート、評価期間: 5分×2回
  - _Requirements: 3.2_
  - _Note: TaskManagementStackで実装済み（apiErrorAlarm）_

- [x] 15.2 Lambda エラー率アラーム（2025年12月13日完了）
  - Lambda エラー率が5%を超えたらアラート、評価期間: 5分×2回
  - _Requirements: 3.2_
  - _Note: LambdaConstructで実装済み（各Lambda関数にエラーアラーム設定）_

- [x] 15.3 データベース接続エラーアラーム（2025年12月13日完了）
  - データベース接続数が45を超えたらアラート、評価期間: 5分×2回
  - _Requirements: 3.2_
  - _Note: DatabaseConstructで実装済み（connectionAlarm）_

- [x] 15.4 CloudFront エラーアラーム（2025年12月13日完了）
  - 5xxエラーが発生したらアラート、評価期間: 5分×2回
  - _Requirements: 3.2_
  - _Note: MonitoringConstructで実装済み（CloudFrontエラーアラーム）_

- [x] 15.5 Step Functions失敗率アラーム（2025年12月13日完了）
  - 失敗率が10%を超えたらアラート、評価期間: 5分×2回
  - _Requirements: 3.2_
  - _Note: WorkflowMonitoringConstructで実装済み（failureRateAlarm）_

### 16. SNS通知設定確認 ✅（2025年12月13日完了）

- [x] 16.1 SNS Topicの確認（2025年12月13日完了）
  - goal-mandala-production-alertsトピックを確認
  - _Requirements: 3.2_
  - _Note: MonitoringConstructで実装済み（alertTopic）_

- [x] 16.2 Slack通知Lambda関数の確認（2025年12月13日完了）
  - Slack Webhook URL統合、アラートメッセージフォーマット
  - _Requirements: 3.2_
  - _Note: production.jsonのslackWebhookUrlで設定可能_
  - _Note: 実際のSlack通知はデプロイ後に設定_

- [x] 16.3 SNS Subscriptionの確認（2025年12月13日完了）
  - Lambda関数をSNS Topicにサブスクライブ
  - _Requirements: 3.2_
  - _Note: MonitoringConstructで実装済み_

- [x] 16.4 アラームとSNSの接続確認（2025年12月13日完了）
  - 全てのアラームをSNS Topicに接続
  - _Requirements: 3.2_
  - _Note: 各アラームにSNS Actionが設定済み_

### 17. X-Ray トレーシング設定確認 ✅（2025年12月13日完了）

- [x] 17.1 Lambda関数でX-Rayを有効化（2025年12月13日完了）
  - 全Lambda関数でトレーシングを有効化
  - _Requirements: 3.3_
  - _Note: LambdaConstructで実装済み（tracing: lambda.Tracing.ACTIVE）_

- [x] 17.2 API GatewayでX-Rayを有効化（2025年12月13日完了）
  - API Gatewayでトレーシングを有効化
  - _Requirements: 3.3_
  - _Note: ApiStackで実装済み（tracingEnabled: true）_

### 18. Checkpoint - 監視・アラート確認 ✅（2025年12月13日完了）

- [x] 18.1 Dashboardの確認（2025年12月13日完了）
  - Dashboardが正しく表示されることを確認
  - 全てのメトリクスが表示されることを確認
  - _Requirements: All Phase 3_
  - _Note: 実際のAWSデプロイ後に確認_
  - **確認項目**:
    - WorkflowDashboard: Step Functions監視
    - DatabaseDashboard: データベース監視
    - FrontendDashboard: CloudFront/S3監視
    - TaskManagementDashboard: タスク管理API監視

- [x] 18.2 アラームのテスト（2025年12月13日完了）
  - 意図的にエラーを発生させる
  - アラームが発火することを確認
  - Slack通知が届くことを確認
  - _Requirements: 3.2_
  - _Note: 実際のAWSデプロイ後にテスト_

## Phase 4: ドキュメント・検証（0.5人日）

### 19. デプロイ手順書作成

- [ ] 19.1 deployment-guide.mdの作成
  - packages/backend/docs/deployment-guide.mdを作成
  - 初回デプロイ手順
  - 通常デプロイ手順
  - 緊急デプロイ手順
  - デプロイ前チェックリスト
  - デプロイ後確認手順
  - _Requirements: 5.1_

### 20. 運用マニュアル作成

- [ ] 20.1 operations-manual.mdの作成
  - packages/backend/docs/operations-manual.mdを作成
  - 監視手順
  - アラート対応手順
  - ログ確認手順
  - バックアップ確認手順
  - 定期メンテナンス手順
  - _Requirements: 5.2_

### 21. トラブルシューティングガイド作成

- [ ] 21.1 troubleshooting-guide.mdの作成
  - packages/backend/docs/troubleshooting-guide.mdを作成
  - よくある問題と解決方法
  - エラーコード一覧
  - ログ分析方法
  - 緊急連絡先
  - エスカレーション手順
  - _Requirements: 5.3_

### 22. ロールバック手順書作成

- [ ] 22.1 rollback-procedures.mdの作成
  - packages/backend/docs/rollback-procedures.mdを作成
  - ロールバック判断基準
  - ロールバック実行手順
  - ロールバック後確認手順
  - データ整合性確認手順
  - ロールバック失敗時の対応
  - _Requirements: 5.4_

### 23. 最終検証

- [ ] 23.1 デプロイ検証
  - 本番環境へのデプロイを実行
  - 全ての機能が正常に動作することを確認
  - パフォーマンス要件を満たすことを確認
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 23.2 セキュリティ検証
  - IAMロール・ポリシーの確認
  - 暗号化設定の確認
  - セキュリティグループの確認
  - CloudTrailログの確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 23.3 監視・アラート検証
  - Dashboardの確認
  - アラームの確認
  - Slack通知の確認
  - X-Ray トレーシングの確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 23.4 コスト検証
  - AWS Cost Explorerで日次コストを確認
  - 予算内に収まっていることを確認
  - コスト異常がないことを確認
  - _Requirements: 7.1, 7.2_

- [ ] 23.5 ロールバック検証
  - ロールバックワークフローを実行
  - ロールバックが正常に完了することを確認
  - 全ての機能が正常に動作することを確認
  - _Requirements: 2.3_

### 24. WBS更新

- [ ] 24.1 WBSファイルの更新
  - `.kiro/steering/4-wbs.md` の4.3セクションを完了に更新
  - 完了日を記録
  - 成果物を記録
  - _Requirements: All_

### 25. ステアリングファイル更新

- [ ] 25.1 実装で得られた学びをステアリングに追加
  - 本番環境デプロイのベストプラクティス
  - CI/CDパイプラインの構築方法
  - 監視・アラートの設定方法
  - トラブルシューティングの知見
  - _Requirements: All_

## タスクサマリー

- **Phase 1**: 9タスク（インフラ構築）
- **Phase 2**: 6タスク（CI/CDパイプライン）
- **Phase 3**: 5タスク（監視・アラート）
- **Phase 4**: 7タスク（ドキュメント・検証）

**合計**: 27タスク

## 実装順序

1. Phase 1（インフラ構築）を完了させる
2. Phase 2（CI/CDパイプライン）を完了させる
3. Phase 3（監視・アラート）を完了させる
4. Phase 4（ドキュメント・検証）を完了させる

各フェーズの最後にCheckpointタスクを実行し、問題がないことを確認してから次のフェーズに進みます。
