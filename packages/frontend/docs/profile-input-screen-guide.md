# プロフィール入力画面 - 開発者ガイド

## 概要

プロフィール入力画面は、初回ログイン時にユーザーの所属組織情報と本人情報を収集するための画面です。収集した情報はAI生成時のコンテキスト情報として活用され、より適切なマンダラチャートの生成を可能にします。

## アーキテクチャ

### コンポーネント構成

```
ProfileSetupPage (ページコンポーネント)
├── AuthLayout (レイアウトコンポーネント)
│   └── ProfileSetupForm (フォームコンポーネント)
│       ├── IndustrySelect (業種選択)
│       ├── CompanySizeSelect (組織規模選択)
│       ├── JobTitleInput (職種入力)
│       └── PositionInput (役職入力)
└── useProfileForm (カスタムフック)
```

### データフロー

1. ユーザーがページにアクセス
2. 認証状態を確認（未認証の場合はログイン画面へリダイレクト）
3. プロフィール設定済みチェック（設定済みの場合はTOP画面へリダイレクト）
4. フォーム表示
5. ユーザーが情報を入力
6. バリデーション実行
7. API経由でプロフィール保存
8. 成功時にTOP画面へリダイレクト

## コンポーネント詳細

### ProfileSetupPage

**場所**: `packages/frontend/src/pages/ProfileSetupPage.tsx`

**責務**:

- ページ全体の状態管理
- 認証状態の確認
- プロフィール設定済みチェック
- リダイレクト処理
- エラーハンドリング

**使用例**:

```tsx
import { ProfileSetupPage } from '@/pages/ProfileSetupPage';

// ルーティング設定
<Route path="/profile/setup" element={<ProfileSetupPage />} />;
```

### ProfileSetupForm

**場所**: `packages/frontend/src/components/profile/ProfileSetupForm.tsx`

**責務**:

- フォームの表示とレイアウト
- 入力値の管理
- バリデーション実行
- フォーム送信

**Props**:

```typescript
interface ProfileSetupFormProps {
  onSubmit: (data: ProfileFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}
```

**使用例**:

```tsx
<ProfileSetupForm
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
  error={error}
/>
```

### IndustrySelect

**場所**: `packages/frontend/src/components/profile/IndustrySelect.tsx`

**責務**:

- 業種選択ドロップダウンの表示
- 選択値の管理
- バリデーションエラーの表示

**Props**:

```typescript
interface IndustrySelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
```

**使用例**:

```tsx
<IndustrySelect
  value={formData.industry}
  onChange={value => setFieldValue('industry', value)}
  onBlur={() => setFieldTouched('industry', true)}
  error={errors.industry}
  required
/>
```

### CompanySizeSelect

**場所**: `packages/frontend/src/components/profile/CompanySizeSelect.tsx`

**責務**:

- 組織規模選択ドロップダウンの表示
- 選択値の管理
- バリデーションエラーの表示

**Props**:

```typescript
interface CompanySizeSelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
```

**使用例**:

```tsx
<CompanySizeSelect
  value={formData.companySize}
  onChange={value => setFieldValue('companySize', value)}
  onBlur={() => setFieldTouched('companySize', true)}
  error={errors.companySize}
  required
/>
```

### JobTitleInput

**場所**: `packages/frontend/src/components/profile/JobTitleInput.tsx`

**責務**:

- 職種入力フィールドの表示
- 入力値の管理
- 文字数制限
- バリデーションエラーの表示

**Props**:

```typescript
interface JobTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
}
```

**使用例**:

```tsx
<JobTitleInput
  value={formData.jobTitle}
  onChange={value => setFieldValue('jobTitle', value)}
  onBlur={() => setFieldTouched('jobTitle', true)}
  error={errors.jobTitle}
  maxLength={100}
  required
/>
```

### PositionInput

**場所**: `packages/frontend/src/components/profile/PositionInput.tsx`

**責務**:

- 役職入力フィールドの表示
- 入力値の管理
- 文字数制限
- バリデーションエラーの表示

**Props**:

```typescript
interface PositionInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
}
```

**使用例**:

```tsx
<PositionInput
  value={formData.position}
  onChange={value => setFieldValue('position', value)}
  onBlur={() => setFieldTouched('position', true)}
  error={errors.position}
  maxLength={100}
/>
```

## カスタムフック

### useProfileForm

**場所**: `packages/frontend/src/hooks/useProfileForm.ts`

**責務**:

- フォーム状態の管理
- バリデーション処理
- API通信
- エラーハンドリング

**インターフェース**:

```typescript
interface UseProfileFormOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseProfileFormReturn {
  // 状態
  formData: ProfileFormData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;

  // メソッド
  setFieldValue: (field: string, value: string) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  validateField: (field: string) => string | undefined;
  validateForm: () => boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  clearError: () => void;
  clearSuccess: () => void;
}
```

**使用例**:

```tsx
const {
  formData,
  errors,
  touched,
  isSubmitting,
  error,
  setFieldValue,
  setFieldTouched,
  handleSubmit,
} = useProfileForm({
  onSuccess: () => {
    navigate('/');
  },
  onError: error => {
    console.error('Profile update failed:', error);
  },
});
```

## データモデル

### ProfileFormData

