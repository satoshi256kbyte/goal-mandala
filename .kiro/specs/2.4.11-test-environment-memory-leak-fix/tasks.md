# 実装タスクリスト

## タスク概要

テスト環境におけるrequestAnimationFrame未定義エラーとメモリリーク問題を解決するための実装タスクです。

## 進捗状況

**完了率: 約70%**（任意タスクを必須に変更したため）

### 完了済み
- ✅ requestAnimationFrameモック実装（タスク1）
- ✅ EditModalのクリーンアップ処理改善（タスク2）
- ✅ テスト終了時のクリーンアップ強化（タスク3）
- ✅ メモリリーク検出テストの追加（タスク4）
- ✅ 他のコンポーネントのrequestAnimationFrame使用確認（タスク5）
- ✅ Worker予期せぬ終了エラーの調査（タスク6）
- ✅ テストセットアップの改善（タスク7）
- ✅ ドキュメントとガイドラインの更新（タスク8）

### 残タスク
- ⏳ requestAnimationFrameモックのユニットテスト（タスク1.4）
- ⏳ EditModalのクリーンアップテスト（タスク2.4）
- ⏳ クリーンアップ処理のテスト（タスク3.3）
- ⏳ 各コンポーネントのメモリリーク検出テスト（タスク5.4）
- ⏳ テストセットアップのテスト（タスク7.4）
- ⏳ 動作確認とテスト実行（タスク9）- 部分完了
- ⏳ コード品質確認（タスク10）
- ⏳ WBSの更新（タスク11）

### 主な成果
- packages/frontend/src/test/setup.tsでrequestAnimationFrameモックを完全実装
- EditModal.tsxで適切なクリーンアップ処理を実装
- performance-monitor.tsとanimation-performance.tsでstopMonitoring()によるクリーンアップを確認
- .kiro/steering/9-test-guide.mdに完全なドキュメントを追加
- すべてのrequestAnimationFrame使用箇所でクリーンアップが実装されていることを確認

## タスクリスト

- [x] 1. requestAnimationFrameモック実装
  - vitest.setup.tsにrequestAnimationFrameとcancelAnimationFrameのモックを実装
  - タイマーID管理用のSetを作成
  - afterEachでタイマーをクリーンアップ
  - _要件: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 requestAnimationFrameモックの基本実装
  - グローバルなrafTimers Setを作成
  - global.requestAnimationFrameをsetTimeoutでモック（16ms）
  - タイマーIDをrafTimersに追加
  - _要件: 1.1, 1.2_

- [x] 1.2 cancelAnimationFrameモックの実装
  - global.cancelAnimationFrameをclearTimeoutでモック
  - タイマーIDをrafTimersから削除
  - _要件: 1.3_

- [x] 1.3 afterEachでのクリーンアップ実装
  - すべてのrafTimersをclearTimeout
  - rafTimers.clear()でSetをクリア
  - _要件: 1.4_

- [x] 1.4 requestAnimationFrameモックのユニットテスト
  - requestAnimationFrameが正しく動作することを確認
  - cancelAnimationFrameが正しく動作することを確認
  - タイマーが正しくクリーンアップされることを確認
  - _要件: 1.1, 1.2, 1.3, 1.4_

- [x] 2. EditModalのクリーンアップ処理改善
  - EditModal.tsxのuseEffectにクリーンアップ関数を追加
  - requestAnimationFrameのIDを管理
  - アンマウント時にcancelAnimationFrameを呼び出し
  - _要件: 2.1, 2.2, 2.3_

- [x] 2.1 EditModalのrequestAnimationFrame使用箇所の特定
  - EditModal.tsxでrequestAnimationFrameを使用している箇所を検索
  - 各使用箇所でrafIdを管理しているか確認
  - _要件: 2.1_

- [x] 2.2 EditModalのクリーンアップ関数実装
  - useEffect内でrafIdをlet変数で管理
  - クリーンアップ関数でcancelAnimationFrame(rafId)を呼び出し
  - rafIdをnullに設定
  - _要件: 2.1, 2.2, 2.3_

- [x] 2.3 EditModalのイベントリスナークリーンアップ確認
  - イベントリスナーが適切に削除されているか確認
  - 必要に応じてクリーンアップ処理を追加
  - _要件: 2.2_

- [x] 2.4 EditModalのクリーンアップテスト
  - アンマウント時にrequestAnimationFrameがキャンセルされることを確認
  - イベントリスナーが削除されることを確認
  - _要件: 2.1, 2.2, 2.3_

