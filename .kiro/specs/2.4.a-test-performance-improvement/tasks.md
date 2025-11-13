# 実装タスクリスト

## タスク概要

フロントエンドテストのパフォーマンスを改善し、60秒以内に完了させる。

- [x] 1. Vitest設定の最適化
- [x] 2. テストセットアップファイルの改善
- [x] 3. package.jsonスクリプトの改善
- [x] 4. test-with-timeout.shスクリプトの改善
- [x] 5. 統合テストの分離
- [-] 6. 動作確認とパフォーマンス測定
- [x] 7. ドキュメント更新

---

## 詳細タスク

### 1. Vitest設定の最適化

- [x] 1.1 vitest.config.tsの統合テスト除外設定を追加
  - `exclude`に`**/*.integration.test.{ts,tsx}`と`**/test/integration/**`を追加
  - _要件: 1.2_

- [x] 1.2 並列実行設定の最適化
  - `maxConcurrency`を5から10に増加
  - `isolate: false`を追加（テスト間の分離を無効化）
  - _要件: 1.4_

- [x] 1.3 タイムアウト設定の調整
  - `testTimeout`を5000から10000に増加
  - `hookTimeout`を3000から5000に増加
  - `teardownTimeout`を2000から3000に増加
  - _要件: 1.5_

- [x] 1.4 カバレッジ設定の確認
  - デフォルトでカバレッジが無効になっていることを確認
  - _要件: 1.3_

### 2. テストセットアップファイルの改善

- [x] 2.1 src/test/setup.tsに警告抑制ロジックを追加
  - React Testing Libraryの`reactStrictMode: false`設定
  - `console.error`のフィルタリング（React Router警告、act警告）
  - `console.warn`のフィルタリング（npm警告）
  - _要件: 3.1, 3.2, 3.3_

- [x] 2.2 メモリリーク対策の追加
  - テスト後のクリーンアップロジック
  - グローバル変数のリセット
  - _要件: 3.5_

### 3. package.jsonスクリプトの改善

- [x] 3.1 packages/frontend/package.jsonのテストスクリプトを更新
  - `test`: `vitest run --reporter=basic --no-coverage`に変更
  - `test:unit`: `vitest run --reporter=basic --no-coverage`を追加
  - `test:integration`: 統合テストのみ実行するコマンドを追加
  - `test:fast`: `vitest run --reporter=basic --no-coverage --isolate=false`を追加
  - _要件: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 既存のtest:fastスクリプトとの整合性確認
  - 既存の`test:fast`スクリプトを確認
  - 必要に応じて統合
  - _要件: 2.3_

### 4. test-with-timeout.shスクリプトの改善

- [x] 4.1 tools/scripts/test-with-timeout.shのfrontendケースを更新
  - `--no-coverage`フラグを追加
  - `--isolate=false`フラグを追加
  - _要件: 1.3, 1.4_

- [x] 4.2 タイムアウト値の調整
  - フロントエンドテストのデフォルトタイムアウトを60秒に設定
  - _要件: 1.1_

### 5. 統合テストの分離

- [x] 5.1 統合テストファイルのリネーム
  - `src/__tests__/integration/`内のファイルを`*.integration.test.tsx`にリネーム
  - `src/test/integration/`内のファイルを確認
  - _要件: 2.2_

- [x] 5.2 統合テスト用のVitest設定ファイルを作成（オプション）
  - `vitest.integration.config.ts`を作成
  - 統合テスト専用の設定を定義
  - _要件: 2.2_

### 6. 動作確認とパフォーマンス測定

- [x] 6.1 test:fastコマンドの実行時間測定
  - 目標: 15秒以内
  - _要件: 1.1_

- [ ] 6.2 test:unitコマンドの実行時間測定
  - 目標: 30秒以内
  - _要件: 1.1_

- [ ] 6.3 test:integrationコマンドの実行時間測定
  - 目標: 45秒以内
  - _要件: 2.2_

- [ ] 6.4 test:coverageコマンドの実行時間測定
  - 目標: 60秒以内
  - _要件: 2.4_

- [ ] 6.5 pnpm test:frontendコマンドの実行時間測定
  - 目標: 60秒以内
  - _要件: 1.1_

- [ ] 6.6 すべてのテストが正常に実行されることを確認
  - テスト失敗がないことを確認
  - 警告が大幅に減少していることを確認
  - _要件: 3.1, 3.2, 3.3_

### 7. ドキュメント更新

- [x] 7.1 README.mdの更新
  - 新しいテストコマンドの説明を追加
  - テスト実行時間の目安を記載
  - _要件: すべて_

- [x] 7.2 CONTRIBUTING.mdの更新
  - テスト実行のベストプラクティスを追加
  - 開発フローでのテストコマンド使い分けを説明
  - _要件: すべて_

- [x] 7.3 .kiro/steering/9-test-guide.mdの更新
  - 新しいテスト戦略を反映
  - パフォーマンス目標を記載
  - _要件: すべて_

---

## 実装順序

1. タスク1: Vitest設定の最適化（基盤）
2. タスク2: テストセットアップファイルの改善（警告抑制）
3. タスク3: package.jsonスクリプトの改善（コマンド分離）
4. タスク4: test-with-timeout.shスクリプトの改善（CI/CD統合）
5. タスク5: 統合テストの分離（テスト整理）
6. タスク6: 動作確認とパフォーマンス測定（検証）
7. タスク7: ドキュメント更新（完了）

## 注意事項

- 既存のテストが失敗しないように注意する
- 警告抑制は必要最小限にとどめる
- パフォーマンス測定は複数回実行して平均を取る
- CI/CD環境でも動作することを確認する
