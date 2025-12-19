import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TaskDetailPage } from './TaskDetailPage';
import { taskApi } from '../services/taskApi';
import { TaskStatus } from '@goal-mandala/shared';

// Mock taskApi
vi.mock('../services/taskApi');

// Mock components
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

const createMockNote = (id: string, content: string) => ({
  id,
  content,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockHistory = (id: string, oldStatus: TaskStatus, newStatus: TaskStatus) => ({
  id,
  oldStatus,
  newStatus,
  changedAt: new Date().toISOString(),
});

describe('TaskDetailPage', () => {
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

  const renderWithProviders = (taskId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/tasks/${taskId}`]}>
          <Routes>
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('タスク詳細表示', () => {
    it('タスクの詳細情報が正しく表示される', async () => {
      const mockTask = createMockTask('1', {
        title: 'Test Task',
        description: 'Test Description',
        estimatedMinutes: 60,
        deadline: new Date('2025-12-31').toISOString(),
      });

      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('60分')).toBeInTheDocument();
      });
    });

    it('ローディング状態が表示される', () => {
      vi.mocked(taskApi.getTaskById).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders('1');

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('エラー状態が表示される', async () => {
      vi.mocked(taskApi.getTaskById).mockRejectedValue(new Error('Failed to fetch'));

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument();
        expect(screen.getByText('タスクの読み込みに失敗しました')).toBeInTheDocument();
      });
    });

    it('タスクIDが指定されていない場合、エラーメッセージが表示される', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/tasks/']}>
            <Routes>
              <Route path="/tasks/" element={<TaskDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('タスクIDが指定されていません')).toBeInTheDocument();
    });
  });

  describe('状態更新', () => {
    it('タスクの状態を更新できる', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });
      vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText('状態を変更');
      await userEvent.selectOptions(statusSelect, 'completed');

      await waitFor(() => {
        expect(taskApi.updateTaskStatus).toHaveBeenCalledWith('1', TaskStatus.COMPLETED);
      });
    });
  });

  describe('ノート機能', () => {
    it('ノートを追加できる', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });
      vi.mocked(taskApi.addNote).mockResolvedValue(createMockNote('note-1', 'New note'));

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const noteInput = screen.getByPlaceholderText('ノートを追加...');
      await userEvent.type(noteInput, 'New note');

      const addButton = screen.getByText('ノートを追加');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(taskApi.addNote).toHaveBeenCalledWith('1', 'New note');
      });
    });

    it('空のノートは追加できない', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const addButton = screen.getByText('ノートを追加');
      expect(addButton).toBeDisabled();
    });

    it('ノートを編集できる', async () => {
      const mockTask = createMockTask('1');
      const mockNote = createMockNote('note-1', 'Original note');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [mockNote],
        history: [],
      });
      vi.mocked(taskApi.updateNote).mockResolvedValue({
        ...mockNote,
        content: 'Updated note',
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Original note')).toBeInTheDocument();
      });

      const editButton = screen.getByText('編集');
      await userEvent.click(editButton);

      const editInput = screen.getByDisplayValue('Original note');
      await userEvent.clear(editInput);
      await userEvent.type(editInput, 'Updated note');

      const saveButton = screen.getByText('保存');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(taskApi.updateNote).toHaveBeenCalledWith('1', 'note-1', 'Updated note');
      });
    });

    it('ノートの編集をキャンセルできる', async () => {
      const mockTask = createMockTask('1');
      const mockNote = createMockNote('note-1', 'Original note');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [mockNote],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Original note')).toBeInTheDocument();
      });

      const editButton = screen.getByText('編集');
      await userEvent.click(editButton);

      const cancelButton = screen.getByText('キャンセル');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Original note')).toBeInTheDocument();
        expect(screen.queryByText('保存')).not.toBeInTheDocument();
      });
    });

    it('ノートを削除できる', async () => {
      const mockTask = createMockTask('1');
      const mockNote = createMockNote('note-1', 'Note to delete');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [mockNote],
        history: [],
      });
      vi.mocked(taskApi.deleteNote).mockResolvedValue({ success: true });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Note to delete')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('削除');
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(taskApi.deleteNote).toHaveBeenCalledWith('1', 'note-1');
      });
    });

    it('ノートがない場合、空の状態が表示される', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('ノートがありません')).toBeInTheDocument();
      });
    });
  });

  describe('履歴表示', () => {
    it('タスクの履歴が正しく表示される', async () => {
      const mockTask = createMockTask('1');
      const mockHistory = [
        createMockHistory('h1', TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS),
        createMockHistory('h2', TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED),
      ];
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: mockHistory,
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('未着手 → 進行中')).toBeInTheDocument();
        expect(screen.getByText('進行中 → 完了')).toBeInTheDocument();
      });
    });

    it('履歴がない場合、空の状態が表示される', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('履歴がありません')).toBeInTheDocument();
      });
    });
  });

  describe('完了日時表示', () => {
    it('完了したタスクの完了日時が表示される', async () => {
      const completedAt = new Date('2025-12-17T10:00:00').toISOString();
      const mockTask = createMockTask('1', {
        status: TaskStatus.COMPLETED,
        completedAt,
      });
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('完了日時')).toBeInTheDocument();
        expect(screen.getByText(/12\/17\/2025/)).toBeInTheDocument();
      });
    });

    it('未完了のタスクには完了日時が表示されない', async () => {
      const mockTask = createMockTask('1', {
        status: TaskStatus.NOT_STARTED,
      });
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      expect(screen.queryByText('完了日時')).not.toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('大量のノート（50件）が正しく表示される', async () => {
      const mockTask = createMockTask('1');
      const mockNotes = Array.from({ length: 50 }, (_, i) =>
        createMockNote(`note-${i + 1}`, `Note ${i + 1}`)
      );
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: mockNotes,
        history: [],
      });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Note 1')).toBeInTheDocument();
        expect(screen.getByText('Note 50')).toBeInTheDocument();
      });
    });

    it('大量の履歴（100件）が正しく表示される', async () => {
      const mockTask = createMockTask('1');
      const mockHistory = Array.from({ length: 100 }, (_, i) =>
        createMockHistory(
          `h${i + 1}`,
          i % 2 === 0 ? TaskStatus.NOT_STARTED : TaskStatus.IN_PROGRESS,
          i % 2 === 0 ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED
        )
      );
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: mockHistory,
      });

      renderWithProviders('1');

      await waitFor(() => {
        const historyItems1 = screen.getAllByText('未着手 → 進行中');
        const historyItems2 = screen.getAllByText('進行中 → 完了');
        expect(historyItems1.length).toBeGreaterThan(0);
        expect(historyItems2.length).toBeGreaterThan(0);
      });
    });

    it('エラー後にリトライが成功する', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          task: mockTask,
          notes: [],
          history: [],
        });

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
    });

    it('ノート追加中にエラーが発生してもアプリケーションがクラッシュしない', async () => {
      const mockTask = createMockTask('1');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [],
        history: [],
      });
      vi.mocked(taskApi.addNote).mockRejectedValue(new Error('Failed to add note'));

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const noteInput = screen.getByPlaceholderText('ノートを追加...');
      await userEvent.type(noteInput, 'New note');

      const addButton = screen.getByText('ノートを追加');
      await userEvent.click(addButton);

      // エラーが発生してもアプリケーションがクラッシュしないことを確認
      await waitFor(() => {
        expect(taskApi.addNote).toHaveBeenCalledWith('1', 'New note');
      });
    });

    it('ノート編集中にエラーが発生してもアプリケーションがクラッシュしない', async () => {
      const mockTask = createMockTask('1');
      const mockNote = createMockNote('note-1', 'Original note');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [mockNote],
        history: [],
      });
      vi.mocked(taskApi.updateNote).mockRejectedValue(new Error('Failed to update note'));

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Original note')).toBeInTheDocument();
      });

      const editButton = screen.getByText('編集');
      await userEvent.click(editButton);

      const editInput = screen.getByDisplayValue('Original note');
      await userEvent.clear(editInput);
      await userEvent.type(editInput, 'Updated note');

      const saveButton = screen.getByText('保存');
      await userEvent.click(saveButton);

      // エラーが発生してもアプリケーションがクラッシュしないことを確認
      await waitFor(() => {
        expect(taskApi.updateNote).toHaveBeenCalledWith('1', 'note-1', 'Updated note');
      });
    });

    it('ノート削除中にエラーが発生してもアプリケーションがクラッシュしない', async () => {
      const mockTask = createMockTask('1');
      const mockNote = createMockNote('note-1', 'Note to delete');
      vi.mocked(taskApi.getTaskById).mockResolvedValue({
        task: mockTask,
        notes: [mockNote],
        history: [],
      });
      vi.mocked(taskApi.deleteNote).mockRejectedValue(new Error('Failed to delete note'));

      renderWithProviders('1');

      await waitFor(() => {
        expect(screen.getByText('Note to delete')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('削除');
      await userEvent.click(deleteButton);

      // エラーが発生してもアプリケーションがクラッシュしないことを確認
      await waitFor(() => {
        expect(taskApi.deleteNote).toHaveBeenCalledWith('1', 'note-1');
      });
    });
  });
});
