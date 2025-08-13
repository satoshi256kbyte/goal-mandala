#!/bin/bash

# PostgreSQL接続確認スクリプト
# Usage: ./tools/scripts/test-postgres-connection.sh [--verbose] [--json]

set -e

# デフォルト設定
VERBOSE=false
JSON_OUTPUT=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--verbose] [--json]"
            echo "  --verbose  詳細なログを表示"
            echo "  --json     JSON形式で結果を出力"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ログ関数
log_info() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "ℹ️  $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "✅ $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "❌ $1" >&2
    fi
}

log_warning() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "⚠️  $1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo "🔍 $1"
    fi
}

# JSON結果格納用
declare -A RESULTS
OVERALL_STATUS="success"

# 結果記録関数
record_result() {
    local key="$1"
    local status="$2"
    local message="$3"
    local details="$4"

    RESULTS["${key}_status"]="$status"
    RESULTS["${key}_message"]="$message"
    RESULTS["${key}_details"]="$details"

    if [ "$status" = "error" ]; then
        OVERALL_STATUS="error"
    elif [ "$status" = "warning" ] && [ "$OVERALL_STATUS" != "error" ]; then
        OVERALL_STATUS="warning"
    fi
}

if [ "$JSON_OUTPUT" = false ]; then
    echo "=== PostgreSQL接続確認開始 ==="
fi

# 環境変数の確認
log_info "環境変数を確認中..."
if [ -z "$POSTGRES_PASSWORD" ]; then
    log_warning "POSTGRES_PASSWORD環境変数が設定されていません。デフォルト値を使用します。"
    export POSTGRES_PASSWORD="your_secure_password_here"
    record_result "env_vars" "warning" "POSTGRES_PASSWORD not set" "Using default password"
else
    log_success "環境変数が設定されています"
    record_result "env_vars" "success" "Environment variables configured" "POSTGRES_PASSWORD is set"
fi

# 1. PostgreSQLコンテナの起動状態確認
log_info "PostgreSQLコンテナの起動状態を確認中..."

if ! docker ps | grep -q "goal-mandala-postgres"; then
    log_error "PostgreSQLコンテナが起動していません"
    if [ "$JSON_OUTPUT" = false ]; then
        echo "次のコマンドでコンテナを起動してください:"
        echo "docker-compose up -d postgres"
    fi
    record_result "container_status" "error" "Container not running" "PostgreSQL container is not running"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"$OVERALL_STATUS\",\"container_status\":\"${RESULTS[container_status_status]}\",\"message\":\"${RESULTS[container_status_message]}\",\"details\":\"${RESULTS[container_status_details]}\"}"
    fi
    exit 1
fi

log_success "PostgreSQLコンテナが起動中です"
record_result "container_status" "success" "Container running" "PostgreSQL container is running"

# 2. ヘルスチェック確認
log_info "ヘルスチェック状態を確認中..."

HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' goal-mandala-postgres 2>/dev/null || echo "unknown")
if [ "$HEALTH_STATUS" != "healthy" ]; then
    log_warning "ヘルスチェック状態: $HEALTH_STATUS"
    log_info "コンテナの起動完了を待機中..."
    record_result "health_check" "warning" "Health check not healthy" "Status: $HEALTH_STATUS"

    # 最大30秒待機
    for i in {1..6}; do
        sleep 5
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' goal-mandala-postgres 2>/dev/null || echo "unknown")
        if [ "$HEALTH_STATUS" = "healthy" ]; then
            break
        fi
        log_verbose "待機中... ($i/6) - 状態: $HEALTH_STATUS"
    done

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        log_success "ヘルスチェックが正常になりました"
        record_result "health_check" "success" "Health check healthy after wait" "Status: $HEALTH_STATUS"
    else
        log_warning "ヘルスチェックが正常になりませんでした"
        record_result "health_check" "warning" "Health check still not healthy" "Status: $HEALTH_STATUS"
    fi
else
    log_success "ヘルスチェックが正常です"
    record_result "health_check" "success" "Health check healthy" "Status: $HEALTH_STATUS"
fi

# 3. 開発用データベース接続テスト
log_info "開発用データベース接続をテスト中..."

if docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "開発用データベース接続が成功しました"
    record_result "dev_db_connection" "success" "Development database connection successful" "Connected to goal_mandala_dev"
