# 本番環境検証・ドキュメント作成 - 実装タスク

**依存関係**: Spec 4.3（本番環境デプロイ）の完了

**目的**: 本番環境の最終検証とドキュメント作成を完了し、MVP（Minimum Viable Product）をリリース可能な状態にする

## Phase 1: GitHub Secrets設定とワークフローテスト（0.5人日）

### 1. GitHub Secrets設定

- [ ] 1.1 AWS認証情報の設定
  - GitHub Settings > Secrets and variables > Actions に移動
  - AWS_ACCESS_KEY_IDを追加
  - AWS_SECRET_ACCESS_KEYを追加
  - _Requirements: 1.1_
  - _Property: 1_

- [ ] 1.2 GitHub Variablesの設定
  - Variables タブに移動
  - AWS_REGIONを追加（ap-northeast-1）
  - AWS_ACCOUNT_IDを追加（202633084296）
  - _Requirements: 1.2_
  - _Property: 1_

- [ ] 1.3 デプロイ関連シークレットの設定
  - S3_BUCKET_NAMEを追加（CDKデプロイ後に確認）
  - CLOUDFRONT_DISTRIBUTION_IDを追加（CDKデプロイ後に確認）
  - API_ENDPOINTを追加（CDKデプロイ後に確認）
  - _Requirements: 1.3_
  - _Property: 1_

- [ ] 1.4 Slack Webhook URLの設定（オプション）
  - SLACK_WEBHOOK_URLを追加
  - _Requirements: 1.4_
  - _Property: 1_

- [ ] 1.5 GitHub Environmentの設定
  - Settings > Environments に移動
  - "production" 環境を作成
  - Required reviewers: 承認者を1名以上設定
  - Deployment branches: main ブランチのみ
  - _Requirements: 1.5_
  - _Property: 1_

### 2. デプロイワークフローのテスト

- [ ] 2.1 テストブランチの作成
  - test/deploy-workflow ブランチを作成
  - 軽微な変更をコミット（README.md更新など）
  - _Requirements: 2.1_
  - _Property: 2, 3_

- [ ] 2.2 プルリクエストの作成
  - test/deploy-workflow → main のプルリクエストを作成
  - GitHub Actionsでテストジョブが実行されることを確認
  - _Requirements: 2.2_
  - _Property: 3_


- [ ] 2.3 テストジョブの確認
  - lint、type-check、unit tests、integration tests、E2E testsが成功することを確認
  - テストジョブが失敗した場合は、エラーログを確認して修正
  - _Requirements: 2.2_
  - _Property: 3_

- [ ] 2.4 プルリクエストのマージ
  - プルリクエストをmainブランチにマージ
  - GitHub Actionsでデプロイワークフローが開始されることを確認
  - _Requirements: 2.1, 2.3_
  - _Property: 2_

- [ ] 2.5 デプロイジョブの確認
  - AWS認証、ビルド、CDKデプロイ、S3デプロイ、CloudFront無効化が成功することを確認
  - デプロイジョブが失敗した場合は、エラーログを確認して修正
  - _Requirements: 2.4_
  - _Property: 2_

- [ ] 2.6 ヘルスチェックの確認
  - ヘルスチェックエンドポイントが200 OKを返すことを確認
  - ヘルスチェックが失敗した場合は、CloudWatch Logsを確認して修正
  - _Requirements: 2.5_
  - _Property: 4_

- [ ] 2.7 Slack通知の確認
  - デプロイ成功時にSlack通知が送信されることを確認
  - 通知内容が正しいことを確認（デプロイ成功、バージョン、タイムスタンプ）
  - _Requirements: 2.6_
  - _Property: 5_

### 3. ロールバックワークフローのテスト

- [ ] 3.1 ロールバック対象バージョンの確認
  - 前回のデプロイバージョン（タグまたはコミットSHA）を確認
  - _Requirements: 3.1_
  - _Property: 6_

- [ ] 3.2 ロールバックワークフローの実行
  - GitHub Actions > Rollback Production を選択
  - バージョンを指定
  - 確認メッセージ（"rollback"）を入力
  - ワークフローを実行
  - _Requirements: 3.2_
  - _Property: 6_

- [ ] 3.3 ロールバックジョブの確認
  - 指定バージョンのチェックアウト、ビルド、CDKデプロイ、S3デプロイが成功することを確認
  - ロールバックジョブが失敗した場合は、エラーログを確認して修正
  - _Requirements: 3.3, 3.4_
  - _Property: 6_

- [ ] 3.4 ヘルスチェックの確認
  - ヘルスチェックエンドポイントが200 OKを返すことを確認
  - バージョンが指定したバージョンに戻っていることを確認
  - _Requirements: 3.5_
  - _Property: 4, 6_

- [ ] 3.5 Slack通知の確認
  - ロールバック成功時にSlack通知が送信されることを確認
  - 通知内容が正しいことを確認（ロールバック成功、バージョン、タイムスタンプ）
  - _Requirements: 3.6_
  - _Property: 5_

