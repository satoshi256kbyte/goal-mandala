# 実装タスクリスト

## 概要

このタスクリストは、タスク生成APIの実装手順を定義します。2.2.1で実装したBedrock Lambda関数、2.2.2で実装したサブ目標生成API、2.2.3で実装したアクション生成APIを基盤として、アクションから具体的なタスクを生成する機能を実装します。

## タスク一覧

- [x] 1. プロジェクト基盤とセットアップ
- [x] 1.1 型定義ファイルの作成
  - types/task-generation.types.tsを作成
  - TaskGenerationRequest、TaskGenerationResponse、TaskOutput、TaskGenerationContext、TaskPriorityインターフェースを定義
  - _要件: 1.1_
- [x] 1.2 バリデーションスキーマの定義
  - schemas/task-generation.schema.tsを作成
  - TaskGenerationRequestSchemaをZodで定義
  - QUALITY_CRITERIA、PRIORITY_RULESの定数を定義
  - _要件: 1.1, 3.1, 5.1_
- [x] 1.3 エラークラスの定義
  - errors/task-generation.errors.tsを作成
  - ValidationError、QualityError、NotFoundError、ForbiddenError、DatabaseError、BedrockErrorクラスを定義
  - _要件: 9.1_
- [x] 1.4 設定ファイルの作成
  - config/task-generation.config.tsを作成
  - タスク生成の設定値を定義（推定時間範囲、優先度閾値など）
  - _要件: 3.1, 5.1_
- [x] 1.5 テストセットアップ
  - 既存のJest設定を利用
  - テストデータベースの準備
  - _要件: 全要件_
- _要件: 1.1, 3.1, 5.1_

- [x] 2. TaskQualityValidatorの実装
- [x] 2.1 TaskQualityValidatorのテスト作成
  - services/__tests__/task-quality-validator.service.test.tsを作成
  - validateQuality()のテストケース作成
  - タスク個数検証テスト（最低1個以上）
  - 文字数制限チェックのテスト
  - 推定時間範囲チェックのテスト
  - 重複検出のテスト
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
- [x] 2.2 TaskQualityValidatorクラスの作成
  - services/task-quality-validator.service.tsファイル作成
  - ITaskQualityValidatorインターフェースの実装
  - QUALITY_CRITERIAのインポート
  - _要件: 7.1_
- [x] 2.3 タスク個数チェックの実装
  - checkCount()メソッド実装
  - 最低1個以上の検証
  - QualityErrorのスロー
  - _要件: 7.1_
- [x] 2.4 文字数制限チェックの実装
  - checkTitleLength()メソッド実装（50文字以内）
  - checkDescriptionLength()メソッド実装（200文字以内）
  - 警告ログの記録（20文字未満の説明）
  - _要件: 7.2, 7.3, 7.5_
- [x] 2.5 推定時間範囲チェックの実装
  - checkEstimatedTime()メソッド実装（15-120分）
  - 範囲外の場合のQualityError
  - _要件: 7.4_
- [x] 2.6 重複チェックの実装
  - checkDuplicates()メソッド実装
  - タイトルの重複検出
  - 警告ログの記録
  - _要件: 7.5_
- [x] 2.7 抽象度チェックの実装
  - checkAbstractness()メソッド実装
  - 抽象的すぎるタスクの検出
  - 警告ログの記録
  - _要件: 7.6_
- [x] 2.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 3. TaskDatabaseServiceの実装
- [x] 3.1 TaskDatabaseServiceのテスト作成
  - services/__tests__/task-database.service.test.tsを作成
  - deleteExistingTasks()のテストケース作成
  - createTasks()のテストケース作成
  - トランザクション処理のテスト
  - エラーハンドリングのテスト
  - _要件: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
- [x] 3.2 TaskDatabaseServiceクラスの作成
  - services/task-database.service.tsファイル作成
  - ITaskDatabaseServiceインターフェースの実装
  - PrismaClientのインスタンス化
  - _要件: 8.1_