```typescript
interface ProfileFormData {
  industry: string;
  companySize: string;
  jobTitle: string;
  position: string;
}
```

### 業種選択肢

```typescript
const INDUSTRY_OPTIONS = [
  { value: '', label: '業種を選択してください' },
  { value: 'it-communication', label: 'IT・通信' },
  { value: 'manufacturing', label: '製造業' },
  { value: 'finance-insurance', label: '金融・保険' },
  { value: 'retail-wholesale', label: '小売・卸売' },
  { value: 'service', label: 'サービス業' },
  { value: 'medical-welfare', label: '医療・福祉' },
  { value: 'education', label: '教育' },
  { value: 'construction-real-estate', label: '建設・不動産' },
  { value: 'transportation-logistics', label: '運輸・物流' },
  { value: 'other', label: 'その他' },
];
```

### 組織規模選択肢

```typescript
const COMPANY_SIZE_OPTIONS = [
  { value: '', label: '組織規模を選択してください' },
  { value: '1-10', label: '1-10人' },
  { value: '11-50', label: '11-50人' },
  { value: '51-200', label: '51-200人' },
  { value: '201-500', label: '201-500人' },
  { value: '501-1000', label: '501-1000人' },
  { value: '1001+', label: '1001人以上' },
  { value: 'individual', label: '個人事業主' },
];
```

## バリデーションルール

### 業種（industry）

- 必須項目
- 選択肢から選択

### 組織規模（companySize）

- 必須項目
- 選択肢から選択

### 職種（jobTitle）

- 必須項目
- 最大100文字
- 空白のみは不可

### 役職（position）

- 任意項目
- 最大100文字

## API統合

### プロフィール更新API

**エンドポイント**: `PUT /api/profile`

**リクエスト**:

```typescript
interface UpdateProfileRequest {
  industry: string;
  company_size: string;
  job_title: string;
  position?: string;
}
```

**レスポンス（成功）**:

```typescript
interface UpdateProfileResponse {
  success: true;
  data: {
    id: string;
    email: string;
    name: string;
    industry: string;
    company_size: string;
    job_title: string;
    position: string | null;
    created_at: string;
    updated_at: string;
  };
}
```

**レスポンス（エラー）**:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

## スタイリング

### レスポンシブブレークポイント

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### 主要CSSクラス

```css
/* フォームコンテナ */
.form-container {
  @apply max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8;
}

/* セクション */
.form-section {
  @apply mb-8 p-6 bg-white rounded-lg shadow-sm;
}

/* フォームフィールド */
.form-field {
  @apply mb-6;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 mb-2;
}

.form-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         disabled:bg-gray-100 disabled:cursor-not-allowed;
}

.form-error {
  @apply mt-1 text-sm text-red-600;
}

/* ボタン */
.submit-button {
  @apply w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md
         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
         disabled:bg-gray-400 disabled:cursor-not-allowed
         transition-colors duration-200;
}
```

## アクセシビリティ

### ARIA属性

```tsx
// 必須フィールド
<input
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? `${id}-error` : undefined}
/>

// エラーメッセージ
<div id={`${id}-error`} role="alert" aria-live="polite">
  {error}
</div>

// ローディング状態
<button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? '保存中...' : '次へ'}
</button>
```

### キーボードナビゲーション

- Tabキーで全フィールドとボタンにフォーカス可能
- Enterキーでフォーム送信
- Escapeキーでドロップダウンを閉じる
- フォーカスインジケーターの明確な表示

## テスト

### ユニットテスト

```bash
# 全テスト実行
npm run test

# 特定のコンポーネントテスト
npm run test -- IndustrySelect.test.tsx

# カバレッジ確認
npm run test:coverage
```

### E2Eテスト

```bash
# E2Eテスト実行
npm run test:e2e

# 特定のテスト実行
npm run test:e2e -- profile-setup.spec.ts
```

## パフォーマンス

### 最適化手法

1. **コード分割**: ProfileSetupPageの遅延読み込み
2. **メモ化**: コンポーネントとコールバックのメモ化
3. **デバウンス**: バリデーションのデバウンス
4. **画像最適化**: 遅延読み込み

### パフォーマンス目標

- ページロード時間: < 3秒
- 入力レスポンス: < 100ms
- バリデーション: < 200ms
- API呼び出し: < 1秒（95%ile）

## セキュリティ

### 入力値のサニタイゼーション

```typescript
function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // HTMLタグの除去
    .substring(0, 100); // 最大長制限
}
```

### CSRF対策

- APIリクエストに認証トークンを含める
- SameSite Cookie属性の設定

### XSS対策

- Reactの自動エスケープ機能を活用
- dangerouslySetInnerHTMLの使用禁止

## トラブルシューティング

詳細なトラブルシューティングガイドは、[profile-input-screen-troubleshooting.md](./profile-input-screen-troubleshooting.md)を参照してください。

## 関連ドキュメント

- [要件定義書](.kiro/specs/2.3.2-profile-input-screen/requirements.md)
- [設計書](.kiro/specs/2.3.2-profile-input-screen/design.md)
- [実装タスクリスト](.kiro/specs/2.3.2-profile-input-screen/tasks.md)
- [トラブルシューティングガイド](./profile-input-screen-troubleshooting.md)