else
    log_error "開発用データベース接続が失敗しました"
    record_result "dev_db_connection" "error" "Development database connection failed" "Failed to connect to goal_mandala_dev"

    # エラー診断
    log_verbose "接続エラーの詳細を確認中..."
    ERROR_DETAILS=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" 2>&1 || echo "Connection failed")
    log_verbose "エラー詳細: $ERROR_DETAILS"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"dev_db_connection\":\"error\",\"message\":\"Development database connection failed\",\"error_details\":\"$ERROR_DETAILS\"}"
    fi
    exit 1
fi

# 4. テスト用データベース接続テスト
log_info "テスト用データベース接続をテスト中..."

if docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_test -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "テスト用データベース接続が成功しました"
    record_result "test_db_connection" "success" "Test database connection successful" "Connected to goal_mandala_test"
else
    log_error "テスト用データベース接続が失敗しました"
    record_result "test_db_connection" "error" "Test database connection failed" "Failed to connect to goal_mandala_test"

    # エラー診断
    log_verbose "接続エラーの詳細を確認中..."
    ERROR_DETAILS=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_test -c "SELECT 1;" 2>&1 || echo "Connection failed")
    log_verbose "エラー詳細: $ERROR_DETAILS"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"test_db_connection\":\"error\",\"message\":\"Test database connection failed\",\"error_details\":\"$ERROR_DETAILS\"}"
    fi
    exit 1
fi

# 5. UUID拡張機能テスト
log_info "UUID拡張機能をテスト中..."

