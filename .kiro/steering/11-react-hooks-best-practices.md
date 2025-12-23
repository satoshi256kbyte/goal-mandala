---
inclusion: fileMatch
fileMatchPattern: 'packages/frontend/**/*.{ts,tsx}'
---

# React Hooksのベストプラクティス

## 概要

このドキュメントは、useGoalFormフックのメモリリーク問題と無限ループ問題の解決を通じて得られた、React Hooksの実装におけるベストプラクティスをまとめたものです。

## useRefの使用方法とユースケース

### useRefを使用すべき場面

1. 関数の安定した参照を保持する場合
   - useEffectの依存配列に関数を含めると無限ループが発生する可能性がある
   - useRefを使用して関数の最新の参照を保持し、依存配列から除外する

```typescript
// ❌ 悪い例：無限ループが発生する可能性
const saveDraft = useCallback(async () => {
  if (!onDraftSave) return;
  await onDraftSave(data);
}, [onDraftSave, data]);

useEffect(() => {
  // saveDraftが依存配列に含まれているため、無限ループが発生
  const timer = setTimeout(() => saveDraft(), 5000);
  return () => clearTimeout(timer);
}, [saveDraft]);

// ✅ 良い例：useRefで関数参照を保持
const onDraftSaveRef = useRef(onDraftSave);

useEffect(() => {
  onDraftSaveRef.current = onDraftSave;
}, [onDraftSave]);

useEffect(() => {
  const timer = setTimeout(async () => {
    if (onDraftSaveRef.current) {
      await onDraftSaveRef.current(data);
    }
  }, 5000);
  return () => clearTimeout(timer);
}, [data]); // onDraftSaveを依存配列から除外
```

2. タイマーIDを保持する場合
   - stateでタイマーIDを管理すると、再レンダリングが発生し、クリーンアップが複雑になる
   - useRefを使用してタイマーIDを保持し、再レンダリングを防ぐ

```typescript
// ❌ 悪い例：stateでタイマーを管理
const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (timer) clearTimeout(timer);
  const newTimer = setTimeout(() => {}, 5000);
  setTimer(newTimer); // 再レンダリングが発生
  return () => {
    if (timer) clearTimeout(timer);
  };
}, [timer]); // timerが依存配列に含まれているため、無限ループの可能性

// ✅ 良い例：useRefでタイマーを管理
const timerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {}, 5000);
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
}, []); // 依存配列が空なので、無限ループは発生しない
```

3. 前回の値を保持する場合
   - 初期データの変更を検出する際に、前回の値と比較する必要がある
   - useRefを使用して前回の値を保持し、不必要な再実行を防ぐ

```typescript
// ✅ 良い例：useRefで前回の値を保持
const initialDataRef = useRef<string>('');

useEffect(() => {
  const currentInitialData = JSON.stringify(initialData);
  
  if (initialData && currentInitialData !== initialDataRef.current) {
    initialDataRef.current = currentInitialData;
    // 初期データが変更された場合の処理
    reset(initialData);
  }
}, [initialData, reset]);
```

### useRefを使用すべきでない場面

1. レンダリングに影響する値を保持する場合
   - useRefの値が変更されても再レンダリングは発生しない
   - レンダリングに影響する値はstateで管理する

```typescript
// ❌ 悪い例：レンダリングに影響する値をuseRefで管理
const countRef = useRef(0);

const increment = () => {
  countRef.current += 1; // 再レンダリングが発生しないため、UIが更新されない
};

// ✅ 良い例：レンダリングに影響する値はstateで管理
const [count, setCount] = useState(0);

const increment = () => {
  setCount(prev => prev + 1); // 再レンダリングが発生し、UIが更新される
};
```

2. ユーザーに表示する値を保持する場合
   - useRefの値はレンダリングに反映されない
   - ユーザーに表示する値はstateで管理する

## useEffectの依存配列の最適化

### 依存配列の基本原則

1. 必要最小限の依存のみを含める
   - 不必要な依存を含めると、無限ループや不必要な再実行が発生する
   - 関数はuseRefで管理し、依存配列から除外する

2. 関数を依存配列に含めない
   - 関数は毎回新しく作成されるため、依存配列に含めると無限ループが発生する
   - useRefを使用して関数の最新の参照を保持する

