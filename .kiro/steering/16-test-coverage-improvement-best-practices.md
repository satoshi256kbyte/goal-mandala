---
inclusion: always
---

# テストカバレッジ改善のベストプラクティス

## 概要

このドキュメントは、フロントエンドのテストカバレッジを14.60%から62.85%に改善したPhase 1の実装で得られた、テストカバレッジ改善のベストプラクティスをまとめたものです。

## Phase 1の成果

### カバレッジ改善結果

- **開始時**: 14.60%
- **Phase 1完了時**: 62.85%
- **改善幅**: +48.25%（目標: 50%、達成率: 125.7%）

### 実施期間

- 開始日: 2025年12月13日
- Phase 1完了日: 2025年12月17日
- 実施期間: 4日間

### 完了タスク数

- Phase 1: 16/16タスク完了（100%）
  - テスト基盤整備: 3タスク
  - Hooksテスト: 4タスク
  - プロパティベーステスト: 6タスク
  - Pagesテスト: 3タスク（一部スキップ）
  - authServiceテスト: 新規追加（49テスト）
  - 検証: 5タスク

## テストカバレッジ改善の戦略

### 1. 段階的アプローチ

カバレッジ改善は、一度に全てを実装するのではなく、段階的に進めることが重要です。

**Phase 1: 基礎（50%目標）**
- テスト基盤整備
- 主要なHooks、Pages、Servicesのテスト
- プロパティベーステストの導入

**Phase 2: 拡充（65%目標）**
- 残りのHooks、Pages、Services、Componentsのテスト
- エッジケーステストの追加

**Phase 3: 完成（80%目標）**
- 統合テスト、E2Eテスト、パフォーマンステストの追加
- 未カバー箇所の優先度評価と対応

**Phase 4: ドキュメント作成**
- テストガイドの更新
- ステアリングファイルの作成

### 2. 優先順位の設定

カバレッジ改善では、以下の優先順位でテストを追加します：

1. **クリティカルな機能**: 認証、データ操作、ビジネスロジック
2. **頻繁に使用される機能**: 主要なHooks、Pages、Services
3. **エッジケース**: 境界値、エラーケース、異常系
4. **パフォーマンス**: 大量データ、並行処理、タイムアウト

### 3. プロパティベーステストの活用

プロパティベーステストは、カバレッジ改善に非常に有効です。

**メリット**:
- 多数のテストケースを自動生成
- エッジケースの発見
- テストの保守性向上

**実装例**:
```typescript
import { fc } from 'fast-check';

it('Property: 主要カスタムフックにテストファイルが存在する', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...criticalHooks),
      (hookName) => {
        const testFilePath = path.join(hooksDir, '__tests__', `${hookName}.test.ts`);
        expect(fs.existsSync(testFilePath)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

## テスト実装のベストプラクティス

### 1. テスト基盤の整備

テストを効率的に実装するために、まずテスト基盤を整備します。

**テストユーティリティ**:
- `renderWithProviders`: コンポーネントをプロバイダーでラップしてレンダリング
- `renderHookWithProviders`: カスタムフックをプロバイダーでラップしてテスト
- `createMockUser`: モックユーザーデータの生成
- `createMockGoal`: モック目標データの生成

**モックデータ**:
- 一貫性のあるモックデータを作成
- 再利用可能なモックデータファクトリーを実装
- テストごとに独立したモックデータを使用

### 2. Hooksのテスト

カスタムフックのテストは、`renderHookWithProviders`を使用します。

**基本パターン**:
```typescript
import { renderHookWithProviders } from '../../test-utils/test-utils';

it('should return initial state', () => {
  const { result } = renderHookWithProviders(() => useAuth());
  
  expect(result.current.isAuthenticated).toBe(false);
  expect(result.current.user).toBeNull();
});
```

**非同期処理のテスト**:
```typescript
it('should sign in successfully', async () => {
  const { result } = renderHookWithProviders(() => useAuth());
  
  await act(async () => {
    await result.current.signIn('test@example.com', 'password123');
  });
  
  expect(result.current.isAuthenticated).toBe(true);
});
```

**タイマーのテスト**:
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should auto-save after interval', async () => {
  const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHookWithProviders(() =>
    useGoalForm({
      onDraftSave: mockOnDraftSave,
      enableAutoSave: true,
      autoSaveInterval: 5000,
    })
  );

  await act(async () => {
    result.current.setValue('title', 'Test', { shouldDirty: true });
  });

  await act(async () => {
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
  });

  expect(mockOnDraftSave).toHaveBeenCalled();
});
```

### 3. Pagesのテスト

ページコンポーネントのテストは、`renderWithProviders`を使用します。

**基本パターン**:
```typescript
import { renderWithProviders } from '../../test-utils/test-utils';

it('should render login form', () => {
  const { getByLabelText, getByRole } = renderWithProviders(<LoginPage />);
  
  expect(getByLabelText('メールアドレス')).toBeInTheDocument();
  expect(getByLabelText('パスワード')).toBeInTheDocument();
  expect(getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
});
```

