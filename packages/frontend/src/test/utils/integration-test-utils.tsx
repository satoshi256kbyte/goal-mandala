/**
 * 統合テスト共通ユーティリティ
 * 統合テストで使用する共通機能を提供
 */

import { render, RenderOptions, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';
import { testDataGenerator } from './TestDataGenerator';
import { mockManager } from './MockManager';

/**
 * テストデータのセットアップ
 */
export async function setupIntegrationTest() {
  // モックをリセット
  mockManager.resetAllMocks();

  // テストデータジェネレーターをリセット
  testDataGenerator.reset();

  // ユーザーデータを生成
  const user = testDataGenerator.generateUser();

  // 完全なマンダラチャートデータセットを生成
  const dataset = testDataGenerator.generateCompleteDataset(user.id);

  return {
    user,
    ...dataset,
  };
}

/**
 * テストデータのクリーンアップ
 */
export async function cleanupIntegrationTest() {
  // すべてのモックをクリア
  mockManager.clearAllMocks();

  // タイマーをリセット
  if (vi.isFakeTimers()) {
    vi.useRealTimers();
  }

  // テストデータジェネレーターをリセット
  testDataGenerator.reset();
}

/**
 * ローディング状態が終了するまで待機
 */
export async function waitForLoadingToFinish(timeout: number = 5000) {
  await waitFor(
    () => {
      // "読み込み中"、"Loading"、"処理中"などのテキストが存在しないことを確認
      const loadingTexts = ['読み込み中', 'Loading', '処理中', 'loading'];
      const hasLoading = loadingTexts.some(text => {
        try {
          screen.getByText(new RegExp(text, 'i'));
          return true;
        } catch {
          return false;
        }
      });

      if (hasLoading) {
        throw new Error('Still loading');
      }
    },
    { timeout }
  );
}

/**
 * APIレスポンスをモック
 */
export function mockAPIResponses(responses: Record<string, unknown>) {
  const apiMock = mockManager.mockAPI();

  // GETリクエストのモック
  apiMock.get.mockImplementation((url: string) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({ data: response, status: 200, statusText: 'OK' });
    }
    return Promise.reject(new Error(`No mock response for ${url}`));
  });

  // POSTリクエストのモック
  apiMock.post.mockImplementation((url: string, data: unknown) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({ data: response, status: 201, statusText: 'Created' });
    }
    return Promise.reject(new Error(`No mock response for ${url}`));
  });

  // PUTリクエストのモック
  apiMock.put.mockImplementation((url: string, data: unknown) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({ data: response, status: 200, statusText: 'OK' });
    }
    return Promise.reject(new Error(`No mock response for ${url}`));
  });

  // PATCHリクエストのモック
  apiMock.patch.mockImplementation((url: string, data: unknown) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({ data: response, status: 200, statusText: 'OK' });
    }
    return Promise.reject(new Error(`No mock response for ${url}`));
  });

  // DELETEリクエストのモック
  apiMock.delete.mockImplementation((url: string) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({ data: response, status: 204, statusText: 'No Content' });
    }
    return Promise.reject(new Error(`No mock response for ${url}`));
  });

  return apiMock;
}

/**
 * React Queryを使用したコンポーネントのレンダリング
 */
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    initialRoute = '/',
    ...renderOptions
  } = options || {};

  // 初期ルートを設定
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * エラーメッセージが表示されるまで待機
 */
export async function waitForErrorMessage(
  errorText: string | RegExp,
  timeout: number = 3000
): Promise<HTMLElement> {
  return await waitFor(
    () => {
      const errorElement = screen.getByText(errorText);
      expect(errorElement).toBeInTheDocument();
      return errorElement;
    },
    { timeout }
  );
}

/**
 * 成功メッセージが表示されるまで待機
 */
export async function waitForSuccessMessage(
  successText: string | RegExp,
  timeout: number = 3000
): Promise<HTMLElement> {
  return await waitFor(
    () => {
      const successElement = screen.getByText(successText);
      expect(successElement).toBeInTheDocument();
      return successElement;
    },
    { timeout }
  );
}

/**
 * 要素が表示されるまで待機
 */
export async function waitForElement(
  selector: () => HTMLElement,
  timeout: number = 3000
): Promise<HTMLElement> {
  return await waitFor(selector, { timeout });
}

/**
 * 要素が非表示になるまで待機
 */
export async function waitForElementToBeRemoved(
  selector: () => HTMLElement | null,
  timeout: number = 3000
): Promise<void> {
  await waitFor(
    () => {
      const element = selector();
      if (element) {
        throw new Error('Element still exists');
      }
    },
    { timeout }
  );
}

/**
 * フォームの送信を待機
 */
export async function waitForFormSubmission(timeout: number = 3000): Promise<void> {
  await waitFor(
    () => {
      // 送信ボタンが無効化されているか、ローディング状態であることを確認
      const submitButtons = screen.queryAllByRole('button', { name: /送信|保存|登録/i });
      const isSubmitting = submitButtons.some(
        button => button.hasAttribute('disabled') || button.getAttribute('aria-busy') === 'true'
      );

      if (!isSubmitting) {
        throw new Error('Form not submitting');
      }
    },
    { timeout }
  );
}

/**
 * ナビゲーションが完了するまで待機
 */
export async function waitForNavigation(
  expectedPath: string,
  timeout: number = 3000
): Promise<void> {
  await waitFor(
    () => {
      if (window.location.pathname !== expectedPath) {
        throw new Error(`Expected path ${expectedPath}, but got ${window.location.pathname}`);
      }
    },
    { timeout }
  );
}

/**
 * React Queryのキャッシュをクリア
 */
export function clearQueryCache(queryClient: QueryClient): void {
  queryClient.clear();
}

/**
 * デバッグ用: 現在のDOMツリーを出力
 */
export function debugDOM(): void {
  screen.debug(undefined, Infinity);
}

/**
 * デバッグ用: 特定の要素を出力
 */
export function debugElement(element: HTMLElement): void {
  screen.debug(element, Infinity);
}
