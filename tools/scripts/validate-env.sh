#!/bin/bash

# ===========================================
# 環境変数検証スクリプト
# ===========================================
# 必要な環境変数が設定されているかチェックし、
# 設定値の妥当性を検証します。

set -e

# 色付きメッセージ用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境変数の存在チェック
check_env_exists() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        log_error "環境変数 $var_name が設定されていません"
        return 1
    fi
    return 0
}

# 環境変数の値チェック
check_env_value() {
    local var_name=$1
    local expected_pattern=$2
    local var_value=${!var_name}

    if [[ ! $var_value =~ $expected_pattern ]]; then
        log_error "環境変数 $var_name の値が不正です: $var_value"
        return 1
    fi
    return 0
}

# .envファイルの存在チェック
check_env_file() {
    if [ ! -f ".env" ]; then
        log_error ".envファイルが見つかりません"
        log_info ".env.exampleをコピーして.envファイルを作成してください:"
        log_info "cp .env.example .env"
        return 1
    fi
    log_success ".envファイルが見つかりました"
    return 0
}

# .envファイルの読み込み
load_env_file() {
    if [ -f ".env" ]; then
        log_info ".envファイルを読み込んでいます..."
        set -a
        source .env
        set +a
        log_success ".envファイルを読み込みました"
    fi
}

# 必須環境変数のチェック
check_required_vars() {
    log_info "必須環境変数をチェックしています..."

    local required_vars=(
        "DATABASE_URL"
        "POSTGRES_PASSWORD"
        "NODE_ENV"
        "PORT"
        "FRONTEND_URL"
        "AWS_REGION"
        "JWT_SECRET"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if ! check_env_exists "$var"; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "以下の必須環境変数が設定されていません:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi

    log_success "すべての必須環境変数が設定されています"
    return 0
}

# データベースURL形式のチェック
check_database_url() {
    log_info "データベースURL形式をチェックしています..."

    local db_url_pattern="^postgresql://[^:]+:[^@]+@[^:]+:[0-9]+/[^/]+$"

    if check_env_exists "DATABASE_URL"; then
        if check_env_value "DATABASE_URL" "$db_url_pattern"; then
            log_success "DATABASE_URLの形式が正しいです"
        else
            log_error "DATABASE_URLの形式が不正です"
            log_info "正しい形式: postgresql://username:password@host:port/database"
            return 1
        fi
    fi

    return 0
}

# ポート番号のチェック
check_port_numbers() {
    log_info "ポート番号をチェックしています..."

    local port_pattern="^[0-9]+$"

    if check_env_exists "PORT"; then
        if check_env_value "PORT" "$port_pattern"; then
            local port_num=$PORT
            if [ "$port_num" -ge 1 ] && [ "$port_num" -le 65535 ]; then
                log_success "PORTの値が正しいです: $port_num"
            else
                log_error "PORTの値が範囲外です: $port_num (1-65535の範囲で設定してください)"
                return 1
            fi
        else
            log_error "PORTの値が数値ではありません: $PORT"
            return 1
        fi
    fi

    return 0
}

# URL形式のチェック
check_url_format() {
    log_info "URL形式をチェックしています..."

    local url_pattern="^https?://[^/]+.*$"

    local url_vars=(
        "FRONTEND_URL"
        "API_BASE_URL"
        "COGNITO_LOCAL_ENDPOINT"
    )

    for var in "${url_vars[@]}"; do
        if check_env_exists "$var"; then
            if check_env_value "$var" "$url_pattern"; then
                log_success "${var}の形式が正しいです"
            else
                log_warning "${var}の形式が不正の可能性があります: ${!var}"
            fi
        fi
    done

    return 0
}

# NODE_ENV値のチェック
check_node_env() {
    log_info "NODE_ENV値をチェックしています..."

    if check_env_exists "NODE_ENV"; then
        local valid_envs=("development" "test" "production")
        local is_valid=false

        for env in "${valid_envs[@]}"; do
            if [ "$NODE_ENV" = "$env" ]; then
                is_valid=true
                break
            fi
        done

        if [ "$is_valid" = true ]; then
            log_success "NODE_ENVの値が正しいです: $NODE_ENV"
        else
            log_warning "NODE_ENVの値が標準的ではありません: $NODE_ENV"
            log_info "推奨値: development, test, production"
        fi
    fi

    return 0
}

# セキュリティチェック
check_security() {
    log_info "セキュリティ設定をチェックしています..."

    # JWT_SECRETの強度チェック
    if check_env_exists "JWT_SECRET"; then
        local jwt_secret_length=${#JWT_SECRET}
        if [ "$jwt_secret_length" -lt 32 ]; then
            log_warning "JWT_SECRETが短すぎます（現在: ${jwt_secret_length}文字）"
            log_info "セキュリティのため32文字以上を推奨します"
        else
            log_success "JWT_SECRETの長さが適切です"
        fi

        # デフォルト値のチェック
        if [ "$JWT_SECRET" = "your_jwt_secret_key_here_change_in_production" ]; then
            log_error "JWT_SECRETがデフォルト値のままです"
            log_info "セキュリティのため独自の値に変更してください"
            return 1
        fi
    fi

    # パスワードのデフォルト値チェック
    if check_env_exists "POSTGRES_PASSWORD"; then
        if [ "$POSTGRES_PASSWORD" = "your_secure_password_here" ]; then
            log_warning "POSTGRES_PASSWORDがデフォルト値のままです"
            log_info "セキュリティのため独自の値に変更することを推奨します"
        fi
    fi

    return 0
}

# Docker環境のチェック
check_docker_environment() {
    log_info "Docker環境をチェックしています..."

    # Dockerの存在チェック
    if ! command -v docker &> /dev/null; then
        log_error "Dockerがインストールされていません"
        return 1
    fi

    # Docker Composeの存在チェック
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Composeがインストールされていません"
        return 1
    fi

    log_success "Docker環境が利用可能です"
    return 0
}

# 設定値の表示
display_config_summary() {
    log_info "設定値サマリー:"
    echo "=================================="
    echo "NODE_ENV: ${NODE_ENV:-未設定}"
    echo "PORT: ${PORT:-未設定}"
    echo "FRONTEND_URL: ${FRONTEND_URL:-未設定}"
    echo "DATABASE_URL: ${DATABASE_URL:-未設定}"
    echo "AWS_REGION: ${AWS_REGION:-未設定}"
    echo "COGNITO_LOCAL_ENDPOINT: ${COGNITO_LOCAL_ENDPOINT:-未設定}"
    echo "=================================="
}

# メイン処理
main() {
    log_info "環境変数検証を開始します..."
    echo

    local exit_code=0

    # .envファイルのチェックと読み込み
    if ! check_env_file; then
        exit_code=1
    else
        load_env_file
    fi

    # 各種チェックの実行
    if ! check_required_vars; then
        exit_code=1
    fi

    if ! check_database_url; then
        exit_code=1
    fi

    if ! check_port_numbers; then
        exit_code=1
    fi

    check_url_format
    check_node_env

    if ! check_security; then
        exit_code=1
    fi

    if ! check_docker_environment; then
        exit_code=1
    fi

    echo
    display_config_summary
    echo

    if [ $exit_code -eq 0 ]; then
        log_success "環境変数検証が完了しました。すべてのチェックに合格しています。"
    else
        log_error "環境変数検証でエラーが発生しました。上記のエラーを修正してください。"
    fi

    exit $exit_code
}

# スクリプトが直接実行された場合のみmain関数を呼び出す
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
