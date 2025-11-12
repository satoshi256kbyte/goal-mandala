/**
 * モック管理ユーティリティ
 * テストで使用するモック・スタブを一元管理するクラス
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

export class MockManager {
  private mocks: Map<string, Mock> = new Map();

  /**
   * APIモックを設定
   */
  mockAPI() {
    const apiMock = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    this.mocks.set('api', apiMock.get);

    return apiMock;
  }

  /**
   * React Queryモックを設定
   */
  mockReactQuery() {
    const useQueryMock = vi.fn();
    const useMutationMock = vi.fn();
    const queryClientMock = {
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
      clear: vi.fn(),
    };

    this.mocks.set('useQuery', useQueryMock);
    this.mocks.set('useMutation', useMutationMock);
    this.mocks.set('queryClient', queryClientMock.invalidateQueries);

    return {
      useQuery: useQueryMock,
      useMutation: useMutationMock,
      queryClient: queryClientMock,
      QueryClient: vi.fn(() => queryClientMock),
      QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
    };
  }

  /**
   * React Routerモックを設定
   */
  mockRouter() {
    const navigateMock = vi.fn();
    const useNavigateMock = vi.fn(() => navigateMock);
    const useParamsMock = vi.fn(() => ({}));
    const useLocationMock = vi.fn(() => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    }));
    const useSearchParamsMock = vi.fn(() => [new URLSearchParams(), vi.fn()]);

    this.mocks.set('navigate', navigateMock);
    this.mocks.set('useNavigate', useNavigateMock);
    this.mocks.set('useParams', useParamsMock);
    this.mocks.set('useLocation', useLocationMock);
    this.mocks.set('useSearchParams', useSearchParamsMock);

    return {
      useNavigate: useNavigateMock,
      useParams: useParamsMock,
      useLocation: useLocationMock,
      useSearchParams: useSearchParamsMock,
      BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
      Routes: ({ children }: { children: React.ReactNode }) => children,
      Route: ({ element }: { element: React.ReactNode }) => element,
      Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
        children as React.ReactElement,
      Navigate: ({ to }: { to: string }) => null,
    };
  }

  /**
   * 認証モックを設定
   */
  mockAuth(options?: {
    isAuthenticated?: boolean;
    user?: {
      id: string;
      email: string;
      name?: string;
    };
  }) {
    const defaultUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    };

    const loginMock = vi.fn();
    const logoutMock = vi.fn();
    const signupMock = vi.fn();
    const updateProfileMock = vi.fn();

    const authContextValue = {
      user: options?.user || defaultUser,
      isAuthenticated: options?.isAuthenticated ?? true,
      isLoading: false,
      login: loginMock,
      logout: logoutMock,
      signup: signupMock,
      updateProfile: updateProfileMock,
    };

    this.mocks.set('login', loginMock);
    this.mocks.set('logout', logoutMock);
    this.mocks.set('signup', signupMock);
    this.mocks.set('updateProfile', updateProfileMock);

    return {
      useAuth: () => authContextValue,
      AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    };
  }

  /**
   * fetchモックを設定
   */
  mockFetch(responses?: Record<string, unknown>) {
    const fetchMock = vi.fn((url: string) => {
      const response = responses?.[url] || { data: {} };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'basic' as ResponseType,
        url,
        clone: vi.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    this.mocks.set('fetch', fetchMock);

    return fetchMock;
  }

  /**
   * 特定のモックを取得
   */
  getMock(name: string): Mock | undefined {
    return this.mocks.get(name);
  }

  /**
   * すべてのモックをリセット
   */
  resetAllMocks(): void {
    this.mocks.forEach(mock => {
      if (mock && typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });
    vi.clearAllMocks();
  }

  /**
   * すべてのモックをクリア
   */
  clearAllMocks(): void {
    this.mocks.clear();
    vi.clearAllMocks();
  }

  /**
   * すべてのモックを復元
   */
  restoreAllMocks(): void {
    this.mocks.clear();
    vi.restoreAllMocks();
  }
}

// シングルトンインスタンスをエクスポート
export const mockManager = new MockManager();
