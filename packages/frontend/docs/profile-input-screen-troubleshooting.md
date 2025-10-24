# プロフィール入力画面 - トラブルシューティングガイド

## 目次

1. [一般的な問題](#一般的な問題)
2. [バリデーションエラー](#バリデーションエラー)
3. [API通信エラー](#api通信エラー)
4. [認証関連の問題](#認証関連の問題)
5. [表示・レイアウトの問題](#表示レイアウトの問題)
6. [パフォーマンスの問題](#パフォーマンスの問題)
7. [開発環境の問題](#開発環境の問題)

## 一般的な問題

### Q1: ページが表示されない

**症状**: プロフィール入力画面にアクセスしても何も表示されない

**原因**:

- 認証トークンが無効または期限切れ
- ルーティング設定の問題
- JavaScriptエラー

**解決方法**:

1. ブラウザのコンソールでエラーを確認

```javascript
// コンソールを開く: F12 または Cmd+Option+I (Mac)
```

2. 認証状態を確認

```typescript
// AuthContextの状態を確認
console.log('Auth state:', useAuth());
```

3. ルーティング設定を確認

```typescript
// router/index.tsx
<Route path="/profile/setup" element={<ProfileSetupPage />} />
```

4. ローカルストレージの認証トークンを確認

```javascript
// ブラウザコンソールで実行
localStorage.getItem('authToken');
```

### Q2: フォームが送信できない

**症状**: 「次へ」ボタンをクリックしても何も起こらない

**原因**:

- バリデーションエラー
- ネットワークエラー
- APIエンドポイントの問題

**解決方法**:

1. バリデーションエラーを確認

```typescript
// useProfileFormフックの状態を確認
console.log('Errors:', errors);
console.log('Form data:', formData);
```

2. ネットワークタブでAPIリクエストを確認

```
Network タブ > XHR > PUT /api/profile
```

3. APIレスポンスを確認

```typescript
// エラーレスポンスの詳細を確認
console.log('API Error:', error);
```

### Q3: 入力した値が保存されない

**症状**: フォームに入力しても値が反映されない

**原因**:

- イベントハンドラーの問題
- 状態管理の問題
- コンポーネントの再レンダリング問題

**解決方法**:

1. イベントハンドラーが正しく設定されているか確認

```typescript
<IndustrySelect
  value={formData.industry}
  onChange={(value) => setFieldValue('industry', value)}
  // ↑ onChangeが正しく設定されているか確認
/>
```

2. useProfileFormフックの状態を確認

```typescript
const { formData, setFieldValue } = useProfileForm();
console.log('Current form data:', formData);
```

3. React DevToolsで状態を確認

```
React DevTools > Components > ProfileSetupForm
```

## バリデーションエラー

### Q4: 「業種を選択してください」エラーが消えない

**症状**: 業種を選択してもエラーメッセージが表示され続ける

**原因**:

- 選択値が正しく設定されていない
- バリデーションロジックの問題

**解決方法**:

1. 選択値を確認

```typescript
console.log('Selected industry:', formData.industry);
```

2. INDUSTRY_OPTIONSの値と一致しているか確認

```typescript
// constants/profile.ts
export const INDUSTRY_OPTIONS = [
  { value: 'it-communication', label: 'IT・通信' },
  // ...
];
```

3. バリデーション関数を確認

```typescript
// useProfileForm.ts
const validateField = (field: string) => {
  if (field === 'industry' && !formData.industry) {
    return '業種を選択してください';
  }
};
```

### Q5: 文字数制限エラーが表示される

**症状**: 100文字以内なのにエラーが表示される

**原因**:

- 全角・半角の文字数カウント問題
- 改行文字の扱い

**解決方法**:

1. 実際の文字数を確認

```typescript
console.log('Job title length:', formData.jobTitle.length);
console.log('Job title value:', formData.jobTitle);
```

2. 文字数カウントロジックを確認

```typescript
// useProfileForm.ts
if (value.length > 100) {
  return '職種は100文字以内で入力してください';
}
```

3. トリム処理を確認

```typescript
// 前後の空白を削除
const trimmedValue = value.trim();
```

## API通信エラー

### Q6: 「プロフィールの保存に失敗しました」エラー

**症状**: フォーム送信時にエラーメッセージが表示される

**原因**:

- APIエンドポイントの問題
- 認証トークンの問題
- リクエストボディの形式問題

**解決方法**:

1. APIエンドポイントを確認

```typescript
// services/profile.service.ts
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API URL:', `${API_BASE_URL}/api/profile`);
```

2. リクエストヘッダーを確認

```typescript
// Network タブでリクエストヘッダーを確認
Authorization: Bearer <token>
Content-Type: application/json
```

3. リクエストボディを確認

```typescript
// Network タブでリクエストボディを確認
{
  "industry": "it-communication",
  "company_size": "11-50",
  "job_title": "ソフトウェアエンジニア",
  "position": "マネージャー"
}
```

4. レスポンスステータスコードを確認

```
200: 成功
400: バリデーションエラー
401: 認証エラー
500: サーバーエラー
```

### Q7: 「ネットワークエラーが発生しました」エラー

**症状**: ネットワークエラーメッセージが表示される

**原因**:

- インターネット接続の問題
- APIサーバーがダウンしている
- CORS設定の問題

**解決方法**:

1. インターネット接続を確認

```bash
# ターミナルで実行
ping google.com
```

2. APIサーバーの状態を確認

```bash
# APIサーバーのヘルスチェック
curl https://api.example.com/health
```

3. CORS設定を確認

```typescript
// バックエンドのCORS設定
app.use(
  cors({
    origin: 'https://frontend.example.com',
    credentials: true,
  })
);
```

4. ブラウザコンソールでCORSエラーを確認

```
Access to fetch at 'https://api.example.com' from origin 'https://frontend.example.com'
has been blocked by CORS policy
```

## 認証関連の問題

### Q8: ログイン画面にリダイレクトされる

**症状**: プロフィール入力画面にアクセスするとログイン画面にリダイレクトされる

**原因**:

- 認証トークンが無効または期限切れ
- 認証状態管理の問題

**解決方法**:

1. 認証トークンを確認

```javascript
// ブラウザコンソールで実行
const token = localStorage.getItem('authToken');
console.log('Auth token:', token);
```

2. トークンの有効期限を確認

```typescript
// JWT トークンのデコード
import jwt_decode from 'jwt-decode';
const decoded = jwt_decode(token);
console.log('Token expiry:', new Date(decoded.exp * 1000));
```

3. 再ログインを試す

```
1. ログアウト
2. 再度ログイン
3. プロフィール入力画面にアクセス
```

### Q9: プロフィール設定済みなのに画面が表示される

**症状**: すでにプロフィールを設定しているのに入力画面が表示される

**原因**:

- プロフィール設定済みチェックの問題
- データベースの同期問題

**解決方法**:

1. プロフィールデータを確認

```typescript
// API経由でプロフィールを取得
const profile = await ProfileService.getProfile();
console.log('Profile data:', profile);
```

2. リダイレクトロジックを確認

```typescript
// ProfileSetupPage.tsx
useEffect(() => {
  if (profile && profile.industry) {
    navigate('/');
  }
}, [profile, navigate]);
```

3. キャッシュをクリア

```javascript
// ブラウザコンソールで実行
localStorage.clear();
sessionStorage.clear();
```

## 表示・レイアウトの問題

### Q10: モバイルでレイアウトが崩れる

**症状**: スマートフォンで表示するとレイアウトが崩れる

**原因**:

- レスポンシブCSSの問題
- ビューポート設定の問題

**解決方法**:

1. ビューポート設定を確認

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

2. レスポンシブクラスを確認

```typescript
// Tailwind CSSのレスポンシブクラス
<div className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
```

3. ブラウザの開発者ツールでモバイル表示を確認

```
F12 > デバイスツールバー (Ctrl+Shift+M)
```

### Q11: ドロップダウンが正しく表示されない

**症状**: 業種や組織規模のドロップダウンが正しく表示されない

**原因**:

- z-indexの問題
- CSSの競合

**解決方法**:

1. z-indexを確認

```css
.dropdown-menu {
  z-index: 1000;
}
```

2. CSSの競合を確認

```typescript
// ブラウザの開発者ツールでスタイルを確認
Elements > Styles;
```

3. selectコンポーネントのスタイルを確認

```typescript
<select className="form-select">
  {/* options */}
</select>
```

## パフォーマンスの問題

### Q12: ページの読み込みが遅い

**症状**: プロフィール入力画面の表示に時間がかかる

**原因**:

- バンドルサイズが大きい
- 不要な再レンダリング
- 画像の最適化不足

**解決方法**:

1. バンドルサイズを確認

```bash
npm run build
npm run analyze
```

2. React DevToolsでレンダリングを確認

```
React DevTools > Profiler > Record
```

3. コード分割を確認

```typescript
// router/index.tsx
const ProfileSetupPage = lazy(() => import('@/pages/ProfileSetupPage'));
```

4. メモ化を確認

```typescript
const MemoizedComponent = memo(Component);
const memoizedValue = useMemo(() => computeValue(), [deps]);
const memoizedCallback = useCallback(() => {}, [deps]);
```

### Q13: 入力時の反応が遅い

**症状**: フォームに入力する際に遅延が発生する

**原因**:

- バリデーションの実行頻度が高い
- 不要な再レンダリング

**解決方法**:

1. デバウンスを確認

```typescript
// useProfileForm.ts
const debouncedValidate = useMemo(
  () =>
    debounce((field: string) => {
      validateField(field);
    }, 300),
  [validateField]
);
```

2. 不要な再レンダリングを確認

```typescript
// React DevToolsで確認
React DevTools > Profiler > Highlight updates
```

3. useCallbackの使用を確認

```typescript
const handleChange = useCallback(
  (field: string, value: string) => {
    setFieldValue(field, value);
  },
  [setFieldValue]
);
```

## 開発環境の問題

### Q14: テストが失敗する

**症状**: ユニットテストやE2Eテストが失敗する

**原因**:

- テストデータの問題
- モックの設定問題
- 環境変数の問題

**解決方法**:

1. テストログを確認

```bash
npm run test -- --verbose
```

2. モックの設定を確認

```typescript
// __tests__/ProfileSetupForm.test.tsx
jest.mock('@/services/profile.service', () => ({
  updateProfile: jest.fn(),
}));
```

3. 環境変数を確認

```bash
# .env.test
REACT_APP_API_BASE_URL=http://localhost:3000
```

4. テストデータを確認

```typescript
const mockProfileData = {
  industry: 'it-communication',
  companySize: '11-50',
  jobTitle: 'ソフトウェアエンジニア',
  position: 'マネージャー',
};
```

### Q15: ローカル開発サーバーが起動しない

**症状**: `npm run dev`を実行してもサーバーが起動しない

**原因**:

- ポートの競合
- 依存関係の問題
- 環境変数の問題

**解決方法**:

1. ポートの使用状況を確認

```bash
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

2. 依存関係を再インストール

```bash
rm -rf node_modules
npm install
```

3. 環境変数を確認

```bash
# .env.local
REACT_APP_API_BASE_URL=http://localhost:3001
```

4. キャッシュをクリア

```bash
npm run clean
npm run build
```

## デバッグのヒント

### ログ出力

```typescript
// 開発環境でのみログを出力
if (process.env.NODE_ENV === 'development') {
  console.log('Form data:', formData);
  console.log('Errors:', errors);
  console.log('Touched:', touched);
}
```

### React DevTools

```
1. Chrome拡張機能をインストール
2. F12 > React タブ
3. Components タブで状態を確認
4. Profiler タブでパフォーマンスを確認
```

### Network タブ

```
1. F12 > Network タブ
2. XHR フィルターを選択
3. APIリクエストを確認
4. Headers, Preview, Response を確認
```

### ブレークポイント

```typescript
// コード内にブレークポイントを設定
debugger;

// または開発者ツールでブレークポイントを設定
Sources > ファイルを開く > 行番号をクリック;
```

## サポート

問題が解決しない場合は、以下の情報を含めて開発チームに連絡してください：

1. エラーメッセージの全文
2. ブラウザのコンソールログ
3. Network タブのスクリーンショット
4. 再現手順
5. 使用環境（OS、ブラウザ、バージョン）

## 関連ドキュメント

- [開発者ガイド](./profile-input-screen-guide.md)
- [要件定義書](../.kiro/specs/2.3.2-profile-input-screen/requirements.md)
- [設計書](../.kiro/specs/2.3.2-profile-input-screen/design.md)