# UUID拡張機能のテスト（開発用データベース）
UUID_RESULT=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT uuid_generate_v4();" 2>/dev/null | tr -d ' \n')
if [[ $UUID_RESULT =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    log_success "UUID拡張機能（開発用DB）が正常に動作しています"
    log_verbose "生成されたUUID: $UUID_RESULT"
    record_result "uuid_extension_dev" "success" "UUID extension working in dev DB" "Generated UUID: $UUID_RESULT"
else
    log_error "UUID拡張機能（開発用DB）が動作していません"
    record_result "uuid_extension_dev" "error" "UUID extension not working in dev DB" "Failed to generate UUID"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"uuid_extension_dev\":\"error\",\"message\":\"UUID extension not working in dev DB\"}"
    fi
    exit 1
fi

# UUID拡張機能のテスト（テスト用データベース）
UUID_RESULT=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_test -t -c "SELECT uuid_generate_v4();" 2>/dev/null | tr -d ' \n')
if [[ $UUID_RESULT =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    log_success "UUID拡張機能（テスト用DB）が正常に動作しています"
    log_verbose "生成されたUUID: $UUID_RESULT"
    record_result "uuid_extension_test" "success" "UUID extension working in test DB" "Generated UUID: $UUID_RESULT"
else
    log_error "UUID拡張機能（テスト用DB）が動作していません"
    record_result "uuid_extension_test" "error" "UUID extension not working in test DB" "Failed to generate UUID"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"uuid_extension_test\":\"error\",\"message\":\"UUID extension not working in test DB\"}"
    fi
    exit 1
fi

# 6. 権限テスト
log_info "データベース権限をテスト中..."

if docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "CREATE TABLE test_table (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT); DROP TABLE test_table;" > /dev/null 2>&1; then
    log_success "テーブル作成・削除権限が正常です"
    record_result "permissions" "success" "Database permissions working" "Can create and drop tables"
else
    log_error "テーブル作成・削除権限に問題があります"
    record_result "permissions" "error" "Database permissions failed" "Cannot create or drop tables"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"permissions\":\"error\",\"message\":\"Database permissions failed\"}"
    fi
    exit 1
fi

# 7. データベース統計情報取得
log_info "データベース統計情報を取得中..."

DEV_DB_SIZE=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT pg_size_pretty(pg_database_size('goal_mandala_dev'));" 2>/dev/null | tr -d ' \n' || echo "unknown")
TEST_DB_SIZE=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_test -t -c "SELECT pg_size_pretty(pg_database_size('goal_mandala_test'));" 2>/dev/null | tr -d ' \n' || echo "unknown")
POSTGRES_VERSION=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT version();" 2>/dev/null | head -1 | sed 's/^ *//' || echo "unknown")

record_result "database_info" "success" "Database information retrieved" "Dev DB: $DEV_DB_SIZE, Test DB: $TEST_DB_SIZE, Version: $POSTGRES_VERSION"

# 結果出力
if [ "$JSON_OUTPUT" = true ]; then
    echo "{"
    echo "  \"overall_status\": \"$OVERALL_STATUS\","
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"checks\": {"
    echo "    \"environment_variables\": {"
    echo "      \"status\": \"${RESULTS[env_vars_status]}\","
    echo "      \"message\": \"${RESULTS[env_vars_message]}\","
    echo "      \"details\": \"${RESULTS[env_vars_details]}\""
    echo "    },"
    echo "    \"container_status\": {"
    echo "      \"status\": \"${RESULTS[container_status_status]}\","
    echo "      \"message\": \"${RESULTS[container_status_message]}\","
    echo "      \"details\": \"${RESULTS[container_status_details]}\""
    echo "    },"
    echo "    \"health_check\": {"
    echo "      \"status\": \"${RESULTS[health_check_status]}\","
    echo "      \"message\": \"${RESULTS[health_check_message]}\","
    echo "      \"details\": \"${RESULTS[health_check_details]}\""
    echo "    },"
    echo "    \"dev_db_connection\": {"
    echo "      \"status\": \"${RESULTS[dev_db_connection_status]}\","
    echo "      \"message\": \"${RESULTS[dev_db_connection_message]}\","
    echo "      \"details\": \"${RESULTS[dev_db_connection_details]}\""
    echo "    },"
    echo "    \"test_db_connection\": {"
    echo "      \"status\": \"${RESULTS[test_db_connection_status]}\","
    echo "      \"message\": \"${RESULTS[test_db_connection_message]}\","
    echo "      \"details\": \"${RESULTS[test_db_connection_details]}\""
    echo "    },"
    echo "    \"uuid_extension_dev\": {"
    echo "      \"status\": \"${RESULTS[uuid_extension_dev_status]}\","
    echo "      \"message\": \"${RESULTS[uuid_extension_dev_message]}\","
    echo "      \"details\": \"${RESULTS[uuid_extension_dev_details]}\""
    echo "    },"
    echo "    \"uuid_extension_test\": {"
    echo "      \"status\": \"${RESULTS[uuid_extension_test_status]}\","
    echo "      \"message\": \"${RESULTS[uuid_extension_test_message]}\","
    echo "      \"details\": \"${RESULTS[uuid_extension_test_details]}\""
    echo "    },"
    echo "    \"permissions\": {"
    echo "      \"status\": \"${RESULTS[permissions_status]}\","
    echo "      \"message\": \"${RESULTS[permissions_message]}\","
    echo "      \"details\": \"${RESULTS[permissions_details]}\""
    echo "    },"
    echo "    \"database_info\": {"
    echo "      \"status\": \"${RESULTS[database_info_status]}\","
    echo "      \"message\": \"${RESULTS[database_info_message]}\","
    echo "      \"details\": \"${RESULTS[database_info_details]}\","
    echo "      \"dev_db_size\": \"$DEV_DB_SIZE\","
    echo "      \"test_db_size\": \"$TEST_DB_SIZE\","
    echo "      \"postgres_version\": \"$POSTGRES_VERSION\""
    echo "    }"
    echo "  }"
    echo "}"
else
    echo ""
    echo "=== データベース接続情報 ==="
    echo "Host: localhost"
    echo "Port: 5432"
    echo "開発用データベース: goal_mandala_dev (サイズ: $DEV_DB_SIZE)"
    echo "テスト用データベース: goal_mandala_test (サイズ: $TEST_DB_SIZE)"
    echo "ユーザー: goal_mandala_user"
    echo "パスワード: \$POSTGRES_PASSWORD"
    echo "PostgreSQLバージョン: $POSTGRES_VERSION"
    echo ""

    echo "=== PostgreSQL接続確認完了 ==="
    if [ "$OVERALL_STATUS" = "success" ]; then
        echo "✅ 全ての接続テストが成功しました"
    elif [ "$OVERALL_STATUS" = "warning" ]; then
        echo "⚠️  警告がありますが、基本的な機能は動作しています"
    else
        echo "❌ エラーが発生しました"
    fi
    echo ""
    echo "💡 データベースへの直接接続:"
    echo "docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev"
    echo ""
    echo "🔧 トラブルシューティング:"
    echo "- コンテナが起動していない場合: docker-compose up -d postgres"
    echo "- 権限エラーの場合: docker-compose down -v && docker-compose up -d postgres"
    echo "- 詳細ログが必要な場合: $0 --verbose"
fi

# 終了コード設定
if [ "$OVERALL_STATUS" = "error" ]; then
    exit 1
elif [ "$OVERALL_STATUS" = "warning" ]; then
    exit 2
else
    exit 0
fi
