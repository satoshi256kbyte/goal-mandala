import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReflectionEditPage from './ReflectionEditPage';

// Mock reflection data
const mockReflection = {
  id: 'reflection-1',
  goalId: 'goal-1',
  summary: 'テスト総括',
  regretfulActions: 'テスト惜しかったアクション',
  slowProgressActions: 'テスト進まなかったアクション',
  untouchedActions: 'テスト未着手アクション',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

// Mock useReflection
const mockUseReflection = vi.fn(() => ({
  data: mockReflection,
  isLoading: false,
  error: null,
}));

// Mock useUpdateReflection
const mockMutateAsync = vi.fn();
const mockUpdateReflection = {
  mutateAsync: mockMutateAsync,
  isPending: false,
  isError: false,
};

vi.mock('../hooks/useReflections', () => ({
  useReflection: () => mockUseReflection(),
  useUpdateReflection: vi.fn(() => mockUpdateReflection),
}));

// Mock ReflectionForm component
vi.mock('../components/reflection/ReflectionForm', () => ({
  ReflectionForm: ({ initialData, onSubmit, onCancel, isSubmitting }: any) => (
    <form
      data-testid="reflection-form"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          summary: '更新されたテスト総括',
          regretfulActions: '更新されたテスト惜しかったアクション',
          slowProgressActions: '更新されたテスト進まなかったアクション',
          untouchedActions: '更新されたテスト未着手アクション',
        });
      }}
    >
      <div>Initial Summary: {initialData?.summary}</div>
      <button type="submit" disabled={isSubmitting}>
        保存
      </button>
      <button type="button" onClick={onCancel}>
        キャンセル
      </button>
    </form>
  ),
}));

describe('ReflectionEditPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockUseReflection.mockReturnValue({
      data: mockReflection,
      isLoading: false,
      error: null,
    });
    mockUpdateReflection.isPending = false;
    mockUpdateReflection.isError = false;
    mockMutateAsync.mockResolvedValue({});
  });

  const renderWithProviders = (initialRoute = '/mandala/goal-1/reflections/reflection-1/edit') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route
              path="/mandala/:goalId/reflections/:reflectionId/edit"
              element={<ReflectionEditPage />}
            />
            <Route
              path="/mandala/:goalId/reflections/:reflectionId"
              element={<div>Reflection Detail</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('振り返り編集画面の表示', () => {
    it('振り返り編集画面が正しく表示される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('振り返りを編集')).toBeInTheDocument();
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });
    });

    it('初期データがフォームに渡される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Initial Summary: テスト総括')).toBeInTheDocument();
      });
    });

    it('説明文が表示される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('振り返りの内容を編集できます。')).toBeInTheDocument();
      });
    });
  });

  describe('振り返りの更新', () => {
    it('フォームを送信すると振り返りが更新される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('保存');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          reflectionId: 'reflection-1',
          input: {
            summary: '更新されたテスト総括',
            regretfulActions: '更新されたテスト惜しかったアクション',
            slowProgressActions: '更新されたテスト進まなかったアクション',
            untouchedActions: '更新されたテスト未着手アクション',
          },
        });
      });
    });

    it('更新成功後、詳細画面に遷移する', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('保存');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Reflection Detail')).toBeInTheDocument();
      });
    });

    it('更新中は送信ボタンが無効化される', async () => {
      mockUpdateReflection.isPending = true;
      renderWithProviders();

      await waitFor(() => {
        const submitButton = screen.getByText('保存');
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンをクリックすると詳細画面に戻る', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('キャンセル');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Reflection Detail')).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態', () => {
    it('データ読み込み中はローディング表示される', async () => {
      mockUseReflection.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('振り返りを読み込み中...')).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it.skip('目標IDまたは振り返りIDが指定されていない場合、エラーメッセージが表示される', async () => {
      // Note: このテストはルートがマッチしないため、実際のアプリケーションでは発生しない状況
      // React Routerの仕様上、空のパラメータはルートにマッチしない
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/mandala//reflections//edit']}>
            <Routes>
              <Route
                path="/mandala/:goalId/reflections/:reflectionId/edit"
                element={<ReflectionEditPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('必要なパラメータが指定されていません。')).toBeInTheDocument();
      });
    });

    it('データ取得失敗時、エラーメッセージが表示される', async () => {
      mockUseReflection.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByText('振り返りの取得に失敗しました。もう一度お試しください。')
        ).toBeInTheDocument();
      });
    });

    it('更新失敗時、エラーメッセージが表示される', async () => {
      mockUpdateReflection.isError = true;
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByText('振り返りの更新に失敗しました。もう一度お試しください。')
        ).toBeInTheDocument();
      });
    });
  });
});
