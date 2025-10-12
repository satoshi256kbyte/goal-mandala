#!/bin/bash

# エラー診断とトラブルシューティングスクリプト
# Usage: ./tools/scripts/diagnose-issues.sh [--service SERVICE] [--verbose] [--json]

set -e

# デフォルト設定
SERVICE=""
VERBOSE=false
JSON_OUTPUT=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--service SERVICE] [--verbose] [--json]"
            echo "  --service SERVICE  特定のサービスを診断 (postgres|cognito-local|all)"
            echo "  --verbose          詳細なログを表示"
            echo "  --json             JSON形式で結果を出力"
            echo ""
            echo "Examples:"
            echo "  $0                           # 全サービスの診断"
            echo "  $0 --service postgres        # PostgreSQLのみ診断"
            echo "  $0 --service cognito-local   # cognito-localのみ診断"
            echo "  $0 --verbose                 # 詳細ログ付きで全サービス診断"
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

log_section() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "=== $1 ==="
    fi
}

# JSON結果格納用
declare -A RESULTS
OVERALL_STATUS="success"
ISSUES_FOUND=()
SOLUTIONS=()

# 結果記録関数
record_result() {
    local key="$1"
    local status="$2"
    local message="$3"
    local details="$4"
    local solution="$5"

    RESULTS["${key}_status"]="$status"
    RESULTS["${key}_message"]="$message"
    RESULTS["${key}_details"]="$details"
    RESULTS["${key}_solution"]="$solution"

    if [ "$status" = "error" ]; then
        OVERALL_STATUS="error"
        ISSUES_FOUND+=("$message")
        if [ -n "$solution" ]; then
            SOLUTIONS+=("$solution")
        fi
    elif [ "$status" = "warning" ] && [ "$OVERALL_STATUS" != "error" ]; then
        OVERALL_STATUS="warning"
    fi
}

# システム情報収集
collect_system_info() {
    log_section "システム情報収集"

    # OS情報
    OS_INFO=$(uname -a 2>/dev/null || echo "unknown")
    log_verbose "OS情報: $OS_INFO"

    # Docker情報
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
        log_verbose "Docker: $DOCKER_VERSION"

        # Docker Compose情報
        if command -v docker-compose &> /dev/null; then
            DOCKER_COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || echo "unknown")
        elif docker compose version &> /dev/null; then
            DOCKER_COMPOSE_VERSION=$(docker compose version 2>/dev/null || echo "unknown")
        else
            DOCKER_COMPOSE_VERSION="not found"
        fi
        log_verbose "Docker Compose: $DOCKER_COMPOSE_VERSION"
    else
        log_error "Dockerがインストールされていません"
        record_result "docker" "error" "Docker not installed" "Docker is not available" "Install Docker: https://docs.docker.com/get-docker/"
        return 1
    fi

    # ディスク容量確認
    DISK_USAGE=$(df -h . 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo "unknown")
    if [ "$DISK_USAGE" != "unknown" ] && [ "$DISK_USAGE" -gt 90 ]; then
        log_warning "ディスク使用量が高いです: ${DISK_USAGE}%"
        record_result "disk_space" "warning" "High disk usage" "Disk usage: ${DISK_USAGE}%" "Free up disk space"
    else
        log_verbose "ディスク使用量: ${DISK_USAGE}%"
    fi

    # メモリ使用量確認
    if command -v free &> /dev/null; then
        MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}' 2>/dev/null || echo "unknown")
        log_verbose "メモリ使用量: ${MEMORY_USAGE}%"
    fi

    record_result "system_info" "success" "System information collected" "OS: $OS_INFO, Docker: $DOCKER_VERSION" ""
}

