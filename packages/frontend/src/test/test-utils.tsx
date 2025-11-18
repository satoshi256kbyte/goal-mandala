import { render, renderHook, RenderOptions, RenderHookOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubGoalProvider } from '../contexts/SubGoalContext';

/**
 * テスト用のQueryClientを作成
 * リトライを無効化し、エラーログを抑制
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * すべての必要なProviderでラップするラッパーコンポーネント
 */
interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  goalId?: string;
}

function AllProviders({ children, queryClient, goalId = 'test-goal-id' }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <SubGoalProvider goalId={goalId}>{children}</SubGoalProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * カスタムレンダー関数
 * すべての必要なProviderでコンポーネントをラップしてレンダリング
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  goalId?: string;
}

export function renderWithProviders(ui: ReactElement, options?: CustomRenderOptions) {
  const { queryClient, goalId, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} goalId={goalId}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

/**
 * カスタムフックレンダー関数
 * すべての必要なProviderでフックをラップしてレンダリング
 */
interface CustomRenderHookOptions<Props> extends Omit<RenderHookOptions<Props>, 'wrapper'> {
  queryClient?: QueryClient;
  goalId?: string;
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options?: CustomRenderHookOptions<Props>
) {
  const { queryClient, goalId, ...renderHookOptions } = options || {};

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} goalId={goalId}>
        {children}
      </AllProviders>
    ),
    ...renderHookOptions,
  });
}

/**
 * モックデータ生成ヘルパー
 */
export const mockData = {
  /**
   * モックユーザーデータ
   */
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    industry: 'IT',
    companySize: '50-100',
    jobTitle: 'Engineer',
    position: 'Senior',
  },

  /**
   * モック目標データ
   */
  goal: {
    id: 'test-goal-id',
    userId: 'test-user-id',
    title: 'Test Goal',
    description: 'Test goal description',
    deadline: new Date('2025-12-31'),
    background: 'Test background',
    constraints: 'Test constraints',
    status: 'active' as const,
    progress: 50,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },

  /**
   * モックサブ目標データ
   */
  subGoal: {
    id: 'test-subgoal-id',
    goalId: 'test-goal-id',
    title: 'Test SubGoal',
    description: 'Test subgoal description',
    background: 'Test background',
    constraints: 'Test constraints',
    position: 0,
    progress: 50,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },

  /**
   * モックアクションデータ
   */
  action: {
    id: 'test-action-id',
    subGoalId: 'test-subgoal-id',
    title: 'Test Action',
    description: 'Test action description',
    background: 'Test background',
    constraints: 'Test constraints',
    type: 'execution' as const,
    position: 0,
    progress: 50,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },

  /**
   * モックタスクデータ
   */
  task: {
    id: 'test-task-id',
    actionId: 'test-action-id',
    title: 'Test Task',
    description: 'Test task description',
    type: 'execution' as const,
    status: 'not_started' as const,
    estimatedMinutes: 30,
    completedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
};

/**
 * モックAPI関数
 */
export const mockApi = {
  /**
   * 成功レスポンスを返すモック
   */
  success: <T,>(data: T) => Promise.resolve(data),

  /**
   * エラーレスポンスを返すモック
   */
  error: (message: string, statusCode = 500) =>
    Promise.reject({
      message,
      statusCode,
    }),

  /**
   * 遅延付きレスポンスを返すモック
   */
  delayed: <T,>(data: T, delay = 100) =>
    new Promise<T>(resolve => setTimeout(() => resolve(data), delay)),
};

/**
 * localStorage操作ヘルパー
 */
export const storage = {
  /**
   * 認証トークンを設定
   */
  setAuthToken: (token = 'mock-auth-token') => {
    localStorage.setItem('auth_token', token);
  },

  /**
   * 認証トークンを削除
   */
  clearAuthToken: () => {
    localStorage.removeItem('auth_token');
  },

  /**
   * すべてのストレージをクリア
   */
  clearAll: () => {
    localStorage.clear();
    sessionStorage.clear();
  },
};

/**
 * 非同期処理の待機ヘルパー
 */
export const wait = {
  /**
   * 指定ミリ秒待機
   */
  ms: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 次のティックまで待機
   */
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

  /**
   * すべてのPromiseが解決されるまで待機
   */
  forPromises: () => new Promise(resolve => setImmediate(resolve)),

  /**
   * 要素が表示されるまで待機（最大3秒）
   */
  forElement: async (getElement: () => HTMLElement | null, timeout = 3000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = getElement();
      if (element) return element;
      await wait.ms(50);
    }
    throw new Error('Element not found within timeout');
  },

  /**
   * 条件が真になるまで待機（最大3秒）
   */
  forCondition: async (condition: () => boolean, timeout = 3000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (condition()) return;
      await wait.ms(50);
    }
    throw new Error('Condition not met within timeout');
  },
};

// 再エクスポート
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
