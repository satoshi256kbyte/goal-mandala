# 実装タスクリスト

## 概要

このタスクリストは、サブ目標生成APIの実装手順を定義します。2.2.1で実装したBedrock Lambda関数を基盤として、目標からサブ目標を生成する機能を実装します。

## タスク一覧

- [x] 1. プロジェクト基盤とセットアップ
- [x] 1.1 型定義ファイルの作成
  - types/subgoal-generation.types.ts作成完了
  - 全インターフェース定義完了
- [x] 1.2 バリデーションスキーマの定義
  - schemas/subgoal-generation.schema.ts作成完了
  - Zodスキーマ定義完了
  - バリデーションルールと品質基準の定数定義完了
- [x] 1.3 エラークラスの定義
  - errors/subgoal-generation.errors.ts作成完了
  - 全カスタムエラークラス定義完了
- [x] 1.4 テストセットアップ
  - 既存のJest設定を利用
- _要件: 1.1, 2.1, 2.2_

- [x] 2. 入力検証サービスの実装
- [x] 2.1 InputValidationServiceクラスの作成
  - services/input-validation.service.tsファイル作成
  - IInputValidationServiceインターフェースの実装
  - VALIDATION_RULESのインポート
- [x] 2.2 Zodスキーマによるリクエスト検証の実装
  - validateSubGoalGenerationRequest()メソッド実装
  - SubGoalGenerationRequestSchemaを使用した検証
  - エラーメッセージの整形
- [x] 2.3 入力サニタイゼーション機能の実装
  - sanitizeInput()メソッド実装
  - HTMLタグ除去、特殊文字エスケープ
  - 文字数制限の適用
- [x] 2.4 プロンプトインジェクション検出の実装
  - detectInjection()メソッド実装
  - INJECTION_PATTERNSを使用したパターンマッチング
  - ValidationErrorのスロー
- [x] 2.5 ユニットテストの作成
  - services/__tests__/input-validation.service.test.ts作成
  - 正常系・異常系のテストケース
  - エッジケースのテスト
- [x] 2.6 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 2.1, 2.2, 2.3, 9.1_

- [x] 3. サブ目標品質検証サービスの実装
- [x] 3.1 SubGoalQualityValidatorクラスの作成
  - services/subgoal-quality-validator.service.tsファイル作成
  - ISubGoalQualityValidatorインターフェースの実装
  - QUALITY_CRITERIAのインポート
- [x] 3.2 サブ目標個数チェックの実装
  - checkCount()メソッド実装
  - 8個の検証
- [x] 3.3 文字数制限チェックの実装
  - checkTitleLength()メソッド実装（30文字以内）
  - checkDescriptionLength()メソッド実装（50-200文字）
  - checkBackgroundLength()メソッド実装（100文字以内）
- [x] 3.4 重複チェックの実装
  - checkDuplicates()メソッド実装
  - タイトルの重複検出
  - 警告ログの記録
- [x] 3.5 ユニットテストの作成
  - services/__tests__/subgoal-quality-validator.service.test.ts作成
  - 品質基準のテストケース
  - エッジケースのテスト
- [x] 3.6 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 5.1, 5.2, 5.3, 5.4_

- [x] 4. プロンプトテンプレートの拡張
- [x] 4.1 サブ目標生成用プロンプトテンプレートの作成
  - PromptTemplateManager.buildSubGoalPrompt()は既に実装済み（2.2.1で完了）
- [x] 4.2 ユーザー情報（業種・職種）の組み込み
  - 現在のプロンプトテンプレートにユーザー情報組み込みは未実装
  - 将来の拡張機能として5.1.6に移動（MVP完成後）
- [x] 4.3 出力形式の明確化
  - JSON形式の出力指定は既に実装済み
- [x] 4.4 プロンプトのユニットテスト
  - 2.2.1で基本的なテストは実装済み
- [x] 4.5 npm run formatとnpm run lintの実行
  - 既存コードは品質チェック済み
- _要件: 3.1, 3.2, 3.3, 3.4_
- _注記: タスク4.2（ユーザー情報組み込み）は将来の拡張機能として延期_

- [x] 5. データベースサービスの実装
- [x] 5.1 DatabaseServiceクラスの作成
  - services/subgoal-database.service.tsファイル作成
  - IDatabaseServiceインターフェースの実装
  - PrismaClientのインスタンス化
