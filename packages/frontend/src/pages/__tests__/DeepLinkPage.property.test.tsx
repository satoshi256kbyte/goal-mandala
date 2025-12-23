/**
 * Deep Link処理のプロパティベーステスト
 * Feature: reminder-functionality
 *
 * このファイルは以下のプロパティをテストします：
 * - Property 9: Deep Link Authentication
 * - Property 11: Valid Deep Link Navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate, useSearchParams } from 'react-router-dom';
import fc from 'fast-check';
import { DeepLinkPage } from '../DeepLinkPage';
import * as deepLinkApi from '../../services/deepLinkApi';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useSearchParams: vi.fn(),
  };
});

// Mock deepLinkApi
vi.mock('../../services/deepLinkApi');

// テスト用のArbitrary定義

// 有効なトークン文字列（JWT形式を模倣）
const validTokenArbitrary = fc
  .tuple(
    fc.string({ minLength: 32, maxLength: 64 }),
    fc.string({ minLength: 32, maxLength: 64 }),
    fc.string({ minLength: 32, maxLength: 64 })
  )
  .map(
    ([header, payload, signature]) =>
      `${header.replace(/[^a-zA-Z0-9]/g, '')}.${payload.replace(/[^a-zA-Z0-9]/g, '')}.${signature.replace(/[^a-zA-Z0-9]/g, '')}`
  );

// タスクID（UUID形式）
const taskIdArbitrary = fc.uuid();

// ユーザーID（UUID形式）
const userIdArbitrary = fc.uuid();

// 有効なDeep Link検証結果
const validDeepLinkResultArbitrary = fc.record({
  valid: fc.constant(true),
  taskId: taskIdArbitrary,
  userId: userIdArbitrary,
});

// 無効なDeep Link検証結果
const invalidDeepLinkResultArbitrary = fc.record({
  valid: fc.constant(false),
  error: fc.constantFrom(
    'トークンが無効です',
    'トークンの有効期限が切れています',
    'トークンが見つかりません',
    'トークンの検証に失敗しました'
  ),
});

describe('DeepLinkPage Property Tests', () => {
  const mockNavigate = vi.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useSearchParams as any).mockReturnValue([mockSearchParams]);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <DeepLinkPage />
      </BrowserRouter>
    );
  };

  /**
   * Property 9: Deep Link Authentication
   * For any 有効なDeep Linkトークン、ReminderSystemはユーザーを自動的に認証する
   * Validates: Requirements 3.2
   */
  describe('Property 9: Deep Link Authentication', () => {
    it('任意の有効なトークンに対して、自動認証が行われる', () => {
      fc.assert(
        fc.asyncProperty(
          validTokenArbitrary,
          validDeepLinkResultArbitrary,
          async (token, validResult) => {
            // Setup: トークンをURLパラメータに設定
            mockSearchParams.set('token', token);

            // Setup: APIモックを設定
            vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue(validResult);

            // Execute: コンポーネントをレンダリング
            renderComponent();

            // Verify: トークン検証APIが呼ばれる
            await waitFor(() => {
              expect(deepLinkApi.validateDeepLinkToken).toHaveBeenCalledWith(token);
            });

            // Verify: 有効なトークンの場合、ナビゲーションが実行される
            await waitFor(() => {
              expect(mockNavigate).toHaveBeenCalledWith(`/tasks/${validResult.taskId}`, {
                replace: true,
              });
            });

            // Verify: 検証結果が有効である
            expect(validResult.valid).toBe(true);
            expect(validResult.taskId).toBeDefined();
            expect(validResult.userId).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意の無効なトークンに対して、認証が失敗する', () => {
      fc.assert(
        fc.asyncProperty(
          validTokenArbitrary,
          invalidDeepLinkResultArbitrary,
          async (token, invalidResult) => {
            // Setup: トークンをURLパラメータに設定
            mockSearchParams.set('token', token);

            // Setup: APIモックを設定
            vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue(invalidResult);

            // Execute: コンポーネントをレンダリング
            renderComponent();

            // Verify: トークン検証APIが呼ばれる
            await waitFor(() => {
              expect(deepLinkApi.validateDeepLinkToken).toHaveBeenCalledWith(token);
            });

            // Verify: 無効なトークンの場合、タスク詳細ページへのナビゲーションは実行されない
            await waitFor(
              () => {
                const taskNavigationCalls = mockNavigate.mock.calls.filter(call =>
                  call[0]?.toString().startsWith('/tasks/')
                );
                expect(taskNavigationCalls.length).toBe(0);
              },
              { timeout: 1000 }
            );

            // Verify: 検証結果が無効である
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('トークンが存在しない場合、認証が失敗する', () => {
      fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Setup: トークンをURLパラメータから削除
          mockSearchParams.delete('token');

          // Execute: コンポーネントをレンダリング
          renderComponent();

          // Verify: トークン検証APIは呼ばれない
          await waitFor(
            () => {
              expect(deepLinkApi.validateDeepLinkToken).not.toHaveBeenCalled();
            },
            { timeout: 1000 }
          );

          // Verify: タスク詳細ページへのナビゲーションは実行されない
          await waitFor(
            () => {
              const taskNavigationCalls = mockNavigate.mock.calls.filter(call =>
                call[0]?.toString().startsWith('/tasks/')
              );
              expect(taskNavigationCalls.length).toBe(0);
            },
            { timeout: 1000 }
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Valid Deep Link Navigation
   * For any 有効なDeep Link、クリックするとユーザーを直接タスク詳細ページへナビゲートする
   * Validates: Requirements 3.5
   */
  describe('Property 11: Valid Deep Link Navigation', () => {
    it('任意の有効なトークンに対して、正しいタスク詳細ページへナビゲートする', () => {
      fc.assert(
        fc.asyncProperty(
          validTokenArbitrary,
          taskIdArbitrary,
          userIdArbitrary,
          async (token, taskId, userId) => {
            // Setup: トークンをURLパラメータに設定
            mockSearchParams.set('token', token);

            // Setup: APIモックを設定
            const validResult: deepLinkApi.DeepLinkValidationResult = {
              valid: true,
              taskId,
              userId,
            };
            vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue(validResult);

            // Execute: コンポーネントをレンダリング
            renderComponent();

            // Verify: 正しいタスクIDでナビゲーションが実行される
            await waitFor(() => {
              expect(mockNavigate).toHaveBeenCalledWith(`/tasks/${taskId}`, { replace: true });
            });

            // Verify: ナビゲーション先が正しいパスである
            const navigationCall = mockNavigate.mock.calls.find(call =>
              call[0]?.toString().startsWith('/tasks/')
            );
            expect(navigationCall).toBeDefined();
            expect(navigationCall![0]).toBe(`/tasks/${taskId}`);
            expect(navigationCall![1]).toEqual({ replace: true });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意の有効なトークンに対して、ナビゲーションはreplace: trueで実行される', () => {
      fc.assert(
        fc.asyncProperty(
          validTokenArbitrary,
          validDeepLinkResultArbitrary,
          async (token, validResult) => {
            // Setup: トークンをURLパラメータに設定
            mockSearchParams.set('token', token);

            // Setup: APIモックを設定
            vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue(validResult);

            // Execute: コンポーネントをレンダリング
            renderComponent();

            // Verify: ナビゲーションがreplace: trueで実行される
            await waitFor(() => {
              expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/tasks/'), {
                replace: true,
              });
            });

            // Verify: ナビゲーションオプションが正しい
            const navigationCall = mockNavigate.mock.calls.find(call =>
              call[0]?.toString().startsWith('/tasks/')
            );
            expect(navigationCall).toBeDefined();
            expect(navigationCall![1]).toEqual({ replace: true });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意の無効なトークンに対して、タスク詳細ページへのナビゲーションは実行されない', () => {
      fc.assert(
        fc.asyncProperty(
          validTokenArbitrary,
          invalidDeepLinkResultArbitrary,
          async (token, invalidResult) => {
            // Setup: トークンをURLパラメータに設定
            mockSearchParams.set('token', token);

            // Setup: APIモックを設定
            vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue(invalidResult);

            // Execute: コンポーネントをレンダリング
            renderComponent();

            // Verify: トークン検証APIが呼ばれる
            await waitFor(() => {
              expect(deepLinkApi.validateDeepLinkToken).toHaveBeenCalledWith(token);
            });

            // Verify: タスク詳細ページへのナビゲーションは実行されない
            await waitFor(
              () => {
                const taskNavigationCalls = mockNavigate.mock.calls.filter(call =>
                  call[0]?.toString().startsWith('/tasks/')
                );
                expect(taskNavigationCalls.length).toBe(0);
              },
              { timeout: 1000 }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ナビゲーション先のパスが常に/tasks/{taskId}の形式である', () => {
      fc.assert(
        fc.asyncProperty(
          validTokenArbitrary,
          taskIdArbitrary,
          userIdArbitrary,
          async (token, taskId, userId) => {
            // Setup: トークンをURLパラメータに設定
            mockSearchParams.set('token', token);

            // Setup: APIモックを設定
            const validResult: deepLinkApi.DeepLinkValidationResult = {
              valid: true,
              taskId,
              userId,
            };
            vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue(validResult);

            // Execute: コンポーネントをレンダリング
            renderComponent();

            // Verify: ナビゲーション先のパスが正しい形式である
            await waitFor(() => {
              const navigationCall = mockNavigate.mock.calls.find(call =>
                call[0]?.toString().startsWith('/tasks/')
              );
              expect(navigationCall).toBeDefined();

              const path = navigationCall![0] as string;
              // パスが/tasks/{uuid}の形式であることを確認
              const pathRegex =
                /^\/tasks\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              expect(pathRegex.test(path)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
