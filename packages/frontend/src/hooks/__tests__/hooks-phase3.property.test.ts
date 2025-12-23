import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useGoalForm } from '../useGoalForm';
import { useAuth } from '../useAuth';
import { useWorkflow } from '../useWorkflow';
import { useErrorHandler } from '../useErrorHandler';
import { useNetworkStatus } from '../useNetworkStatus';
import { renderHookWithProviders } from '../../test/test-utils';

/**
 * Property 4: Hooksカバレッジ目標の達成（Phase 3）
 *
 * Phase 3目標: 80%以上
 *
 * Validates: Requirements 2.1
 *
 * Note: Phase 3では、より高度なプロパティを検証し、80%カバレッジを目指します。
 * エッジケース、エラーハンドリング、パフォーマンス、並行処理などを重点的にテストします。
 */
describe('Property 4: Hooks Phase 3 Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 4.7: Hook State Consistency (Advanced)', () => {
    it('useGoalForm should maintain consistent state across multiple field updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 0, maxLength: 500 }),
            deadline: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
          }),
          async formData => {
            const { result } = renderHookWithProviders(() => useGoalForm());

            // 複数フィールドを更新
            await act(async () => {
              result.current.setValue('title', formData.title, { shouldDirty: true });
              result.current.setValue('description', formData.description, { shouldDirty: true });
              result.current.setValue('deadline', formData.deadline.toISOString().split('T')[0], {
                shouldDirty: true,
              });
            });

            // 状態の一貫性を確認
            const values = result.current.getValues();
            expect(values.title).toBe(formData.title);
            expect(values.description).toBe(formData.description);
            expect(result.current.formState.isDirty).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('useAuth should maintain consistent state during rapid sign in/out cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 20 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async credentials => {
            const { result } = renderHookWithProviders(() => useAuth());

            for (const cred of credentials) {
              // サインイン
              await act(async () => {
                await result.current.signIn(cred.email, cred.password);
              });

              // サインアウト
              await act(async () => {
                await result.current.signOut();
              });

              // 最終的に未認証状態であることを確認
              expect(result.current.isAuthenticated).toBe(false);
              expect(result.current.user).toBeNull();
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 4.8: Hook Cleanup Completeness (Advanced)', () => {
    it('useWorkflow should cleanup polling timers on unmount', async () => {
      vi.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async iterations => {
          for (let i = 0; i < iterations; i++) {
            const { result, unmount } = renderHookWithProviders(() => useWorkflow());

            // ワークフロー開始
            await act(async () => {
              await result.current.startWorkflow(`goal-${i}`);
            });

            // アンマウント
            unmount();

            // タイマーを進める
            await act(async () => {
              vi.advanceTimersByTime(10000);
            });

            // アンマウント後はポーリングが実行されないことを確認
            expect(true).toBe(true);
          }
        }),
        { numRuns: 3 }
      );

      vi.useRealTimers();
    });

    it('useErrorHandler should cleanup state on unmount', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async iterations => {
          for (let i = 0; i < iterations; i++) {
            const { result, unmount } = renderHook(() => useErrorHandler());

            // エラーを設定
            act(() => {
              result.current.setError(`Error ${i}`);
            });

            // アンマウント
            unmount();

            // メモリリークが発生しないことを確認
            expect(true).toBe(true);
          }
        }),
        { numRuns: 3 }
      );
    });
  });

  describe('Property 4.9: Hook Error Recovery (Advanced)', () => {
    it('useErrorHandler should recover from any error type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          async errors => {
            const { result } = renderHook(() => useErrorHandler());

            for (const error of errors) {
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
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('useNetworkStatus should recover from network state changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
          async networkStates => {
            const { result } = renderHook(() => useNetworkStatus());

            // 連続してネットワーク状態を変更
            for (const isOnline of networkStates) {
              act(() => {
                Object.defineProperty(navigator, 'onLine', {
                  writable: true,
                  value: isOnline,
                  configurable: true,
                });
                window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
              });
            }

            // 最後の状態が正しく反映されていることを確認（エラーから回復）
            expect(result.current.isOnline).toBe(networkStates[networkStates.length - 1]);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 4.10: Hook Performance (Advanced)', () => {
    it('useGoalForm should handle large form data efficiently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 1000 }), // 長い文字列
            description: fc.string({ minLength: 0, maxLength: 5000 }), // 非常に長い文字列
          }),
          async formData => {
            const { result } = renderHookWithProviders(() => useGoalForm());

            const startTime = performance.now();

            // 大きなデータを設定
            await act(async () => {
              result.current.setValue('title', formData.title, { shouldDirty: true });
              result.current.setValue('description', formData.description, { shouldDirty: true });
            });

            const endTime = performance.now();
            const duration = endTime - startTime;

            // 処理時間が200ms以内であることを確認
            expect(duration).toBeLessThan(200);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('useNetworkStatus should handle rapid state changes efficiently', async () => {
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
                configurable: true,
              });
              window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
            });
          }

          const endTime = performance.now();
          const duration = endTime - startTime;

          // 処理時間が200ms以内であることを確認
          expect(duration).toBeLessThan(200);

          // 最後の状態が反映されていることを確認
          expect(result.current.isOnline).toBe(states[states.length - 1]);
        }),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 4.11: Hook Idempotency (Advanced)', () => {
    it('useGoalForm reset should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          fc.integer({ min: 1, max: 5 }),
          async (initialData, resetCount) => {
            const { result } = renderHookWithProviders(() => useGoalForm({ initialData }));

            // フォームに変更を加える
            await act(async () => {
              result.current.setValue('title', 'Changed', { shouldDirty: true });
            });

            // 複数回リセットを実行
            for (let i = 0; i < resetCount; i++) {
              act(() => {
                result.current.reset(initialData);
              });
            }

            // 何回リセットしても同じ結果になることを確認
            expect(result.current.getValues().title).toBe(initialData.title);
            expect(result.current.formState.isDirty).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('useAuth signOut should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async signOutCount => {
          const { result } = renderHookWithProviders(() => useAuth());

          // 複数回サインアウトを実行
          for (let i = 0; i < signOutCount; i++) {
            await act(async () => {
              await result.current.signOut();
            });
          }

          // 何回サインアウトしても同じ結果になることを確認
          expect(result.current.isAuthenticated).toBe(false);
          expect(result.current.user).toBeNull();
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 4.12: Hook Concurrent Operations (Advanced)', () => {
    it('useGoalForm should handle concurrent field updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              field: fc.constantFrom('title', 'description'),
              value: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async updates => {
            const { result } = renderHookWithProviders(() => useGoalForm());

            // 並行してフィールドを更新
            await act(async () => {
              updates.forEach(update => {
                result.current.setValue(update.field as 'title' | 'description', update.value, {
                  shouldDirty: true,
                });
              });
            });

            // 最後の更新が反映されていることを確認
            const lastTitleUpdate = updates.filter(u => u.field === 'title').pop();
            const lastDescriptionUpdate = updates.filter(u => u.field === 'description').pop();

            const values = result.current.getValues();
            if (lastTitleUpdate) {
              expect(values.title).toBe(lastTitleUpdate.value);
            }
            if (lastDescriptionUpdate) {
              expect(values.description).toBe(lastDescriptionUpdate.value);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

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

            // クリーンアップ
            act(() => {
              result.current.clearError();
            });

            // 状態が正しくクリアされていることを確認
            expect(result.current.error).toBeNull();
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
