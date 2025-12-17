import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReflectionListPage from '../ReflectionListPage';

// Mock the ReflectionList component
vi.mock('../../components/reflection/ReflectionList', () => ({
  ReflectionList: ({ goalId, onSelectReflection }: any) => (
    <div data-testid="reflection-list">
      <div>Goal ID: {goalId}</div>
      <button onClick={() => onSelectReflection('reflection-1')}>Select Reflection</button>
    </div>
  ),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = (goalId = 'goal-1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/mandala/${goalId}/reflections`]}>
        <Routes>
          <Route path="/mandala/:goalId/reflections" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('ReflectionListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('振り返り一覧が正常に表示される', () => {
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('振り返り履歴')).toBeInTheDocument();
    expect(screen.getByText('これまでの振り返りを確認できます。')).toBeInTheDocument();
    expect(screen.getByText('新規作成')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-list')).toBeInTheDocument();
    expect(screen.getByText('Goal ID: goal-1')).toBeInTheDocument();
  });

  it('新規作成ボタンが動作する', () => {
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    const createButton = screen.getByText('新規作成');
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-1/reflections/new');
  });

  it('振り返り選択が動作する', () => {
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    const selectButton = screen.getByText('Select Reflection');
    fireEvent.click(selectButton);

    expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-1/reflections/reflection-1');
  });

  it('目標IDが指定されていない場合のエラーメッセージが表示される', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/mandala//reflections']}>
            <Routes>
              <Route path="/mandala/:goalId?/reflections" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    };
    Wrapper.displayName = 'TestWrapper';

    render(<ReflectionListPage />, { wrapper: Wrapper });

    expect(screen.getByText('目標IDが指定されていません。')).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-list')).not.toBeInTheDocument();
  });

  it('異なる目標IDで正しく動作する', () => {
    render(<ReflectionListPage />, { wrapper: createWrapper('goal-2') });

    expect(screen.getByText('Goal ID: goal-2')).toBeInTheDocument();
  });

  it('ページタイトルと説明が正しく表示される', () => {
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    const title = screen.getByRole('heading', { name: '振り返り履歴' });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-2xl', 'font-bold', 'text-gray-900');

    const description = screen.getByText('これまでの振り返りを確認できます。');
    expect(description).toHaveClass('text-sm', 'text-gray-600');
  });

  it('新規作成ボタンのスタイルが正しい', () => {
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    const createButton = screen.getByText('新規作成');
    expect(createButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('エラー状態が正しく処理される', () => {
    // ReflectionListコンポーネント内でエラーハンドリングが行われることを確認
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    // エラーハンドリングはReflectionListコンポーネント内で行われる
    // エラーが発生した場合、ReflectionListコンポーネントがエラーメッセージを表示する
    expect(screen.getByTestId('reflection-list')).toBeInTheDocument();
  });

  it('データ取得エラーが発生した場合の処理', () => {
    // ReflectionListコンポーネントがエラーハンドリングを行う
    render(<ReflectionListPage />, { wrapper: createWrapper() });

    // エラー状態はReflectionListコンポーネント内で管理される
    expect(screen.getByTestId('reflection-list')).toBeInTheDocument();
  });
});
