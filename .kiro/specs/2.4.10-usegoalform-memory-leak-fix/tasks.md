# 実装タスクリスト

## 概要

useGoalFormフックとそのテストのメモリリーク問題と無限ループ問題を根本解決し、スキップされているすべてのテストケースを実行可能にする。

## タスク一覧

- [x] 1. useGoalFormフックの基本構造改善
- [x] 2. useRefを使用した関数参照管理の実装
- [x] 3. 自動保存タイマーの改善
- [x] 4. 初期データ処理の改善
- [x] 5. useMemoとuseCallbackによる最適化
- [x] 6. リアルタイムバリデーションの改善
- [x] 7. useFieldValidationフックのテスト実装
- [x] 8. useFormSubmissionフックのテスト実装
- [x] 9. 自動保存テストの改善
- [x] 10. メモリリークとクリーンアップのテスト追加
- [x] 11. 統合テストの実行と検証
- [x] 12. ステアリングファイルへの学びの追加
- [x] 13. ドキュメントの更新
- [x] 14. 最終検証とコード品質確認

---

## タスク詳細

### 1. useGoalFormフックの基本構造改善

useGoalFormフックの基本構造を改善し、useRefを導入する準備を行う。

- [x] 1.1 useRefのインポートを追加
  - `useRef`をReactからインポート
  - 既存のインポート文を確認
  - _要件: 6.1_

- [x] 1.2 autoSaveTimerのstate管理をuseRefに変更
  - `const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);`を削除
  - `const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);`を追加
  - _要件: 2.1, 2.2, 4.1_

- [x] 1.3 既存のコードでautoSaveTimerを使用している箇所を特定
  - `setAutoSaveTimer`の使用箇所をリストアップ
  - `autoSaveTimer`の参照箇所をリストアップ
  - _要件: 2.1_

### 2. useRefを使用した関数参照管理の実装

onDraftSave関数の参照をuseRefで管理し、無限ループを防止する。

- [x] 2.1 onDraftSaveRefの作成
  - `const onDraftSaveRef = useRef(onDraftSave);`を追加
  - フックの先頭部分に配置
  - _要件: 6.1, 6.2_

- [x] 2.2 onDraftSaveRefの更新useEffectを追加
  - `useEffect(() => { onDraftSaveRef.current = onDraftSave; }, [onDraftSave]);`を追加
  - onDraftSaveが変更されたときにrefを更新
  - _要件: 6.3_

- [x] 2.3 saveDraft関数内でonDraftSaveRefを使用
  - `onDraftSave`の参照を`onDraftSaveRef.current`に変更
  - null チェックを追加
  - _要件: 6.2, 6.4_

- [x] 2.4 saveDraft関数の依存配列を最適化
  - 依存配列から`onDraftSave`を削除
  - `getValues`のみを依存配列に含める
  - _要件: 3.1, 3.5_

### 3. 自動保存タイマーの改善

自動保存タイマーをuseRefで管理し、メモリリークを防止する。

- [x] 3.1 自動保存useEffectの依存配列を最適化
  - 依存配列から`saveDraft`を削除
  - 依存配列から`onDraftSave`を削除
  - `[isDirty, enableAutoSave, autoSaveInterval, getValues]`のみを含める
  - _要件: 1.3, 1.4, 3.5_

- [x] 3.2 タイマー設定処理をautoSaveTimerRefを使用するように変更
  - `setAutoSaveTimer(timer)`を`autoSaveTimerRef.current = timer`に変更
  - `autoSaveTimer`の参照を`autoSaveTimerRef.current`に変更
  - _要件: 4.1, 4.2_

- [x] 3.3 タイマークリア処理をautoSaveTimerRefを使用するように変更
  - `clearTimeout(autoSaveTimer)`を`clearTimeout(autoSaveTimerRef.current)`に変更
  - `setAutoSaveTimer(null)`を`autoSaveTimerRef.current = null`に変更
  - _要件: 4.2, 4.3_

- [x] 3.4 自動保存処理内でonDraftSaveRefを使用
  - `onDraftSave`の参照を`onDraftSaveRef.current`に変更
  - null チェックを追加
  - _要件: 6.2_

- [x] 3.5 タイマー実行後のクリーンアップを追加
  - `finally`ブロックで`autoSaveTimerRef.current = null`を実行
  - エラーが発生してもタイマーをクリアする
  - _要件: 4.5, 8.2_

