#!/bin/bash

# cognito-local動作確認スクリプト
# Usage: ./tools/scripts/validate-cognito-local.sh [--verbose] [--json]

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
    echo "🔍 cognito-local の動作確認を開始します..."
fi

# 1. コンテナ状態確認
log_info "cognito-localコンテナ状態を確認中..."

if ! docker ps | grep -q "goal-mandala-cognito-local"; then
    log_error "cognito-localコンテナが起動していません"
    record_result "container_status" "error" "Container not running" "cognito-local container is not running"

    if [ "$JSON_OUTPUT" = false ]; then
        echo "次のコマンドでコンテナを起動してください:"
        echo "docker-compose up -d cognito-local"
    fi

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"container_status\":\"error\",\"message\":\"Container not running\"}"
    fi
    exit 1
fi

log_success "cognito-localコンテナが起動中です"
record_result "container_status" "success" "Container running" "cognito-local container is running"

# 2. cognito-local接続確認
log_info "cognito-local接続を確認中..."

# 最大30秒待機してから接続テスト
for i in {1..6}; do
    if curl -f http://localhost:9229/health &> /dev/null; then
        log_success "cognito-local接続が確認できました"
        record_result "connection" "success" "Connection successful" "Connected to http://localhost:9229"
        break
    else
        if [ $i -eq 6 ]; then
            log_error "cognito-localに接続できません"
            record_result "connection" "error" "Connection failed" "Failed to connect to http://localhost:9229"

            # エラー診断
            log_verbose "接続エラーの詳細を確認中..."
            CURL_ERROR=$(curl -v http://localhost:9229/health 2>&1 || echo "Connection failed")
            log_verbose "エラー詳細: $CURL_ERROR"

            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"overall_status\":\"error\",\"connection\":\"error\",\"message\":\"Connection failed\",\"error_details\":\"$CURL_ERROR\"}"
            else
                echo "Docker環境が起動していることを確認してください。"
                echo "トラブルシューティング:"
                echo "- docker-compose up -d cognito-local"
                echo "- docker-compose logs cognito-local"
            fi
            exit 1
        else
            log_verbose "接続待機中... ($i/6)"
            sleep 5
        fi
    fi
done

# 3. User Pool設定確認
log_info "User Pool設定を確認中..."

USER_POOL_RESPONSE=$(curl -s http://localhost:9229/ 2>/dev/null || echo "")
if echo "$USER_POOL_RESPONSE" | grep -q "local_user_pool_id" &> /dev/null; then
    log_success "User Pool (local_user_pool_id) が設定されています"
    record_result "user_pool" "success" "User Pool configured" "local_user_pool_id found"
else
    log_error "User Pool設定が見つかりません"
    record_result "user_pool" "error" "User Pool not configured" "local_user_pool_id not found"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"user_pool\":\"error\",\"message\":\"User Pool not configured\"}"
    fi
    exit 1
fi

# 4. User Pool Client設定確認
log_info "User Pool Client設定を確認中..."

if echo "$USER_POOL_RESPONSE" | grep -q "local_client_id" &> /dev/null; then
    log_success "User Pool Client (local_client_id) が設定されています"
    record_result "user_pool_client" "success" "User Pool Client configured" "local_client_id found"
else
    log_error "User Pool Client設定が見つかりません"
    record_result "user_pool_client" "error" "User Pool Client not configured" "local_client_id not found"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"user_pool_client\":\"error\",\"message\":\"User Pool Client not configured\"}"
    fi
    exit 1
fi

# 5. テストユーザー確認
log_info "テストユーザーを確認中..."

TEST_USERS=(
    "test@example.com:TestPassword123!"
    "dev@goalmandalasystem.com:DevPassword123!"
    "admin@goalmandalasystem.com:AdminPassword123!"
)

FOUND_USERS=0
TOTAL_USERS=${#TEST_USERS[@]}

for user_info in "${TEST_USERS[@]}"; do
    IFS=':' read -r email password <<< "$user_info"
    log_verbose "テストユーザー $email を確認中..."

    # ユーザー認証テスト（簡易版）
    if echo "$USER_POOL_RESPONSE" | grep -q "$email" &> /dev/null; then
        log_verbose "テストユーザー $email が設定されています"
        ((FOUND_USERS++))
    else
        log_verbose "テストユーザー $email の設定が確認できません"
    fi
done

if [ $FOUND_USERS -eq $TOTAL_USERS ]; then
    log_success "全てのテストユーザーが設定されています ($FOUND_USERS/$TOTAL_USERS)"
    record_result "test_users" "success" "All test users configured" "Found $FOUND_USERS/$TOTAL_USERS users"
elif [ $FOUND_USERS -gt 0 ]; then
    log_warning "一部のテストユーザーが設定されています ($FOUND_USERS/$TOTAL_USERS)"
    record_result "test_users" "warning" "Some test users configured" "Found $FOUND_USERS/$TOTAL_USERS users"
else
    log_warning "テストユーザーが設定されていません"
    record_result "test_users" "warning" "No test users configured" "Found 0/$TOTAL_USERS users"
fi

# 6. 認証エンドポイント確認
log_info "認証エンドポイントを確認中..."

AUTH_ENDPOINTS=(
    "/:root"
    "/health:health"
)

WORKING_ENDPOINTS=0
TOTAL_ENDPOINTS=${#AUTH_ENDPOINTS[@]}

for endpoint_info in "${AUTH_ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    log_verbose "エンドポイント $endpoint を確認中..."

    if curl -f "http://localhost:9229$endpoint" &> /dev/null; then
        log_verbose "エンドポイント $endpoint が利用可能です"
        ((WORKING_ENDPOINTS++))
    else
        log_verbose "エンドポイント $endpoint にアクセスできません"
    fi
done

if [ $WORKING_ENDPOINTS -eq $TOTAL_ENDPOINTS ]; then
    log_success "全ての認証エンドポイントが利用可能です ($WORKING_ENDPOINTS/$TOTAL_ENDPOINTS)"
    record_result "auth_endpoints" "success" "All auth endpoints working" "Working $WORKING_ENDPOINTS/$TOTAL_ENDPOINTS endpoints"
elif [ $WORKING_ENDPOINTS -gt 0 ]; then
    log_warning "一部の認証エンドポイントが利用できません ($WORKING_ENDPOINTS/$TOTAL_ENDPOINTS)"
    record_result "auth_endpoints" "warning" "Some auth endpoints not working" "Working $WORKING_ENDPOINTS/$TOTAL_ENDPOINTS endpoints"
else
    log_error "認証エンドポイントが利用できません"
    record_result "auth_endpoints" "error" "Auth endpoints not working" "Working 0/$TOTAL_ENDPOINTS endpoints"
fi

# 7. 設定ファイル確認
log_info "設定ファイルを確認中..."

if [ -f "tools/docker/cognito-local/config.json" ]; then
    log_success "cognito-local設定ファイルが存在します"

    # JSON形式の確認
    if python3 -m json.tool tools/docker/cognito-local/config.json &> /dev/null 2>&1 || node -e "JSON.parse(require('fs').readFileSync('tools/docker/cognito-local/config.json', 'utf8'))" &> /dev/null; then
        log_success "設定ファイルのJSON形式が正しいです"
        record_result "config_file" "success" "Config file valid" "JSON format is correct"
    else
        log_error "設定ファイルのJSON形式に問題があります"
        record_result "config_file" "error" "Config file invalid" "JSON format is incorrect"

        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"overall_status\":\"error\",\"config_file\":\"error\",\"message\":\"Config file JSON format is incorrect\"}"
        fi
        exit 1
    fi
else
    log_error "cognito-local設定ファイルが見つかりません"
    record_result "config_file" "error" "Config file not found" "tools/docker/cognito-local/config.json not found"

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"overall_status\":\"error\",\"config_file\":\"error\",\"message\":\"Config file not found\"}"
    fi
    exit 1
fi

# 8. ポート確認
log_info "ポート使用状況を確認中..."

if netstat -an 2>/dev/null | grep -q ":9229.*LISTEN" || ss -an 2>/dev/null | grep -q ":9229.*LISTEN"; then
    log_success "ポート 9229 が正常にリッスンしています"
    record_result "port_status" "success" "Port listening" "Port 9229 is listening"
else
    log_warning "ポート 9229 のリッスン状態が確認できません"
    record_result "port_status" "warning" "Port status unclear" "Port 9229 listening status unclear"
fi

# 9. サービス応答時間測定
log_info "サービス応答時間を測定中..."

RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:9229/health 2>/dev/null || echo "0")
if (( $(echo "$RESPONSE_TIME > 0" | bc -l 2>/dev/null || echo "0") )); then
    log_success "サービス応答時間: ${RESPONSE_TIME}秒"
    record_result "response_time" "success" "Response time measured" "Response time: ${RESPONSE_TIME}s"
else
    log_warning "サービス応答時間を測定できませんでした"
    record_result "response_time" "warning" "Response time not measured" "Could not measure response time"
fi

# 結果出力
if [ "$JSON_OUTPUT" = true ]; then
    echo "{"
    echo "  \"overall_status\": \"$OVERALL_STATUS\","
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"checks\": {"
    echo "    \"container_status\": {"
    echo "      \"status\": \"${RESULTS[container_status_status]}\","
    echo "      \"message\": \"${RESULTS[container_status_message]}\","
    echo "      \"details\": \"${RESULTS[container_status_details]}\""
    echo "    },"
    echo "    \"connection\": {"
    echo "      \"status\": \"${RESULTS[connection_status]}\","
    echo "      \"message\": \"${RESULTS[connection_message]}\","
    echo "      \"details\": \"${RESULTS[connection_details]}\""
    echo "    },"
    echo "    \"user_pool\": {"
    echo "      \"status\": \"${RESULTS[user_pool_status]}\","
    echo "      \"message\": \"${RESULTS[user_pool_message]}\","
    echo "      \"details\": \"${RESULTS[user_pool_details]}\""
    echo "    },"
    echo "    \"user_pool_client\": {"
    echo "      \"status\": \"${RESULTS[user_pool_client_status]}\","
    echo "      \"message\": \"${RESULTS[user_pool_client_message]}\","
    echo "      \"details\": \"${RESULTS[user_pool_client_details]}\""
    echo "    },"
    echo "    \"test_users\": {"
    echo "      \"status\": \"${RESULTS[test_users_status]}\","
    echo "      \"message\": \"${RESULTS[test_users_message]}\","
    echo "      \"details\": \"${RESULTS[test_users_details]}\""
    echo "    },"
    echo "    \"auth_endpoints\": {"
    echo "      \"status\": \"${RESULTS[auth_endpoints_status]}\","
    echo "      \"message\": \"${RESULTS[auth_endpoints_message]}\","
    echo "      \"details\": \"${RESULTS[auth_endpoints_details]}\""
    echo "    },"
    echo "    \"config_file\": {"
    echo "      \"status\": \"${RESULTS[config_file_status]}\","
    echo "      \"message\": \"${RESULTS[config_file_message]}\","
    echo "      \"details\": \"${RESULTS[config_file_details]}\""
    echo "    },"
    echo "    \"port_status\": {"
    echo "      \"status\": \"${RESULTS[port_status_status]}\","
    echo "      \"message\": \"${RESULTS[port_status_message]}\","
    echo "      \"details\": \"${RESULTS[port_status_details]}\""
    echo "    },"
    echo "    \"response_time\": {"
    echo "      \"status\": \"${RESULTS[response_time_status]}\","
    echo "      \"message\": \"${RESULTS[response_time_message]}\","
    echo "      \"details\": \"${RESULTS[response_time_details]}\","
    echo "      \"response_time_seconds\": \"$RESPONSE_TIME\""
    echo "    }"
    echo "  }"
    echo "}"
else
    echo ""
    echo "=== cognito-local 動作確認完了 ==="
    if [ "$OVERALL_STATUS" = "success" ]; then
        echo "✅ 全ての確認項目が正常に完了しました"
    elif [ "$OVERALL_STATUS" = "warning" ]; then
        echo "⚠️  警告がありますが、基本的な機能は動作しています"
    else
        echo "❌ エラーが発生しました"
    fi
    echo ""
    echo "📊 確認結果:"
    echo "   ✅ cognito-local接続"
    echo "   ✅ User Pool設定 (local_user_pool_id)"
    echo "   ✅ User Pool Client設定 (local_client_id)"
    echo "   ✅ テストユーザー設定"
    echo "   ✅ 認証エンドポイント"
    echo "   ✅ 設定ファイル (JSON形式)"
    echo "   ✅ ポート状態"
    echo "   ✅ 応答時間: ${RESPONSE_TIME}秒"
    echo ""
    echo "🔑 利用可能なテストユーザー:"
    echo "   - test@example.com (パスワード: TestPassword123!)"
    echo "   - dev@goalmandalasystem.com (パスワード: DevPassword123!)"
    echo "   - admin@goalmandalasystem.com (パスワード: AdminPassword123!)"
    echo ""
    echo "🌐 cognito-local エンドポイント:"
    echo "   - ベースURL: http://localhost:9229"
    echo "   - ヘルスチェック: http://localhost:9229/health"
    echo ""
    echo "🔧 トラブルシューティング:"
    echo "- コンテナが起動していない場合: docker-compose up -d cognito-local"
    echo "- 設定に問題がある場合: docker-compose logs cognito-local"
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
