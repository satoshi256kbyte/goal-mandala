#!/bin/bash

# cognito-local設定検証スクリプト
# このスクリプトはcognito-localの設定が正しく動作するかを検証します

set -e

echo "=== cognito-local設定検証開始 ==="

# 設定ファイルの存在確認
CONFIG_FILE="./config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ エラー: config.jsonが見つかりません"
    exit 1
fi

echo "✅ config.jsonファイルが存在します"

# JSONの構文チェック
if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    echo "❌ エラー: config.jsonの構文が正しくありません"
    exit 1
fi

echo "✅ config.jsonの構文は正しいです"

# 必要なセクションの存在確認
REQUIRED_SECTIONS=("UserPools" "UserPoolClients" "Users")

for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! jq -e ".$section" "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "❌ エラー: $section セクションが見つかりません"
        exit 1
    fi
    echo "✅ $section セクションが存在します"
done

# User Pool設定の確認
USER_POOL_ID=$(jq -r '.UserPools | keys[0]' "$CONFIG_FILE")
if [ "$USER_POOL_ID" = "null" ] || [ -z "$USER_POOL_ID" ]; then
    echo "❌ エラー: User Pool IDが設定されていません"
    exit 1
fi

echo "✅ User Pool ID: $USER_POOL_ID"

# User Pool Client設定の確認
CLIENT_ID=$(jq -r '.UserPoolClients | keys[0]' "$CONFIG_FILE")
if [ "$CLIENT_ID" = "null" ] || [ -z "$CLIENT_ID" ]; then
    echo "❌ エラー: Client IDが設定されていません"
    exit 1
fi

echo "✅ Client ID: $CLIENT_ID"

# パスワードポリシーの確認
MIN_LENGTH=$(jq -r ".UserPools.\"$USER_POOL_ID\".Policies.PasswordPolicy.MinimumLength" "$CONFIG_FILE")
if [ "$MIN_LENGTH" = "null" ] || [ "$MIN_LENGTH" -lt 8 ]; then
    echo "❌ エラー: パスワードの最小長が8文字未満です"
    exit 1
fi

echo "✅ パスワード最小長: $MIN_LENGTH文字"

# 認証フローの確認
AUTH_FLOWS=$(jq -r ".UserPoolClients.\"$CLIENT_ID\".ExplicitAuthFlows[]" "$CONFIG_FILE")
REQUIRED_FLOWS=("USER_PASSWORD_AUTH" "ALLOW_USER_PASSWORD_AUTH")

for flow in "${REQUIRED_FLOWS[@]}"; do
    if ! echo "$AUTH_FLOWS" | grep -q "$flow"; then
        echo "❌ エラー: 必要な認証フロー $flow が設定されていません"
        exit 1
    fi
done

echo "✅ 認証フローが正しく設定されています"

# テストユーザーの確認
USER_COUNT=$(jq -r ".Users.\"$USER_POOL_ID\" | length" "$CONFIG_FILE")
if [ "$USER_COUNT" = "null" ] || [ "$USER_COUNT" -eq 0 ]; then
    echo "❌ エラー: テストユーザーが設定されていません"
    exit 1
fi

echo "✅ テストユーザー数: $USER_COUNT人"

# 各テストユーザーの詳細確認
echo ""
echo "=== テストユーザー詳細 ==="

jq -r ".Users.\"$USER_POOL_ID\" | to_entries[] | \"ユーザー: \" + .key + \", ステータス: \" + .value.UserStatus" "$CONFIG_FILE"

echo ""
echo "=== 設定検証完了 ==="
echo "✅ すべての設定が正しく構成されています"

# Docker Composeが起動している場合の接続テスト
if command -v curl >/dev/null 2>&1; then
    echo ""
    echo "=== 接続テスト ==="

    # cognito-localが起動しているかチェック
    if curl -s -f http://localhost:9229/health >/dev/null 2>&1; then
        echo "✅ cognito-localサービスが起動しています"

        # User Pool情報の取得テスト
        RESPONSE=$(curl -s -X POST http://localhost:9229/ \
            -H "Content-Type: application/x-amz-json-1.1" \
            -H "X-Amz-Target: AWSCognitoIdentityProviderService.DescribeUserPool" \
            -d "{\"UserPoolId\": \"$USER_POOL_ID\"}" 2>/dev/null)

        if echo "$RESPONSE" | jq -e '.UserPool' >/dev/null 2>&1; then
            echo "✅ User Pool情報の取得に成功しました"
        else
            echo "⚠️  User Pool情報の取得に失敗しました（サービスは起動中）"
        fi
    else
        echo "⚠️  cognito-localサービスが起動していません"
        echo "   docker-compose up -d で起動してください"
    fi
else
    echo "⚠️  curlコマンドが見つかりません。接続テストをスキップします"
fi

echo ""
echo "=== 検証完了 ==="
