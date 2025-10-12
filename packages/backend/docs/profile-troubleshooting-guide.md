# プロフィール管理API トラブルシューティングガイド

## 概要

このドキュメントでは、プロフィール管理APIで発生する可能性のある問題と、その解決方法について説明します。

---

## 目次

1. [認証関連の問題](#認証関連の問題)
2. [バリデーション関連の問題](#バリデーション関連の問題)
3. [データベース関連の問題](#データベース関連の問題)
4. [パフォーマンス関連の問題](#パフォーマンス関連の問題)
5. [ログの確認方法](#ログの確認方法)
6. [デバッグ手順](#デバッグ手順)

---

## 認証関連の問題

### 問題1: 「認証トークンが無効です」エラー

#### 症状

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証トークンが無効です"
  }
}
```

#### 原因

1. トークンの形式が不正
2. トークンが改ざんされている
3. トークンの署名が無効
4. 環境変数の設定ミス

#### 解決方法

**ステップ1: トークンの形式を確認**

```javascript
// トークンの形式確認
const token = localStorage.getItem('jwt_token');
console.log('Token:', token);

// トークンの構造確認（3つのパートに分かれているか）
const parts = token.split('.');
console.log('Token parts:', parts.length); // 3であるべき
```

**ステップ2: トークンのペイロードを確認**

```javascript
// トークンのペイロードをデコード
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Payload:', payload);
console.log('User ID:', payload.sub);
console.log('Expires at:', new Date(payload.exp * 1000));
```

**ステップ3: トークンの有効期限を確認**

```javascript
const isExpired = Date.now() >= payload.exp * 1000;
console.log('Is expired:', isExpired);

if (isExpired) {
  console.log('Token has expired. Please login again.');
  // 再ログイン処理
}
```

**ステップ4: 環境変数を確認**

```bash
# Lambda関数の環境変数を確認
aws lambda get-function-configuration \
  --function-name ProfileFunction \
  --query 'Environment.Variables'
```

### 問題2: 「認証トークンが期限切れです」エラー

#### 症状

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証トークンが期限切れです"
  }
}
```

#### 原因

1. トークンの有効期限が切れている
2. システム時刻のずれ

#### 解決方法

**ステップ1: トークンの有効期限を確認**

```javascript
const token = localStorage.getItem('jwt_token');
const payload = JSON.parse(atob(token.split('.')[1]));
const expiresAt = new Date(payload.exp * 1000);
const now = new Date();

console.log('Token expires at:', expiresAt);
console.log('Current time:', now);
console.log('Time until expiration:', (expiresAt - now) / 1000 / 60, 'minutes');
```

**ステップ2: 自動リフレッシュの実装**

```javascript
// トークンリフレッシュ機能の実装
const refreshTokenIfNeeded = async () => {
  const token = localStorage.getItem('jwt_token');
  if (!token) return null;

  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiresAt = payload.exp * 1000;
  const now = Date.now();

  // 有効期限の5分前にリフレッシュ
  if (expiresAt - now < 5 * 60 * 1000) {
    const newToken = await refreshToken();
    localStorage.setItem('jwt_token', newToken);
    return newToken;
  }

  return token;
};
```

### 問題3: Authorizationヘッダーが送信されない

#### 症状

リクエストが401エラーになるが、トークンは有効

#### 原因

1. Authorizationヘッダーが設定されていない
2. CORSの設定ミス
3. プリフライトリクエストの失敗

#### 解決方法

**ステップ1: リクエストヘッダーを確認**

```javascript
// ブラウザの開発者ツールでネットワークタブを確認
// Authorizationヘッダーが含まれているか確認

// axiosの場合
axios.interceptors.request.use(config => {
  console.log('Request headers:', config.headers);
  return config;
});
```

**ステップ2: CORSヘッダーを確認**

```bash
# プリフライトリクエストの確認
curl -X OPTIONS https://api.example.com/api/profile \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

**ステップ3: axiosのデフォルト設定**

```javascript
// axiosのデフォルトヘッダー設定
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// または、インターセプターで設定
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## バリデーション関連の問題

### 問題4: 「名前は50文字以内で入力してください」エラー

#### 症状

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "名前は50文字以内で入力してください"
  }
}
```

#### 原因

1. 入力値が文字数制限を超えている
2. マルチバイト文字のカウントミス

#### 解決方法

**ステップ1: 文字数を確認**

```javascript
const name = '山田太郎';
console.log('Length:', name.length); // 4
console.log('Byte length:', new Blob([name]).size); // 12

// 文字数制限チェック
if (name.length > 50) {
  console.error('Name is too long');
}
```

**ステップ2: フロントエンドでのバリデーション**

```javascript
// React Hook Formでのバリデーション
const {
  register,
  formState: { errors },
} = useForm();

<input
  {...register('name', {
    required: '名前は必須です',
    maxLength: {
      value: 50,
      message: '名前は50文字以内で入力してください',
    },
  })}
/>;
{
  errors.name && <span>{errors.name.message}</span>;
}
```

**ステップ3: リアルタイム文字数表示**

```javascript
const [name, setName] = useState('');
const maxLength = 50;

<div>
  <input
    value={name}
    onChange={e => setName(e.target.value)}
    maxLength={maxLength}
  />
  <span>
    {name.length} / {maxLength}
  </span>
</div>;
```

### 問題5: 「少なくとも1つのフィールドを指定してください」エラー

#### 症状

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "少なくとも1つのフィールドを指定してください"
  }
}
```

#### 原因

1. 空のオブジェクトを送信している
2. 全てのフィールドがundefinedまたはnull

#### 解決方法

**ステップ1: リクエストボディを確認**

```javascript
const profileData = {
  name: undefined,
  industry: undefined,
};

// undefinedのフィールドを除外
const cleanData = Object.fromEntries(
  Object.entries(profileData).filter(
    ([_, v]) => v !== undefined && v !== null && v !== ''
  )
);

console.log('Clean data:', cleanData);

if (Object.keys(cleanData).length === 0) {
  console.error('No fields to update');
}
```

**ステップ2: フォームの変更検知**

```javascript
// React Hook Formでの変更検知
const {
  formState: { dirtyFields },
} = useForm();

const onSubmit = data => {
  // 変更されたフィールドのみを送信
  const changedData = Object.keys(dirtyFields).reduce((acc, key) => {
    acc[key] = data[key];
    return acc;
  }, {});

  if (Object.keys(changedData).length === 0) {
    alert('変更がありません');
    return;
  }

  updateProfile(changedData);
};
```

---

## データベース関連の問題

### 問題6: 「データベース接続に失敗しました」エラー

#### 症状

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データベース接続に失敗しました"
  }
}
```

#### 原因

1. データベースの接続情報が不正
2. セキュリティグループの設定ミス
3. データベースが停止している
4. 接続プールの枯渇

#### 解決方法

**ステップ1: データベース接続情報を確認**

```bash
# Secrets Managerから接続情報を取得
aws secretsmanager get-secret-value \
  --secret-id prod/database/credentials \
  --query SecretString \
  --output text | jq .