- [ ] 3.6 最新バージョンへの再デプロイ
  - mainブランチに軽微な変更をpush
  - デプロイワークフローで最新バージョンにデプロイ
  - _Requirements: 3.7_
  - _Property: 2_

## Phase 2: ドキュメント作成（1人日）

### 4. デプロイ手順書作成

- [ ] 4.1 事前準備セクションの作成
  - GitHub Secrets設定手順
  - IAMユーザー作成手順
  - GitHub Environment設定手順
  - _Requirements: 4.1_
  - _Property: 7_

- [ ] 4.2 初回デプロイセクションの作成
  - CDK Bootstrap手順
  - Secrets Manager設定手順
  - CDKデプロイ手順
  - フロントエンドデプロイ手順
  - 動作確認手順
  - _Requirements: 4.2_
  - _Property: 7_

- [ ] 4.3 通常デプロイセクションの作成
  - mainブランチへのpush手順
  - GitHub Actionsでの自動デプロイ手順
  - 承認手順
  - 動作確認手順
  - _Requirements: 4.3_
  - _Property: 7_

- [ ] 4.4 デプロイ後の確認セクションの作成
  - ヘルスチェック手順
  - CloudWatch Dashboards確認手順
  - CloudWatch Alarms確認手順
  - X-Ray トレーシング確認手順
  - _Requirements: 4.4_
  - _Property: 7_

- [ ] 4.5 トラブルシューティングセクションの作成
  - デプロイ失敗時の対処方法
  - ヘルスチェック失敗時の対処方法
  - CloudFrontキャッシュ問題の対処方法
  - _Requirements: 4.5_
  - _Property: 7_

### 5. 運用マニュアル作成

- [ ] 5.1 日常的な監視セクションの作成
  - CloudWatch Dashboards確認手順
  - CloudWatch Alarms確認手順
  - コスト確認手順
  - _Requirements: 5.1_
  - _Property: 7_

- [ ] 5.2 アラート対応セクションの作成
  - エラー率上昇時の対応手順
  - レイテンシー上昇時の対応手順
  - データベース接続エラー時の対応手順
  - _Requirements: 5.2_
  - _Property: 7_

- [ ] 5.3 バックアップ・リストアセクションの作成
  - データベースバックアップ手順
  - S3バックアップ手順
  - リストア手順
  - _Requirements: 5.3_
  - _Property: 7_

- [ ] 5.4 スケーリングセクションの作成
  - Lambda同時実行数調整手順
  - データベースACU調整手順
  - CloudFrontキャッシュ設定手順
  - _Requirements: 5.4_
  - _Property: 7_

- [ ] 5.5 セキュリティ対応セクションの作成
  - Secrets Manager認証情報ローテーション手順
  - IAMポリシー見直し手順
  - CloudTrail監査ログ確認手順
  - _Requirements: 5.5_
  - _Property: 7_

### 6. トラブルシューティングガイド作成

- [ ] 6.1 よくある問題セクションの作成
  - デプロイ失敗の原因と解決方法
  - ヘルスチェック失敗の原因と解決方法
  - CloudFrontキャッシュ問題の原因と解決方法
  - データベース接続エラーの原因と解決方法
  - _Requirements: 6.1_
  - _Property: 7_

- [ ] 6.2 ログの確認方法セクションの作成
  - CloudWatch Logs確認手順
  - X-Ray トレーシング確認手順
  - CloudTrail確認手順
  - _Requirements: 6.2_
  - _Property: 7_

- [ ] 6.3 メトリクスの確認方法セクションの作成
  - CloudWatch Dashboards確認手順
  - CloudWatch Alarms確認手順
  - _Requirements: 6.3_
  - _Property: 7_

- [ ] 6.4 緊急時の対応セクションの作成
  - ロールバック実行手順
  - サービス停止手順
  - 問題調査手順
  - _Requirements: 6.4_
  - _Property: 7_

- [ ] 6.5 エスカレーションセクションの作成
  - 連絡先リスト
  - エスカレーション基準
  - エスカレーション手順
  - _Requirements: 6.5_
  - _Property: 7_

### 7. ロールバック手順書作成

- [ ] 7.1 ロールバックの判断基準セクションの作成
  - エラー率が5%を超える場合
  - ヘルスチェック失敗の場合
  - 重大なバグ発見の場合
  - _Requirements: 7.1_
  - _Property: 7_

- [ ] 7.2 ロールバックの実行手順セクションの作成
  - GitHub Actionsでロールバックワークフロー実行手順
  - バージョン指定手順
  - 確認メッセージ入力手順
  - 承認手順
  - 動作確認手順
  - _Requirements: 7.2_
  - _Property: 7_

