# タスク管理機能 実装タスクリスト

## 実装方針

- テストファーストの構成：テストコード実装 → 実装 → テスト実行
- 各実装タスク後に`npm run format`と`npm run lint`を実行してエラーと警告をゼロにする
- プロパティベーステストは最低100回の反復で実行
- 各プロパティテストには設計書のプロパティ番号を明記

## 実装状況サマリー

### 完了済み
- データベーススキーマ（tasks, task_notes, task_history, saved_views）
- バックエンドサービス（TaskService, FilterService, ProgressService, NotificationService）
- 基本的なフロントエンドコンポーネント（TaskCard, ProgressBar, TaskFilter, TaskSearch）
- TaskServiceのユニットテスト
- テストユーティリティ（generators, arbitraries）
- Lambda Handlerの完全実装（認証・認可・入力検証・エラーハンドリング）
- TaskAPIクライアントの実装（全エンドポイント対応）
- React Queryの統合（キャッシュ戦略・楽観的更新）
- フロントエンドページコンポーネント（TaskListPage, TaskDetailPage）
- 通知機能の完全実装（ユニットテスト・プロパティテスト含む）
- プロパティベーステスト（Property 2, 3, 4, 5, 6, 19, 20）

### 未完了
- 統合テスト・E2Eテスト
- CDKインフラ実装
- パフォーマンス最適化
- セキュリティ対策
- ドキュメント作成

## タスクリスト

- [x] 1. プロジェクト基盤とセットアップ
  - [x] 1.1 データベーススキーマの拡張
    - Prismaスキーマに`task_notes`、`task_history`、`saved_views`テーブルを追加
    - マイグレーションファイルを生成・実行
    - _Requirements: 3.1-3.5, 8.1-8.5, 13.1-13.5_
  - [x] 1.2 共通型定義の作成
    - `@goal-mandala/shared`に`Task`、`TaskNote`、`TaskHistory`、`SavedView`型を追加
    - `TaskType`、`TaskStatus`、`TaskFilters`型を定義
    - _Requirements: 1.1-1.5, 2.1-2.5_
  - [x] 1.3 テストユーティリティの作成
    - タスク生成用のファクトリー関数を作成
    - fast-checkのArbitraryを定義（プロパティベーステスト用）
    - モックデータジェネレーターを作成
    - _Requirements: All_