```

**ステップ2: データベースの状態を確認**

```bash
# Aurora クラスターの状態を確認
aws rds describe-db-clusters \
  --db-cluster-identifier profile-api-cluster \
  --query 'DBClusters[0].Status'
```

**ステップ3: セキュリティグループを確認**

```bash
# セキュリティグループのインバウンドルールを確認
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'
```

**ステップ4: 接続プールの設定を確認**

```typescript
// Prismaの接続プール設定
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 接続プール設定
  connection_limit: 10,
  pool_timeout: 10,
});
```

### 問題7: 「プロフィールが見つかりません」エラー

#### 症状

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "プロフィールが見つかりません"
  }
}
```

#### 原因

1. ユーザーIDが不正
2. プロフィールが削除されている
3. データベースにレコードが存在しない

#### 解決方法

**ステップ1: ユーザーIDを確認**

```javascript
// トークンからユーザーIDを抽出
const token = localStorage.getItem('jwt_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User ID:', payload.sub);
```

**ステップ2: データベースを直接確認**

```sql
-- ユーザーの存在確認
SELECT id, email, name, created_at
FROM users
WHERE id = 'user-id-here';
```

**ステップ3: プロフィール作成の確認**

```javascript
// プロフィールが存在しない場合は作成
const getOrCreateProfile = async () => {
  try {
    return await getProfile();
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      // プロフィール作成画面へリダイレクト
      window.location.href = '/profile/setup';
    }
    throw error;
  }
};
```

---

## パフォーマンス関連の問題

### 問題8: レスポンスが遅い

#### 症状

APIのレスポンスが2秒以上かかる

#### 原因

1. データベースクエリが遅い
2. Lambda関数のコールドスタート
3. ネットワーク遅延

#### 解決方法

**ステップ1: レスポンス時間を測定**

```javascript
const measureResponseTime = async () => {
  const start = Date.now();

  try {
    const profile = await getProfile();
    const end = Date.now();
    console.log('Response time:', end - start, 'ms');
    return profile;
  } catch (error) {
    const end = Date.now();
    console.log('Error response time:', end - start, 'ms');
    throw error;
  }
};
```

**ステップ2: データベースクエリのパフォーマンスを確認**

```sql
-- クエリの実行計画を確認
EXPLAIN ANALYZE
SELECT id, email, name, industry, company_size, job_title, position, created_at, updated_at
FROM users
WHERE id = 'user-id-here';
```

**ステップ3: Lambda関数のメトリクスを確認**