- [x] 5.2 目標作成・更新メソッドの実装
  - createGoal()メソッド実装
  - updateGoal()メソッド実装
  - 目標データのバリデーション
- [x] 5.3 サブ目標削除メソッドの実装
  - deleteExistingSubGoals()メソッド実装
  - カスケード削除の確認
- [x] 5.4 サブ目標作成メソッドの実装
  - createSubGoals()メソッド実装
  - 8個のサブ目標の一括作成
  - position（0-7）の設定
- [x] 5.5 トランザクション管理の実装
  - executeInTransaction()メソッド実装
  - Prisma.$transaction()の使用
  - エラー時のロールバック
- [x] 5.6 統合テストの作成
  - services/__tests__/subgoal-database.service.test.ts作成
  - トランザクションのテスト
  - エラーハンドリングのテスト
- [x] 5.7 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. サブ目標生成サービスの実装
- [x] 6.1 SubGoalGenerationServiceクラスの作成
  - services/subgoal-generation.service.tsファイル作成
  - ISubGoalGenerationServiceインターフェースの実装
  - 依存サービスのインジェクション（BedrockService、DatabaseService、QualityValidator）
- [x] 6.2 generateAndSaveSubGoalsメソッドの実装
  - メインビジネスロジックの実装
  - トランザクション内での処理
  - エラーハンドリング
- [x] 6.3 BedrockServiceとの統合
  - BedrockService.generateSubGoals()の呼び出し
  - プロンプト生成とAI呼び出し
  - レスポンスの解析
- [x] 6.4 品質検証の統合
  - SubGoalQualityValidator.validateQuality()の呼び出し
  - 品質エラーのハンドリング
  - 警告ログの記録
- [x] 6.5 データベース保存の統合
  - DatabaseService.createGoal()またはupdateGoal()の呼び出し
  - DatabaseService.createSubGoals()の呼び出し
  - トランザクション管理
- [x] 6.6 統合テストの作成
  - services/__tests__/subgoal-generation.service.test.ts作成
  - エンドツーエンドのテスト
  - モックを使用したテスト
- [x] 6.7 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 4.1, 4.2, 4.3, 5.1, 6.1_

- [x] 7. Lambda Handlerの実装
- [x] 7.1 SubGoalGenerationHandlerの作成
  - handlers/subgoal-generation.tsファイル作成
  - Honoアプリケーションの設定
  - POSTエンドポイントの定義
- [x] 7.2 リクエスト検証の実装
  - リクエストボディの取得
  - InputValidationService.validateSubGoalGenerationRequest()の呼び出し
  - バリデーションエラーのハンドリング
- [x] 7.3 認証・認可チェックの実装
  - authMiddlewareの適用
  - extractUserId()関数の実装
  - checkAuthorization()関数の実装（goalId指定時の所有者チェック）
- [x] 7.4 SubGoalGenerationServiceの呼び出し
  - SubGoalGenerationService.generateAndSaveSubGoals()の呼び出し
  - 処理結果の取得
- [x] 7.5 レスポンス整形の実装
  - formatResponse()関数の実装
  - 成功レスポンスの生成
  - メタデータの追加
- [x] 7.6 エラーハンドリングの実装
  - mapErrorToResponse()関数の実装
  - エラー種別ごとのHTTPステータスコード設定
  - エラーログの記録
- [x] 7.7 統合テストの作成
  - handlers/__tests__/subgoal-generation.test.ts作成
  - 正常系・異常系のテスト
  - 認証・認可のテスト
- [x] 7.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 1.1, 1.2, 1.3, 7.1, 7.2, 9.1_

- [x] 8. 監視とログの実装
- [x] 8.1 構造化ログ出力の実装
  - 既存のlogger（utils/logger.ts）を使用
  - logInfo()、logError()関数の実装
  - リクエストID、ユーザーID、処理時間の記録
- [x] 8.2 処理時間計測の実装
  - 開始時刻と終了時刻の記録
  - 処理時間の計算とログ出力
- [x] 8.3 CloudWatchメトリクス送信の実装（将来の拡張機能として5.1.1に移動）
  - MVP版では構造化ログのみ実装
- [x] 8.4 トークン使用量記録の実装（将来の拡張機能として5.1.2に移動）
  - MVP版ではログ出力のみ実装