- [x] 2. バックエンドAPI実装
  - [x] 2.1 TaskServiceの実装
    - [x] 2.1.1 TaskServiceクラスの作成
      - `getTasks`、`getTaskById`、`updateTaskStatus`メソッドを実装
      - Prismaを使用したデータベース操作
      - _Requirements: 1.1, 2.1-2.3_
    - [x] 2.1.2 TaskServiceのユニットテスト
      - 各メソッドの正常系・異常系テスト
      - モックを使用したデータベース操作のテスト
      - _Requirements: 1.1, 2.1-2.3_

  - [x] 2.2 ノート機能の実装
    - [x] 2.2.1 ノートCRUD操作の実装
      - `addNote`、`updateNote`、`deleteNote`メソッドを実装
      - タイムスタンプの自動設定
      - _Requirements: 3.1-3.5_
    - [x] 2.2.2 ノート機能のプロパティテスト
      - **Property 8: ノート保存のタイムスタンプ**
      - **Property 9: ノート表示の時系列順**
      - **Property 10: ノート編集の更新時刻**
      - **Property 11: ノート削除の完全性**
      - **Validates: Requirements 3.2-3.5**
  
  - [x] 2.3 フィルター・検索機能の実装
    - [x] 2.3.1 FilterServiceの実装
      - `applyFilters`、`searchTasks`メソッドを実装
      - 複数条件の組み合わせ対応
      - _Requirements: 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5_
    - [x] 2.3.2 フィルター・検索のプロパティテスト
      - **Property 1: タスク一覧の完全性**
      - **Property 12: 検索の正確性**
      - **Property 13: 複数キーワード検索の正確性**
      - **Property 14: 検索クリアの完全性**
      - **Property 15: キーワードハイライトの正確性**
      - **Validates: Requirements 1.1, 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5**
  
  - [x] 2.4 進捗計算機能の実装
    - [x] 2.4.1 ProgressServiceの実装
      - `calculateActionProgress`、`calculateSubGoalProgress`、`calculateGoalProgress`メソッドを実装
      - 階層的な進捗更新ロジック
      - _Requirements: 10.1-10.5, 11.1-11.5, 12.1-12.5_
    - [x] 2.4.2 進捗計算のプロパティテスト
      - **Property 7: 進捗の連鎖更新**
      - **Validates: Requirements 2.5, 10.1-10.5, 11.1-11.5, 12.1-12.5**
  
  - [x] 2.5 一括操作機能の実装
    - [x] 2.5.1 一括操作メソッドの実装
      - `bulkUpdateStatus`、`bulkDelete`メソッドを実装
      - トランザクション処理
      - _Requirements: 9.2-9.5_
    - [x] 2.5.2 一括操作のプロパティテスト
      - **Property 17: 一括操作の完全性**
      - **Validates: Requirements 9.2-9.5**

  - [x] 2.6 保存済みビュー機能の実装
    - [x] 2.6.1 SavedViewServiceの実装
      - `saveView`、`getSavedViews`、`deleteSavedView`メソッドを実装
      - JSON形式でのフィルター保存
      - _Requirements: 8.1-8.5_
    - [x] 2.6.2 保存済みビューのプロパティテスト
      - **Property 16: 保存済みビューのラウンドトリップ**
      - **Validates: Requirements 8.1-8.5**
  
  - [x] 2.7 タスク履歴機能の実装
    - [x] 2.7.1 履歴記録機能の実装
      - タスク状態更新時の自動履歴記録
      - `getTaskHistory`メソッドを実装
      - _Requirements: 13.1-13.5_
    - [x] 2.7.2 タスク履歴のプロパティテスト
      - **Property 18: タスク履歴の記録**
      - **Validates: Requirements 13.1-13.5**
  
  - [x] 2.8 Lambda Handlerの実装
    - [x] 2.8.1 APIエンドポイントハンドラーの完成
      - 既存のtask-management.tsハンドラーを確認・修正
      - GET /api/tasks、GET /api/tasks/:id
      - PATCH /api/tasks/:id/status
      - POST /api/tasks/:id/notes、PATCH /api/tasks/:id/notes/:noteId、DELETE /api/tasks/:id/notes/:noteId
      - POST /api/tasks/bulk/status、DELETE /api/tasks/bulk
      - GET /api/saved-views、POST /api/saved-views、DELETE /api/saved-views/:id
      - _Requirements: All_
    - [x] 2.8.2 認証・認可ミドルウェアの統合
      - JWT検証ミドルウェアの適用
      - リソースアクセス制御ミドルウェアの適用
      - エラーハンドリングの統一
      - _Requirements: All_
    - [x] 2.8.3 入力検証の完成
      - Zodスキーマによるバリデーション
      - エラーレスポンスの統一
      - バリデーションエラーメッセージの日本語化
      - _Requirements: All_
    - [x] 2.8.4 Lambda Handlerのユニットテスト
      - 各エンドポイントの正常系・異常系テスト
      - 認証・認可のテスト
      - エラーハンドリングのテスト
      - _Requirements: All_


