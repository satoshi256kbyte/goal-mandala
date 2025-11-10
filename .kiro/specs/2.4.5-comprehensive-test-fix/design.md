# 設計書

## 概要

本ドキュメントは、目標管理曼荼羅システムにおける包括的なテスト修正機能の設計を定義します。現在のテスト成功率43.4%（394/908）を95%以上に改善し、テスト実行環境を安定化させます。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    テスト実行環境                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Vitest       │  │ Playwright   │  │ Jest-axe     │      │
│  │ (Unit Tests) │  │ (E2E Tests)  │  │ (A11y Tests) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                  ┌─────────▼─────────┐                       │
│                  │  Test Runner      │                       │
│                  │  - Timeout管理    │                       │
│                  │  - 並列実行       │                       │
│                  │  - 進捗表示       │                       │
│                  └─────────┬─────────┘                       │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐      │
│  │ Test        │  │ Mock/Stub       │  │ Test Data  │      │
│  │ Fixtures    │  │ Manager         │  │ Generator  │      │
│  └─────────────┘  └─────────────────┘  └────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │  Test Reporter    │
                  │  - HTML Report    │
                  │  - Coverage Report│
                  │  - CI/CD Report   │
                  └───────────────────┘
```

### テスト分類

1. **ユニットテスト（Vitest）**
   - 進捗計算エンジン
   - ユーティリティ関数
   - カスタムフック
   - コンポーネント単体

2. **統合テスト（Vitest + React Testing Library）**
   - ProfileSetup統合テスト
   - history-flow統合テスト
   - MandalaList統合テスト

3. **アクセシビリティテスト（Jest-axe）**
   - WCAG 2.1 AA準拠確認
   - ARIAラベル検証
   - キーボードナビゲーション
   - スクリーンリーダー対応

4. **E2Eテスト（Playwright）**
   - ユーザーフロー全体
   - クロスブラウザテスト

## コンポーネントと責務

### 1. Test Configuration Manager

**責務:** テスト実行環境の設定と管理

**主要機能:**
- タイムアウト設定の一元管理
- テスト環境変数の設定
- モック設定の初期化
- テストデータベースのセットアップ

**設定ファイル:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000, // 30秒
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
```

### 2. Progress Calculation Test Suite

**責務:** 進捗計算エンジンの正確性を検証

**テスト対象:**
- `TaskProgressCalculator`
- `ExecutionActionCalculator`
- `HabitActionCalculator`
- `SubGoalProgressCalculator`
- `GoalProgressCalculator`
- `ProgressValidator`
- `ErrorHandler`

**テスト戦略:**
```typescript
describe('Progress Calculation Engine', () => {
  describe('TaskProgressCalculator', () => {
    it('完了タスクの進捗を正しく計算する', () => {
      // Given: 完了タスクのデータ
      // When: 進捗を計算
      // Then: 100%を返す
    });
    
    it('未完了タスクの進捗を正しく計算する', () => {
      // Given: 未完了タスクのデータ
      // When: 進捗を計算
      // Then: 0%を返す
    });
  });
  
  // 他のCalculatorも同様のパターン
});
```

### 3. Integration Test Suite

**責務:** コンポーネント間の統合を検証

**テスト対象:**
- ProfileSetup統合フロー
- history-flow統合フロー
- MandalaList統合フロー

**テストパターン:**
```typescript
describe('Integration Tests', () => {
  beforeEach(async () => {
    // テストデータのセットアップ
    await setupTestDatabase();
    await seedTestData();
  });
  
  afterEach(async () => {
    // テストデータのクリーンアップ
    await cleanupTestDatabase();
  });
  
  describe('ProfileSetup Flow', () => {
    it('プロフィール設定フローが正常に動作する', async () => {
      // Given: 未設定のユーザー
      // When: プロフィール設定を実行
      // Then: プロフィールが保存される
    });
  });
});
```

### 4. Accessibility Test Suite

**責務:** アクセシビリティ基準の準拠を検証

**テスト対象:**
- 全インタラクティブコンポーネント
- フォーム要素
- ナビゲーション要素
- モーダル・ダイアログ

