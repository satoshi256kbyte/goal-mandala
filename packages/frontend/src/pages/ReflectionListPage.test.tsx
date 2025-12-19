import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReflectionListPage from './ReflectionListPage';

// Mock useReflectionsByGoal
const mockReflections = [
  {
    id: 'reflection-1',
    goalId: 'goal-1',
    summary: 'テスト振り返り1',
    regretfulActions: 'アクション1',
    slowProgressActions: 'アクション2',
    untouchedActions: 'アクション3',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'reflection-2',
    goalId: 'goal-1',
    summary: 'テスト振り返り2',
    regretfulActions: null,
    slowProgressActions: null,
    untouchedActions: null,
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: '2025-01-14T10:00:00Z',
  },
];

const mockUseReflectionsByGoal = vi.fn(() => ({
  data: mockReflections,
  isLoading: false,
  error: null,
}));

vi.mock('../hooks/useReflections', () => ({
  useReflectionsByGoal: () => mockUseReflectionsByGoal(),
}));

// Mock ReflectionList component
vi.mock('../components/reflection/ReflectionList', () => ({
  ReflectionList: ({ goalId, onSelectReflection }: any) => (
    <div data-testid="reflection-list">
      <div>Goal ID: {goalId}</div>
      {mockReflections.map(reflection => (
        <div key={reflection.id} data-testid={`reflection-${reflection.id}`}>
          <button onClick={() => onSelectReflection(reflection.id)}>{reflection.summary}</button>
        </div>
      ))}
    </div>
  ),
}));

describe('ReflectionListPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockUseReflectionsByGoal.mockReturnValue({
      data: mockReflections,
      isLoading: false,
      error: null,
    });
  });

  const renderWithProviders = (initialRoute = '/mandala/goal-1/reflections') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/mandala/:goalId/reflections" element={<ReflectionListPage />} />
            <Route
              path="/mandala/:goalId/reflections/:reflectionId"
              element={<div>Reflection Detail</div>}
            />
            <Route path="/mandala/:goalId/reflections/new" element={<div>Create Reflection</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('振り返り一覧表示', () => {
    it('振り返り一覧が正しく表示される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
        expect(screen.getByTestId('reflection-list')).toBeInTheDocument();
      });
    });

    it('目標IDが正しく渡される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Goal ID: goal-1')).toBeInTheDocument();
      });
    });

    it('新規作成ボタンが表示される', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('新規作成')).toBeInTheDocument();
      });
    });
  });

  describe('振り返り選択', () => {
    it('振り返りを選択すると詳細画面に遷移する', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('テスト振り返り1')).toBeInTheDocument();
      });

      const reflectionButton = screen.getByText('テスト振り返り1');
      await userEvent.click(reflectionButton);

      await waitFor(() => {
        expect(screen.getByText('Reflection Detail')).toBeInTheDocument();
      });
    });
  });

  describe('新規作成', () => {
    it('新規作成ボタンをクリックすると作成画面に遷移する', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('新規作成')).toBeInTheDocument();
      });

      const createButton = screen.getByText('新規作成');
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Reflection')).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it.skip('目標IDが指定されていない場合、エラーメッセージが表示される', async () => {
      // Note: このテストはルートがマッチしないため、実際のアプリケーションでは発生しない状況
      // React Routerの仕様上、空のパラメータはルートにマッチしない
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/mandala//reflections']}>
            <Routes>
              <Route path="/mandala/:goalId/reflections" element={<ReflectionListPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('目標IDが指定されていません。')).toBeInTheDocument();
      });
    });
  });

  describe('エッジケース', () => {
    it('ローディング状態でもページが正しく表示される', () => {
      mockUseReflectionsByGoal.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders();

      // ローディング状態でもページタイトルと新規作成ボタンは表示される
      expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
      expect(screen.getByText('新規作成')).toBeInTheDocument();
    });

    it('エラー状態でもページが正しく表示される', async () => {
      mockUseReflectionsByGoal.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch reflections'),
      });

      renderWithProviders();

      await waitFor(() => {
        // エラー状態でもページタイトルと新規作成ボタンは表示される
        expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
        expect(screen.getByText('新規作成')).toBeInTheDocument();
      });
    });

    it('空データ状態でもページが正しく表示される', async () => {
      mockUseReflectionsByGoal.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        // 空データ状態でもページタイトルと新規作成ボタンは表示される
        expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
        expect(screen.getByText('新規作成')).toBeInTheDocument();
      });
    });

    it('大量の振り返り（100件）でもページが正しく表示される', async () => {
      const largeReflections = Array.from({ length: 100 }, (_, i) => ({
        id: `reflection-${i + 1}`,
        goalId: 'goal-1',
        summary: `テスト振り返り${i + 1}`,
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(2025, 0, i + 1).toISOString(),
        updatedAt: new Date(2025, 0, i + 1).toISOString(),
      }));

      mockUseReflectionsByGoal.mockReturnValue({
        data: largeReflections,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        // 大量データでもページタイトルと新規作成ボタンは表示される
        expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
        expect(screen.getByText('新規作成')).toBeInTheDocument();
        // ReflectionListコンポーネントが表示される
        expect(screen.getByTestId('reflection-list')).toBeInTheDocument();
      });
    });

    it('振り返りのサマリーが非常に長い場合でもページが正しく表示される', async () => {
      const longSummary = 'これは非常に長いサマリーです。'.repeat(50);
      const reflectionWithLongSummary = [
        {
          id: 'reflection-1',
          goalId: 'goal-1',
          summary: longSummary,
          regretfulActions: null,
          slowProgressActions: null,
          untouchedActions: null,
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-01-15T10:00:00Z',
        },
      ];

      mockUseReflectionsByGoal.mockReturnValue({
        data: reflectionWithLongSummary,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        // 長いサマリーでもページタイトルと新規作成ボタンは表示される
        expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
        expect(screen.getByText('新規作成')).toBeInTheDocument();
        // ReflectionListコンポーネントが表示される
        expect(screen.getByTestId('reflection-list')).toBeInTheDocument();
      });
    });

    it('ローディング中に新規作成ボタンをクリックしてもエラーが発生しない', async () => {
      mockUseReflectionsByGoal.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders();

      const createButton = screen.getByText('新規作成');
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Reflection')).toBeInTheDocument();
      });
    });

    it('エラー状態で新規作成ボタンをクリックしてもエラーが発生しない', async () => {
      mockUseReflectionsByGoal.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch reflections'),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
      });

      const createButton = screen.getByText('新規作成');
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Reflection')).toBeInTheDocument();
      });
    });
  });
});