- [x] 3.3 deleteExistingTasksメソッドの実装
  - task.deleteMany()の実装
  - actionIdによるフィルタリング
  - _要件: 8.7_
- [x] 3.4 createTasksメソッドの実装
  - 複数タスクの一括作成
  - type（EXECUTION/HABIT）の設定
  - status（NOT_STARTED）の初期値設定
  - estimatedMinutesの設定
  - _要件: 8.2, 8.4, 8.5, 8.6_
- [x] 3.5 トランザクション管理の実装
  - executeInTransaction()メソッド実装
  - Prisma.$transaction()の使用
  - エラー時のロールバック
  - _要件: 8.3_
- [x] 3.6 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 4. ContextServiceの拡張（タスク生成対応）
- [x] 4.1 ContextServiceのテスト拡張
  - services/__tests__/context.service.test.tsに追加
  - getTaskGenerationContext()のテストケース作成
  - アクションが存在しない場合のテスト
  - サブ目標・目標情報取得のテスト
  - ユーザー情報取得のテスト
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_
- [x] 4.2 getTaskGenerationContextメソッドの実装
  - アクション情報の取得（include: subGoal.goal）
  - サブ目標情報の取得
  - 目標情報の取得
  - ユーザー情報の取得
  - TaskGenerationContextオブジェクトの構築
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_
- [x] 4.3 エラーハンドリングの実装
  - アクションが見つからない場合のNotFoundError
  - データベースエラーのハンドリング
  - _要件: 9.1_
- [x] 4.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. BedrockServiceの拡張（タスク生成対応）
- [x] 5.1 BedrockServiceのテスト拡張
  - services/__tests__/bedrock.service.test.tsに追加
  - generateTasks()のテストケース作成
  - プロンプト生成のテスト
  - レスポンス解析のテスト
  - _要件: 1.1, 1.2, 1.3_
- [x] 5.2 generateTasksメソッドの実装
  - services/bedrock.service.tsに追加
  - TaskGenerationContextを受け取る
  - タスク生成用プロンプトの構築
  - Bedrock API呼び出し
  - レスポンスの解析
  - _要件: 1.1, 1.4, 1.5, 1.6_
- [x] 5.3 タスク生成用プロンプトテンプレートの作成
  - PromptTemplateManager.buildTaskPrompt()の実装
  - システムメッセージの定義
  - ユーザーメッセージテンプレートの定義
  - コンテキスト情報の組み込み（目標、サブ目標、アクション）
  - 出力形式（JSON）の指定
  - タスク粒度（30-60分）の指示
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_
- [x] 5.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. TaskGenerationServiceの実装
- [x] 6.1 TaskGenerationServiceのテスト作成
  - services/__tests__/task-generation.service.test.tsを作成
  - generateAndSaveTasks()のテストケース作成
  - 正常系のテスト
  - エラーハンドリングのテスト
  - トランザクション処理のテスト
  - _要件: 全要件_
- [x] 6.2 TaskGenerationServiceクラスの作成
  - services/task-generation.service.tsファイル作成
  - ITaskGenerationServiceインターフェースの実装
  - 依存サービスのインジェクション（ContextService、BedrockService、TaskQualityValidator、TaskDatabaseService）
  - _要件: 1.1_
- [x] 6.3 generateAndSaveTasksメソッドの実装
  - メインビジネスロジックの実装
  - トランザクション内での処理
  - エラーハンドリング
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
- [x] 6.4 コンテキスト取得の統合
  - ContextService.getTaskGenerationContext()の呼び出し
  - アクションの存在確認
  - 認可チェック（userId確認）
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5, 11.2, 11.3_
- [x] 6.5 AI生成の統合
  - BedrockService.generateTasks()の呼び出し
  - プロンプト生成とAI呼び出し
  - レスポンスの解析
  - _要件: 1.1, 1.4, 1.5, 1.6_
- [x] 6.6 品質検証の統合
  - TaskQualityValidator.validateQuality()の呼び出し
  - 品質エラーのハンドリング
  - 警告ログの記録
  - _要件: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
