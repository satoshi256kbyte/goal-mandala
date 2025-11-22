import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskDetailPage } from '../TaskDetailPage';
import { taskApi } from '../../services/taskApi';

// Mock the taskApi
jest.mock('../../services/taskApi');
const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;

// Mock components
jest.mock('../../components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

jest.mock('../../components/common/ErrorAlert', () => ({
  ErrorAlert: ({ message, onRetry }: any) => (
    <div data-testid="error-alert">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

const createWrapper = (taskId = 'task-1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tasks/${taskId}`]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('TaskDetailPage', () => {
  const mockTaskData = {
    task: {
      id: 'task-1',
      actionId: 'action-1',
      title: 'テストタスク',
      description: 'テスト用のタスクです',
      type: 'execution',
      status: 'not_started',
      estimatedMinutes: 30,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    notes: [
      {
        id: 'note-1',
        taskId: 'task-1',
        content: 'テストノート1',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      },
      {
        id: 'note-2',
        taskId: 'task-1',
        content: 'テストノート2',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      },
    ],
    history: [
      {
        id: 'history-1',
        taskId: 'task-1',
        oldStatus: 'not_started',
        newStatus: 'in_progress',
        changedAt: new Date(),
        userId: 'user-1',
      },
    ],
  };

  beforeEach(() => {
    mockTaskApi.getTaskById.mockResolvedValue(mockTaskData);
    mockTaskApi.updateTaskStatus.mockResolvedValue(mockTaskData.task);
    mockTaskApi.addNote.mockResolvedValue(mockTaskData.notes[0]);
    mockTaskApi.updateNote.mockResolvedValue(mockTaskData.notes[0]);
    mockTaskApi.deleteNote.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('タスク詳細が正常に表示される', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('テストタスク')).toBeInTheDocument();
      expect(screen.getByText('テスト用のタスクです')).toBeInTheDocument();
      expect(screen.getByText('未着手')).toBeInTheDocument();
      expect(screen.getByText('30分')).toBeInTheDocument();
      expect(screen.getByText('実行タスク')).toBeInTheDocument();
    });
  });

  it('ローディング状態が表示される', () => {
    mockTaskApi.getTaskById.mockImplementation(() => new Promise(() => {}));

    render(<TaskDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('エラー状態が表示される', async () => {
    mockTaskApi.getTaskById.mockRejectedValue(new Error('API Error'));

    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
  });

  it('タスク状態の更新が動作する', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('not_started')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('not_started');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    await waitFor(() => {
      expect(mockTaskApi.updateTaskStatus).toHaveBeenCalledWith('task-1', 'completed');
    });
  });

  it('ノートの表示が正常に動作する', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('テストノート1')).toBeInTheDocument();
      expect(screen.getByText('テストノート2')).toBeInTheDocument();
    });
  });

  it('ノートの追加が動作する', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('ノートを追加...')).toBeInTheDocument();
    });

    const noteInput = screen.getByPlaceholderText('ノートを追加...');
    const addButton = screen.getByText('ノートを追加');

    fireEvent.change(noteInput, { target: { value: '新しいノート' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockTaskApi.addNote).toHaveBeenCalledWith('task-1', '新しいノート');
    });
  });

  it('ノートの編集が動作する', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('テストノート1')).toBeInTheDocument();
    });

    // 編集ボタンをクリック
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);

    // 編集モードになることを確認
    await waitFor(() => {
      expect(screen.getByDisplayValue('テストノート1')).toBeInTheDocument();
    });

    // ノート内容を変更
    const editInput = screen.getByDisplayValue('テストノート1');
    fireEvent.change(editInput, { target: { value: '編集されたノート' } });

    // 保存ボタンをクリック
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockTaskApi.updateNote).toHaveBeenCalledWith('task-1', 'note-1', '編集されたノート');
    });
  });

  it('ノートの削除が動作する', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('テストノート1')).toBeInTheDocument();
    });

    // 削除ボタンをクリック
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockTaskApi.deleteNote).toHaveBeenCalledWith('task-1', 'note-1');
    });
  });

  it('履歴が正常に表示される', async () => {
    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('未着手 → 進行中')).toBeInTheDocument();
    });
  });

  it('ノートがない場合のメッセージが表示される', async () => {
    const taskDataWithoutNotes = {
      ...mockTaskData,
      notes: [],
    };
    mockTaskApi.getTaskById.mockResolvedValue(taskDataWithoutNotes);

    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('ノートがありません')).toBeInTheDocument();
    });
  });

  it('履歴がない場合のメッセージが表示される', async () => {
    const taskDataWithoutHistory = {
      ...mockTaskData,
      history: [],
    };
    mockTaskApi.getTaskById.mockResolvedValue(taskDataWithoutHistory);

    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('履歴がありません')).toBeInTheDocument();
    });
  });

  it('完了日時が表示される', async () => {
    const completedTask = {
      ...mockTaskData,
      task: {
        ...mockTaskData.task,
        status: 'completed',
        completedAt: new Date(),
      },
    };
    mockTaskApi.getTaskById.mockResolvedValue(completedTask);

    render(<TaskDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('完了日時')).toBeInTheDocument();
    });
  });
});
