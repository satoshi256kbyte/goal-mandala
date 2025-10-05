# モーダル編集E2Eテスト

## 概要

このディレクトリには、EditModalコンポーネントを使用した詳細編集機能のE2Eテストが含まれています。

## テストファイル

### edit-modal.spec.ts

モーダル編集機能の包括的なE2Eテストです。

## テスト対象機能

### 1. 基本的なモーダル操作

- **モーダルの開閉**
  - 編集ボタンクリックでモーダルが開く
  - キャンセルボタンでモーダルが閉じる
  - モーダル外クリックでモーダルが閉じる
  - Escキーでモーダルが閉じる

- **初期値の表示**
  - 目標の全フィールドが正しく表示される
  - サブ目標の全フィールドが正しく表示される
  - アクションの全フィールドが正しく表示される

### 2. フォーム入力

- **目標編集**
  - タイトル、説明、達成期限、背景、制約事項の編集
  - 全フィールドを一度に編集して保存
  - 変更内容が正しくAPIに送信される

- **サブ目標編集**
  - タイトル、説明、背景、制約事項の編集
  - 保存後にマンダラチャートに反映される

- **アクション編集**
  - タイトル、説明、背景、制約事項の編集
  - アクション種別（実行/習慣）の選択
  - 種別変更が正しく保存される

### 3. バリデーション

- **必須フィールドチェック**
  - タイトルが空の場合エラー表示
  - 説明が空の場合エラー表示
  - 背景が空の場合エラー表示

- **文字数制限チェック**
  - タイトル: 100文字以内
  - 説明: 500文字以内
  - 背景: 1000文字以内
  - 制約事項: 1000文字以内

- **日付バリデーション**
  - 達成期限が過去の日付の場合エラー表示
  - 未来の日付のみ受け付ける

- **リアルタイムバリデーション**
  - フォーカスを外すと即座にバリデーション実行
  - エラーメッセージが即座に表示される
  - 修正するとエラーメッセージが消える

- **文字数カウント**
  - 各フィールドの文字数が表示される
  - リアルタイムで更新される

### 4. エラーハンドリング

- **ネットワークエラー**
  - エラーメッセージが表示される
  - モーダルは開いたまま
  - 再試行が可能

- **サーバーエラー**
  - 500エラー時のエラーメッセージ表示
  - 適切なエラーメッセージが表示される

- **権限エラー**
  - 403エラー時のエラーメッセージ表示
  - モーダルが自動的に閉じる

### 5. 保存中の状態表示

- **ボタンの無効化**
  - 保存中は保存ボタンが無効化される
  - 保存中はキャンセルボタンも無効化される

- **ローディングインジケーター**
  - 保存中はローディングアイコンが表示される
  - 保存完了後は非表示になる

### 6. アクセシビリティ

- **キーボードナビゲーション**
  - Tabキーでフィールド間を移動できる
  - Shift+Tabで逆方向に移動できる
  - Escキーでモーダルを閉じられる

- **ARIA属性**
  - モーダルに適切なrole属性が設定されている
  - 各フィールドにaria-label属性が設定されている
  - aria-labelledby属性でモーダルタイトルが関連付けられている

## テストデータ

### モック目標データ

```typescript
{
  id: 'test-goal-id',
  user_id: 'test-user-id',
  title: '目標タイトル',
  description: '目標の説明文',
  deadline: '2024-12-31',
  background: '目標の背景情報',
  constraints: '目標の制約事項',
  status: 'active',
  progress: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}
```

### モックサブ目標データ

```typescript
{
  id: 'test-subgoal-id',
  goal_id: 'test-goal-id',
  title: 'サブ目標タイトル',
  description: 'サブ目標の説明文',
  background: 'サブ目標の背景情報',
  constraints: 'サブ目標の制約事項',
  position: 0,
  progress: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}
```

### モックアクションデータ

```typescript
{
  id: 'test-action-id',
  sub_goal_id: 'test-subgoal-id',
  title: 'アクションタイトル',
  description: 'アクションの説明文',
  background: 'アクションの背景情報',
  constraints: 'アクションの制約事項',
  type: 'execution',
  position: 0,
  progress: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}
```

## テスト実行方法

### 全テスト実行

```bash
pnpm --filter frontend test:e2e
```

### 特定のテストファイルのみ実行

```bash
pnpm --filter frontend test:e2e edit-modal.spec.ts
```

### ヘッドレスモードで実行

```bash
pnpm --filter frontend test:e2e --headed
```

### デバッグモード

```bash
pnpm --filter frontend test:e2e --debug
```

## data-testid一覧

### モーダル関連

- `edit-modal`: モーダル本体
- `modal-overlay`: モーダルの背景オーバーレイ
- `modal-title`: モーダルのタイトル
- `modal-loading`: ローディングインジケーター

### ボタン

- `edit-button-goal`: 目標の編集ボタン
- `edit-button-subgoal-{position}`: サブ目標の編集ボタン
- `edit-button-action-{position}`: アクションの編集ボタン
- `modal-save-button`: 保存ボタン
- `modal-cancel-button`: キャンセルボタン

### フォームフィールド

- `modal-title-input`: タイトル入力フィールド
- `modal-description-input`: 説明入力フィールド
- `modal-deadline-input`: 達成期限入力フィールド（目標のみ）
- `modal-background-input`: 背景入力フィールド
- `modal-constraints-input`: 制約事項入力フィールド
- `modal-type-select`: アクション種別選択（アクションのみ）

### その他

- `title-char-count`: タイトルの文字数カウント
- `description-char-count`: 説明の文字数カウント
- `background-char-count`: 背景の文字数カウント
- `constraints-char-count`: 制約事項の文字数カウント

## 注意事項

1. **実装完了まではテストがスキップされます**
   - EditModalコンポーネントの実装が完了するまで、テストは実行されません
   - 実装完了後、`test.skip`を`test`に変更してテストを有効化してください

2. **モックデータの使用**
   - テストは完全にモックデータを使用します
   - 実際のAPIやデータベースには接続しません

3. **認証のモック**
   - 認証はlocalStorageを使用してモックされます
   - 実際の認証フローはテストされません

4. **ブラウザ互換性**
   - Chromium、Firefox、WebKitでテストが実行されます
   - クロスブラウザの互換性が確認されます

## トラブルシューティング

### テストがタイムアウトする

- ネットワークモックが正しく設定されているか確認
- `timeout`オプションを増やす

### 要素が見つからない

- `data-testid`が正しく設定されているか確認
- コンポーネントの実装を確認

### バリデーションエラーが表示されない

- バリデーションロジックが実装されているか確認
- エラーメッセージのテキストが正しいか確認

## 関連ドキュメント

- [編集機能設計書](../.kiro/specs/2.1.5-edit-functionality/design.md)
- [編集機能要件定義](../.kiro/specs/2.1.5-edit-functionality/requirements.md)
- [編集機能タスクリスト](../.kiro/specs/2.1.5-edit-functionality/tasks.md)
