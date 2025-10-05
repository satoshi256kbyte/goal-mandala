# インライン編集 E2Eテスト

## 概要

このドキュメントは、インライン編集機能のE2Eテストについて説明します。

## テストファイル

- `inline-edit.spec.ts` - インライン編集機能の包括的なE2Eテスト

## テスト対象機能

### 基本的なインライン編集

- **セルクリックで編集モードに入る**: セルをクリックすると、インライン編集モードが開始される
- **ダブルクリックで編集モードに入る**: セルをダブルクリックしても編集モードが開始される
- **Enterキーで保存**: 編集後にEnterキーを押すと変更が保存される
- **外側クリックで保存**: 編集中に外側をクリックすると変更が保存される
- **Escキーでキャンセル**: Escキーを押すと変更が破棄され、元の値に戻る

### バリデーション

- **空文字でエラー表示**: 必須フィールドを空にすると、エラーメッセージが表示される
- **文字数制限超過でエラー表示**: 文字数制限を超えると、エラーメッセージが表示される
- **リアルタイムバリデーション**: 入力中にリアルタイムでバリデーションが実行される
- **文字数カウント表示**: 現在の文字数と制限が表示される

### キーボード操作

- **Tabキーでフォーカス移動**: Tabキーで次のセルにフォーカスが移動する
- **Shift+Tabキーで逆方向フォーカス移動**: Shift+Tabキーで前のセルにフォーカスが移動する
- **複数回のEnter/Escキー操作**: 連続してEnter/Escキーを使用できる

### サブ目標のインライン編集

- **サブ目標の編集と保存**: サブ目標セルをクリックして編集・保存できる
- **複数のサブ目標を連続編集**: 複数のサブ目標を連続して編集できる

### アクションのインライン編集

- **アクションの編集と保存**: アクションセルをクリックして編集・保存できる

### エラーハンドリング

- **ネットワークエラー時のエラー表示**: ネットワークエラー時に適切なエラーメッセージが表示される
- **サーバーエラー時のエラー表示**: サーバーエラー時に適切なエラーメッセージが表示される
- **権限エラー時のエラー表示**: 権限エラー時に適切なエラーメッセージが表示され、編集モードが終了する
- **バリデーションエラー後の再編集**: バリデーションエラー後も再編集できる

### 楽観的UI更新

- **保存中の即座のUI更新**: API呼び出し前にUIが即座に更新される
- **エラー時のロールバック**: エラー発生時に元の値にロールバックされる

### アクセシビリティ

- **ARIA属性の確認**: 適切なARIA属性が設定されている
- **フォーカス管理**: フォーカスが適切に管理される

### パフォーマンス

- **連続編集のパフォーマンス**: 連続編集が適切な時間内に完了する

## テスト実行方法

### 全ブラウザでテスト実行

```bash
pnpm test:e2e inline-edit.spec.ts
```

### 特定のブラウザでテスト実行

```bash
# Chromiumのみ
pnpm test:e2e inline-edit.spec.ts --project=chromium

# Firefoxのみ
pnpm test:e2e inline-edit.spec.ts --project=firefox

# Webkitのみ
pnpm test:e2e inline-edit.spec.ts --project=webkit
```

### UIモードでテスト実行

```bash
pnpm test:e2e:ui inline-edit.spec.ts
```

### ヘッドモードでテスト実行（ブラウザが表示される）

```bash
pnpm test:e2e:headed inline-edit.spec.ts
```

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

## data-testid属性

テストで使用される主要なdata-testid属性：

- `mandala-cell-goal` - 目標セル
- `mandala-cell-subgoal-{index}` - サブ目標セル
- `mandala-cell-action-{index}` - アクションセル
- `inline-editor` - インライン編集コンテナ
- `inline-editor-input` - インライン編集入力フィールド
- `inline-editor-error` - インライン編集エラーメッセージ
- `inline-editor-char-count` - 文字数カウント表示
- `inline-editor-loading` - ローディングインジケーター

## APIエンドポイント

テストでモックされるAPIエンドポイント：

- `PUT /api/goals/:goalId` - 目標更新
- `PUT /api/subgoals/:subGoalId` - サブ目標更新
- `PUT /api/actions/:actionId` - アクション更新
- `GET /api/goals/:goalId` - 目標取得

## エラーレスポンス

テストでシミュレートされるエラー：

### ネットワークエラー

```typescript
await route.abort('failed');
```

### サーバーエラー（500）

```typescript
{
  status: 500,
  body: {
    error: 'INTERNAL_SERVER_ERROR',
    message: 'サーバーエラーが発生しました'
  }
}
```

### 権限エラー（403）

```typescript
{
  status: 403,
  body: {
    error: 'PERMISSION_DENIED',
    message: '編集権限がありません'
  }
}
```

### 競合エラー（409）

```typescript
{
  status: 409,
  body: {
    error: 'EDIT_CONFLICT',
    message: 'データが他のユーザーによって更新されています',
    latestData: { ... }
  }
}
```

## ブラウザ互換性

このテストは以下のブラウザで実行されます：

- **Chromium** (Google Chrome, Microsoft Edge)
- **Firefox**
- **Webkit** (Safari)

各ブラウザで同じ動作が保証されることを確認します。

## トラブルシューティング

### タイムアウトエラー

テストがタイムアウトする場合は、`playwright.config.ts`の`timeout`設定を調整してください。

```typescript
timeout: 30000, // 30秒に延長
```

### セレクターエラー

セレクターが見つからない場合は、コンポーネントに正しい`data-testid`属性が設定されているか確認してください。

### モックエラー

APIモックが正しく動作しない場合は、ルートパターンとメソッドを確認してください。

## ベストプラクティス

1. **明示的な待機**: `expect`を使用して要素の状態を確認する
2. **独立性**: 各テストは独立して実行可能にする
3. **クリーンアップ**: テスト後の状態をクリーンアップする
4. **エラーハンドリング**: 予期しないエラーを適切に処理する
5. **パフォーマンス**: 不要な待機時間を避ける

## 関連ドキュメント

- [edit-modal-README.md](./edit-modal-README.md) - モーダル編集E2Eテスト
- [edit-conflict-README.md](./edit-conflict-README.md) - 編集競合E2Eテスト
- [edit-history-README.md](./edit-history-README.md) - 変更履歴E2Eテスト
- [README.md](./README.md) - E2Eテスト全体の概要
