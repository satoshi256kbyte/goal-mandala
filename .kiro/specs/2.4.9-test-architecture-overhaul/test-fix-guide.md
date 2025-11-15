# テストエラー修正ガイド

## 概要

このドキュメントは、テストエラーの修正方法を体系的にまとめたガイドです。各エラータイプごとに、原因、修正方法、コード例を記載しています。

---

## 1. テストセットアップエラー

### 原因
- 必要なimportが不足している
- グローバルモックが設定されていない
- テスト後のクリーンアップ処理が不足している

### 修正方法

#### 1.1 必要なimportの追加

```typescript
// packages/frontend/src/test/setup.ts

import { expect, afterEach, vi, beforeEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
```

#### 1.2 グローバルモックの設定

```typescript
// ResizeObserver のモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserver のモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: () => [],
}));

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

#### 1.3 テスト後のクリーンアップ

```typescript
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
```

---

## 2. モック・スタブエラー

### 原因
- モックの型定義が実際のAPIと不一致
- モックのリセット・クリーンアップが不足
- `vi.mock()`の使用方法が不統一

### 修正方法

#### 2.1 APIモックの作成

```typescript
// packages/frontend/src/test/mocks/api.ts

import { vi } from 'vitest';

export const mockGoalsApi = {
  createGoal: vi.fn().mockResolvedValue({
    id: 'goal-1',
    title: 'Test Goal',
    description: 'Test Description',
    status: 'active',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  
  getGoal: vi.fn().mockResolvedValue({
    id: 'goal-1',
    title: 'Test Goal',
    description: 'Test Description',
    status: 'active',
    progress: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  
  updateGoal: vi.fn().mockResolvedValue({
    id: 'goal-1',
    title: 'Updated Goal',
    description: 'Updated Description',
    status: 'active',
    progress: 75,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  
  deleteGoal: vi.fn().mockResolvedValue(undefined),
};

// テストファイルでの使用
vi.mock('@/api/goals', () => ({
  ...mockGoalsApi,
}));
```

#### 2.2 ルーターモックの作成

```typescript
// packages/frontend/src/test/mocks/router.ts

import { vi } from 'vitest';

export const mockNavigate = vi.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
};

export const mockRouter = {
  navigate: mockNavigate,
  location: mockLocation,
};

// テストファイルでの使用
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));
```

#### 2.3 コンテキストモックの作成

```typescript
/rontend/src/test/mocks/context.ts

import { vi } from 'vitest';

export const mockGoalFormContext = {
  goal: {
    title: 'Test Goal',
    description: 'Test Description',
    deadline: new Date('2024-12-31'),
    background: 'Test Background',
    constraints: 'Test Constraints',
  },
  setGoal: vi.fn(),
  errors: {},
  isValid: true,
  isDirty: false,
  reset: vi.fn(),
};

// テストファイルでの使用
vi.mock('@/contexts/GoalFormContext', () => ({
  useGoalForm: () => mockGoalFormContext,
}));
```

#### 2.4 モックのリセット

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  
  // 必要に応じてモックを再設定
  mockGoalsApi.createGoal.mockResolvedValue({
    id: 'goal-1',
    title: 'Test Goal',
    // ...
  });
});
```

---

## 3. 非同期処理エラー

### 原因
- 非同期処理の完了を待たずにアサーション
- `act()`警告が発生
- タイムアウトが短すぎる

### 修正方法

#### 3.1 waitForの使用

```typescript
import { render, screen, waitFor } from '@testing-library/react';

it('should display data after loading', async () => {
  render(<Component />);
  
  // ローディング表示を確認
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // データ表示を待機
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  }, { timeout: 3000 });
});
```

#### 3.2 findBy*の使用

```typescript
it('should display button after loading', async () => {
  render(<Component />);
  
  // 非同期で表示される要素を待機
  const button = await screen.findByRole('button', { name: 'Submit' }, { timeout: 3000 });
  
  expect(button).toBeInTheDocument();
});
```

#### 3.3 act()の使用

```typescript
import { act } from '@testing-library/react';

it('should update state on button click', async () => {
  render(<Component />);
  
  const button = screen.getByRole('button', { name: 'Click me' });
  
  // act()で状態更新をラップ
  await act(async () => {
    fireEvent.click(button);
  });
  
  // 状態更新後の確認
  await waitFor(() => {
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

#### 3.4 Promiseの解決を待機

```typescript
it('should handle async operation', async () => {
  const mockFn = vi.fn().mockResolvedValue('result');
  
  render(<Component onSubmit={mockFn} />);
  
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  
  // Promiseの解決を待機
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalled();
  });
  
  // 結果を確認
  const result = await mockFn.mock.results[0].value;
  expect(result).toBe('result');
});
```

---

## 4. DOM要素クエリエラー

### 原因
- `getByLabelText`で要素が見つからない
- Provider設定が不足
- 複数要素が見つかる場合の処理が不適切

### 修正方法

#### 4.1 data-testidの使用

```typescript
// コンポーネント
<select data-testid="industry-select" name="industry">
  <option value="">選択してください</option>
  <option value="it">IT</option>
  <option value="finance">金融</option>
</select>

// テスト
const industrySelect = screen.getByTestId('industry-select');
expect(industrySelect).toBeInTheDocument();
```

#### 4.2 roleとnameの使用

```typescript
// コンポーネント
<button type="submit">送信</button>

// テスト
const submitButton = screen.getByRole('button', { name: '送信' });
expect(submitButton).toBeInTheDocument();
```

#### 4.3 Provider設定の追加

```typescript
import { render } from '@testing-library/react';
import { GoalFormProvider } from '@/contexts/GoalFormContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <GoalFormProvider>
      {ui}
    </GoalFormProvider>
  );
};