# Docker環境診断
diagnose_docker_environment() {
    log_section "Docker環境診断"

    # docker-compose.yml存在確認
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.ymlが見つかりません"
        record_result "docker_compose_file" "error" "docker-compose.yml not found" "File missing" "Create docker-compose.yml file"
        return 1
    fi

    # docker-compose.yml構文確認
    if docker-compose config &> /dev/null; then
        log_success "docker-compose.yml構文が正しいです"
        record_result "docker_compose_syntax" "success" "docker-compose.yml syntax valid" "Syntax is correct" ""
    else
        log_error "docker-compose.yml構文にエラーがあります"
        SYNTAX_ERROR=$(docker-compose config 2>&1 || echo "Syntax error")
        log_verbose "構文エラー詳細: $SYNTAX_ERROR"
        record_result "docker_compose_syntax" "error" "docker-compose.yml syntax error" "$SYNTAX_ERROR" "Fix docker-compose.yml syntax errors"
        return 1
    fi

    # コンテナ状態確認
    log_info "コンテナ状態を確認中..."

    EXPECTED_SERVICES=("postgres" "cognito-local")
    RUNNING_SERVICES=0

    for service in "${EXPECTED_SERVICES[@]}"; do
        if docker-compose ps "$service" --format "table {{.State}}" | tail -n +2 | grep -q "Up"; then
            log_success "$service コンテナが実行中です"
            ((RUNNING_SERVICES++))
        else
            log_error "$service コンテナが停止しています"

            # コンテナログ確認
            log_verbose "$service コンテナログ（最新10行）:"
            if docker-compose logs "$service" --tail=10 &> /dev/null; then
                docker-compose logs "$service" --tail=10 2>&1 | while read line; do
                    log_verbose "  $line"
                done
            fi

            record_result "container_$service" "error" "$service container not running" "Container is stopped" "Start container: docker-compose up -d $service"
        fi
    done

    if [ $RUNNING_SERVICES -eq ${#EXPECTED_SERVICES[@]} ]; then
        record_result "docker_containers" "success" "All containers running" "All expected containers are running" ""
    else
        record_result "docker_containers" "error" "Some containers not running" "$RUNNING_SERVICES/${#EXPECTED_SERVICES[@]} containers running" "Start all containers: docker-compose up -d"
    fi

    # Docker ネットワーク確認
    log_info "Dockerネットワークを確認中..."

    NETWORK_NAME="goal-mandala-network"
    if docker network ls | grep -q "$NETWORK_NAME"; then
        log_success "Dockerネットワーク ($NETWORK_NAME) が存在します"
        record_result "docker_network" "success" "Docker network exists" "Network: $NETWORK_NAME" ""
    else
        log_warning "Dockerネットワーク ($NETWORK_NAME) が見つかりません"
        record_result "docker_network" "warning" "Docker network not found" "Network: $NETWORK_NAME" "Recreate network: docker-compose down && docker-compose up -d"
    fi

    # Docker ボリューム確認
    log_info "Dockerボリュームを確認中..."

    EXPECTED_VOLUMES=("postgres-data" "cognito-data")
    for volume in "${EXPECTED_VOLUMES[@]}"; do
        FULL_VOLUME_NAME="goal-mandala_$volume"
        if docker volume ls | grep -q "$FULL_VOLUME_NAME"; then
            log_success "Dockerボリューム ($volume) が存在します"
        else
            log_warning "Dockerボリューム ($volume) が見つかりません"
            record_result "docker_volume_$volume" "warning" "Docker volume not found" "Volume: $volume" "Recreate volume: docker-compose down -v && docker-compose up -d"
        fi
    done
}

# PostgreSQL診断
diagnose_postgresql() {
    log_section "PostgreSQL診断"

    # コンテナ存在確認
    if ! docker ps -a | grep -q "goal-mandala-postgres"; then
        log_error "PostgreSQLコンテナが見つかりません"
        record_result "postgres_container" "error" "PostgreSQL container not found" "Container does not exist" "Create container: docker-compose up -d postgres"
        return 1
    fi

    # コンテナ状態確認
    POSTGRES_STATUS=$(docker inspect --format='{{.State.Status}}' goal-mandala-postgres 2>/dev/null || echo "unknown")
    if [ "$POSTGRES_STATUS" = "running" ]; then
        log_success "PostgreSQLコンテナが実行中です"
    else
        log_error "PostgreSQLコンテナが停止しています (状態: $POSTGRES_STATUS)"
        record_result "postgres_status" "error" "PostgreSQL container not running" "Status: $POSTGRES_STATUS" "Start container: docker-compose up -d postgres"
        return 1
    fi

    # ヘルスチェック確認
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' goal-mandala-postgres 2>/dev/null || echo "unknown")
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        log_success "PostgreSQLヘルスチェックが正常です"
        record_result "postgres_health" "success" "PostgreSQL health check healthy" "Status: $HEALTH_STATUS" ""
    else
        log_warning "PostgreSQLヘルスチェックが異常です (状態: $HEALTH_STATUS)"
        record_result "postgres_health" "warning" "PostgreSQL health check not healthy" "Status: $HEALTH_STATUS" "Wait for container to be ready or restart: docker-compose restart postgres"
    fi

    # 接続テスト
    log_info "PostgreSQL接続をテスト中..."

    if docker exec goal-mandala-postgres pg_isready -U goal_mandala_user -d goal_mandala_dev &> /dev/null; then
        log_success "PostgreSQL接続が正常です"
        record_result "postgres_connection" "success" "PostgreSQL connection successful" "Connection established" ""
    else
        log_error "PostgreSQL接続に失敗しました"

        # 詳細エラー情報
        CONNECTION_ERROR=$(docker exec goal-mandala-postgres pg_isready -U goal_mandala_user -d goal_mandala_dev 2>&1 || echo "Connection failed")
        log_verbose "接続エラー詳細: $CONNECTION_ERROR"

        record_result "postgres_connection" "error" "PostgreSQL connection failed" "$CONNECTION_ERROR" "Check database credentials and restart container"
        return 1
    fi

    # データベース存在確認
    log_info "データベース存在を確認中..."

    DATABASES=("goal_mandala_dev" "goal_mandala_test")
    for db in "${DATABASES[@]}"; do
        if docker exec goal-mandala-postgres psql -U goal_mandala_user -d "$db" -c "SELECT 1;" &> /dev/null; then
            log_success "データベース ($db) が利用可能です"
        else
            log_error "データベース ($db) にアクセスできません"

            # データベース作成確認
            DB_EXISTS=$(docker exec goal-mandala-postgres psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$db';" 2>/dev/null | tr -d ' \n')
            if [ "$DB_EXISTS" = "1" ]; then
                log_verbose "データベース ($db) は存在しますが、アクセス権限に問題があります"
                record_result "postgres_db_$db" "error" "Database access denied" "Database exists but access denied" "Check user permissions"
            else
                log_verbose "データベース ($db) が存在しません"
                record_result "postgres_db_$db" "error" "Database not found" "Database does not exist" "Run initialization script: docker-compose exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init.sql"
            fi
        fi
    done

    # 拡張機能確認
    log_info "PostgreSQL拡張機能を確認中..."

    UUID_EXT_CHECK=$(docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');" 2>/dev/null | tr -d ' \n')
    if [ "$UUID_EXT_CHECK" = "t" ]; then
        log_success "uuid-ossp拡張機能が有効です"
        record_result "postgres_uuid_ext" "success" "UUID extension enabled" "uuid-ossp extension is active" ""
    else
        log_warning "uuid-ossp拡張機能が無効です"
        record_result "postgres_uuid_ext" "warning" "UUID extension disabled" "uuid-ossp extension is not active" "Enable extension: docker exec goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c \"CREATE EXTENSION IF NOT EXISTS \\\"uuid-ossp\\\";\""
    fi

    # ポート確認
    log_info "PostgreSQLポートを確認中..."

    if netstat -an 2>/dev/null | grep -q ":5432.*LISTEN" || ss -an 2>/dev/null | grep -q ":5432.*LISTEN"; then
        log_success "PostgreSQLポート (5432) がリッスン中です"
        record_result "postgres_port" "success" "PostgreSQL port listening" "Port 5432 is listening" ""
    else
        log_warning "PostgreSQLポート (5432) がリッスンしていません"
        record_result "postgres_port" "warning" "PostgreSQL port not listening" "Port 5432 is not listening" "Check port mapping in docker-compose.yml"
    fi

    # ログ確認
    if [ "$VERBOSE" = true ]; then
        log_info "PostgreSQLログ（最新10行）:"
        docker-compose logs postgres --tail=10 2>&1 | while read line; do
            log_verbose "  $line"
        done
    fi
}

# cognito-local診断
diagnose_cognito_local() {
    log_section "cognito-local診断"

    # コンテナ存在確認
    if ! docker ps -a | grep -q "goal-mandala-cognito-local"; then
        log_error "cognito-localコンテナが見つかりません"
        record_result "cognito_container" "error" "cognito-local container not found" "Container does not exist" "Create container: docker-compose up -d cognito-local"
        return 1
    fi

    # コンテナ状態確認
    COGNITO_STATUS=$(docker inspect --format='{{.State.Status}}' goal-mandala-cognito-local 2>/dev/null || echo "unknown")
    if [ "$COGNITO_STATUS" = "running" ]; then
        log_success "cognito-localコンテナが実行中です"
    else
        log_error "cognito-localコンテナが停止しています (状態: $COGNITO_STATUS)"
        record_result "cognito_status" "error" "cognito-local container not running" "Status: $COGNITO_STATUS" "Start container: docker-compose up -d cognito-local"
        return 1
    fi

    # 接続テスト
    log_info "cognito-local接続をテスト中..."

    # 最大30秒待機
    CONNECTED=false
    for i in {1..6}; do
        if curl -f http://localhost:9229/health &> /dev/null; then
            log_success "cognito-local接続が正常です"
            record_result "cognito_connection" "success" "cognito-local connection successful" "Connection established" ""
            CONNECTED=true
            break
        else
            if [ $i -eq 6 ]; then
                log_error "cognito-local接続に失敗しました"

                # 詳細エラー情報
                CONNECTION_ERROR=$(curl -v http://localhost:9229/health 2>&1 || echo "Connection failed")
                log_verbose "接続エラー詳細: $CONNECTION_ERROR"

                record_result "cognito_connection" "error" "cognito-local connection failed" "$CONNECTION_ERROR" "Check container logs and restart: docker-compose restart cognito-local"
                return 1
            else
                log_verbose "cognito-local接続待機中... ($i/6)"
                sleep 5
            fi
        fi
    done

    if [ "$CONNECTED" = true ]; then
        # 設定確認
        log_info "cognito-local設定を確認中..."

        USER_POOL_RESPONSE=$(curl -s http://localhost:9229/ 2>/dev/null || echo "")

        # User Pool確認
        if echo "$USER_POOL_RESPONSE" | grep -q "local_user_pool_id" &> /dev/null; then
            log_success "User Pool設定が正常です"
            record_result "cognito_user_pool" "success" "User Pool configured" "local_user_pool_id found" ""
        else
            log_error "User Pool設定に問題があります"
            record_result "cognito_user_pool" "error" "User Pool not configured" "local_user_pool_id not found" "Check config.json file"
        fi

        # User Pool Client確認
        if echo "$USER_POOL_RESPONSE" | grep -q "local_client_id" &> /dev/null; then
            log_success "User Pool Client設定が正常です"
            record_result "cognito_client" "success" "User Pool Client configured" "local_client_id found" ""
        else
            log_error "User Pool Client設定に問題があります"
            record_result "cognito_client" "error" "User Pool Client not configured" "local_client_id not found" "Check config.json file"
        fi

        # 応答時間測定
        RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:9229/health 2>/dev/null || echo "0")
        if (( $(echo "$RESPONSE_TIME > 0" | bc -l 2>/dev/null || echo "0") )); then
            log_verbose "cognito-local応答時間: ${RESPONSE_TIME}秒"

            if (( $(echo "$RESPONSE_TIME > 5" | bc -l 2>/dev/null || echo "0") )); then
                log_warning "cognito-local応答時間が遅いです: ${RESPONSE_TIME}秒"
                record_result "cognito_performance" "warning" "Slow response time" "Response time: ${RESPONSE_TIME}s" "Check system resources"
            fi
        fi
    fi

    # 設定ファイル確認
    log_info "cognito-local設定ファイルを確認中..."

    CONFIG_FILE="tools/docker/cognito-local/config.json"
    if [ -f "$CONFIG_FILE" ]; then
        log_success "設定ファイルが存在します"

        # JSON構文確認
        if python3 -m json.tool "$CONFIG_FILE" &> /dev/null 2>&1 || node -e "JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8'))" &> /dev/null; then
            log_success "設定ファイルのJSON構文が正しいです"
            record_result "cognito_config_syntax" "success" "Config file JSON syntax valid" "JSON syntax is correct" ""
        else
            log_error "設定ファイルのJSON構文にエラーがあります"
            record_result "cognito_config_syntax" "error" "Config file JSON syntax error" "JSON syntax is incorrect" "Fix JSON syntax in config.json"
        fi

        # 設定内容確認
        if grep -q "local_user_pool_id" "$CONFIG_FILE" && grep -q "local_client_id" "$CONFIG_FILE"; then
            log_success "設定ファイルに必要な設定が含まれています"
            record_result "cognito_config_content" "success" "Config file content valid" "Required settings found" ""
        else
            log_error "設定ファイルに必要な設定が不足しています"
            record_result "cognito_config_content" "error" "Config file content invalid" "Required settings missing" "Add User Pool and Client settings to config.json"
        fi
    else
        log_error "設定ファイルが見つかりません"
        record_result "cognito_config_file" "error" "Config file not found" "File does not exist" "Create config.json file"
    fi

    # ポート確認
    log_info "cognito-localポートを確認中..."

    if netstat -an 2>/dev/null | grep -q ":9229.*LISTEN" || ss -an 2>/dev/null | grep -q ":9229.*LISTEN"; then
        log_success "cognito-localポート (9229) がリッスン中です"
        record_result "cognito_port" "success" "cognito-local port listening" "Port 9229 is listening" ""
    else
        log_warning "cognito-localポート (9229) がリッスンしていません"
        record_result "cognito_port" "warning" "cognito-local port not listening" "Port 9229 is not listening" "Check port mapping in docker-compose.yml"
    fi

    # ログ確認
    if [ "$VERBOSE" = true ]; then
        log_info "cognito-localログ（最新10行）:"
        docker-compose logs cognito-local --tail=10 2>&1 | while read line; do
            log_verbose "  $line"
        done
    fi
}

# 環境変数診断
diagnose_environment_variables() {
    log_section "環境変数診断"

    # .envファイル確認
    if [ -f ".env" ]; then
        log_success ".envファイルが存在します"

        # 重要な環境変数確認
        source .env 2>/dev/null || true

        # POSTGRES_PASSWORD確認
        if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_secure_password_here" ]; then
            log_warning "POSTGRES_PASSWORDがデフォルト値のままです"
            record_result "env_postgres_password" "warning" "Default PostgreSQL password" "Using default password" "Change POSTGRES_PASSWORD in .env file"
        else
            log_success "POSTGRES_PASSWORDが設定されています"
            record_result "env_postgres_password" "success" "PostgreSQL password configured" "Password is set" ""
        fi

        # DATABASE_URL確認
        if [ -z "$DATABASE_URL" ]; then
            log_warning "DATABASE_URLが設定されていません"
            record_result "env_database_url" "warning" "DATABASE_URL not set" "Variable is empty" "Set DATABASE_URL in .env file"
        else
            log_success "DATABASE_URLが設定されています"
            record_result "env_database_url" "success" "DATABASE_URL configured" "URL is set" ""
        fi

        # その他の重要な環境変数
        REQUIRED_VARS=("COGNITO_LOCAL_ENDPOINT" "COGNITO_USER_POOL_ID" "COGNITO_CLIENT_ID")
        for var in "${REQUIRED_VARS[@]}"; do
            if [ -z "${!var}" ]; then
                log_warning "$var が設定されていません"
                record_result "env_$var" "warning" "$var not set" "Variable is empty" "Set $var in .env file"
            else
                log_verbose "$var が設定されています"
            fi
        done

    else
        log_error ".envファイルが見つかりません"
        record_result "env_file" "error" ".env file not found" "File does not exist" "Copy .env.example to .env and configure"

        # .env.example確認
        if [ -f ".env.example" ]; then
            log_info ".env.exampleファイルが存在します"
            record_result "env_example" "success" ".env.example exists" "Template file available" ""
        else
            log_error ".env.exampleファイルも見つかりません"
            record_result "env_example" "error" ".env.example not found" "Template file missing" "Create .env.example file"
        fi
    fi
}

# 結果出力
output_results() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"overall_status\": \"$OVERALL_STATUS\","
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"issues_found\": ${#ISSUES_FOUND[@]},"
        echo "  \"solutions_available\": ${#SOLUTIONS[@]},"
        echo "  \"checks\": {"

        # 結果をJSON形式で出力
        local first=true
        for key in "${!RESULTS[@]}"; do
            if [[ $key == *"_status" ]]; then
                local base_key=${key%_status}
                if [ "$first" = true ]; then
                    first=false
                else
                    echo ","
                fi
                echo "    \"$base_key\": {"
                echo "      \"status\": \"${RESULTS[${base_key}_status]}\","
                echo "      \"message\": \"${RESULTS[${base_key}_message]}\","
                echo "      \"details\": \"${RESULTS[${base_key}_details]}\","
                echo "      \"solution\": \"${RESULTS[${base_key}_solution]}\""
                echo -n "    }"
            fi
        done
        echo ""
        echo "  },"
        echo "  \"issues\": ["
        for i in "${!ISSUES_FOUND[@]}"; do
            echo "    \"${ISSUES_FOUND[$i]}\""
            if [ $i -lt $((${#ISSUES_FOUND[@]} - 1)) ]; then
                echo ","
            fi
        done
        echo "  ],"
        echo "  \"solutions\": ["
        for i in "${!SOLUTIONS[@]}"; do
            echo "    \"${SOLUTIONS[$i]}\""
            if [ $i -lt $((${#SOLUTIONS[@]} - 1)) ]; then
                echo ","
            fi
        done
        echo "  ]"
        echo "}"
    else
        echo ""
        echo "=== 診断結果サマリー ==="

        if [ ${#ISSUES_FOUND[@]} -eq 0 ]; then
            log_success "問題は見つかりませんでした"
        else
            log_error "${#ISSUES_FOUND[@]}件の問題が見つかりました"
            echo ""
            echo "🔍 発見された問題:"
            for issue in "${ISSUES_FOUND[@]}"; do
                echo "   - $issue"
            done
        fi

        if [ ${#SOLUTIONS[@]} -gt 0 ]; then
            echo ""
            echo "💡 推奨される解決策:"
            for solution in "${SOLUTIONS[@]}"; do
                echo "   - $solution"
            done
        fi

        echo ""
        echo "🔧 一般的なトラブルシューティング手順:"
        echo "   1. Docker環境をリセット: docker-compose down -v && docker-compose up -d"
        echo "   2. 設定ファイルを確認: .env, docker-compose.yml"
        echo "   3. ログを確認: docker-compose logs"
        echo "   4. ポート競合を確認: netstat -an | grep -E ':(5432|9229)'"
        echo "   5. ディスク容量を確認: df -h"
        echo ""
        echo "📞 さらなるサポートが必要な場合:"
        echo "   - 詳細診断: $0 --verbose"
        echo "   - 特定サービス診断: $0 --service postgres または $0 --service cognito-local"
        echo "   - JSON出力: $0 --json"
    fi
}

# メイン実行
main() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "🔍 エラー診断とトラブルシューティングを開始します..."
        if [ -n "$SERVICE" ]; then
            echo "対象サービス: $SERVICE"
        fi
    fi

    # システム情報収集
    collect_system_info

    # Docker環境診断
    if [ -z "$SERVICE" ] || [ "$SERVICE" = "all" ]; then
        diagnose_docker_environment
    fi

    # サービス別診断
    if [ -z "$SERVICE" ] || [ "$SERVICE" = "all" ] || [ "$SERVICE" = "postgres" ]; then
        diagnose_postgresql
    fi

    if [ -z "$SERVICE" ] || [ "$SERVICE" = "all" ] || [ "$SERVICE" = "cognito-local" ]; then
        diagnose_cognito_local
    fi

    # 環境変数診断
    if [ -z "$SERVICE" ] || [ "$SERVICE" = "all" ]; then
        diagnose_environment_variables
    fi

    # 結果出力
    output_results

    # 終了コード設定
    if [ "$OVERALL_STATUS" = "error" ]; then
        exit 1
    elif [ "$OVERALL_STATUS" = "warning" ]; then
        exit 2
    else
        exit 0
    fi
}

# スクリプト実行
main "$@"