- [x] 3.6 クリーンアップ関数の改善
  - `return () => { if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; } }`を実装
  - アンマウント時に確実にタイマーをクリアする
  - _要件: 2.4, 4.4_

### 4. 初期データ処理の改善

初期データの変更検出を改善し、不必要な再実行を防ぐ。

- [x] 4.1 initialDataRefの作成
  - `const initialDataRef = useRef<string>('');`を追加
  - 初期データをJSON文字列で保持
  - _要件: 3.5_

- [x] 4.2 初期データ処理useEffectの改善
  - `JSON.stringify(initialData)`で現在の初期データを取得
  - `initialDataRef.current`と比較
  - 変更があった場合のみreset処理を実行
  - _要件: 1.3_

- [x] 4.3 initialDataRefの更新
  - reset処理後に`initialDataRef.current = currentInitialData`を実行
  - 次回の比較のために保存
  - _要件: 3.5_

### 5. useMemoとuseCallbackによる最適化

不必要な再計算と再作成を防ぐためにuseMemoとuseCallbackを使用する。

- [x] 5.1 hasUnsavedChangesをuseMemoで計算
  - `checkUnsavedChanges`の内部ロジックを`useMemo`に移動
  - `const hasUnsavedChanges = useMemo(() => { ... }, [lastSavedData, isDirty, getValues]);`を実装
  - _要件: 3.3, 3.4_

- [x] 5.2 checkUnsavedChanges関数をuseCallbackで最適化
  - `const checkUnsavedChanges = useCallback(() => hasUnsavedChanges, [hasUnsavedChanges]);`を実装
  - 単純にhasUnsavedChangesを返すだけの関数に変更
  - _要件: 3.2_

- [x] 5.3 formStateをuseMemoで計算
  - `const formState: FormState = useMemo(() => ({ ... }), [isValid, isDirty, isSubmitting, isValidating, errors, hasUnsavedChanges]);`を実装
  - 依存配列を最小限にする
  - _要件: 3.4_

- [x] 5.4 getFieldState関数の依存配列を確認
  - 既存のuseCallbackの依存配列が適切か確認
  - 不必要な依存があれば削除
  - _要件: 3.3_

- [x] 5.5 validateField関数の依存配列を確認
  - 既存のuseCallbackの依存配列が適切か確認
  - 不必要な依存があれば削除
  - _要件: 3.3_

- [x] 5.6 resetForm関数の依存配列を確認
  - 既存のuseCallbackの依存配列が適切か確認
  - 不必要な依存があれば削除
  - _要件: 3.3_

### 6. リアルタイムバリデーションの改善

リアルタイムバリデーションのサブスクリプション管理を改善する。

- [x] 6.1 リアルタイムバリデーションuseEffectの依存配列を確認
  - 現在の依存配列が適切か確認
  - `[enableRealtimeValidation, watch, trigger, form.formState.touchedFields]`が含まれているか確認
  - _要件: 7.1, 7.2_

- [x] 6.2 サブスクリプションのクリーンアップを確認
  - `return () => subscription.unsubscribe();`が実装されているか確認
  - アンマウント時に確実にサブスクリプションを解除
  - _要件: 2.3, 7.4_

- [x] 6.3 リアルタイムバリデーションが無効な場合の処理を確認
  - `if (!enableRealtimeValidation) { return; }`が実装されているか確認
  - 不必要なサブスクリプションを作成しない
  - _要件: 7.5_

### 7. useFieldValidationフックのテスト実装

スキップされているuseFieldValidationフックのテストを実装する。

- [x] 7.1 「有効な値でバリデーションが成功する」テストの実装
  - `it.skip`を`it`に変更
  - `renderHookWithProviders(() => useFieldValidation('title'))`でフックをレンダリング
  - `result.current.validateField('有効なタイトル')`を実行
  - `validationState.isValid`が`true`であることを確認
  - _要件: 5.1_

- [x] 7.2 「無効な値でバリデーションが失敗する」テストの実装
  - `it.skip`を`it`に変更
  - `result.current.validateField('a'.repeat(101))`を実行（100文字制限を超える）
  - `validationState.isValid`が`false`であることを確認
  - `validationState.error`が定義されていることを確認
  - _要件: 5.1_

- [x] 7.3 「バリデーション中の状態が正しく管理される」テストの実装
  - `it.skip`を`it`に変更
  - バリデーション開始前に`isValidating`が`false`であることを確認
  - バリデーション完了後に`isValidating`が`false`であることを確認
  - _要件: 5.1_

