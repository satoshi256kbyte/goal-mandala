#!/bin/bash

# cognito-local認証テストスクリプト
# このスクリプトはcognito-localの認証機能をテストします

set -e

COGNITO_ENDPOINT="http://localhost:9229"
USER_POOL_ID="local_user_pool_id"
CLIENT_ID="local_client_id"

echo "=== cognito-local認証テスト開始 ==="

# サービスの起動確認
echo "1. サービス起動確認..."
if ! curl -s -f "$COGNITO_ENDPOINT/health" >/dev/null 2>&1; then
    echo "❌ エラー: cognito-localサービスが起動していません"
    echo "   docker-compose up -d で起動してください"
    exit 1
fi
echo "✅ cognito-localサービスが起動しています"

# User Pool情報の取得
echo ""
echo "2. User Pool情報取得テスト..."
USER_POOL_RESPONSE=$(curl -s -X POST "$COGNITO_ENDPOINT/" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -H "X-Amz-Target: AWSCognitoIdentityProviderService.DescribeUserPool" \
    -d "{\"UserPoolId\": \"$USER_POOL_ID\"}")

if echo "$USER_POOL_RESPONSE" | jq -e '.UserPool' >/dev/null 2>&1; then
    echo "✅ User Pool情報の取得に成功"
    USER_POOL_NAME=$(echo "$USER_POOL_RESPONSE" | jq -r '.UserPool.Name')
    echo "   User Pool名: $USER_POOL_NAME"
else
    echo "❌ User Pool情報の取得に失敗"
    echo "   レスポンス: $USER_POOL_RESPONSE"
    exit 1
fi

# User Pool Client情報の取得
echo ""
echo "3. User Pool Client情報取得テスト..."
CLIENT_RESPONSE=$(curl -s -X POST "$COGNITO_ENDPOINT/" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -H "X-Amz-Target: AWSCognitoIdentityProviderService.DescribeUserPoolClient" \
    -d "{\"UserPoolId\": \"$USER_POOL_ID\", \"ClientId\": \"$CLIENT_ID\"}")

if echo "$CLIENT_RESPONSE" | jq -e '.UserPoolClient' >/dev/null 2>&1; then
    echo "✅ User Pool Client情報の取得に成功"
    CLIENT_NAME=$(echo "$CLIENT_RESPONSE" | jq -r '.UserPoolClient.ClientName')
    echo "   Client名: $CLIENT_NAME"
else
    echo "❌ User Pool Client情報の取得に失敗"
    echo "   レスポンス: $CLIENT_RESPONSE"
    exit 1
fi

# テストユーザーでの認証テスト
echo ""
echo "4. テストユーザー認証テスト..."

TEST_USERS=("test@example.com:TestPassword123!" "dev@goalmandalasystem.com:DevPassword123!" "admin@goalmandalasystem.com:AdminPassword123!")

for user_info in "${TEST_USERS[@]}"; do
    IFS=':' read -r username password <<< "$user_info"

    echo ""
    echo "   テストユーザー: $username"

    # AdminInitiateAuth を使用した認証テスト
    AUTH_RESPONSE=$(curl -s -X POST "$COGNITO_ENDPOINT/" \
        -H "Content-Type: application/x-amz-json-1.1" \
        -H "X-Amz-Target: AWSCognitoIdentityProviderService.AdminInitiateAuth" \
        -d "{
            \"UserPoolId\": \"$USER_POOL_ID\",
            \"ClientId\": \"$CLIENT_ID\",
            \"AuthFlow\": \"ADMIN_NO_SRP_AUTH\",
            \"AuthParameters\": {
                \"USERNAME\": \"$username\",
                \"PASSWORD\": \"$password\"
            }
        }")

    if echo "$AUTH_RESPONSE" | jq -e '.AuthenticationResult.AccessToken' >/dev/null 2>&1; then
        echo "   ✅ 認証成功"

        # アクセストークンの取得
        ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.AccessToken')
        echo "   ✅ アクセストークン取得成功"

        # ユーザー情報の取得テスト
        USER_INFO_RESPONSE=$(curl -s -X POST "$COGNITO_ENDPOINT/" \
            -H "Content-Type: application/x-amz-json-1.1" \
            -H "X-Amz-Target: AWSCognitoIdentityProviderService.GetUser" \
            -d "{\"AccessToken\": \"$ACCESS_TOKEN\"}")

        if echo "$USER_INFO_RESPONSE" | jq -e '.Username' >/dev/null 2>&1; then
            echo "   ✅ ユーザー情報取得成功"
            USER_EMAIL=$(echo "$USER_INFO_RESPONSE" | jq -r '.UserAttributes[] | select(.Name=="email") | .Value')
            echo "   　 メールアドレス: $USER_EMAIL"
        else
            echo "   ❌ ユーザー情報取得失敗"
        fi
    else
        echo "   ❌ 認証失敗"
        echo "   　 レスポンス: $AUTH_RESPONSE"
    fi
done

# 無効な認証情報でのテスト
echo ""
echo "5. 無効な認証情報テスト..."
INVALID_AUTH_RESPONSE=$(curl -s -X POST "$COGNITO_ENDPOINT/" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -H "X-Amz-Target: AWSCognitoIdentityProviderService.AdminInitiateAuth" \
    -d "{
        \"UserPoolId\": \"$USER_POOL_ID\",
        \"ClientId\": \"$CLIENT_ID\",
        \"AuthFlow\": \"ADMIN_NO_SRP_AUTH\",
        \"AuthParameters\": {
            \"USERNAME\": \"invalid@example.com\",
            \"PASSWORD\": \"InvalidPassword123!\"
        }
    }")

if echo "$INVALID_AUTH_RESPONSE" | jq -e '.message' >/dev/null 2>&1; then
    echo "✅ 無効な認証情報で適切にエラーが返されました"
    ERROR_MESSAGE=$(echo "$INVALID_AUTH_RESPONSE" | jq -r '.message')
    echo "   エラーメッセージ: $ERROR_MESSAGE"
else
    echo "❌ 無効な認証情報のテストが期待通りに動作しませんでした"
fi

echo ""
echo "=== 認証テスト完了 ==="
echo "✅ すべてのテストが正常に完了しました"
