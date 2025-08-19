-- IAMデータベース認証用ユーザー作成スクリプト
-- 要件6.3対応：IAMデータベース認証を設定

-- 注意: このスクリプトは管理者権限でデータベースに接続して実行してください
-- 実行前に以下を確認してください:
-- 1. Aurora PostgreSQLクラスターでIAM認証が有効になっていること
-- 2. 適切なIAMロールが作成されていること
-- 3. データベースに管理者権限で接続していること

-- 1. Lambda実行用ユーザー（要件6.2対応）
-- アプリケーションのLambda関数が使用するユーザー
CREATE USER lambda_user;
GRANT rds_iam TO lambda_user;
GRANT CONNECT ON DATABASE goalmandalamain TO lambda_user;
GRANT USAGE ON SCHEMA public TO lambda_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lambda_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lambda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lambda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lambda_user;

-- 2. アプリケーション用ユーザー（要件6.2対応）
-- 一般的なアプリケーション処理用のユーザー
CREATE USER app_user;
GRANT rds_iam TO app_user;
GRANT CONNECT ON DATABASE goalmandalamain TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- 3. 読み取り専用ユーザー（要件6.2対応）
-- レポート生成や分析用の読み取り専用ユーザー
CREATE USER readonly_user;
GRANT rds_iam TO readonly_user;
GRANT CONNECT ON DATABASE goalmandalamain TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;

-- 4. 管理者用ユーザー（要件6.3対応）
-- データベース管理・メンテナンス用のユーザー
CREATE USER admin_user;
GRANT rds_iam TO admin_user;
GRANT CONNECT ON DATABASE goalmandalamain TO admin_user;
GRANT ALL PRIVILEGES ON DATABASE goalmandalamain TO admin_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO admin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO admin_user;

-- 5. セキュリティ設定の確認（要件6.1, 6.3対応）
-- SSL接続の強制設定を確認
SHOW ssl;
SHOW log_connections;
SHOW log_disconnections;
SHOW log_statement;

-- 6. 作成されたユーザーの確認
SELECT usename, usesuper, usecreatedb, usecatupd, passwd, valuntil, useconfig
FROM pg_user
WHERE usename IN ('lambda_user', 'app_user', 'readonly_user', 'admin_user');

-- 7. IAM認証が有効なユーザーの確認
SELECT r.rolname, r.rolcanlogin, array_agg(m.rolname) as memberof
FROM pg_roles r
LEFT JOIN pg_auth_members am ON r.oid = am.member
LEFT JOIN pg_roles m ON am.roleid = m.oid
WHERE r.rolname IN ('lambda_user', 'app_user', 'readonly_user', 'admin_user', 'rds_iam')
GROUP BY r.rolname, r.rolcanlogin
ORDER BY r.rolname;

-- 8. 権限の確認
-- テーブル権限の確認
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee IN ('lambda_user', 'app_user', 'readonly_user', 'admin_user')
ORDER BY grantee, table_name, privilege_type;

-- スキーマ権限の確認
SELECT grantee, schema_name, privilege_type
FROM information_schema.schema_privileges
WHERE grantee IN ('lambda_user', 'app_user', 'readonly_user', 'admin_user')
ORDER BY grantee, schema_name, privilege_type;

-- 実行完了メッセージ
SELECT 'IAMデータベース認証用ユーザーの作成が完了しました。' as status;
SELECT 'セキュリティ設定を確認し、適切な権限が付与されていることを確認してください。' as note;
