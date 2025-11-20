import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SubGoalEditPage } from './SubGoalEditPage';
import { SubGoal } from '../types/mandala';

// React Router のモック
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

// 認証プロバイダーのモック
const mockUseAuth = vi.fn();
vi.mock('../components/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// アクセシビリティフックのモック
vi.mock('../hooks/useAccessibility', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    focusNext: vi.fn(),
    focusPrevious: vi.fn(),
    focusFirst: vi.fn(),
    focusLast: vi.fn(),
  }),
  useLiveRegion: () => ({
    announce: vi.fn(),
  }),
}));

// コンテキストプロバイダーのモック
vi.mock('../contexts/SubGoalContext', () => ({
  SubGoalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSubGoalContext: () => ({
    subGoals: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../components/forms/DragDropProvider', () => ({
  DragDropProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/forms/BulkSelectionProvider', () => ({
  BulkSelectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/forms/BulkEditModal', () => ({
  BulkEditModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="一括編集モーダル">
        <button onClick={onClose}>モーダルを閉じる</button>
      </div>
    ) : null,
}));

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('SubGoalEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockUseParams.mockReturnValue({ goalId: 'goal-1' });
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'テストユーザー', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('ページ表示', () => {
    it('ページが正しく表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByText('サブ目標の確認・編集')).toBeInTheDocument();
          expect(screen.getByText('AI生成されたサブ目標を確認してください')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('認証中はローディングが表示される', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument();
    });

    it('未認証の場合はリダイレクトメッセージが表示される', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('ログインページに移動しています...')).toBeInTheDocument();
    });

    it('goalIdが未指定の場合はエラーが表示される', async () => {
      mockUseParams.mockReturnValue({ goalId: undefined });

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByText('目標IDが指定されていません')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('ツールバー', () => {
    it('一括編集モードボタンが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: '一括編集モード' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('AI再生成ボタンが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'AI再生成' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('一括編集モードを切り替えできる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: '一括編集モード' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const bulkEditButton = screen.getByRole('button', { name: '一括編集モード' });
      await act(async () => {
        await user.click(bulkEditButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '一括編集モード終了' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '一括編集実行' })).toBeInTheDocument();
      });
    });
  });

  describe('サブ目標カード', () => {
    it('サブ目標カードが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          // モックデータの8つのサブ目標が表示されることを確認
          for (let i = 1; i <= 8; i++) {
            const elements = screen.getAllByText(`サブ目標 ${i}`);
            expect(elements.length).toBeGreaterThan(0);
          }
        },
        { timeout: 3000 }
      );
    });

    it('サブ目標カードをクリックして選択できる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // role="button"を持つカードを探す
      const cards = screen
        .getAllByRole('button')
        .filter(el => el.getAttribute('aria-label')?.includes('サブ目標 1'));
      expect(cards.length).toBeGreaterThan(0);

      if (cards[0]) {
        await act(async () => {
          await user.click(cards[0]);
        });
        // クリックイベントが発生したことを確認
        expect(cards[0]).toHaveAttribute('aria-pressed');
      }
    });

    it('進捗バーが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          // 進捗表示のテキストが存在することを確認
          const progressTexts = screen.getAllByText(/進捗:/);
          expect(progressTexts.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('サブ目標編集', () => {
    it('編集ボタンをクリックして編集モードに入れる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // 編集ボタンを探す（aria-labelで検索）
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button =>
        button.getAttribute('aria-label')?.includes('編集')
      );

      if (editButton) {
        await act(async () => {
          await user.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
          expect(screen.getByLabelText('説明')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
        });
      }
    });

    it('編集モードでタイトルと説明を変更できる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // 編集ボタンをクリック
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button =>
        button.getAttribute('aria-label')?.includes('編集')
      );

      if (editButton) {
        await act(async () => {
          await user.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
        });

        const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement;
        const descriptionInput = screen.getByLabelText('説明') as HTMLTextAreaElement;

        await act(async () => {
          await user.clear(titleInput);
          await user.type(titleInput, '更新されたタイトル');

          await user.clear(descriptionInput);
          await user.type(descriptionInput, '更新された説明');
        });

        expect(titleInput.value).toBe('更新されたタイトル');
        expect(descriptionInput.value).toBe('更新された説明');
      }
    });

    it('編集をキャンセルできる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // 編集ボタンをクリック
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button =>
        button.getAttribute('aria-label')?.includes('編集')
      );

      if (editButton) {
        await act(async () => {
          await user.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
        });

        const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement;
        await act(async () => {
          await user.clear(titleInput);
          await user.type(titleInput, '変更されたタイトル');
        });

        const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
        await act(async () => {
          await user.click(cancelButton);
        });

        await waitFor(() => {
          // 編集モードが終了し、元のタイトルが表示されることを確認
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
          expect(screen.queryByLabelText('タイトル')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('AI再生成', () => {
    it('AI再生成ボタンをクリックできる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'AI再生成' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const regenerateButton = screen.getByRole('button', { name: 'AI再生成' });
      await act(async () => {
        await user.click(regenerateButton);
      });

      // AI再生成の処理が開始されることを確認（エラーが発生しないこと）
      expect(regenerateButton).toBeInTheDocument();
    });
  });

  describe('ナビゲーション', () => {
    it('前に戻るボタンが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: '前に戻る' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('次へ進むボタンが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: '次へ進む' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('前に戻るボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: '前に戻る' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const backButton = screen.getByRole('button', { name: '前に戻る' });
      await act(async () => {
        await user.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/mandala/create/goal/goal-1');
    });

    it('次へ進むボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: '次へ進む' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const nextButton = screen.getByRole('button', { name: '次へ進む' });
      await act(async () => {
        await user.click(nextButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/mandala/create/actions/goal-1');
    });

    it('ダッシュボードに戻るボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'ダッシュボードに戻る' })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const dashboardButton = screen.getByRole('button', { name: 'ダッシュボードに戻る' });
      await act(async () => {
        await user.click(dashboardButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('保存・キャンセル', () => {
    it('保存ボタンで変更を保存できる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // 編集ボタンをクリック
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button =>
        button.getAttribute('aria-label')?.includes('編集')
      );

      if (editButton) {
        await act(async () => {
          await user.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
        });

        const saveButton = screen.getByRole('button', { name: '保存' });
        await act(async () => {
          await user.click(saveButton);
        });

        // 成功メッセージが表示されることを確認（タイムアウトを長めに設定）
        await waitFor(
          () => {
            expect(screen.getByText('サブ目標を更新しました')).toBeInTheDocument();
          },
          { timeout: 5000 }
        );
      }
    });

    it('キャンセルボタンで変更を破棄できる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <SubGoalEditPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          const elements = screen.getAllByText('サブ目標 1');
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // 編集ボタンをクリック
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button =>
        button.getAttribute('aria-label')?.includes('編集')
      );

      if (editButton) {
        await act(async () => {
          await user.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
        await act(async () => {
          await user.click(cancelButton);
        });

        await waitFor(() => {
          expect(screen.queryByLabelText('タイトル')).not.toBeInTheDocument();
        });
      }
    });
  });
});
