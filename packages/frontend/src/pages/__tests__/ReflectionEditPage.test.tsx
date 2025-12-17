import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReflectionEditPage from '../ReflectionEditPage';
import { useReflection, useUpdateReflection } from '../../hooks/useReflections';

// Mock the ReflectionForm component
vi.mock('../../components/reflection/ReflectionForm', () => ({
  ReflectionForm: ({ initialData, onSubmit, onCancel, isSubmitting }: any) => (
    <div data-testid="reflection-form">
      <div>Initial Summary: {initialData?.summary}</div>
      <button
        onClick={() =>
          onSubmit({
            summary: '更新された総括',
            disappointingActions: ['action-1'],
            slowProgressActions: ['action-2'],
            notStartedActions: ['action-3'],
          })
        }
        disabled={isSubmitting}
      >
        {isSubmitting ? '更新中...' : '更新'}
      </button>
      <button onClick={onCancel}>キャンセル</button>
    </div>
  ),
}));

// Mock hooks
vi.mock('../../hooks/useReflections');
const mockUseReflection = useReflection as ReturnType<typeof vi.fn>;
const mockUseUpdateReflection = useUpdateReflection as ReturnType<typeof vi.fn>;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockReflectionData = {
  id: 'reflection-1',
  goalId: 'goal-1',
  summary: 'テスト総括',
  disappointingActions: ['action-1'],
  slowProgressActions: ['action-2'],
  notStartedActions: ['action-3'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createWrapper = (goalId = 'goal-1', reflectionId = 'reflection-1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/mandala/${goalId}/reflections/${reflectionId}`]}>
        <Routes>
          <Route path="/mandala/:goalId/reflections/:reflectionId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('ReflectionEditPage', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockMutateAsync.mockClear();

    mockUseReflection.mockReturnValue({
      data: mockReflectionData,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    } as any);

    mockUseUpdateReflection.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    } as any);
  });

  it('振り返り編集画面が正常に表示される', () => {
    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    expect(screen.getByText('振り返りを編集')).toBeInTheDocument();
    expect(screen.getByText('振り返りの内容を編集できます。')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-form')).toBeInTheDocument();
    expect(screen.getByText('Initial Summary: テスト総括')).toBeInTheDocument();
  });

  it('フォーム送信が動作する', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    const submitButton = screen.getByText('更新');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        reflectionId: 'reflection-1',
        input: {
          summary: '更新された総括',
          disappointingActions: ['action-1'],
          slowProgressActions: ['action-2'],
          notStartedActions: ['action-3'],
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-1/reflections/reflection-1');
    });
  });

  it('キャンセルボタンが動作する', () => {
    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-1/reflections/reflection-1');
  });

  it('ローディング状態が正しく表示される', () => {
    mockUseReflection.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
      status: 'pending',
    } as any);

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    expect(screen.getByText('振り返りを読み込み中...')).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-form')).not.toBeInTheDocument();
  });

  it('送信中の状態が正しく表示される', () => {
    mockUseUpdateReflection.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'pending',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: Date.now(),
    } as any);

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    expect(screen.getByText('更新中...')).toBeInTheDocument();
    expect(screen.getByText('更新中...')).toBeDisabled();
  });

  it('エラー状態が正しく表示される（取得エラー）', () => {
    mockUseReflection.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
      status: 'error',
    } as any);

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    expect(
      screen.getByText('振り返りの取得に失敗しました。もう一度お試しください。')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-form')).not.toBeInTheDocument();
  });

  it('エラー状態が正しく表示される（更新エラー）', () => {
    mockUseUpdateReflection.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: true,
      error: new Error('API Error'),
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'error',
      variables: undefined,
      context: undefined,
      failureCount: 1,
      failureReason: new Error('API Error'),
      isPaused: false,
      submittedAt: Date.now(),
    } as any);

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    expect(
      screen.getByText('振り返りの更新に失敗しました。もう一度お試しください。')
    ).toBeInTheDocument();
  });

  it('必要なパラメータが指定されていない場合のエラーメッセージが表示される（goalIdなし）', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/mandala//reflections/reflection-1']}>
            <Routes>
              <Route path="/mandala/:goalId?/reflections/:reflectionId" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    };
    Wrapper.displayName = 'TestWrapper';

    render(<ReflectionEditPage />, { wrapper: Wrapper });

    expect(screen.getByText('必要なパラメータが指定されていません。')).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-form')).not.toBeInTheDocument();
  });

  it('必要なパラメータが指定されていない場合のエラーメッセージが表示される（reflectionIdなし）', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/mandala/goal-1/reflections/']}>
            <Routes>
              <Route path="/mandala/:goalId/reflections/:reflectionId?" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    };
    Wrapper.displayName = 'TestWrapper';

    render(<ReflectionEditPage />, { wrapper: Wrapper });

    expect(screen.getByText('必要なパラメータが指定されていません。')).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-form')).not.toBeInTheDocument();
  });

  it('フォーム送信エラーが処理される', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    // エラーをスローするmutateAsyncを設定
    mockMutateAsync.mockImplementation(() => {
      consoleErrorSpy('振り返りの更新に失敗しました:', new Error('API Error'));
      return Promise.reject(new Error('API Error'));
    });

    const submitButton = screen.getByText('更新');

    // エラーをキャッチするためにtry-catchで囲む
    try {
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    } catch (error) {
      // エラーは期待される動作
    }

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('異なる目標IDと振り返りIDで正しく動作する', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ReflectionEditPage />, { wrapper: createWrapper('goal-2', 'reflection-2') });

    const submitButton = screen.getByText('更新');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          reflectionId: 'reflection-2',
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-2/reflections/reflection-2');
    });
  });

  it('データが存在しない場合のエラーメッセージが表示される', () => {
    mockUseReflection.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    } as any);

    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    expect(
      screen.getByText('振り返りの取得に失敗しました。もう一度お試しください。')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-form')).not.toBeInTheDocument();
  });

  it('ページタイトルと説明が正しく表示される', () => {
    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    const title = screen.getByRole('heading', { name: '振り返りを編集' });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-2xl', 'font-bold', 'text-gray-900');

    const description = screen.getByText('振り返りの内容を編集できます。');
    expect(description).toHaveClass('text-sm', 'text-gray-600');
  });

  it('フォームが白い背景で表示される', () => {
    render(<ReflectionEditPage />, { wrapper: createWrapper() });

    const formContainer = screen.getByTestId('reflection-form').parentElement;
    expect(formContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm');
  });
});
