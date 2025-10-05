# 編集競合E2Eテスト

## 概要

このディレクトリには、マンダラチャート編集機能の競合検出と解決フローをテストするE2Eテストが含まれています。

## テストファイル

- `edit-conflict.spec.ts`: 編集競合シナリオのE2Eテスト

## テストシナリオ

### 1. 同時編集による競合検出 - インライン編集

2つのブラウザタブで同じセルを同時に編集し、競合が正しく検出されることを確認します。

**テストフロー:**

1. 両方のタブでマンダラチャート画面を開く
2. 両方のタブで同じセルをクリックして編集モードに入る
3. タブ1で編集して保存（成功）
4. タブ2で編集して保存を試みる（競合エラー）
5. 競合ダイアログが表示されることを確認

### 2. 競合解決 - 最新データを取得して再編集

競合が発生した際に、最新データを取得して再編集できることを確認します。

**テストフロー:**

1. タブ1で先に更新
2. タブ2で競合を発生させる
3. 競合ダイアログで「最新データを取得」を選択
4. 最新データが反映されることを確認

### 3. 競合解決 - 変更を破棄

競合が発生した際に、変更を破棄できることを確認します。

**テストフロー:**

1. タブ1で先に更新
2. タブ2で競合を発生させる
3. 競合ダイアログで「変更を破棄」を選択
4. ダイアログが閉じて編集モードが終了することを確認

### 4. モーダル編集での競合検出

モーダル編集でも競合が正しく検出されることを確認します。

**テストフロー:**

1. 両方のタブで編集ボタンをクリックしてモーダルを開く
2. タブ1でモーダルで編集して保存（成功）
3. タブ2でモーダルで編集して保存を試みる（競合エラー）
4. 競合ダイアログが表示されることを確認

### 5. 連続した競合検出

複数回連続で競合が発生しても正しく処理されることを確認します。

**テストフロー:**

1. 3回連続で競合を発生させる
2. 各回で競合ダイアログが表示されることを確認
3. 各回で最新データを取得できることを確認

### 6. サブ目標の同時編集競合

サブ目標の編集でも競合が正しく検出されることを確認します。

### 7. アクションの同時編集競合

アクションの編集でも競合が正しく検出されることを確認します。

## テスト実行方法

### 全テストを実行

```bash
cd packages/frontend
npx playwright test edit-conflict.spec.ts
```

### 特定のテストを実行

```bash
npx playwright test edit-conflict.spec.ts -g "同時編集による競合検出"
```

### デバッグモードで実行

```bash
npx playwright test edit-conflict.spec.ts --debug
```

### ヘッドレスモードを無効化して実行

```bash
npx playwright test edit-conflict.spec.ts --headed
```

## テストの有効化

現在、これらのテストは `test.describe.skip` でスキップされています。
編集機能の実装が完了したら、以下の手順でテストを有効化してください：

1. `edit-conflict.spec.ts` を開く
2. `test.describe.skip` を `test.describe` に変更
3. テストを実行して全て成功することを確認

## 実装が必要なコンポーネント

テストを有効化する前に、以下のコンポーネントの実装が必要です：

### フロントエンド

- **InlineEditor**: インライン編集コンポーネント
  - `data-testid="inline-editor"`
  - `data-testid="inline-editor-input"`
- **EditModal**: モーダル編集コンポーネント
  - `data-testid="edit-modal"`
  - `data-testid="modal-title-input"`
  - `data-testid="modal-description-input"`
  - `data-testid="modal-save-button"`
- **ConflictDialog**: 競合解決ダイアログ
  - `data-testid="conflict-dialog"`
  - `data-testid="conflict-reload-button"`
  - `data-testid="conflict-discard-button"`
- **MandalaCell**: マンダラセルコンポーネント
  - `data-testid="mandala-cell-goal"`
  - `data-testid="mandala-cell-subgoal-{index}"`
  - `data-testid="mandala-cell-action-{index}"`
  - `data-testid="edit-button-goal"`

### バックエンド

- **PUT /api/goals/:goalId**: 目標更新API（楽観的ロック対応）
  - リクエストに `updated_at` フィールドを含む
  - 競合時に 409 Conflict を返す
  - レスポンスに最新データを含む
- **PUT /api/subgoals/:subGoalId**: サブ目標更新API（楽観的ロック対応）
- **PUT /api/actions/:actionId**: アクション更新API（楽観的ロック対応）

## テストデータ

テストでは以下のモックデータを使用します：

```typescript
const mockGoal = {
  id: 'test-goal-id',
  title: '初期タイトル',
  description: '初期説明',
  deadline: '2024-12-31',
  background: '初期背景',
  constraints: '初期制約',
  updated_at: '2024-01-15T10:00:00Z',
  user_id: 'test-user-id',
};
```

## トラブルシューティング

### テストがタイムアウトする

- コンポーネントの `data-testid` 属性が正しく設定されているか確認
- API のモックが正しく設定されているか確認
- ブラウザのコンソールでエラーが発生していないか確認

### 競合ダイアログが表示されない

- API が 409 Conflict を返しているか確認
- レスポンスに `latestData` が含まれているか確認
- ConflictDialog コンポーネントが正しく実装されているか確認

### 複数タブのテストが失敗する

- ブラウザコンテキストが正しく作成されているか確認
- 各ページで認証情報が正しく設定されているか確認
- ページ間でデータが共有されていないか確認

## 参考資料

- [Playwright Documentation](https://playwright.dev/)
- [要件定義書](.kiro/specs/2.1.5-edit-functionality/requirements.md)
- [設計書](.kiro/specs/2.1.5-edit-functionality/design.md)
