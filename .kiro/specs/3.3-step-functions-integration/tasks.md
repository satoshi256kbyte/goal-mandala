# Step Functions統合 実装タスクリスト

## 実装方針

このタスクリストは、Step Functions統合機能を段階的に実装するための詳細な手順を定義します。各タスクは独立して実装・テスト可能で、前のタスクの成果物を基に次のタスクを進めます。

## タスク一覧

- [ ] 1. データベーススキーマ拡張
  - WorkflowExecutionテーブルの追加
  - GSI（goalId）の設定
  - TTL設定（90日）
  - _Requirements: 6.1, 13.1_

- [ ] 2. State Machine定義
  - [ ] 2.1 基本ワークフロー定義
    - State Machine JSONファイル作成
    - 状態遷移の定義
    - タイムアウト設定（15分）
    - _Requirements: 1.1, 4.1_
  
  - [ ] 2.2 バッチ処理ロジック実装
    - Map状態の設定（最大3バッチ並列）
    - アクション並列処理（最大8並列）
    - バッチサイズ制御（最大8アクション/バッチ）
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 2.3 リトライポリシー設定
    - 指数バックオフ設定（2秒、4秒、8秒）
    - 最大リトライ回数（3回）
    - タイムアウト設定（AI呼び出し: 2分、バッチ: 5分）
    - _Requirements: 3.1, 3.2, 3.3, 4.2, 4.3_
  
  - [ ] 2.4 エラーハンドリング設定
    - Catch句の設定
    - エラー分類（Validation/Transient/Permanent/Partial）
    - 部分失敗対応
    - _Requirements: 3.4, 3.5, 14.1, 14.2_

- [ ] 3. Lambda関数実装
  - [ ] 3.1 Start Workflow Lambda
    - 入力バリデーション
    - 目標存在確認
    - Step Functions実行開始
    - 実行ARN保存
    - 目標ステータス更新（processing）
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 3.2 Validate Input Lambda
    - goalId検証
    - userId検証
    - アクション存在確認
    - _Requirements: 1.2_
  
  - [ ] 3.3 Get Actions Lambda
    - 目標に紐づくアクション取得
    - アクションコンテキスト取得
    - _Requirements: 2.1_
  
  - [ ] 3.4 Create Batches Lambda
    - アクションをバッチに分割（最大8/バッチ）
    - バッチ順序の維持
    - _Requirements: 2.1, 2.4_
  
  - [ ] 3.5 Task Generation Lambda統合
    - 既存Lambda関数の再利用
    - 入力フォーマット調整
    - 出力フォーマット調整
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ] 3.6 Save Tasks Lambda
    - トランザクション処理
    - バッチインサート
    - エラーハンドリング
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 3.7 Update Progress Lambda
    - 進捗率計算
    - 推定残り時間計算
    - データベース更新
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [ ] 3.8 Aggregate Results Lambda
    - 結果集約
    - 成功/失敗カウント
    - 失敗アクションリスト作成
    - _Requirements: 2.5, 14.3_
  
  - [ ] 3.9 Update Goal Status Lambda
    - 目標ステータス更新（active/partial/failed）
    - 完了時刻記録
    - _Requirements: 1.5, 14.2_
  
  - [ ] 3.10 Get Status Lambda
    - 実行状況取得
    - 進捗情報取得
    - _Requirements: 6.3_
  
  - [ ] 3.11 Cancel Workflow Lambda
    - 実行停止
    - 部分生成タスククリーンアップ
    - 目標ステータス更新（draft）
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 3.12 Handle Error Lambda
    - エラーログ記録
    - エラー通知準備
    - _Requirements: 3.5, 7.4_

