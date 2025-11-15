# 実装タスクリスト

- [x] 1. パフォーマンステストとアクセシビリティテストの削除

- [x] 1.1 パフォーマンステストファイルの削除
  - `packages/frontend/src/__tests__/performance/` ディレクトリを削除
  - `packages/frontend/src/test/performance/` ディレクトリを削除
  - すべての `*.performance.test.tsx` ファイルを削除
  - _要件: 1.4, 2.4_

- [x] 1.2 アクセシビリティテストファイルの削除
  - `packages/frontend/src/__tests__/accessibility-*.test.tsx` ファイルを削除
  - `packages/frontend/src/components/accessibility/__tests__/` ディレクトリを削除
  - `packages/frontend/src/test/accessibility-test-runner.ts` ファイルを削除
  - `packages/frontend/src/components/auth/__tests__/accessibility.test.tsx` ファイルを削除
  - `packages/frontend/src/components/mandala/__tests__/accessibility.test.tsx` ファイルを削除
  - `packages/frontend/src/components/mandala-list/__tests__/accessibility.test.tsx` ファイルを削除
  - _要件: 1.4, 2.5_

- [x] 1.3 不要なスクリプトの削除
  - `tools/scripts/performance-test.sh` を削除
  - `tools/scripts/quality-check.sh` を削除
  - `tools/scripts/usability-test.sh` を削除
  - `tools/scripts/integration-test.sh` を削除
  - `tools/scripts/format-and-lint.sh` を削除
  - `tools/scripts/final-quality-check.sh` を削除
  - _要件: 4.1_

- [x] 2. 重複テストファイルの統合と削除

- [x] 2.1 コンポーネントテストの統合
  - 各コンポーネントで複数のテストファイルがある場合、1つに統合
  - 統合ルール: `Component.test.tsx` のみ残し、他は削除
  - 重要なテストケースのみ残す（コア機能、エラーハンドリング、セキュリティ）
  - _要件: 2.1, 2.2_

- [x] 2.2 フォームコンポーネントテストの統合
  - `GoalInputForm.test.tsx` と `GoalInputForm.responsive.test.tsx` を統合
  - `DynamicFormField.test.tsx` と `DynamicFormField.responsive.test.tsx` を統合
  - その他のフォームコンポーネントも同様に統合
  - _要件: 2.1, 2.2_

- [x] 2.3 マンダラコンポーネントテストの統合
  - `MandalaCell.test.tsx` と `MandalaCell.color-scheme.test.tsx` を統合
  - `MandalaChart.test.tsx` と `MandalaChart.integration.test.tsx` を統合
  - `InlineEditor` の複数テストファイルを1つに統合
  - `EditModal` の複数テストファイルを1つに統合
  - _要件: 2.1, 2.2_

- [x] 2.4 プロフィールコンポーネントテストの統合
  - `ProfileSetupForm.test.tsx`, `ProfileSetupForm.accessibility.test.tsx`, `ProfileSetupForm.responsive.test.tsx` を統合
  - その他のプロフィールコンポーネントも同様に統合
  - _要件: 2.1, 2.2_

- [x] 2.5 マンダラリストコンポーネントテストの統合
  - `MandalaListContainer.test.tsx` と関連テストを統合
  - `responsive.test.tsx` と `error-handling.test.tsx` を統合
  - _要件: 2.1, 2.2_

- [x] 2.6 共通コンポーネントテストの統合
  - `ProgressBar` 関連テストを統合
  - `ProgressHistory` 関連テストを統合
  - `ProgressDetailModal` 関連テストを統合
  - その他の共通コンポーネントも同様に統合
  - _要件: 2.1, 2.2_

- [x] 2.7 アニメーション関連テストの削除
  - `animation-*.test.tsx` ファイルを削除（パフォーマンステストに分類）
  - `AchievementAnimation.test.tsx` を削除
  - `AnimationSettingsPanel.test.tsx` を削除
  - _要件: 2.4_

- [x] 3. 統合テストの最小化

- [x] 3.1 統合テストの整理
  - `src/__tests__/integration/` ディレクトリを確認
  - 重要なフローのみ残す（認証、目標作成、プロフィール設定）
  - `MandalaList.integration.test.tsx` を削除（ユニットテストで十分）
  - _要件: 2.3_

- [x] 3.2 統合テストの最適化
  - 残す統合テストのテストケースを最小限に削減
  - 不要なテストケースを削除
  - _要件: 2.3_

- [x] 4. Vitest設定の最適化

