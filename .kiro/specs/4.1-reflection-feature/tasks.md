# 振り返り機能 実装タスク

## Phase 1: バックエンド実装

### 1. データベーススキーマ確認

- [x] 1.1 Reflectionテーブルの確認
  - Prismaスキーマで既存のReflectionモデルを確認
  - インデックスが適切に設定されているか確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - **完了**: 既存のReflectionモデルをTaskReflectionに変更し、新しい目標ベースのReflectionモデルを作成。データベーススキーマを正常に適用。

### 2. バリデーションスキーマ実装

- [x] 2.1 Zodスキーマの作成
  - createReflectionSchemaの実装
  - updateReflectionSchemaの実装
  - バリデーションエラーメッセージの日本語化
  - _Requirements: 1.4, 3.4_
  - **完了**: createReflectionSchemaとupdateReflectionSchemaを実装。全てのエラーメッセージを日本語化。updateReflectionSchemaにrefineを追加して空の更新リクエストを防止。コード品質チェック（format/lint）完了。

- [x] 2.2 プロパティテスト: バリデーションエラーの一貫性
  - **Property 8: バリデーションエラーの一貫性**
  - **Validates: Requirements 1.4, 3.4**
  - **完了**: 14テスト実装（createReflectionSchema: 7テスト、updateReflectionSchema: 7テスト）。全テスト成功（100回反復実行）。コード品質チェック（format/lint）完了。

### 3. ReflectionService実装

- [x] 3.1 振り返り作成機能
  - createReflection メソッドの実装
  - 入力バリデーション
  - データベース保存
  - エラーハンドリング
  - _Requirements: 1.1, 1.2, 1.3_
  - **完了**: 全5メソッド実装（createReflection, getReflection, getReflectionsByGoal, updateReflection, deleteReflection）。22テスト実装（全て成功）。コード品質チェック（format/lint）完了。

- [ ] 3.2 プロパティテスト: 振り返り作成の完全性
  - **Property 1: 振り返り作成の完全性**
  - **Validates: Requirements 1.3**

- [ ] 3.3 振り返り取得機能（単一）
  - getReflection メソッドの実装
  - ユーザーID検証
  - エラーハンドリング
  - _Requirements: 2.3_

- [ ] 3.4 プロパティテスト: 振り返り取得の正確性
  - **Property 2: 振り返り取得の正確性**
  - **Validates: Requirements 2.3**

- [ ] 3.5 振り返り一覧取得機能
  - getReflectionsByGoal メソッドの実装
  - 作成日時降順ソート
  - ユーザーID検証
  - エラーハンドリング
  - _Requirements: 2.1, 2.2_

- [ ] 3.6 プロパティテスト: 振り返り一覧の順序性
  - **Property 3: 振り返り一覧の順序性**
  - **Validates: Requirements 2.1**

- [ ] 3.7 振り返り更新機能
  - updateReflection メソッドの実装
  - 入力バリデーション
  - ユーザーID検証
  - データベース更新
  - エラーハンドリング
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3.8 プロパティテスト: 振り返り更新の冪等性
  - **Property 4: 振り返り更新の冪等性**
  - **Validates: Requirements 3.3**

- [ ] 3.9 振り返り削除機能
  - deleteReflection メソッドの実装
  - ユーザーID検証
  - データベース削除
  - エラーハンドリング
  - _Requirements: 4.1, 4.2_

- [ ] 3.10 プロパティテスト: 振り返り削除の完全性
  - **Property 5: 振り返り削除の完全性**
  - **Validates: Requirements 4.2**

- [ ] 3.11 プロパティテスト: 目標削除時のカスケード削除
  - **Property 7: 目標削除時のカスケード削除**
  - **Validates: Requirements 6.2**

- [ ] 3.12 プロパティテスト: 日時の自動設定
  - **Property 10: 日時の自動設定**
  - **Validates: Requirements 6.3, 6.4**

### 4. ActionProgressService実装

- [ ] 4.1 アクション進捗取得機能
  - getActionProgress メソッドの実装
  - 目標に紐づく全アクションの取得
  - 進捗情報の整形
  - ユーザーID検証
  - エラーハンドリング
  - _Requirements: 5.1_

- [ ] 4.2 アクション分類機能
  - categorizeActions メソッドの実装
  - 進捗80%以上: 惜しかったアクション
  - 進捗20%以下: 進まなかったアクション
  - 進捗0%: 未着手アクション
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 4.3 プロパティテスト: アクション進捗分類の正確性
  - **Property 6: アクション進捗分類の正確性**
  - **Validates: Requirements 5.2, 5.3, 5.4**

### 5. Lambda Handler実装

- [ ] 5.1 振り返り作成エンドポイント
  - POST /api/reflections の実装
  - JWT認証ミドルウェア適用
  - リクエストボディのバリデーション
  - ReflectionService呼び出し
  - レスポンス返却（201 Created）
  - エラーハンドリング
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5.2 振り返り取得エンドポイント（単一）
  - GET /api/reflections/:id の実装
  - JWT認証ミドルウェア適用
  - ReflectionService呼び出し
  - レスポンス返却（200 OK / 404 Not Found）
  - エラーハンドリング
  - _Requirements: 2.3_

