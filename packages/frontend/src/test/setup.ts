import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, afterAll } from 'vitest';
import { setupCustomMatchers } from './matchers/custom-matchers';

// カスタムマッチャーを登録
setupCustomMatchers();

// Testing Libraryの設定を最適化
configure({
  // デフォルトのwaitForタイムアウトを短縮（高速化）
  asyncUtilTimeout: 500,
  // React Strict Modeを無効化して警告を抑制
  reactStrictMode: false,
});

// コンソール警告・エラーのフィルタリング
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  // React Router警告を抑制
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React Router Future Flag Warning') ||
      args[0].includes('Relative route resolution within Splat routes') ||
      args[0].includes('v7_startTransition') ||
      args[0].includes('v7_relativeSplatPath'))
  ) {
    return;
  }

  // React act()警告を抑制
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('act(...)') ||
      args[0].includes('wrapped in act') ||
      args[0].includes('When testing, code that causes React state updates'))
  ) {
    return;
  }

  // 意図的なエラーテストのログを抑制
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Progress history error') ||
      args[0].includes('Invalid drag data') ||
      args[0].includes('回復アクション実行エラー') ||
      args[0].includes('自動回復に失敗しました') ||
      args[0].includes('Logout failed'))
  ) {
    return;
  }

  // その他の重要なエラーは表示
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  // npm警告を抑制
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Unknown user config') || args[0].includes('npm WARN'))
  ) {
    return;
  }

  // React Router警告を抑制
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React Router Future Flag Warning') ||
      args[0].includes('v7_startTransition') ||
      args[0].includes('v7_relativeSplatPath'))
  ) {
    return;
  }

  // その他の重要な警告は表示
  originalWarn.call(console, ...args);
};

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

// IntersectionObserverのモック
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  get root() {
    return null;
  }
  get rootMargin() {
    return '';
  }
  get thresholds() {
    return [];
  }
} as any;

// requestAnimationFrameのモック（タイマーIDを追跡）
// メモリリーク防止: WeakMapではなくMapを使用し、定期的にクリア
let rafTimers = new Map<number, NodeJS.Timeout>();
let rafIdCounter = 0;

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++rafIdCounter;
  const timer = globalThis.setTimeout(() => {
    rafTimers.delete(id);
    try {
      callback(performance.now());
    } catch (error) {
      // エラーを無視してメモリリークを防ぐ
    }
  }, 16); // 約60fps
  rafTimers.set(id, timer);
  return id;
};

global.cancelAnimationFrame = (id: number): void => {
  const timer = rafTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    rafTimers.delete(id);
  }
};

// Web Animations APIのモック（メモリリーク対策版）
// アニメーションオブジェクトを追跡してクリーンアップ可能にする
const activeAnimations = new Set<any>();

if (typeof Element !== 'undefined') {
  Element.prototype.animate = vi.fn(function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions
  ) {
    // アニメーションオブジェクトのモックを返す（最小限の実装）
    const animation = {
      id: '',
      effect: null,
      timeline: null,
      startTime: null,
      currentTime: 0,
      playbackRate: 1,
      playState: 'finished' as AnimationPlayState, // 即座に完了状態にする
      ready: Promise.resolve({} as Animation),
      finished: Promise.resolve({} as Animation),
      pending: false,
      replaceState: 'active' as AnimationReplaceState,
      cancel: vi.fn(),
      finish: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      reverse: vi.fn(),
      updatePlaybackRate: vi.fn(),
      persist: vi.fn(),
      commitStyles: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
      oncancel: null,
      onfinish: null,
      onremove: null,
    };

    // アニメーションを追跡（クリーンアップ用）
    activeAnimations.add(animation);

    return animation as Animation;
  });

  Element.prototype.getAnimations = vi.fn(function (this: Element) {
    return [];
  });
}

// matchMediaのモック（拡張版）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: any) => {
    // クエリを文字列に変換（安全性のため）
    const queryStr = String(query || '');

    // クエリに基づいてmatchesを決定
    let matches = false;

    // ポインターデバイスのクエリ
    if (queryStr.includes('pointer: coarse')) {
      matches = false; // デフォルトはfineポインター（マウス）
    } else if (queryStr.includes('pointer: fine')) {
      matches = true; // デフォルトはfineポインター（マウス）
    } else if (queryStr.includes('pointer: none')) {
      matches = false;
    }
    // ホバー機能のクエリ
    else if (queryStr.includes('hover: hover')) {
      matches = true; // デフォルトはホバー可能
    } else if (queryStr.includes('hover: none')) {
      matches = false;
    }
    // その他のクエリはデフォルトでfalse
    else {
      matches = false;
    }

    return {
      matches,
      media: queryStr,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
  },
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