it('should render with context', () => {
  renderWithProviders(<Component />);
  
  expect(screen.getByText('Goal Form')).toBeInTheDocument();
});
```

#### 4.4 複数要素の処理

```typescript
// 複数要素が見つかる場合
const buttons = screen.getAllByRole('button');
expect(buttons).toHaveLength(3);

// 特定の要素を取得
const submitButton = buttons.find(button => button.textContent === '送信');
expect(submitButton).toBeInTheDocument();
```

#### 4.5 queryBy*の使用（要素が存在しない場合）

```typescript
// 要素が存在しない場合はnullを返す
const errorMessage = screen.queryByText('Error');
expect(errorMessage).not.toBeInTheDocument();

// 要素が存在する場合
fireEvent.click(submitButton);
await waitFor(() => {
  const errorMessage = screen.getByText('Error');
  expect(errorMessage).toBeInTheDocument();
});
```

---

## 5. 個別テストケースエラー

### 原因
- 期待値が実装と不一致
- テストデータの準備が不足
- localStorage認証トークンの設定漏れ

### 修正方法

#### 5.1 期待値の修正

```typescript
// 実装を確認して期待値を修正
it('should calculate progress correctly', () => {
  const result = calculateProgress(tasks);
  
  // 実装に合わせて期待値を修正
  expect(result.progress).toBe(50); // 修正前: 75
  expect(result.trend).toBe('stable'); // 修正前: 'improving'
});
```

#### 5.2 テストデータの準備

```typescript
// テストデータを適切に準備
const mockGoal = {
  id: 'goal-1',
  title: 'Test Goal',
  description: 'Test Description',
  status: 'active',
  progress: 0,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};

const mockSubGoals = [
  {
    id: 'subgoal-1',
    goalId: 'goal-1',
    title: 'SubGoal 1',
    position: 0,
    progress: 0,
  },
  // ... 8個のサブ目標
];

it('should render goal with subgoals', () => {
  render(<GoalDetail goal={mockGoal} subGoals={mockSubGoals} />);
  
  expect(screen.getByText('Test Goal')).toBeInTheDocument();
  expect(screen.getAllByText(/SubGoal/)).toHaveLength(8);
});
```

#### 5.3 localStorage認証トークンの設定

```typescript
describe('Goals API', () => {
  beforeEach(() => {
    // 認証トークンを設定
    localStorage.setItem('auth_token', 'mock-token');
  });

  afterEach(() => {
    // テスト後にクリア
    localStorage.clear();
  });

  it('should create goal with authentication', async () => {
    const result = await createGoal(mockGoal);
    
    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      title: 'Test Goal',
    }));
  });
});
```

---

## 6. 型エラー

### 原因
- モックの型定義が不適切
- TypeScriptの型推論エラー

### 修正方法

#### 6.1 モックの型定義

```typescript
import { vi } from 'vitest';
import type { NavigateFunction } from 'react-router-dom';

// 型を明示的に指定
const mockNavigate = vi.fn() as unknown as NavigateFunction;

// または
const mockNavigate: NavigateFunction = vi.fn();
```

#### 6.2 Zodスキーマのimport修正

```typescript
// 修正前
import { loginSchema } from '@/utils/validation';

// 修正後
import { loginZodSchema } from '@/utils/validation';

it('should validate login form', () => {
  const result = loginZodSchema.safeParse({
    email: 'test@example.com',
    password: 'password123',
  });
  
  expect(result.success).toBe(true);
});
```

#### 6.3 型アサーションの使用

```typescript
// 型アサーションを使用（最小限に）
const mockData = {
  id: 'goal-1',
  title: 'Test Goal',
} as Goal;

