# 実装タスクリスト

## Phase 1: 基礎固め（50%目標）

### 1. テスト環境の整備

- [x] 1.1 テストユーティリティの拡充
  - renderWithProviders、renderHookWithProvidersの改善（既存実装を確認、十分に機能している）
  - テストファクトリーの作成（Goal、SubGoal、Action、Task、Reflection）✅
  - カスタムマッチャーの追加（9個のカスタムマッチャー）✅
  - テストユーティリティのテスト作成（32テスト、全て成功）✅
  - _Requirements: 7.1, 7.2, 7.3_
  - _完了日: 2025年12月14日_

- [x] 1.2 カバレッジ測定スクリプトの作成
  - カテゴリ別カバレッジ集計スクリプト（coverage-analysis.js）✅
  - カバレッジレポート生成スクリプト（coverage-report.js、HTML/Markdown）✅
  - カバレッジトレンド追跡スクリプト（coverage-trend.js）✅
  - package.jsonにスクリプト追加（coverage:analyze, coverage:report, coverage:trend, coverage:all）✅
  - _Requirements: 8.1, 8.2, 8.4_
  - _完了日: 2025年12月14日_

- [x] 1.3 CI/CD統合の準備
  - GitHub Actionsワークフローの更新（test.yml）✅
  - カバレッジレポートのアップロード設定（codecov + artifacts）✅
  - カバレッジ閾値チェックの追加（警告モード）✅
  - カバレッジ分析とレポート生成の統合✅
  - GitHub Actionsサマリーへのレポート表示✅
  - カバレッジトレンド追跡（mainブランチのみ）✅
  - _Requirements: 6.4_
  - _完了日: 2025年12月15日_

### 2. Hooksのテスト追加（目標40%）

- [x] 2.1 useGoalFormのテスト拡充
  - 初期化テスト（10テスト）✅
  - バリデーションテスト（13テスト）✅
  - 自動保存テスト（8テスト）✅
  - エラーハンドリングテスト（3テスト）✅
  - フォーム操作テスト（7テスト）✅
  - クリーンアップテスト（4テスト）✅
  - エッジケーステスト（7テスト）✅
  - **合計**: 50テスト（全て成功、100%成功率）
  - **カバレッジ**: Statements 75.93% (328/432), Branches 92.98% (53/57), Functions 33.33% (1/3)
  - **実行時間**: 496ms
  - _Requirements: 2.1, 2.2, 2.3_
  - _完了日: 2025年12月15日_

- [ ] 2.2 useAuthのテスト拡充
  - ログインテスト
  - ログアウトテスト
  - トークン管理テスト
  - セッション管理テスト
  - _Requirements: 2.1, 2.2_

- [ ] 2.3 React Queryフックのテスト追加
  - useGoals、useGoal、useCreateGoal、useUpdateGoal、useDeleteGoal
  - useReflections、useReflection、useCreateReflection、useUpdateReflection
  - useTasks、useTask、useUpdateTask
  - エラーハンドリング、リトライロジック、キャッシュ戦略
  - _Requirements: 2.1, 2.2_

- [ ] 2.4 その他カスタムフックのテスト追加
  - useDebounce、useThrottle、useLocalStorage、useSessionStorage
  - useMediaQuery、useOnClickOutside、useKeyPress
  - 各フックの基本機能とエッジケース
  - _Requirements: 2.1, 2.2_

- [ ] 2.5 Hooksのプロパティベーステスト
  - **Property 4: Hooksカバレッジ目標の達成**
  - **Validates: Requirements 2.1**

### 3. Pagesのテスト追加（目標40%）

- [ ] 3.1 認証ページのテスト追加
  - LoginPage、SignupPage、PasswordResetPage
  - フォーム入力、バリデーション、送信
  - エラーハンドリング、ナビゲーション
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3.2 マンダラチャート関連ページのテスト追加
  - GoalInputPage、SubGoalEditPage、ActionEditPage
  - フォーム入力、AI生成待機、確認・修正
  - エラーハンドリング、ナビゲーション
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3.3 タスク管理ページのテスト追加
  - TaskListPage、TaskDetailPage
  - タスク一覧表示、フィルター、検索
  - タスク詳細表示、状態更新
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3.4 振り返りページのテスト追加
  - ReflectionListPage、ReflectionCreatePage、ReflectionEditPage
  - 振り返り一覧表示、作成、編集
  - アクション進捗参照、保存
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3.5 Pagesのプロパティベーステスト
  - **Property 5: Pagesカバレッジ目標の達成**
  - **Validates: Requirements 3.1**

### 4. Servicesのテスト追加（目標50%）