**テストパターン:**
```typescript
describe('Accessibility Tests', () => {
  it('ARIAラベルが適切に設定されている', async () => {
    const { container } = render(<Component />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('キーボードで操作可能である', () => {
    render(<Component />);
    const button = screen.getByRole('button');
    
    // Tab キーでフォーカス
    userEvent.tab();
    expect(button).toHaveFocus();
    
    // Enter キーで実行
    userEvent.keyboard('{Enter}');
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### 5. Animation & Component Test Suite

**責務:** アニメーションとコンポーネントの動作を検証

**テスト対象:**
- アニメーション機能
- アニメーションパフォーマンス
- EditModal
- SubGoalEditPage
- HistoryPanel

**テストパターン:**
```typescript
describe('Animation Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('アニメーションが正しく実行される', () => {
    render(<AnimatedComponent />);
    
    // アニメーション開始
    const element = screen.getByTestId('animated-element');
    expect(element).toHaveStyle({ opacity: 0 });
    
    // 時間を進める
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // アニメーション完了
    expect(element).toHaveStyle({ opacity: 1 });
  });
});
```

### 6. Test Data Generator

**責務:** 一貫性のあるテストデータの生成

**主要機能:**
```typescript
class TestDataGenerator {
  // ユーザーデータ生成
  generateUser(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      industry: 'IT',
      companySize: '100-500',
      ...overrides
    };
  }
  
  // 目標データ生成
  generateGoal(userId: string, overrides?: Partial<Goal>): Goal {
    return {
      id: faker.string.uuid(),
      userId,
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      deadline: faker.date.future(),
      status: 'active',
      progress: 0,
      ...overrides
    };
  }
  
  // サブ目標データ生成（8個）
  generateSubGoals(goalId: string): SubGoal[] {
    return Array.from({ length: 8 }, (_, i) => ({
      id: faker.string.uuid(),
      goalId,
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      position: i,
      progress: 0
    }));
  }
  
  // アクションデータ生成（64個）
  generateActions(subGoals: SubGoal[]): Action[] {
    return subGoals.flatMap(subGoal =>
      Array.from({ length: 8 }, (_, i) => ({
        id: faker.string.uuid(),
        subGoalId: subGoal.id,
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        type: i % 2 === 0 ? 'execution' : 'habit',
        position: i,
        progress: 0
      }))
    );
  }
}
```

### 7. Mock Manager

**責務:** モック・スタブの一元管理

**主要機能:**
```typescript
class MockManager {
  // API モック
  mockAPI() {
    vi.mock('@/services/api', () => ({
      api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      }
    }));
  }
  
  // React Query モック
  mockReactQuery() {
    vi.mock('@tanstack/react-query', () => ({
      useQuery: vi.fn(),
      useMutation: vi.fn(),
      QueryClient: vi.fn(),
      QueryClientProvider: ({ children }) => children
    }));
  }
  
  // Router モック
  mockRouter() {
    vi.mock('react-router-dom', () => ({
      useNavigate: () => vi.fn(),
      useParams: () => ({}),
      useLocation: () => ({ pathname: '/' }),
      BrowserRouter: ({ children }) => children,
      Routes: ({ children }) => children,
      Route: ({ element }) => element
    }));
  }
  
  // 認証モック
  mockAuth() {
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: { id: 'test-user-id', email: 'test@example.com' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn()
      })
    }));
  }
}
```

### 8. Test Reporter

**責務:** テスト結果の可視化とレポート生成

**出力形式:**
1. **コンソール出力**
   - リアルタイム進捗表示
   - 成功・失敗・スキップの件数
   - 実行時間

2. **HTML レポート**
   - テスト結果の詳細
   - カバレッジレポート
   - 失敗したテストのスタックトレース

3. **CI/CD レポート**
   - GitHub Actions用のレポート
   - JUnit XML形式

**実装:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: [
      'default',
      'html',
      ['junit', { outputFile: 'test-results/junit.xml' }]
    ],
    outputFile: {
      html: 'test-results/index.html'
    }
  }
});
```

## データモデル

### Test Result

```typescript
interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack: string;
  };
  timestamp: Date;
}
```

### Test Suite Result

```typescript
interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: CoverageResult;
}
```

### Coverage Result

```typescript
interface CoverageResult {
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
}
```

## エラーハンドリング

### タイムアウトエラー

```typescript
class TestTimeoutError extends Error {
  constructor(testName: string, timeout: number) {
    super(`Test "${testName}" exceeded timeout of ${timeout}ms`);
    this.name = 'TestTimeoutError';
  }
}
```

### アサーションエラー

```typescript
class AssertionError extends Error {
  constructor(expected: any, actual: any, message?: string) {
    super(message || `Expected ${expected}, but got ${actual}`);
    this.name = 'AssertionError';
    this.expected = expected;
    this.actual = actual;
  }
}
```

### モックエラー

```typescript
class MockError extends Error {
  constructor(mockName: string, message: string) {
    super(`Mock "${mockName}" error: ${message}`);
    this.name = 'MockError';
  }
}
```

## テスト戦略

### 1. 進捗計算エンジンテスト修正戦略

**問題点:**
- 進捗計算ロジックの不整合
- エッジケースの未対応
- エラーハンドリングの不足

**解決策:**
1. 各Calculatorのテストケースを網羅的に作成
2. 境界値テストの追加
3. エラーケースのテスト追加
4. モックデータの改善

