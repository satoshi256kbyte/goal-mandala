#!/bin/bash

# Docker環境CI/CDテストスクリプト
# CI/CD環境での自動テスト用（非対話式）

set -e

# 環境変数設定
export COMPOSE_INTERACTIVE_NO_CLI=1
export DOCKER_BUILDKIT=1

# ログ出力（CI/CD用）
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

# テスト結果記録
TESTS_PASSED=0
TESTS_FAILED=0

record_test() {
    local test_name="$1"
    local result="$2"

    if [ "$result" = "PASS" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "$test_name: PASSED"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "$test_name: FAILED"
    fi
}

# CI/CD環境用テスト
run_ci_tests() {
    log_info "CI/CD環境でのDocker統合テスト開始"

    # 環境変数ファイル作成（CI用）
    if [ ! -f ".env" ]; then
        log_info ".envファイルを.env.exampleからコピー"
        cp .env.example .env
    fi

    # Docker Compose設定検証
    log_info "Docker Compose設定検証"
    if docker-compose config > /dev/null 2>&1; then
        record_test "Docker Compose設定検証" "PASS"
    else
        record_test "Docker Compose設定検証" "FAIL"
        return 1
    fi

    # コンテナビルド・起動
    log_info "コンテナビルド・起動"
    if docker-compose up -d --build; then
        record_test "コンテナ起動" "PASS"
    else
        record_test "コンテナ起動" "FAIL"
        return 1
    fi

    # ヘルスチェック待機
    log_info "サービスヘルスチェック待機"
    local max_wait=60
    local wait_time=0

    while [ $wait_time -lt $max_wait ]; do
        if docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev > /dev/null 2>&1 && \
           curl -f -s http://localhost:9229/health > /dev/null 2>&1; then
            break
        fi
        sleep 5
        wait_time=$((wait_time + 5))
        log_info "ヘルスチェック待機中... (${wait_time}/${max_wait}秒)"
    done

    if [ $wait_time -ge $max_wait ]; then
        record_test "サービスヘルスチェック" "FAIL"
        return 1
    else
        record_test "サービスヘルスチェック" "PASS"
    fi

    # PostgreSQL接続テスト
    log_info "PostgreSQL接続テスト"
    if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;" > /dev/null 2>&1; then
        record_test "PostgreSQL接続" "PASS"
    else
        record_test "PostgreSQL接続" "FAIL"
    fi

    # cognito-local接続テスト
    log_info "cognito-local接続テスト"
    if curl -f -s http://localhost:9229/health > /dev/null 2>&1; then
        record_test "cognito-local接続" "PASS"
    else
        record_test "cognito-local接続" "FAIL"
    fi

    # データベース機能テスト
    log_info "データベース機能テスト"
    if docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev -c "CREATE TABLE ci_test (id SERIAL PRIMARY KEY); INSERT INTO ci_test DEFAULT VALUES; SELECT COUNT(*) FROM ci_test; DROP TABLE ci_test;" > /dev/null 2>&1; then
        record_test "データベース機能" "PASS"
    else
        record_test "データベース機能" "FAIL"
    fi

    return 0
}

# クリーンアップ
cleanup() {
    log_info "CI/CD環境クリーンアップ"
    docker-compose down -v --remove-orphans > /dev/null 2>&1 || true
    docker system prune -f > /dev/null 2>&1 || true
}

# テスト結果出力
show_results() {
    echo ""
    echo "========================================="
    echo "CI/CD テスト結果"
    echo "========================================="
    echo "成功: $TESTS_PASSED"
    echo "失敗: $TESTS_FAILED"
    echo "合計: $((TESTS_PASSED + TESTS_FAILED))"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "全てのCI/CDテストが成功しました"
        return 0
    else
        log_error "CI/CDテストで失敗がありました"
        return 1
    fi
}

# メイン処理
main() {
    # クリーンアップ設定
    trap cleanup EXIT

    # テスト実行
    run_ci_tests

    # 結果表示
    show_results
}

# 実行
main "$@"
