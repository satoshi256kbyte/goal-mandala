-- PostgreSQL初期化スクリプト
-- 開発用・テスト用データベースとユーザーを作成

-- 開発用データベース作成
CREATE DATABASE goal_mandala_dev;

-- テスト用データベース作成
CREATE DATABASE goal_mandala_test;

-- 開発用ユーザー作成（環境変数のパスワードを使用）
CREATE USER goal_mandala_user WITH PASSWORD 'your_secure_password_here';

-- 開発用データベースに権限付与
GRANT ALL PRIVILEGES ON DATABASE goal_mandala_dev TO goal_mandala_user;
GRANT ALL PRIVILEGES ON DATABASE goal_mandala_test TO goal_mandala_user;

-- 開発用データベースに接続して拡張機能を有効化
\c goal_mandala_dev;

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- スキーマ権限を付与
GRANT ALL ON SCHEMA public TO goal_mandala_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO goal_mandala_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO goal_mandala_user;

-- テスト用データベースに接続して拡張機能を有効化
\c goal_mandala_test;

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- スキーマ権限を付与
GRANT ALL ON SCHEMA public TO goal_mandala_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO goal_mandala_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO goal_mandala_user;

-- デフォルトデータベースに戻る
\c postgres;

-- 初期化完了メッセージ
SELECT 'PostgreSQL初期化が完了しました。開発用・テスト用データベースとユーザーが作成され、uuid-ossp拡張機能が有効化されました。' AS initialization_status;
