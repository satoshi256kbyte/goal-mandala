import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskListPage } from '../TaskListPage';
import { taskApi } from '../../services/taskApi';

// Mock the taskApi
jest.mock('../../services/taskApi');
const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;

// Mock components
jest.mock('../../components/task/TaskCard', () => ({
  TaskCard: ({ task, onStatusChange, onSelect, selected }: any) => (
    <div data-testid={`task-card-${task.id}`}>
      <span>{task.title}</span>
      <button onClick={() => onStatusChange('completed')}>Complete</button>
      <input
        type="checkbox"
        checked={selected}
        onChange={e => onSelect(e.target.checked)}
        data-testid={`task-select-${task.id}`}
      />
    </div>
  ),
}));

jest.mock('../../components/task/TaskFilter', () => ({
  TaskFilter: ({ filters, onChange }: any) => (
    <div data-testid="task-filter">
      <button onClick={() => onChange({ statuses: ['completed'] })}>Filter Completed</button>
    </div>
  ),
}));

jest.mock('../../components/task/TaskSearch', () => ({
  TaskSearch: ({ query, onChange, onSaveView }: any) => (
    <div data-testid="task-search">
      <input value={query} onChange={e => onChange(e.target.value)} placeholder="Search tasks" />
      <button onClick={() => onSaveView('Test View')}>Save View</button>
    </div>
  ),
}));

jest.mock('../../components/task/ProgressBar', () => ({
  ProgressBar: ({ progress, label }: any) => (
    <div data-testid="progress-bar">
      {label}: {progress}%
    </div>
  ),
}));

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('TaskListPage', () => {
  const mockTasks = [
    {
      id: 'task-1',
      actionId: 'action-1',
      title: 'タスク1',
      description: 'テスト用タスク1',
      type: 'execution',
      status: 'not_started',
      estimatedMinutes: 30,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'task-2',
      actionId: 'action-2',
      title: 'タスク2',
      description: 'テスト用タスク2',
      type: 'habit',
      status: 'completed',
      estimatedMinutes: 60,
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockTaskApi.getTasks.mockResolvedValue({
      tasks: mockTasks,
      total: mockTasks.length,
      page: 1,
      pageSize: 20,
    });
    mockTaskApi.updateTaskStatus.mockResolvedValue(mockTasks[0]);
    mockTaskApi.bulkUpdateStatus.mockResolvedValue();
    mockTaskApi.bulkDelete.mockResolvedValue();
    mockTaskApi.saveView.mockResolvedValue({
      id: 'view-1',
      name: 'Test View',
      filters: {},
      searchQuery: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('タスク一覧が正常に表示される', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('タスク1')).toBeInTheDocument();
      expect(screen.getByText('タスク2')).toBeInTheDocument();
    });

    expect(screen.getByText('タスク管理')).toBeInTheDocument();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('ローディング状態が表示される', () => {
    mockTaskApi.getTasks.mockImplementation(() => new Promise(() => {}));

    render(<TaskListPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('エラー状態が表示される', async () => {
    mockTaskApi.getTasks.mockRejectedValue(new Error('API Error'));

    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
  });

  it('タスクの状態更新が動作する', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('タスク1')).toBeInTheDocument();
    });

    const completeButton = screen.getAllByText('Complete')[0];
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockTaskApi.updateTaskStatus).toHaveBeenCalledWith('task-1', 'completed');
    });
  });

  it('フィルター機能が動作する', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('task-filter')).toBeInTheDocument();
    });

    const filterButton = screen.getByText('Filter Completed');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(mockTaskApi.getTasks).toHaveBeenCalledWith({
        statuses: ['completed'],
        search: '',
      });
    });
  });

  it('検索機能が動作する', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('task-search')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tasks');
    fireEvent.change(searchInput, { target: { value: 'テスト' } });

    await waitFor(() => {
      expect(mockTaskApi.getTasks).toHaveBeenCalledWith({
        search: 'テスト',
      });
    });
  });

  it('一括操作が動作する', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('タスク1')).toBeInTheDocument();
    });

    // タスクを選択
    const checkbox = screen.getByTestId('task-select-task-1');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('一括完了')).toBeInTheDocument();
    });

    // 一括完了を実行
    const bulkCompleteButton = screen.getByText('一括完了');
    fireEvent.click(bulkCompleteButton);

    await waitFor(() => {
      expect(mockTaskApi.bulkUpdateStatus).toHaveBeenCalledWith(['task-1'], 'completed');
    });
  });

  it('ビュー保存機能が動作する', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('task-search')).toBeInTheDocument();
    });

    const saveViewButton = screen.getByText('Save View');
    fireEvent.click(saveViewButton);

    await waitFor(() => {
      expect(mockTaskApi.saveView).toHaveBeenCalledWith('Test View', {}, '');
    });
  });

  it('全選択機能が動作する', async () => {
    render(<TaskListPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('すべて選択')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByLabelText('すべて選択');
    fireEvent.click(selectAllCheckbox);

    // 全タスクが選択されることを確認
    await waitFor(() => {
      expect(screen.getByText('2個のタスクが選択されています')).toBeInTheDocument();
    });
  });
});
