# 目標入力フォーム コンポーネントAPI ドキュメント

## 概要

このドキュメントでは、目標入力フォーム機能を構成するReactコンポーネントのAPIを詳細に説明します。

## コンポーネント一覧

### メインコンポーネント

- [GoalInputForm](#goalinputform) - メインフォームコンポーネント
- [FormActions](#formactions) - フォームアクションボタン群

### 入力コンポーネント

- [FormField](#formfield) - フィールドラッパーコンポーネント
- [TextInput](#textinput) - テキスト入力コンポーネント
- [TextArea](#textarea) - テキストエリアコンポーネント
- [DatePicker](#datepicker) - 日付選択コンポーネント
- [DateInput](#dateinput) - 日付入力コンポーネント

### UI/UXコンポーネント

- [CharacterCounter](#charactercounter) - 文字数カウンター
- [CharacterLimitWarning](#characterlimitwarning) - 文字数制限警告
- [ValidationMessage](#validationmessage) - バリデーションメッセージ
- [ErrorDisplay](#errordisplay) - エラー表示
- [EnhancedErrorDisplay](#enhancederrordisplay) - 拡張エラー表示
- [ErrorRecoveryPanel](#errorrecoverypanel) - エラー回復パネル

### アクションコンポーネント

- [SubmitButton](#submitbutton) - 送信ボタン
- [DraftSaveButton](#draftsavebutton) - 下書き保存ボタン
- [DraftRestoreNotification](#draftrestorenotification) - 下書き復元通知

---

## GoalInputForm

メインの目標入力フォームコンポーネント。

### Props

```typescript
interface GoalInputFormProps {
  /** 初期データ（下書き復元時など） */
  initialData?: Partial<GoalFormData>;
  /** フォーム送信時のコールバック */
  onSubmit: (data: GoalFormData) => Promise<void>;
  /** 下書き保存時のコールバック */
  onDraftSave: (data: Partial<GoalFormData>) => Promise<void>;
  /** 送信中フラグ */
  isSubmitting?: boolean;
  /** 下書き保存中フラグ */
  isDraftSaving?: boolean;
  /** エラー状態 */
  error?: string | null;
  /** 成功メッセージ */
  successMessage?: string | null;
}
```

### 使用例

```tsx
import { GoalInputForm } from '@/components/forms';

function GoalInputPage() {
  const handleSubmit = async (data: GoalFormData) => {
    // 送信処理
  };

  const handleDraftSave = async (data: Partial<GoalFormData>) => {
    // 下書き保存処理
  };

  return (
    <GoalInputForm
      onSubmit={handleSubmit}
      onDraftSave={handleDraftSave}
      isSubmitting={false}
    />
  );
}
```

### 機能

- React Hook Formによるフォーム状態管理
- Zodによるバリデーション
- 自動下書き保存（30秒間隔）
- レスポンシブ対応
- アクセシビリティ対応

---

## FormField

フォームフィールドのラッパーコンポーネント。ラベル、エラー表示、ヘルプテキストを統一的に管理します。

### Props

```typescript
interface FormFieldProps {
  /** フィールドのラベル */
  label: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  helpText?: string;
  /** 子要素（入力コンポーネント） */
  children: React.ReactNode;
  /** 追加のCSSクラス */
  className?: string;
}
```

### 使用例

```tsx
<FormField
  label="目標タイトル"
  required
  error={errors.title?.message}
  helpText="100文字以内で入力してください"
>
  <TextInput
    name="title"
    placeholder="目標を入力してください"
    register={register}
    error={errors.title}
  />
</FormField>
```

---

## TextInput

テキスト入力コンポーネント。文字数カウンターとバリデーション表示を含みます。

### Props

```typescript
interface TextInputProps {
  /** フィールド名 */
  name: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 最大文字数 */
  maxLength?: number;
  /** 文字数カウンターを表示するか */
  showCounter?: boolean;
  /** React Hook Formのregister関数 */
  register: UseFormRegister<GoalFormData>;
  /** バリデーションエラー */
  error?: FieldError;
  /** 追加のCSSクラス */
  className?: string;
  /** 無効化フラグ */
  disabled?: boolean;
}
```

### 使用例

```tsx
<TextInput
  name="title"
  placeholder="目標を入力してください"
  maxLength={100}
  showCounter
  register={register}
  error={errors.title}
/>
```

---

## TextArea

テキストエリアコンポーネント。複数行のテキスト入力に使用します。

### Props

```typescript
interface TextAreaProps {
  /** フィールド名 */
  name: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 最大文字数 */
  maxLength?: number;
  /** 行数 */
  rows?: number;
  /** 文字数カウンターを表示するか */
  showCounter?: boolean;
  /** React Hook Formのregister関数 */
  register: UseFormRegister<GoalFormData>;
  /** バリデーションエラー */
  error?: FieldError;
  /** 追加のCSSクラス */
  className?: string;
  /** 無効化フラグ */
  disabled?: boolean;
}
```

### 使用例

```tsx
<TextArea
  name="description"
  placeholder="目標の詳細を入力してください"
  maxLength={1000}
  rows={4}
  showCounter
  register={register}
  error={errors.description}
/>
```

---

## DatePicker

日付選択コンポーネント。react-datepickerを使用した日付入力です。

### Props

```typescript
interface DatePickerProps {
  /** フィールド名 */
  name: string;
  /** 最小日付 */
  minDate?: Date;
  /** 最大日付 */
  maxDate?: Date;
  /** React Hook Formのregister関数 */
  register: UseFormRegister<GoalFormData>;
  /** バリデーションエラー */
  error?: FieldError;
  /** React Hook FormのsetValue関数 */
  setValue: UseFormSetValue<GoalFormData>;
  /** 追加のCSSクラス */
  className?: string;
  /** 無効化フラグ */
  disabled?: boolean;
}
```

### 使用例

```tsx
<DatePicker
  name="deadline"
  minDate={new Date()}
  maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
  register={register}
  error={errors.deadline}
  setValue={setValue}
/>
```

---

## CharacterCounter

文字数カウンター表示コンポーネント。

### Props

```typescript
interface CharacterCounterProps {
  /** 現在の文字数 */
  current: number;
  /** 最大文字数 */
  max: number;
  /** 追加のCSSクラス */
  className?: string;
}
```

### 使用例

```tsx
<CharacterCounter current={title.length} max={100} />
```

### 表示ルール

- 文字数が制限の80%未満: 通常表示
- 文字数が制限の80%以上: 警告色表示
- 文字数が制限を超過: エラー色表示

---

## ValidationMessage

バリデーションメッセージ表示コンポーネント。

### Props

```typescript
interface ValidationMessageProps {
  /** エラーメッセージ */
  message?: string;
  /** メッセージタイプ */
  type?: 'error' | 'warning' | 'info';
  /** 追加のCSSクラス */
  className?: string;
}
```

### 使用例

```tsx
<ValidationMessage message={errors.title?.message} type="error" />
```

---

## SubmitButton

フォーム送信ボタンコンポーネント。

### Props

```typescript
interface SubmitButtonProps {
  /** ボタンテキスト */
  children: React.ReactNode;
  /** 送信中フラグ */
  isSubmitting?: boolean;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 追加のCSSクラス */
  className?: string;
}
```

### 使用例

```tsx
<SubmitButton isSubmitting={isSubmitting} disabled={!isValid}>
  AI生成開始
</SubmitButton>
```

---

## DraftSaveButton

下書き保存ボタンコンポーネント。

### Props

```typescript
interface DraftSaveButtonProps {
  /** クリック時のコールバック */
  onClick: () => void;
  /** 保存中フラグ */
  isSaving?: boolean;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 追加のCSSクラス */
  className?: string;
}
```

### 使用例

```tsx
<DraftSaveButton onClick={handleDraftSave} isSaving={isDraftSaving} />
```

---

## ErrorDisplay

エラー表示コンポーネント。

### Props

```typescript
interface ErrorDisplayProps {
  /** エラーメッセージ */
  error: string | null;
  /** 再試行コールバック */
  onRetry?: () => void;
  /** 追加のCSSクラス */
  className?: string;
}
```

### 使用例

```tsx
<ErrorDisplay error={error} onRetry={handleRetry} />
```

---

## 型定義

### GoalFormData

```typescript
interface GoalFormData {
  /** 目標タイトル */
  title: string;
  /** 目標説明 */
  description: string;
  /** 達成期限 */
  deadline: string;
  /** 背景 */
  background: string;
  /** 制約事項（任意） */
  constraints?: string;
}
```

### バリデーションスキーマ

```typescript
export const goalFormSchema = z.object({
  title: z
    .string()
    .min(1, '目標タイトルは必須です')
    .max(100, '目標タイトルは100文字以内で入力してください'),

  description: z
    .string()
    .min(1, '目標説明は必須です')
    .max(1000, '目標説明は1000文字以内で入力してください'),

  deadline: z.string().refine(date => {
    const selectedDate = new Date(date);
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);

    return selectedDate >= today && selectedDate <= oneYearLater;
  }, '達成期限は今日から1年以内の日付を選択してください'),

  background: z
    .string()
    .min(1, '背景は必須です')
    .max(500, '背景は500文字以内で入力してください'),

  constraints: z
    .string()
    .max(500, '制約事項は500文字以内で入力してください')
    .optional(),
});
```

## スタイリング

### CSS変数

```css
:root {
  /* プライマリカラー */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #dbeafe;

  /* ステータスカラー */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* テキストカラー */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;

  /* ボーダーカラー */
  --color-border: #d1d5db;
  --color-border-focus: #3b82f6;
  --color-border-error: #ef4444;
}
```

### レスポンシブブレークポイント

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## アクセシビリティ

### ARIA属性

- `aria-label`: スクリーンリーダー用のラベル
- `aria-describedby`: 説明テキストとの関連付け
- `aria-invalid`: バリデーションエラー状態
- `aria-required`: 必須フィールドの表示

### キーボードナビゲーション

- Tabキーによるフォーカス移動
- Enterキーによるフォーム送信
- Escapeキーによるモーダル閉じる

## パフォーマンス

### 最適化手法

- React.memoによる不要な再レンダリング防止
- useCallbackによる関数メモ化
- useMemoによる計算結果キャッシュ
- 動的インポートによるコード分割

### メモリ使用量

- フォーム状態は必要最小限に保持
- 不要なイベントリスナーの適切なクリーンアップ
- 大きなオブジェクトの適切な破棄

## トラブルシューティング

一般的な問題と解決方法については、[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)を参照してください。
