# サブ目標・アクション編集フロー E2Eテスト

このディレクトリには、サブ目標・アクション編集機能のE2Eテストが含まれています。

## テストファイル構成

### 1. subgoal-edit-flow.spec.ts

サブ目標編集機能の包括的なテスト

**テスト内容:**

- サブ目標一覧表示
- サブ目標編集フォーム
- バリデーション機能
- ドラッグ&ドロップによる並び替え
- 一括編集機能
- AI再生成機能
- ナビゲーション
- エラーハンドリング

### 2. action-edit-flow.spec.ts

アクション編集機能の包括的なテスト

**テスト内容:**

- アクション一覧表示（64個）
- サブ目標タブ切り替え
- アクション編集フォーム
- アクション種別設定（実行/習慣）
- サブ目標間移動
- ドラッグ&ドロップによる並び替え
- 一括編集機能
- ナビゲーション
- エラーハンドリング
- パフォーマンステスト

### 3. draft-save-restore-flow.spec.ts

下書き保存・復元機能の包括的なテスト

**テスト内容:**

- 自動保存機能（30秒間隔）
- 手動保存機能
- 下書き復元機能
- 画面離脱時の確認ダイアログ
- 下書きデータ管理（圧縮、暗号化、自動削除）
- エラーハンドリング

### 4. integration-flow.spec.ts

複数機能を組み合わせた統合テスト

**テスト内容:**

- 完全なマンダラ作成フロー
- 複雑な編集操作の組み合わせ
- ユーザビリティテスト
- データ整合性テスト
- パフォーマンステスト

## テスト実行方法

### 全テスト実行

```bash
# プロジェクトルートから
pnpm --filter frontend test:e2e

# または特定のテストファイルのみ
pnpm --filter frontend test:e2e e2e/subgoal-action/
```

### 個別テスト実行

```bash
# サブ目標編集フローのみ
npx playwright test e2e/subgoal-action/subgoal-edit-flow.spec.ts

# アクション編集フローのみ
npx playwright test e2e/subgoal-action/action-edit-flow.spec.ts

# 下書き保存・復元フローのみ
npx playwright test e2e/subgoal-action/draft-save-restore-flow.spec.ts

# 統合フローのみ
npx playwright test e2e/subgoal-action/integration-flow.spec.ts
```

### ブラウザ指定実行

```bash
# Chrome のみ
npx playwright test --project=chromium e2e/subgoal-action/

# Firefox のみ
npx playwright test --project=firefox e2e/subgoal-action/

# Safari のみ
npx playwright test --project=webkit e2e/subgoal-action/

# モバイル Chrome
npx playwright test --project="Mobile Chrome" e2e/subgoal-action/
```

### デバッグモード実行

```bash
# UIモードで実行
npx playwright test --ui e2e/subgoal-action/

# ヘッドフルモードで実行
npx playwright test --headed e2e/subgoal-action/

# 特定のテストをデバッグ
npx playwright test --debug e2e/subgoal-action/subgoal-edit-flow.spec.ts
```

## テストデータ

テストで使用するデータは `../fixtures/subgoal-action-data.ts` で定義されています。

### 主要なテストデータ:

- `validSubGoalData`: 有効なサブ目標データ
- `validActionData`: 有効なアクションデータ
- `invalidSubGoalData`: 無効なサブ目標データ（バリデーションテスト用）
- `invalidActionData`: 無効なアクションデータ（バリデーションテスト用）
- `draftData`: 下書きデータ
- `bulkEditData`: 一括編集用データ
- `dragDropData`: ドラッグ&ドロップテスト用データ

## ヘルパー関数

テストで使用するヘルパー関数は `../helpers/subgoal-action-helpers.ts` で定義されています。

### 主要なヘルパー関数:

- `goToSubGoalEdit()`: サブ目標編集ページに移動
- `goToActionEdit()`: アクション編集ページに移動
- `selectSubGoal()`: サブ目標を選択
- `selectAction()`: アクションを選択
- `fillSubGoalForm()`: サブ目標フォームに入力
- `fillActionForm()`: アクションフォームに入力
- `dragSubGoal()`: サブ目標をドラッグ&ドロップ
- `dragAction()`: アクションをドラッグ&ドロップ
- `selectMultipleSubGoals()`: 複数のサブ目標を選択
- `selectMultipleActions()`: 複数のアクションを選択
- `saveDraft()`: 下書き保存
- `expectAutoSave()`: 自動保存の確認

## テスト環境設定

### 前提条件

1. 開発サーバーが起動していること（`pnpm dev`）
2. 認証システムが動作していること
3. テスト用のユーザーアカウントが存在すること

### 環境変数

```bash
# テスト環境用の設定
PLAYWRIGHT_BASE_URL=http://localhost:5173
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
```

### モックデータ

テストでは以下のAPIエンドポイントをモックしています:

- `/api/subgoals/**` - サブ目標関連API
- `/api/actions/**` - アクション関連API
- `/api/drafts/**` - 下書き関連API

## CI/CD統合

GitHub Actionsでの自動実行設定:

```yaml
- name: Run E2E Tests
  run: |
    pnpm --filter frontend test:e2e:ci
  env:
    PLAYWRIGHT_BASE_URL: http://localhost:5173
```

## トラブルシューティング

### よくある問題

1. **テストがタイムアウトする**
   - 開発サーバーが起動していることを確認
   - ネットワーク接続を確認
   - `--timeout` オプションで時間を延長

2. **要素が見つからない**
   - `data-testid` 属性が正しく設定されているか確認
   - 要素の表示タイミングを `waitForLoadState()` で調整

3. **ドラッグ&ドロップが動作しない**
   - タッチデバイスでのテストの場合、適切なイベントが発火されているか確認
   - ドラッグ対象の要素が正しく選択されているか確認

4. **認証エラー**
   - テスト用ユーザーの認証情報が正しいか確認
   - 認証トークンの有効期限を確認

### デバッグ方法

1. **スクリーンショット取得**

   ```typescript
   await page.screenshot({ path: 'debug-screenshot.png' });
   ```

2. **コンソールログ確認**

   ```typescript
   page.on('console', msg => console.log(msg.text()));
   ```

3. **ネットワークリクエスト監視**
   ```typescript
   page.on('request', request => console.log(request.url()));
   page.on('response', response => console.log(response.status()));
   ```

## パフォーマンス要件

- **ページロード時間**: 3秒以内
- **タブ切り替え時間**: 500ms以内
- **フォーム保存時間**: 2秒以内
- **ドラッグ&ドロップ応答時間**: 100ms以内

## アクセシビリティ要件

- **キーボード操作**: 全機能がキーボードで操作可能
- **スクリーンリーダー**: 適切なARIAラベルが設定されている
- **フォーカス管理**: 論理的な順序でフォーカスが移動する
- **色覚対応**: 色以外の情報でも判別可能

## セキュリティテスト

- **XSS対策**: 入力値のサニタイズが適切に行われている
- **CSRF対策**: 適切なトークン検証が行われている
- **認証・認可**: 未認証ユーザーのアクセスが適切に制限されている
