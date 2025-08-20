# 設計ドキュメント

## 概要

AWS Secrets Managerを使用した機密情報管理システムの設計です。データベース認証情報、JWT秘密鍵、外部API認証情報を安全に管理し、Lambda関数から効率的にアクセスできるアーキテクチャを構築します。

## アーキテクチャ

### システム構成図

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Lambda関数    │───▶│ Secrets Manager  │───▶│   Aurora DB     │
│                 │    │                  │    │                 │
│ - 認証ミドル    │    │ - DB認証情報     │    │ - ユーザーデータ│
│ - API処理       │    │ - JWT秘密鍵      │    │ - 目標データ    │
│ - 外部API呼出   │    │ - 外部API認証    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   外部サービス  │    │ Lambda Rotation  │
│                 │    │                  │
│ - Bedrock       │    │ - 自動ローテー   │
│ - SES           │    │   ション処理     │
└─────────────────┘    └──────────────────┘
```

### 環境別シークレット管理

各環境で独立したシークレットを管理し、環境間での機密情報の混在を防ぎます。

```
goal-mandala-{env}-secret-database
goal-mandala-{env}-secret-jwt
goal-mandala-{env}-secret-external-apis
```

## コンポーネントと インターフェース

### 1. SecretsManagerConstruct

Secrets Managerリソースを管理するCDKコンストラクト

```typescript
interface SecretsManagerConstructProps {
  environment: string;
  databaseCluster?: rds.DatabaseCluster;
  enableRotation?: boolean;
}

class SecretsManagerConstruct extends Construct {
  public readonly databaseSecret: secretsmanager.Secret;
  public readonly jwtSecret: secretsmanager.Secret;
  public readonly externalApisSecret: secretsmanager.Secret;
}
```

### 2. SecretService

Lambda関数内でシークレットを取得・管理するサービスクラス

```typescript
interface SecretValue {
  [key: string]: string;
}

class SecretService {
  async getDatabaseCredentials(): Promise<DatabaseCredentials>;
  async getJwtSecret(): Promise<string>;
  async getExternalApiCredentials(): Promise<ExternalApiCredentials>;
  private async getSecretValue(secretId: string): Promise<SecretValue>;
}
```

### 3. RotationLambda

データベースパスワードの自動ローテーションを実行するLambda関数

```typescript
interface RotationEvent {
  SecretId: string;
  ClientRequestToken: string;
  Step: 'createSecret' | 'setSecret' | 'testSecret' | 'finishSecret';
}

export const rotationHandler = async (event: RotationEvent): Promise<void>;
```

## データモデル

### データベースシークレット構造

```json
{
  "username": "goal_mandala_user",
  "password": "auto-generated-password",
  "engine": "postgres",
  "host": "aurora-cluster-endpoint",
  "port": 5432,
  "dbname": "goal_mandala",
  "dbClusterIdentifier": "goal-mandala-{env}-cluster"
}
```

### JWT秘密鍵シークレット構造

```json
{
  "secret": "base64-encoded-256bit-secret",
  "algorithm": "HS256",
  "issuer": "goal-mandala-{env}",
  "expiresIn": "24h"
}
```

### 外部APIシークレット構造

```json
{
  "bedrock": {
    "region": "ap-northeast-1",
    "modelId": "amazon.nova-micro-v1:0"
  },
  "ses": {
    "region": "ap-northeast-1",
    "fromEmail": "noreply@goal-mandala.com",
    "replyToEmail": "support@goal-mandala.com"
  }
}
```

## エラーハンドリング

### シークレット取得エラー

1. **SecretNotFound**: シークレットが存在しない場合
   - ログ出力とアラート送信
   - デフォルト値での処理継続（開発環境のみ）

2. **AccessDenied**: IAM権限不足の場合
   - エラーログ出力
   - 500エラーレスポンス

3. **ThrottlingException**: API制限に達した場合
   - 指数バックオフでリトライ
   - 最大3回まで再試行

### ローテーションエラー

1. **DatabaseConnectionError**: DB接続失敗
   - 旧パスワードでのロールバック
   - アラート送信

2. **PasswordUpdateError**: パスワード更新失敗
   - ローテーション処理の中断
   - 手動介入が必要な旨を通知

## テスト戦略

### ユニットテスト

1. **SecretsManagerConstruct**
   - シークレット作成の検証
   - IAMポリシーの検証
   - 環境別設定の検証

2. **SecretService**
   - シークレット取得ロジックの検証
   - エラーハンドリングの検証
   - キャッシュ機能の検証

### 統合テスト

1. **シークレット作成・取得**
   - CDKデプロイ後のシークレット存在確認
   - Lambda関数からのシークレット取得確認

2. **ローテーション機能**
   - 自動ローテーションの動作確認
   - ローテーション後のアプリケーション動作確認

### セキュリティテスト

1. **アクセス制御**
   - 不正なIAMロールでのアクセス拒否確認
   - 環境間でのシークレット分離確認

2. **暗号化**
   - 保存時暗号化の確認
   - 転送時暗号化の確認

## パフォーマンス考慮事項

### シークレットキャッシュ

Lambda関数内でシークレット値をキャッシュし、API呼び出し回数を削減：

```typescript
class SecretService {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分

