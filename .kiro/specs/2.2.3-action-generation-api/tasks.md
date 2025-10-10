# 実装タスクリスト

## 概要

このタスクリストは、アクション生成APIの実装手順を定義します。2.2.1で実装したBedrock Lambda関数と2.2.2で実装したサブ目標生成APIを基盤として、サブ目標からアクションを生成する機能を実装します。

## タスク一覧

- [x] 1. プロジェクト基盤とセットアップ
- [x] 1.1 型定義ファイルの作成
  - types/action-generation.types.tsを作成
  - ActionGenerationRequest、ActionGenerationResponse、ActionOutput、GenerationContext、GoalContext、ActionTypeインターフェースを定義
  - _要件: 1.1_
- [x] 1.2 バリデーションスキーマの定義
  - schemas/action-generation.schema.tsを作成
  - ActionGenerationRequestSchemaをZodで定義
  - QUALITY_CRITERIA、CLASSIFICATION_RULESの定数を定義
  - _要件: 2.1, 3.1, 4.1_
- [x] 1.3 エラークラスの定義
  - errors/action-generation.errors.tsを作成
  - ValidationError、QualityError、NotFoundError、ForbiddenError、DatabaseError、BedrockErrorクラスを定義
  - _要件: 7.1_
- [x] 1.4 テストセットアップ
  - 既存のJest設定を利用
  - テストデータベースの準備
  - _要件: 全要件_
- _要件: 1.1, 2.1, 3.1_

- [x] 2. ContextServiceの実装
- [x] 2.1 ContextServiceのテスト作成
  - services/__tests__/context.service.test.tsを作成
  - getGenerationContext()のテストケース作成
  - サブ目標が存在しない場合のテスト
  - 関連サブ目標取得のテスト
  - ユーザー情報取得のテスト
  - _要件: 2.1, 2.2_
- [x] 2.2 ContextServiceクラスの作成
  - services/context.service.tsファイル作成
  - IContextServiceインターフェースの実装
  - PrismaClientのインスタンス化
  - _要件: 2.1_
- [x] 2.3 getGenerationContextメソッドの実装
  - サブ目標情報の取得（include: goal）
  - 目標情報の取得
  - 関連サブ目標の取得（同じgoalIdで異なるposition）
  - ユーザー情報の取得
  - GenerationContextオブジェクトの構築
  - _要件: 2.2, 2.3, 2.4, 2.5_
- [x] 2.4 エラーハンドリングの実装
  - サブ目標が見つからない場合のNotFoundError
  - データベースエラーのハンドリング
  - _要件: 7.1_
- [x] 2.5 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. ActionTypeClassifierの実装
- [x] 3.1 ActionTypeClassifierのテスト作成
  - services/__tests__/action-type-classifier.service.test.tsを作成
  - classifyActionType()のテストケース作成
  - 習慣キーワードを含むアクションのテスト
  - 実行キーワードを含むアクションのテスト
  - キーワードがない場合のデフォルト判定テスト
  - _要件: 3.1, 3.2, 3.3_
- [x] 3.2 ActionTypeClassifierクラスの作成
  - services/action-type-classifier.service.tsファイル作成
  - IActionTypeClassifierインターフェースの実装
  - CLASSIFICATION_RULESのインポート
  - _要件: 3.1_
- [x] 3.3 classifyActionTypeメソッドの実装
  - containsHabitKeywords()の実装
  - containsExecutionKeywords()の実装
  - キーワードマッチングロジック
  - デフォルト値（EXECUTION）の設定
  - _要件: 3.2, 3.3, 3.4, 3.5_
- [x] 3.4 classifyActionsメソッドの実装
  - アクション配列のループ処理
  - 各アクションの種別判定
  - 判定結果の適用
  - _要件: 3.1_
- [x] 3.5 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. ActionQualityValidatorの実装
- [x] 4.1 ActionQualityValidatorのテスト作成
  - services/__tests__/action-quality-validator.service.test.tsを作成
  - validateQuality()のテストケース作成
  - 8個のアクション検証テスト
  - 文字数制限チェックのテスト
  - 重複検出のテスト
  - 類似度計算のテスト
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_
- [x] 4.2 ActionQualityValidatorクラスの作成
  - services/action-quality-validator.service.tsファイル作成
  - IActionQualityValidatorインターフェースの実装
  - QUALITY_CRITERIAのインポート
  - _要件: 5.1_
- [x] 4.3 アクション個数チェックの実装
  - checkCount()メソッド実装
  - 8個の検証
  - QualityErrorのスロー
  - _要件: 5.1_
