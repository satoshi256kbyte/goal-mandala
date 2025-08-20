# JWT秘密鍵シークレット実装ドキュメント

## 概要

AWS Secrets Managerを使用したJWT秘密鍵管理システムの実装詳細です。

## 実装内容

### 1. JWT秘密鍵シークレットの作成機能

#### 機能概要

- 環境別にJWT秘密鍵シークレットを自動作成
- 強力な秘密鍵の自動生成
- JWT設定情報の構造化

#### 実装詳細

```typescript
private createJwtSecret(): secretsmanager.Secret {
    const secretName = `${this.config.stackPrefix}-${this.environment}-secret-jwt`;

    const jwtSecretConfig: JwtSecretConfig = {
        secret: '', // generateSecretStringで生成される
        algorithm: 'HS256',
        issuer: `goal-mandala-${this.environment}`,
        expiresIn: '24h',
    };

    return new secretsmanager.Secret(this, 'JwtSecret', {
        secretName,
        description: `JWT secret key for ${this.environment} environment`,
        generateSecretString: {
            secretStringTemplate: JSON.stringify({
                algorithm: jwtSecretConfig.algorithm,
                issuer: jwtSecretConfig.issuer,
                expiresIn: jwtSecretConfig.expiresIn,
            }),
            generateStringKey: 'secret',
            excludeCharacters: '"@/\\\'`',
            includeSpace: false,
            passwordLength: 64, // 256ビット相当の長さ
            requireEachIncludedType: true,
        },
        encryptionKey: this.encryptionKey,
    });
}
```

### 2. 強力な秘密鍵の自動生成機能

#### セキュリティ仕様

- **秘密鍵長**: 64文字（256ビット相当）
- **文字種要件**: 各文字種を含む（RequireEachIncludedType: true）
- **除外文字**: `"@/\'` （JSON解析やシェル実行で問題となる文字）
- **スペース**: 含まない（IncludeSpace: false）

#### 生成設定

```typescript
generateSecretString: {
    passwordLength: 64,           // 256ビット相当の強力な秘密鍵
    requireEachIncludedType: true, // 各文字種を含む
    excludeCharacters: '"@/\\\'`', // 問題のある文字を除外
    includeSpace: false,          // スペースを含まない
}
```

### 3. 環境別秘密鍵管理の実装

#### 命名規則

- **パターン**: `{stackPrefix}-{environment}-secret-jwt`
- **例**:
  - local: `goal-mandala-local-secret-jwt`
  - dev: `goal-mandala-dev-secret-jwt`
  - stg: `goal-mandala-stg-secret-jwt`
  - prod: `goal-mandala-prod-secret-jwt`

#### 環境分離

- 各環境で独立したKMS暗号化キー
- 環境別IAMアクセス制御
- 環境別issuer設定

### 4. JWT設定情報の構造化

#### データ構造

```typescript
interface JwtSecretConfig {
  secret: string; // 自動生成される秘密鍵
  algorithm: string; // 'HS256'
  issuer: string; // 'goal-mandala-{environment}'
  expiresIn: string; // '24h'
}
```

#### シークレット内容例

```json
{
  "secret": "auto-generated-256bit-secret",
  "algorithm": "HS256",
  "issuer": "goal-mandala-prod",
  "expiresIn": "24h"
}
```

## セキュリティ機能

### 1. 暗号化

- **保存時暗号化**: カスタマーマネージドKMSキー
- **転送時暗号化**: TLS 1.2以上
- **キーローテーション**: 自動有効化

### 2. アクセス制御

- **最小権限**: 必要最小限のシークレットアクセス
- **環境分離**: 環境別IAMロール
- **条件付きアクセス**: KMS ViaService条件

### 3. 監査

- **CloudTrail**: 全アクセスログ記録
- **CloudWatch**: メトリクス監視
- **タグ管理**: リソース分類

## 使用方法

### 1. Lambda関数での取得

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'ap-northeast-1' });

async function getJwtSecret(): Promise<JwtSecretConfig> {
  const command = new GetSecretValueCommand({
    SecretId: 'goal-mandala-prod-secret-jwt',
  });

  const response = await client.send(command);
  return JSON.parse(response.SecretString!);
}
```

### 2. JWT検証での使用

```typescript
import jwt from 'jsonwebtoken';

const jwtConfig = await getJwtSecret();

// トークン検証
const decoded = jwt.verify(token, jwtConfig.secret, {
  algorithms: [jwtConfig.algorithm],
  issuer: jwtConfig.issuer,
});
```

## テスト

### 実装済みテスト

1. JWT秘密鍵シークレットの正しい設定
2. 環境別設定の適用
3. 強力な秘密鍵生成設定
4. JWT設定情報の構造化

### テスト実行

```bash
cd packages/infrastructure
npm test -- --testNamePattern="JWT"
```

## 運用

### 1. 監視項目

- シークレット取得成功/失敗率
- KMS復号化エラー
- 異常なアクセスパターン

### 2. アラート設定

- シークレット取得失敗時の通知
- 不正アクセス試行の検知
- KMSキー使用量の監視

### 3. メンテナンス

- 定期的なアクセスログ確認
- セキュリティ設定の見直し
- 依存関係の更新

## 要件適合性

### 要件2.1: 強力な秘密鍵生成 ✅

- 64文字（256ビット相当）の秘密鍵
- 各文字種を含む複雑な構成
- セキュアな文字選択

### 要件2.2: 環境別独立管理 ✅

- 環境別命名規則
- 独立したKMS暗号化
- 環境分離されたアクセス制御

### 要件2.3: Lambda関数での取得 ✅

- IAMロール・ポリシー設定
- SDK統合サポート
- エラーハンドリング

### 要件2.4: 自動更新対応 ✅

- シークレット値の動的取得
- キャッシュ機能（将来実装）
- ローテーション対応（将来実装）

## 今後の拡張

### 1. 自動ローテーション

- JWT秘密鍵の定期ローテーション
- ゼロダウンタイム更新
- 旧キーの段階的無効化

### 2. 高度な監視

- 異常検知アルゴリズム
- 自動復旧機能
- 詳細なメトリクス収集

### 3. マルチリージョン対応

- クロスリージョンレプリケーション
- 災害復旧機能
- 地理的分散
