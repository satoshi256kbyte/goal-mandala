import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * タイムアウト処理フックの戻り値の型
 */
export interface UseTimeoutReturn {
  /** タイムアウトを開始 */
  startTimeout: (callback: () => void, delay: number) => void;
  /** タイムアウトをクリア */
  clearTimeout: () => void;
  /** タイムアウトが実行中かどうか */
  isActive: boolean;
  /** 残り時間（ミリ秒） */
  remainingTime: number;
}

/**
 * タイムアウト処理フックのオプション
 */
export interface UseTimeoutOptions {
  /** 自動クリーンアップを有効にするか */
  autoCleanup?: boolean;
  /** 進捗更新の間隔（ミリ秒） */
  progressInterval?: number;
  /** タイムアウト開始時のコールバック */
  onStart?: () => void;
  /** タイムアウト実行時のコールバック */
  onTimeout?: () => void;
  /** タイムアウトキャンセル時のコールバック */
  onCancel?: () => void;
}

/**
 * タイムアウト処理フック
 *
 * 指定した時間後にコールバックを実行するタイムアウト機能を提供します。
 * 進捗表示、キャンセル機能、自動クリーンアップなどの機能を含みます。
 */
export const useTimeout = (options: UseTimeoutOptions = {}): UseTimeoutReturn => {
  const { autoCleanup = true, progressInterval = 100, onStart, onTimeout, onCancel } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);
  const elapsedRef = useRef<number>(0);
  const delayRef = useRef<number>(0);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  /**
   * タイムアウトを開始
   */
  const startTimeout = useCallback(
    (callback: () => void, delay: number) => {
      // 既存のタイムアウトをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }

      callbackRef.current = callback;
      elapsedRef.current = 0;
      delayRef.current = delay;
      setIsActive(true);
      setRemainingTime(delay);

      // 開始コールバックを実行
      onStart?.();

      // メインタイムアウトを設定
      timeoutRef.current = setTimeout(() => {
        setIsActive(false);
        setRemainingTime(0);

        // タイムアウトコールバックを実行
        onTimeout?.();

        // ユーザーコールバックを実行
        if (callbackRef.current) {
          callbackRef.current();
        }

        // 進捗タイマーをクリア
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
      }, delay);

      // 進捗更新タイマーを設定
      progressRef.current = setInterval(() => {
        elapsedRef.current += progressInterval;
        const remaining = Math.max(0, delayRef.current - elapsedRef.current);
        setRemainingTime(remaining);

        if (remaining <= 0) {
          setIsActive(false);
          if (progressRef.current) {
            clearInterval(progressRef.current);
            progressRef.current = null;
          }
        }
      }, progressInterval);
    },
    [progressInterval, onStart, onTimeout]
  );

  /**
   * タイムアウトをクリア
   */
  const clearTimeoutHandler = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }

    // 状態をリセット
    setIsActive(false);
    setRemainingTime(0);
    callbackRef.current = null;

    // キャンセルコールバックを実行
    onCancel?.();
  }, [onCancel]);

  // コンポーネントアンマウント時の自動クリーンアップ
  useEffect(() => {
    if (!autoCleanup) return;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [autoCleanup]);

  return {
    startTimeout,
    clearTimeout: clearTimeoutHandler,
    isActive,
    remainingTime,
  };
};

/**
 * 複数のタイムアウトを管理するフック
 */
export interface UseMultipleTimeoutsReturn {
  /** タイムアウトを開始 */
  startTimeout: (id: string, callback: () => void, delay: number) => void;
  /** 特定のタイムアウトをクリア */
  clearTimeout: (id: string) => void;
  /** 全てのタイムアウトをクリア */
  clearAllTimeouts: () => void;
  /** 特定のタイムアウトがアクティブかチェック */
  isActive: (id: string) => boolean;
  /** 特定のタイムアウトの残り時間を取得 */
  getRemainingTime: (id: string) => number;
  /** アクティブなタイムアウトのIDリストを取得 */
  getActiveTimeouts: () => string[];
}

