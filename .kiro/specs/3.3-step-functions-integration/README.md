# Step Functions統合 Spec概要

## 目的

アクションからタスクへの変換処理を、AWS Step Functionsを使用した非同期ワークフローとして実装することで、以下を実現します：

1. **信頼性の向上**: リトライポリシーとエラーハンドリングによる堅牢な処理
2. **可視性の向上**: 実行状況のリアルタイム追跡と履歴管理
3. **スケーラビリティ**: 並列処理とバッチ処理による効率的なリソース利用
4. **運用性の向上**: 監視・アラート機能による迅速な問題対応

## 主要機能

### 1. ワークフローオーケストレーション

- **バッチ処理**: 最大8アクションを1バッチとして処理
- **並列実行**: バッチ内のアクションを並列処理してパフォーマンス向上
- **順序制御**: アクションの順序を維持しながら効率的に処理

### 2. エラーハンドリング

- **リトライポリシー**: 最大3回の再試行（指数バックオフ: 2秒、4秒）
- **タイムアウト制御**: 
  - AI呼び出し: 2分
  - バッチ処理: 5分
  - ワークフロー全体: 15分
- **部分失敗対応**: 一部のアクションが失敗しても成功したタスクは保存

### 3. 状態監視

- **リアルタイム進捗**: 30秒ごとに実行状況を更新
- **進捗率表示**: 処理済みアクション数/総アクション数
- **実行履歴**: 90日間の履歴保持（以降はS3にアーカイブ）

### 4. 監視・アラート

- **CloudWatchメトリクス**:
  - 実行回数
  - 成功率
  - 平均実行時間
  - エラー率
- **SNS通知**: 失敗時の即時通知
- **CloudWatchアラーム**: 失敗率10%超過時にアラート

## アーキテクチャ

```
User Request
    ↓
API Gateway
    ↓
Lambda (Start Workflow)
    ↓
Step Functions State Machine
    ├─ Batch 1 (Actions 1-8)
    │   ├─ Lambda (Task Generation) [Parallel]
    │   ├─ Lambda (Task Generation) [Parallel]
    │   └─ Lambda (Task Generation) [Parallel]
    ├─ Batch 2 (Actions 9-16)
    │   └─ ...
    └─ Save Results
        ↓
    DynamoDB (Tasks)
        ↓
    Update Goal Status
```

## 技術スタック

- **AWS Step Functions**: ワークフローオーケストレーション
- **AWS Lambda**: タスク生成処理（既存のAI統合Lambda関数を再利用）
- **Amazon DynamoDB**: タスクデータ保存
- **Amazon CloudWatch**: メトリクス・ログ・アラート
- **Amazon SNS**: 失敗通知
- **AWS CDK**: インフラ定義

## 依存関係

### 前提条件

- ✅ 3.1 タスク管理機能: 完了（タスクデータモデル、CRUD API）
- 🚧 3.2 リマインド機能: 進行中（タスク選択ロジック）

### 統合ポイント

1. **既存Lambda関数の再利用**:
   - `packages/backend/src/handlers/task-generation.ts`
   - AI統合ロジックをそのまま利用

2. **データベーススキーマ**:
   - `Task`テーブル: 既存スキーマを使用
   - `WorkflowExecution`テーブル: 新規追加（実行履歴管理）

3. **API統合**:
   - `POST /api/goals/{goalId}/start-activity`: ワークフロー開始
   - `GET /api/workflows/{executionArn}/status`: 実行状況取得
   - `POST /api/workflows/{executionArn}/cancel`: 実行キャンセル

## 実装フェーズ

### Phase 1: 基本ワークフロー（3.3.1, 3.3.2）

- Step Functions State Machine定義
- Lambda統合
- データベース保存

### Phase 2: エラーハンドリング（3.3.4）

- リトライポリシー実装
- タイムアウト設定
- 部分失敗対応

### Phase 3: 監視機能（3.3.3, 3.3.5）

- 実行状況追跡
- CloudWatchメトリクス
- SNS通知

### Phase 4: テスト・最適化（3.3.6）

- ローカルテスト環境
- 統合テスト
- パフォーマンス最適化

## 成功指標

- **信頼性**: 成功率95%以上
- **パフォーマンス**: 平均実行時間5分以内（64アクション）
- **可視性**: リアルタイム進捗更新（30秒間隔）
- **運用性**: 失敗検知から通知まで1分以内

## 次のステップ

1. **requirements.md確認**: 要件定義の承認
2. **design.md作成**: 詳細設計（State Machine定義、データフロー）
3. **tasks.md作成**: 実装タスクリスト
4. **実装開始**: Phase 1から順次実装

## 参考資料

- [AWS Step Functions ドキュメント](https://docs.aws.amazon.com/step-functions/)
- [Step Functions ベストプラクティス](https://docs.aws.amazon.com/step-functions/latest/dg/bp-express.html)
- [既存タスク管理Spec](./../3.1.1-task-management/)
- [既存リマインドSpec](./../3.2-reminder-functionality/)

