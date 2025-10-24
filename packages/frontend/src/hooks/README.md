# カスタムフック

## useProfileForm

プロフィール入力フォームの状態管理、バリデーション、API通信を行うカスタムフック

### 概要

`useProfileForm`は、プロフィール入力フォームの複雑な状態管理とロジックをカプセル化したカスタムフックです。フォームの状態、バリデーション、API通信、エラーハンドリングを一元管理します。

### インポート

```typescript
import { useProfileForm } from '@/hooks/useProfileForm';
```

### 基本的な使用方法

```typescript
const {
  formData,
  errors,
  touched,
  isSubmitting,
  error,
  successMessage,
  setFieldValue,
  setFieldTouched,
  handleSubmit,
} = useProfileForm({
  onSuccess: () => {
    console.log('Profile saved successfully');
    navigate('/');
  },
  onError: error => {
    console.error('Failed to save profile:', error);
  },
});
```

### オプション

```typescript
interface UseProfileFormOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
```

#### onSuccess

プロフィール保存が成功した時に呼ばれるコールバック関数

**型**: `() => void`

**使用例**:

```typescript
onSuccess: () => {
  navigate('/');
  showNotification('プロフィールを保存しました');
};
```

#### onError

プロフィール保存が失敗した時に呼ばれるコールバック関数

**型**: `(error: Error) => void`

**使用例**:

```typescript
onError: error => {
  console.error('Profile save error:', error);
  logErrorToService(error);
};
```

### 戻り値

```typescript
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

#### 状態

##### formData

現在のフォームデータ

**型**: `ProfileFormData`

```typescript
interface ProfileFormData {
  industry: string;
  companySize: string;
  jobTitle: string;
  position: string;
}
```

**使用例**:

```typescript
<IndustrySelect value={formData.industry} />
```

##### errors

各フィールドのバリデーションエラー

**型**: `Record<string, string>`

**使用例**:

```typescript
<IndustrySelect error={errors.industry} />
```

##### touched

各フィールドがタッチされたかどうか

**型**: `Record<string, boolean>`

**使用例**:

```typescript
{touched.industry && errors.industry && (
  <div className="error">{errors.industry}</div>
)}
```

##### isLoading

データ読み込み中かどうか

**型**: `boolean`

##### isSubmitting

フォーム送信中かどうか

**型**: `boolean`

**使用例**:

```typescript
<button disabled={isSubmitting}>
  {isSubmitting ? '保存中...' : '次へ'}
</button>
```

##### error

APIエラーメッセージ

**型**: `string | null`

**使用例**:

```typescript
{error && (
  <div className="alert alert-error">{error}</div>
)}
```

##### successMessage

成功メッセージ

**型**: `string | null`

**使用例**:

```typescript
{successMessage && (
  <div className="alert alert-success">{successMessage}</div>
)}
```

#### メソッド

##### setFieldValue

フィールドの値を設定

**型**: `(field: string, value: string) => void`

**使用例**:

```typescript
<IndustrySelect
  onChange={(value) => setFieldValue('industry', value)}
/>
```

##### setFieldTouched

フィールドのタッチ状態を設定

**型**: `(field: string, touched: boolean) => void`

**使用例**:

```typescript
<IndustrySelect
  onBlur={() => setFieldTouched('industry', true)}
/>
```

##### validateField

特定のフィールドをバリデーション

**型**: `(field: string) => string | undefined`

**戻り値**: エラーメッセージ（エラーがない場合は`undefined`）

**使用例**:

```typescript
const error = validateField('industry');
if (error) {
  console.log('Validation error:', error);
}
```

##### validateForm

フォーム全体をバリデーション

**型**: `() => boolean`

**戻り値**: バリデーションが成功した場合は`true`、失敗した場合は`false`

**使用例**:

```typescript
const isValid = validateForm();
if (isValid) {
  // フォーム送信処理
}
```

##### handleSubmit

フォームを送信

**型**: `() => Promise<void>`

**使用例**:

```typescript
<form onSubmit={(e) => {
  e.preventDefault();
  handleSubmit();
}}>
  {/* フォームフィールド */}
