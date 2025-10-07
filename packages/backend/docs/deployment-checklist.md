# デプロイ前チェックリスト

## AI生成機能（Bedrock Lambda関数）デプロイ前確認

### 環境変数の確認

- [ ] `BEDROCK_MODEL_ID` が設定されている（amazon.nova-micro-v1:0）
- [ ] `BEDROCK_REGION` が設定されている（ap-northeast-1）
- [ ] `BEDROCK_MAX_RETRIES` が設定されている（3）
- [ ] `BEDROCK_TIMEOUT_MS` が設定されている（300000）
- [ ] `DATABASE_SECRET_ARN` が設定されている
- [ ] `APP_REGION` が設定されている（ap-northeast-1）
- [ ] `LOG_LEVEL` が設定されている（info）
- [ ] `NODE_ENV` が設定されている（production）

### IAM権限の確認

- [ ] Lambda実行ロールが作成されている
- [ ] Bedrock InvokeModel権限が付与されている
- [ ] CloudWatch Logs権限が付与されている
- [ ] CloudWatch Metrics権限が付与されている
- [ ] Secrets Manager権限が付与されている
- [ ] X-Ray権限が付与されている
- [ ] VPC実行権限が付与されている

### Lambda設定の確認

- [ ] メモリサイズが1024MBに設定されている
- [ ] タイムアウトが15分（900秒）に設定されている
- [ ] 予約済み同時実行数が設定されている（推奨: 10）
- [ ] VPC設定が正しい（プライベートサブネット）
- [ ] セキュリティグループが設定されている
- [ ] X-Rayトレーシングが有効化されている
- [ ] 環境変数が全て設定されている

### API Gateway設定の確認

- [ ] REST APIが作成されている
- [ ] エンドポイントが定義されている
  - [ ] POST /ai/generate-subgoals
  - [ ] POST /ai/generate-actions
  - [ ] POST /ai/generate-tasks
- [ ] Cognito Authorizerが設定されている
- [ ] CORS設定が正しい
- [ ] スロットリング設定が適切（1000req/min、2000burst）
- [ ] アクセスログが有効化されている

### CloudWatch設定の確認

- [ ] Lambda関数用のロググループが作成されている
- [ ] ログ保持期間が設定されている（30日）
- [ ] エラー率アラームが設定されている
- [ ] レスポンス時間アラームが設定されている
- [ ] スロットリングアラームが設定されている
- [ ] 同時実行数アラームが設定されている
- [ ] SNS通知トピックが設定されている（本番・ステージング環境）

### セキュリティの確認

- [ ] 入力サニタイゼーションが実装されている
- [ ] プロンプトインジェクション対策が実装されている
- [ ] 機密情報がログに含まれていない
- [ ] HTTPS通信が強制されている
- [ ] 認証が必須になっている
- [ ] IAM権限が最小権限の原則に従っている

### テストの確認

- [ ] 全てのユニットテストが通過している
- [ ] 全ての統合テストが通過している
- [ ] カバレッジが80%以上である（主要ファイル）
- [ ] エラーシナリオテストが通過している
- [ ] パフォーマンステストが通過している

### コード品質の確認

- [ ] `npm run format` が実行されている
- [ ] `npm run lint` でエラー・警告がない
- [ ] TypeScriptの型エラーがない
- [ ] 未使用のimportがない
- [ ] console.logが本番コードに残っていない（構造化ログのみ）

### ドキュメントの確認

- [ ] API仕様書が作成されている
- [ ] 運用ドキュメントが作成されている
- [ ] 開発者ドキュメントが作成されている
- [ ] デプロイ手順が記載されている
- [ ] トラブルシューティングガイドが作成されている

### Bedrock設定の確認

- [ ] Bedrockモデルへのアクセスが有効化されている
- [ ] モデルIDが正しい（amazon.nova-micro-v1:0）
- [ ] リージョンが正しい（ap-northeast-1）
- [ ] クォータが十分である
- [ ] コスト監視が設定されている

### ネットワーク設定の確認

- [ ] VPCが正しく設定されている
- [ ] サブネットが正しく設定されている（プライベート）
- [ ] セキュリティグループが正しく設定されている
- [ ] NATゲートウェイが設定されている（外部API呼び出し用）
- [ ] VPCエンドポイントが設定されている（必要に応じて）