- [x] 6.7 タスク種別の継承実装
  - アクションのtypeをタスクに継承
  - EXECUTION/HABITの設定
  - _要件: 4.1, 4.2, 4.3, 4.4_
- [x] 6.8 優先度設定の実装
  - タスクの優先度判定ロジック
  - HIGH/MEDIUM/LOWの設定
  - デフォルト値（MEDIUM）の設定
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_
- [x] 6.9 依存関係管理の実装
  - タスク間の依存関係識別
  - 依存関係の記録
  - 循環依存の検出
  - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_
- [x] 6.10 データベース保存の統合
  - TaskDatabaseService.deleteExistingTasks()の呼び出し（regenerate時）
  - TaskDatabaseService.createTasks()の呼び出し
  - トランザクション管理
  - _要件: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
- [x] 6.11 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 全要件_

- [x] 7. Lambda Handlerの実装
- [x] 7.1 TaskGenerationHandlerのテスト作成
  - handlers/__tests__/task-generation.test.tsを作成
  - 正常系のテストケース作成
  - バリデーションエラーのテスト
  - 認証エラーのテスト
  - 認可エラーのテスト
  - NotFoundエラーのテスト
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 11.1, 11.2, 11.3_
- [x] 7.2 TaskGenerationHandlerの作成
  - handlers/task-generation.tsファイル作成
  - Honoアプリケーションの設定
  - POSTエンドポイントの定義
  - _要件: 1.1_
- [x] 7.3 リクエスト検証の実装
  - リクエストボディの取得
  - TaskGenerationRequestSchemaによる検証
  - バリデーションエラーのハンドリング
  - _要件: 1.2, 9.1_
- [x] 7.4 認証・認可チェックの実装
  - authMiddlewareの適用
  - extractUserId()関数の実装
  - checkAuthorization()関数の実装（アクション所有者チェック）
  - _要件: 11.1, 11.2, 11.3_
- [x] 7.5 TaskGenerationServiceの呼び出し
  - TaskGenerationService.generateAndSaveTasks()の呼び出し
  - 処理結果の取得
  - _要件: 1.1, 1.4, 1.5, 1.6_
- [x] 7.6 レスポンス整形の実装
  - formatResponse()関数の実装
  - 成功レスポンスの生成
  - メタデータの追加（actionContext含む）
  - _要件: 1.5, 1.6, 1.7_
- [x] 7.7 エラーハンドリングの実装
  - mapErrorToResponse()関数の実装
  - エラー種別ごとのHTTPステータスコード設定
  - エラーログの記録
  - _要件: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
- [x] 7.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.1, 11.2, 11.3_

- [x] 8. 監視とログの実装（入力検証サービスはスキップ）
- [x] 8.1 構造化ログ出力の実装
  - 既存のlogger（utils/logger.ts）を使用
  - logInfo()、logError()関数の実装
  - requestId、userId、actionId、処理時間の記録
  - _要件: 12.1, 12.2_
- [x] 8.2 処理時間計測の実装
  - 開始時刻と終了時刻の記録
  - 処理時間の計算とログ出力
  - _要件: 12.2_
- [x] 8.3 ログ出力のテスト
  - ログ出力の確認テスト
  - _要件: 12.1, 12.2_
- [x] 8.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 12.1, 12.2_
- _注記: CloudWatchカスタムメトリクス（12.3）、トークン使用量記録（12.4）は将来の拡張機能として延期_
- _注記: 入力検証サービスは既存のInputValidationServiceを活用するためスキップ_

- [x] 9. セキュリティ機能の実装
- [x] 9.1 認可チェック（アクション所有者確認）の実装
  - checkAuthorization()関数の実装
  - データベースからアクション、サブ目標、目標を取得して所有者チェック
  - ForbiddenErrorとNotFoundErrorのスロー
  - _要件: 11.2, 11.3_
