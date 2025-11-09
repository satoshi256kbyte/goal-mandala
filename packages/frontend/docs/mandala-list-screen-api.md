# マンダラチャート一覧画面 APIドキュメント

## 概要

このドキュメントでは、マンダラチャート一覧画面で使用するAPIエンドポイントとデータ構造について説明します。

## エンドポイント

### マンダラチャート一覧取得

#### リクエスト

```http
GET /api/goals
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| search | string | No | - | 検索キーワード（目標タイトル・説明を対象に部分一致検索） |
| status | GoalStatus | No | - | 目標状態でフィルタリング |
| sort | SortOption | No | created_at_desc | ソート条件 |
| page | number | No | 1 | ページ番号（1から開始） |
| limit | number | No | 20 | 1ページあたりの件数 |

#### GoalStatus（目標状態）

```typescript
enum GoalStatus {
  DRAFT = 'draft',           // 下書き
  ACTIVE = 'active',         // 活動中
  COMPLETED = 'completed',   // 完了
  PAUSED = 'paused',         // 一時停止
  CANCELLED = 'cancelled'    // 中止
}
```

#### SortOption（ソート条件）

```typescript
type SortOption =
  | 'created_at_desc'    // 作成日時（新しい順）
  | 'created_at_asc'     // 作成日時（古い順）
  | 'updated_at_desc'    // 更新日時（新しい順）
  | 'updated_at_asc'     // 更新日時（古い順）
  | 'deadline_asc'       // 達成期限（近い順）
  | 'deadline_desc'      // 達成期限（遠い順）
  | 'progress_desc'      // 進捗率（高い順）
  | 'progress_asc';      // 進捗率（低い順）
```

#### リクエスト例

```bash
# 基本的な取得
curl -X GET "https://api.example.com/api/goals" \
  -H "Authorization: Bearer {token}"

# 検索キーワード付き
curl -X GET "https://api.example.com/api/goals?search=プログラミング" \
  -H "Authorization: Bearer {token}"

# 状態フィルター付き
curl -X GET "https://api.example.com/api/goals?status=active" \
  -H "Authorization: Bearer {token}"

# ソート条件付き
curl -X GET "https://api.example.com/api/goals?sort=deadline_asc" \
  -H "Authorization: Bearer {token}"

# ページネーション付き
curl -X GET "https://api.example.com/api/goals?page=2&limit=20" \
  -H "Authorization: Bearer {token}"

# 複数条件の組み合わせ
curl -X GET "https://api.example.com/api/goals?search=プログラミング&status=active&sort=progress_desc&page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

#### レスポンス（成功）

**ステータスコード**: 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "フルスタックエンジニアになる",
      "description": "React、Node.js、AWSを使ったWebアプリケーション開発ができるようになる",
      "deadline": "2025-12-31T00:00:00.000Z",
      "status": "active",
      "progress": 45,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-10-24T12:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "TOEIC 800点を取得する",
      "description": "ビジネス英語を習得し、グローバルに活躍できるようになる",
      "deadline": "2025-06-30T00:00:00.000Z",
      "status": "active",
      "progress": 60,
      "created_at": "2025-02-01T00:00:00.000Z",
      "updated_at": "2025-10-23T15:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | リクエストの成功/失敗 |
| data | MandalaChartSummary[] | マンダラチャート一覧 |
| total | number | 総件数 |
| page | number | 現在のページ番号 |
| limit | number | 1ページあたりの件数 |
| totalPages | number | 総ページ数 |

#### MandalaChartSummary（マンダラチャート概要）

```typescript
interface MandalaChartSummary {
  id: string;           // マンダラチャートID（UUID）
  user_id: string;      // ユーザーID（UUID）
  title: string;        // 目標タイトル
  description: string;  // 目標説明
  deadline: string;     // 達成期限（ISO 8601形式）
  status: GoalStatus;   // 目標状態
  progress: number;     // 進捗率（0-100）
  created_at: string;   // 作成日時（ISO 8601形式）
  updated_at: string;   // 更新日時（ISO 8601形式）
}
```

#### レスポンス（エラー）

