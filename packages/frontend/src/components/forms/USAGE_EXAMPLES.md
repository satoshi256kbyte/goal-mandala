# 目標入力フォーム 使用例ドキュメント

## 概要

このドキュメントでは、目標入力フォームコンポーネントの実際の使用例を示します。基本的な使用方法から高度なカスタマイズまで、様々なシナリオでの実装例を提供します。

## 基本的な使用例

### 1. シンプルな目標入力フォーム

最も基本的な目標入力フォームの実装例です。

```tsx
import React from 'react';
import { GoalInputForm } from '@/components/forms';
import type { GoalFormData } from '@/types/goal';

function BasicGoalInputPage() {
  const handleSubmit = async (data: GoalFormData) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('目標の保存に失敗しました');
      }

      // 成功時の処理
      console.log('目標が正常に保存されました');
    } catch (error) {
      console.error('エラー:', error);
    }
  };

  const handleDraftSave = async (data: Partial<GoalFormData>) => {
    try {
      await fetch('/api/goals/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('下書きが保存されました');
    } catch (error) {
      console.error('下書き保存エラー:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">新しい目標を設定</h1>
      <GoalInputForm onSubmit={handleSubmit} onDraftSave={handleDraftSave} />
    </div>
  );
}

export default BasicGoalInputPage;
```

### 2. 状態管理を含む実装

React Contextやカスタムフックを使用した状態管理の例です。

```tsx
import React, { useState, useCallback } from 'react';
import { GoalInputForm } from '@/components/forms';
import type { GoalFormData } from '@/types/goal';

function StatefulGoalInputPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: GoalFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('目標の保存に失敗しました');
      }

      setSuccessMessage('目標が正常に保存されました');

      // 成功後の処理（例：別ページへの遷移）
      setTimeout(() => {
        window.location.href = '/mandala/create/processing';
      }, 2000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '不明なエラーが発生しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleDraftSave = useCallback(async (data: Partial<GoalFormData>) => {
    setIsDraftSaving(true);
    setError(null);

    try {
      await fetch('/api/goals/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      setSuccessMessage('下書きが保存されました');

      // 成功メッセージを3秒後に消す
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('下書きの保存に失敗しました');
    } finally {
      setIsDraftSaving(false);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">新しい目標を設定</h1>

      <GoalInputForm
        onSubmit={handleSubmit}
        onDraftSave={handleDraftSave}
        isSubmitting={isSubmitting}
        isDraftSaving={isDraftSaving}
        error={error}
        successMessage={successMessage}
      />
    </div>
  );
}

export default StatefulGoalInputPage;
```

### 3. 下書き復元機能付きの実装

ページ読み込み時に下書きデータを復元する例です。

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GoalInputForm } from '@/components/forms';
import type { GoalFormData } from '@/types/goal';

