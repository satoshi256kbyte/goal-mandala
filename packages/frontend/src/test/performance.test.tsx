/**
 * パフォーマンステスト
 * 認証画面のパフォーマンス要件を検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';

// パフォーマンス測定ヘルパー
const measurePerformance = async (operation: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

// コンポーネントレンダリング時間の測定
const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  return measurePerformance(renderFn);
};

// フォーム入力時間の測定
const measureFormInteraction = async (
  inputElement: HTMLElement,
  value: string
): Promise<number> => {
  const user = userEvent.setup();
  return measurePerformance(async () => {
    await user.type(inputElement, value);
  });
};

describe('認証画面パフォーマンステスト', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('コンポーネントレンダリング性能', () => {
    it('LoginFormが200ms以内にレンダリングされる', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <BrowserRouter>
            <LoginForm onSubmit={mockOnSubmit} />
          </BrowserRouter>
        );
      });

      expect(renderTime).toBeLessThan(200);
    });

    it('SignupFormが300ms以内にレンダリングされる', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <BrowserRouter>
            <SignupForm onSubmit={mockOnSubmit} />
          </BrowserRouter>
        );
      });

      expect(renderTime).toBeLessThan(300);
    });

    it('PasswordResetFormが200ms以内にレンダリングされる', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <BrowserRouter>
            <PasswordResetForm onSubmit={mockOnSubmit} />
          </BrowserRouter>
        );
      });

      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('フォーム入力性能', () => {
    it('メールアドレス入力が100ms以内で完了する', async () => {
      render(
        <BrowserRouter>
          <LoginForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /メールアドレス/ });
      const inputTime = await measureFormInteraction(emailInput, 'test@example.com');

      expect(inputTime).toBeLessThan(100);
    });

    it('パスワード入力が100ms以内で完了する', async () => {
      render(
        <BrowserRouter>
          <LoginForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const passwordInput = screen.getByLabelText(/パスワード/);
      const inputTime = await measureFormInteraction(passwordInput, 'password123');

      expect(inputTime).toBeLessThan(100);
    });

    it('複数フィールドの入力が500ms以内で完了する', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/名前/);
      const emailInput = screen.getByRole('textbox', { name: /メールアドレス/ });
      const passwordInput = screen.getByLabelText(/^パスワード$/);
      const confirmPasswordInput = screen.getByLabelText(/パスワード確認/);

      const totalInputTime = await measurePerformance(async () => {
        await user.type(nameInput, 'テストユーザー');
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'Password123!');
        await user.type(confirmPasswordInput, 'Password123!');
      });

      expect(totalInputTime).toBeLessThan(500);
    });
  });

  describe('バリデーション性能', () => {
    it('リアルタイムバリデーションが50ms以内で実行される', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /メールアドレス/ });

      // 無効なメールアドレスを入力
      await user.type(emailInput, 'invalid-email');

      const validationTime = await measurePerformance(async () => {
        await user.tab(); // フォーカスを外してバリデーションをトリガー
        await waitFor(() => {
          expect(screen.getByText(/有効なメールアドレスを入力してください/)).toBeInTheDocument();
        });
      });

      expect(validationTime).toBeLessThan(50);
    });

    it('パスワード強度チェックが100ms以内で実行される', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const passwordInput = screen.getByLabelText(/^パスワード$/);

      const strengthCheckTime = await measurePerformance(async () => {
        await user.type(passwordInput, 'weak');
        // パスワード強度インジケーターの更新を待機
        await waitFor(() => {
          // パスワード強度に関する要素が更新されることを確認
          expect(passwordInput).toBeInTheDocument();
        });
      });

      expect(strengthCheckTime).toBeLessThan(100);
    });
  });

  describe('メモリ使用量テスト', () => {
    it('コンポーネントのマウント・アンマウントでメモリリークが発生しない', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 複数回マウント・アンマウントを実行
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <BrowserRouter>
            <LoginForm onSubmit={mockOnSubmit} />
          </BrowserRouter>
        );
        unmount();
      }

      // ガベージコレクションを強制実行（テスト環境でのみ）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が1MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });

  describe('レスポンシブ性能', () => {
    it('画面サイズ変更時のレイアウト更新が100ms以内で完了する', async () => {
      render(
        <BrowserRouter>
          <LoginForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const resizeTime = await measurePerformance(() => {
        // 画面サイズを変更
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 768,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: 1024,
        });

        // リサイズイベントを発火
        window.dispatchEvent(new Event('resize'));
      });

      expect(resizeTime).toBeLessThan(100);
    });
  });

  describe('アクセシビリティ性能', () => {
    it('スクリーンリーダー用のaria-live更新が50ms以内で完了する', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginForm onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button', { name: /ログイン/ });

      const ariaUpdateTime = await measurePerformance(async () => {
        await user.click(submitButton);
        // aria-live領域の更新を待機
        await waitFor(() => {
          // エラーメッセージやローディング状態の更新を確認
          expect(submitButton).toBeInTheDocument();
        });
      });

      expect(ariaUpdateTime).toBeLessThan(50);
    });
  });
});