3. オブジェクトや配列を依存配列に含める場合は注意
   - オブジェクトや配列は参照が変わるため、依存配列に含めると毎回再実行される
   - JSON.stringifyで文字列化して比較するか、useMemoでメモ化する

### 依存配列の最適化例

```typescript
// ❌ 悪い例：関数を依存配列に含める
useEffect(() => {
  const timer = setTimeout(async () => {
    await saveDraft(); // saveDraftが依存配列に含まれている
  }, 5000);
  return () => clearTimeout(timer);
}, [saveDraft]); // saveDraftが変更されるたびに再実行

// ✅ 良い例：useRefで関数参照を保持し、依存配列から除外
const saveDraftRef = useRef(saveDraft);

useEffect(() => {
  saveDraftRef.current = saveDraft;
}, [saveDraft]);

useEffect(() => {
  const timer = setTimeout(async () => {
    if (saveDraftRef.current) {
      await saveDraftRef.current();
    }
  }, 5000);
  return () => clearTimeout(timer);
}, []); // 依存配列が空なので、無限ループは発生しない
```

## useMemoとuseCallbackの使用方法

### useMemoの使用方法

1. 計算コストの高い値をメモ化する
   - 毎回計算すると重い処理をuseMemoでメモ化する
   - 依存配列が変更されない限り、前回の計算結果を再利用する

```typescript
// ✅ 良い例：計算コストの高い値をuseMemoでメモ化
const hasUnsavedChanges = useMemo((): boolean => {
  if (!lastSavedData) {
    return isDirty;
  }

  const currentData = getValues();
  return Object.keys(currentData).some(
    key => currentData[key] !== lastSavedData[key]
  );
}, [lastSavedData, isDirty, getValues]);
```

2. オブジェクトや配列をメモ化する
   - オブジェクトや配列は毎回新しく作成されるため、useMemoでメモ化する
   - 依存配列が変更されない限り、同じ参照を返す

```typescript
// ✅ 良い例：オブジェクトをuseMemoでメモ化
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

### useCallbackの使用方法

1. 関数をメモ化する
   - 関数は毎回新しく作成されるため、useCallbackでメモ化する
   - 依存配列が変更されない限り、同じ関数参照を返す

```typescript
// ✅ 良い例：関数をuseCallbackでメモ化
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
}, [getValues]); // 依存配列を最小限にする
```

2. 子コンポーネントに渡す関数をメモ化する
   - 子コンポーネントがReact.memoでメモ化されている場合、親コンポーネントの関数もメモ化する
   - 関数が変更されない限り、子コンポーネントは再レンダリングされない

## メモリリーク防止のガイドライン

### タイマーのクリーンアップ

1. useEffectのクリーンアップ関数でタイマーをクリアする
   - タイマーを設定したら、必ずクリーンアップ関数でクリアする
   - コンポーネントがアンマウントされた際にタイマーが残らないようにする

```typescript
// ✅ 良い例：タイマーのクリーンアップ
useEffect(() => {
  const timer = setTimeout(() => {
    // 処理
  }, 5000);

  return () => {
    clearTimeout(timer);
  };
}, []);
```

2. useRefでタイマーIDを管理する
   - useRefでタイマーIDを保持し、クリーンアップ時にクリアする
   - タイマーが実行された後もクリアする

```typescript
// ✅ 良い例：useRefでタイマーIDを管理
const timerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }

  timerRef.current = setTimeout(async () => {
    try {
      // 処理
    } finally {
      timerRef.current = null; // タイマー実行後にクリア
    }
  }, 5000);

  return () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
}, []);
```

### サブスクリプションのクリーンアップ

1. useEffectのクリーンアップ関数でサブスクリプションを解除する
   - サブスクリプションを作成したら、必ずクリーンアップ関数で解除する
   - コンポーネントがアンマウントされた際にサブスクリプションが残らないようにする

```typescript
// ✅ 良い例：サブスクリプションのクリーンアップ
useEffect(() => {
  if (!enableRealtimeValidation) {
    return;
  }

  const subscription = watch((value, { name }) => {
    if (name && form.formState.touchedFields[name]) {
      trigger(name);
    }
  });

  return () => subscription.unsubscribe();
}, [enableRealtimeValidation, watch, trigger, form.formState.touchedFields]);
```

### useRefとuseStateの使い分け

1. レンダリングに影響しない値はuseRefで管理
   - タイマーID、サブスクリプション、前回の値など
   - useRefの値が変更されても再レンダリングは発生しない

2. レンダリングに影響する値はuseStateで管理
   - ユーザーに表示する値、フォームの入力値など
   - useStateの値が変更されると再レンダリングが発生する

## 無限ループ防止のガイドライン

### useEffectの依存配列の設定方法

1. 関数を依存配列に含めない
   - 関数は毎回新しく作成されるため、依存配列に含めると無限ループが発生する
   - useRefを使用して関数の最新の参照を保持する

2. オブジェクトや配列を依存配列に含める場合は注意
   - オブジェクトや配列は参照が変わるため、依存配列に含めると毎回再実行される
   - JSON.stringifyで文字列化して比較するか、useMemoでメモ化する

3. 依存配列を空にする場合は注意
   - 依存配列を空にすると、useEffectは初回のみ実行される
   - 依存する値が変更されても再実行されないため、注意が必要

### useCallbackとuseMemoの使用方法

1. useCallbackで関数をメモ化する
   - 関数は毎回新しく作成されるため、useCallbackでメモ化する
   - 依存配列が変更されない限り、同じ関数参照を返す

2. useMemoで値をメモ化する
   - 計算コストの高い値やオブジェクトをuseMemoでメモ化する
   - 依存配列が変更されない限り、前回の計算結果を再利用する

### useRefを使用した関数参照の保持方法

1. useRefで関数の最新の参照を保持する
   - useEffectの依存配列に関数を含めると無限ループが発生する可能性がある
   - useRefを使用して関数の最新の参照を保持し、依存配列から除外する

```typescript
// ✅ 良い例：useRefで関数参照を保持
const onDraftSaveRef = useRef(onDraftSave);