function GoalInputWithDraftRestore() {
  const [initialData, setInitialData] = useState<
    Partial<GoalFormData> | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ページ読み込み時に下書きデータを取得
  useEffect(() => {
    const loadDraftData = async () => {
      try {
        const response = await fetch('/api/goals/draft');

        if (response.ok) {
          const draftData = await response.json();
          if (draftData && Object.keys(draftData).length > 0) {
            setInitialData(draftData);
          }
        }
      } catch (error) {
        console.error('下書きデータの読み込みに失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraftData();
  }, []);

  const handleSubmit = useCallback(async (data: GoalFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('目標の保存に失敗しました');
      }

      // 成功時は下書きデータを削除
      await fetch('/api/goals/draft', { method: 'DELETE' });

      // 次のページに遷移
      window.location.href = '/mandala/create/processing';
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '不明なエラーが発生しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleDraftSave = useCallback(async (data: Partial<GoalFormData>) => {
    setIsDraftSaving(true);

    try {
      await fetch('/api/goals/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('下書き保存エラー:', error);
    } finally {
      setIsDraftSaving(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">新しい目標を設定</h1>

      {initialData && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800">
            下書きデータが復元されました。続きから入力できます。
          </p>
        </div>
      )}

      <GoalInputForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onDraftSave={handleDraftSave}
        isSubmitting={isSubmitting}
        isDraftSaving={isDraftSaving}
        error={error}
      />
    </div>
  );
}

export default GoalInputWithDraftRestore;
```

## 個別コンポーネントの使用例

### FormFieldコンポーネント

```tsx
import React from 'react';
import { FormField, TextInput } from '@/components/forms';
import { useForm } from 'react-hook-form';

function CustomFormExample() {
  const {
    register,
    formState: { errors },
  } = useForm();

  return (
    <form>
      <FormField
        label="プロジェクト名"
        required
        error={errors.projectName?.message}
        helpText="50文字以内で入力してください"
      >
        <TextInput
          name="projectName"
          placeholder="プロジェクト名を入力"
          maxLength={50}
          showCounter
          register={register}
          error={errors.projectName}
        />
      </FormField>
    </form>
  );
}
```

### DatePickerコンポーネント

```tsx
import React from 'react';
import { DatePicker } from '@/components/forms';
import { useForm } from 'react-hook-form';

function DateSelectionExample() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useForm();

  // 今日から1年後までの範囲で制限
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  return (
    <DatePicker
      name="deadline"
      minDate={minDate}
      maxDate={maxDate}
      register={register}
      setValue={setValue}
      error={errors.deadline}
    />
  );
}
```

### CharacterCounterコンポーネント

```tsx
import React, { useState } from 'react';
import { CharacterCounter } from '@/components/forms';

function TextWithCounterExample() {
  const [text, setText] = useState('');
  const maxLength = 200;

  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={maxLength}
        className="w-full p-2 border rounded"
        placeholder="テキストを入力してください"
      />
      <CharacterCounter current={text.length} max={maxLength} />
    </div>
  );
}
```

## カスタマイズ例

### 1. カスタムバリデーション

```tsx
import React from 'react';
import { GoalInputForm } from '@/components/forms';
import { z } from 'zod';

// カスタムバリデーションスキーマ
const customGoalSchema = z.object({
  title: z
    .string()
    .min(1, '目標タイトルは必須です')
    .max(100, '目標タイトルは100文字以内で入力してください')
    .refine(
      title => !title.includes('禁止ワード'),
      '禁止されたワードが含まれています'
    ),
  description: z
    .string()
    .min(10, '目標説明は10文字以上で入力してください')
    .max(1000, '目標説明は1000文字以内で入力してください'),
  // その他のフィールド...
});

function CustomValidationExample() {
  const handleSubmit = async (data: GoalFormData) => {
    // カスタムバリデーションを実行
    try {
      customGoalSchema.parse(data);
      // バリデーション成功時の処理
    } catch (error) {
      // バリデーションエラーの処理
    }
  };

  return <GoalInputForm onSubmit={handleSubmit} onDraftSave={async () => {}} />;
}
```

### 2. カスタムスタイリング

```tsx
import React from 'react';
import { GoalInputForm } from '@/components/forms';

function CustomStyledExample() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          あなたの目標を設定しましょう
        </h1>
        <p className="text-gray-600">AIがあなたの目標達成をサポートします</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <GoalInputForm
          onSubmit={async () => {}}
          onDraftSave={async () => {}}
          className="custom-form-styling"
        />
      </div>
    </div>
  );
}
```

### 3. 多段階フォーム

```tsx
import React, { useState } from 'react';
import { FormField, TextInput, TextArea, DatePicker } from '@/components/forms';
import { useForm } from 'react-hook-form';

function MultiStepFormExample() {
  const [currentStep, setCurrentStep] = useState(1);
  const {
    register,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm();

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  return (
    <div className="max-w-2xl mx-auto">
      {/* ステップインジケーター */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3].map(step => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step <= currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <form>
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">基本情報</h2>
            <FormField
              label="目標タイトル"
              required
              error={errors.title?.message}
            >
              <TextInput
                name="title"
                placeholder="目標を入力してください"
                register={register}
                error={errors.title}
              />
            </FormField>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">詳細情報</h2>
            <FormField
              label="目標説明"
              required
              error={errors.description?.message}
            >
              <TextArea
                name="description"
                placeholder="目標の詳細を入力してください"
                register={register}
                error={errors.description}
              />
            </FormField>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">期限設定</h2>
            <FormField
              label="達成期限"
              required
              error={errors.deadline?.message}
            >
              <DatePicker
                name="deadline"
                register={register}
                setValue={setValue}
                error={errors.deadline}
              />
            </FormField>
          </div>
        )}

        {/* ナビゲーションボタン */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 disabled:opacity-50"
          >
            戻る
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              次へ
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              完了
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

## エラーハンドリングの例

### 1. ネットワークエラーの処理

```tsx
import React, { useState } from 'react';
import { GoalInputForm } from '@/components/forms';

function ErrorHandlingExample() {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (data: GoalFormData) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('入力内容に問題があります。確認してください。');
        } else if (response.status === 500) {
          throw new Error(
            'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。'
          );
        } else {
          throw new Error('予期しないエラーが発生しました。');
        }
      }

      setError(null);
      setRetryCount(0);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      } else {
        setError(
          error instanceof Error ? error.message : '不明なエラーが発生しました'
        );
      }
      setRetryCount(prev => prev + 1);
    }
  };

  const handleRetry = () => {
    setError(null);
    // フォームの再送信処理
  };

  return (
    <div>
      <GoalInputForm
        onSubmit={handleSubmit}
        onDraftSave={async () => {}}
        error={error}
      />

      {error && retryCount > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            再試行 ({retryCount}回目)
          </button>
        </div>
      )}
    </div>
  );
}
```

## パフォーマンス最適化の例

### 1. メモ化を使用した最適化

```tsx
import React, { memo, useCallback, useMemo } from 'react';
import { GoalInputForm } from '@/components/forms';

const OptimizedGoalInputPage = memo(() => {
  const handleSubmit = useCallback(async (data: GoalFormData) => {
    // 送信処理
  }, []);

  const handleDraftSave = useCallback(async (data: Partial<GoalFormData>) => {
    // 下書き保存処理
  }, []);

  const formConfig = useMemo(
    () => ({
      onSubmit: handleSubmit,
      onDraftSave: handleDraftSave,
    }),
    [handleSubmit, handleDraftSave]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">新しい目標を設定</h1>
      <GoalInputForm {...formConfig} />
    </div>
  );
});

OptimizedGoalInputPage.displayName = 'OptimizedGoalInputPage';

export default OptimizedGoalInputPage;
```

## テスト用のモック例

### 1. テスト用のモックデータ

```tsx
// テスト用のモックデータ
export const mockGoalData: GoalFormData = {
  title: 'プログラミングスキルの向上',
  description:
    'フルスタック開発者として必要なスキルを身につけ、より複雑なプロジェクトに取り組めるようになる',
  deadline: '2024-12-31',
  background:
    '現在のスキルレベルでは対応できないプロジェクトが増えてきており、キャリアアップのためにスキル向上が必要',
  constraints: '平日は仕事があるため、学習時間は限られている',
};

// テスト用のモック関数
export const mockHandlers = {
  onSubmit: jest.fn().mockResolvedValue(undefined),
  onDraftSave: jest.fn().mockResolvedValue(undefined),
};
```

### 2. テストコンポーネント

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalInputForm } from '@/components/forms';
import { mockGoalData, mockHandlers } from './mocks';

function TestWrapper() {
  return <GoalInputForm initialData={mockGoalData} {...mockHandlers} />;
}

// テスト例
test('フォームが正しく表示される', () => {
  render(<TestWrapper />);

  expect(screen.getByLabelText('目標タイトル')).toBeInTheDocument();
  expect(screen.getByLabelText('目標説明')).toBeInTheDocument();
  expect(screen.getByLabelText('達成期限')).toBeInTheDocument();
});
```

## まとめ

このドキュメントでは、目標入力フォームコンポーネントの様々な使用例を示しました。基本的な使用方法から高度なカスタマイズまで、プロジェクトの要件に応じて適切な実装を選択してください。

各例は独立して使用できるように設計されており、必要に応じて組み合わせることも可能です。パフォーマンスやユーザビリティを考慮した実装例も含まれているため、本番環境での使用にも適用できます。