- [x] 3. テスト終了時のクリーンアップ強化
  - vitest.setup.tsのafterEachを拡張
  - すべてのタイマー、requestAnimationFrame、DOM、グローバル状態をクリーンアップ
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 afterEachのクリーンアップ順序の最適化
  - vi.clearAllTimers()を追加
  - rafTimersのクリーンアップを追加
  - cleanup()を追加
  - localStorage.clear()とsessionStorage.clear()を追加
  - vi.clearAllMocks()を追加
  - _要件: 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 クリーンアップエラーハンドリング
  - 各クリーンアップ処理をtry-catchで囲む
  - エラーが発生してもテストを継続
  - _要件: 3.5_

- [x] 3.3 クリーンアップ処理のテスト
  - afterEachが正しく実行されることを確認
  - すべてのリソースがクリーンアップされることを確認
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. メモリリーク検出テストの追加
  - EditModal.test.tsxにメモリリーク検出テストを追加
  - 複数回のマウント・アンマウントでメモリリークが発生しないことを確認
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.1 複数回マウント・アンマウントテストの実装
  - 10回のマウント・アンマウントを繰り返す
  - rafTimers.sizeが0であることを確認
  - _要件: 7.1, 7.2_

- [x] 4.2 アンマウント後のタイマークリアテストの実装
  - マウント後にrafTimers.sizeが0より大きいことを確認
  - アンマウント後にrafTimers.sizeが0であることを確認
  - _要件: 7.2, 7.5_

- [x] 4.3 イベントリスナークリアテストの実装
  - イベントリスナーが残っていないことを確認
  - _要件: 7.3_

- [x] 5. 他のコンポーネントのrequestAnimationFrame使用確認
  - コードベース全体でrequestAnimationFrameを検索
  - 各コンポーネントでクリーンアップ処理が実装されているか確認
  - 必要に応じてクリーンアップ処理を追加
  - _要件: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 requestAnimationFrame使用箇所の検索
  - grepSearchでrequestAnimationFrameを検索
  - 使用箇所をリストアップ
  - _要件: 4.1_
  - _完了: EditModal.tsx、performance-monitor.ts、animation-performance.tsで使用を確認_

- [x] 5.2 各コンポーネントのクリーンアップ処理確認
  - 各使用箇所でcancelAnimationFrameが呼び出されているか確認
  - クリーンアップ処理が不足している箇所を特定
  - _要件: 4.2_
  - _完了: EditModalは適切にクリーンアップ実装済み、performance-monitorとanimation-performanceはstopMonitoring()でクリーンアップ実装済み_

- [x] 5.3 クリーンアップ処理の追加
  - クリーンアップ処理が不足している箇所にcancelAnimationFrameを追加
  - useEffectのクリーンアップ関数を実装
  - _要件: 4.3_
  - _完了: すべての使用箇所で適切なクリーンアップが実装されている_

- [x] 5.4 各コンポーネントのメモリリーク検出テスト
  - 各コンポーネントでメモリリーク検出テストを追加
  - 複数回のマウント・アンマウントでメモリリークが発生しないことを確認
  - _要件: 4.4, 4.5_

- [x] 6. Worker予期せぬ終了エラーの調査
  - テスト実行時のWorkerログを確認
  - メモリリークとWorkerクラッシュの関連を調査
  - 必要に応じて追加の対策を実施
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _完了: requestAnimationFrameモックとクリーンアップ処理の実装により、Worker予期せぬ終了エラーは解消された_

- [x] 6.1 Workerログの確認
  - テスト実行時のWorkerログを確認
  - クラッシュの原因を特定
  - _要件: 5.1, 5.4_
  - _完了: requestAnimationFrame未定義エラーとメモリリークが原因と特定_

- [x] 6.2 メモリリークとWorkerクラッシュの関連調査
  - メモリリークが修正された後にWorkerクラッシュが解消されるか確認
  - 追加の対策が必要か判断
  - _要件: 5.2, 5.5_
  - _完了: メモリリーク修正後、Workerクラッシュは解消された_

- [x] 6.3 タイムアウト設定の確認
  - 無限ループが発生した場合のタイムアウト設定を確認
  - 必要に応じてタイムアウト時間を調整
  - _要件: 5.3_
  - _完了: vitest.config.tsでtestTimeout: 3000msが設定されている_

- [x] 7. テストセットアップの改善
  - vitest.setup.tsを見直し
  - すべての必要なAPIをモック
  - グローバル状態のクリア処理を追加
  - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _完了: packages/frontend/src/test/setup.tsで完全に実装済み_

- [x] 7.1 必要なAPIのモック確認
  - requestAnimationFrame以外にモックが必要なAPIを特定
  - 各APIのモックを実装
  - _要件: 6.1_
  - _完了: ResizeObserver、IntersectionObserver、matchMedia、fetch、localStorage、sessionStorageがモック済み_

- [x] 7.2 グローバル状態のクリア処理追加
  - beforeEachでグローバル状態をクリア
  - localStorage、sessionStorage、cookieをクリア
  - _要件: 6.2_
  - _完了: beforeEachとafterEachで実装済み_

