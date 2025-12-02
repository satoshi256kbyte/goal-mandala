import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, afterAll } from 'vitest';

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
const rafTimers = new Map<number, NodeJS.Timeout>();
let rafIdCounter = 0;

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++rafIdCounter;
  const timer = globalThis.setTimeout(() => {
    rafTimers.delete(id);
    callback(performance.now());
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

// Web Animations APIのモック
if (typeof Element !== 'undefined') {
  Element.prototype.animate = vi.fn(function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions
  ) {
    // イベントリスナーを管理するMap
    const eventListeners = new Map<string, Set<EventListener>>();

    // アニメーションオブジェクトのモックを返す
    const animation = {
      id: '',
      effect: null,
      timeline: null,
      startTime: null,
      currentTime: 0,
      playbackRate: 1,
      playState: 'running' as AnimationPlayState,
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
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        if (!eventListeners.has(type)) {
          eventListeners.set(type, new Set());
        }
        eventListeners.get(type)!.add(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        const listeners = eventListeners.get(type);
        if (listeners) {
          listeners.delete(listener);
        }
      }),
      dispatchEvent: vi.fn((event: Event) => {
        const listeners = eventListeners.get(event.type);
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(event);
            } catch (error) {
              console.error(`Error in ${event.type} listener:`, error);
            }
          });
        }
        return true;
      }),
      oncancel: null,
      onfinish: null,
      onremove: null,
    };

    // アニメーションを自動的に完了させる（テスト環境）
    globalThis.setTimeout(() => {
      if (animation.playState === 'running') {
        animation.finish();
      }
    }, 0);

    return animation as Animation;
  });

  Element.prototype.getAnimations = vi.fn(function (this: Element) {
    return [];
  });
}

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
  // 1. すべてのモックをリセット
  vi.clearAllMocks();
  vi.resetAllMocks();

  // 2. タイマーをリセット
  vi.clearAllTimers();

  // 3. ストレージをクリア
  localStorageMock.clear();
  sessionStorageMock.clear();

  // 4. デフォルトの認証トークンを設定（APIテスト用）
  localStorageMock.setItem('auth_token', 'mock-auth-token');

  // 5. fetchモックをリセット
  if (global.fetch && typeof global.fetch === 'function') {
    (global.fetch as any).mockClear?.();
    (global.fetch as any).mockReset?.();
  }

  // 6. animationFrameカウンターをリセット
  rafIdCounter = 0;
  rafTimers.clear();

  // 7. DOMをクリーンアップ
  if (typeof document !== 'undefined' && document.body) {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  }

  // 8. グローバル変数をクリーンアップ
  if (typeof window !== 'undefined') {
    if ((window as any).achievementManager) {
      delete (window as any).achievementManager;
    }
  }
});

afterEach(async () => {
  // 1. React Testing Libraryのクリーンアップ
  cleanup();

  // 2. すべてのタイマーをクリア
  vi.clearAllTimers();

  // 3. requestAnimationFrameタイマーをクリア
  rafTimers.forEach(timer => clearTimeout(timer));
  rafTimers.clear();
  rafIdCounter = 0;

  // 4. ストレージのクリア
  localStorageMock.clear();
  sessionStorageMock.clear();

  // 5. すべてのモックをクリア
  vi.clearAllMocks();

  // 6. グローバル変数のクリーンアップ
  if (typeof window !== 'undefined' && (window as any).achievementManager) {
    delete (window as any).achievementManager;
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