- [x] 3. フロントエンド実装
  - [x] 3.1 基本コンポーネントの実装
    - [x] 3.1.1 TaskCardコンポーネントの実装
      - タスク情報の表示
      - 状態変更ハンドラー
      - 選択機能
      - _Requirements: 1.2, 1.5_
    - [x] 3.1.2 ProgressBarコンポーネントの実装
      - 進捗バーの表示
      - 色分け（赤/黄/緑）
      - パーセンテージ表示
      - _Requirements: 14.1-14.5_
    - [x] 3.1.3 基本コンポーネントのユニットテスト
      - TaskCard、ProgressBarのレンダリングテスト
      - プロパティ変更時の動作テスト
      - アクセシビリティテスト
      - _Requirements: 1.2, 1.5, 14.1-14.5_
    - [x] 3.1.4 進捗バーのプロパティテスト
      - **Property 19: 進捗バーの色分け**
      - **Validates: Requirements 14.4**
  
  - [x] 3.2 フィルター・検索コンポーネントの実装
    - [x] 3.2.1 TaskFilterコンポーネントの実装
      - 状態フィルター
      - 期限フィルター
      - アクションフィルター
      - _Requirements: 4.1-4.5, 5.1-5.5, 6.1-6.5_
    - [x] 3.2.2 TaskSearchコンポーネントの実装
      - 検索入力フィールド
      - デバウンス処理（300ms）
      - ビュー保存機能
      - _Requirements: 7.1-7.5, 8.1-8.5_
    - [x] 3.2.3 フィルター・検索コンポーネントのユニットテスト
      - フィルター変更時の動作テスト
      - 検索入力時の動作テスト
      - デバウンス処理のテスト
      - _Requirements: 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5_


  - [x] 3.3 TaskListPageの実装
    - [x] 3.3.1 TaskListPageコンポーネントの完成
      - 既存のTaskListPageコンポーネントを確認・修正
      - API統合（React Query）
      - フィルター・検索の統合
      - 一括操作機能の完成
      - 仮想スクロール（react-window）の統合
      - ローディング・エラー状態の表示
      - _Requirements: 1.1-1.5, 9.1-9.5_
    - [x] 3.3.2 楽観的更新の実装
      - タスク状態更新時の即座のUI反映
      - バックグラウンドでのAPI呼び出し
      - エラー時のロールバック
      - React Queryのoptimistic updatesを使用
      - _Requirements: 2.3_
    - [x] 3.3.3 TaskListPageのユニットテスト
      - タスク一覧の表示テスト
      - フィルター・検索の統合テスト
      - 一括操作のテスト
      - ローディング・エラー状態のテスト
      - _Requirements: 1.1-1.5, 9.1-9.5_
    - [x] 3.3.4 タスク表示のプロパティテスト
      - **Property 2: タスク表示の完全性**
      - **Property 3: タスクグループ化の正確性**
      - **Property 4: 期限ハイライトの正確性**
      - **Validates: Requirements 1.2-1.5, 2.2**
  
  - [x] 3.4 TaskDetailPageの実装
    - [x] 3.4.1 TaskDetailPageコンポーネントの完成
      - 既存のTaskDetailPageコンポーネントを確認・修正
      - API統合（React Query）
      - タスク詳細の表示
      - 状態更新機能
      - ノート機能（追加・編集・削除）
      - 履歴表示
      - ローディング・エラー状態の表示
      - _Requirements: 2.1-2.5, 3.1-3.5, 13.1-13.5_
    - [x] 3.4.2 TaskDetailPageのユニットテスト
      - タスク詳細の表示テスト
      - 状態更新のテスト
      - ノート機能のテスト
      - 履歴表示のテスト
      - _Requirements: 2.1-2.5, 3.1-3.5, 13.1-13.5_
    - [x] 3.4.3 タスク状態更新のプロパティテスト
      - **Property 5: タスク状態更新の即時性**
      - **Property 6: 完了時刻の記録**
      - **Validates: Requirements 2.3-2.4**


  - [x] 3.5 API統合の実装
    - [x] 3.5.1 TaskAPIクライアントの実装
      - 全APIエンドポイントのクライアント関数
      - エラーハンドリング
      - リトライロジック（exponential backoff）
      - 認証トークンの自動付与
      - _Requirements: All_
    - [x] 3.5.2 React Queryの統合
      - useTasksフック（タスク一覧取得）
      - useTaskDetailフック（タスク詳細取得）
      - useMutationフック（状態更新、ノート操作、一括操作）
      - キャッシュ戦略（5分キャッシュ）
      - 楽観的更新の実装
      - _Requirements: All_
    - [x] 3.5.3 API統合のユニットテスト
      - APIクライアントのテスト
      - React Queryフックのテスト
      - エラーハンドリングのテスト
      - _Requirements: All_

