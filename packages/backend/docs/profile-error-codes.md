# プロフィール管理API エラーコード一覧

## 概要

このドキュメントでは、プロフィール管理APIで発生する可能性のあるエラーコードとその対処方法を説明します。

---

## エラーレスポンス形式

全てのエラーレスポンスは以下の形式で返されます：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

---

## エラーコード一覧

### VALIDATION_ERROR

**HTTPステータス**: 400 Bad Request

**説明**: 入力値のバリデーションエラーが発生しました。

#### 発生するケース

1. 名前が空文字列
2. 名前が50文字を超える
3. 業種が100文字を超える
4. 組織規模が50文字を超える
5. 職種が100文字を超える
6. 役職が100文字を超える
7. 更新時に全てのフィールドが未指定

#### エラーメッセージ例

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

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "少なくとも1つのフィールドを指定してください",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### 対処方法

1. **入力値の確認**: エラーメッセージを確認し、該当するフィールドの入力値を修正してください
2. **文字数制限の確認**: 各フィールドの文字数制限を確認してください
   - name: 1-50文字（必須）
   - industry: 最大100文字
   - company_size: 最大50文字
   - job_title: 最大100文字
   - position: 最大100文字
3. **必須フィールドの確認**: 更新時は少なくとも1つのフィールドを指定してください
4. **特殊文字の確認**: HTMLタグや特殊文字が含まれている場合、サニタイズされます

---

### UNAUTHORIZED

**HTTPステータス**: 401 Unauthorized

**説明**: 認証エラーが発生しました。

#### 発生するケース

1. 認証トークンが含まれていない
2. 認証トークンが無効
3. 認証トークンが期限切れ
4. 認証トークンの形式が不正

#### エラーメッセージ例

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

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証トークンが期限切れです",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### 対処方法

1. **トークンの確認**: Authorizationヘッダーに正しいトークンが含まれているか確認してください
2. **トークンの形式**: `Bearer <token>`の形式で送信されているか確認してください
3. **再ログイン**: トークンが期限切れの場合、再度ログインしてください
4. **トークンの保存**: ログイン後、トークンを適切に保存してください（localStorage等）

#### サンプルコード

```javascript
// トークンの確認と再取得
const getValidToken = async () => {
  let token = localStorage.getItem('jwt_token');

  if (!token) {
    // トークンがない場合はログイン画面へ
    window.location.href = '/login';
    return null;
  }

  // トークンの有効期限チェック（オプション）
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;

    if (Date.now() >= expiresAt) {
      // トークンが期限切れの場合はログイン画面へ
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
      return null;
    }
  } catch (error) {
    // トークンの解析に失敗した場合
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
    return null;
  }

  return token;
};
```

---

### NOT_FOUND

**HTTPステータス**: 404 Not Found

**説明**: プロフィール情報が見つかりませんでした。

#### 発生するケース

1. 指定されたユーザーIDのプロフィールが存在しない
2. プロフィールが既に削除されている
3. データベースに該当レコードが存在しない

#### エラーメッセージ例

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

#### 対処方法

1. **ユーザーIDの確認**: 認証トークンに含まれるユーザーIDが正しいか確認してください
2. **プロフィールの作成**: プロフィールが存在しない場合、新規作成が必要です
3. **削除後のアクセス**: プロフィール削除後は、再度アクセスできません
4. **再ログイン**: 問題が解決しない場合、再度ログインしてください

---

### INTERNAL_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: サーバー内部で予期しないエラーが発生しました。

#### 発生するケース

1. サーバー側のプログラムエラー
2. 予期しない例外の発生
3. システムリソースの不足

#### エラーメッセージ例

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "予期しないエラーが発生しました",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### 対処方法

1. **リトライ**: 一時的なエラーの可能性があるため、しばらく待ってから再試行してください
2. **サポートへの連絡**: 問題が継続する場合、サポートチームに連絡してください
3. **エラー情報の保存**: エラー発生時のタイムスタンプとリクエスト内容を記録してください
4. **ログの確認**: 開発者の場合、CloudWatch Logsでエラー詳細を確認してください