// タイマー追跡（メモリリーク防止）
const activeTimers = new Set<NodeJS.Timeout>();
const originalSetTimeout = globalThis.setTimeout;
const originalSetInterval = globalThis.setInterval;
const originalClearTimeout = globalThis.clearTimeout;
const originalClearInterval = globalThis.clearInterval;

// setTimeoutをラップしてタイマーを追跡
globalThis.setTimeout = function (callback: any, delay?: number, ...args: any[]): NodeJS.Timeout {
  const timer = originalSetTimeout.call(globalThis, callback, delay, ...args);
  activeTimers.add(timer);
  return timer;
} as any;

// setIntervalをラップしてタイマーを追跡
globalThis.setInterval = function (callback: any, delay?: number, ...args: any[]): NodeJS.Timeout {
  const timer = originalSetInterval.call(globalThis, callback, delay, ...args);
  activeTimers.add(timer);
  return timer;
} as any;

// clearTimeoutをラップしてタイマーを削除
globalThis.clearTimeout = function (timer: NodeJS.Timeout): void {
  activeTimers.delete(timer);
  originalClearTimeout.call(globalThis, timer);
} as any;

// clearIntervalをラップしてタイマーを削除
globalThis.clearInterval = function (timer: NodeJS.Timeout): void {
  activeTimers.delete(timer);
  originalClearInterval.call(globalThis, timer);
} as any;

// タイムアウトハンドラーの設定
beforeEach(() => {
  // ストレージをクリア
  localStorageMock.clear();
  sessionStorageMock.clear();

  // デフォルトの認証トークンを設定
  localStorageMock.setItem('auth_token', 'mock-auth-token');
});

afterEach(async () => {
  // 1. React Testing Libraryのクリーンアップ
  cleanup();

  // 2. タイマーをクリア（メモリリーク防止）
  vi.clearAllTimers();

  // 追跡されているすべてのタイマーをクリア
  activeTimers.forEach(timer => {
    try {
      originalClearTimeout.call(globalThis, timer);
      originalClearInterval.call(globalThis, timer);
    } catch (e) {
      // エラーを無視
    }
  });
  activeTimers.clear();

  // requestAnimationFrameタイマーを完全にクリア
  rafTimers.forEach(timer => {
    try {
      originalClearTimeout.call(globalThis, timer);
    } catch (e) {
      // エラーを無視
    }
  });
  rafTimers.clear();
  rafTimers = new Map(); // 新しいMapインスタンスを作成

  // アクティブなアニメーションをクリア
  activeAnimations.clear();

  // 3. ストレージのクリア
  localStorageMock.clear();
  sessionStorageMock.clear();

  // 4. モックのクリア
  vi.clearAllMocks();

  // 5. fetchモックのリセット
  if (global.fetch && typeof global.fetch === 'function') {
    (global.fetch as any).mockClear?.();
  }

  // 6. DOMのクリーンアップ
  if (typeof document !== 'undefined') {
    // body要素を完全にクリア
    document.body.innerHTML = '';

    // イベントリスナーのクリーンアップは不要（cleanup()で処理される）
  }

  // 7. グローバル変数のリセット
  if (typeof window !== 'undefined') {
    // @ts-ignore
    delete window.__REACT_ROUTER_CONTEXT__;
    // @ts-ignore
    delete window.__INITIAL_STATE__;
  }

  // 8. 強制的にガベージコレクションを促す（Node.js環境）
  if (typeof global !== 'undefined' && global.gc) {
    try {
      global.gc();
    } catch (e) {
      // gc()が利用できない場合は無視
    }
  }
});

// テストスイート終了時のクリーンアップ
afterAll(() => {
  // コンソールメソッドを元に戻す
  console.error = originalError;
  console.warn = originalWarn;

  // グローバル変数の完全リセット
  vi.restoreAllMocks();
  vi.clearAllTimers();
});