- [x] 4.4 文字数制限チェックの実装
  - checkTitleLength()メソッド実装（50文字以内）
  - checkDescriptionLength()メソッド実装（100-200文字）
  - checkBackgroundLength()メソッド実装（100文字以内）
  - _要件: 5.2, 5.3, 5.4_
- [x] 4.5 重複チェックの実装
  - checkDuplicates()メソッド実装
  - タイトルの重複検出
  - 警告ログの記録
  - _要件: 4.1, 4.2_
- [x] 4.6 類似度計算の実装
  - calculateSimilarity()関数実装
  - Jaccard係数による類似度計算
  - 類似度閾値（0.8）を超える場合の警告
  - _要件: 4.3, 4.4_
- [x] 4.7 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 5. ActionDatabaseServiceの実装
- [x] 5.1 ActionDatabaseServiceのテスト作成
  - services/__tests__/action-database.service.test.tsを作成
  - deleteExistingActions()のテストケース作成
  - createActions()のテストケース作成
  - トランザクション処理のテスト
  - エラーハンドリングのテスト
  - _要件: 6.1, 6.2, 6.3_
- [x] 5.2 ActionDatabaseServiceクラスの作成
  - services/action-database.service.tsファイル作成
  - IActionDatabaseServiceインターフェースの実装
  - PrismaClientのインスタンス化
  - _要件: 6.1_
- [x] 5.3 deleteExistingActionsメソッドの実装
  - action.deleteMany()の実装
  - subGoalIdによるフィルタリング
  - _要件: 6.7_
- [x] 5.4 createActionsメソッドの実装
  - 8個のアクションの一括作成
  - position（0-7）の設定
  - type（EXECUTION/HABIT）の設定
  - progress初期値（0）の設定
  - _要件: 6.2, 6.4, 6.5, 6.6_
- [x] 5.5 トランザクション管理の実装
  - executeInTransaction()メソッド実装
  - Prisma.$transaction()の使用
  - エラー時のロールバック
  - _要件: 6.3_
- [x] 5.6 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [-] 6. BedrockServiceへのアクション生成機能追加
- [x] 6.1 BedrockServiceのテスト拡張
  - services/__tests__/bedrock.service.test.tsに追加
  - generateActions()のテストケース作成
  - プロンプト生成のテスト
  - レスポンス解析のテスト
  - _要件: 1.1, 1.2, 1.3_
- [x] 6.2 generateActionsメソッドの実装
  - services/bedrock.service.tsに追加
  - GenerationContextを受け取る
  - アクション生成用プロンプトの構築
  - Bedrock API呼び出し
  - レスポンスの解析
  - _要件: 1.1, 1.4, 1.5, 1.6_
- [x] 6.3 アクション生成用プロンプトテンプレートの作成
  - PromptTemplateManager.buildActionPrompt()の実装
  - システムメッセージの定義
  - ユーザーメッセージテンプレートの定義
  - コンテキスト情報の組み込み
  - 出力形式（JSON）の指定
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_
- [x] 6.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. ActionGenerationServiceの実装
- [x] 7.1 ActionGenerationServiceのテスト作成
  - services/__tests__/action-generation.service.test.tsを作成
  - generateAndSaveActions()のテストケース作成
  - 正常系のテスト
  - エラーハンドリングのテスト
  - トランザクション処理のテスト
  - _要件: 全要件_
- [x] 7.2 ActionGenerationServiceクラスの作成
  - services/action-generation.service.tsファイル作成
  - IActionGenerationServiceインターフェースの実装
  - 依存サービスのインジェクション（ContextService、BedrockService、ActionQualityValidator、ActionTypeClassifier、ActionDatabaseService）
  - _要件: 1.1_
- [x] 7.3 generateAndSaveActionsメソッドの実装
  - メインビジネスロジックの実装
  - トランザクション内での処理
  - エラーハンドリング
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
- [x] 7.4 コンテキスト取得の統合
  - ContextService.getGenerationContext()の呼び出し
  - サブ目標の存在確認
  - 認可チェック（userId確認）
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5, 9.2, 9.3_
- [x] 7.5 AI生成の統合
  - BedrockService.generateActions()の呼び出し
  - プロンプト生成とAI呼び出し
  - レスポンスの解析
  - _要件: 1.1, 1.4, 1.5, 1.6_
- [x] 7.6 品質検証の統合
  - ActionQualityValidator.validateQuality()の呼び出し
  - 品質エラーのハンドリング
  - 警告ログの記録
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
- [x] 7.7 アクション種別判定の統合
  - ActionTypeClassifier.classifyActions()の呼び出し
  - AIが判定していない場合のフォールバック
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
- [x] 7.8 データベース保存の統合
  - ActionDatabaseService.deleteExistingActions()の呼び出し（regenerate時）
  - ActionDatabaseService.createActions()の呼び出し
  - トランザクション管理
  - _要件: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
