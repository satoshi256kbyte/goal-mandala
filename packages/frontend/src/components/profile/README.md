# プロフィール入力コンポーネント

## 概要

このディレクトリには、プロフィール入力画面で使用されるコンポーネントが含まれています。

## コンポーネント一覧

### IndustrySelect

業種選択ドロップダウンコンポーネント

**ファイル**: `IndustrySelect.tsx`

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

組織規模選択ドロップダウンコンポーネント

**ファイル**: `CompanySizeSelect.tsx`

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

職種入力フィールドコンポーネント

**ファイル**: `JobTitleInput.tsx`

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

役職入力フィールドコンポーネント

**ファイル**: `PositionInput.tsx`

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

### ProfileSetupForm

プロフィール入力フォーム全体を管理するコンポーネント

**ファイル**: `ProfileSetupForm.tsx`

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

## テスト

各コンポーネントには対応するテストファイルがあります：

- `IndustrySelect.test.tsx`
- `CompanySizeSelect.test.tsx`
- `JobTitleInput.test.tsx`
- `PositionInput.test.tsx`
- `ProfileSetupForm.test.tsx`

テストの実行：

```bash
npm run test -- --testPathPattern=profile
```

## スタイリング

すべてのコンポーネントはTailwind CSSを使用してスタイリングされています。

共通のスタイルクラス：

- `form-field`: フォームフィールドのコンテナ
- `form-label`: ラベル
- `form-input`: 入力フィールド
- `form-select`: セレクトボックス
- `form-error`: エラーメッセージ

## アクセシビリティ

すべてのコンポーネントは以下のアクセシビリティ要件を満たしています：

- 適切なARIA属性（`aria-required`, `aria-invalid`, `aria-describedby`）
- キーボードナビゲーション対応
- スクリーンリーダー対応
- フォーカスインジケーター

## 関連ドキュメント

- [開発者ガイド](../../../docs/profile-input-screen-guide.md)
- [使用方法ガイド](../../../docs/profile-input-screen-usage.md)
- [トラブルシューティングガイド](../../../docs/profile-input-screen-troubleshooting.md)