- [x] 4.1 vitest.config.ts の更新
  - タイムアウト設定を短縮（testTimeout: 3000, hookTimeout: 2000, teardownTimeout: 1000）
  - 並列実行数を削減（maxForks: 2, maxConcurrency: 4）
  - テスト分離を無効化（isolate: false）
  - レポーターを最小化（reporters: ['dot']）
  - カバレッジをデフォルトで無効化（coverage.enabled: false）
  - カバレッジレポーターをJSON形式のみに変更（reporter: ['json']）
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4.2 vitest.integration.config.ts の削除
  - 統合テスト用の別設定ファイルを削除
  - 統合テストも同じ設定で実行
  - _要件: 3.1_

- [x] 5. package.json スクリプトの簡素化

- [x] 5.1 不要なスクリプトの削除
  - `test:performance*` スクリプトを削除
  - `test:accessibility*` スクリプトを削除
  - `quality-check*` スクリプトを削除
  - `usability-test*` スクリプトを削除
  - `integration-test*` スクリプトを削除
  - `format-and-lint*` スクリプトを削除
  - `final-quality-check*` スクリプトを削除
  - _要件: 4.2_

- [x] 5.2 テストスクリプトの最適化
  - `test` スクリプトを更新（`vitest run --reporter=dot --no-coverage --isolate=false`）
  - `test:unit` スクリプトを更新（統合テスト除外）
  - `test:integration` スクリプトを更新（統合テストのみ実行）
  - `test:coverage` スクリプトを更新（JSON形式のみ）
  - `test:ci` スクリプトを追加（全テスト実行）
  - _要件: 4.2_

- [x] 6. tools/scripts の整理

- [x] 6.1 test-with-timeout.sh の簡素化
  - 不要な機能を削除
  - 基本的なタイムアウト管理のみ残す
  - quietモードを削除
  - _要件: 4.3, 4.4, 4.5_

- [x] 6.2 README.md の作成
  - `tools/scripts/README.md` を作成
  - スクリプトの使用方法を記載
  - _要件: 4.3_

- [x] 7. E2Eテストの最小化

- [x] 7.1 E2Eテストの整理
  - 重要なフローのみ残す（認証、目標作成、マンダラ編集）
  - 不要なE2Eテストを削除
  - _要件: 2.3_

- [x] 7.2 Playwright設定の最適化
  - タイムアウトを30秒に設定
  - CI では1並列に設定
  - レポーターを最小化（dot）
  - トレースとスクリーンショットは失敗時のみ
  - Chromium のみテスト（Firefox, Safari を削除）
  - _要件: 7.1, 7.2, 7.3_

- [x] 8. ステアリングファイルの更新

- [x] 8.1 9-test-guide.md の更新
  - パフォーマンステストの記載を削除
  - アクセシビリティテストの記載を削除
  - 新しいテスト戦略を反映
  - テスト実行時間の目標を更新
  - カバレッジレポート形式を更新（JSON形式のみ）
  - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. ドキュメントの更新

- [x] 9.1 README.md の更新
  - テスト実行方法を更新
  - 削除されたテストについて記載
  - 新しいテストコマンドを記載
  - _要件: 6.1, 6.2, 6.3_

- [x] 9.2 CONTRIBUTING.md の更新
  - テスト戦略を更新
  - テスト作成ガイドラインを更新
  - カバレッジ目標を更新
  - _要件: 6.1, 6.2, 6.3_

- [x] 10. CI/CD設定の更新

- [x] 10.1 GitHub Actions ワークフローの更新
  - タイムアウト設定を追加（全体で10分）
  - 各ステップにタイムアウトを設定
  - カバレッジアップロードを更新（JSON形式）
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5_

- [-] 11. 動作確認

- [x] 11.1 ローカルでのテスト実行確認
  - `pnpm --filter @goal-mandala/frontend test` を実行
  - 実行時間が60秒以内であることを確認
  - すべてのテストが成功することを確認
  - _要件: 1.2_

- [x] 11.2 統合テストの実行確認
  - `pnpm --filter @goal-mandala/frontend test:integration` を実行
  - 実行時間が30秒以内であることを確認
  - すべてのテストが成功することを確認
  - _要件: 1.3_

- [x] 11.3 E2Eテストの実行確認
  - `pnpm --filter @goal-mandala/frontend test:e2e` を実行
  - 実行時間が120秒以内であることを確認
  - すべてのテストが成功することを確認
  - _要件: 1.4_

- [x] 11.4 カバレッジ生成の確認
  - `pnpm --filter @goal-mandala/frontend test:coverage` を実行
  - JSON形式のレポートが生成されることを確認
  - カバレッジが80%以上であることを確認
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11.5 CI/CDでのテスト実行確認
  - GitHub Actions でテストを実行
  - 全体で10分以内に完了することを確認
  - すべてのテストが成功することを確認
  - _要件: 1.1, 1.5_

- [x] 12. WBSの更新

- [x] 12.1 4-wbs.md の更新
  - 2.4.9タスクの進捗を反映
  - テストパフォーマンス改善の完了を記載
  - 新しいテスト戦略を反映
  - _要件: すべて_