- [x] 4. 通知機能の実装
  - [x] 4.1 NotificationServiceの実装
    - [x] 4.1.1 通知スケジューリング機能の実装
      - `scheduleNotification`、`cancelNotification`メソッドを実装
      - EventBridgeによるスケジューリング
      - _Requirements: 15.1-15.5_
    - [x] 4.1.2 通知送信機能の実装
      - `sendDeadlineReminder`、`sendOverdueNotification`メソッドを実装
      - SESによるメール送信
      - _Requirements: 15.1-15.5_
    - [x] 4.1.3 通知機能のユニットテスト
      - 通知スケジューリングのテスト
      - 通知送信のテスト
      - 通知キャンセルのテスト
      - _Requirements: 15.1-15.5_
    - [x] 4.1.4 通知機能のプロパティテスト
      - **Property 20: 通知のスケジューリング**
      - **Validates: Requirements 15.1-15.5**

- [x] 5. CDKインフラの実装
  - [x] 5.1 TaskManagementStackの実装
    - Lambda関数の定義（task-management handler）
    - API Gatewayの設定（/tasks エンドポイント）
    - EventBridgeルールの設定（通知スケジューリング）
    - IAMロール・ポリシーの設定
    - 環境変数の設定
    - _Requirements: All_
  - [x] 5.2 監視・ログの設定
    - CloudWatchアラームの設定（エラー率、レスポンス時間）
    - ログ保持期間の設定（30日）
    - メトリクスの定義（API呼び出し数、エラー数）
    - _Requirements: All_


- [x] 6. 統合テスト・E2Eテストの実装
  - [x] 6.1 バックエンド統合テストの実装
    - タスクライフサイクルの統合テスト（作成→更新→完了）
    - フィルター・検索の統合テスト
    - 進捗計算の統合テスト（タスク→アクション→サブ目標→目標）
    - 一括操作の統合テスト
    - ノート機能の統合テスト
    - _Requirements: All_
  - [x] 6.2 E2Eテストの実装（Playwright）
    - タスク一覧表示のE2Eテスト
    - タスク状態更新のE2Eテスト
    - フィルター・検索のE2Eテスト
    - ノート機能のE2Eテスト
    - 一括操作のE2Eテスト
    - _Requirements: All_

- [x] 7. パフォーマンス最適化
  - [x] 7.1 データベース最適化
    - インデックスの追加・最適化（既存スキーマを確認）
    - クエリの最適化（N+1問題の解消、eager loading）
    - パフォーマンステストの実施
    - _Requirements: All_
  - [x] 7.2 キャッシュ戦略の実装
    - タスク一覧のキャッシュ（5分）
    - 進捗計算結果のキャッシュ（1分）
    - 保存済みビューのキャッシュ（10分）
    - キャッシュ無効化ロジックの実装
    - _Requirements: All_
  - [x] 7.3 フロントエンド最適化
    - 仮想スクロールの最適化（react-window）
    - デバウンス処理の調整（検索300ms、フィルター200ms）
    - 楽観的更新の改善
    - コンポーネントのメモ化（React.memo、useMemo）
    - _Requirements: All_

- [x] 8. セキュリティ対策
  - [x] 8.1 認証・認可の強化
    - JWT検証の実装（全エンドポイント）
    - リソースアクセス制御の実装（タスク所有者確認）
    - セキュリティテストの実施
    - _Requirements: All_
  - [x] 8.2 入力検証の強化
    - Zodスキーマの完全実装（全エンドポイント）
    - SQLインジェクション対策の確認（Prisma使用）
    - XSS対策の確認（入力サニタイズ）
    - CSRF対策の実装
    - _Requirements: All_