- [x] 7.9 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 全要件_

- [x] 8. Lambda Handlerの実装
- [x] 8.1 ActionGenerationHandlerのテスト作成
  - handlers/__tests__/action-generation.test.tsを作成
  - 正常系のテストケース作成
  - バリデーションエラーのテスト
  - 認証エラーのテスト
  - 認可エラーのテスト
  - NotFoundエラーのテスト
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.2, 9.1, 9.2, 9.3_
- [x] 8.2 ActionGenerationHandlerの作成
  - handlers/action-generation.tsファイル作成
  - Honoアプリケーションの設定
  - POSTエンドポイントの定義
  - _要件: 1.1_
- [x] 8.3 リクエスト検証の実装
  - リクエストボディの取得
  - ActionGenerationRequestSchemaによる検証
  - バリデーションエラーのハンドリング
  - _要件: 1.2, 7.1_
- [x] 8.4 認証・認可チェックの実装
  - authMiddlewareの適用
  - extractUserId()関数の実装
  - checkAuthorization()関数の実装（サブ目標所有者チェック）
  - _要件: 9.1, 9.2, 9.3_
- [x] 8.5 ActionGenerationServiceの呼び出し
  - ActionGenerationService.generateAndSaveActions()の呼び出し
  - 処理結果の取得
  - _要件: 1.1, 1.4, 1.5, 1.6_
- [x] 8.6 レスポンス整形の実装
  - formatResponse()関数の実装
  - 成功レスポンスの生成
  - メタデータの追加（goalContext含む）
  - _要件: 1.5, 1.6, 1.7_
- [x] 8.7 エラーハンドリングの実装
  - mapErrorToResponse()関数の実装
  - エラー種別ごとのHTTPステータスコード設定
  - エラーログの記録
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
- [x] 8.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.1, 9.2, 9.3_

- [x] 9. 監視とログの実装
- [x] 9.1 構造化ログ出力の実装
  - 既存のlogger（utils/logger.ts）を使用
  - logInfo()、logError()関数の実装
  - requestId、userId、subGoalId、処理時間の記録
  - _要件: 10.1, 10.2_
- [x] 9.2 処理時間計測の実装
  - 開始時刻と終了時刻の記録
  - 処理時間の計算とログ出力
  - _要件: 10.2_
- [x] 9.3 ログ出力のテスト
  - ログ出力の確認テスト
  - _要件: 10.1, 10.2_
- [x] 9.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
- _注記: CloudWatchカスタムメトリクス（10.3）、トークン使用量記録（10.4）は将来の拡張機能として延期_

- [x] 10. セキュリティ機能の実装
- [x] 10.1 認可チェック（サブ目標所有者確認）の実装
  - checkAuthorization()関数の実装
  - データベースからサブ目標と目標を取得して所有者チェック
  - ForbiddenErrorとNotFoundErrorのスロー
  - _要件: 9.2, 9.3_
- [x] 10.2 機密情報マスキングの実装
  - エラーログでの機密情報マスキング
  - スタックトレースの適切な処理
  - 既存のセキュリティユーティリティ関数の使用
  - _要件: 9.6_
- [x] 10.3 セキュリティテストの作成
  - 認可チェックのテスト
  - プロンプトインジェクション対策のテスト（ContextServiceで実施）
  - _要件: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
- [x] 10.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
- _注記: レート制限チェック（9.4）は将来の拡張機能として延期（API Gatewayのレート制限を使用）_

- [x] 11. CDKインフラの実装
- [x] 11.1 Lambda関数定義の作成
  - packages/infrastructure/src/stacks/内の既存スタックに追加
  - ActionGenerationFunction定義
  - メモリサイズ（1024MB）、タイムアウト（60秒）、同時実行数（10）の設定
  - _要件: 8.1, 8.2_
- [x] 11.2 API Gatewayエンドポイントの追加
  - POST /api/ai/generate/actionsエンドポイント追加
  - Lambda統合の設定
  - _要件: 1.1_
- [x] 11.3 Cognito Authorizerの設定
  - 既存のCognito Authorizerを使用
  - 認証タイプの設定
  - _要件: 9.1_
- [x] 11.4 IAM権限の設定
  - Bedrock呼び出し権限（既存のaiGenerationRoleを使用）
  - Secrets Manager読み取り権限（既存）
  - CloudWatch Logs書き込み権限（既存）
  - _要件: 9.1_