// または、型ガードを使用
function isGoal(data: unknown): data is Goal {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'title' in data
  );
}
```

---

## 7. テストユーティリティ

### 7.1 renderWithProviders

```typescript
// packages/frontend/src/test/utils/render.tsx

import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GoalFormProvider } from '@/contexts/GoalFormContext';
import { AuthProvider } from '@/contexts/AuthContext';

interface CustomRenderOptions extends RenderOptions {
  initialRoute?: string;
  authToken?: string;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  const { initialRoute = '/', authToken, ...renderOptions } = options || {};

  // 認証トークンを設定
  if (authToken) {
    localStorage.setItem('auth_token', authToken);
  }

  // ルートを設定
  window.history.pushState({}, 'Test page', initialRoute);

  return render(
    <BrowserRouter>
      <AuthProvider>
        <GoalFormProvider>
          {ui}
        </GoalFormProvider>
      </AuthProvider>
    </BrowserRouter>,
    renderOptions
  );
};
```

### 7.2 テストデータジェネレーター

```typescript
// packages/frontend/src/test/utils/generators.ts

export const generateMockGoal = (overrides?: Partial<Goal>): Goal => ({
  id: 'goal-1',
  title: 'Test Goal',
  description: 'Test Description',
  status: 'active',
  progress: 0,
  deadline: new Date('2024-12-31'),
  background: 'Test Background',
  constraints: 'Test Constraints',
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  ...overrides,
});

export const generateMockSubGoal = (overrides?: Partial<SubGoal>): SubGoal => ({
  id: 'subgoal-1',
  goalId: 'goal-1',
  title: 'Test SubGoal',
  description: 'Test Description',
  position: 0,
  progress: 0,
  background: 'Test Background',
  constraints: 'Test Constraints',
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  ...overrides,
});
```

### 7.3 カスタムマッチャー

```typescript
// packages/frontend/src/test/utils/matchers.ts

import { expect } from 'vitest';

expect.extend({
  toBeValidGoal(received: unknown) {
    const isValid =
      typeof received === 'object' &&
      received !== null &&
      'id' in received &&
      'title' in received &&
      'status' in received;

    return {
      pass: isValid,
      message: () =>
        isValid
          ? `Expected ${received} not to be a valid goal`
          : `Expected ${received} to be a valid goal`,
    };
  },
});

// 使用例
it('should return valid goal', () => {
  const goal = createGoal();
  expect(goal).toBeValidGoal();
});
```

---

## 8. ベストプラクティス

### 8.1 テストの構造

```typescript
describe('Component', () => {
  // セットアップ
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // クリーンアップ
  afterEach(() => {
    cleanup();
  });

  // グループ化
  describe('rendering', () => {
    it('should render correctly', () => {
      // テスト
    });
  });

  describe('user interactions', () => {
    it('should handle click', async () => {
      // テスト
    });
  });

  describe('error handling', () => {
    it('should display error message', async () => {
      // テスト
    });
  });
});
```

### 8.2 テストの命名

```typescript
// Good
it('should display error message when form is invalid', () => {});
it('should call onSubmit when form is submitted', () => {});
it('should disable submit button when loading', () => {});

// Bad
it('test 1', () => {});
it('works', () => {});
it('error', () => {});
```

### 8.3 アサーションの順序

```typescript
it('should update goal', async () => {
  // Arrange（準備）
  const mockGoal = generateMockGoal();
  render(<GoalForm goal={mockGoal} />);

  // Act（実行）
  const titleInput = screen.getByLabelText('タイトル');
  fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
  
  const submitButton = screen.getByRole('button', { name: '保存' });
  fireEvent.click(submitButton);

  // Assert（検証）
  await waitFor(() => {
    expect(mockUpdateGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Title',
      })
    );
  });
});
```

---

## 9. トラブルシューティング

### 9.1 テストがタイムアウトする

```typescript
// タイムアウトを延長
it('should handle long operation', async () => {
  // ...
}, 10000); // 10秒

// または、waitForのタイムアウトを延長
await waitFor(() => {
  expect(screen.getByText('Done')).toBeInTheDocument();
}, { timeout: 5000 });
```

### 9.2 act()警告が出る

```typescript
// act()でラップ
await act(async () => {
  fireEvent.click(button);
});

// または、waitForを使用
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});
```

### 9.3 メモリリークが発生する

```typescript
// クリーンアップを追加
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// タイマーをクリア
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});
```

---

## 10. 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [React Testing Library公式ドキュメント](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices by Kent C. Dodds](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Effective Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)


/ pack