- [ ] 5.3 振り返り一覧取得エンドポイント
  - GET /api/goals/:goalId/reflections の実装
  - JWT認証ミドルウェア適用
  - ReflectionService呼び出し
  - レスポンス返却（200 OK）
  - エラーハンドリング
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 5.4 振り返り更新エンドポイント
  - PUT /api/reflections/:id の実装
  - JWT認証ミドルウェア適用
  - リクエストボディのバリデーション
  - ReflectionService呼び出し
  - レスポンス返却（200 OK）
  - エラーハンドリング
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5.5 振り返り削除エンドポイント
  - DELETE /api/reflections/:id の実装
  - JWT認証ミドルウェア適用
  - ReflectionService呼び出し
  - レスポンス返却（200 OK）
  - エラーハンドリング
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5.6 アクション進捗取得エンドポイント
  - GET /api/goals/:goalId/action-progress の実装
  - JWT認証ミドルウェア適用
  - ActionProgressService呼び出し
  - レスポンス返却（200 OK）
  - エラーハンドリング
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5.7 プロパティテスト: 認証・認可の保証
  - **Property 9: 認証・認可の保証**
  - **Validates: Requirements 1.1, 2.1, 3.1, 4.1**

### 6. Checkpoint - バックエンドテスト実行

- [ ] 6.1 全テストの実行
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: フロントエンド実装

### 7. APIクライアント実装

- [ ] 7.1 ReflectionAPIクライアント
  - createReflection API呼び出し
  - getReflection API呼び出し
  - getReflectionsByGoal API呼び出し
  - updateReflection API呼び出し
  - deleteReflection API呼び出し
  - getActionProgress API呼び出し
  - エラーハンドリング
  - リトライロジック
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

### 8. React Queryフック実装

- [ ] 8.1 useCreateReflection フック
  - useMutation でラップ
  - 成功時のキャッシュ更新
  - エラーハンドリング
  - _Requirements: 1.3_

- [ ] 8.2 useReflection フック
  - useQuery でラップ
  - キャッシュ設定（5分）
  - エラーハンドリング
  - _Requirements: 2.3_

- [ ] 8.3 useReflectionsByGoal フック
  - useQuery でラップ
  - キャッシュ設定（5分）
  - エラーハンドリング
  - _Requirements: 2.1_

- [ ] 8.4 useUpdateReflection フック
  - useMutation でラップ
  - 成功時のキャッシュ更新
  - エラーハンドリング
  - _Requirements: 3.3_

- [ ] 8.5 useDeleteReflection フック
  - useMutation でラップ
  - 成功時のキャッシュ削除
  - エラーハンドリング
  - _Requirements: 4.2_

- [ ] 8.6 useActionProgress フック
  - useQuery でラップ
  - キャッシュ設定（1分）
  - エラーハンドリング
  - _Requirements: 5.1_

### 9. ReflectionFormコンポーネント実装

- [ ] 9.1 フォーム基本構造
  - React Hook Form統合
  - Zodバリデーション
  - 総括入力フィールド（必須、テキストエリア）
  - 惜しかったアクション入力フィールド（任意、テキストエリア）
  - 進まなかったアクション入力フィールド（任意、テキストエリア）
  - 未着手アクション入力フィールド（任意、テキストエリア）
  - 保存ボタン
  - キャンセルボタン
  - _Requirements: 1.2, 3.2_

- [ ] 9.2 アクション候補選択機能
  - ActionProgressSelectorコンポーネント統合
  - 候補からアクション選択
  - 選択されたアクションをフィールドに追加
  - _Requirements: 5.5_

- [ ] 9.3 バリデーションエラー表示
  - フィールドごとのエラーメッセージ表示
  - 送信時のエラーハンドリング
  - _Requirements: 1.4, 3.4_

- [ ] 9.4 初期データ設定（編集時）
  - initialDataプロパティから値を設定
  - _Requirements: 3.2_

### 10. ActionProgressSelectorコンポーネント実装

- [ ] 10.1 アクション進捗取得
  - useActionProgress フック使用
  - カテゴリ別にアクションを表示
  - ローディング状態表示
  - エラー状態表示
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10.2 アクション選択UI
  - アクション一覧表示（タイトル、進捗率）
  - 選択ボタン
  - 選択時のコールバック実行
  - _Requirements: 5.5_

### 11. ReflectionListコンポーネント実装

- [ ] 11.1 振り返り一覧表示
  - useReflectionsByGoal フック使用
  - 振り返りカード表示（作成日時、総括の一部）
  - 作成日時降順ソート
  - ローディング状態表示
  - エラー状態表示
  - 空状態表示（「振り返りがありません」）
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 11.2 振り返り選択機能
  - カードクリックで詳細画面へ遷移
  - _Requirements: 2.3_