- [ ] 4. CDKインフラ実装
  - [ ] 4.1 Step Functions State Machine
    - State Machine定義
    - IAMロール作成
    - CloudWatch Logs統合
    - _Requirements: 1.1_
  
  - [ ] 4.2 Lambda関数デプロイ
    - 全Lambda関数のCDK定義
    - 環境変数設定
    - タイムアウト設定
    - メモリ設定
    - _Requirements: 各Lambda関数_
  
  - [ ] 4.3 DynamoDB設定
    - WorkflowExecutionテーブル作成
    - GSI設定
    - TTL設定
    - _Requirements: 13.1, 13.5_
  
  - [ ] 4.4 IAM権限設定
    - Step Functions実行ロール
    - Lambda実行ロール
    - 最小権限の原則
    - _Requirements: セキュリティ要件_
  
  - [ ] 4.5 CloudWatch設定
    - メトリクス定義
    - ログストリーム設定
    - アラーム設定
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.2_
  
  - [ ] 4.6 SNS設定
    - トピック作成
    - サブスクリプション設定
    - _Requirements: 8.1, 8.3, 8.4_

- [ ] 5. API統合
  - [ ] 5.1 Start Activity エンドポイント
    - POST /api/goals/{goalId}/start-activity
    - 認証・認可
    - Start Workflow Lambda呼び出し
    - _Requirements: 1.1_
  
  - [ ] 5.2 Get Workflow Status エンドポイント
    - GET /api/workflows/{executionArn}/status
    - 認証・認可
    - Get Status Lambda呼び出し
    - _Requirements: 6.3_
  
  - [ ] 5.3 Cancel Workflow エンドポイント
    - POST /api/workflows/{executionArn}/cancel
    - 認証・認可
    - Cancel Workflow Lambda呼び出し
    - _Requirements: 9.1_

- [ ] 6. フロントエンド実装
  - [ ] 6.1 ワークフロー開始UI
    - 活動開始ボタン
    - 確認ダイアログ
    - API呼び出し
    - _Requirements: 1.1_
  
  - [ ] 6.2 進捗表示UI
    - プログレスバー
    - 進捗率表示
    - 推定残り時間表示
    - リアルタイム更新（ポーリング）
    - _Requirements: 6.2, 6.3_
  
  - [ ] 6.3 キャンセルUI
    - キャンセルボタン
    - 確認ダイアログ
    - API呼び出し
    - _Requirements: 9.1_
  
  - [ ] 6.4 エラー表示UI
    - エラーメッセージ表示
    - 失敗アクションリスト表示
    - リトライボタン
    - _Requirements: 14.4_

- [ ] 7. 監視・ログ実装
  - [ ] 7.1 構造化ログ実装
    - ログフォーマット定義
    - 各Lambda関数でのログ記録
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 7.2 CloudWatchメトリクス実装
    - カスタムメトリクス定義
    - メトリクス記録ロジック
    - _Requirements: 7.5_
  
  - [ ] 7.3 アラート設定
    - 失敗率アラーム（10%超過）
    - タイムアウトアラーム
    - SNS通知設定
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8. プロパティベーステスト実装
  - [ ] 8.1 Property 1: Workflow Execution Idempotency
    - **Property 1: Workflow Execution Idempotency**
    - **Validates: Requirements 1.1, 10.1**
  
  - [ ] 8.2 Property 2: Batch Processing Completeness
    - **Property 2: Batch Processing Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ] 8.3 Property 3: Retry Exponential Backoff
    - **Property 3: Retry Exponential Backoff**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [ ] 8.4 Property 4: Timeout Enforcement
    - **Property 4: Timeout Enforcement**
    - **Validates: Requirements 4.1, 4.4**
  
  - [ ] 8.5 Property 5: Task Persistence Atomicity
    - **Property 5: Task Persistence Atomicity**
    - **Validates: Requirements 5.1, 5.4**
  
  - [ ] 8.6 Property 6: Progress Calculation Accuracy
    - **Property 6: Progress Calculation Accuracy**
    - **Validates: Requirements 6.2, 6.3**
  
  - [ ] 8.7 Property 7: Partial Failure Handling
    - **Property 7: Partial Failure Handling**
    - **Validates: Requirements 14.1, 14.2, 14.3**
  
  - [ ] 8.8 Property 8: Concurrent Execution Isolation
    - **Property 8: Concurrent Execution Isolation**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [ ] 8.9 Property 9: Execution History Completeness
    - **Property 9: Execution History Completeness**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  
  - [ ] 8.10 Property 10: Alert Trigger Threshold
    - **Property 10: Alert Trigger Threshold**
    - **Validates: Requirements 8.2**