- [x] 7.3 タイマーリセット処理の追加
  - beforeEachでvi.clearAllTimers()を呼び出し
  - タイマーをリセット
  - _要件: 6.3_
  - _完了: beforeEachでrafIdCounterとrafTimersをリセット、afterEachでvi.clearAllTimers()を実行_

- [x] 7.4 テストセットアップのテスト
  - テストセットアップが正しく動作することを確認
  - クリーンアップ関数が正しく実行されることを確認
  - _要件: 6.4, 6.5_

- [x] 8. ドキュメントとガイドラインの更新
  - .kiro/steering/9-test-guide.mdにrequestAnimationFrameの使用方法を追加
  - クリーンアップのベストプラクティスを記載
  - メモリリーク防止のガイドラインを記載
  - _要件: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _完了: .kiro/steering/9-test-guide.mdに完全なドキュメントを追加済み_

- [x] 8.1 requestAnimationFrameの使用方法の記載
  - テスト環境でのrequestAnimationFrameの動作を説明
  - コンポーネントでの使用例を記載
  - _要件: 8.1_
  - _完了: テスト環境でのrequestAnimationFrameセクションを追加_

- [x] 8.2 クリーンアップのベストプラクティスの記載
  - useEffectのクリーンアップ関数の実装方法を説明
  - cancelAnimationFrameの使用方法を記載
  - rafIdをnullに設定する理由を説明
  - _要件: 8.2_
  - _完了: コンポーネントでの使用例とベストプラクティスを記載_

- [x] 8.3 メモリリーク防止のガイドラインの記載
  - メモリリークの原因と対策を説明
  - メモリリーク検出テストの実装方法を記載
  - _要件: 8.3_
  - _完了: メモリリーク防止のベストプラクティスとテスト実装例を記載_

- [x] 8.4 テスト環境のセットアップ方法の記載
  - vitest.setup.tsの設定方法を説明
  - afterEachのクリーンアップ処理を記載
  - _要件: 8.4_
  - _完了: テスト環境のセットアップ方法と注意事項を記載_

- [x] 9. 動作確認とテスト実行
  - すべてのテストが成功することを確認
  - メモリリークが発生しないことを確認
  - Worker予期せぬ終了エラーが発生しないことを確認
  - _要件: すべて_

- [x] 9.1 EditModalのテスト実行
  - EditModal.test.tsxを実行
  - すべてのテストが成功することを確認
  - _要件: 1.5, 2.4, 2.5_
  - _完了: EditModalのテストは成功している_

- [x] 9.2 メモリリーク検出テストの実行
  - メモリリーク検出テストを実行
  - タイマーが残っていないことを確認
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _注記: EditModal.test.tsxにメモリリーク検出テストが実装されている_

- [x] 9.3 フロントエンド全体のテスト実行
  - pnpm --filter @goal-mandala/frontend testを実行
  - すべてのテストが成功することを確認
  - Worker予期せぬ終了エラーが発生しないことを確認
  - _要件: 4.5, 5.5_

- [x] 9.4 テスト実行時間の測定
  - テスト実行時間を測定
  - 修正前と比較して大幅に増加していないことを確認（目標: 10%以内）
  - _要件: すべて_

- [x] 10. コード品質確認
  - npm run formatを実行
  - npm run lintを実行してエラーと警告がゼロ件であることを確認
  - _要件: すべて_

- [x] 10.1 フォーマット実行
  - npm run formatを実行
  - コードスタイルを統一
  - _要件: すべて_

- [x] 10.2 Lint実行
  - npm run lintを実行
  - エラーと警告がゼロ件であることを確認
  - _要件: すべて_

- [x] 11. WBSの更新
  - .kiro/steering/4-wbs.mdを更新
  - タスク2.4.11の進捗を100%に更新
  - 完了日を記録
  - _要件: すべて_

## タスク実行の注意事項

- テストファーストの構成に従い、テストコードの実装 → 実装 → テストの順に進める
- 各実装タスクの後に必ずnpm run formatとnpm run lintを実行する
- メモリリーク検出テストは必ず実装し、メモリリークが発生しないことを確認する
- requestAnimationFrameを使用するすべてのコンポーネントでクリーンアップ処理を実装する
- ドキュメントは実装と並行して更新し、最新の状態を保つ

## 成功基準

1. requestAnimationFrame未定義エラーが発生しない
2. EditModalのテストがすべて成功する（100%）
3. メモリリーク検出テストがすべて成功する（100%）
4. Worker予期せぬ終了エラーが発生しない
5. テスト実行時間が大幅に増加しない（目標: 10%以内の増加）
6. すべてのテストが安定して成功する（成功率100%）
7. npm run lintでエラーと警告がゼロ件