export const useMultipleTimeouts = (options: UseTimeoutOptions = {}): UseMultipleTimeoutsReturn => {
  const timeoutsRef = useRef<
    Map<
      string,
      {
        timeoutId: NodeJS.Timeout;
        progressId: NodeJS.Timeout | null;
        callback: () => void;
        elapsed: number;
        delay: number;
        isActive: boolean;
      }
    >
  >(new Map());

  const { autoCleanup = true, progressInterval = 100, onStart, onTimeout, onCancel } = options;

  /**
   * タイムアウトを開始
   */
  const startTimeout = useCallback(
    (id: string, callback: () => void, delay: number) => {
      // 既存のタイムアウトをクリア
      const existing = timeoutsRef.current.get(id);
      if (existing) {
        clearTimeout(existing.timeoutId);
        if (existing.progressId) {
          clearInterval(existing.progressId);
        }
      }

      // 開始コールバックを実行
      onStart?.();

      // メインタイムアウトを設定
      const timeoutId = setTimeout(() => {
        const timeoutData = timeoutsRef.current.get(id);
        if (timeoutData) {
          timeoutData.isActive = false;

          // タイムアウトコールバックを実行
          onTimeout?.();

          // ユーザーコールバックを実行
          callback();

          // 進捗タイマーをクリア
          if (timeoutData.progressId) {
            clearInterval(timeoutData.progressId);
          }

          // マップから削除
          timeoutsRef.current.delete(id);
        }
      }, delay);

      // 進捗更新タイマーを設定
      const progressId = setInterval(() => {
        const timeoutData = timeoutsRef.current.get(id);
        if (timeoutData && timeoutData.isActive) {
          timeoutData.elapsed += progressInterval;
          const remaining = Math.max(0, timeoutData.delay - timeoutData.elapsed);

          if (remaining <= 0) {
            timeoutData.isActive = false;
            clearInterval(progressId);
          }
        }
      }, progressInterval);

      // タイムアウトデータを保存
      timeoutsRef.current.set(id, {
        timeoutId,
        progressId,
        callback,
        elapsed: 0,
        delay,
        isActive: true,
      });
    },
    [progressInterval, onStart, onTimeout]
  );

  /**
   * 特定のタイムアウトをクリア
   */
  const clearTimeoutHandler = useCallback(
    (id: string) => {
      const timeoutData = timeoutsRef.current.get(id);
      if (timeoutData) {
        clearTimeout(timeoutData.timeoutId);
        if (timeoutData.progressId) {
          clearInterval(timeoutData.progressId);
        }

        const wasActive = timeoutData.isActive;
        timeoutsRef.current.delete(id);

        // キャンセルコールバックを実行（アクティブだった場合のみ）
        if (wasActive) {
          onCancel?.();
        }
      }
    },
    [onCancel]
  );

  /**
   * 全てのタイムアウトをクリア
   */
  const clearAllTimeouts = useCallback(() => {
    const activeIds = Array.from(timeoutsRef.current.keys());
    activeIds.forEach(id => clearTimeoutHandler(id));
  }, [clearTimeoutHandler]);

  /**
   * 特定のタイムアウトがアクティブかチェック
   */
  const isActive = useCallback((id: string): boolean => {
    const timeoutData = timeoutsRef.current.get(id);
    return timeoutData?.isActive ?? false;
  }, []);

  /**
   * 特定のタイムアウトの残り時間を取得
   */
  const getRemainingTime = useCallback((id: string): number => {
    const timeoutData = timeoutsRef.current.get(id);
    if (!timeoutData || !timeoutData.isActive) {
      return 0;
    }

    return Math.max(0, timeoutData.delay - timeoutData.elapsed);
  }, []);

  /**
   * アクティブなタイムアウトのIDリストを取得
   */
  const getActiveTimeouts = useCallback((): string[] => {
    return Array.from(timeoutsRef.current.entries())
      .filter(([, data]) => data.isActive)
      .map(([id]) => id);
  }, []);

  // コンポーネントアンマウント時の自動クリーンアップ
  useEffect(() => {
    if (autoCleanup) {
      return () => {
        clearAllTimeouts();
      };
    }
  }, [autoCleanup, clearAllTimeouts]);

  return {
    startTimeout,
    clearTimeout: clearTimeoutHandler,
    clearAllTimeouts,
    isActive,
    getRemainingTime,
    getActiveTimeouts,
  };
};

/**
 * フォーム送信用のタイムアウト処理フック
 */
export interface UseFormTimeoutOptions extends UseTimeoutOptions {
  /** デフォルトのタイムアウト時間（ミリ秒） */
  defaultTimeout?: number;
  /** タイムアウト警告時間（ミリ秒） */
  warningTimeout?: number;
  /** 警告表示のコールバック */
  onWarning?: () => void;
}

export interface UseFormTimeoutReturn extends UseTimeoutReturn {
  /** フォーム送信タイムアウトを開始 */
  startSubmissionTimeout: (callback?: () => void) => void;
  /** 警告が表示されているかどうか */
  isWarning: boolean;
  /** 進捗率（0-1） */
  progress: number;
}

export const useFormTimeout = (options: UseFormTimeoutOptions = {}): UseFormTimeoutReturn => {
  const {
    defaultTimeout = 30000, // 30秒
    warningTimeout = 20000, // 20秒
    onWarning,
    ...timeoutOptions
  } = options;

  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isWarning, setIsWarning] = useState<boolean>(false);

  const timeout = useTimeout({
    ...timeoutOptions,
    onStart: () => {
      setIsWarning(false);

      // 警告タイムアウトを設定
      if (warningTimeout < defaultTimeout) {
        warningTimeoutRef.current = setTimeout(() => {
          setIsWarning(true);
          onWarning?.();
        }, warningTimeout);
      }

      timeoutOptions.onStart?.();
    },
    onTimeout: () => {
      setIsWarning(false);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      timeoutOptions.onTimeout?.();
    },
    onCancel: () => {
      setIsWarning(false);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      timeoutOptions.onCancel?.();
    },
  });

  /**
   * フォーム送信タイムアウトを開始
   */
  const startSubmissionTimeout = useCallback(
    (callback?: () => void) => {
      const defaultCallback = () => {
        console.warn('フォーム送信がタイムアウトしました');
      };

      timeout.startTimeout(callback || defaultCallback, defaultTimeout);
    },
    [timeout, defaultTimeout]
  );

  /**
   * 進捗率を計算
   */
  const progress = timeout.isActive
    ? Math.max(0, 1 - timeout.remainingTime / defaultTimeout)
    : timeout.remainingTime === 0
      ? 1
      : 0;

  return {
    ...timeout,
    startSubmissionTimeout,
    isWarning,
    progress,
  };
};

export default useTimeout;
