import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GoalInputPage } from './GoalInputPage';
import { GoalFormService } from '../services/goalFormService';
import { useAuth } from '../components/auth/AuthProvider';

// useNavigateのモック関数を作成
const mockNavigate = vi.fn();

// モック設定
vi.mock('../services/goalFormService');
vi.mock('../components/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// テスト用のモックデータ
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'テストユーザー',
  profileComplete: true,
};

const mockDraftData = {
  title: '下書きタイトル',
  description: '下書き説明',
  deadline: '2024-12-31',
  background: '下書き背景',
  constraints: '下書き制約',
};

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('GoalInputPage', () => {
  const mockUseAuth = vi.mocked(useAuth);
  const mockGoalFormService = vi.mocked(GoalFormService);

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // デフォルトの認証状態
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    // GoalFormService のモック
    mockGoalFormService.getDraft.mockResolvedValue({
      draftData: null,
      savedAt: null,
      message: '下書きはありません',
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('認証状態の処理', () => {
    it('認証チェック中はローディング画面を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      } as any);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument();
    });

    it('未認証の場合はリダイレクト画面を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(screen.getByText('ログインページに移動しています...')).toBeInTheDocument();
    });

    it('認証済みの場合はページを表示する', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(await screen.findByText('新しい目標を作成')).toBeInTheDocument();
    });
  });

  describe('ページの初期化', () => {
    it('下書きデータがない場合は空のフォームを表示する', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      const titleInput = await screen.findByLabelText(/目標タイトル/);
      expect(titleInput).toHaveValue('');
    });

    it('下書きデータがある場合は復元メッセージを表示する', async () => {
      mockGoalFormService.getDraft.mockResolvedValue({
        draftData: mockDraftData,
        savedAt: '2024-01-01T10:00:00Z',
        message: '下書きが復元されました',
      });

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(await screen.findByText('下書きが復元されました')).toBeInTheDocument();
    });
  });

  describe('ヘッダーの表示', () => {
    it('ページタイトルが表示される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(await screen.findByText('新しい目標を作成')).toBeInTheDocument();
    });

    it('ユーザー名が表示される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(await screen.findByText('テストユーザー')).toBeInTheDocument();
    });
  });

  describe('タイマー機能', () => {
    it('成功メッセージは3秒後に自動で消える', async () => {
      vi.useFakeTimers();

      mockGoalFormService.getDraft.mockResolvedValue({
        draftData: mockDraftData,
        savedAt: '2024-01-01T10:00:00Z',
        message: '下書きが復元されました',
      });

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await vi.waitFor(() => {
        expect(screen.getByText('下書きが復元されました')).toBeInTheDocument();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('下書きが復元されました')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(await screen.findByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