```bash
# Lambda関数の実行時間を確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=ProfileFunction \
  --start-time 2025-01-10T00:00:00Z \
  --end-time 2025-01-10T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

**ステップ4: 接続プールの最適化**

```typescript
// Prismaの接続プール設定を最適化
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  connection_limit: 20, // 接続数を増やす
  pool_timeout: 20, // タイムアウトを延長
});
```

### 問題9: Lambda関数のタイムアウト

#### 症状

Lambda関数が10秒でタイムアウトする

#### 原因

1. データベースクエリが遅い
2. 処理が複雑すぎる
3. タイムアウト設定が短い

#### 解決方法

**ステップ1: タイムアウト設定を確認**

```bash
# Lambda関数のタイムアウト設定を確認
aws lambda get-function-configuration \
  --function-name ProfileFunction \
  --query 'Timeout'
```

**ステップ2: タイムアウトを延長**

```typescript
// CDKでタイムアウトを延長
const profileFunction = new lambda.Function(this, 'ProfileFunction', {
  // ...
  timeout: Duration.seconds(30), // 30秒に延長
});
```

**ステップ3: 処理の最適化**

```typescript
// 不要な処理を削除
// 並列処理を活用
const [profile, settings] = await Promise.all([
  getProfile(userId),
  getSettings(userId),
]);
```

---

## ログの確認方法

### CloudWatch Logsでのログ確認

#### 基本的なログ検索

```
fields @timestamp, @message, level, userId, error
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

#### 特定ユーザーのログ検索

```
fields @timestamp, @message, level, method, path
| filter userId = "user-id-here"
| sort @timestamp desc
| limit 50
```

#### エラーコード別の集計

```
fields @timestamp, error.code
| filter level = "ERROR"
| stats count() by error.code
| sort count desc
```

#### レスポンス時間の分析

```
fields @timestamp, duration, method, path
| filter method = "GET" and path = "/api/profile"
| stats avg(duration), max(duration), min(duration)
```

### X-Rayでのトレース確認

#### トレースの検索

```bash
# 特定期間のトレースを検索
aws xray get-trace-summaries \
  --start-time 2025-01-10T00:00:00Z \
  --end-time 2025-01-10T23:59:59Z \
  --filter-expression 'service("ProfileFunction")'
```

#### トレースの詳細確認

```bash
# トレースIDを指定して詳細を取得
aws xray batch-get-traces \
  --trace-ids trace-id-here
```

---

## デバッグ手順

### ステップ1: 問題の再現

1. エラーが発生する操作を特定
2. 同じ操作を繰り返して再現性を確認
3. エラーメッセージとタイムスタンプを記録

### ステップ2: ログの確認

1. CloudWatch Logsでエラーログを検索
2. エラーの詳細とスタックトレースを確認
3. 関連するログエントリを確認

### ステップ3: メトリクスの確認

1. CloudWatch Metricsでエラー率を確認
2. レスポンス時間の推移を確認
3. Lambda関数の実行時間を確認

### ステップ4: データベースの確認

1. データベースの状態を確認
2. クエリのパフォーマンスを確認
3. 接続数を確認

### ステップ5: 原因の特定

1. ログとメトリクスから原因を推測
2. 必要に応じてコードを確認
3. 仮説を立てて検証

### ステップ6: 修正と検証

1. 修正を実施
2. テスト環境で動作確認
3. 本番環境にデプロイ
4. 動作確認とモニタリング

---

## よくある質問（FAQ）

### Q1: プロフィール更新後、すぐに反映されない

**A**: キャッシュの問題の可能性があります。ブラウザのキャッシュをクリアするか、強制リロード（Ctrl+Shift+R）を試してください。

### Q2: 削除したプロフィールを復元できますか？

**A**: いいえ、削除されたプロフィールは復元できません。削除は取り消せない操作です。

### Q3: 複数のデバイスで同時にプロフィールを編集できますか？

**A**: はい、可能ですが、最後に保存した内容が反映されます。競合が発生する可能性があるため、注意してください。

### Q4: プロフィール情報はどこに保存されますか？

**A**: Aurora Serverless V2データベースに暗号化されて保存されます。

### Q5: APIのレート制限はありますか？

**A**: 現在、レート制限は実装されていませんが、将来的に実装予定です。

---

## サポート

問題が解決しない場合は、以下の情報を含めてサポートチームに連絡してください：

- エラーメッセージ
- エラーコード
- タイムスタンプ
- 実行した操作の詳細
- ユーザーID（可能な場合）
- ブラウザとOSの情報

**連絡先**:

- Slack: #profile-api-support
- メール: support@example.com

---

## 関連ドキュメント

- [API仕様書](./profile-api-specification.md)
- [エラーコード一覧](./profile-error-codes.md)
- [運用ガイド](./profile-operations-guide.md)

---

## 変更履歴

### v1.0.0 (2025-01-10)

- 初版作成
- よくある問題と解決方法を追加
- ログ確認方法を追加
- デバッグ手順を追加