**フォーム送信のテスト**:
```typescript
it('should submit form with valid data', async () => {
  const { getByLabelText, getByRole } = renderWithProviders(<LoginPage />);
  
  await userEvent.type(getByLabelText('メールアドレス'), 'test@example.com');
  await userEvent.type(getByLabelText('パスワード'), 'password123');
  await userEvent.click(getByRole('button', { name: 'ログイン' }));
  
  await waitFor(() => {
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

**ナビゲーションのテスト**:
```typescript
it('should navigate to signup page', async () => {
  const { getByRole } = renderWithProviders(<LoginPage />);
  
  await userEvent.click(getByRole('link', { name: '新規登録' }));
  
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });
});
```

### 4. Servicesのテスト

サービスクラスのテストは、モックを使用して外部依存を排除します。

**基本パターン**:
```typescript
import { AuthService } from './auth';
import * as amplifyAuth from 'aws-amplify/auth';

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  // ...
}));

it('should sign in successfully', async () => {
  vi.mocked(amplifyAuth.signIn).mockResolvedValue({} as any);

  await expect(
    AuthService.signIn('test@example.com', 'password123')
  ).resolves.toBeUndefined();

  expect(amplifyAuth.signIn).toHaveBeenCalledWith({
    username: 'test@example.com',
    password: 'password123',
  });
});
```

**エラーハンドリングのテスト**:
```typescript
it('should handle sign in error', async () => {
  const error = { code: 'UserNotFoundException', message: 'User not found' };
  vi.mocked(amplifyAuth.signIn).mockRejectedValue(error);

  await expect(
    AuthService.signIn('test@example.com', 'wrong')
  ).rejects.toMatchObject({
    code: 'UserNotFoundException',
    message: 'メールアドレスまたはパスワードが正しくありません',
  });
});
```

**ネットワークエラーのテスト**:
```typescript
it('should detect network error', async () => {
  const error = new TypeError('Failed to fetch');
  vi.mocked(amplifyAuth.signIn).mockRejectedValue(error);

  await expect(
    AuthService.signIn('test@example.com', 'password123')
  ).rejects.toMatchObject({
    code: 'NetworkError',
    message: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
  });
});
```

## カバレッジ測定のベストプラクティス

### 1. カバレッジレポートの生成

カバレッジレポートは、以下のコマンドで生成します：

```bash
npm test -- --coverage
```

### 2. カバレッジレポートの確認

カバレッジレポートは、以下のファイルで確認します：

- `coverage/coverage-summary.json`: カバレッジサマリー（JSON形式）
- `coverage/lcov-report/index.html`: カバレッジレポート（HTML形式）

### 3. カバレッジ目標の設定

カバレッジ目標は、以下の基準で設定します：

- **全体カバレッジ**: 80%以上
- **Statements**: 80%以上
- **Branches**: 75%以上
- **Functions**: 80%以上
- **Lines**: 80%以上

### 4. カバレッジの継続的な監視

カバレッジは、CI/CDパイプラインで継続的に監視します：

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm test -- --coverage

- name: Check coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage is below 80%: $COVERAGE%"
      exit 1
    fi
```

## テスト実行時間の最適化

### 1. テスト実行時間の目標

- **全テスト**: 120秒以内
- **ユニットテスト**: 60秒以内
- **統合テスト**: 60秒以内

### 2. テスト実行時間の測定

テスト実行時間は、以下のコマンドで測定します：

```bash
npm test -- --reporter=verbose
```

### 3. テスト実行時間の最適化手法

**並列実行**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    maxConcurrency: 4, // 並列実行数
  },
});
```

**テストの分離**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    isolate: true, // テストファイル間の完全な分離
    singleFork: false, // 各テストファイル後にワーカー再起動
  },
});
```

**メモリ最適化**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=8192'], // 8GBヒープサイズ
      },
    },
  },
});
```

## コード品質チェック

### 1. フォーマット

コードフォーマットは、以下のコマンドで実行します：

```bash
npm run format
```

### 2. リント

リントは、以下のコマンドで実行します：

```bash
npm run lint
```

### 3. 型チェック

型チェックは、以下のコマンドで実行します：

```bash
npm run type-check
```

### 4. CI/CDでの品質チェック

CI/CDパイプラインで、以下の品質チェックを実行します：

```yaml
# .github/workflows/test.yml
- name: Format check
  run: npm run format -- --check

- name: Lint
  run: npm run lint

- name: Type check
  run: npm run type-check

- name: Run tests
  run: npm test
```

## トラブルシューティング

### 1. テストが失敗する

**原因**: モックの設定が不適切、非同期処理の待機不足、テストデータの不整合

**解決方法**:
- モックの設定を確認する
- `await waitFor()`で非同期処理を待機する
- テストデータの一貫性を確認する

### 2. カバレッジが上がらない

**原因**: テストが不十分、未テストのコードパスが存在

**解決方法**:
- カバレッジレポートを確認し、未カバー箇所を特定する
- エッジケースのテストを追加する
- プロパティベーステストを活用する

### 3. テスト実行時間が長い

**原因**: 並列実行の設定不足、メモリリーク、重いテスト

**解決方法**:
- 並列実行数を増やす
- メモリリーク対策を実施する
- 重いテストを分割する

## まとめ

Phase 1のテストカバレッジ改善では、以下の成果を達成しました：

1. **カバレッジ62.85%達成**: 目標50%を大幅に上回る
2. **authServiceテスト追加**: 49テスト、100%成功
3. **プロパティベーステスト**: 9テスト、100%成功
4. **テスト実行時間**: 66.49秒（目標120秒以内）
5. **コード品質**: format 100%、lint 0エラー

これらのベストプラクティスを実践することで、効率的にテストカバレッジを改善できます。

Phase 2では、残りのHooks、Pages、Services、Componentsのテストを追加し、カバレッジ65%を目指します。