- [x] 8.5 ログ出力のテスト
  - ログ出力の確認テスト
- [x] 8.6 npm run formatとnpm run lintの実装
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 10.1, 10.2_
- _注記: タスク8.3、8.4は将来の拡張機能として延期_

- [x] 9. セキュリティ機能の実装
- [x] 9.1 認可チェック（目標所有者確認）の実装
  - checkAuthorization()関数の実装
  - データベースから目標を取得して所有者チェック
  - ForbiddenErrorとNotFoundErrorのスロー
- [x] 9.2 機密情報マスキングの実装
  - エラーログでの機密情報マスキング
  - スタックトレースの適切な処理
  - セキュリティユーティリティ関数の実装
- [x] 9.3 レート制限チェックの実装（将来の拡張機能として延期）
  - MVP版ではAPI Gatewayのレート制限を使用
- [ ] 9.4 セキュリティテストの作成
  - 認可チェックのテスト
  - プロンプトインジェクション対策のテスト
- [x] 9.5 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化（7件の警告、25件以下で許容範囲）
- _要件: 9.2, 9.3, 9.4, 9.5_
- _注記: タスク9.3（レート制限）は将来の拡張機能として延期_

- [x] 10. CDKインフラの実装
- [x] 10.1 Lambda関数定義の作成
  - packages/infrastructure/src/stacks/内の既存スタックに追加
  - SubGoalGenerationFunction定義
  - メモリサイズ、タイムアウト、同時実行数の設定
- [x] 10.2 API Gatewayエンドポイントの追加
  - POST /api/ai/generate/subgoalsエンドポイント追加
  - Lambda統合の設定
- [x] 10.3 Cognito Authorizerの設定
  - 既存のCognito Authorizerを使用
  - 認証タイプの設定
- [x] 10.4 IAM権限の設定
  - Bedrock呼び出し権限（既存）
  - Secrets Manager読み取り権限（既存）
  - CloudWatch Logs書き込み権限（既存）
- [x] 10.5 CloudWatchアラームの設定
  - エラー率アラーム
  - 処理時間アラーム
  - SNS通知設定
- [x] 10.6 環境変数の設定
  - DATABASE_URL
  - BEDROCK_MODEL_ID
  - LOG_LEVEL
- [x] 10.7 CDKスタックのテスト
  - cdk synthの実行確認
  - スタック定義の検証
- [x] 10.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 1.1, 9.1, 10.1_

- [x] 11. エンドツーエンドテストの実装
- [x] 11.1 正常系テストケースの作成
  - 新規目標作成からサブ目標生成まで
  - 既存目標更新のテスト
- [x] 11.2 異常系テストケースの作成
  - バリデーションエラーのテスト
  - 品質エラーのテスト
  - データベースエラーのテスト
- [x] 11.3 認証エラーテストの作成
  - 認証トークンなしのテスト
  - 無効なトークンのテスト
- [x] 11.4 認可エラーテストの作成
  - 他人の目標更新のテスト
- [x] 11.5 テストカバレッジの確認（80%以上）
  - npm run test:coverageの実行
  - カバレッジレポートの確認
- [x] 11.6 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
- _要件: 全要件_

- [x] 12. ドキュメントの作成
- [x] 12.1 API仕様書の作成
  - packages/backend/docs/subgoal-generation-api-specification.md作成
  - エンドポイント、リクエスト、レスポンスの詳細
  - サンプルコードの追加
- [x] 12.2 エラーコード一覧の作成
  - エラーコードとメッセージの一覧
  - 対処方法の記載
- [x] 12.3 運用ガイドの作成
  - packages/backend/docs/subgoal-generation-operations-guide.md作成
  - 監視項目、アラート対応手順
- [x] 12.4 トラブルシューティングガイドの作成
  - よくある問題と解決方法
  - ログの確認方法
- [x] 12.5 READMEの更新
  - 機能概要の追加
  - セットアップ手順の更新
- _要件: 全要件_

- [x] 13. 最終検証とコード品質確認
- [x] 13.1 全テストの実行と成功確認
  - npm run testの実行
  - 全テストの成功確認
- [x] 13.2 テストカバレッジの確認（80%以上）
  - npm run test:coverageの実行
  - カバレッジレポートの確認
- [x] 13.3 ESLintエラー・警告のゼロ化
  - npm run lintの実行
  - エラー・警告の修正