- [x] 9.2 機密情報マスキングの実装
  - エラーログでの機密情報マスキング
  - スタックトレースの適切な処理
  - 既存のセキュリティユーティリティ関数の使用
  - _要件: 11.6_
- [x] 9.3 セキュリティテストの作成
  - 認可チェックのテスト
  - プロンプトインジェクション対策のテスト（ContextServiceで実施）
  - _要件: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
- [x] 9.4 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
- _注記: レート制限チェック（11.4）は将来の拡張機能として延期（API Gatewayのレート制限を使用）_

- [x] 10. CDKインフラの実装
- [x] 10.1 Lambda関数定義の作成
  - packages/infrastructure/src/stacks/内の既存スタックに追加
  - TaskGenerationFunction定義
  - メモリサイズ（1024MB）、タイムアウト（60秒）、同時実行数（10）の設定
  - _要件: 10.1, 10.2_
- [x] 10.2 API Gatewayエンドポイントの追加
  - POST /api/ai/generate/tasksエンドポイント追加
  - Lambda統合の設定
  - _要件: 1.1_
- [x] 10.3 Cognito Authorizerの設定
  - 既存のCognito Authorizerを使用
  - 認証タイプの設定
  - _要件: 11.1_
- [x] 10.4 IAM権限の設定
  - Bedrock呼び出し権限（既存のaiGenerationRoleを使用）
  - Secrets Manager読み取り権限（既存）
  - CloudWatch Logs書き込み権限（既存）
  - _要件: 11.1_
- [x] 10.5 CloudWatchアラームの設定
  - エラー率アラーム
  - 処理時間アラーム（閾値: 30秒）
  - SNS通知設定
  - _要件: 12.5, 12.6_
- [x] 10.6 環境変数の設定
  - DATABASE_URL
  - BEDROCK_MODEL_ID
  - LOG_LEVEL
  - _要件: 10.1_
- [x] 10.7 CDKスタックのテスト
  - cdk synthの実行確認
  - スタック定義の検証
  - _要件: 全要件_
- [x] 10.8 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 1.1, 10.1, 10.2, 11.1, 12.5, 12.6_

- [x] 11. エンドツーエンドテストの実装
- [x] 11.1 正常系テストケースの作成
  - アクションからタスク生成まで
  - 複数タスク生成の確認
  - タスク種別（EXECUTION/HABIT）の継承確認
  - 推定時間の設定確認
  - データベース保存の確認
  - _要件: 全要件_
- [x] 11.2 異常系テストケースの作成
  - バリデーションエラーのテスト
  - 品質エラーのテスト
  - データベースエラーのテスト
  - _要件: 9.1, 9.2, 9.3, 9.4_
- [x] 11.3 認証エラーテストの作成
  - 認証トークンなしのテスト
  - 無効なトークンのテスト
  - _要件: 11.1, 11.2_
- [x] 11.4 認可エラーテストの作成
  - 他人のアクションへのアクセステスト
  - 存在しないアクションへのアクセステスト
  - _要件: 11.2, 11.3_
- [x] 11.5 再生成機能のテスト
  - regenerate: trueでの既存タスク削除確認
  - 新規タスク生成の確認
  - _要件: 1.2, 8.7_
- [x] 11.6 タスク粒度のテスト
  - 推定時間が30-60分程度であることの確認
  - 大きなアクションが複数タスクに分割されることの確認
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_
- [x] 11.7 優先度設定のテスト
  - 優先度（HIGH/MEDIUM/LOW）が正しく設定されることの確認
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_
- [x] 11.8 依存関係のテスト
  - タスク間の依存関係が正しく記録されることの確認
  - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_
- [x] 11.9 テストカバレッジの確認（80%以上）
  - npm run test:coverageの実行
  - カバレッジレポートの確認
  - _要件: 全要件_
- [x] 11.10 レスポンス形式テストの作成
  - 成功レスポンスの形式確認
  - エラーレスポンスの形式確認
  - CORSヘッダーの確認
  - _要件: 1.5, 1.6, 1.7_
- _要件: 全要件_

