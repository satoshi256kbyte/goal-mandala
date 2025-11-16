# 設計書

## 概要

useGoalFormフックのメモリリーク問題と無限ループ問題を根本解決するための設計を定義する。主な改善点は、useRefを使用した安定した関数参照の保持、useEffectの依存配列の最適化、タイマーとサブスクリプションの適切なクリーンアップである。

## アーキテクチャ

### 現在の問題点

```typescript
// 問題1: saveDraftが依存配列に含まれており、無限ループが発生
useEffect(() => {
  // ...
  const timer = setTimeout(async () => {
    await saveDraft(); // この関数が毎回新しく作成される
  }, autoSaveInterval);
  // ...
}, [isDirty, enableAutoSave, onDraftSave, autoSaveInterval, saveDraft]); // saveDraftが依存配列に含まれている

// 問題2: タイマーのクリーンアップが不完全
const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
// stateでタイマーを管理すると、再レンダリングが発生し、クリーンアップが複雑になる

// 問題3: onDraftSaveが依存配列に含まれており、親コンポーネントの再レンダリングで無限ループが発生
useEffect(() => {
  // ...
}, [isDirty, enableAutoSave, onDraftSave, autoSaveInterval, saveDraft]);
```

### 改善後のアーキテクチャ

```typescript
// 解決策1: useRefを使用して安定した関数参照を保持
const onDraftSaveRef = useRef(onDraftSave);
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

// 解決策2: useEffectの依存配列から関数を除外
useEffect(() => {
  onDraftSaveRef.current = onDraftSave;
}, [onDraftSave]);

// 解決策3: タイマーをuseRefで管理し、クリーンアップを簡素化
useEffect(() => {
  if (!enableAutoSave || !onDraftSaveRef.current) {
    return;
  }

  if (!isDirty) {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    return;
  }

  // 既存のタイマーをクリア
  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }

  // 新しいタイマーを設定
  autoSaveTimerRef.current = setTimeout(async () => {
    try {
      const currentData = getValues();
      const validationResult = partialGoalFormSchema.safeParse(currentData);
      if (validationResult.success && onDraftSaveRef.current) {
        await onDraftSaveRef.current(validationResult.data);
      }
    } catch (error) {
      console.warn('自動保存に失敗しました:', error);
    }
  }, autoSaveInterval);

  // クリーンアップ
  return () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };
}, [isDirty, enableAutoSave, autoSaveInterval, getValues]); // 関数を依存配列から除外
```

## コンポーネント設計

### useGoalFormフックの改善

#### 1. useRefを使用した関数参照の管理

```typescript
export const useGoalForm = (options: UseGoalFormOptions = {}): UseGoalFormReturn => {
  const {
    initialData,
    mode = 'onBlur',
    enableRealtimeValidation = true,
    enableAutoSave = true,
    autoSaveInterval = 30000,
    onDraftSave,
  } = options;

  // useRefで関数参照を保持
  const onDraftSaveRef = useRef(onDraftSave);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // onDraftSaveが変更されたらrefを更新
  useEffect(() => {
    onDraftSaveRef.current = onDraftSave;
  }, [onDraftSave]);

  // React Hook Formの初期化
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      deadline: initialData?.deadline || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
    },
    mode,
  });

  const {
    watch,
    getValues,
    formState: { errors, isValid, isDirty, isSubmitting, isValidating },
    trigger,
    reset,
  } = form;

  // 内部状態
  const [lastSavedData, setLastSavedData] = useState<PartialGoalFormData | null>(null);

  // フォームの値を監視
  const watchedValues = watch();

  // ...
};
```

#### 2. 初期データ処理の改善

```typescript
// 初期データが変更された場合にフォームをリセット
// initialDataをJSON.stringifyで比較して、不必要な再実行を防ぐ
const initialDataRef = useRef<string>('');

useEffect(() => {
  const currentInitialData = JSON.stringify(initialData);
  
  if (initialData && currentInitialData !== initialDataRef.current) {
    initialDataRef.current = currentInitialData;
    
    reset({
      title: initialData.title || '',
      description: initialData.description || '',
      deadline: initialData.deadline || '',
      background: initialData.background || '',
      constraints: initialData.constraints || '',
    });
    setLastSavedData(initialData);
  }
}, [initialData, reset]);
```

#### 3. checkUnsavedChangesの最適化

