import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// Testing Libraryの設定を最適化
configure({
  // デフォルトのwaitForタイムアウトを短縮
  asyncUtilTimeout: 1000,
  // DOM要素の検索タイムアウトを短縮
  getByTimeout: 1000,
});

// テスト環境変数の設定
process.env.NODE_ENV = 'test';
process.env.VITE_API_BASE_URL = 'http://localhost:3000';
process.env.VITE_AWS_REGION = 'ap-northeast-1';
process.env.VITE_COGNITO_USER_POOL_ID = 'test-user-pool-id';
process.env.VITE_COGNITO_CLIENT_ID = 'test-client-id';

// グローバルなテストセットアップ
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// fetchのグローバルモック
global.fetch = vi.fn();

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// sessionStorageのモック
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// タイムアウトハンドラーの設定
beforeEach(() => {
  // 各テスト前にストレージをクリア
  localStorageMock.clear();
  sessionStorageMock.clear();

  // fetchモックをリセット
  vi.clearAllMocks();
});

afterEach(() => {
  // テスト後のクリーンアップ
  vi.clearAllTimers();
  vi.restoreAllMocks();
});