### 12. ReflectionDetailコンポーネント実装

- [ ] 12.1 振り返り詳細表示
  - useReflection フック使用
  - 総括表示
  - 惜しかったアクション表示
  - 進まなかったアクション表示
  - 未着手アクション表示
  - 作成日時・更新日時表示
  - ローディング状態表示
  - エラー状態表示
  - _Requirements: 2.3_

- [ ] 12.2 編集・削除ボタン
  - 編集ボタン（編集画面へ遷移）
  - 削除ボタン（削除確認ダイアログ表示）
  - 戻るボタン（一覧画面へ遷移）
  - _Requirements: 3.1, 4.1_

- [ ] 12.3 削除確認ダイアログ
  - 削除確認メッセージ表示
  - 削除実行ボタン
  - キャンセルボタン
  - useDeleteReflection フック使用
  - 削除成功時に一覧画面へ遷移
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

### 13. ページコンポーネント実装

- [ ] 13.1 ReflectionCreatePage
  - ReflectionForm コンポーネント配置
  - useCreateReflection フック使用
  - 保存成功時に一覧画面へ遷移
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 13.2 ReflectionListPage
  - ReflectionList コンポーネント配置
  - 新規作成ボタン（作成画面へ遷移）
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 13.3 ReflectionDetailPage
  - ReflectionDetail コンポーネント配置
  - _Requirements: 2.3, 3.1, 4.1_

- [ ] 13.4 ReflectionEditPage
  - ReflectionForm コンポーネント配置（初期データ設定）
  - useUpdateReflection フック使用
  - 更新成功時に詳細画面へ遷移
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

### 14. ルーティング設定

- [ ] 14.1 ルート追加
  - /mandala/:id/reflections - 振り返り一覧
  - /mandala/:id/reflections/new - 振り返り作成
  - /mandala/:id/reflections/:reflectionId - 振り返り詳細
  - /mandala/:id/reflections/:reflectionId/edit - 振り返り編集
  - _Requirements: 1.1, 2.1, 2.3, 3.1_

### 15. Checkpoint - フロントエンドテスト実行

- [ ] 15.1 全テストの実行
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: 統合テスト・ドキュメント

### 16. 統合テスト実装

- [ ] 16.1 振り返りライフサイクルテスト
  - 作成 → 取得 → 更新 → 削除のフロー
  - データの整合性確認
  - _Requirements: 1.3, 2.3, 3.3, 4.2_

- [ ] 16.2 アクション進捗連携テスト
  - アクション進捗取得
  - 分類の正確性確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 16.3 エラーハンドリングテスト
  - バリデーションエラー
  - 認証エラー
  - 認可エラー
  - Not Foundエラー
  - _Requirements: 1.4, 1.5, 2.4, 3.4, 3.5, 4.4_

### 17. E2Eテスト実装

- [ ] 17.1 振り返り作成フロー
  - ログイン → 目標選択 → 振り返り作成 → 保存
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 17.2 振り返り履歴閲覧フロー
  - ログイン → 目標選択 → 振り返り一覧 → 詳細表示
  - _Requirements: 2.1, 2.3_

- [ ] 17.3 振り返り編集・削除フロー
  - ログイン → 目標選択 → 振り返り詳細 → 編集 → 保存
  - ログイン → 目標選択 → 振り返り詳細 → 削除 → 確認
  - _Requirements: 3.1, 3.3, 4.1, 4.2_

### 18. ドキュメント作成

- [ ] 18.1 API仕様書
  - エンドポイント一覧
  - リクエスト・レスポンス形式
  - エラーコード一覧
  - 認証・認可仕様
  - _Requirements: All_

- [ ] 18.2 ユーザーマニュアル
  - 振り返り機能の使い方
  - 画面操作ガイド
  - FAQ
  - トラブルシューティング
  - _Requirements: All_

### 19. 最終検証

- [ ] 19.1 全テストの実行
  - ユニットテスト
  - プロパティベーステスト
  - 統合テスト
  - E2Eテスト
  - _Requirements: All_

- [ ] 19.2 コード品質確認
  - `npm run format`
  - `npm run lint`（エラー・警告ゼロ件）
  - _Requirements: All_

- [ ] 19.3 パフォーマンステスト
  - API応答時間測定（< 2秒）
  - ページロード時間測定（< 3秒）
  - _Requirements: All_

- [ ] 19.4 セキュリティテスト
  - 認証・認可の確認
  - 入力検証の確認
  - XSS対策の確認
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

### 20. WBS更新

- [ ] 20.1 WBSファイルの更新
  - `.kiro/steering/4-wbs.md` の4.1セクションを完了に更新
  - 完了日を記録
  - 成果物を記録
  - _Requirements: All_

### 21. ステアリングファイル更新

- [ ] 21.1 実装で得られた学びをステアリングに追加
  - 振り返り機能実装のベストプラクティス
  - React Hook Formの活用方法
  - プロパティベーステストの実装パターン
  - _Requirements: All_