```typescript
// useMemoを使用してcheckUnsavedChangesの結果をメモ化
const hasUnsavedChanges = useMemo((): boolean => {
  if (!lastSavedData) {
    return isDirty;
  }

  const currentData = getValues();
  return Object.keys(currentData).some(
    key =>
      currentData[key as keyof GoalFormData] !== lastSavedData[key as keyof PartialGoalFormData]
  );
}, [lastSavedData, isDirty, getValues]);

// checkUnsavedChanges関数は単純にhasUnsavedChangesを返すだけ
const checkUnsavedChanges = useCallback((): boolean => {
  return hasUnsavedChanges;
}, [hasUnsavedChanges]);
```

#### 4. formStateの最適化

```typescript
// useMemoを使用してformStateをメモ化
const formState: FormState = useMemo(
  () => ({
    isValid,
    isDirty,
    isSubmitting,
    isValidating,
    hasErrors: Object.keys(errors).length > 0,
    hasUnsavedChanges,
  }),
  [isValid, isDirty, isSubmitting, isValidating, errors, hasUnsavedChanges]
);
```

#### 5. 自動保存タイマーの改善

```typescript
// 自動保存タイマーの設定
useEffect(() => {
  if (!enableAutoSave || !onDraftSaveRef.current) {
    return;
  }

  // 変更がない場合はタイマーをクリア
  if (!isDirty) {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    return;
  }

  // 既存のタイマーをクリア
  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }

  // 新しいタイマーを設定
  autoSaveTimerRef.current = setTimeout(async () => {
    try {
      const currentData = getValues();
      const validationResult = partialGoalFormSchema.safeParse(currentData);

      if (validationResult.success && onDraftSaveRef.current) {
        await onDraftSaveRef.current(validationResult.data);
        setLastSavedData(validationResult.data);
      }
    } catch (error) {
      console.warn('自動保存に失敗しました:', error);
    } finally {
      autoSaveTimerRef.current = null;
    }
  }, autoSaveInterval);

  // クリーンアップ
  return () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };
}, [isDirty, enableAutoSave, autoSaveInterval, getValues]);
```

#### 6. saveDraft関数の改善

```typescript
// saveDraft関数をuseCallbackでメモ化し、依存配列を最小限にする
const saveDraft = useCallback(async (): Promise<void> => {
  if (!onDraftSaveRef.current) {
    return;
  }

  try {
    const currentData = getValues();
    const validationResult = partialGoalFormSchema.safeParse(currentData);

    if (validationResult.success) {
      await onDraftSaveRef.current(validationResult.data);
      setLastSavedData(validationResult.data);
    }
  } catch (error) {
    console.error('下書き保存エラー:', error);
    throw error;
  }
}, [getValues]);
```

#### 7. リアルタイムバリデーションの改善

```typescript
// リアルタイムバリデーション
useEffect(() => {
  if (!enableRealtimeValidation) {
    return;
  }

  // フィールドの値が変更されたときにバリデーションを実行
  const subscription = watch((value, { name }) => {
    if (name && form.formState.touchedFields[name as keyof GoalFormData]) {
      trigger(name as keyof GoalFormData);
    }
  });

  return () => subscription.unsubscribe();
}, [enableRealtimeValidation, watch, trigger, form.formState.touchedFields]);
```

### useFieldValidationフックの実装

```typescript
/**
 * フィールド別のバリデーションフック
 */
export const useFieldValidation = (fieldName: keyof GoalFormData) => {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    error?: string;
    isValidating: boolean;
  }>({
    isValid: true,
    isValidating: false,
  });

  const validateField = useCallback(
    async (value: string) => {
      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        const validator =
          fieldValidators[
            `validate${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}` as keyof typeof fieldValidators
          ];

        if (validator) {
          const result = (validator as (value: string) => { isValid: boolean; error?: string })(
            value
          );
          setValidationState({
            isValid: result.isValid,
            error: result.error,
            isValidating: false,
          });
          return result.isValid;
        }

        setValidationState({
          isValid: true,
          isValidating: false,
        });
        return true;
      } catch (error) {
        setValidationState({
          isValid: false,
          error: '検証中にエラーが発生しました',
          isValidating: false,
        });
        return false;
      }
    },
    [fieldName]
  );

  return {
    validationState,
    validateField,
  };
};
```

### useFormSubmissionフックの実装

