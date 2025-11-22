import fc from 'fast-check';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskDetailPage } from '../TaskDetailPage';
import { taskApi } from '../../services/taskApi';
import { Task, TaskStatus, TaskNote, TaskHistory } from '@goal-mandala/shared';

// Mock the taskApi
jest.mock('../../services/taskApi');
const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;

// Mock components
jest.mock('../../components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

jest.mock('../../components/common/ErrorAlert', () => ({
  ErrorAlert: () => <div data-testid="error-alert" />,
}));

// Arbitraries for property-based testing
const taskArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  actionId: fc.string({ minLength: 1 }),
  title: fc.string({ minLength: 1 }),
  description: fc.option(fc.string()),
  type: fc.constantFrom('execution', 'habit'),
  status: fc.constantFrom('not_started', 'in_progress', 'completed', 'skipped'),
  estimatedMinutes: fc.integer({ min: 1, max: 480 }),
  deadline: fc.option(fc.date()),
  completedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
}) as fc.Arbitrary<Task>;

const taskNoteArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  taskId: fc.string({ minLength: 1 }),
  content: fc.string({ minLength: 1 }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
  userId: fc.string({ minLength: 1 }),
}) as fc.Arbitrary<TaskNote>;

const taskHistoryArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  taskId: fc.string({ minLength: 1 }),
  oldStatus: fc.constantFrom('not_started', 'in_progress', 'completed', 'skipped'),
  newStatus: fc.constantFrom('not_started', 'in_progress', 'completed', 'skipped'),
  changedAt: fc.date(),
  userId: fc.string({ minLength: 1 }),
}) as fc.Arbitrary<TaskHistory>;

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

describe('TaskDetailPage Property Tests', () => {
  beforeEach(() => {
    mockTaskApi.updateTaskStatus.mockResolvedValue({} as Task);
    mockTaskApi.addNote.mockResolvedValue({} as TaskNote);
    mockTaskApi.updateNote.mockResolvedValue({} as TaskNote);
    mockTaskApi.deleteNote.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Feature: task-management, Property 5: タスク状態更新の即時性
   * Validates: Requirements 2.3
   */
  describe('Property 5: タスク状態更新の即時性', () => {
    it('任意のタスクと新しい状態に対して、状態更新後にAPIが正しく呼び出される', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          fc.array(taskNoteArbitrary, { maxLength: 5 }),
          fc.array(taskHistoryArbitrary, { maxLength: 5 }),
          fc.constantFrom('not_started', 'in_progress', 'completed', 'skipped'),
          async (task, notes, history, newStatus) => {
            // Setup: タスクデータをモック
            const taskData = { task, notes, history };
            mockTaskApi.getTaskById.mockResolvedValue(taskData);

            // Execute: コンポーネントをレンダリング
            render(<TaskDetailPage />, { wrapper: createWrapper(task.id) });

            // Wait for component to load
            await waitFor(() => {
              expect(screen.getByDisplayValue(task.status)).toBeInTheDocument();
            });

            // Execute: 状態を更新
            const statusSelect = screen.getByDisplayValue(task.status);
            fireEvent.change(statusSelect, { target: { value: newStatus } });

            // Verify: APIが正しいパラメータで呼び出される
            await waitFor(() => {
              expect(mockTaskApi.updateTaskStatus).toHaveBeenCalledWith(task.id, newStatus);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: task-management, Property 6: 完了時刻の記録
   * Validates: Requirements 2.4
   */
  describe('Property 6: 完了時刻の記録', () => {
    it('任意のタスクに対して、状態をcompletedに更新した場合、completedAtが表示される', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          fc.array(taskNoteArbitrary, { maxLength: 3 }),
          fc.array(taskHistoryArbitrary, { maxLength: 3 }),
          async (task, notes, history) => {
            // Setup: 完了済みタスクを作成
            const completedTask = {
              ...task,
              status: 'completed' as TaskStatus,
              completedAt: new Date(),
            };
            const taskData = { task: completedTask, notes, history };
            mockTaskApi.getTaskById.mockResolvedValue(taskData);

            // Execute: コンポーネントをレンダリング
            render(<TaskDetailPage />, { wrapper: createWrapper(completedTask.id) });

            // Verify: 完了日時が表示される
            await waitFor(() => {
              expect(screen.getByText('完了日時')).toBeInTheDocument();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('未完了のタスクでは完了日時が表示されない', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          fc.array(taskNoteArbitrary, { maxLength: 3 }),
          fc.array(taskHistoryArbitrary, { maxLength: 3 }),
          async (task, notes, history) => {
            // Setup: 未完了タスクを作成
            const incompleteTask = {
              ...task,
              status: fc.sample(
                fc.constantFrom('not_started', 'in_progress', 'skipped'),
                1
              )[0] as TaskStatus,
              completedAt: undefined,
            };
            const taskData = { task: incompleteTask, notes, history };
            mockTaskApi.getTaskById.mockResolvedValue(taskData);

            // Execute: コンポーネントをレンダリング
            render(<TaskDetailPage />, { wrapper: createWrapper(incompleteTask.id) });

            // Verify: 完了日時が表示されない
            await waitFor(() => {
              expect(screen.getByText(incompleteTask.title)).toBeInTheDocument();
            });

            expect(screen.queryByText('完了日時')).not.toBeInTheDocument();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * ノート機能のプロパティテスト
   */
  describe('ノート機能のプロパティテスト', () => {
    it('任意のノート内容に対して、ノート追加APIが正しく呼び出される', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          fc.array(taskNoteArbitrary, { maxLength: 3 }),
          fc.array(taskHistoryArbitrary, { maxLength: 3 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (task, notes, history, noteContent) => {
            // Setup: タスクデータをモック
            const taskData = { task, notes, history };
            mockTaskApi.getTaskById.mockResolvedValue(taskData);

            // Execute: コンポーネントをレンダリング
            render(<TaskDetailPage />, { wrapper: createWrapper(task.id) });

            await waitFor(() => {
              expect(screen.getByPlaceholderText('ノートを追加...')).toBeInTheDocument();
            });

            // Execute: ノートを追加
            const noteInput = screen.getByPlaceholderText('ノートを追加...');
            const addButton = screen.getByText('ノートを追加');

            fireEvent.change(noteInput, { target: { value: noteContent } });
            fireEvent.click(addButton);

            // Verify: APIが正しいパラメータで呼び出される
            await waitFor(() => {
              expect(mockTaskApi.addNote).toHaveBeenCalledWith(task.id, noteContent);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('任意のノートに対して、ノート削除APIが正しく呼び出される', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          fc.array(taskNoteArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(taskHistoryArbitrary, { maxLength: 3 }),
          async (task, notes, history) => {
            // Setup: タスクデータをモック
            const taskData = { task, notes, history };
            mockTaskApi.getTaskById.mockResolvedValue(taskData);

            // Execute: コンポーネントをレンダリング
            render(<TaskDetailPage />, { wrapper: createWrapper(task.id) });

            await waitFor(() => {
              expect(screen.getByText(notes[0].content)).toBeInTheDocument();
            });

            // Execute: 最初のノートを削除
            const deleteButtons = screen.getAllByText('削除');
            fireEvent.click(deleteButtons[0]);

            // Verify: APIが正しいパラメータで呼び出される
            await waitFor(() => {
              expect(mockTaskApi.deleteNote).toHaveBeenCalledWith(task.id, notes[0].id);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
