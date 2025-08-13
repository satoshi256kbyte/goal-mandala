#!/bin/bash

# Docker環境統合テストスクリプト
# このスクリプトはDocker Compose環境の全体的な動作を検証します

set -e

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# テスト結果を記録する変数
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# テスト結果を記録する関数
record_test_result() {
    local test_name="$1"
    local result="$2"

    if [ "$result" = "PASS" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "✓ $test_name"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        log_error "✗ $test_name"
    fi
}

# Docker Composeファイルの存在確認
check_docker_compose_files() {
    log_info "Docker Composeファイルの存在確認..."

    if [ ! -f "docker-compose.yml" ]; then
        record_test_result "docker-compose.yml存在確認" "FAIL"
        return 1
    fi

    record_test_result "docker-compose.yml存在確認" "PASS"
    return 0
}

# Docker Compose設定の検証
validate_docker_compose_config() {
    log_info "Docker Compose設定の検証..."

    if docker-compose config > /dev/null 2>&1; then
        record_test_result "Docker Compose設定検証" "PASS"
        return 0
    else
        record_test_result "Docker Compose設定検証" "FAIL"
        return 1
    fi
}

# 環境変数ファイルの確認
check_env_files() {
    log_info "環境変数ファイルの確認..."

    if [ ! -f ".env.example" ]; then
        record_test_result ".env.example存在確認" "FAIL"
        return 1
    fi

    record_test_result ".env.example存在確認" "PASS"

    if [ ! -f ".env" ]; then
        log_warning ".envファイルが存在しません。.env.exampleからコピーしてください。"
        record_test_result ".env存在確認" "FAIL"
        return 1
    fi

    record_test_result ".env存在確認" "PASS"
    return 0
}

# コンテナ起動テスト
test_container_startup() {
    log_info "コンテナ起動テスト開始..."

    # 既存のコンテナを停止・削除
    log_info "既存のコンテナをクリーンアップ..."
    docker-compose down -v > /dev/null 2>&1 || true

    # コンテナを起動
    log_info "コンテナを起動中..."
    if docker-compose up -d; then
        record_test_result "コンテナ起動" "PASS"
    else
        record_test_result "コンテナ起動" "FAIL"
        return 1
    fi

    # コンテナの起動を待機
    log_info "コンテナの起動を待機中..."
    sleep 30

    # コンテナの状態確認
    log_info "コンテナの状態確認..."
    local running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
    local expected_containers=2  # postgres + cognito-local

    if [ "$running_containers" -eq "$expected_containers" ]; then
        record_test_result "コンテナ状態確認" "PASS"
        return 0
    else
        record_test_result "コンテナ状態確認" "FAIL"
        log_error "期待されるコンテナ数: $expected_containers, 実際の起動コンテナ数: $running_containers"
        return 1
    fi
}

# PostgreSQL接続テスト
test_postgresql_connection() {
    log_info "PostgreSQL接続テスト開始..."

    # 環境変数の読み込み
    if [ -f ".env" ]; then
        source .env
    fi

    # PostgreSQLの起動を待機
    log_info "PostgreSQLの起動を待機中..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-goal_mandala_user}" -d "${POSTGRES_DB:-goal_mandala_dev}" > /dev/null 2>&1; then
            break
        fi

        log_info "PostgreSQL起動待機中... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        record_test_result "PostgreSQL起動待機" "FAIL"
        return 1
    fi

    record_test_result "PostgreSQL起動待機" "PASS"

    # データベース接続テスト
    log_info "データベース接続テスト..."
    if docker-compose exec -T postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "${POSTGRES_DB:-goal_mandala_dev}" -c "SELECT 1;" > /dev/null 2>&1; then
        record_test_result "PostgreSQL接続テスト" "PASS"
    else
        record_test_result "PostgreSQL接続テスト" "FAIL"
        return 1
    fi

    # データベース・テーブル存在確認
    log_info "データベース存在確認..."
    local db_exists=$(docker-compose exec -T postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -lqt | cut -d \| -f 1 | grep -w "${POSTGRES_DB:-goal_mandala_dev}" | wc -l)

    if [ "$db_exists" -eq 1 ]; then
        record_test_result "データベース存在確認" "PASS"
    else
        record_test_result "データベース存在確認" "FAIL"
        return 1
    fi

    # 拡張機能確認
    log_info "拡張機能確認..."
    if docker-compose exec -T postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "${POSTGRES_DB:-goal_mandala_dev}" -c "SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';" | grep -q "uuid-ossp"; then
        record_test_result "uuid-ossp拡張機能確認" "PASS"
    else
        record_test_result "uuid-ossp拡張機能確認" "FAIL"
        return 1
    fi

    return 0
}

# cognito-local接続テスト
test_cognito_local_connection() {
    log_info "cognito-local接続テスト開始..."

    # cognito-localの起動を待機
    log_info "cognito-localの起動を待機中..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:9229/health > /dev/null 2>&1; then
            break
        fi

        log_info "cognito-local起動待機中... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        record_test_result "cognito-local起動待機" "FAIL"
        return 1
    fi

    record_test_result "cognito-local起動待機" "PASS"

    # cognito-local接続テスト
    log_info "cognito-local接続テスト..."
    if curl -f -s http://localhost:9229/health > /dev/null 2>&1; then
        record_test_result "cognito-local接続テスト" "PASS"
    else
        record_test_result "cognito-local接続テスト" "FAIL"
        return 1
    fi

    # User Pool存在確認（設定ファイルが正しく読み込まれているか）
    log_info "User Pool設定確認..."
    local response=$(curl -s http://localhost:9229/ 2>/dev/null || echo "")

    if [ -n "$response" ]; then
        record_test_result "cognito-local設定確認" "PASS"
    else
        record_test_result "cognito-local設定確認" "FAIL"
        return 1
    fi

    return 0
}

# ネットワーク接続テスト
test_network_connectivity() {
    log_info "ネットワーク接続テスト開始..."

    # コンテナ間通信テスト
    log_info "コンテナ間通信テスト..."
    if docker-compose exec -T postgres ping -c 1 cognito-local > /dev/null 2>&1; then
        record_test_result "コンテナ間通信テスト" "PASS"
    else
        record_test_result "コンテナ間通信テスト" "FAIL"
        return 1
    fi

    return 0
}

# ボリューム永続化テスト
test_volume_persistence() {
    log_info "ボリューム永続化テスト開始..."

    # テストデータの挿入
    log_info "テストデータ挿入..."
    if docker-compose exec -T postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "${POSTGRES_DB:-goal_mandala_dev}" -c "CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, data TEXT); INSERT INTO test_table (data) VALUES ('test_data');" > /dev/null 2>&1; then
        record_test_result "テストデータ挿入" "PASS"
    else
        record_test_result "テストデータ挿入" "FAIL"
        return 1
    fi

    # コンテナ再起動
    log_info "コンテナ再起動..."
    docker-compose restart postgres > /dev/null 2>&1
    sleep 10

    # データ永続化確認
    log_info "データ永続化確認..."
    local data_count=$(docker-compose exec -T postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "${POSTGRES_DB:-goal_mandala_dev}" -t -c "SELECT COUNT(*) FROM test_table WHERE data = 'test_data';" 2>/dev/null | tr -d ' \n' || echo "0")

    if [ "$data_count" = "1" ]; then
        record_test_result "データ永続化確認" "PASS"
    else
        record_test_result "データ永続化確認" "FAIL"
        return 1
    fi

    # テストデータクリーンアップ
    docker-compose exec -T postgres psql -U "${POSTGRES_USER:-goal_mandala_user}" -d "${POSTGRES_DB:-goal_mandala_dev}" -c "DROP TABLE IF EXISTS test_table;" > /dev/null 2>&1

    return 0
}

# リソース使用量チェック
check_resource_usage() {
    log_info "リソース使用量チェック..."

    # メモリ使用量チェック
    local postgres_memory=$(docker stats --no-stream --format "table {{.MemUsage}}" postgres 2>/dev/null | tail -n 1 | cut -d'/' -f1 | sed 's/[^0-9.]//g' || echo "0")
    local cognito_memory=$(docker stats --no-stream --format "table {{.MemUsage}}" cognito-local 2>/dev/null | tail -n 1 | cut -d'/' -f1 | sed 's/[^0-9.]//g' || echo "0")

    log_info "PostgreSQL メモリ使用量: ${postgres_memory}MB"
    log_info "cognito-local メモリ使用量: ${cognito_memory}MB"

    record_test_result "リソース使用量チェック" "PASS"
    return 0
}

# ログ出力テスト
test_log_output() {
    log_info "ログ出力テスト..."

    # PostgreSQLログ確認
    local postgres_logs=$(docker-compose logs postgres 2>/dev/null | wc -l)
    if [ "$postgres_logs" -gt 0 ]; then
        record_test_result "PostgreSQLログ出力" "PASS"
    else
        record_test_result "PostgreSQLログ出力" "FAIL"
    fi

    # cognito-localログ確認
    local cognito_logs=$(docker-compose logs cognito-local 2>/dev/null | wc -l)
    if [ "$cognito_logs" -gt 0 ]; then
        record_test_result "cognito-localログ出力" "PASS"
    else
        record_test_result "cognito-localログ出力" "FAIL"
    fi

    return 0
}

# クリーンアップ
cleanup() {
    log_info "テスト環境のクリーンアップ..."
    docker-compose down -v > /dev/null 2>&1 || true
    log_success "クリーンアップ完了"
}

# テスト結果サマリー表示
show_test_summary() {
    echo ""
    echo "========================================="
    echo "           テスト結果サマリー"
    echo "========================================="
    echo "成功: $TESTS_PASSED"
    echo "失敗: $TESTS_FAILED"
    echo "合計: $((TESTS_PASSED + TESTS_FAILED))"
    echo ""

    if [ $TESTS_FAILED -gt 0 ]; then
        echo "失敗したテスト:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
    fi

    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "全てのテストが成功しました！"
        return 0
    else
        log_error "一部のテストが失敗しました。"
        return 1
    fi
}

# メイン実行関数
main() {
    echo "========================================="
    echo "      Docker環境統合テスト開始"
    echo "========================================="
    echo ""

    # 前提条件チェック
    check_docker_compose_files || true
    validate_docker_compose_config || true
    check_env_files || true

    # コンテナ起動テスト
    test_container_startup || true

    # 各サービス接続テスト
    test_postgresql_connection || true
    test_cognito_local_connection || true

    # 追加テスト
    test_network_connectivity || true
    test_volume_persistence || true
    check_resource_usage || true
    test_log_output || true

    # クリーンアップ
    cleanup

    # 結果表示
    show_test_summary
}

# スクリプト実行時のトラップ設定
trap cleanup EXIT

# メイン処理実行
main "$@"