useEffect(() => {
  onDraftSaveRef.current = onDraftSave;
}, [onDraftSave]);

useEffect(() => {
  const timer = setTimeout(async () => {
    if (onDraftSaveRef.current) {
      await onDraftSaveRef.current(data);
    }
  }, 5000);
  return () => clearTimeout(timer);
}, [data]); // onDraftSaveを依存配列から除外
```

## カスタムフックのテストベストプラクティス

### renderHookWithProvidersの使用方法

1. カスタムフックをテストする際はrenderHookWithProvidersを使用する
   - カスタムフックは単独ではテストできないため、renderHookWithProvidersを使用する
   - 必要なプロバイダーをラップしてテストする

```typescript
// ✅ 良い例：renderHookWithProvidersを使用
const { result } = renderHookWithProviders(() => useGoalForm());

expect(result.current.formState.isValid).toBe(false);
```

### タイマーを使用するフックのテスト方法

1. vi.useFakeTimers()を使用してタイマーをモックする
   - タイマーを使用するフックをテストする際は、vi.useFakeTimers()を使用する
   - vi.advanceTimersByTime()でタイマーを進める

```typescript
// ✅ 良い例：タイマーを使用するフックのテスト
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('自動保存が有効な場合、指定間隔で保存される', async () => {
  const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHookWithProviders(() =>
    useGoalForm({
      onDraftSave: mockOnDraftSave,
      enableAutoSave: true,
      autoSaveInterval: 5000,
    })
  );

  await act(async () => {
    result.current.setValue('title', 'テスト', { shouldDirty: true });
  });

  await act(async () => {
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
  });

  expect(mockOnDraftSave).toHaveBeenCalled();
});
```

2. unmount()を呼び出してクリーンアップを確認する
   - テスト終了時にunmount()を呼び出し、クリーンアップが正しく実行されることを確認する
   - タイマーやサブスクリプションが残っていないことを確認する

```typescript
// ✅ 良い例：unmount()を呼び出してクリーンアップを確認
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
    result.current.setValue('title', 'テスト', { shouldDirty: true });
  });

  // タイマーが実行される前にアンマウント
  unmount();

  // タイマーが実行されないことを確認
  vi.advanceTimersByTime(5000);
  expect(mockOnDraftSave).not.toHaveBeenCalled();
});
```

### メモリリークのテスト方法

1. 複数回のマウント・アンマウントでメモリリークが発生しないことを確認する
   - フックを複数回マウント・アンマウントし、メモリリークが発生しないことを確認する
   - タイマーやサブスクリプションが残っていないことを確認する

```typescript
// ✅ 良い例：複数回のマウント・アンマウントでメモリリークが発生しないことを確認
it('複数回のマウント・アンマウントでメモリリークが発生しない', () => {
  for (let i = 0; i < 10; i++) {
    const { unmount } = renderHookWithProviders(() =>
      useGoalForm({
        enableAutoSave: true,
        autoSaveInterval: 5000,
      })
    );
    unmount();
  }

  // タイマーが残っていないことを確認
  vi.advanceTimersByTime(5000);
  // メモリリークが発生していないことを確認（タイマーが実行されない）
});
```

## 自動保存機能の実装パターン

### タイマーを使用した自動保存の実装方法

1. useRefでタイマーIDを管理する
   - stateでタイマーIDを管理すると、再レンダリングが発生し、クリーンアップが複雑になる
   - useRefを使用してタイマーIDを保持し、再レンダリングを防ぐ

2. useEffectでタイマーを設定する
   - useEffectでタイマーを設定し、クリーンアップ関数でタイマーをクリアする
   - 依存配列を最小限にし、無限ループを防ぐ

3. タイマー実行後にタイマーIDをクリアする
   - タイマーが実行された後、タイマーIDをnullにする
   - メモリリークを防ぐ

```typescript
// ✅ 良い例：タイマーを使用した自動保存の実装
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
const onDraftSaveRef = useRef(onDraftSave);