- [ ] 4.1 APIクライアントのテスト追加
  - goalApi、reflectionApi、taskApi
  - CRUD操作、エラーハンドリング、リトライロジック
  - 認証ヘッダー、レスポンスパース
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4.2 バリデーションサービスのテスト追加
  - goalFormSchema、reflectionFormSchema、taskFormSchema
  - 正常系、異常系、エッジケース
  - エラーメッセージの確認
  - _Requirements: 4.1, 4.4_

- [ ] 4.3 ユーティリティサービスのテスト追加
  - dateUtils、stringUtils、numberUtils
  - 各ユーティリティ関数の基本機能とエッジケース
  - _Requirements: 4.1, 4.4_

- [ ] 4.4 Servicesのプロパティベーステスト
  - **Property 6: Servicesカバレッジ目標の達成**
  - **Validates: Requirements 4.1**

### 5. Phase 1完了確認

- [ ] 5.1 カバレッジ測定
  - 全体カバレッジ50%以上の確認
  - カテゴリ別カバレッジの確認（Hooks 40%、Pages 40%、Services 50%）
  - カバレッジレポートの生成
  - _Requirements: 9.1_

- [ ] 5.2 Phase 1プロパティベーステスト
  - **Property 1: Phase 1カバレッジ目標の達成**
  - **Validates: Requirements 9.1**

- [ ] 5.3 テスト実行時間の確認
  - 全テスト120秒以内の確認
  - ユニットテスト60秒以内の確認
  - パフォーマンス最適化の実施
  - _Requirements: 6.1, 6.2_

- [ ] 5.4 テスト実行時間のプロパティベーステスト
  - **Property 10: テスト実行時間の制約**
  - **Property 11: ユニットテスト実行時間の制約**
  - **Validates: Requirements 6.1, 6.2**

- [ ] 5.5 Phase 1レビューと調整
  - カバレッジレポートのレビュー
  - 未カバー箇所の優先度評価
  - Phase 2計画の調整
  - _Requirements: 9.4_

## Phase 2: 拡充（65%目標）

### 6. Hooksのテスト拡充（目標60%）

- [ ] 6.1 残りのカスタムフックのテスト追加
  - useInfiniteScroll、usePagination、useSort、useFilter
  - 各フックの基本機能とエッジケース
  - _Requirements: 2.1, 2.2_

- [ ] 6.2 Hooksのエッジケーステスト追加
  - 境界値テスト、エラーケーステスト
  - メモリリークテスト、クリーンアップテスト
  - _Requirements: 2.1, 2.3_

- [ ] 6.3 Hooksのプロパティベーステスト（Phase 2）
  - **Property 4: Hooksカバレッジ目標の達成（60%）**
  - **Validates: Requirements 2.1**

### 7. Pagesのテスト拡充（目標60%）

- [ ] 7.1 残りのページのテスト追加
  - DashboardPage、ProfilePage、SettingsPage
  - 各ページの基本機能とナビゲーション
  - _Requirements: 3.1, 3.2_

- [ ] 7.2 Pagesのエッジケーステスト追加
  - ローディング状態、エラー状態
  - 空データ状態、大量データ状態
  - _Requirements: 3.1, 3.3_

- [ ] 7.3 Pagesのプロパティベーステスト（Phase 2）
  - **Property 5: Pagesカバレッジ目標の達成（60%）**
  - **Validates: Requirements 3.1**

### 8. Servicesのテスト拡充（目標70%）

- [ ] 8.1 残りのサービスのテスト追加
  - progressCalculationService、notificationService
  - 各サービスの基本機能とエッジケース
  - _Requirements: 4.1, 4.2_

- [ ] 8.2 Servicesのエッジケーステスト追加
  - 境界値テスト、エラーケーステスト
  - データ変換テスト、バリデーションテスト
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 8.3 Servicesのプロパティベーステスト（Phase 2）
  - **Property 6: Servicesカバレッジ目標の達成（70%）**
  - **Validates: Requirements 4.1**

### 9. Componentsのテスト追加（目標50%）

- [ ] 9.1 共通コンポーネントのテスト追加
  - Button、Input、Select、Checkbox、Radio
  - 各コンポーネントの基本機能とプロパティ
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9.2 フォームコンポーネントのテスト追加
  - GoalForm、SubGoalForm、ActionForm、TaskForm
  - フォーム入力、バリデーション、送信
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9.3 表示コンポーネントのテスト追加
  - MandalaChart、TaskCard、ProgressBar、ReflectionCard
  - データ表示、インタラクション
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9.4 Componentsのプロパティベーステスト（Phase 2）
  - **Property 7: Componentsカバレッジ目標の達成（50%）**
  - **Validates: Requirements 5.1**

### 10. Phase 2完了確認

