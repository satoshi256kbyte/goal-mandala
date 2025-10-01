# 目標入力フォーム トラブルシューティングガイド

## 概要

このドキュメントでは、目標入力フォームコンポーネントの使用時に発生する可能性のある問題と、その解決方法を説明します。

## 目次

1. [フォーム表示の問題](#フォーム表示の問題)
2. [バリデーションの問題](#バリデーションの問題)
3. [送信・保存の問題](#送信保存の問題)
4. [パフォーマンスの問題](#パフォーマンスの問題)
5. [スタイリングの問題](#スタイリングの問題)
6. [アクセシビリティの問題](#アクセシビリティの問題)
7. [開発環境の問題](#開発環境の問題)

---

## フォーム表示の問題

### 問題: フォームが表示されない

**症状:**

- ページが読み込まれるがフォームが表示されない
- 白い画面が表示される

**原因と解決方法:**

#### 1. インポートエラー

```tsx
// ❌ 間違った例
import { GoalInputForm } from '@/components/forms/GoalInputForm';

// ✅ 正しい例
import { GoalInputForm } from '@/components/forms';
// または
import { GoalInputForm } from '@/components/forms/GoalInputForm';
```

#### 2. 必須プロパティの不足

```tsx
// ❌ 間違った例 - onSubmitとonDraftSaveが不足
<GoalInputForm />

// ✅ 正しい例
<GoalInputForm
  onSubmit={async (data) => { /* 処理 */ }}
  onDraftSave={async (data) => { /* 処理 */ }}
/>
```

#### 3. TypeScriptエラー

```bash
# エラーを確認
npm run type-check

# 型定義を確認
import type { GoalFormData } from '@/types/goal';
```

### 問題: フォームのレイアウトが崩れる

**症状:**

- フィールドが重なって表示される
- レスポンシブ表示が正しく動作しない

**解決方法:**

#### 1. Tailwind CSSの設定確認

```tsx
// tailwind.config.jsの確認
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // ...
};
```

#### 2. CSSの競合確認

```tsx
// カスタムCSSが競合していないか確認
// 開発者ツールでスタイルを検査
```

#### 3. コンテナの幅設定

```tsx
// ✅ 適切なコンテナ設定
<div className="max-w-4xl mx-auto px-4">
  <GoalInputForm {...props} />
</div>
```

---

## バリデーションの問題

### 問題: バリデーションが動作しない

**症状:**

- エラーメッセージが表示されない
- 無効な値でも送信できてしまう

**解決方法:**

#### 1. Zodスキーマの確認

```tsx
import { goalFormSchema } from '@/schemas/goal';

// スキーマが正しくインポートされているか確認
console.log(goalFormSchema);
```

#### 2. React Hook Formの設定確認

```tsx
import { zodResolver } from '@hookform/resolvers/zod';

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<GoalFormData>({
  resolver: zodResolver(goalFormSchema), // resolverが設定されているか確認
});
```

#### 3. フィールドの登録確認

```tsx
// ✅ 正しいフィールド登録
<TextInput name="title" register={register} error={errors.title} />
```

### 問題: カスタムバリデーションが動作しない

**症状:**

- 独自のバリデーションルールが適用されない

**解決方法:**

#### 1. Zodのrefineメソッド使用

```tsx
const customSchema = z.object({
  title: z
    .string()
    .min(1, '必須です')
    .refine(
      value => !value.includes('禁止ワード'),
      '禁止されたワードが含まれています'
    ),
});
```

#### 2. 非同期バリデーション

```tsx
const asyncValidation = z.string().refine(async value => {
  // 非同期チェック
  const isValid = await checkUniqueness(value);
  return isValid;
}, '既に使用されています');
```

---

## 送信・保存の問題

### 問題: フォーム送信が失敗する

**症状:**

- 送信ボタンを押してもエラーが発生する
- ネットワークエラーが表示される

**解決方法:**

#### 1. ネットワーク接続の確認

```tsx
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
      // レスポンスの詳細を確認
      const errorText = await response.text();
      console.error('Server error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Success:', result);
  } catch (error) {
    console.error('Network error:', error);
    // エラーハンドリング
  }
};
```

#### 2. CORS問題の解決

```tsx
// 開発環境でのプロキシ設定（vite.config.ts）
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

#### 3. 認証トークンの確認

```tsx
const handleSubmit = async (data: GoalFormData) => {
  const token = localStorage.getItem('authToken');

  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
};
```

### 問題: 下書き保存が動作しない

**症状:**

- 自動保存が実行されない
- 手動保存でエラーが発生する

**解決方法:**

#### 1. 自動保存の設定確認

```tsx
// GoalInputForm内での自動保存設定
useEffect(() => {
  const interval = setInterval(() => {
    const currentData = getValues();
    if (Object.keys(currentData).some(key => currentData[key])) {
      onDraftSave(currentData);
    }
  }, 30000); // 30秒間隔

  return () => clearInterval(interval);
}, [getValues, onDraftSave]);
```

#### 2. ローカルストレージの確認

```tsx
// ローカルストレージの容量確認
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (error) {
  console.error('LocalStorage not available:', error);
}
```

---

## パフォーマンスの問題

### 問題: フォームの動作が重い

**症状:**

- 入力時の反応が遅い
- ページの読み込みが遅い

**解決方法:**

#### 1. 不要な再レンダリングの防止

```tsx
import { memo, useCallback, useMemo } from 'react';

const OptimizedFormField = memo(({ label, children, error }) => {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error && <span>{error}</span>}
    </div>
  );
});

const OptimizedForm = () => {
  const handleSubmit = useCallback(async data => {
    // 処理
  }, []);

  const memoizedProps = useMemo(
    () => ({
      onSubmit: handleSubmit,
    }),
    [handleSubmit]
  );

  return <GoalInputForm {...memoizedProps} />;
};
```

#### 2. デバウンス処理の追加

```tsx
import { debounce } from 'lodash';

const debouncedSave = useCallback(
  debounce(data => {
    onDraftSave(data);
  }, 1000),
  [onDraftSave]
);
```

#### 3. 動的インポートの使用

```tsx
import { lazy, Suspense } from 'react';

const GoalInputForm = lazy(() => import('@/components/forms/GoalInputForm'));

function GoalInputPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <GoalInputForm {...props} />
    </Suspense>
  );
}
```

### 問題: メモリリークが発生する

**症状:**

- ページを離れてもメモリ使用量が減らない
- ブラウザが重くなる

**解決方法:**

#### 1. イベントリスナーのクリーンアップ

```tsx
useEffect(() => {
  const handleBeforeUnload = e => {
    // 未保存データの警告
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);
```

#### 2. タイマーのクリーンアップ

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    // 自動保存処理
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

---

## スタイリングの問題

### 問題: スタイルが適用されない

**症状:**

- Tailwind CSSのクラスが効かない
- カスタムスタイルが反映されない

**解決方法:**

#### 1. Tailwind CSSの設定確認

```bash
# Tailwind CSSがビルドに含まれているか確認
npm run build

# 開発者ツールでクラスが適用されているか確認
```

#### 2. CSS優先度の問題

```tsx
// !importantの使用（最後の手段）
<div className="!bg-blue-500">

// またはカスタムCSSクラスの使用
<div className="custom-form-field">
```

#### 3. 条件付きスタイルの確認

```tsx
// 条件が正しく評価されているか確認
const errorClass = error ? 'border-red-500' : 'border-gray-300';
console.log('Error class:', errorClass);
```

### 問題: レスポンシブデザインが動作しない

**症状:**

- モバイルで表示が崩れる
- ブレークポイントが効かない

**解決方法:**

#### 1. ビューポートの設定確認

```html
<!-- index.htmlに含まれているか確認 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

#### 2. ブレークポイントの確認

```tsx
// Tailwindのブレークポイント
<div className="w-full md:w-1/2 lg:w-1/3">{/* コンテンツ */}</div>
```

---

## アクセシビリティの問題

### 問題: スクリーンリーダーで読み上げられない

**症状:**

- フォームフィールドが認識されない
- エラーメッセージが読み上げられない

**解決方法:**

#### 1. ARIA属性の追加

```tsx
<input
  aria-label="目標タイトル"
  aria-describedby="title-help"
  aria-invalid={!!error}
  aria-required="true"
/>
<div id="title-help">100文字以内で入力してください</div>
```

#### 2. ラベルの関連付け

```tsx
<label htmlFor="goal-title">目標タイトル</label>
<input id="goal-title" name="title" />
```

### 問題: キーボードナビゲーションが動作しない

**症状:**

- Tabキーでフォーカスが移動しない
- Enterキーで送信できない

**解決方法:**

#### 1. tabIndexの設定

```tsx
<button tabIndex={0}>送信</button>
<div tabIndex={-1}>フォーカス不要な要素</div>
```

#### 2. キーボードイベントの処理

```tsx
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    handleSubmit();
  }
};
```

---

## 開発環境の問題

### 問題: Hot Reloadが動作しない

**症状:**

- ファイルを変更しても画面が更新されない

**解決方法:**

#### 1. Viteの設定確認

```tsx
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: true,
  },
});
```

#### 2. ファイルウォッチャーの確認

```bash
# ファイルシステムの制限確認
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 問題: TypeScriptエラーが解決されない

**症状:**

- 型エラーが表示され続ける
- インポートが解決されない

**解決方法:**

#### 1. TypeScript設定の確認

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### 2. 型定義ファイルの確認

```bash
# 型定義の再生成
npm run type-check
```

### 問題: テストが失敗する

**症状:**

- コンポーネントのテストでエラーが発生する

**解決方法:**

#### 1. テスト環境の設定

```tsx
// test-setup.ts
import '@testing-library/jest-dom';

// モックの設定
global.fetch = jest.fn();
```

#### 2. React Hook Formのモック

```tsx
// テストファイル内
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
  }),
}));
```

---

## デバッグのヒント

### 1. ブラウザ開発者ツールの活用

```tsx
// コンソールでの状態確認
console.log('Form data:', data);
console.log('Errors:', errors);
console.log('Form state:', formState);
```

### 2. React Developer Toolsの使用

- コンポーネントの状態を確認
- プロパティの値を確認
- レンダリング回数を確認

### 3. ネットワークタブでの確認

- APIリクエストの内容確認
- レスポンスの確認
- エラーステータスの確認

### 4. パフォーマンスタブでの確認

- レンダリング時間の測定
- メモリ使用量の確認
- CPU使用率の確認

---

## よくある質問（FAQ）

### Q: フォームの初期値が設定されない

**A:** `initialData`プロパティが正しく渡されているか、またはuseFormの`defaultValues`が設定されているか確認してください。

```tsx
const { register } = useForm<GoalFormData>({
  defaultValues: initialData,
});
```

### Q: バリデーションエラーが英語で表示される

**A:** Zodスキーマでカスタムエラーメッセージを設定してください。

```tsx
z.string().min(1, 'この項目は必須です');
```

### Q: 文字数カウンターが更新されない

**A:** `watch`を使用してフィールドの値を監視してください。

```tsx
const watchedValue = watch('title');
<CharacterCounter current={watchedValue?.length || 0} max={100} />;
```

### Q: 下書きデータが復元されない

**A:** `initialData`が設定される前にフォームが初期化されていないか確認してください。

```tsx
if (isLoading) return <div>読み込み中...</div>;
return <GoalInputForm initialData={draftData} />;
```

---

## サポート

このガイドで解決できない問題がある場合は、以下の情報を含めて開発チームにお問い合わせください：

1. 発生している問題の詳細
2. エラーメッセージ（あれば）
3. 再現手順
4. 使用しているブラウザとバージョン
5. 関連するコードスニペット

問題の早期解決のため、可能な限り詳細な情報をお提供ください。