- [x] 11.5 CloudWatchアラームの設定
  - エラー率アラーム
  - 処理時間アラーム（閾値: 30秒）
  - SNS通知設定
  - _要件: 10.5, 10.6_
- [x] 11.6 環境変数の設定
  - DATABASE_URL
  - BEDROCK_MODEL_ID
  - LOG_LEVEL
  - _要件: 8.1_
- [x] 11.7 CDKスタックのテスト
  - cdk synthの実行確認
  - スタック定義の検証
  - _要件: 全要件_
- [x] 11.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 1.1, 8.1, 8.2, 9.1, 10.5, 10.6_

- [x] 12. エンドツーエンドテストの実装
- [x] 12.1 正常系テストケースの作成
  - サブ目標からアクション生成まで
  - 8個のアクション生成の確認
  - アクション種別（EXECUTION/HABIT）の確認
  - データベース保存の確認
  - _要件: 全要件_
- [x] 12.2 異常系テストケースの作成
  - バリデーションエラーのテスト
  - 品質エラーのテスト
  - データベースエラーのテスト
  - _要件: 7.1, 7.2, 7.3, 7.4_
- [x] 12.3 認証エラーテストの作成
  - 認証トークンなしのテスト
  - 無効なトークンのテスト
  - _要件: 9.1, 9.2_
- [x] 12.4 認可エラーテストの作成
  - 他人のサブ目標へのアクセステスト
  - 存在しないサブ目標へのアクセステスト
  - _要件: 9.2, 9.3_
- [x] 12.5 再生成機能のテスト
  - regenerate: trueでの既存アクション削除確認
  - 新規アクション生成の確認
  - _要件: 1.2, 6.7_
- [x] 12.6 テストカバレッジの確認（80%以上）
  - npm run test:coverageの実行
  - カバレッジレポートの確認
  - _要件: 全要件_
- [x] 12.7 レスポンス形式テストの作成
  - 成功レスポンスの形式確認
  - エラーレスポンスの形式確認
  - CORSヘッダーの確認
  - _要件: 1.5, 1.6, 1.7_
- _要件: 全要件_
- _完了: 全7サブタスク完了、E2Eテスト実装完了_

- [x] 13. ドキュメントの作成
- [x] 13.1 API仕様書の作成
  - packages/backend/docs/action-generation-api-specification.mdを作成
  - エンドポイント、リクエスト、レスポンスの詳細
  - サンプルコードの追加
  - アクション種別の説明
  - _要件: 全要件_
- [x] 13.2 エラーコード一覧の作成
  - エラーコードとメッセージの一覧
  - 対処方法の記載
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
- [x] 13.3 運用ガイドの作成
  - packages/backend/docs/action-generation-operations-guide.mdを作成
  - 監視項目、アラート対応手順
  - アクション種別判定の仕組み
  - _要件: 10.1, 10.2, 10.5, 10.6_
- [x] 13.4 トラブルシューティングガイドの作成
  - よくある問題と解決方法
  - ログの確認方法
  - 品質エラーの対処方法
  - _要件: 全要件_
- [x] 13.5 READMEの更新
  - 機能概要の追加
  - セットアップ手順の更新
  - アクション生成機能の説明
  - _要件: 全要件_
- _要件: 全要件_

- [x] 14. 最終検証とコード品質確認
- [x] 14.1 全テストの実行と成功確認
  - npm run testの実行
  - 全テストの成功確認
  - _要件: 全要件_
- [x] 14.2 テストカバレッジの確認（80%以上）
  - npm run test:coverageの実行
  - カバレッジレポートの確認
  - _要件: 全要件_
- [x] 14.3 ESLintエラー・警告のゼロ化
  - npm run lintの実行
  - エラー・警告の修正
  - _要件: 全要件_
- [x] 14.4 TypeScript型エラーのゼロ化
  - npm run type-checkの実行
  - 型エラーの修正
  - _要件: 全要件_
- [x] 14.5 セキュリティスキャンの実行
  - npm auditの実行
  - 脆弱性の確認と対応
  - _要件: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
- [x] 14.6 コードレビューの実施
  - コードの可読性確認
  - ベストプラクティスの確認
  - _要件: 全要件_
- [x] 14.7 最終的なnpm run formatとnpm run lintの実行
  - コード品質の最終確認
  - _要件: 全要件_
- _要件: 全要件_

## タスクの依存関係