- [ ] 10.1 カバレッジ測定
  - 全体カバレッジ65%以上の確認
  - カテゴリ別カバレッジの確認（Hooks 60%、Pages 60%、Services 70%、Components 50%）
  - カバレッジレポートの生成
  - _Requirements: 9.2_

- [ ] 10.2 Phase 2プロパティベーステスト
  - **Property 2: Phase 2カバレッジ目標の達成**
  - **Validates: Requirements 9.2**

- [ ] 10.3 Phase 2レビューと調整
  - カバレッジレポートのレビュー
  - 未カバー箇所の優先度評価
  - Phase 3計画の調整
  - _Requirements: 9.4_

## Phase 3: 完成（80%目標）

### 11. Hooksのテスト完成（目標80%）

- [ ] 11.1 残りのHooksテスト追加
  - 未カバーのフックのテスト追加
  - エッジケース、エラーケースの網羅
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 11.2 Hooksのプロパティベーステスト（Phase 3）
  - **Property 4: Hooksカバレッジ目標の達成（80%）**
  - **Validates: Requirements 2.1**

### 12. Pagesのテスト完成（目標80%）

- [ ] 12.1 残りのPagesテスト追加
  - 未カバーのページのテスト追加
  - エッジケース、エラーケースの網羅
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 12.2 Pagesのプロパティベーステスト（Phase 3）
  - **Property 5: Pagesカバレッジ目標の達成（80%）**
  - **Validates: Requirements 3.1**

### 13. Servicesのテスト完成（目標85%）

- [ ] 13.1 残りのServicesテスト追加
  - 未カバーのサービスのテスト追加
  - エッジケース、エラーケースの網羅
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 13.2 Servicesのプロパティベーステスト（Phase 3）
  - **Property 6: Servicesカバレッジ目標の達成（85%）**
  - **Validates: Requirements 4.1**

### 14. Componentsのテスト完成（目標75%）

- [ ] 14.1 残りのComponentsテスト追加
  - 未カバーのコンポーネントのテスト追加
  - エッジケース、エラーケースの網羅
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 14.2 アクセシビリティテストの追加
  - ARIA属性のテスト
  - キーボードナビゲーションのテスト
  - スクリーンリーダー対応のテスト
  - _Requirements: 5.4_

- [ ] 14.3 Componentsのプロパティベーステスト（Phase 3）
  - **Property 7: Componentsカバレッジ目標の達成（75%）**
  - **Validates: Requirements 5.1**

### 15. Phase 3完了確認

- [ ] 15.1 カバレッジ測定
  - 全体カバレッジ80%以上の確認
  - カテゴリ別カバレッジの確認（Hooks 80%、Pages 80%、Services 85%、Components 75%）
  - カバレッジレポートの生成
  - _Requirements: 9.3, 1.1, 1.4_

- [ ] 15.2 Phase 3プロパティベーステスト
  - **Property 3: Phase 3カバレッジ目標の達成**
  - **Property 8: 分岐カバレッジ目標の達成**
  - **Property 9: 関数カバレッジ目標の達成**
  - **Validates: Requirements 9.3, 1.1, 1.2, 1.3, 1.4**

- [ ] 15.3 レポート生成のプロパティベーステスト
  - **Property 12: HTMLレポート生成**
  - **Property 13: JSONレポート生成**
  - **Validates: Requirements 1.5, 8.1, 8.2**

- [ ] 15.4 最終レビュー
  - カバレッジレポートの最終レビュー
  - テスト品質の確認
  - ドキュメントの更新
  - _Requirements: 9.4_

## Phase 4: ドキュメント作成

### 16. ドキュメントの更新

- [ ] 16.1 テストガイドの更新
  - 新しいテストパターンの追加
  - ベストプラクティスの更新
  - よくある問題と解決方法の追加
  - _Requirements: 10.1, 10.3_

- [ ] 16.2 カバレッジ改善レポートの作成
  - Phase別の進捗レポート
  - カテゴリ別のカバレッジ推移
  - 実装で得られた学び
  - _Requirements: 10.2_

- [ ] 16.3 WBSの更新
  - Phase 4.5の完了状況を反映
  - 次のフェーズの計画を更新
  - _Requirements: 10.4_

- [ ] 16.4 ステアリングファイルの作成
  - カバレッジ改善のベストプラクティス
  - テスト実装のパターン
  - トラブルシューティング
  - _Requirements: 10.5_

## 注意事項

- 各Phaseの完了後にレビューを実施し、必要に応じて計画を調整する
- テストの品質を優先し、カバレッジ数値だけを追わない
- 既存のテストは維持し、新規テストを追加する
- テスト実行時間を監視し、120秒以内を維持する
- 全てのタスクは必須であり、包括的なテストカバレッジを目指す