---

### DATABASE_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: データベース操作中にエラーが発生しました。

#### 発生するケース

1. データベース接続エラー
2. データベースクエリエラー
3. トランザクションエラー
4. データベースタイムアウト

#### エラーメッセージ例

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データベース接続に失敗しました",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データベース操作中にエラーが発生しました",
    "timestamp": "2025-01-10T12:00:00.000Z"
  }
}
```

#### 対処方法

1. **リトライ**: 一時的なエラーの可能性があるため、しばらく待ってから再試行してください
2. **ネットワークの確認**: ネットワーク接続が安定しているか確認してください
3. **サポートへの連絡**: 問題が継続する場合、サポートチームに連絡してください
4. **メンテナンス情報の確認**: システムメンテナンス中でないか確認してください

---

## エラーハンドリングのベストプラクティス

### フロントエンド実装例

```javascript
const handleApiError = error => {
  if (!error.response) {
    // ネットワークエラー
    alert(
      'ネットワークエラーが発生しました。インターネット接続を確認してください。'
    );
    return;
  }

  const { code, message } = error.response.data.error;

  switch (code) {
    case 'VALIDATION_ERROR':
      // バリデーションエラーの表示
      alert(`入力エラー: ${message}`);
      break;

    case 'UNAUTHORIZED':
      // 認証エラー - ログイン画面へリダイレクト
      alert('セッションが切れました。再度ログインしてください。');
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
      break;

    case 'NOT_FOUND':
      // プロフィールが見つからない
      alert('プロフィールが見つかりません。');
      break;

    case 'INTERNAL_ERROR':
    case 'DATABASE_ERROR':
      // サーバーエラー
      alert(
        'サーバーエラーが発生しました。しばらく待ってから再試行してください。'
      );
      break;

    default:
      // その他のエラー
      alert(`エラーが発生しました: ${message}`);
  }
};

// 使用例
try {
  const profile = await updateProfile(profileData);
  console.log('更新成功:', profile);
} catch (error) {
  handleApiError(error);
}
```

### TypeScript実装例

```typescript
interface ApiError {
  code: string;
  message: string;
  timestamp: string;
}

class ProfileApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public timestamp: string
  ) {
    super(message);
    this.name = 'ProfileApiError';
  }
}

const handleApiError = (error: any): never => {
  if (error.response?.data?.error) {
    const apiError: ApiError = error.response.data.error;
    throw new ProfileApiError(
      apiError.code,
      apiError.message,
      apiError.timestamp
    );
  }

  throw new Error('ネットワークエラーが発生しました');
};

// 使用例
try {
  const profile = await updateProfile(profileData);
  console.log('更新成功:', profile);
} catch (error) {
  if (error instanceof ProfileApiError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        showValidationError(error.message);
        break;
      case 'UNAUTHORIZED':
        redirectToLogin();
        break;
      default:
        showGenericError(error.message);
    }
  } else {
    showNetworkError();
  }
}
```

---

## ログとデバッグ

### エラーログの確認

開発者は以下の方法でエラーログを確認できます：

1. **CloudWatch Logs**: AWS CloudWatch Logsでエラー詳細を確認
2. **リクエストID**: エラーレスポンスに含まれるタイムスタンプを使用してログを検索
3. **X-Ray**: AWS X-Rayでリクエストのトレースを確認

### デバッグ情報

エラー発生時、以下の情報を記録してください：

- エラーコード
- エラーメッセージ
- タイムスタンプ
- リクエストURL
- リクエストメソッド
- リクエストボディ（機密情報を除く）
- ユーザーID（可能な場合）

---

## サポート

問題が解決しない場合は、以下の情報を含めてサポートチームに連絡してください：

- エラーコード
- エラーメッセージ
- タイムスタンプ
- 実行した操作の詳細
- 再現手順

---

## 関連ドキュメント

- [API仕様書](./profile-api-specification.md)
- [運用ガイド](./profile-operations-guide.md)
- [トラブルシューティングガイド](./profile-troubleshooting-guide.md)
