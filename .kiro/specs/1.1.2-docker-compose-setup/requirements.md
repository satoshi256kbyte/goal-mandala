# 要件ドキュメント

## 概要

ローカル開発環境でPostgreSQLとcognito-localを動作させるためのDocker Compose環境を構築します。開発者が簡単にローカル環境を立ち上げられるようにし、本番環境に近い状態でのテストを可能にします。

## 要件

### 要件1

**ユーザーストーリー:** 開発者として、ローカル環境でPostgreSQLデータベースを使用したいので、Docker Composeで簡単に起動できるようにしたい

#### 受入基準

1. WHEN `docker-compose up`を実行 THEN PostgreSQLコンテナが起動する
2. WHEN PostgreSQLコンテナが起動 THEN データベース接続が可能になる
3. WHEN 開発用データベースを作成 THEN アプリケーションから接続できる
4. WHEN コンテナを停止・再起動 THEN データが永続化されている
5. IF 初回起動時 THEN 必要なデータベースとユーザーが自動作成される

### 要件2

**ユーザーストーリー:** 開発者として、ローカル環境でAmazon Cognitoの機能をテストしたいので、cognito-localを使用できるようにしたい

#### 受入基準

1. WHEN `docker-compose up`を実行 THEN cognito-localコンテナが起動する
2. WHEN cognito-localが起動 THEN ローカルでCognito APIが利用可能になる
3. WHEN User Poolを作成 THEN ローカル環境で認証テストができる
4. WHEN アプリケーションから接続 THEN 認証フローが正常に動作する
5. IF 開発用設定 THEN テスト用ユーザーが事前に作成される

### 要件3

**ユーザーストーリー:** 開発者として、環境変数を適切に管理したいので、.env.exampleファイルで設定例を提供したい

#### 受入基準

1. WHEN .env.exampleファイルを確認 THEN 必要な環境変数がすべて記載されている
2. WHEN .env.exampleをコピーして.envを作成 THEN 開発環境が正常に動作する
3. WHEN 機密情報を含む設定 THEN .envファイルがGitignoreされている
4. WHEN 新しい環境変数を追加 THEN .env.exampleも更新される
5. IF 設定値が不正 THEN わかりやすいエラーメッセージが表示される

### 要件4

**ユーザーストーリー:** 開発者として、開発環境を簡単にセットアップしたいので、初期化スクリプトを提供したい

#### 受入基準

1. WHEN 初期化スクリプトを実行 THEN 必要な依存関係がインストールされる
2. WHEN データベース初期化 THEN スキーマとシードデータが投入される
3. WHEN cognito-local初期化 THEN テスト用User Poolが作成される
4. WHEN 初期化完了 THEN 開発環境が使用可能状態になる
5. IF 初期化に失敗 THEN エラー内容が明確に表示される

### 要件5

**ユーザーストーリー:** 開発者として、開発環境の状態を確認したいので、ヘルスチェック機能を提供したい

#### 受入基準

1. WHEN ヘルスチェックを実行 THEN PostgreSQLの接続状態が確認できる
2. WHEN ヘルスチェックを実行 THEN cognito-localの動作状態が確認できる
3. WHEN サービスが正常 THEN 成功メッセージが表示される
4. WHEN サービスに問題がある THEN 具体的なエラー情報が表示される
5. IF 複数サービスをチェック THEN 各サービスの状態が個別に表示される