**ステータスコード**: 400 Bad Request / 401 Unauthorized / 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "無効なパラメータが指定されました"
  }
}
```

#### エラーコード

| コード | ステータス | 説明 |
|--------|-----------|------|
| INVALID_PARAMETER | 400 | 無効なパラメータが指定された |
| UNAUTHORIZED | 401 | 認証トークンが無効または期限切れ |
| FORBIDDEN | 403 | アクセス権限がない |
| NOT_FOUND | 404 | リソースが見つからない |
| INTERNAL_ERROR | 500 | サーバー内部エラー |
| DATABASE_ERROR | 500 | データベースエラー |
| NETWORK_ERROR | 503 | ネットワークエラー |

## データ型定義

### TypeScript型定義

```typescript
// マンダラチャート一覧取得パラメータ
interface GoalsListParams {
  search?: string;
  status?: GoalStatus;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

// マンダラチャート一覧レスポンス
interface GoalsListResponse {
  success: boolean;
  data: MandalaChartSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// エラーレスポンス
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

## 認証

### 認証ヘッダー

全てのAPIリクエストには、Authorizationヘッダーに有効なJWTトークンを含める必要があります。

```http
Authorization: Bearer {JWT_TOKEN}
```

### トークンの取得

トークンは、ログイン時にCognito認証から取得されます。

### トークンの有効期限

- アクセストークン: 1時間
- リフレッシュトークン: 30日

トークンが期限切れの場合、401 Unauthorizedエラーが返され、ログイン画面へリダイレクトされます。

## レート制限

### 制限値

- **一般ユーザー**: 100リクエスト/分
- **プレミアムユーザー**: 1000リクエスト/分

### レート制限超過時

**ステータスコード**: 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "リクエスト制限を超えました。しばらくしてから再試行してください。"
  }
}
```

## キャッシュ

### キャッシュ戦略

- **ブラウザキャッシュ**: 無効（常に最新データを取得）
- **CDNキャッシュ**: 無効（動的コンテンツのため）
- **アプリケーションキャッシュ**: React Queryによる5分間のキャッシュ

### キャッシュの無効化

データ更新時（作成・編集・削除）に自動的にキャッシュが無効化されます。

## パフォーマンス

### レスポンス時間

- **95パーセンタイル**: < 2秒
- **平均**: < 1秒

### 最適化

- データベースインデックスの最適化
- ページネーションによるデータ量の制限
- 必要なフィールドのみを返却

## セキュリティ

### データ保護

- 全ての通信はHTTPS経由
- ユーザーは自分のマンダラチャートのみアクセス可能
- SQLインジェクション対策（Prismaによるパラメータ化クエリ）
- XSS対策（入力値のサニタイズ）

### CORS設定

```http
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## 使用例

### React Queryを使用した実装例

```typescript
import { useQuery } from '@tanstack/react-query';
import { GoalsService } from '@/services/goals.service';

function useMandalaList(params: GoalsListParams) {
  return useQuery({
    queryKey: ['goals', params],
    queryFn: () => GoalsService.getGoals(params),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    cacheTime: 10 * 60 * 1000, // 10分間保持
  });
}

// 使用例
function MandalaListPage() {
  const { data, isLoading, error } = useMandalaList({
    search: 'プログラミング',
    status: 'active',
    sort: 'progress_desc',
    page: 1,
    limit: 20,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div>
      {data.data.map(mandala => (
        <MandalaCard key={mandala.id} mandala={mandala} />
      ))}
    </div>
  );
}
```

### Axiosを使用した実装例

```typescript
import axios from 'axios';

async function getGoals(params: GoalsListParams): Promise<GoalsListResponse> {
  const token = await getAuthToken();
  
  const response = await axios.get('/api/goals', {
    params,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}
```

## バージョニング

### 現在のバージョン

- **APIバージョン**: v1
- **最終更新日**: 2025-10-24

### 変更履歴

- **v1.0.0** (2025-10-24): 初版リリース

## サポート

### 問い合わせ

- **技術サポート**: support@example.com
- **ドキュメント**: https://docs.example.com
- **GitHub Issues**: https://github.com/example/repo/issues

## 関連ドキュメント

- [使用方法ガイド](./mandala-list-screen-usage.md)
- [トラブルシューティングガイド](./mandala-list-screen-troubleshooting.md)
- [コンポーネントガイド](./mandala-list-screen-components.md)
