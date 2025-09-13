#!/bin/bash

# Cognito設定検証スクリプト
# 使用方法: ./scripts/validate-cognito-config.sh [environment]

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 使用方法を表示
show_usage() {
    cat << EOF
Cognito設定検証スクリプト

使用方法:
    $0 [environment]

引数:
    environment     検証する環境 (local|dev|stg|prod|all)
                   省略時は全環境を検証

例:
    $0              # 全環境の設定を検証
    $0 dev          # 開発環境のみ検証
    $0 all          # 全環境の設定を検証

EOF
}

# 設定検証関数
validate_cognito_config() {
    local env=$1
    local config_file="config/${env}.json"

    log_info "=== $env 環境の設定検証 ==="

    if [ ! -f "$config_file" ]; then
        log_error "設定ファイルが見つかりません: $config_file"
        return 1
    fi

    local errors=0

    # JSON形式の検証
    if ! jq empty "$config_file" 2>/dev/null; then
        log_error "JSONファイルの形式が正しくありません: $config_file"
        return 1
    fi

    # 基本設定の検証
    local stack_prefix=$(jq -r '.stackPrefix' "$config_file")
    local region=$(jq -r '.region' "$config_file")
    local environment=$(jq -r '.environment' "$config_file")

    if [ "$stack_prefix" = "null" ] || [ -z "$stack_prefix" ]; then
        log_error "stackPrefixが設定されていません"
        ((errors++))
    else
        log_success "stackPrefix: $stack_prefix"
    fi

    if [ "$region" = "null" ] || [ -z "$region" ]; then
        log_error "regionが設定されていません"
        ((errors++))
    else
        log_success "region: $region"
    fi

    if [ "$environment" = "null" ] || [ -z "$environment" ]; then
        log_error "environmentが設定されていません"
        ((errors++))
    else
        log_success "environment: $environment"
    fi

    # Cognito設定の検証
    local cognito_config=$(jq '.cognito' "$config_file")

    if [ "$cognito_config" = "null" ]; then
        log_error "Cognito設定が見つかりません"
        ((errors++))
        return $errors
    fi

    # User Pool設定の検証
    local user_pool_config=$(jq '.cognito.userPool' "$config_file")

    if [ "$user_pool_config" = "null" ]; then
        log_error "User Pool設定が見つかりません"
        ((errors++))
    else
        log_success "User Pool設定: 存在"

        # パスワードポリシーの検証
        local password_policy=$(jq '.cognito.userPool.passwordPolicy' "$config_file")
        if [ "$password_policy" = "null" ]; then
            log_error "パスワードポリシーが設定されていません"
            ((errors++))
        else
            local min_length=$(jq -r '.cognito.userPool.passwordPolicy.minLength' "$config_file")
            if [ "$min_length" = "null" ] || [ "$min_length" -lt 6 ]; then
                log_warning "パスワード最小文字数が推奨値未満です: $min_length"
            else
                log_success "パスワード最小文字数: $min_length"
            fi
        fi

        # メール設定の検証
        local email_settings=$(jq '.cognito.userPool.emailSettings' "$config_file")
        if [ "$email_settings" = "null" ]; then
            log_error "メール設定が見つかりません"
            ((errors++))
        else
            local from_email=$(jq -r '.cognito.userPool.emailSettings.fromEmail' "$config_file")
            local use_ses=$(jq -r '.cognito.userPool.emailSettings.useSes' "$config_file")

            if [ "$from_email" = "null" ] || [ -z "$from_email" ]; then
                log_error "送信者メールアドレスが設定されていません"
                ((errors++))
            else
                log_success "送信者メールアドレス: $from_email"
            fi

            if [ "$use_ses" = "true" ] && [ "$env" != "local" ]; then
                local ses_config_set=$(jq -r '.cognito.userPool.emailSettings.sesConfigurationSet' "$config_file")
                if [ "$ses_config_set" = "null" ] || [ -z "$ses_config_set" ]; then
                    log_warning "SES使用時はConfiguration Setの設定を推奨します"
                else
                    log_success "SES Configuration Set: $ses_config_set"
                fi
            fi
        fi
    fi

    # User Pool Client設定の検証
    local client_config=$(jq '.cognito.userPoolClient' "$config_file")

    if [ "$client_config" = "null" ]; then
        log_error "User Pool Client設定が見つかりません"
        ((errors++))
    else
        log_success "User Pool Client設定: 存在"

        # 認証フローの検証
        local auth_flows=$(jq '.cognito.userPoolClient.authFlows' "$config_file")
        if [ "$auth_flows" = "null" ]; then
            log_error "認証フロー設定が見つかりません"
            ((errors++))
        else
            local allow_user_password=$(jq -r '.cognito.userPoolClient.authFlows.allowUserPasswordAuth' "$config_file")
            if [ "$allow_user_password" = "true" ] && [ "$env" = "prod" ]; then
                log_warning "本番環境でUSER_PASSWORD_AUTH認証フローが有効になっています（セキュリティリスク）"
            fi
        fi

        # OAuth設定の検証
        local oauth_config=$(jq '.cognito.userPoolClient.oAuth' "$config_file")
        if [ "$oauth_config" = "null" ]; then
            log_error "OAuth設定が見つかりません"
            ((errors++))
        else
            local callback_urls=$(jq -r '.cognito.userPoolClient.oAuth.callbackUrls[]' "$config_file" 2>/dev/null)
            if [ -z "$callback_urls" ]; then
                log_error "コールバックURLが設定されていません"
                ((errors++))
            else
                log_success "コールバックURL設定: 存在"
            fi
        fi
    fi

    # IAM設定の検証
    local iam_config=$(jq '.cognito.iam' "$config_file")

    if [ "$iam_config" = "null" ]; then
        log_warning "IAM設定が見つかりません（オプション）"
    else
        log_success "IAM設定: 存在"

        # Lambda Role設定の検証
        local lambda_role_config=$(jq '.cognito.iam.lambdaRole' "$config_file")
        if [ "$lambda_role_config" != "null" ]; then
            local cognito_permissions=$(jq '.cognito.iam.lambdaRole.cognitoPermissions' "$config_file")
            if [ "$cognito_permissions" = "null" ]; then
                log_warning "Cognito権限設定が見つかりません"
            else
                log_success "Cognito権限設定: 存在"
            fi
        fi
    fi

    # 環境固有の検証
    case $env in
        local)
            # ローカル環境固有の検証
            local deletion_protection=$(jq -r '.cognito.userPool.deletionProtection' "$config_file")
            if [ "$deletion_protection" = "true" ]; then
                log_warning "ローカル環境で削除保護が有効になっています"
            fi
            ;;
        dev)
            # 開発環境固有の検証
            local advanced_security=$(jq -r '.cognito.userPool.security.enableAdvancedSecurity' "$config_file")
            if [ "$advanced_security" = "true" ]; then
                log_info "開発環境で高度なセキュリティ機能が有効です"
            fi
            ;;
        stg)
            # ステージング環境固有の検証
            local deletion_protection=$(jq -r '.cognito.userPool.deletionProtection' "$config_file")
            if [ "$deletion_protection" != "true" ]; then
                log_warning "ステージング環境で削除保護が無効になっています"
            fi
            ;;
        prod)
            # 本番環境固有の検証
            local deletion_protection=$(jq -r '.cognito.userPool.deletionProtection' "$config_file")
            if [ "$deletion_protection" != "true" ]; then
                log_error "本番環境で削除保護が無効になっています"
                ((errors++))
            fi

            local advanced_security=$(jq -r '.cognito.userPool.security.enableAdvancedSecurity' "$config_file")
            if [ "$advanced_security" != "true" ]; then
                log_warning "本番環境で高度なセキュリティ機能が無効になっています"
            fi

            local mfa_config=$(jq -r '.cognito.userPool.security.mfaConfiguration' "$config_file")
            if [ "$mfa_config" = "OFF" ]; then
                log_warning "本番環境でMFAが無効になっています"
            fi
            ;;
    esac

    if [ $errors -eq 0 ]; then
        log_success "$env 環境の設定検証完了（エラーなし）"
    else
        log_error "$env 環境の設定検証完了（$errors 個のエラー）"
    fi

    echo
    return $errors
}

# メイン処理
ENVIRONMENT=${1:-"all"}

if [ "$ENVIRONMENT" = "--help" ]; then
    show_usage
    exit 0
fi

total_errors=0

case $ENVIRONMENT in
    all)
        log_info "全環境のCognito設定を検証します"
        echo

        for env in local dev stg prod; do
            if validate_cognito_config "$env"; then
                :
            else
                ((total_errors += $?))
            fi
        done
        ;;
    local|dev|stg|prod)
        validate_cognito_config "$ENVIRONMENT"
        total_errors=$?
        ;;
    *)
        log_error "無効な環境: $ENVIRONMENT"
        log_error "有効な環境: local, dev, stg, prod, all"
        exit 1
        ;;
esac

# 結果サマリー
echo "=== 検証結果サマリー ==="
if [ $total_errors -eq 0 ]; then
    log_success "全ての設定検証が完了しました（エラーなし）"
    exit 0
else
    log_error "設定検証が完了しました（合計 $total_errors 個のエラー）"
    exit 1
fi