### モニタリング設定の確認

- [ ] CloudWatch Logsが有効化されている
- [ ] CloudWatch Metricsが有効化されている
- [ ] X-Rayトレーシングが有効化されている
- [ ] アラームが設定されている
- [ ] ダッシュボードが作成されている（推奨）

### バックアップ・復旧の確認

- [ ] ロールバック手順が文書化されている
- [ ] 前バージョンのコードがタグ付けされている
- [ ] デプロイ履歴が記録されている
- [ ] 緊急時の連絡先が明確である

### パフォーマンスの確認

- [ ] レスポンス時間が要件を満たしている（95%ile < 30秒）
- [ ] 同時実行数が適切に設定されている
- [ ] メモリ使用量が適切である
- [ ] コールドスタート時間が許容範囲内である

### コストの確認

- [ ] Bedrockの使用コストが見積もられている
- [ ] Lambda実行コストが見積もられている
- [ ] 月次予算が設定されている
- [ ] コストアラートが設定されている

## デプロイ実行前の最終確認

### 1. 環境の確認

```bash
# 環境変数の確認
echo $ENVIRONMENT
echo $AWS_REGION
echo $AWS_ACCOUNT_ID

# AWS認証情報の確認
aws sts get-caller-identity
```

### 2. ビルドの確認

```bash
# バックエンドのビルド
cd packages/backend
npm run build

# ビルド成果物の確認
ls -la dist/
```

### 3. テストの実行

```bash
# 全テストの実行
npm test

# AI生成関連テストの実行
npm test -- ai-generation
```

### 4. CDKスタックの合成

```bash
# インフラストラクチャディレクトリに移動
cd packages/infrastructure

# スタックの合成
npm run cdk synth

# 差分の確認
npm run cdk diff goal-mandala-${ENVIRONMENT}-api
```

### 5. デプロイの実行

```bash
# デプロイ実行
npm run cdk deploy goal-mandala-${ENVIRONMENT}-api --require-approval never
```

### 6. デプロイ後の確認

```bash
# Lambda関数の確認
aws lambda get-function --function-name goal-mandala-${ENVIRONMENT}-ai-processor

# API Gatewayの確認
aws apigateway get-rest-apis --query "items[?name=='goal-mandala-${ENVIRONMENT}-api']"

# CloudWatch Logsの確認
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor

# アラームの確認
aws cloudwatch describe-alarms --alarm-name-prefix goal-mandala-${ENVIRONMENT}-ai-processor
```

### 7. 動作確認

```bash
# ヘルスチェック
curl -X GET https://api.goal-mandala.example.com/v1/health

# サブ目標生成のテスト（認証トークンが必要）
curl -X POST https://api.goal-mandala.example.com/v1/ai/generate-subgoals \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subgoal",
    "userId": "test-user",
    "input": {
      "title": "テスト目標",
      "description": "テスト用の目標です",
      "deadline": "2025-12-31",
      "background": "テスト用"
    }
  }'
```

## デプロイ後の監視

### 最初の24時間

- [ ] エラーログを定期的に確認（1時間ごと）
- [ ] レスポンス時間を監視
- [ ] エラー率を監視
- [ ] スロットリングの発生を監視
- [ ] コストの推移を確認

### 最初の1週間

- [ ] 毎日のエラーログ確認
- [ ] パフォーマンスメトリクスの確認
- [ ] ユーザーフィードバックの収集
- [ ] コストの確認

## ロールバック判断基準

以下の場合はロールバックを検討してください：

- [ ] エラー率が5%を超える
- [ ] レスポンス時間が要件の2倍を超える
- [ ] 重大なセキュリティ問題が発見された
- [ ] データ損失が発生した
- [ ] サービスが完全に停止した

## 承認

- [ ] 開発者による確認完了
- [ ] テックリードによるレビュー完了
- [ ] セキュリティレビュー完了（本番環境のみ）
- [ ] デプロイ承認取得（本番環境のみ）

## デプロイ実施者情報

- デプロイ日時: _______________
- デプロイ実施者: _______________
- 環境: _______________
- バージョン/コミットハッシュ: _______________
- 承認者: _______________

## 備考

_______________________________________________
_______________________________________________
_______________________________________________
