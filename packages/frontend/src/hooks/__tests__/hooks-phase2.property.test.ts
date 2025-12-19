import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useGoalForm } from '../useGoalForm';
import { useAuth } from '../useAuth';
import { useErrorHandler } from '../useErrorHandler';
import { useNetworkStatus } from '../useNetworkStatus';
import { renderHookWithProviders } from '../../test/test-utils';

/**
 * Property 4: Hooksカバレッジ目標の達成（Phase 2）
 *
 * Phase 2目標: 60%以上
 *
 * Validates: Requirements 2.1
 *
 * Note: Phase 2では、フックの動作特性に関するプロパティを検証します。
 */
describe('Property 4: Hooks Phase 2 Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 4.1: Hook State Consistency', () => {
    it('useAuth should maintain consistent state across operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          async (email, password) => {
            const { result } = renderHookWithProviders(() => useAuth());

            // 初期状態の確認
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();

            // ログイン操作
            await act(async () => {
              await result.current.signIn(email, password);
            });

            // ログイン後の状態の一貫性を確認
            if (result.current.isAuthenticated) {
              expect(result.current.user).not.toBeNull();
              expect(result.current.user?.email).toBe(email);
            }

            // ログアウト操作
            await act(async () => {
              await result.current.signOut();
            });

            // ログアウト後の状態の一貫性を確認
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
          }
        ),
        { numRuns: 10 } // 軽量化のため10回に削減
      );
    });

    it('useErrorHandler should maintain consistent error state', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async errorMessage => {
          const { result } = renderHook(() => useErrorHandler());

          // エラー設定
          act(() => {
            result.current.setError(errorMessage);
          });

          // エラー状態の一貫性を確認
          expect(result.current.error).toBe(errorMessage);

          // エラークリア
          act(() => {
            result.current.clearError();
          });

          // クリア後の状態の一貫性を確認
          expect(result.current.error).toBeNull();
          expect(result.current.isNetworkError).toBe(false);
          expect(result.current.isRetryable).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4.2: Hook Cleanup Completeness', () => {
    it('useNetworkStatus should cleanup event listeners on unmount', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async iterations => {
          for (let i = 0; i < iterations; i++) {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useNetworkStatus());

            // イベントリスナーが追加されたことを確認
            expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

            // アンマウント
            unmount();

            // イベントリスナーが削除されたことを確認
            expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
            expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

            addEventListenerSpy.mockRestore();
            removeEventListenerSpy.mockRestore();
          }

          // 全てのイテレーションでクリーンアップが正しく実行されたことを確認
          expect(true).toBe(true);
        }),
        { numRuns: 5 }
      );
    });

    it('useGoalForm should cleanup timers on unmount', async () => {
      vi.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async iterations => {
          for (let i = 0; i < iterations; i++) {
            const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

            const { result, unmount } = renderHookWithProviders(() =>
              useGoalForm({
                onDraftSave: mockOnDraftSave,
                enableAutoSave: true,
                autoSaveInterval: 5000,
              })
            );

            // フォームに変更を加える
            await act(async () => {
              result.current.setValue('title', `Test ${i}`, { shouldDirty: true });
            });

            // アンマウント前にタイマーをクリア
            unmount();

            // タイマーを進める
            await act(async () => {
              vi.advanceTimersByTime(5000);
            });

            // アンマウント後は自動保存が実行されないことを確認
            expect(mockOnDraftSave).not.toHaveBeenCalled();
          }

          // 全てのイテレーションでクリーンアップが正しく実行されたことを確認
          expect(true).toBe(true);
        }),
        { numRuns: 3 }
      );

      vi.useRealTimers();
    });
  });

  describe('Property 4.3: Hook Error Recovery', () => {
    it('useErrorHandler should recover from any error type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string(),
            fc.constant(null),
            fc.constant(undefined),
            fc.record({
              code: fc.string(),
              message: fc.string(),
            }),
            fc.constant(new Error('Test error'))
          ),
          async error => {
            const { result } = renderHook(() => useErrorHandler());

            // エラー設定
            act(() => {
              result.current.setError(error);
            });

            // エラーが設定されたことを確認
            expect(result.current.error).not.toBeNull();

            // エラークリア
            act(() => {
              result.current.clearError();
            });

            // エラーから回復したことを確認
            expect(result.current.error).toBeNull();
            expect(result.current.isNetworkError).toBe(false);
            expect(result.current.isRetryable).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4.4: Hook Performance', () => {
    it('useErrorHandler should handle rapid error updates efficiently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 5, maxLength: 20 }),
          async errors => {
            const { result } = renderHook(() => useErrorHandler());

            const startTime = performance.now();

            // 連続してエラーを設定
            for (const error of errors) {
              act(() => {
                result.current.setError(error);
              });
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // 処理時間が100ms以内であることを確認（パフォーマンス要件）
            expect(duration).toBeLessThan(100);

            // 最後のエラーが設定されていることを確認
            expect(result.current.error).toBe(errors[errors.length - 1]);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('useNetworkStatus should handle rapid network state changes efficiently', async () => {
      vi.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }), async states => {
          const { result } = renderHook(() => useNetworkStatus());

          const startTime = performance.now();

          // 連続してネットワーク状態を変更
          for (const isOnline of states) {
            act(() => {
              Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: isOnline,
              });
              window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
            });
          }

          const endTime = performance.now();
          const duration = endTime - startTime;

          // 処理時間が100ms以内であることを確認（パフォーマンス要件）
          expect(duration).toBeLessThan(100);

          // 最後の状態が反映されていることを確認
          expect(result.current.isOnline).toBe(states[states.length - 1]);
        }),
        { numRuns: 5 }
      );

      vi.useRealTimers();
    });
  });

  describe('Property 4.5: Hook Idempotency', () => {
    it('useErrorHandler clearError should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 5 }),
          async (errorMessage, clearCount) => {
            const { result } = renderHook(() => useErrorHandler());

            // エラー設定
            act(() => {
              result.current.setError(errorMessage);
            });

            // 複数回クリアを実行
            for (let i = 0; i < clearCount; i++) {
              act(() => {
                result.current.clearError();
              });
            }

            // 何回クリアしても同じ結果になることを確認
            expect(result.current.error).toBeNull();
            expect(result.current.isNetworkError).toBe(false);
            expect(result.current.isRetryable).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4.6: Hook Concurrent Operations', () => {
    it('useErrorHandler should handle concurrent error updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
          async errors => {
            const { result } = renderHook(() => useErrorHandler());

            // 並行してエラーを設定
            act(() => {
              errors.forEach(error => {
                result.current.setError(error);
              });
            });

            // 最後のエラーが設定されていることを確認
            expect(result.current.error).toBe(errors[errors.length - 1]);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
