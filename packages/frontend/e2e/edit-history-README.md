# 変更履歴E2Eテスト実装サマリー

## 概要

マンダラチャート編集機能の変更履歴表示とロールバック機能のE2Eテストを実装しました。

## 実装ファイル

- `packages/frontend/e2e/edit-history.spec.ts`

## テストカバレッジ

### 1. 履歴表示機能

- ✅ 履歴ボタンをクリックして履歴パネルを表示
- ✅ 変更履歴一覧が正しく表示される
- ✅ 履歴エントリをクリックして詳細を表示
- ✅ 履歴がない場合のメッセージ表示
- ✅ 履歴の時系列表示が正しい
- ✅ 変更者名が正しく表示される
- ✅ 変更日時が正しく表示される

### 2. 差分表示機能

- ✅ 差分表示が正しく動作する
- ✅ 複数フィールドの変更が正しく表示される
- ✅ 旧値と新値が明確に区別される

### 3. エンティティ別履歴

- ✅ 目標の変更履歴を表示
- ✅ サブ目標の変更履歴を表示
- ✅ アクションの変更履歴を表示

### 4. ページネーション

- ✅ ページネーションが正しく動作する
- ✅ 大量の履歴データの表示

### 5. ロールバック機能（管理者のみ）

- ✅ 管理者のみロールバックボタンが表示される
- ✅ 通常ユーザーにはロールバックボタンが表示されない
- ✅ ロールバック機能が正しく動作する
- ✅ ロールバック確認ダイアログでキャンセル
- ✅ ロールバックエラー時のエラーメッセージ表示

### 6. UI操作

- ✅ 履歴パネルを閉じる
- ✅ 履歴詳細モーダルを閉じる

## テストデータ構造

### モック履歴データ

```typescript
{
  id: string; // 履歴ID
  entityType: string; // エンティティタイプ（goal/subgoal/action）
  entityId: string; // エンティティID
  userId: string; // 変更者ID
  userName: string; // 変更者名
  changedAt: string; // 変更日時（ISO 8601形式）
  changes: Array<{
    field: string; // 変更されたフィールド名
    oldValue: string; // 旧値
    newValue: string; // 新値
  }>;
}
```

## 必要なコンポーネント

以下のコンポーネントが実装される必要があります：

### 1. HistoryPanel

履歴パネルコンポーネント

**必要なdata-testid:**

- `history-panel`: 履歴パネル本体
- `history-panel-close`: 閉じるボタン
- `history-entry-{id}`: 各履歴エントリ
- `pagination-next`: 次のページボタン
- `pagination-prev`: 前のページボタン

### 2. HistoryDetailModal

履歴詳細モーダルコンポーネント

**必要なdata-testid:**

- `history-detail-modal`: 詳細モーダル本体
- `history-detail-modal-close`: 閉じるボタン
- `diff-viewer`: 差分表示エリア
- `diff-item`: 各差分項目
- `diff-old-value`: 旧値表示
- `diff-new-value`: 新値表示
- `rollback-button`: ロールバックボタン（管理者のみ）

### 3. RollbackConfirmDialog

ロールバック確認ダイアログコンポーネント

**必要なdata-testid:**

- `rollback-confirm-dialog`: 確認ダイアログ本体
- `rollback-confirm-button`: 確認ボタン
- `rollback-cancel-button`: キャンセルボタン

### 4. MandalaCellコンポーネント拡張

**必要なdata-testid:**

- `history-button-goal`: 目標の履歴ボタン
- `history-button-subgoal-{position}`: サブ目標の履歴ボタン
- `history-button-action-{position}`: アクションの履歴ボタン

## 必要なAPI

### 1. 履歴取得API

```
GET /api/goals/:goalId/history?limit=20&offset=0
GET /api/subgoals/:subGoalId/history?limit=20&offset=0
GET /api/actions/:actionId/history?limit=20&offset=0
```

**レスポンス:**

```json
{
  "history": [...],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

### 2. ロールバックAPI（管理者のみ）

```
POST /api/goals/:goalId/rollback
POST /api/subgoals/:subGoalId/rollback
POST /api/actions/:actionId/rollback
```

**リクエストボディ:**

```json
{
  "historyId": "history-1"
}
```

**レスポンス:**

```json
{
  "id": "goal-id",
  "title": "ロールバック後のタイトル",
  ...
  "updated_at": "2024-01-15T12:05:00Z"
}
```

## テスト実行方法

### 全テスト実行

```bash
cd packages/frontend
npx playwright test e2e/edit-history.spec.ts
```

### 特定のテストのみ実行

```bash
npx playwright test e2e/edit-history.spec.ts -g "履歴ボタンをクリックして履歴パネルを表示"
```

### デバッグモードで実行

```bash
npx playwright test e2e/edit-history.spec.ts --debug
```

### UIモードで実行

```bash
npx playwright test e2e/edit-history.spec.ts --ui
```

## 注意事項

1. **テストのスキップ**: 現在、全てのテストは `test.skip` でスキップされています。実装完了後、`test.skip` を `test` に変更してテストを有効化してください。

2. **認証**: テストでは `setupAuthForPage` 関数を使用してモック認証を設定しています。管理者権限のテストでは `isAdmin: true` を渡してください。

3. **APIモック**: 全てのAPIリクエストは `page.route()` を使用してモックされています。実際のAPIエンドポイントに合わせて調整が必要な場合があります。

4. **タイムアウト**: 一部のアサーションには `{ timeout: 5000 }` を設定しています。必要に応じて調整してください。

5. **data-testid**: コンポーネント実装時には、このドキュメントに記載されている `data-testid` 属性を必ず設定してください。

## 今後の拡張

- [ ] 履歴のフィルタリング機能のテスト
- [ ] 履歴の検索機能のテスト
- [ ] 履歴のエクスポート機能のテスト
- [ ] 複数ユーザーによる変更履歴の表示テスト
- [ ] 履歴の詳細情報（変更理由など）の表示テスト

## 関連ドキュメント

- [編集機能設計書](../../.kiro/specs/2.1.5-edit-functionality/design.md)
- [編集機能要件定義書](../../.kiro/specs/2.1.5-edit-functionality/requirements.md)
- [編集競合E2Eテスト](./edit-conflict.spec.ts)