</form>
```

##### resetForm

フォームをリセット

**型**: `() => void`

**使用例**:

```typescript
<button onClick={resetForm}>リセット</button>
```

##### clearError

エラーメッセージをクリア

**型**: `() => void`

**使用例**:

```typescript
<button onClick={clearError}>エラーを閉じる</button>
```

##### clearSuccess

成功メッセージをクリア

**型**: `() => void`

**使用例**:

```typescript
<button onClick={clearSuccess}>メッセージを閉じる</button>
```

### バリデーションルール

#### 業種（industry）

- 必須項目
- 選択肢から選択

#### 組織規模（companySize）

- 必須項目
- 選択肢から選択

#### 職種（jobTitle）

- 必須項目
- 最大100文字
- 空白のみは不可

#### 役職（position）

- 任意項目
- 最大100文字

### エラーメッセージ

```typescript
const ERROR_MESSAGES = {
  REQUIRED_INDUSTRY: '業種を選択してください',
  REQUIRED_COMPANY_SIZE: '組織規模を選択してください',
  REQUIRED_JOB_TITLE: '職種を入力してください',
  MAX_LENGTH_JOB_TITLE: '職種は100文字以内で入力してください',
  MAX_LENGTH_POSITION: '役職は100文字以内で入力してください',
  API_ERROR: 'プロフィールの保存に失敗しました。もう一度お試しください。',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
  UNAUTHORIZED: '認証エラーが発生しました。再度ログインしてください。',
  UNKNOWN_ERROR: '予期しないエラーが発生しました。',
};
```

### 完全な使用例

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileForm } from '@/hooks/useProfileForm';
import { IndustrySelect } from '@/components/profile/IndustrySelect';
import { CompanySizeSelect } from '@/components/profile/CompanySizeSelect';
import { JobTitleInput } from '@/components/profile/JobTitleInput';
import { PositionInput } from '@/components/profile/PositionInput';

export const ProfileSetupForm: React.FC = () => {
  const navigate = useNavigate();

  const {
    formData,
    errors,
    touched,
    isSubmitting,
    error,
    successMessage,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  } = useProfileForm({
    onSuccess: () => {
      navigate('/');
    },
    onError: (error) => {
      console.error('Profile save failed:', error);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-6"
    >
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">所属組織の情報</h2>

        <IndustrySelect
          value={formData.industry}
          onChange={(value) => setFieldValue('industry', value)}
          onBlur={() => setFieldTouched('industry', true)}
          error={touched.industry ? errors.industry : undefined}
          required
        />

        <CompanySizeSelect
          value={formData.companySize}
          onChange={(value) => setFieldValue('companySize', value)}
          onBlur={() => setFieldTouched('companySize', true)}
          error={touched.companySize ? errors.companySize : undefined}
          required
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">本人の情報</h2>

        <JobTitleInput
          value={formData.jobTitle}
          onChange={(value) => setFieldValue('jobTitle', value)}
          onBlur={() => setFieldTouched('jobTitle', true)}
          error={touched.jobTitle ? errors.jobTitle : undefined}
          maxLength={100}
          required
        />

        <PositionInput
          value={formData.position}
          onChange={(value) => setFieldValue('position', value)}
          onBlur={() => setFieldTouched('position', true)}
          error={touched.position ? errors.position : undefined}
          maxLength={100}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isSubmitting ? '保存中...' : '次へ'}
      </button>
    </form>
  );
};
```

### テスト

```typescript
import { renderHook, act } from '@testing-library/react';
import { useProfileForm } from './useProfileForm';

describe('useProfileForm', () => {
  it('should initialize with empty form data', () => {
    const { result } = renderHook(() => useProfileForm());

    expect(result.current.formData).toEqual({
      industry: '',
      companySize: '',
      jobTitle: '',
      position: '',
    });
  });

  it('should update field value', () => {
    const { result } = renderHook(() => useProfileForm());

    act(() => {
      result.current.setFieldValue('industry', 'it-communication');
    });

    expect(result.current.formData.industry).toBe('it-communication');
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => useProfileForm());

    act(() => {
      result.current.validateForm();
    });

    expect(result.current.errors.industry).toBe('業種を選択してください');
    expect(result.current.errors.companySize).toBe(
      '組織規模を選択してください'
    );
    expect(result.current.errors.jobTitle).toBe('職種を入力してください');
  });
});
```

### パフォーマンス最適化

フックは以下の最適化を実装しています：

1. **useCallback**: メソッドのメモ化
2. **useMemo**: 計算結果のメモ化
3. **デバウンス**: バリデーションのデバウンス

### 関連ドキュメント

- [開発者ガイド](../../docs/profile-input-screen-guide.md)
- [使用方法ガイド](../../docs/profile-input-screen-usage.md)
- [トラブルシューティングガイド](../../docs/profile-input-screen-troubleshooting.md)
