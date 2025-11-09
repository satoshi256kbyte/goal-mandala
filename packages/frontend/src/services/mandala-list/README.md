# マンダラチャート一覧サービス

このディレクトリには、マンダラチャート一覧画面で使用するAPIサービスが含まれます。

## サービス一覧

### GoalsService

マンダラチャート（目標）一覧の取得APIを提供するサービス。

**機能:**

- 目標一覧の取得
- 検索・フィルター・ソート対応
- ページネーション対応
- エラーハンドリング

**使用例:**

```tsx
import { GoalsService } from '@/services/mandala-list';

// 目標一覧の取得
const response = await GoalsService.getGoals({
  search: 'キーワード',
  status: 'active',
  sort: 'created_at_desc',
  page: 1,
  limit: 20,
});
```

## API仕様

### GET /api/goals

**クエリパラメータ:**

- `search`: 検索キーワード（任意）
- `status`: 状態フィルター（任意）
- `sort`: ソート条件（任意）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

**レスポンス:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "目標タイトル",
      "description": "目標説明",
      "deadline": "2025-12-31",
      "status": "active",
      "progress": 50,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## 設計原則

- APIクライアントは既存の`api-client.ts`を使用
- 認証トークンは自動的に付与
- エラーハンドリングを適切に実装
- 型安全性を確保