### 2. 統合テスト修正戦略

**問題点:**
- テストデータのセットアップが不完全
- モック・スタブの不整合
- 非同期処理の待機不足

**解決策:**
1. テストデータジェネレーターの作成
2. モックマネージャーの導入
3. `waitFor`、`findBy`の適切な使用
4. テストの分離（各テストが独立）

### 3. アクセシビリティテスト修正戦略

**問題点:**
- ARIAラベルの不足
- キーボードナビゲーションの未実装
- スクリーンリーダー対応の不足

**解決策:**
1. 全インタラクティブ要素にARIAラベル追加
2. キーボードイベントハンドラーの実装
3. `role`属性の適切な設定
4. `jest-axe`による自動検証

### 4. アニメーション・コンポーネントテスト修正戦略

**問題点:**
- タイマーのモックが不適切
- アニメーション完了の待機不足
- コンポーネントの状態管理の問題

**解決策:**
1. `vi.useFakeTimers()`の適切な使用
2. `act()`による状態更新の同期
3. アニメーション完了の明示的な待機
4. コンポーネントのライフサイクル管理

## パフォーマンス最適化

### 並列実行

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4, // CPU コア数に応じて調整
        minThreads: 1
      }
    }
  }
});
```

### テストの分離

```typescript
// 各テストを完全に分離
describe('Isolated Test', () => {
  beforeEach(() => {
    // 新しいテスト環境をセットアップ
  });
  
  afterEach(() => {
    // テスト環境をクリーンアップ
    vi.clearAllMocks();
    vi.resetModules();
  });
});
```

### キャッシュの活用

```typescript
// テストデータのキャッシュ
const testDataCache = new Map();

function getTestData(key: string) {
  if (!testDataCache.has(key)) {
    testDataCache.set(key, generateTestData());
  }
  return testDataCache.get(key);
}
```

## セキュリティ考慮事項

### テストデータの機密情報

- 本番データを使用しない
- ダミーデータのみを使用
- テスト後にデータを完全削除

### テスト環境の分離

- テスト用データベースを使用
- 本番環境への影響を防止
- 環境変数による分離

## CI/CD統合

### GitHub Actions ワークフロー

```yaml
name: Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '23.10.0'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test:coverage
        timeout-minutes: 20
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## モニタリング・ログ

### テスト実行ログ

```typescript
class TestLogger {
  log(level: 'info' | 'warn' | 'error', message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
  
  logTestStart(testName: string) {
    this.log('info', `Starting test: ${testName}`);
  }
  
  logTestEnd(testName: string, duration: number, status: string) {
    this.log('info', `Finished test: ${testName} (${duration}ms) - ${status}`);
  }
  
  logError(testName: string, error: Error) {
    this.log('error', `Test failed: ${testName}\n${error.stack}`);
  }
}
```

### パフォーマンスメトリクス

```typescript
interface PerformanceMetrics {
  totalTests: number;
  totalDuration: number;
  averageDuration: number;
  slowestTests: Array<{
    name: string;
    duration: number;
  }>;
}
```

## 実装の優先順位

### Phase 1: テスト実行環境の安定化（最優先）
1. タイムアウト設定の追加
2. テスト設定ファイルの最適化
3. モックマネージャーの実装
4. テストデータジェネレーターの実装

### Phase 2: 進捗計算エンジンテストの修正（高優先度）
1. TaskProgressCalculatorのテスト修正
2. ExecutionActionCalculatorのテスト修正
3. HabitActionCalculatorのテスト修正
4. SubGoalProgressCalculatorのテスト修正
5. GoalProgressCalculatorのテスト修正

### Phase 3: 統合テストの修正（高優先度）
1. ProfileSetup統合テストの修正
2. history-flow統合テストの修正
3. MandalaList統合テストの修正

### Phase 4: アクセシビリティテストの修正（中優先度）
1. ARIAラベルの追加
2. キーボードナビゲーションの実装
3. アクセシビリティテストの修正

### Phase 5: アニメーション・コンポーネントテストの修正（中優先度）
1. アニメーションテストの修正
2. コンポーネントテストの修正

### Phase 6: テストカバレッジの向上（低優先度）
1. 未カバー箇所のテスト追加
2. カバレッジレポートの改善

## 成功指標

1. **テスト成功率:** 95%以上（現在43.4%）
2. **テスト実行時間:** 30分以内
3. **テストカバレッジ:** 80%以上
4. **失敗テスト数:** 0件（現在514件）
5. **タイムアウト発生率:** 0%
6. **Flaky Test率:** 5%以下

## まとめ

本設計書では、包括的なテスト修正のための詳細な設計を定義しました。テスト実行環境の安定化、各種テストの修正、パフォーマンス最適化、CI/CD統合を通じて、テスト成功率を95%以上に改善します。
