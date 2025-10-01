# 目標入力フォーム パフォーマンスガイドライン

## 概要

このドキュメントでは、目標入力フォームコンポーネントのパフォーマンスを最適化するためのガイドラインと実装例を提供します。

## 目次

1. [パフォーマンス目標](#パフォーマンス目標)
2. [レンダリング最適化](#レンダリング最適化)
3. [メモリ管理](#メモリ管理)
4. [ネットワーク最適化](#ネットワーク最適化)
5. [バンドルサイズ最適化](#バンドルサイズ最適化)
6. [ユーザーエクスペリエンス最適化](#ユーザーエクスペリエンス最適化)
7. [パフォーマンス測定](#パフォーマンス測定)
8. [ベストプラクティス](#ベストプラクティス)

---

## パフォーマンス目標

### 基準値

| 指標                   | 目標値           | 測定方法              |
| ---------------------- | ---------------- | --------------------- |
| 初回レンダリング時間   | < 100ms          | Performance API       |
| フィールド入力応答時間 | < 16ms           | Input lag measurement |
| フォーム送信時間       | < 2秒            | Network timing        |
| メモリ使用量           | < 10MB           | Chrome DevTools       |
| バンドルサイズ         | < 50KB (gzipped) | Bundle analyzer       |

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: < 2.5秒
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

---

## レンダリング最適化

### 1. React.memoの活用

不要な再レンダリングを防ぐためにReact.memoを使用します。

```tsx
import React, { memo } from 'react';

// ✅ 最適化されたFormFieldコンポーネント
const FormField = memo<FormFieldProps>(
  ({ label, required, error, helpText, children }) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helpText && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
```

### 2. useCallbackとuseMemoの使用

関数とオブジェクトの再作成を防ぎます。

```tsx
import React, { useCallback, useMemo } from 'react';

function OptimizedGoalInputForm({ onSubmit, onDraftSave }: Props) {
  // ✅ 関数のメモ化
  const handleSubmit = useCallback(
    async (data: GoalFormData) => {
      try {
        await onSubmit(data);
      } catch (error) {
        console.error('Submit error:', error);
      }
    },
    [onSubmit]
  );

  const handleDraftSave = useCallback(
    async (data: Partial<GoalFormData>) => {
      try {
        await onDraftSave(data);
      } catch (error) {
        console.error('Draft save error:', error);
      }
    },
    [onDraftSave]
  );

  // ✅ 計算結果のメモ化
  const validationSchema = useMemo(() => {
    return goalFormSchema;
  }, []);

  // ✅ オブジェクトのメモ化
  const formConfig = useMemo(
    () => ({
      resolver: zodResolver(validationSchema),
      mode: 'onChange' as const,
    }),
    [validationSchema]
  );

  const { register, handleSubmit: rhfHandleSubmit } =
    useForm<GoalFormData>(formConfig);

  return (
    <form onSubmit={rhfHandleSubmit(handleSubmit)}>
      {/* フォームフィールド */}
    </form>
  );
}
```

### 3. 条件付きレンダリングの最適化

```tsx
// ❌ 非効率な条件付きレンダリング
function BadExample({ error, isLoading }) {
  return (
    <div>
      {isLoading ? <LoadingSpinner /> : null}
      {error ? <ErrorMessage error={error} /> : null}
      <FormContent />
    </div>
  );
}

// ✅ 効率的な条件付きレンダリング
function GoodExample({ error, isLoading }) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <FormContent />;
}
```

### 4. 仮想化の実装（大量データの場合）

```tsx
import { FixedSizeList as List } from 'react-window';

// 大量の選択肢がある場合の最適化
function VirtualizedSelect({ options }: { options: string[] }) {
  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => (
    <div style={style}>
      <option value={options[index]}>{options[index]}</option>
    </div>
  );

  return (
    <List height={200} itemCount={options.length} itemSize={35}>
      {Row}
    </List>
  );
}
```

---

## メモリ管理

### 1. イベントリスナーのクリーンアップ

```tsx
import React, { useEffect, useCallback } from 'react';

function GoalInputForm() {
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    const hasUnsavedChanges = checkUnsavedChanges();
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  }, []);

  useEffect(() => {
    // ✅ イベントリスナーの登録
    window.addEventListener('beforeunload', handleBeforeUnload);

    // ✅ クリーンアップ関数でリスナーを削除
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  return <form>{/* フォーム内容 */}</form>;
}
```

### 2. タイマーとインターバルのクリーンアップ

```tsx
import React, { useEffect, useRef } from 'react';

function AutoSaveForm({ onDraftSave }: { onDraftSave: (data: any) => void }) {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // ✅ 自動保存の設定
    intervalRef.current = setInterval(() => {
      const formData = getCurrentFormData();
      if (formData) {
        onDraftSave(formData);
      }
    }, 30000); // 30秒間隔

    // ✅ クリーンアップでインターバルをクリア
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onDraftSave]);

  return <form>{/* フォーム内容 */}</form>;
}
```

### 3. メモリリークの防止

```tsx
import React, { useEffect, useRef } from 'react';

function FormWithFileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ✅ Object URLを作成
      const objectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(objectUrl);

      // プレビュー表示など
    }
  };

  useEffect(() => {
    // ✅ コンポーネントアンマウント時にObject URLを解放
    return () => {
      objectUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  return <input ref={fileInputRef} type="file" onChange={handleFileChange} />;
}
```

---

## ネットワーク最適化

### 1. デバウンス処理

```tsx
import { debounce } from 'lodash';
import { useCallback, useMemo } from 'react';

function OptimizedDraftSave({
  onDraftSave,
}: {
  onDraftSave: (data: any) => void;
}) {
  // ✅ デバウンス処理で不要なAPI呼び出しを削減
  const debouncedSave = useMemo(
    () =>
      debounce((data: Partial<GoalFormData>) => {
        onDraftSave(data);
      }, 1000), // 1秒間隔
    [onDraftSave]
  );

  const handleInputChange = useCallback(
    (data: Partial<GoalFormData>) => {
      debouncedSave(data);
    },
    [debouncedSave]
  );

  return <form>{/* フォーム内容 */}</form>;
}
```

### 2. リクエストのキャンセル

```tsx
import React, { useEffect, useRef } from 'react';

function FormWithCancellation() {
  const abortControllerRef = useRef<AbortController>();

  const handleSubmit = async (data: GoalFormData) => {
    // ✅ 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // ✅ 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Network error');
      }

      const result = await response.json();
      console.log('Success:', result);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Submit error:', error);
      }
    }
  };

  useEffect(() => {
    // ✅ コンポーネントアンマウント時にリクエストをキャンセル
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return <form onSubmit={handleSubmit}>{/* フォーム内容 */}</form>;
}
```

### 3. キャッシュ戦略

```tsx
// ✅ React Queryを使用したキャッシュ戦略
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function CachedGoalForm() {
  const queryClient = useQueryClient();

  // ✅ 下書きデータのキャッシュ
  const { data: draftData } = useQuery({
    queryKey: ['goalDraft'],
    queryFn: () => fetch('/api/goals/draft').then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // ✅ 下書き保存のミューテーション
  const draftMutation = useMutation({
    mutationFn: (data: Partial<GoalFormData>) =>
      fetch('/api/goals/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['goalDraft'] });
    },
  });

  return <GoalInputForm initialData={draftData} />;
}
```

---

## バンドルサイズ最適化

### 1. 動的インポート

```tsx
import React, { lazy, Suspense } from 'react';

// ✅ 重いコンポーネントの動的インポート
const DatePicker = lazy(() => import('react-datepicker'));
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

function LazyLoadedForm() {
  return (
    <form>
      <Suspense fallback={<div>日付ピッカーを読み込み中...</div>}>
        <DatePicker />
      </Suspense>

      <Suspense fallback={<div>エディターを読み込み中...</div>}>
        <RichTextEditor />
      </Suspense>
    </form>
  );
}
```

### 2. Tree Shakingの活用

```tsx
// ❌ 全体をインポート（バンドルサイズが大きくなる）
import * as lodash from 'lodash';

// ✅ 必要な関数のみインポート
import { debounce } from 'lodash/debounce';
import { isEqual } from 'lodash/isEqual';

// ✅ さらに最適化（個別パッケージを使用）
import debounce from 'lodash.debounce';
import isEqual from 'lodash.isequal';
```

### 3. バンドル分析

```bash
# バンドルサイズの分析
npm run build:analyze

# 結果の確認
# - 大きなライブラリの特定
# - 重複する依存関係の確認
# - 不要なコードの特定
```

---

## ユーザーエクスペリエンス最適化

### 1. プログレッシブローディング

```tsx
import React, { useState, useEffect } from 'react';

function ProgressiveForm() {
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    // ✅ 段階的にコンポーネントを読み込み
    const stages = [
      () => setLoadingStage(1), // 基本フィールド
      () => setLoadingStage(2), // 高度なフィールド
      () => setLoadingStage(3), // 補助機能
    ];

    stages.forEach((stage, index) => {
      setTimeout(stage, index * 100);
    });
  }, []);

  return (
    <form>
      {/* 基本フィールドは即座に表示 */}
      <BasicFields />

      {/* 段階的に表示 */}
      {loadingStage >= 2 && <AdvancedFields />}
      {loadingStage >= 3 && <AuxiliaryFeatures />}
    </form>
  );
}
```

### 2. スケルトンローディング

```tsx
function FormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-4"></div>

      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-24 bg-gray-200 rounded mb-4"></div>

      <div className="h-4 bg-gray-200 rounded w-1/5 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
    </div>
  );
}

function LoadingAwareForm({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return <FormSkeleton />;
  }

  return <GoalInputForm />;
}
```

### 3. 楽観的更新

```tsx
function OptimisticForm() {
  const [optimisticState, setOptimisticState] = useState<string | null>(null);

  const handleDraftSave = async (data: Partial<GoalFormData>) => {
    // ✅ 楽観的更新：即座にUIを更新
    setOptimisticState('保存中...');

    try {
      await saveDraft(data);
      setOptimisticState('保存完了');

      // 3秒後にメッセージを消す
      setTimeout(() => setOptimisticState(null), 3000);
    } catch (error) {
      setOptimisticState('保存に失敗しました');
    }
  };

  return (
    <div>
      <GoalInputForm onDraftSave={handleDraftSave} />
      {optimisticState && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded">
          {optimisticState}
        </div>
      )}
    </div>
  );
}
```

---

## パフォーマンス測定

### 1. Performance APIの使用

```tsx
function PerformanceMonitor() {
  useEffect(() => {
    // ✅ レンダリング時間の測定
    const startTime = performance.now();

    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        console.log(`${entry.name}: ${entry.duration}ms`);
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });

    return () => {
      const endTime = performance.now();
      console.log(`Component render time: ${endTime - startTime}ms`);
      observer.disconnect();
    };
  }, []);

  return <GoalInputForm />;
}
```

### 2. React DevTools Profilerの活用

```tsx
import { Profiler } from 'react';

function ProfiledForm() {
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    console.log('Profiler:', {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    });
  };

  return (
    <Profiler id="GoalInputForm" onRender={onRenderCallback}>
      <GoalInputForm />
    </Profiler>
  );
}
```

### 3. カスタムパフォーマンスフック

```tsx
import { useEffect, useRef } from 'react';

function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const renderTime = performance.now() - startTimeRef.current;

    console.log(
      `${componentName} - Render #${renderCountRef.current}: ${renderTime}ms`
    );

    // メモリ使用量の監視
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`Memory usage: ${memory.usedJSHeapSize / 1024 / 1024}MB`);
    }
  });

  return {
    renderCount: renderCountRef.current,
  };
}

// 使用例
function MonitoredForm() {
  const { renderCount } = usePerformanceMonitor('GoalInputForm');

  return (
    <div>
      <div>Render count: {renderCount}</div>
      <GoalInputForm />
    </div>
  );
}
```

---

## ベストプラクティス

### 1. コンポーネント設計

```tsx
// ✅ 単一責任の原則に従った設計
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

// ✅ プロパティの型を明確に定義
interface GoalInputFormProps {
  initialData?: Partial<GoalFormData>;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onDraftSave: (data: Partial<GoalFormData>) => Promise<void>;
  isSubmitting?: boolean;
  isDraftSaving?: boolean;
}

// ✅ デフォルトプロパティの設定
const GoalInputForm: React.FC<GoalInputFormProps> = ({
  initialData,
  onSubmit,
  onDraftSave,
  isSubmitting = false,
  isDraftSaving = false,
}) => {
  // コンポーネントの実装
};
```

### 2. 状態管理の最適化

```tsx
// ✅ 状態の分離
function OptimizedStateManagement() {
  // フォーム状態
  const [formData, setFormData] = useState<Partial<GoalFormData>>({});

  // UI状態
  const [uiState, setUiState] = useState({
    isSubmitting: false,
    isDraftSaving: false,
    error: null,
  });

  // 計算された値はuseMemoで最適化
  const isFormValid = useMemo(() => {
    return validateForm(formData);
  }, [formData]);

  return (
    <GoalInputForm
      initialData={formData}
      isSubmitting={uiState.isSubmitting}
      error={uiState.error}
    />
  );
}
```

### 3. エラーバウンダリーの実装

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Form error:', error, errorInfo);

    // エラー報告サービスに送信
    // reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            フォームでエラーが発生しました
          </h2>
          <p className="text-red-600">
            ページを再読み込みしてもう一度お試しください。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 使用例
function App() {
  return (
    <FormErrorBoundary>
      <GoalInputForm />
    </FormErrorBoundary>
  );
}
```

### 4. パフォーマンス監視の自動化

```tsx
// パフォーマンス監視の自動化
function setupPerformanceMonitoring() {
  // Core Web Vitalsの測定
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });

  // カスタムメトリクスの測定
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'measure') {
        console.log(`${entry.name}: ${entry.duration}ms`);
      }
    });
  });

  observer.observe({ entryTypes: ['measure'] });
}

// アプリケーション起動時に実行
setupPerformanceMonitoring();
```

---

## チェックリスト

### 開発時のチェックポイント

- [ ] React.memoを適切に使用している
- [ ] useCallbackとuseMemoで不要な再計算を防いでいる
- [ ] イベントリスナーとタイマーを適切にクリーンアップしている
- [ ] 動的インポートで大きなライブラリを分割している
- [ ] デバウンス処理でAPI呼び出しを最適化している
- [ ] エラーバウンダリーを実装している

### デプロイ前のチェックポイント

- [ ] バンドルサイズが目標値以下である
- [ ] Core Web Vitalsが基準を満たしている
- [ ] メモリリークが発生していない
- [ ] パフォーマンステストが通過している
- [ ] 異なるデバイスでの動作確認が完了している

### 継続的な監視ポイント

- [ ] レンダリング時間の監視
- [ ] メモリ使用量の監視
- [ ] ネットワークリクエストの監視
- [ ] ユーザーエクスペリエンスメトリクスの監視
- [ ] エラー率の監視

---

## まとめ

このガイドラインに従うことで、目標入力フォームコンポーネントのパフォーマンスを大幅に改善できます。重要なのは、開発初期からパフォーマンスを意識し、継続的に測定・改善することです。

パフォーマンス最適化は一度行えば終わりではなく、継続的なプロセスです。定期的にメトリクスを確認し、必要に応じて最適化を行ってください。
