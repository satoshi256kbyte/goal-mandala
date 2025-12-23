import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReflectionList } from '../ReflectionList';
import { renderWithProviders } from '../../../test/test-utils';

// モック
vi.mock('../../../hooks/useReflections', () => ({
  useReflectionsByGoal: vi.fn(),
}));

import { useReflectionsByGoal } from '../../../hooks/useReflections';

describe('ReflectionList', () => {
  const mockReflections = [
    {
      id: 'reflection-1',
      goalId: 'goal-1',
      summary: 'テスト総括1',
      regretfulActions: '惜しかったアクション1',
      slowProgressActions: null,
      untouchedActions: null,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'reflection-2',
      goalId: 'goal-1',
      summary: 'テスト総括2',
      regretfulActions: null,
      slowProgressActions: '進まなかったアクション2',
      untouchedActions: '未着手アクション2',
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
    },
  ];

  const mockOnSelectReflection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReflectionsByGoal).mockReturnValue({
      data: mockReflections,
      isLoading: false,
      error: null,
    } as any);
  });

  describe('基本機能', () => {
    it('振り返り一覧を表示する', () => {
      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('テスト総括1')).toBeInTheDocument();
      expect(screen.getByText('テスト総括2')).toBeInTheDocument();
    });

    it('振り返りカードをクリックするとonSelectReflectionが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      await user.click(screen.getByText('テスト総括1'));

      expect(mockOnSelectReflection).toHaveBeenCalledWith('reflection-1');
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスピナーを表示する', () => {
      vi.mocked(useReflectionsByGoal).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('振り返りを読み込み中...')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('エラー時はエラーメッセージを表示する', () => {
      vi.mocked(useReflectionsByGoal).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any);

      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(
        screen.getByText('振り返りの取得に失敗しました。もう一度お試しください。')
      ).toBeInTheDocument();
    });
  });

  describe('空の状態', () => {
    it('振り返りがない場合は空の状態を表示する', () => {
      vi.mocked(useReflectionsByGoal).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('振り返りがありません')).toBeInTheDocument();
      expect(
        screen.getByText('最初の振り返りを作成して、目標達成の進捗を記録しましょう。')
      ).toBeInTheDocument();
    });

    it('振り返りがundefinedの場合は空の状態を表示する', () => {
      vi.mocked(useReflectionsByGoal).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('振り返りがありません')).toBeInTheDocument();
    });
  });

  describe('バッジ表示', () => {
    it('惜しかったアクションがある場合はバッジを表示する', () => {
      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('惜しかったアクション')).toBeInTheDocument();
    });

    it('進まなかったアクションがある場合はバッジを表示する', () => {
      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('進まなかったアクション')).toBeInTheDocument();
    });

    it('未着手アクションがある場合はバッジを表示する', () => {
      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('未着手アクション')).toBeInTheDocument();
    });
  });

  describe('日付表示', () => {
    it('作成日時を表示する', () => {
      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      // 日付フォーマットは実装に依存するため、年月日が含まれることを確認
      // 複数の振り返りがあるため、getAllByTextを使用
      const dates = screen.getAllByText(/2024/);
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  describe('テキスト切り詰め', () => {
    it('長い総括は切り詰めて表示する', () => {
      const longSummary = 'a'.repeat(200);
      vi.mocked(useReflectionsByGoal).mockReturnValue({
        data: [
          {
            ...mockReflections[0],
            summary: longSummary,
          },
        ],
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      // 150文字 + "..." で切り詰められる
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    });

    it('短い総括はそのまま表示する', () => {
      const shortSummary = 'テスト総括';
      vi.mocked(useReflectionsByGoal).mockReturnValue({
        data: [
          {
            ...mockReflections[0],
            summary: shortSummary,
          },
        ],
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionList goalId="goal-1" onSelectReflection={mockOnSelectReflection} />
      );

      expect(screen.getByText('テスト総括')).toBeInTheDocument();
    });
  });
});