### 8. useFormSubmissionフックのテスト実装

スキップされているuseFormSubmissionフックのテストを実装する。

- [x] 8.1 「送信が成功する」テストの実装
  - `it.skip`を`it`に変更
  - `renderHookWithProviders(() => useFormSubmission())`でフックをレンダリング
  - `mockSubmitFn`を作成し、`result.current.submitForm(mockSubmitFn)`を実行
  - `submissionState.success`が`true`であることを確認
  - _要件: 5.1_

- [x] 8.2 「送信エラーが適切に処理される」テストの実装
  - `it.skip`を`it`に変更
  - エラーを返す`mockSubmitFn`を作成
  - `result.current.submitForm(mockSubmitFn)`が例外をスローすることを確認
  - `submissionState.error`が定義されていることを確認
  - _要件: 5.1_

- [x] 8.3 「送信中の状態が正しく管理される」テストの実装
  - `it.skip`を`it`に変更
  - 遅延を含む`mockSubmitFn`を作成
  - 送信完了後に`isSubmitting`が`false`であることを確認
  - `success`が`true`であることを確認
  - _要件: 5.1_

- [x] 8.4 「送信状態がリセットされる」テストの実装
  - `it.skip`を`it`に変更
  - `result.current.resetSubmissionState()`を実行
  - すべての状態がリセットされることを確認
  - _要件: 5.1_

### 9. 自動保存テストの改善

自動保存テストを改善し、メモリリークが発生しないことを確認する。

- [x] 9.1 「自動保存が有効な場合、指定間隔で保存される」テストの改善
  - テスト終了時に`unmount()`を呼び出していることを確認
  - アンマウント後にタイマーがクリアされていることを確認するアサーションを追加
  - `vi.advanceTimersByTime(5000)`を実行後、追加の呼び出しがないことを確認
  - _要件: 5.3, 10.1_

- [x] 9.2 「自動保存が無効な場合、保存されない」テストの改善
  - テスト終了時に`unmount()`を呼び出していることを確認
  - メモリリークが発生しないことを確認
  - _要件: 5.3_

- [x] 9.3 「コンポーネントがアンマウントされた際にタイマーがクリアされる」テストの追加
  - 新しいテストケースを追加
  - タイマーが実行される前にアンマウント
  - アンマウント後にタイマーが実行されないことを確認
  - _要件: 5.3, 10.2_

### 10. メモリリークとクリーンアップのテスト追加

メモリリークが発生しないことを確認するテストを追加する。

- [x] 10.1 「複数回のマウント・アンマウントでメモリリークが発生しない」テストの追加
  - 新しいテストケースを追加
  - フックを10回マウント・アンマウント
  - メモリリークが発生しないことを確認（タイマーが残っていないことを確認）
  - _要件: 2.1, 2.2, 2.4_

- [x] 10.2 「watchのサブスクリプションが適切に解除される」テストの追加
  - 新しいテストケースを追加
  - リアルタイムバリデーションを有効にしてフックをレンダリング
  - アンマウント後にサブスクリプションが解除されることを確認
  - _要件: 2.3_

- [x] 10.3 「エラー発生時にメモリリークが発生しない」テストの追加
  - 新しいテストケースを追加
  - 自動保存でエラーが発生する状況を作成
  - エラー発生後もタイマーがクリアされることを確認
  - _要件: 8.4_

### 11. 統合テストの実行と検証

すべてのテストを実行し、メモリリークと無限ループが発生しないことを確認する。

- [x] 11.1 ユニットテストの実行
  - `pnpm --filter @goal-mandala/frontend test useGoalForm.test.ts`を実行
  - すべてのテストが成功することを確認
  - スキップされているテストがないことを確認
  - _要件: 5.4_

- [x] 11.2 テスト実行時間の測定
  - テスト実行時間を測定
  - タイムアウトが発生しないことを確認
  - 無限ループが発生しないことを確認
  - _要件: 5.5_

- [x] 11.3 メモリリークの検証
  - テスト実行後にメモリが適切に解放されることを確認
  - タイマーが残っていないことを確認
  - サブスクリプションが残っていないことを確認
  - _要件: 2.4, 2.5_

- [x] 11.4 カバレッジの確認
  - テストカバレッジを確認
  - useGoalFormフックのカバレッジが80%以上であることを確認
  - _要件: 5.4_

