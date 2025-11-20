import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, afterAll } from 'vitest';

// Testing Libraryの設定を最適化
configure({
  // デフォルトのwaitForタイムアウトを短縮
  asyncUtilTimeout: 1000,
  // DOM要素の検索タイムアウトを短縮
  getByTimeout: 1000,
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
      ready: Promise.resolve(animation as Animation),
      finished: Promise.resolve(animation as Animation),
      pending: false,
      replaceState: 'active' as AnimationReplaceState,
      cancel: vi.fn(function (this: Animation) {
        this.playState = 'idle';
        // cancelイベントを発火
        const listeners = eventListeners.get('cancel');
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(new Event('cancel'));
            } catch (error) {
              console.error('Error in cancel listener:', error);
            }
          });
        }
      }),
      finish: vi.fn(function (this: Animation) {
        this.playState = 'finished';
        // finishイベントを発火
        const listeners = eventListeners.get('finish');
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(new Event('finish'));
            } catch (error) {
              console.error('Error in finish listener:', error);
            }
          });
        }
      }),
      pause: vi.fn(function (this: Animation) {
        this.playState = 'paused';
      }),
      play: vi.fn(function (this: Animation) {
        this.playState = 'running';
      }),
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
  try {
    // 1. 非同期処理の完了を待機
    await new Promise(resolve => {
      if (typeof setTimeout !== 'undefined') {
        setTimeout(resolve, 0);
      } else {
        resolve(undefined);
      }
    });
  } catch (error) {
    console.error('async wait failed:', error);
  }

  try {
    // 2. React Testing Libraryのクリーンアップ
    cleanup();
  } catch (error) {
    console.error('cleanup() failed:', error);
  }

  try {
    // 3. すべてのタイマーをクリア
    vi.clearAllTimers();
  } catch (error) {
    console.error('vi.clearAllTimers() failed:', error);
  }

  try {
    // 4. すべてのrequestAnimationFrameタイマーをクリア
    rafTimers.forEach(timer => clearTimeout(timer));
    rafTimers.clear();
    rafIdCounter = 0;
  } catch (error) {
    console.error('rafTimers cleanup failed:', error);
  }

  try {
    // 5. ストレージのクリア
    localStorageMock.clear();
    sessionStorageMock.clear();
  } catch (error) {
    console.error('storage cleanup failed:', error);
  }

  try {
    // 6. すべてのモックをクリア
    vi.clearAllMocks();
    vi.resetAllMocks();
  } catch (error) {
    console.error('vi.clearAllMocks() failed:', error);
  }

  try {
    // 7. fetchモックのリセット
    if (global.fetch && typeof global.fetch === 'function') {
      (global.fetch as any).mockClear?.();
    }
  } catch (error) {
    console.error('fetch mock cleanup failed:', error);
  }

  try {
    // 8. DOMイベントリスナーのクリーンアップ
    if (typeof document !== 'undefined') {
      // すべてのイベントリスナーを削除
      const events = ['click', 'change', 'input', 'submit', 'keydown', 'keyup', 'focus', 'blur'];
      events.forEach(event => {
        document.removeEventListener(event, () => {});
      });
    }
  } catch (error) {
    console.error('DOM event cleanup failed:', error);
  }

  try {
    // 9. グローバル変数のクリーンアップ
    if (typeof window !== 'undefined') {
      // AchievementManagerのクリーンアップ
      if ((window as any).achievementManager) {
        (window as any).achievementManager.cleanup();
        delete (window as any).achievementManager;
      }

      // その他のグローバル変数をクリーンアップ
      const globalKeys = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', '__REDUX_DEVTOOLS_EXTENSION__'];
      globalKeys.forEach(key => {
        if ((window as any)[key]) {
          delete (window as any)[key];
        }
      });
    }
  } catch (error) {
    console.error('global variables cleanup failed:', error);
  }

  try {
    // 10. DOMの完全クリーンアップ
    if (typeof document !== 'undefined' && document.body) {
      // すべての子要素を削除
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
      // bodyの属性をクリア
      Array.from(document.body.attributes).forEach(attr => {
        document.body.removeAttribute(attr.name);
      });
    }
  } catch (error) {
    console.error('DOM cleanup failed:', error);
  }

  try {
    // 11. 非同期処理の完了を再度待機
    await new Promise(resolve => {
      if (typeof setTimeout !== 'undefined') {
        setTimeout(resolve, 0);
      } else {
        resolve(undefined);
      }
    });
  } catch (error) {
    console.error('final async wait failed:', error);
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
