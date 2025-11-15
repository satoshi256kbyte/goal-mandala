/**
 * テスト用のモック型定義
 *
 * このファイルは、テストで使用するモックオブジェクトの型定義を提供します。
 * `as any` の使用を最小限に抑え、型安全性を向上させます。
 */

/**
 * AWS Amplify Auth - AuthUser型のモック
 */
export interface MockAuthUser {
  username: string;
  userId: string;
  signInDetails?: {
    loginId?: string;
    authFlowType?: string;
  };
}

/**
 * AWS Amplify Auth - FetchAuthSessionResult型のモック
 */
export interface MockAuthSession {
  tokens?: {
    idToken?: {
      toString: () => string;
      payload?: Record<string, unknown>;
    };
    accessToken?: {
      toString: () => string;
      payload?: Record<string, unknown>;
    };
  };
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  identityId?: string;
  userSub?: string;
}

/**
 * Navigator型のモック（オンライン状態テスト用）
 */
export interface MockNavigator {
  onLine: boolean;
  userAgent?: string;
  language?: string;
  languages?: readonly string[];
}

/**
 * LocalStorage型のモック
 */
export interface MockStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  length: number;
  key: (index: number) => string | null;
}

/**
 * モックAuthUserを作成するヘルパー関数
 */
export function createMockAuthUser(overrides?: Partial<MockAuthUser>): MockAuthUser {
  return {
    username: 'test@example.com',
    userId: 'test-user-id',
    ...overrides,
  };
}

/**
 * モックAuthSessionを作成するヘルパー関数
 */
export function createMockAuthSession(overrides?: Partial<MockAuthSession>): MockAuthSession {
  return {
    tokens: {
      idToken: {
        toString: () => 'test-token',
        payload: {},
      },
      accessToken: {
        toString: () => 'test-access-token',
        payload: {},
      },
    },
    ...overrides,
  };
}

/**
 * モックNavigatorを作成するヘルパー関数
 */
export function createMockNavigator(overrides?: Partial<MockNavigator>): MockNavigator {
  return {
    onLine: true,
    userAgent: 'Mozilla/5.0 (Test)',
    language: 'ja',
    languages: ['ja', 'en'],
    ...overrides,
  };
}