  private async getCachedSecret(secretId: string): Promise<any> {
    const cached = this.cache.get(secretId);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const value = await this.getSecretValue(secretId);
    this.cache.set(secretId, {
      value,
      expiry: Date.now() + this.CACHE_TTL
    });
    
    return value;
  }
}
```

### バッチ取得

複数のシークレットを同時に取得する場合の最適化：

```typescript
async getAllSecrets(): Promise<{
  database: DatabaseCredentials;
  jwt: string;
  externalApis: ExternalApiCredentials;
}> {
  const [database, jwt, externalApis] = await Promise.all([
    this.getDatabaseCredentials(),
    this.getJwtSecret(),
    this.getExternalApiCredentials()
  ]);
  
  return { database, jwt, externalApis };
}
```

## セキュリティ設計

### 暗号化

1. **保存時暗号化**: AWS KMS カスタマーマネージドキーを使用
2. **転送時暗号化**: TLS 1.2以上での通信
3. **アクセスログ**: CloudTrailでの全アクセス記録

### アクセス制御

1. **最小権限**: 必要最小限のシークレットのみアクセス可能
2. **環境分離**: 環境別IAMロールでのアクセス制御
3. **時間制限**: 一時的なアクセス権限の設定

### 監査

1. **アクセスログ**: 全シークレットアクセスの記録
2. **変更履歴**: シークレット値変更の履歴管理
3. **アラート**: 異常なアクセスパターンの検知

## 運用設計

### 監視

1. **CloudWatch メトリクス**
   - シークレット取得成功/失敗率
   - ローテーション成功/失敗率
   - API呼び出し回数

2. **アラート設定**
   - ローテーション失敗時の即座通知
   - 異常なアクセス頻度の検知
   - シークレット取得エラー率の監視

### バックアップ・復旧

1. **自動バックアップ**: Secrets Managerの自動バックアップ機能を活用
2. **クロスリージョンレプリケーション**: 災害復旧用のレプリケーション設定
3. **復旧手順**: 緊急時のシークレット復旧手順書の整備

## 実装優先度

### Phase 1: 基本機能

1. データベースシークレット作成
2. JWT秘密鍵シークレット作成
3. 基本的なIAMロール・ポリシー設定
4. SecretServiceの基本実装

### Phase 2: 拡張機能

1. 外部APIシークレット管理
2. シークレットキャッシュ機能
3. 詳細な監視・アラート設定

### Phase 3: 高度な機能

1. 自動ローテーション機能
2. クロスリージョンレプリケーション
3. 高度なセキュリティ監査機能