- [x] 12. ドキュメントの作成
- [x] 12.1 API仕様書の作成
  - packages/backend/docs/task-generation-api-specification.mdを作成
  - エンドポイント、リクエスト、レスポンスの詳細
  - サンプルコードの追加
  - タスク粒度の説明
  - タスク種別の説明
  - 優先度の説明
  - 依存関係の説明
  - _要件: 全要件_
- [x] 12.2 エラーコード一覧の作成
  - エラーコードとメッセージの一覧
  - 対処方法の記載
  - _要件: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
- [x] 12.3 運用ガイドの作成
  - packages/backend/docs/task-generation-operations-guide.mdを作成
  - 監視項目、アラート対応手順
  - タスク粒度調整の仕組み
  - 優先度設定の仕組み
  - _要件: 12.1, 12.2, 12.5, 12.6_
- [x] 12.4 トラブルシューティングガイドの作成
  - よくある問題と解決方法
  - ログの確認方法
  - 品質エラーの対処方法
  - _要件: 全要件_
- [x] 12.5 READMEの更新
  - 機能概要の追加
  - セットアップ手順の更新
  - タスク生成機能の説明
  - _要件: 全要件_
- _要件: 全要件_

- [x] 13. パフォーマンス最適化
- [x] 13.1 データベースクエリの最適化
  - インデックスの確認と追加
  - N+1問題の解消
  - _要件: 10.1_
- [x] 13.2 プロンプトの最適化
  - 不要なトークンの削減
  - 効率的なプロンプト構造の設計
  - _要件: 10.6_
- [x] 13.3 並列処理の検討
  - 複数タスク生成時の並列化
  - _要件: 10.1_
- [x] 13.4 パフォーマンステストの実施
  - 負荷テスト
  - レスポンス時間の測定
  - _要件: 10.1, 10.2_
- [x] 13.5 npm run formatとnpm run lintの実行
  - コード品質チェック
  - エラー・警告のゼロ化
  - _要件: 全要件_
- _要件: 10.1, 10.2, 10.6_

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
  - _要件: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
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
2. TaskQualityValidator（品質検証）
   ↓
3. TaskDatabaseService（データベース操作）
   ↓
4. ContextServiceの拡張（コンテキスト取得）
   ↓
5. BedrockServiceの拡張（AI生成）
   ↓
6. TaskGenerationService（ビジネスロジック）
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
13. パフォーマンス最適化
   ↓
