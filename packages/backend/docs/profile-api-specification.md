# プロフィール管理API仕様書

## 概要

プロフィール管理APIは、ユーザーの基本情報（業種、組織規模、職種、役職）を管理するRESTful APIです。認証されたユーザーが自分のプロフィール情報を取得、更新、削除できます。

## ベースURL

```
https://api.example.com/api
```

## 認証

全てのエンドポイントはJWT認証が必要です。リクエストヘッダーに以下を含めてください：

```
Authorization: Bearer <JWT_TOKEN>
```

## エンドポイント一覧

| メソッド | エンドポイント | 説明                   |
| -------- | -------------- | ---------------------- |
| GET      | /profile       | プロフィール情報の取得 |
| PUT      | /profile       | プロフィール情報の更新 |
| DELETE   | /profile       | プロフィール情報の削除 |

---

## GET /profile

認証されたユーザーのプロフィール情報を取得します。

### リクエスト

#### ヘッダー

```http
GET /api/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### パラメータ

なし

### レスポンス

#### 成功時（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "山田太郎",
    "industry": "IT・通信",
    "company_size": "100-500人",
    "job_title": "エンジニア",
    "position": "マネージャー",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-10T00:00:00.000Z"
  }
}
```

#### エラー時（401 Unauthorized）

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証トークンが無効です",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### エラー時（404 Not Found）

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "プロフィールが見つかりません",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

### サンプルコード

#### JavaScript (fetch)

```javascript
const getProfile = async () => {
  const token = localStorage.getItem('jwt_token');

  try {
    const response = await fetch('https://api.example.com/api/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log('プロフィール:', data.data);
      return data.data;
    } else {
      console.error('エラー:', data.error);
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('通信エラー:', error);
    throw error;
  }
};
```

#### TypeScript (axios)

```typescript
import axios from 'axios';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
  created_at: string;
  updated_at: string;
}

const getProfile = async (): Promise<UserProfile> => {
  const token = localStorage.getItem('jwt_token');

  const response = await axios.get<{ success: true; data: UserProfile }>(
    'https://api.example.com/api/profile',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.data;
};
```

#### cURL

```bash
curl -X GET https://api.example.com/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## PUT /profile

認証されたユーザーのプロフィール情報を更新します。

### リクエスト

#### ヘッダー

```http
PUT /api/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### ボディ

```json
{
  "name": "山田太郎",
  "industry": "IT・通信",
  "company_size": "100-500人",
  "job_title": "エンジニア",
  "position": "マネージャー"
}
```

#### パラメータ

| フィールド   | 型     | 必須 | 説明     | 制約        |
| ------------ | ------ | ---- | -------- | ----------- |
| name         | string | ○    | 名前     | 1-50文字    |
| industry     | string | -    | 業種     | 最大100文字 |
| company_size | string | -    | 組織規模 | 最大50文字  |
| job_title    | string | -    | 職種     | 最大100文字 |
| position     | string | -    | 役職     | 最大100文字 |

**注意**: 少なくとも1つのフィールドを指定する必要があります。

### レスポンス

#### 成功時（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "山田太郎",
    "industry": "IT・通信",
    "company_size": "100-500人",
    "job_title": "エンジニア",
    "position": "マネージャー",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-10T12:00:00.000Z"
  }
}
```

#### エラー時（400 Bad Request）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "名前は50文字以内で入力してください",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### エラー時（401 Unauthorized）

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証トークンが無効です",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

### サンプルコード

#### JavaScript (fetch)

```javascript
const updateProfile = async profileData => {
  const token = localStorage.getItem('jwt_token');

  try {
    const response = await fetch('https://api.example.com/api/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    if (data.success) {
      console.log('更新成功:', data.data);
      return data.data;
    } else {
      console.error('エラー:', data.error);
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('通信エラー:', error);
    throw error;
  }
};

// 使用例
updateProfile({
  name: '山田太郎',
  industry: 'IT・通信',
  company_size: '100-500人',
  job_title: 'エンジニア',
  position: 'マネージャー',
});
```

#### TypeScript (axios)

```typescript
import axios from 'axios';

interface UpdateProfileRequest {
  name?: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
  created_at: string;
  updated_at: string;
}

const updateProfile = async (
  profileData: UpdateProfileRequest
): Promise<UserProfile> => {
  const token = localStorage.getItem('jwt_token');

  const response = await axios.put<{ success: true; data: UserProfile }>(
    'https://api.example.com/api/profile',
    profileData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.data;
};

// 使用例
const updatedProfile = await updateProfile({
  name: '山田太郎',
  industry: 'IT・通信',
});
```

#### cURL

```bash
curl -X PUT https://api.example.com/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "山田太郎",
    "industry": "IT・通信",
    "company_size": "100-500人",
    "job_title": "エンジニア",
    "position": "マネージャー"
  }'
```

---

## DELETE /profile

認証されたユーザーのプロフィール情報を削除します。この操作により、関連する全ての目標、サブ目標、アクション、タスクもカスケード削除されます。

### リクエスト

#### ヘッダー

```http
DELETE /api/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### パラメータ

なし

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラー時（401 Unauthorized）

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証トークンが無効です",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### エラー時（404 Not Found）

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "プロフィールが見つかりません",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

### サンプルコード

#### JavaScript (fetch)

```javascript
const deleteProfile = async () => {
  const token = localStorage.getItem('jwt_token');

  // 確認ダイアログ
  if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
    return;
  }

  try {
    const response = await fetch('https://api.example.com/api/profile', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 204) {
      console.log('削除成功');
      // ログアウト処理
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    } else {
      const data = await response.json();
      console.error('エラー:', data.error);
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('通信エラー:', error);
    throw error;
  }
};
```

#### TypeScript (axios)

```typescript
import axios from 'axios';

const deleteProfile = async (): Promise<void> => {
  const token = localStorage.getItem('jwt_token');

  // 確認ダイアログ
  if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
    return;
  }

  await axios.delete('https://api.example.com/api/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // ログアウト処理
  localStorage.removeItem('jwt_token');
  window.location.href = '/login';
};
```

#### cURL

```bash
curl -X DELETE https://api.example.com/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## データモデル

### UserProfile

| フィールド   | 型                | 説明           |
| ------------ | ----------------- | -------------- |
| id           | string (UUID)     | ユーザーID     |
| email        | string            | メールアドレス |
| name         | string            | 名前           |
| industry     | string \| null    | 業種           |
| company_size | string \| null    | 組織規模       |
| job_title    | string \| null    | 職種           |
| position     | string \| null    | 役職           |
| created_at   | string (ISO 8601) | 作成日時       |
| updated_at   | string (ISO 8601) | 更新日時       |

---

## エラーコード

詳細なエラーコードについては、[エラーコード一覧](./profile-error-codes.md)を参照してください。

| コード           | HTTPステータス | 説明                         |
| ---------------- | -------------- | ---------------------------- |
| VALIDATION_ERROR | 400            | 入力値のバリデーションエラー |
| UNAUTHORIZED     | 401            | 認証エラー                   |
| NOT_FOUND        | 404            | プロフィールが見つからない   |
| INTERNAL_ERROR   | 500            | サーバー内部エラー           |
| DATABASE_ERROR   | 500            | データベースエラー           |

---

## レート制限

現在、レート制限は実装されていません。将来的に実装予定です。

---

## バージョニング

現在のAPIバージョン: v1

---

## サポート

問題が発生した場合は、[トラブルシューティングガイド](./profile-troubleshooting-guide.md)を参照してください。

---

## 変更履歴

### v1.0.0 (2025-01-10)

- 初回リリース
- プロフィール取得、更新、削除機能の実装
