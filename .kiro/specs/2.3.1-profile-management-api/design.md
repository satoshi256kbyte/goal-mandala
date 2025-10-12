# 設計書

## 概要

プロフィール管理APIは、ユーザーの基本情報（業種、組織規模、職種、役職）を管理するRESTful APIです。既存の認証システム（Cognito + JWT）と統合し、Prisma ORMを使用してAurora Serverless V2データベースとやり取りします。

## アーキテクチャ

### システム構成

```
CloudFront → API Gateway → Lambda (Hono) → Aurora Serverless V2
                ↓
            Cognito (JWT認証)
                ↓
          CloudWatch Logs
```

### コンポーネント構成

```
handlers/
  └── profile.ts                    # Lambda Handler（Hono）
services/
  ├── profile.service.ts            # ビジネスロジック
  └── profile-validation.service.ts # バリデーション
types/
  └── profile.types.ts              # 型定義
schemas/
  └── profile.schema.ts             # Zodスキーマ
errors/
  └── profile.errors.ts             # カスタムエラー
middlewares/
  └── auth.middleware.ts            # 認証ミドルウェア（既存）
utils/
  ├── logger.ts                     # ロガー（既存）
  └── security.ts                   # セキュリティユーティリティ（既存）
```

## コンポーネント設計

### 1. Lambda Handler（profile.ts）

**責務:**
- HTTPリクエストの受信とルーティング
- 認証ミドルウェアの適用
- リクエストバリデーション
- サービス層の呼び出し
- レスポンスの整形とエラーハンドリング

**エンドポイント:**

```typescript
// GET /api/profile - プロフィール取得
app.get('/api/profile', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const profile = await profileService.getProfile(userId);
  return c.json({ success: true, data: profile });
});

// PUT /api/profile - プロフィール更新
app.put('/api/profile', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const profile = await profileService.updateProfile(userId, body);
  return c.json({ success: true, data: profile });
});

// DELETE /api/profile - プロフィール削除
app.delete('/api/profile', authMiddleware, async (c) => {
  const userId = c.get('userId');
  await profileService.deleteProfile(userId);
  return c.body(null, 204);
});
```

**エラーハンドリング:**

```typescript
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } }, 400);
  }
  if (err instanceof NotFoundError) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: err.message } }, 404);
  }
  // その他のエラー処理
  logger.error('Unexpected error', { error: err });
  return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '予期しないエラーが発生しました' } }, 500);
});
```

### 2. ProfileService（profile.service.ts）

**責務:**
- ビジネスロジックの実装
- データベース操作の調整
- トランザクション管理

**主要メソッド:**

```typescript
interface IProfileService {
  getProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile>;
  deleteProfile(userId: string): Promise<void>;
}

class ProfileService implements IProfileService {
  constructor(private prisma: PrismaClient) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        industry: true,
        company_size: true,
        job_title: true,
        position: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundError('プロフィールが見つかりません');
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    // バリデーション
    const validatedData = ProfileUpdateSchema.parse(data);

    // 更新
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        updated_at: new Date(),
      },
    });

    return user;
  }

  async deleteProfile(userId: string): Promise<void> {
    // トランザクション内でカスケード削除
    await this.prisma.$transaction(async (tx) => {
      // Userを削除（外部キー制約でGoal以下が自動削除される）
      await tx.user.delete({
        where: { id: userId },
      });
    });
  }
}
```

### 3. ProfileValidationService（profile-validation.service.ts）

**責務:**
- 入力値のバリデーション
- サニタイズ処理
- ビジネスルールの検証

**主要メソッド:**

```typescript
interface IProfileValidationService {
  validateUpdateRequest(data: unknown): UpdateProfileRequest;
  sanitizeInput(input: string): string;
}

class ProfileValidationService implements IProfileValidationService {
  validateUpdateRequest(data: unknown): UpdateProfileRequest {
    return ProfileUpdateSchema.parse(data);
  }

  sanitizeInput(input: string): string {
    // HTMLタグの除去
    return input.replace(/<[^>]*>/g, '');
  }
}
```

### 4. 型定義（profile.types.ts）

```typescript
// ユーザープロフィール
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
  created_at: Date;
  updated_at: Date;
}

// プロフィール更新リクエスト
export interface UpdateProfileRequest {
  name?: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
}

// APIレスポンス
export interface ProfileResponse {
  success: true;
  data: UserProfile;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 5. Zodスキーマ（profile.schema.ts）

```typescript
import { z } from 'zod';

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内で入力してください').optional(),
  industry: z.string().max(100, '業種は100文字以内で入力してください').optional(),
  company_size: z.string().max(50, '組織規模は50文字以内で入力してください').optional(),
  job_title: z.string().max(100, '職種は100文字以内で入力してください').optional(),
  position: z.string().max(100, '役職は100文字以内で入力してください').optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: '少なくとも1つのフィールドを指定してください' }
);
```

### 6. カスタムエラー（profile.errors.ts）

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

## データモデル

### Userテーブル（既存）

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  industry     String?
  company_size String?  @map("company_size")
  job_title    String?  @map("job_title")
  position     String?
  created_at   DateTime @default(now()) @map("created_at")
  updated_at   DateTime @updatedAt @map("updated_at")

  goals        Goal[]

  @@map("users")
}
```

## API仕様

### GET /api/profile

**リクエスト:**
```
GET /api/profile
Authorization: Bearer <JWT_TOKEN>
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "山田太郎",
    "industry": "IT・通信",
    "company_size": "100-500人",
    "job_title": "エンジニア",
    "position": "マネージャー",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-10T00:00:00Z"
  }
}
```

