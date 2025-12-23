import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReflectionCreatePage from './ReflectionCreatePage';

// Mock useCreateReflection
const mockMutateAsync = vi.fn();
const mockCreateReflection = {
  mutateAsync: mockMutateAsync,
  isPending: false,
  isError: false,
};

vi.mock('../hooks/useReflections', () => ({
  useCreateReflection: vi.fn(() => mockCreateReflection),
}));

// Mock ReflectionForm component
vi.mock('../components/reflection/ReflectionForm', () => ({
  ReflectionForm: ({ onSubmit, onCancel, isSubmitting }: any) => (
    <form
      data-testid="reflection-form"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          summary: 'テスト総括',
          regretfulActions: 'テスト惜しかったアクション',
          slowProgressActions: 'テスト進まなかったアクション',
          untouchedActions: 'テスト未着手アクション',
        });
      }}
    >
      <button type="submit" disabled={isSubmitting}>
        保存
      </button>
      <button type="button" onClick={onCancel}>
        キャンセル
      </button>
    </form>
  ),
}));

describe('ReflectionCreatePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockCreateReflection.isPending = false;
    mockCreateReflection.isError = false;
    mockMutateAsync.mockResolvedValue({});
  });

  const renderWithProviders = (initialRoute = '/mandala/goal-1/reflections/new') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/mandala/:goalId/reflections/new" element={<ReflectionCreatePage />} />
            <Route path="/mandala/:goalId/reflections" element={<div>Reflection List</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('振り返り作成画面の表示', () => {
    it('振り返り作成画面が正しく表示される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('振り返りを作成')).toBeInTheDocument();
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });
    });

    it('説明文が表示される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('目標達成に向けた振り返りを記録しましょう。')).toBeInTheDocument();
      });
    });
  });

  describe('振り返りの作成', () => {
    it('フォームを送信すると振り返りが作成される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('保存');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          goalId: 'goal-1',
          summary: 'テスト総括',
          regretfulActions: 'テスト惜しかったアクション',
          slowProgressActions: 'テスト進まなかったアクション',
          untouchedActions: 'テスト未着手アクション',
        });
      });
    });

    it('作成成功後、一覧画面に遷移する', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('保存');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Reflection List')).toBeInTheDocument();
      });
    });

    it('作成中は送信ボタンが無効化される', async () => {
      mockCreateReflection.isPending = true;
      renderWithProviders();

      await waitFor(() => {
        const submitButton = screen.getByText('保存');
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンをクリックすると一覧画面に戻る', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('キャンセル');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Reflection List')).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it.skip('目標IDが指定されていない場合、エラーメッセージが表示される', async () => {
      // Note: このテストはルートがマッチしないため、実際のアプリケーションでは発生しない状況
      // React Routerの仕様上、空のパラメータはルートにマッチしない
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/mandala//reflections/new']}>
            <Routes>
              <Route path="/mandala/:goalId/reflections/new" element={<ReflectionCreatePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('目標IDが指定されていません。')).toBeInTheDocument();
      });
    });

    it('作成失敗時、エラーメッセージが表示される', async () => {
      mockCreateReflection.isError = true;
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByText('振り返りの作成に失敗しました。もう一度お試しください。')
        ).toBeInTheDocument();
      });
    });
  });
});
