#!/bin/bash

# PostgreSQL設定検証スクリプト

set -e

echo "=== PostgreSQL設定検証開始 ==="

# 必要なファイルの存在確認
echo "1. 必要なファイルの存在確認..."

if [ ! -f "tools/docker/postgres/init.sql" ]; then
    echo "❌ init.sqlファイルが見つかりません"
    exit 1
fi
echo "✅ init.sqlファイル: 存在"

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.ymlファイルが見つかりません"
    exit 1
fi
echo "✅ docker-compose.ymlファイル: 存在"

# docker-compose.ymlの設定確認
echo "2. docker-compose.yml設定確認..."

# PostgreSQLサービスの存在確認
if ! grep -q "postgres:" docker-compose.yml; then
    echo "❌ PostgreSQLサービスが定義されていません"
    exit 1
fi
echo "✅ PostgreSQLサービス: 定義済み"

# ボリューム設定確認
if ! grep -q "postgres-data:" docker-compose.yml; then
    echo "❌ postgres-dataボリュームが定義されていません"
    exit 1
fi
echo "✅ データ永続化ボリューム: 定義済み"

# 初期化スクリプトマウント確認
if ! grep -q "init.sql:/docker-entrypoint-initdb.d/init.sql" docker-compose.yml; then
    echo "❌ 初期化スクリプトのマウントが設定されていません"
    exit 1
fi
echo "✅ 初期化スクリプトマウント: 設定済み"

# ヘルスチェック設定確認
if ! grep -q "healthcheck:" docker-compose.yml; then
    echo "❌ ヘルスチェックが設定されていません"
    exit 1
fi
echo "✅ ヘルスチェック: 設定済み"

# init.sqlの内容確認
echo "3. init.sql内容確認..."

# 開発用データベース作成確認
if ! grep -q "CREATE DATABASE goal_mandala_dev" tools/docker/postgres/init.sql; then
    echo "❌ 開発用データベース作成が設定されていません"
    exit 1
fi
echo "✅ 開発用データベース作成: 設定済み"

# テスト用データベース作成確認
if ! grep -q "CREATE DATABASE goal_mandala_test" tools/docker/postgres/init.sql; then
    echo "❌ テスト用データベース作成が設定されていません"
    exit 1
fi
echo "✅ テスト用データベース作成: 設定済み"

# ユーザー作成確認
if ! grep -q "CREATE USER goal_mandala_user" tools/docker/postgres/init.sql; then
    echo "❌ ユーザー作成が設定されていません"
    exit 1
fi
echo "✅ ユーザー作成: 設定済み"

# UUID拡張機能確認
if ! grep -q "uuid-ossp" tools/docker/postgres/init.sql; then
    echo "❌ uuid-ossp拡張機能が設定されていません"
    exit 1
fi
echo "✅ uuid-ossp拡張機能: 設定済み"

# 権限付与確認
if ! grep -q "GRANT ALL PRIVILEGES" tools/docker/postgres/init.sql; then
    echo "❌ 権限付与が設定されていません"
    exit 1
fi
echo "✅ 権限付与: 設定済み"

echo ""
echo "=== PostgreSQL設定検証完了 ==="
echo "✅ 全ての設定が正しく実装されています"
echo ""
echo "次のステップ:"
echo "1. docker-compose up -d postgres でPostgreSQLコンテナを起動"
echo "2. docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev で接続確認"
echo "3. SELECT uuid_generate_v4(); でUUID拡張機能の動作確認"