**レスポンス（エラー）:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "プロフィールが見つかりません"
  }
}
```

### PUT /api/profile

**リクエスト:**
```json
PUT /api/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "山田太郎",
  "industry": "IT・通信",
  "company_size": "100-500人",
  "job_title": "エンジニア",
  "position": "マネージャー"
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "山田太郎",
    "industry": "IT・通信",
    "company_size": "100-500人",
    "job_title": "エンジニア",
    "position": "マネージャー",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-10T12:00:00Z"
  }
}
```

**レスポンス（バリデーションエラー）:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "名前は50文字以内で入力してください"
  }
}
```

### DELETE /api/profile

**リクエスト:**
```
DELETE /api/profile
Authorization: Bearer <JWT_TOKEN>
```

**レスポンス（成功）:**
```
HTTP/1.1 204 No Content
```

**レスポンス（エラー）:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "プロフィールが見つかりません"
  }
}
```

## エラーハンドリング

### エラーコード一覧

| エラーコード | HTTPステータス | 説明 |
|------------|--------------|------|
| VALIDATION_ERROR | 400 | 入力値のバリデーションエラー |
| UNAUTHORIZED | 401 | 認証エラー |
| NOT_FOUND | 404 | プロフィールが見つからない |
| INTERNAL_ERROR | 500 | サーバー内部エラー |
| DATABASE_ERROR | 500 | データベースエラー |

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}
```

## セキュリティ設計

### 認証・認可

1. **JWT認証**: Cognito発行のJWTトークンを検証
2. **ユーザー権限チェック**: 自分のプロフィールのみアクセス可能
3. **トークン有効期限**: 1時間（Cognito設定）

### 入力検証

1. **Zodスキーマ**: 型安全なバリデーション
2. **サニタイズ**: HTMLタグの除去
3. **文字数制限**: 各フィールドに適切な上限設定

### データ保護

1. **HTTPS通信**: CloudFront経由で強制
2. **SQLインジェクション対策**: Prisma ORMのパラメータ化クエリ
3. **XSS対策**: 入力値のサニタイズ
4. **機密情報マスキング**: ログ出力時にトークン等をマスク

## パフォーマンス設計

### データベース最適化

1. **インデックス**: `users.id`（主キー）、`users.email`（ユニーク）
2. **接続プール**: Prismaの接続プール設定
3. **クエリ最適化**: 必要なフィールドのみをSELECT

### Lambda設定

```typescript
{
  memorySize: 512,  // MB
  timeout: 10,      // 秒
  reservedConcurrentExecutions: 10
}
```

### キャッシュ戦略

- プロフィール情報は頻繁に変更されないため、フロントエンド側でキャッシュ推奨
- Cache-Controlヘッダー: `private, max-age=300`（5分）

## 監視とログ

### ログ出力

```typescript
// リクエストログ
logger.info('Profile API request', {
  requestId,
  userId,
  method,
  path,
  timestamp: new Date().toISOString(),
});

// レスポンスログ
logger.info('Profile API response', {
  requestId,
  userId,
  statusCode,
  duration,
  timestamp: new Date().toISOString(),
});

// エラーログ
logger.error('Profile API error', {
  requestId,
  userId,
  error: err.message,
  stack: err.stack,
  timestamp: new Date().toISOString(),
});
```

### CloudWatchメトリクス

1. **リクエスト数**: `ProfileAPIRequests`
2. **エラー率**: `ProfileAPIErrors`
3. **レスポンス時間**: `ProfileAPILatency`

### CloudWatchアラーム

1. **エラー率アラーム**: エラー率 > 5%
2. **レスポンス時間アラーム**: P95レスポンス時間 > 2秒
3. **SNS通知**: アラート発生時にSlack通知

## テスト戦略

### ユニットテスト

1. **ProfileService**: 各メソッドの正常系・異常系
2. **ProfileValidationService**: バリデーションロジック
3. **エラーハンドリング**: カスタムエラーの動作確認

### 統合テスト

1. **API エンドポイント**: 実際のHTTPリクエスト・レスポンス
2. **データベース**: Prismaとの統合
3. **認証**: JWT認証の動作確認

### E2Eテスト

1. **プロフィール取得フロー**: ログイン → プロフィール取得
2. **プロフィール更新フロー**: ログイン → プロフィール更新 → 確認
3. **プロフィール削除フロー**: ログイン → プロフィール削除 → 確認

## デプロイ戦略

### CDKスタック

```typescript
// Lambda関数定義
const profileFunction = new lambda.Function(this, 'ProfileFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'profile.handler',
  code: lambda.Code.fromAsset('dist'),
  memorySize: 512,
  timeout: Duration.seconds(10),
  environment: {
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: 'INFO',
  },
});

// API Gateway統合
api.addRoutes({
  path: '/api/profile',
  methods: [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE],
  integration: new HttpLambdaIntegration('ProfileIntegration', profileFunction),
  authorizer: cognitoAuthorizer,
});
```

### 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| DATABASE_URL | データベース接続URL | postgresql://... |
| LOG_LEVEL | ログレベル | INFO, DEBUG, ERROR |
| CORS_ORIGIN | CORS許可オリジン | https://example.com |

## 今後の拡張

1. **プロフィール画像アップロード**: S3統合
2. **プロフィール履歴管理**: 変更履歴の記録
3. **プロフィール公開設定**: 他ユーザーへの公開制御
4. **プロフィール検索**: 業種・職種での検索機能