- [ ] 7.3 ロールバック後の確認セクションの作成
  - ヘルスチェック手順
  - CloudWatch Dashboards確認手順
  - CloudWatch Alarms確認手順
  - _Requirements: 7.3_
  - _Property: 7_

- [ ] 7.4 ロールバック失敗時の対処セクションの作成
  - 手動ロールバック手順
  - 問題調査手順
  - 修正デプロイ手順
  - _Requirements: 7.4_
  - _Property: 7_

- [ ] 7.5 ロールバック後の復旧セクションの作成
  - 問題修正手順
  - 再デプロイ手順
  - 動作確認手順
  - _Requirements: 7.5_
  - _Property: 7_

## Phase 3: 最終検証とドキュメント更新（0.5人日）

### 8. 最終検証

- [ ] 8.1 デプロイ検証
  - デプロイワークフローが正常に動作することを確認
  - ヘルスチェックが成功することを確認
  - Slack通知が送信されることを確認
  - _Requirements: 8.1_
  - _Property: 2, 3, 4, 5, 8_

- [ ] 8.2 ロールバック検証
  - ロールバックワークフローが正常に動作することを確認
  - ヘルスチェックが成功することを確認
  - Slack通知が送信されることを確認
  - _Requirements: 8.2_
  - _Property: 4, 5, 6, 8_

- [ ] 8.3 セキュリティ検証
  - GitHub Secretsが安全に保存されていることを確認
  - IAMポリシーが最小権限の原則に従っていることを確認
  - CloudTrail監査ログが記録されていることを確認
  - _Requirements: 8.3_
  - _Property: 8_

- [ ] 8.4 監視検証
  - CloudWatch Dashboardsが正常に表示されることを確認
  - CloudWatch Alarmsが正常に動作することを確認
  - X-Ray トレーシングが有効化されていることを確認
  - _Requirements: 8.4_
  - _Property: 8_

- [ ] 8.5 コスト検証
  - 無料利用枠を活用していることを確認
  - コスト最適化が適用されていることを確認
  - 予算アラートが設定されていることを確認
  - _Requirements: 8.5_
  - _Property: 8_

### 9. WBS更新

- [ ] 9.1 4.4タスクの完了状況を反映
  - .kiro/steering/4-wbs.mdを更新
  - 4.4タスクのチェックボックスを更新
  - 完了日を記録
  - _Requirements: 9.1_
  - _Property: 9_

- [ ] 9.2 フェーズ4の完了率を更新
  - フェーズ4の進捗状況を計算
  - 完了率を更新（4.1: 100%, 4.3: 100%, 4.4: 100%）
  - _Requirements: 9.2_
  - _Property: 9_

- [ ] 9.3 次のアクションを明記
  - MVP完成の宣言
  - 将来の拡張機能（Phase 2）への移行
  - _Requirements: 9.3_
  - _Property: 9_

### 10. ステアリングファイル更新

- [ ] 10.1 本番環境デプロイのベストプラクティスを追加
  - GitHub Secrets管理のベストプラクティス
  - CI/CDパイプラインのベストプラクティス
  - デプロイ戦略のベストプラクティス
  - _Requirements: 10.1_
  - _Property: 10_

- [ ] 10.2 CI/CDパイプラインの設計パターンを追加
  - デプロイワークフローの設計パターン
  - ロールバックワークフローの設計パターン
  - 承認フローの設計パターン
  - _Requirements: 10.2_
  - _Property: 10_

- [ ] 10.3 監視・アラートの設定方法を追加
  - CloudWatch Dashboardsの設定方法
  - CloudWatch Alarmsの設定方法
  - SNS通知の設定方法
  - _Requirements: 10.3_
  - _Property: 10_

- [ ] 10.4 トラブルシューティングのノウハウを追加
  - デプロイ失敗時のトラブルシューティング
  - ヘルスチェック失敗時のトラブルシューティング
  - ロールバック失敗時のトラブルシューティング
  - _Requirements: 10.4_
  - _Property: 10_

- [ ] 10.5 将来の改善点を追加
  - 自動ロールバックの実装
  - カナリアデプロイの実装
  - ブルーグリーンデプロイの実装
  - マルチリージョンデプロイの実装
  - _Requirements: 10.5_
  - _Property: 10_

## タスクサマリー

- **Phase 1**: 18タスク（GitHub Secrets設定、ワークフローテスト）
- **Phase 2**: 20タスク（ドキュメント作成）
- **Phase 3**: 10タスク（最終検証、ドキュメント更新）

**合計**: 48タスク

## 完了基準

- [ ] すべてのGitHub Secretsが設定されている
- [ ] デプロイワークフローが正常に動作する
- [ ] ロールバックワークフローが正常に動作する
- [ ] すべてのドキュメントが作成されている
- [ ] 最終検証が完了している
- [ ] WBSが更新されている
- [ ] ステアリングファイルが更新されている

## 次のステップ

Phase 1から順次実施し、各フェーズ完了後に次のフェーズに進みます。
