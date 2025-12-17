import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskListPage } from './TaskListPage';
import { taskApi } from '../services/taskApi';
import { TaskStatus } from '@goal-mandala/shared';

// Mock taskApi
vi.mock('../services/taskApi');

// Mock components
vi.mock('../components/task/TaskCard', () => ({
  TaskCard: ({ task, onStatusChange, onSelect, selected }: any) => (
    <div data-testid={`task-card-${task.id}`}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <input
        type="checkbox"
        checked={selected}
        onChange={e => onSelect(e.target.checked)}
        data-testid={`task-checkbox-${task.id}`}
      />
      <select
        value={task.status}
        onChange={e => onStatusChange(e.target.value)}
        data-testid={`task-status-${task.id}`}
      >
        <option value="not_started">未着手</option>
        <option value="in_progress">進行中</option>
        <option value="completed">完了</option>
        <option value="skipped">スキップ</option>
      </select>
    </div>
  ),
}));

vi.mock('../components/task/TaskFilter', () => ({
  TaskFilter: ({ filters, onChange }: any) => (
    <div data-testid="task-filter">
      <button onClick={() => onChange({ statuses: ['completed'] })}>Filter Completed</button>
    </div>
  ),
}));

vi.mock('../components/task/TaskSearch', () => ({
  TaskSearch: ({ query, onChange, onSaveView }: any) => (
    <div data-testid="task-search">
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="検索"
        data-testid="search-input"
      />
      <button onClick={() => onSaveView('My View')} data-testid="save-view-button">
        Save View
      </button>
    </div>
  ),
}));

vi.mock('../components/task/ProgressBar', () => ({
  ProgressBar: ({ progress, label }: any) => (
    <div data-testid="progress-bar">
      {label}: {progress}%
    </div>
  ),
}));

vi.mock('../components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../components/common/ErrorAlert', () => ({
  ErrorAlert: ({ message, onRetry }: any) => (
    <div data-testid="error-alert">
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

const createMockTask = (id: string, overrides = {}) => ({
  id,
  title: `Task ${id}`,
  description: `Description for task ${id}`,
  status: TaskStatus.NOT_STARTED,
  actionId: `action-${id}`,
  estimatedMinutes: 30,
  type: 'execution' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('TaskListPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  describe('タスク一覧表示', () => {
    it('タスク一覧が正しく表示される', async () => {
      const mockTasks = [
        createMockTask('1', { status: TaskStatus.NOT_STARTED }),
        createMockTask('2', { status: TaskStatus.IN_PROGRESS }),
        createMockTask('3', { status: TaskStatus.COMPLETED }),
      ];

      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 3 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
        expect(screen.getByText('Task 3')).toBeInTheDocument();
      });
    });

    it('ローディング状態が表示される', () => {
      vi.mocked(taskApi.getTasks).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders(<TaskListPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('エラー状態が表示される', async () => {
      vi.mocked(taskApi.getTasks).mockRejectedValue(new Error('Failed to fetch'));

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument();
        expect(screen.getByText('タスクの読み込みに失敗しました')).toBeInTheDocument();
      });
    });

    it('タスクがない場合、空の状態が表示される', async () => {
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: [], total: 0 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('条件に一致するタスクがありません')).toBeInTheDocument();
      });
    });
  });

  describe('フィルター機能', () => {
    it('ステータスでフィルタリングできる', async () => {
      const mockTasks = [
        createMockTask('1', { status: TaskStatus.NOT_STARTED }),
        createMockTask('2', { status: TaskStatus.COMPLETED }),
      ];

      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const filterButton = screen.getByText('Filter Completed');
      await userEvent.click(filterButton);

      // Filter is applied client-side
      await waitFor(() => {
        expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
      });
    });
  });

  describe('検索機能', () => {
    it('タスクを検索できる', async () => {
      const mockTasks = [
        createMockTask('1', { title: 'Buy groceries' }),
        createMockTask('2', { title: 'Write report' }),
      ];

      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'groceries');

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
        expect(screen.queryByText('Write report')).not.toBeInTheDocument();
      });
    });
  });

  describe('タスク状態更新', () => {
    it('タスクの状態を更新できる', async () => {
      const mockTask = createMockTask('1', { status: TaskStatus.NOT_STARTED });
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: [mockTask], total: 1 });
      vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('task-status-1');
      await userEvent.selectOptions(statusSelect, 'completed');

      await waitFor(() => {
        expect(taskApi.updateTaskStatus).toHaveBeenCalledWith('1', TaskStatus.COMPLETED);
      });
    });
  });

  describe('一括操作', () => {
    it('複数のタスクを選択できる', async () => {
      const mockTasks = [createMockTask('1'), createMockTask('2')];
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const checkbox1 = screen.getByTestId('task-checkbox-1');
      const checkbox2 = screen.getByTestId('task-checkbox-2');

      await userEvent.click(checkbox1);
      await userEvent.click(checkbox2);

      await waitFor(() => {
        expect(screen.getByText('2個のタスクが選択されています')).toBeInTheDocument();
      });
    });

    it('すべてのタスクを選択できる', async () => {
      const mockTasks = [createMockTask('1'), createMockTask('2')];
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('すべて選択');
      await userEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText('2個のタスクが選択されています')).toBeInTheDocument();
      });
    });

    it('選択したタスクを一括完了できる', async () => {
      const mockTasks = [createMockTask('1'), createMockTask('2')];
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });
      vi.mocked(taskApi.bulkUpdateStatus).mockResolvedValue({ success: true, count: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const checkbox1 = screen.getByTestId('task-checkbox-1');
      await userEvent.click(checkbox1);

      const completeButton = screen.getByText('一括完了');
      await userEvent.click(completeButton);

      await waitFor(() => {
        expect(taskApi.bulkUpdateStatus).toHaveBeenCalledWith(['1'], TaskStatus.COMPLETED);
      });
    });

    it('選択したタスクを一括削除できる', async () => {
      const mockTasks = [createMockTask('1'), createMockTask('2')];
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });
      vi.mocked(taskApi.bulkDelete).mockResolvedValue({ success: true, count: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const checkbox1 = screen.getByTestId('task-checkbox-1');
      await userEvent.click(checkbox1);

      const deleteButton = screen.getByText('一括削除');
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(taskApi.bulkDelete).toHaveBeenCalledWith(['1']);
      });
    });
  });

  describe('進捗表示', () => {
    it('全体の進捗が正しく計算される', async () => {
      const mockTasks = [
        createMockTask('1', { status: TaskStatus.COMPLETED }),
        createMockTask('2', { status: TaskStatus.NOT_STARTED }),
      ];
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: mockTasks, total: 2 });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('全体進捗: 50%')).toBeInTheDocument();
      });
    });
  });

  describe('ビュー保存', () => {
    it('現在のフィルターと検索条件をビューとして保存できる', async () => {
      vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: [], total: 0 });
      vi.mocked(taskApi.saveView).mockResolvedValue({ id: 'view-1', name: 'My View' });

      renderWithProviders(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByTestId('task-search')).toBeInTheDocument();
      });

      const saveViewButton = screen.getByTestId('save-view-button');
      await userEvent.click(saveViewButton);

      await waitFor(() => {
        expect(taskApi.saveView).toHaveBeenCalledWith('My View', {}, '');
      });
    });
  });
});
