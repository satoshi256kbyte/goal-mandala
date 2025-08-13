# 環境変数設定ガイド

## 概要

このドキュメントでは、目標管理曼荼羅システムで使用する環境変数の設定方法と検証機能について説明します。

## 環境変数ファイルの作成

### 1. .envファイルの作成

プロジェクトルートで以下のコマンドを実行して、.env.exampleから.envファイルを作成します：

```bash
cp .env.example .env
```

### 2. 環境変数の設定

.envファイルを開き、以下の必須環境変数を適切な値に設定してください：

#### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://user:password@localhost:5432/dbname` |
| `POSTGRES_PASSWORD` | PostgreSQLパスワード | `secure_password_123` |
| `NODE_ENV` | 実行環境 | `development`, `test`, `production` |
| `PORT` | APIサーバーポート | `3001` |
| `FRONTEND_URL` | フロントエンドURL | `http://localhost:3000` |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `JWT_SECRET` | JWT署名用秘密鍵 | `32文字以上の安全な文字列` |

#### セキュリティ上の注意

- **JWT_SECRET**: 32文字以上の安全な文字列を設定してください
- **POSTGRES_PASSWORD**: デフォルト値から変更してください
- **本番環境**: より強固なパスワードと秘密鍵を使用してください

## 環境変数検証機能

### 検証コマンド

環境変数が正しく設定されているかチェックするために、以下のコマンドを使用できます：

#### Bashスクリプト版（推奨）

```bash
# 環境変数検証の実行
pnpm run env:validate

# または直接実行
bash tools/scripts/validate-env.sh
```

#### Node.js版

```bash
# Node.js版の検証
pnpm run env:validate:node

# または直接実行
node tools/scripts/validate-env.js
```

#### 簡易チェック

```bash
# 簡易チェック（env:validateのエイリアス）
pnpm run env:check
```

### 検証内容

環境変数検証では以下の項目をチェックします：

1. **必須環境変数の存在確認**
   - すべての必須環境変数が設定されているかチェック

2. **データベースURL形式の検証**
   - PostgreSQL接続URLの形式が正しいかチェック

3. **ポート番号の検証**
   - ポート番号が1-65535の範囲内かチェック

4. **URL形式の検証**
   - フロントエンドURLやAPIのURL形式をチェック

5. **NODE_ENV値の検証**
   - 標準的な値（development/test/production）かチェック

6. **セキュリティ設定の検証**
   - JWT_SECRETの長さと安全性をチェック
   - デフォルト値のままでないかチェック

7. **Docker環境の確認**
   - DockerとDocker Composeがインストールされているかチェック

### 検証結果の例

#### 成功時

```
[SUCCESS] .envファイルが見つかりました
[SUCCESS] すべての必須環境変数が設定されています
[SUCCESS] DATABASE_URLの形式が正しいです
[SUCCESS] PORTの値が正しいです: 3001
[SUCCESS] NODE_ENVの値が正しいです: development
[SUCCESS] JWT_SECRETの長さが適切です

設定値サマリー:
==================================
NODE_ENV: development
PORT: 3001
FRONTEND_URL: http://localhost:3000
DATABASE_URL: postgresql://...
AWS_REGION: ap-northeast-1
==================================
```

#### エラー時

```
[ERROR] .envファイルが見つかりません
[ERROR] 環境変数 JWT_SECRET が設定されていません
[WARNING] JWT_SECRETがデフォルト値のままです
```

## プログラムでの使用方法

### TypeScript/JavaScript での環境変数検証

```typescript
import { validateEnv, createEnvConfig } from '@goal-mandala/shared';

try {
  // 環境変数の検証
  const validatedEnv = validateEnv();
  console.log('環境変数の検証に成功しました');
  
  // アプリケーション設定オブジェクトの作成
  const config = createEnvConfig();
  console.log(`実行環境: ${config.env}`);
  console.log(`ポート: ${config.port}`);
  
} catch (error) {
  console.error('環境変数の検証に失敗しました:', error.message);
  process.exit(1);
}
```

### 環境別の検証

```typescript
import { 
  validateDevelopmentEnv, 
  validateProductionEnv 
} from '@goal-mandala/shared';

// 開発環境用の検証（cognito-local設定が必須）
const devEnv = validateDevelopmentEnv();

// 本番環境用の検証（より厳しいセキュリティ要件）
const prodEnv = validateProductionEnv();
```

## 環境別設定

### 開発環境（development）

#### Docker Compose使用時

```bash
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# データベース設定（Docker Compose）
DATABASE_URL=postgresql://goal_mandala_user:your_password@localhost:5432/goal_mandala_dev
POSTGRES_PASSWORD=your_password

# Cognito Local設定（Docker Compose）
COGNITO_LOCAL_ENDPOINT=http://localhost:9229
COGNITO_USER_POOL_ID=local_user_pool_id
COGNITO_CLIENT_ID=local_client_id

# AWS設定（ローカル開発用）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# JWT設定
JWT_SECRET=your_jwt_secret_here_32_chars_minimum
```

