# 設計ドキュメント

## 概要

目標入力フォーム機能の設計を定義します。React + TypeScript + Tailwind CSSを使用して、ユーザーフレンドリーで堅牢な目標入力フォームを実装します。

## アーキテクチャ

### コンポーネント構成

```
GoalInputPage
├── GoalInputForm
│   ├── FormField (共通フィールドコンポーネント)
│   ├── TextInput
│   ├── TextArea
│   ├── DatePicker
│   ├── CharacterCounter
│   └── ValidationMessage
├── FormActions
│   ├── DraftSaveButton
│   └── SubmitButton
└── LoadingOverlay
```

### 状態管理

React Hook Formを使用してフォーム状態を管理し、Zodを使用してバリデーションスキーマを定義します。

## コンポーネント設計

### 1. GoalInputPage

メインページコンポーネント。ルーティング、認証チェック、データ取得を担当。

```typescript
interface GoalInputPageProps {
  // ルーティングパラメータなし
}

interface GoalInputPageState {
  isLoading: boolean;
  draftData: GoalFormData | null;
  error: string | null;
}
```

### 2. GoalInputForm

フォーム本体のコンポーネント。入力フィールドの管理とバリデーションを担当。

```typescript
interface GoalInputFormProps {
  initialData?: GoalFormData;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onDraftSave: (data: GoalFormData) => Promise<void>;
  isSubmitting: boolean;
}

interface GoalFormData {
  title: string;
  description: string;
  deadline: string; // ISO date string
  background: string;
  constraints?: string;
}
```

### 3. FormField

再利用可能なフィールドラッパーコンポーネント。

```typescript
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}
```

### 4. TextInput / TextArea

テキスト入力コンポーネント。文字数カウンターとバリデーション表示を含む。

```typescript
interface TextInputProps {
  name: string;
  placeholder?: string;
  maxLength?: number;
  showCounter?: boolean;
  multiline?: boolean;
  rows?: number;
  register: UseFormRegister<GoalFormData>;
  error?: FieldError;
}
```

### 5. DatePicker

日付選択コンポーネント。react-datepickerを使用。

```typescript
interface DatePickerProps {
  name: string;
  minDate?: Date;
  maxDate?: Date;
  register: UseFormRegister<GoalFormData>;
  error?: FieldError;
  setValue: UseFormSetValue<GoalFormData>;
}
```

## データモデル

### バリデーションスキーマ

```typescript
import { z } from 'zod';

export const goalFormSchema = z.object({
  title: z
    .string()
    .min(1, '目標タイトルは必須です')
    .max(100, '目標タイトルは100文字以内で入力してください'),
  
  description: z
    .string()
    .min(1, '目標説明は必須です')
    .max(1000, '目標説明は1000文字以内で入力してください'),
  
  deadline: z
    .string()
    .refine((date) => {
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
    .optional()
});

export type GoalFormData = z.infer<typeof goalFormSchema>;
```

### API インターフェース

```typescript
// 下書き保存API
interface DraftSaveRequest {
  formData: Partial<GoalFormData>;
}

interface DraftSaveResponse {
  success: boolean;
  draftId: string;
  savedAt: string;
}

// 目標作成API
interface GoalCreateRequest {
  formData: GoalFormData;
}

interface GoalCreateResponse {
  success: boolean;
  goalId: string;
  processingId: string; // AI処理のトラッキングID
}

// 下書き取得API
interface DraftGetResponse {
  success: boolean;
  draftData: Partial<GoalFormData> | null;
  savedAt: string | null;
}
```

## インターフェース設計

### レスポンシブレイアウト

#### デスクトップ (1024px以上)
- 2カラムレイアウト
- 左側: フォームフィールド
- 右側: プレビューエリア（将来拡張用）
- フィールド幅: 最大600px

#### タブレット (768px - 1023px)
- 1カラムレイアウト
- フィールド幅: コンテナの90%
- 適度な余白を保持

#### スマートフォン (767px以下)
- 1カラムレイアウト
- フィールド幅: コンテナの95%
- タッチ操作に適したボタンサイズ (44px以上)

### カラーテーマ

```css
:root {
  /* プライマリカラー */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #dbeafe;
  
  /* セカンダリカラー */
  --color-secondary: #6b7280;
  --color-secondary-light: #f3f4f6;
  
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

## エラーハンドリング

### バリデーションエラー

1. **リアルタイムバリデーション**
   - onBlurイベントでフィールド単位のバリデーション
   - 文字数制限の警告表示

2. **送信時バリデーション**
   - 全フィールドの包括的バリデーション
   - エラーフィールドへの自動フォーカス

3. **エラー表示**
   - フィールド下部にエラーメッセージ表示
   - エラー状態のビジュアルフィードバック

### ネットワークエラー

1. **API通信エラー**
   - リトライ機能付きエラーハンドリング
   - ユーザーフレンドリーなエラーメッセージ

2. **タイムアウト処理**
   - 30秒でタイムアウト
   - 再試行オプションの提供

## テスト戦略

### ユニットテスト

1. **コンポーネントテスト**
   - 各フォームフィールドの表示・入力テスト
   - バリデーション機能のテスト
   - イベントハンドラーのテスト

2. **バリデーションテスト**
   - Zodスキーマのテスト
   - エッジケースのテスト

### 統合テスト

1. **フォーム送信フロー**
   - 正常系の送信フローテスト
   - エラー系の送信フローテスト

2. **下書き保存機能**
   - 自動保存機能のテスト
   - 手動保存機能のテスト
   - 復元機能のテスト

### E2Eテスト

1. **ユーザーフローテスト**
   - 目標入力から送信までの完全フロー
   - 各デバイスでの操作テスト

2. **アクセシビリティテスト**
   - キーボードナビゲーションテスト
   - スクリーンリーダー対応テスト

## パフォーマンス最適化

### レンダリング最適化

1. **React.memo**の使用
   - 不要な再レンダリングの防止

2. **useCallback / useMemo**の使用
   - 関数とオブジェクトの最適化

### バンドルサイズ最適化

1. **動的インポート**
   - DatePickerライブラリの遅延読み込み

2. **Tree Shaking**
   - 未使用コードの除去

## セキュリティ考慮事項

### 入力検証

1. **クライアントサイド検証**
   - XSS攻撃の防止
   - 入力値のサニタイゼーション

2. **サーバーサイド検証**
   - クライアント検証の再実行
   - SQLインジェクション対策

### データ保護

1. **機密情報の取り扱い**
   - 下書きデータの暗号化
   - セッション管理の強化

## 実装優先度

### Phase 1: 基本機能
- フォーム表示とバリデーション
- 基本的な送信機能

### Phase 2: 拡張機能
- 下書き保存機能
- 文字数カウンター

### Phase 3: 最適化
- パフォーマンス最適化
- アクセシビリティ強化
