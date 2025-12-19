import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReflectionDetail } from '../ReflectionDetail';
import { renderWithProviders } from '../../../test/test-utils';

// モック
vi.mock('../../../hooks/useReflections', () => ({
  useReflection: vi.fn(),
  useDeleteReflection: vi.fn(),
}));

import { useReflection, useDeleteReflection } from '../../../hooks/useReflections';

describe('ReflectionDetail', () => {
  const mockReflection = {
    id: 'reflection-1',
    goalId: 'goal-1',
    summary: 'テスト総括',
    regretfulActions: '惜しかったアクション',
    slowProgressActions: '進まなかったアクション',
    untouchedActions: '未着手アクション',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  const mockOnEdit = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReflection).mockReturnValue({
      data: mockReflection,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useDeleteReflection).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as any);
  });

  describe('基本機能', () => {
    it('振り返り詳細を表示する', () => {
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByText('テスト総括')).toBeInTheDocument();
      expect(screen.getByText('惜しかったアクション')).toBeInTheDocument();
      expect(screen.getByText('進まなかったアクション')).toBeInTheDocument();
      expect(screen.getByText('未着手アクション')).toBeInTheDocument();
    });

    it('戻るボタンを表示する', () => {
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByRole('button', { name: /戻る/i })).toBeInTheDocument();
    });

    it('編集ボタンを表示する', () => {
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    });

    it('削除ボタンを表示する', () => {
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスピナーを表示する', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByText('振り返りを読み込み中...')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('エラー時はエラーメッセージを表示する', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(
        screen.getByText('振り返りの取得に失敗しました。もう一度お試しください。')
      ).toBeInTheDocument();
    });

    it('振り返りが見つからない場合はメッセージを表示する', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByText('振り返りが見つかりませんでした。')).toBeInTheDocument();
    });
  });

  describe('ユーザーインタラクション', () => {
    it('戻るボタンをクリックするとonBackが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      await user.click(screen.getByRole('button', { name: /戻る/i }));

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('編集ボタンをクリックするとonEditが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      await user.click(screen.getByRole('button', { name: '編集' }));

      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('削除ボタンをクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      await user.click(screen.getByRole('button', { name: '削除' }));

      await waitFor(() => {
        expect(screen.getByText('振り返りを削除')).toBeInTheDocument();
      });
    });
  });

  describe('削除機能', () => {
    it('削除確認ダイアログでキャンセルするとダイアログが閉じる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      await user.click(screen.getByRole('button', { name: '削除' }));

      await waitFor(() => {
        expect(screen.getByText('振り返りを削除')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(screen.queryByText('振り返りを削除')).not.toBeInTheDocument();
      });
    });

    it('削除確認ダイアログで削除を実行するとonDeletedが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useDeleteReflection).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      await user.click(screen.getByRole('button', { name: '削除' }));

      await waitFor(() => {
        expect(screen.getByText('振り返りを削除')).toBeInTheDocument();
      });

      await user.click(screen.getAllByRole('button', { name: '削除' })[1]);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('reflection-1');
        expect(mockOnDeleted).toHaveBeenCalled();
      });
    });
  });

  describe('日時表示', () => {
    it('作成日時を表示する', () => {
      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByText(/作成日時:/)).toBeInTheDocument();
    });

    it('更新日時が作成日時と異なる場合は更新日時を表示する', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: {
          ...mockReflection,
          updatedAt: '2024-01-16T10:00:00Z',
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.getByText(/更新日時:/)).toBeInTheDocument();
    });
  });

  describe('オプション項目の表示', () => {
    it('惜しかったアクションがない場合は表示しない', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: {
          ...mockReflection,
          regretfulActions: null,
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.queryByText('惜しかったアクション（進捗80%以上）')).not.toBeInTheDocument();
    });

    it('進まなかったアクションがない場合は表示しない', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: {
          ...mockReflection,
          slowProgressActions: null,
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(
        screen.queryByText('思ったより進まなかったアクション（進捗20%以下）')
      ).not.toBeInTheDocument();
    });

    it('未着手アクションがない場合は表示しない', () => {
      vi.mocked(useReflection).mockReturnValue({
        data: {
          ...mockReflection,
          untouchedActions: null,
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ReflectionDetail
          reflectionId="reflection-1"
          onEdit={mockOnEdit}
          onBack={mockOnBack}
          onDeleted={mockOnDeleted}
        />
      );

      expect(screen.queryByText('未着手となったアクション（進捗0%）')).not.toBeInTheDocument();
    });
  });
});