```
1. プロジェクト基盤
   ↓
2. ContextService（コンテキスト取得）
   ↓
3. ActionTypeClassifier（種別判定）
   ↓
4. ActionQualityValidator（品質検証）
   ↓
5. ActionDatabaseService（データベース操作）
   ↓
6. BedrockServiceへのアクション生成機能追加
   ↓
7. ActionGenerationService（ビジネスロジック）
   ↓
8. Lambda Handler
   ↓
9. 監視とログ
   ↓
10. セキュリティ機能
   ↓
11. CDKインフラ
   ↓
12. E2Eテスト
   ↓
13. ドキュメント
   ↓
14. 最終検証
```

## 実装状況サマリー

### 完了済みタスク（12/14タスク、約86%完了）

- ✅ タスク1: プロジェクト基盤とセットアップ
- ✅ タスク2: ContextServiceの実装
- ✅ タスク3: ActionTypeClassifierの実装
- ✅ タスク4: ActionQualityValidatorの実装
- ✅ タスク5: ActionDatabaseServiceの実装
- ✅ タスク6: BedrockServiceへのアクション生成機能追加
- ✅ タスク7: ActionGenerationServiceの実装
- ✅ タスク8: Lambda Handlerの実装
- ✅ タスク9: 監視とログの実装
- ✅ タスク10: セキュリティ機能の実装
- ✅ タスク11: CDKインフラの実装
- ✅ タスク12: E2Eテストの実装

### 次に実装すべきタスク

- タスク13: ドキュメントの作成（未着手）
- タスク14: 最終検証とコード品質確認（未着手）

## 注意事項

- 各タスクは、必ず`npm run format`を実行した上で、`npm run lint`を通してエラーと警告がゼロ件にする作業を含めてください
- テストファーストの構成にしてください。テストコードの実装 → 実装 → テストの順にしてください
- 各タスク完了後は、必ずGitコミットを行ってください
- 統合テストは実際のデータベースを使用して実行してください
- E2Eテストは、ローカル環境（Docker Compose + SAM Local）で実行してください
- 既存のサブ目標生成API（2.2.2）の実装パターンを参考にしてください
- BedrockServiceは既存のクラスに機能追加する形で実装してください

## 推定工数

- タスク1: 0.5人日（プロジェクト基盤）
- タスク2: 1人日（ContextService）
- タスク3: 0.5人日（ActionTypeClassifier）
- タスク4: 1人日（ActionQualityValidator）
- タスク5: 1人日（ActionDatabaseService）
- タスク6: 1人日（BedrockServiceへのアクション生成機能追加）
- タスク7: 1.5人日（ActionGenerationService）
- タスク8: 1.5人日（Lambda Handler）
- タスク9: 0.5人日（監視とログ）
- タスク10: 0.5人日（セキュリティ機能）
- タスク11: 1人日（CDKインフラ）
- タスク12: 1.5人日（E2Eテスト）
- タスク13: 1人日（ドキュメント）
- タスク14: 1人日（最終検証）

__合計: 13人日__

## 成功基準

1. 全てのタスクが完了している
2. テストカバレッジが80%以上
3. 全てのテストが成功している
4. ESLintエラー・警告がゼロ
5. TypeScript型エラーがゼロ
6. API仕様書が整備されている
7. 運用ガイドが整備されている
8. アクション生成APIが正常に動作する
9. サブ目標からアクションが8個生成される
10. アクション種別（EXECUTION/HABIT）が正しく判定される
11. 生成されたアクションがデータベースに保存される
12. 目標全体のコンテキストが活用されている

## MVP完成後の拡張機能

以下の機能は、MVP完成後に実装します：

1. __CloudWatchカスタムメトリクス実装__（タスク9.3相当）
   - 成功/失敗カウント記録
   - 処理時間の記録
   - トークン使用量の記録
   - アクション種別の分布記録

2. __コスト監視実装__（タスク9.3相当）
   - トークン使用量の計算
   - コスト推定ロジック
   - 月次予算チェック機能
   - コストアラート設定

3. __レート制限チェック実装__（タスク10.4相当）
   - ユーザー単位のレート制限
   - DynamoDBまたはElastiCacheでのカウント管理

4. __機械学習ベースのアクション種別判定__
   - キーワードベースから機械学習モデルへの移行
   - ユーザーフィードバックによる学習

5. __アクション推定所要時間の自動算出__
   - アクションの内容から所要時間を推定
   - タスク生成時の参考情報として活用

6. __類似サブ目標からの学習機能__
   - 過去の類似サブ目標のアクションを参考にする
   - 生成品質の向上

7. __カスタムプロンプトテンプレート機能__
   - ユーザーがプロンプトをカスタマイズできる
   - 業種・職種に特化したテンプレート