- [x] 11.5 統合テストの実行
  - `pnpm --filter @goal-mandala/frontend test:integration`を実行
  - useGoalFormを使用するコンポーネントのテストが成功することを確認
  - _要件: 5.4_

### 12. ステアリングファイルへの学びの追加

今回の実装で得られた学びをステアリングファイルに追加する。

- [x] 12.1 React Hooksのベストプラクティスセクションの作成
  - `.kiro/steering/11-react-hooks-best-practices.md`を作成
  - useRefの使用方法とユースケースを記載
  - useEffectの依存配列の最適化方法を記載
  - _要件: すべて_

- [x] 12.2 メモリリーク防止のガイドラインを追加
  - タイマーのクリーンアップ方法を記載
  - サブスクリプションのクリーンアップ方法を記載
  - useRefとuseStateの使い分けを記載
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 12.3 無限ループ防止のガイドラインを追加
  - useEffectの依存配列の設定方法を記載
  - useCallbackとuseMemoの使用方法を記載
  - useRefを使用した関数参照の保持方法を記載
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 12.4 カスタムフックのテストベストプラクティスを追加
  - renderHookWithProvidersの使用方法を記載
  - タイマーを使用するフックのテスト方法を記載
  - メモリリークのテスト方法を記載
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12.5 useRefの使用例とアンチパターンを追加
  - useRefを使用すべき場面を記載
  - useRefを使用すべきでない場面を記載
  - 具体的なコード例を追加
  - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12.6 自動保存機能の実装パターンを追加
  - タイマーを使用した自動保存の実装方法を記載
  - エラーハンドリングの方法を記載
  - クリーンアップの方法を記載
  - _要件: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12.7 実装中に発見した新たな学びを追加
  - 実装中に発見した問題と解決方法を記載
  - 予期しない動作とその原因を記載
  - 今後の実装で注意すべき点を記載
  - _要件: すべて_

### 13. ドキュメントの更新

関連ドキュメントを更新する。

- [x] 13.1 useGoalFormフックのJSDocコメントを更新
  - useRefを使用していることを記載
  - メモリリーク対策について記載
  - 無限ループ対策について記載
  - _要件: すべて_

- [x] 13.2 README.mdの更新
  - useGoalFormフックの使用方法を更新
  - 注意事項を追加
  - _要件: すべて_

- [x] 13.3 CONTRIBUTING.mdの更新
  - カスタムフックの実装ガイドラインを追加
  - メモリリーク防止のチェックリストを追加
  - _要件: すべて_

### 14. 最終検証とコード品質確認

最終的なコード品質を確認し、問題がないことを検証する。

- [x] 14.1 ESLintの実行
  - `pnpm --filter @goal-mandala/frontend lint`を実行
  - エラーと警告がゼロ件であることを確認
  - _要件: すべて_

- [x] 14.2 TypeScriptの型チェック
  - `pnpm --filter @goal-mandala/frontend type-check`を実行
  - 型エラーがないことを確認
  - _要件: すべて_

- [x] 14.3 Prettierの実行
  - `pnpm --filter @goal-mandala/frontend format`を実行
  - コードフォーマットが統一されていることを確認
  - _要件: すべて_

- [x] 14.4 全テストの実行
  - `pnpm --filter @goal-mandala/frontend test`を実行
  - すべてのテストが成功することを確認
  - テスト実行時間が60秒以内であることを確認
  - _要件: 5.4, 5.5_

- [x] 14.5 カバレッジレポートの生成
  - `pnpm --filter @goal-mandala/frontend test:coverage`を実行
  - useGoalFormフックのカバレッジが80%以上であることを確認
  - _要件: 5.4_

- [x] 14.6 コードレビューの実施
  - 変更内容を確認
  - ベストプラクティスに従っていることを確認
  - 不必要なコードがないことを確認
  - _要件: すべて_

- [x] 14.7 WBSの更新
  - `.kiro/steering/4-wbs.md`を更新
  - タスク2.4.10の進捗を100%に更新
  - 完了日を記載
  - _要件: すべて_

---

## 注記

- 各タスクは順番に実行することを推奨します
- タスク12（ステアリングファイルへの学びの追加）は、実装中に随時更新することを推奨します
- テストは各タスク完了後に実行し、問題がないことを確認してください
- メモリリークと無限ループの問題が完全に解決されるまで、次のタスクに進まないでください