- [x] 9. ドキュメント作成
  - [x] 9.1 API仕様書の作成
    - OpenAPI仕様書の作成（Swagger/OpenAPI 3.0）
    - エンドポイント一覧
    - リクエスト・レスポンス例
    - エラーコード一覧
    - _Requirements: All_
  - [x] 9.2 開発者ドキュメントの作成
    - アーキテクチャ図（システム構成図）
    - データフロー図（タスク管理フロー）
    - セットアップ手順（ローカル開発環境）
    - デプロイ手順
    - _Requirements: All_
  - [x] 9.3 ユーザーマニュアルの作成
    - タスク管理機能の使い方
    - フィルター・検索の使い方
    - ノート機能の使い方
    - トラブルシューティング
    - _Requirements: All_

- [x] 10. 最終検証とコード品質確認
  - [x] 10.1 全テストの実行確認
    - ユニットテスト（80%カバレッジ達成）
    - プロパティベーステスト（全20プロパティ）
    - 統合テスト
    - E2Eテスト
    - テスト結果レポートの作成
    - _Requirements: All_
  - [x] 10.2 コード品質確認
    - `npm run format`の実行
    - `npm run lint`の実行（エラー・警告ゼロ）
    - TypeScript型チェック（`npm run type-check`）
    - コードレビューの実施
    - _Requirements: All_
  - [x] 10.3 パフォーマンステスト
    - API応答時間の測定（95%ile < 2秒）
    - データベースクエリ時間の測定
    - フロントエンドレンダリング時間の測定
    - 負荷テストの実施
    - _Requirements: All_
  - [x] 10.4 セキュリティテスト
    - 認証・認可のテスト
    - 入力検証のテスト
    - SQLインジェクション対策のテスト
    - XSS対策のテスト
    - CSRF対策のテスト
    - _Requirements: All_

- [x] 11. Checkpoint - 全テストが成功することを確認
  - 全てのテストが成功していることを確認
  - カバレッジレポートの確認
  - パフォーマンステスト結果の確認
  - セキュリティテスト結果の確認
  - 質問があればユーザーに確認

## 注記

- 全てのタスクが必須です（包括的なテストを最初から実施）
- プロパティベーステストは最低100回の反復で実行します
- 各タスク完了後に`npm run format`と`npm run lint`を実行してください
- 実装の過程で得られた学びはステアリングファイルに追加してください

## 次のステップ

### 優先度の高いタスク

1. **テストユーティリティの作成（タスク1.3）**
   - プロパティベーステストに必要なArbitraryを定義
   - モックデータジェネレーターを作成

2. **Lambda Handlerの完成（タスク2.8）**
   - 既存のtask-management.tsハンドラーを確認・修正
   - 認証・認可ミドルウェアの統合
   - ユニットテストの実装

3. **フロントエンドAPI統合（タスク3.5）**
   - TaskAPIクライアントの実装
   - React Queryフックの実装
   - 楽観的更新の実装

4. **TaskListPageとTaskDetailPageの完成（タスク3.3、3.4）**
   - API統合
   - ローディング・エラー状態の実装
   - ユニットテストの実装

5. **プロパティベーステストの実装（各タスクの.4サブタスク）**
   - 全20プロパティのテスト実装
   - fast-checkライブラリの使用
   - 100回以上の反復実行

### 推奨実装順序

1. タスク1.3（テストユーティリティ）
2. タスク2.8（Lambda Handler）
3. タスク3.5（API統合）
4. タスク3.3、3.4（フロントエンドページ）
5. タスク2.2.2、2.3.2、2.4.2、2.5.2、2.6.2、2.7.2（プロパティベーステスト）
6. タスク3.1.3、3.1.4、3.2.3、3.3.3、3.3.4、3.4.2、3.4.3（フロントエンドテスト）
7. タスク4.1.3、4.1.4（通知機能テスト）
8. タスク5（CDKインフラ）
9. タスク6（統合テスト・E2Eテスト）
10. タスク7、8（最適化・セキュリティ）
11. タスク9（ドキュメント）
12. タスク10、11（最終検証）