useEffect(() => {
  onDraftSaveRef.current = onDraftSave;
}, [onDraftSave]);

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

  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }

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

  return () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };
}, [isDirty, enableAutoSave, autoSaveInterval, getValues]);
```

### エラーハンドリングの方法

1. 自動保存のエラーはログに記録するが、ユーザーには通知しない
   - 自動保存は自動的に実行されるため、エラーが発生してもユーザーには通知しない
   - エラーをログに記録し、開発者が確認できるようにする

2. 手動保存のエラーはユーザーに通知する
   - 手動保存はユーザーが明示的に実行するため、エラーが発生したらユーザーに通知する
   - エラーをスローし、呼び出し元で処理する

```typescript
// ✅ 良い例：エラーハンドリング
// 自動保存
useEffect(() => {
  const timer = setTimeout(async () => {
    try {
      await saveDraft();
    } catch (error) {
      console.warn('自動保存に失敗しました:', error); // ログに記録
    } finally {
      timerRef.current = null;
    }
  }, 5000);
  return () => clearTimeout(timer);
}, []);

// 手動保存
const saveDraft = useCallback(async () => {
  try {
    await onDraftSaveRef.current(data);
  } catch (error) {
    console.error('下書き保存エラー:', error); // ログに記録
    throw error; // 呼び出し元に再スロー
  }
}, []);
```

### クリーンアップの方法

1. useEffectのクリーンアップ関数でタイマーをクリアする
   - タイマーを設定したら、必ずクリーンアップ関数でクリアする
   - コンポーネントがアンマウントされた際にタイマーが残らないようにする

2. タイマー実行後にタイマーIDをクリアする
   - タイマーが実行された後、タイマーIDをnullにする
   - メモリリークを防ぐ

3. エラーが発生してもタイマーIDをクリアする
   - finallyブロックでタイマーIDをクリアする
   - エラーが発生してもメモリリークを防ぐ

## まとめ

このドキュメントで紹介したベストプラクティスを実践することで、以下の問題を防ぐことができます：

1. 無限ループ: useEffectの依存配列を最適化し、関数をuseRefで管理する
2. メモリリーク: タイマーとサブスクリプションを適切にクリーンアップする
3. 不必要な再レンダリング: useMemoとuseCallbackで値と関数をメモ化する
4. パフォーマンス問題: 計算コストの高い処理をuseMemoでメモ化する

これらのベストプラクティスは、useGoalFormフックの実装で実際に適用され、メモリリーク問題と無限ループ問題を完全に解決しました。