- [ ] 9. 統合テスト実装
  - [ ] 9.1 正常系テスト
    - 全アクション成功シナリオ
    - 進捗更新検証
    - 最終ステータス検証
    - _Requirements: 1.1, 1.5_
  
  - [ ] 9.2 部分失敗テスト
    - 一部アクション失敗シナリオ
    - 成功タスク保存検証
    - 失敗リスト検証
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ] 9.3 全失敗テスト
    - 全アクション失敗シナリオ
    - エラーハンドリング検証
    - アラート送信検証
    - _Requirements: 3.4, 3.5, 8.1_
  
  - [ ] 9.4 タイムアウトテスト
    - 長時間実行シミュレーション
    - タイムアウト検証
    - クリーンアップ検証
    - _Requirements: 4.1, 4.4_
  
  - [ ] 9.5 並行実行テスト
    - 複数ユーザー同時実行
    - データ競合検証
    - 分離検証
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 9.6 キャンセルテスト
    - 実行中キャンセル
    - クリーンアップ検証
    - ステータス更新検証
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 10. ローカルテスト環境構築
  - [ ] 10.1 Step Functions Localセットアップ
    - Docker環境構築
    - State Machine定義検証
    - _Requirements: 11.1, 11.4_
  
  - [ ] 10.2 モックサービス実装
    - AI APIモック
    - データベースモック
    - _Requirements: 11.2_
  
  - [ ] 10.3 ローカル実行スクリプト
    - 実行スクリプト作成
    - デバッグ環境設定
    - _Requirements: 11.5_

- [ ] 11. パフォーマンス最適化
  - [ ] 11.1 並列処理最適化
    - バッチサイズ調整
    - 並列度調整
    - _Requirements: 12.1_
  
  - [ ] 11.2 コネクションプーリング
    - データベース接続プール
    - HTTPクライアント再利用
    - _Requirements: 12.2_
  
  - [ ] 11.3 キャッシング実装
    - 目標コンテキストキャッシュ
    - アクションコンテキストキャッシュ
    - _Requirements: 12.3_
  
  - [ ] 11.4 パフォーマンステスト
    - 負荷テスト
    - レイテンシ測定
    - スループット測定
    - _Requirements: 12.4, 12.5_

- [ ] 12. ドキュメント作成
  - [ ] 12.1 API仕様書
    - エンドポイント定義
    - リクエスト/レスポンス形式
    - エラーコード一覧
  
  - [ ] 12.2 運用ガイド
    - デプロイ手順
    - 監視方法
    - トラブルシューティング
  
  - [ ] 12.3 開発者ドキュメント
    - アーキテクチャ説明
    - コンポーネント説明
    - ローカル開発手順

- [ ] 13. 最終検証
  - すべてのテストが成功することを確認
  - コード品質チェック（lint、format、type-check）
  - パフォーマンス要件達成確認
  - セキュリティ要件達成確認
  - ドキュメント完全性確認

- [ ] 14. Checkpoint - すべてのテストが成功することを確認
  - すべてのテストが成功することを確認
  - 質問があればユーザーに確認

- [ ] 15. ステアリングファイル更新
  - 実装で得られた学びをステアリングファイルに追加
  - ベストプラクティスの文書化
  - トラブルシューティングガイドの更新

## 実装順序

### Phase 1: 基本ワークフロー（タスク1-3）
目標: State Machine定義とLambda関数の基本実装

### Phase 2: インフラ構築（タスク4）
目標: CDKによるAWSリソースのデプロイ

### Phase 3: API・UI統合（タスク5-6）
目標: フロントエンドからワークフローを実行可能にする

### Phase 4: 監視・ログ（タスク7）
目標: 運用に必要な監視・アラート機能の実装

### Phase 5: テスト（タスク8-10）
目標: 包括的なテストによる品質保証

### Phase 6: 最適化・ドキュメント（タスク11-12）
目標: パフォーマンス最適化とドキュメント整備

### Phase 7: 最終検証（タスク13-15）
目標: 本番リリース準備

## 注意事項

- 各タスクは独立して実装・テスト可能
- プロパティベーステストは実装と並行して作成
- 統合テストは各Phaseの完了時に実行
- パフォーマンス最適化は基本機能完成後に実施
- ドキュメントは実装と並行して更新