```typescript
/**
 * フォームの送信状態を管理するフック
 */
export const useFormSubmission = () => {
  const [submissionState, setSubmissionState] = useState<{
    isSubmitting: boolean;
    error?: string;
    success: boolean;
  }>({
    isSubmitting: false,
    success: false,
  });

  const submitForm = useCallback(async (submitFn: () => Promise<void>) => {
    setSubmissionState({
      isSubmitting: true,
      success: false,
    });

    try {
      await submitFn();
      setSubmissionState({
        isSubmitting: false,
        success: true,
      });
    } catch (error) {
      setSubmissionState({
        isSubmitting: false,
        error: error instanceof Error ? error.message : '送信中にエラーが発生しました',
        success: false,
      });
      throw error;
    }
  }, []);

  const resetSubmissionState = useCallback(() => {
    setSubmissionState({
      isSubmitting: false,
      success: false,
    });
  }, []);

  return {
    submissionState,
    submitForm,
    resetSubmissionState,
  };
};
```

## テスト設計

### テストケースの修正

#### 1. useFieldValidationのテスト

```typescript
describe('useFieldValidation', () => {
  it('有効な値でバリデーションが成功する', async () => {
    const { result } = renderHookWithProviders(() => useFieldValidation('title'));

    await act(async () => {
      const isValid = await result.current.validateField('有効なタイトル');
      expect(isValid).toBe(true);
    });

    expect(result.current.validationState.isValid).toBe(true);
    expect(result.current.validationState.error).toBeUndefined();
    expect(result.current.validationState.isValidating).toBe(false);
  });

  it('無効な値でバリデーションが失敗する', async () => {
    const { result } = renderHookWithProviders(() => useFieldValidation('title'));

    await act(async () => {
      const isValid = await result.current.validateField('a'.repeat(101)); // 100文字制限を超える
      expect(isValid).toBe(false);
    });

    expect(result.current.validationState.isValid).toBe(false);
    expect(result.current.validationState.error).toBeDefined();
    expect(result.current.validationState.isValidating).toBe(false);
  });

  it('バリデーション中の状態が正しく管理される', async () => {
    const { result } = renderHookWithProviders(() => useFieldValidation('title'));

    // バリデーション開始前
    expect(result.current.validationState.isValidating).toBe(false);

    // バリデーション実行
    const validatePromise = act(async () => {
      return result.current.validateField('テスト');
    });

    // バリデーション完了後
    await validatePromise;
    expect(result.current.validationState.isValidating).toBe(false);
  });
});
```

#### 2. useFormSubmissionのテスト

```typescript
describe('useFormSubmission', () => {
  it('送信が成功する', async () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
    });

    expect(mockSubmitFn).toHaveBeenCalledTimes(1);
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(true);
    expect(result.current.submissionState.error).toBeUndefined();
  });

  it('送信エラーが適切に処理される', async () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    const mockSubmitFn = vi.fn().mockRejectedValue(new Error('送信エラー'));

    await expect(
      act(async () => {
        await result.current.submitForm(mockSubmitFn);
      })
    ).rejects.toThrow('送信エラー');

    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBe('送信エラー');
  });

  it('送信中の状態が正しく管理される', async () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    const mockSubmitFn = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    // 送信開始前
    expect(result.current.submissionState.isSubmitting).toBe(false);

    // 送信開始
    const submitPromise = act(async () => {
      return result.current.submitForm(mockSubmitFn);
    });

    // 送信完了後
    await submitPromise;
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(true);
  });

  it('送信状態がリセットされる', () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    // 初期状態
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);

    // リセット実行
    act(() => {
      result.current.resetSubmissionState();
    });

    // リセット後
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBeUndefined();
  });
});
```

#### 3. 自動保存テストの改善

```typescript
describe('自動保存', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('自動保存が有効な場合、指定間隔で保存される', async () => {
    const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHookWithProviders(() =>
      useGoalForm({
        onDraftSave: mockOnDraftSave,
        enableAutoSave: true,
        autoSaveInterval: 5000,
      })
    );

    act(() => {
      result.current.setValue('title', 'テスト');
    });

    // 5秒経過をシミュレート
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve(); // マイクロタスクを処理
    });

    await waitFor(
      () => {
        expect(mockOnDraftSave).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    // クリーンアップ
    unmount();
    
    // アンマウント後にタイマーがクリアされていることを確認
    vi.advanceTimersByTime(5000);
    expect(mockOnDraftSave).toHaveBeenCalledTimes(1); // 追加の呼び出しがないことを確認
  });

  it('自動保存が無効な場合、保存されない', async () => {
    const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHookWithProviders(() =>
      useGoalForm({
        onDraftSave: mockOnDraftSave,
        enableAutoSave: false,
      })
    );

    act(() => {
      result.current.setValue('title', 'テスト');
    });

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockOnDraftSave).not.toHaveBeenCalled();

    // クリーンアップ
    unmount();
  });

  it('コンポーネントがアンマウントされた際にタイマーがクリアされる', async () => {
    const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHookWithProviders(() =>
      useGoalForm({
        onDraftSave: mockOnDraftSave,
        enableAutoSave: true,
        autoSaveInterval: 5000,
      })
    );

    act(() => {
      result.current.setValue('title', 'テスト');
    });

    // 3秒経過（タイマーが実行される前）
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // アンマウント
    unmount();

    // さらに5秒経過
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // タイマーがクリアされているため、保存されない
    expect(mockOnDraftSave).not.toHaveBeenCalled();
  });
});
```