14. 最終検証
```

## 実装状況サマリー

### 完了済みタスク

- なし（未着手）

### 次に実装すべきタスク

- タスク1: プロジェクト基盤とセットアップ
- タスク2: TaskQualityValidatorの実装
- タスク3: TaskDatabaseServiceの実装
- タスク4: ContextServiceの拡張（タスク生成対応）
- タスク5: BedrockServiceの拡張（タスク生成対応）
- タスク6: TaskGenerationServiceの実装
- タスク7: Lambda Handlerの実装

## 注意事項

- 各タスクは、必ず`npm run format`を実行した上で、`npm run lint`を通してエラーと警告がゼロ件にする作業を含めてください
- テストファーストの構成にしてください。テストコードの実装 → 実装 → テストの順にしてください
- 各タスク完了後は、必ずGitコミットを行ってください
- 統合テストは実際のデータベースを使用して実行してください
- E2Eテストは、ローカル環境（Docker Compose + SAM Local）で実行してください
- 既存のサブ目標生成API（2.2.2）とアクション生成API（2.2.3）の実装パターンを参考にしてください
- BedrockServiceとContextServiceは既存のクラスに機能追加する形で実装してください
- 入力検証サービス（InputValidationService）は既存のものを活用してください

## 推定工数

- タスク1: 0.5人日（プロジェクト基盤）
- タスク2: 1人日（TaskQualityValidator）
- タスク3: 1人日（TaskDatabaseService）
- タスク4: 0.5人日（ContextServiceの拡張）
- タスク5: 1.5人日（BedrockServiceの拡張）
- タスク6: 2人日（TaskGenerationService）
- タスク7: 1.5人日（Lambda Handler）
- タスク8: 0.5人日（監視とログ）
- タスク9: 0.5人日（セキュリティ機能）
- タスク10: 1人日（CDKインフラ）
- タスク11: 2人日（E2Eテスト）
- タスク12: 1人日（ドキュメント）
- タスク13: 1人日（パフォーマンス最適化）
- タスク14: 1人日（最終検証）

__合計: 15人日__

## 成功基準

1. 全てのタスクが完了している
2. テストカバレッジが80%以上
3. 全てのテストが成功している
4. ESLintエラー・警告がゼロ
5. TypeScript型エラーがゼロ
6. API仕様書が整備されている
7. 運用ガイドが整備されている
8. タスク生成APIが正常に動作する
9. アクションから複数のタスクが生成される
10. 各タスクの推定時間が30-60分程度である
11. タスク種別（EXECUTION/HABIT）がアクションから継承される
12. タスクの優先度が適切に設定される
13. タスク間の依存関係が記録される
14. 生成されたタスクがデータベースに保存される

## MVP完成後の拡張機能

以下の機能は、MVP完成後に実装します：

1. __CloudWatchカスタムメトリクス実装__（タスク8相当）
   - 成功/失敗カウント記録
   - 処理時間の記録
   - トークン使用量の記録
   - タスク生成数の記録

2. __コスト監視実装__（タスク8相当）
   - トークン使用量の計算
   - コスト推定ロジック
   - 月次予算チェック機能
   - コストアラート設定

3. __レート制限チェック実装__（タスク9相当）
   - ユーザー単位のレート制限
   - DynamoDBまたはElastiCacheでのカウント管理

4. __機械学習ベースの推定時間算出__
   - タスク内容から推定時間を自動算出
   - ユーザーの実績データを学習

5. __タスク依存関係の自動検出強化__
   - より高度な依存関係分析
   - 循環依存の自動解消

6. __タスク優先度の動的調整__
   - 期限や進捗状況に応じた優先度の自動調整
   - ユーザーの作業パターンを学習

7. __カスタムプロンプトテンプレート機能__
   - ユーザーがプロンプトをカスタマイズできる
   - 業種・職種に特化したテンプレート

8. __タスク分割粒度の調整機能__
   - ユーザーの好みに応じた粒度調整
   - 30分、45分、60分などの選択肢

9. __類似アクションからの学習機能__
   - 過去の類似アクションのタスクを参考にする
   - 生成品質の向上

10. __A/Bテスト機能__
    - 複数のプロンプトパターンをテスト
    - 最適なプロンプトの自動選択

## 特記事項

### タスク8について

タスク8「監視とログの実装」では、入力検証サービス（InputValidationService）の実装をスキップします。理由は以下の通りです：

- 既存のInputValidationService（2.2.2で実装済み）を活用できる
- actionIdの検証は既存のスキーマで対応可能
- 重複実装を避け、開発効率を向上させる

### タスクの優先順位

以下の順序で実装することを推奨します：

1. __フェーズ1（基盤構築）__: タスク1-5
   - プロジェクト基盤、品質検証、データベース、コンテキスト取得、AI生成

2. __フェーズ2（コア機能）__: タスク6-7
   - ビジネスロジック、Lambda Handler

3. __フェーズ3（運用準備）__: タスク8-10
   - 監視、セキュリティ、インフラ

4. __フェーズ4（品質保証）__: タスク11-14
   - E2Eテスト、ドキュメント、最適化、最終検証

### 既存コードの活用

以下の既存コードを最大限活用してください：

- __InputValidationService__: リクエスト検証に使用
- __ContextService__: 既存のメソッドを拡張
- __BedrockService__: 既存のクラスに機能追加
- __セキュリティユーティリティ__: 機密情報マスキングに使用
- __ロガー__: 構造化ログ出力に使用

これにより、開発効率が向上し、コードの一貫性が保たれます。