#### ローカルPostgreSQL使用時

```bash
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# データベース設定（ローカルPostgreSQL）
DATABASE_URL=postgresql://postgres:password@localhost:5432/goal_mandala_dev

# その他の設定は同じ...
```

### テスト環境（test）

```bash
NODE_ENV=test
PORT=3002
DATABASE_URL=postgresql://goal_mandala_user:password@localhost:5432/goal_mandala_test
# テスト用の設定...
```

### 本番環境（production）

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:secure_password@prod-host:5432/goal_mandala_prod
JWT_SECRET=very_long_and_secure_secret_key_for_production_64_chars_min
# 本番用の設定...
```

## トラブルシューティング

### よくあるエラーと対処法

#### 1. .envファイルが見つからない

```
[ERROR] .envファイルが見つかりません
```

**対処法:**

```bash
cp .env.example .env
```

#### 2. JWT_SECRETがデフォルト値のまま

```
[ERROR] JWT_SECRETがデフォルト値のままです
```

**対処法:**
.envファイルでJWT_SECRETを32文字以上の安全な値に変更してください。

#### 3. データベースURL形式エラー

```
[ERROR] DATABASE_URLの形式が不正です
```

**対処法:**
正しい形式: `postgresql://username:password@host:port/database`

#### 4. ポート番号エラー

```
[ERROR] PORTの値が範囲外です
```

**対処法:**
PORTを1-65535の範囲内の数値に設定してください。

### デバッグ方法

1. **環境変数の確認**

   ```bash
   echo $DATABASE_URL
   echo $JWT_SECRET
   ```

2. **設定値の表示**

   ```bash
   pnpm run env:validate
   ```

3. **詳細なエラー情報**

   ```bash
   DEBUG_MODE=true pnpm run env:validate:node
   ```

## セキュリティベストプラクティス

1. **機密情報の管理**
   - .envファイルはGitにコミットしない
   - 本番環境では環境変数やSecrets Managerを使用

2. **パスワードの強度**
   - 12文字以上の複雑なパスワードを使用
   - 定期的にパスワードを変更

3. **JWT秘密鍵**
   - 64文字以上の安全な文字列を使用
   - 環境ごとに異なる値を設定

4. **アクセス制御**
   - .envファイルの読み取り権限を制限
   - 必要最小限のユーザーのみアクセス可能にする

## Docker環境での特別な考慮事項

### Docker Composeでの環境変数

Docker Composeを使用する場合、以下の点に注意してください：

1. **データベース接続**
   - ホスト名は `localhost` を使用（Docker Composeがポートフォワーディングを行う）
   - PostgreSQLコンテナ内からの接続では `postgres` ホスト名を使用

2. **cognito-local接続**
   - エンドポイントは `http://localhost:9229` を使用
   - コンテナ間通信では `http://cognito-local:9229` を使用

3. **ポート設定**
   - Docker Composeがポートマッピングを行うため、標準ポートを使用可能

### Docker環境の検証

Docker環境専用の検証コマンド：

```bash
# Docker環境の総合チェック
./tools/scripts/validate-docker-compose.sh

# PostgreSQL接続テスト
./tools/scripts/test-postgres-connection.sh

# cognito-local接続テスト
./tools/scripts/validate-cognito-local.sh

# 全体的なヘルスチェック
./tools/scripts/health-check.sh
```

### Docker環境でのトラブルシューティング

#### データベース接続エラー

```bash
# PostgreSQLコンテナの状態確認
docker-compose ps postgres

# PostgreSQLログの確認
docker-compose logs postgres

# 接続テスト
docker-compose exec postgres pg_isready -U goal_mandala_user
```

#### cognito-local接続エラー

```bash
# cognito-localコンテナの状態確認
docker-compose ps cognito-local

# cognito-localログの確認
docker-compose logs cognito-local

# 接続テスト
curl http://localhost:9229/health
```

## 関連ファイル

- `.env.example` - 環境変数設定例
- `tools/scripts/validate-env.sh` - Bash版検証スクリプト
- `tools/scripts/validate-env.js` - Node.js版検証スクリプト
- `packages/shared/src/env/` - TypeScript環境変数検証モジュール
- `docker-compose.yml` - Docker Compose設定ファイル
- `tools/docker/postgres/init.sql` - PostgreSQL初期化スクリプト
- `tools/docker/cognito-local/config.json` - cognito-local設定ファイル

## 参考資料

- [Docker環境セットアップガイド](./docker-setup-guide.md) - Docker環境の詳細セットアップ
- [Docker環境トラブルシューティングガイド](./docker-troubleshooting.md) - Docker関連問題の解決方法