## データモデル

### 変更なし

既存のデータモデル（GoalFormData、PartialGoalFormData、FormState、FieldState）は変更しない。

## エラーハンドリング

### 自動保存のエラーハンドリング

```typescript
// 自動保存タイマーの設定
useEffect(() => {
  // ...

  autoSaveTimerRef.current = setTimeout(async () => {
    try {
      const currentData = getValues();
      const validationResult = partialGoalFormSchema.safeParse(currentData);

      if (validationResult.success && onDraftSaveRef.current) {
        await onDraftSaveRef.current(validationResult.data);
        setLastSavedData(validationResult.data);
      }
    } catch (error) {
      // エラーをログに記録するが、ユーザーには通知しない（自動保存のため）
      console.warn('自動保存に失敗しました:', error);
    } finally {
      // エラーが発生してもタイマーをクリアする
      autoSaveTimerRef.current = null;
    }
  }, autoSaveInterval);

  // ...
}, [isDirty, enableAutoSave, autoSaveInterval, getValues]);
```

### 手動保存のエラーハンドリング

```typescript
const saveDraft = useCallback(async (): Promise<void> => {
  if (!onDraftSaveRef.current) {
    return;
  }

  try {
    const currentData = getValues();
    const validationResult = partialGoalFormSchema.safeParse(currentData);

    if (validationResult.success) {
      await onDraftSaveRef.current(validationResult.data);
      setLastSavedData(validationResult.data);
    }
  } catch (error) {
    // エラーをログに記録し、呼び出し元に再スローする
    console.error('下書き保存エラー:', error);
    throw error;
  }
}, [getValues]);
```

## パフォーマンス最適化

### 1. useMemoとuseCallbackの適切な使用

- `formState`: useMemoでメモ化
- `hasUnsavedChanges`: useMemoでメモ化
- `checkUnsavedChanges`: useCallbackでメモ化
- `getFieldState`: useCallbackでメモ化
- `validateField`: useCallbackでメモ化
- `saveDraft`: useCallbackでメモ化
- `resetForm`: useCallbackでメモ化

### 2. useRefによる不必要な再レンダリングの防止

- `onDraftSaveRef`: onDraftSave関数の参照を保持
- `autoSaveTimerRef`: タイマーIDを保持（stateではなくrefを使用）
- `initialDataRef`: 初期データの比較用

### 3. useEffectの依存配列の最適化

- 関数をuseRefで管理し、依存配列から除外
- 必要最小限の依存のみを含める
- JSON.stringifyを使用した深い比較（initialDataの場合）

## テスト戦略

### 1. ユニットテスト

- useGoalFormフックの各機能をテスト
- useFieldValidationフックのテスト
- useFormSubmissionフックのテスト
- メモリリークが発生しないことを確認
- 無限ループが発生しないことを確認

### 2. 統合テスト

- フォーム全体の動作をテスト
- 自動保存機能のテスト
- リアルタイムバリデーションのテスト

### 3. パフォーマンステスト

- 再レンダリング回数の測定
- メモリ使用量の測定
- タイマーのクリーンアップの確認

## 実装の優先順位

1. **高優先度**: useRefを使用した関数参照の管理
2. **高優先度**: 自動保存タイマーの改善
3. **高優先度**: useEffectの依存配列の最適化
4. **中優先度**: useMemoとuseCallbackの最適化
5. **中優先度**: テストケースの修正
6. **低優先度**: パフォーマンステストの追加

## セキュリティ考慮事項

- 特になし（既存のセキュリティ対策を維持）

## 互換性

- 既存のAPIは変更しないため、後方互換性を維持
- 内部実装のみを変更