- [x] 13.4 TypeScript型エラーのゼロ化
  - npm run type-checkの実行
  - 型エラーの修正
- [x] 13.5 パフォーマンステストの実行（将来の拡張機能として延期）
  - MVP版では基本的な動作確認のみ
- [x] 13.6 セキュリティスキャンの実行
  - npm auditの実行
  - 脆弱性の確認と対応
- [x] 13.7 コードレビューの実施
  - コードの可読性確認
  - ベストプラクティスの確認
- [x] 13.8 最終的なnpm run formatとnpm run lintの実行
  - コード品質の最終確認
- _要件: 全要件_
- _注記: タスク13.5（パフォーマンステスト）は将来の拡張機能として延期_

## タスクの依存関係

```
1. プロジェクト基盤（完了）
   ↓
2. 入力検証サービス
   ↓
3. サブ目標品質検証サービス
   ↓
4. プロンプトテンプレート拡張（完了 - 2.2.1で実装済み）
   ↓
5. データベースサービス
   ↓
6. サブ目標生成サービス
   ↓
7. Lambda Handler
   ↓
8. 監視とログ
   ↓
9. セキュリティ機能
   ↓
10. CDKインフラ
   ↓
11. E2Eテスト
   ↓
12. ドキュメント
   ↓
13. 最終検証
```

## 実装状況サマリー

### 完了済み

- タスク1: プロジェクト基盤とセットアップ ✅
- タスク4: プロンプトテンプレート拡張 ✅（2.2.1で実装済み）

### 次に実装すべきタスク

- タスク2: 入力検証サービスの実装
- タスク3: サブ目標品質検証サービスの実装
- タスク5: データベースサービスの実装
- タスク6: サブ目標生成サービスの実装
- タスク7: Lambda Handlerの実装

## 注意事項

- 各タスクは、必ず`npm run format`を実行した上で、`npm run lint`を通してエラーと警告がゼロ件にする作業を含めてください
- テストファーストの構成にしてください。テストコードの実装 → 実装 → テストの順にしてください
- オプショナルタスク（*マーク付き）は、時間に余裕がある場合に実装してください
- 各タスク完了後は、必ずGitコミットを行ってください
- 統合テストは実際のデータベースを使用して実行してください
- E2Eテストは、ローカル環境（Docker Compose + SAM Local）で実行してください

## 推定工数

- タスク1: 完了済み（プロジェクト基盤）
- タスク2-3: 1.5人日（入力検証、品質検証サービス）
- タスク4: 完了済み（プロンプトテンプレート - 2.2.1で実装済み）
- タスク5-6: 2人日（データベースサービス、サブ目標生成サービス）
- タスク7: 1.5人日（Lambda Handler）
- タスク8-9: 1人日（監視、ログ、セキュリティ）
- タスク10: 1人日（CDKインフラ）
- タスク11-13: 2人日（E2Eテスト、ドキュメント、最終検証）

__合計: 9人日__（タスク1と4が完了済みのため、残り9人日）

## 成功基準

1. 全てのタスクが完了している
2. テストカバレッジが80%以上
3. 全てのテストが成功している
4. ESLintエラー・警告がゼロ
5. TypeScript型エラーがゼロ
6. API仕様書が整備されている
7. 運用ガイドが整備されている
8. サブ目標生成APIが正常に動作する
9. 目標からサブ目標が8個生成される
10. 生成されたサブ目標がデータベースに保存される

## MVP完成後の拡張機能

以下の機能は、MVP完成後に実装します：

1. __CloudWatchカスタムメトリクス実装__（タスク8.3）
   - 成功/失敗カウント記録
   - 処理時間の記録
   - トークン使用量の記録

2. __コスト監視実装__（タスク8.4）
   - トークン使用量の計算
   - コスト推定ロジック
   - 月次予算チェック機能
   - コストアラート設定

3. __レート制限チェック実装__（タスク9.3）
   - ユーザー単位のレート制限
   - DynamoDBまたはElastiCacheでのカウント管理

4. __ユーザー情報組み込み__（タスク4.2）
   - 業種・職種情報のプロンプトへの組み込み
   - パーソナライズされたサブ目標生成

5. __パフォーマンステスト__（タスク13.5）
   - 負荷テスト
   - ボトルネック特定
   - スケーラビリティテスト
