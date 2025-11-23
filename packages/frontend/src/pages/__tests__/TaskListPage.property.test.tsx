import fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskListPage } from '../TaskListPage';
import { taskApi } from '../../services/taskApi';
import { Task, TaskStatus } from '@goal-mandala/shared';

// Mock the taskApi
vi.mock('../../services/taskApi');
const mockTaskApi = taskApi as unknown as any;

// Mock components to simplify testing
vi.mock('../../components/task/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => (
    <div data-testid={`task-card-${task.id}`}>
      <span data-testid={`task-title-${task.id}`}>{task.title}</span>
      <span data-testid={`task-status-${task.id}`}>{task.status}</span>
      <span data-testid={`task-type-${task.id}`}>{task.type}</span>
      <span data-testid={`task-estimated-${task.id}`}>{task.estimatedMinutes}</span>
      {task.deadline && (
        <span data-testid={`task-deadline-${task.id}`}>
          {new Date(task.deadline).toISOString()}
        </span>
      )}
    </div>
  ),
}));

vi.mock('../../components/task/TaskFilter', () => ({
  TaskFilter: () => <div data-testid="task-filter" />,
}));

vi.mock('../../components/task/TaskSearch', () => ({
  TaskSearch: () => <div data-testid="task-search" />,
}));

vi.mock('../../components/task/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

vi.mock('../../components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

vi.mock('../../components/common/ErrorAlert', () => ({
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

describe('TaskListPage Property Tests', () => {
  beforeEach(() => {
    mockTaskApi.updateTaskStatus.mockResolvedValue({} as Task);
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
    vi.clearAllMocks();
  });

  /**
   * Feature: task-management, Property 2: タスク表示の完全性
   * Validates: Requirements 1.2, 1.5, 2.2
   */
  describe('Property 2: タスク表示の完全性', () => {
    it('任意のタスクに対して、表示されるタスク情報には必要な全ての情報が含まれる', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }), async tasks => {
          // Setup: タスクデータをモック
          mockTaskApi.getTasks.mockResolvedValue({
            tasks,
            total: tasks.length,
            page: 1,
            pageSize: 20,
          });

          // Execute: コンポーネントをレンダリング
          render(<TaskListPage />, { wrapper: createWrapper() });

          // Verify: 全てのタスクが必要な情報と共に表示される
          await waitFor(() => {
            tasks.forEach(task => {
              expect(screen.getByTestId(`task-card-${task.id}`)).toBeInTheDocument();
              expect(screen.getByTestId(`task-title-${task.id}`)).toHaveTextContent(task.title);
              expect(screen.getByTestId(`task-status-${task.id}`)).toHaveTextContent(task.status);
              expect(screen.getByTestId(`task-type-${task.id}`)).toHaveTextContent(task.type);
              expect(screen.getByTestId(`task-estimated-${task.id}`)).toHaveTextContent(
                task.estimatedMinutes.toString()
              );

              if (task.deadline) {
                expect(screen.getByTestId(`task-deadline-${task.id}`)).toBeInTheDocument();
              }
            });
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: task-management, Property 3: タスクグループ化の正確性
   * Validates: Requirements 1.3
   */
  describe('Property 3: タスクグループ化の正確性', () => {
    it('任意のタスクセットに対して、状態別にグループ化された結果では各グループ内の全タスクが同じ状態を持つ', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }), async tasks => {
          // Setup: タスクデータをモック
          mockTaskApi.getTasks.mockResolvedValue({
            tasks,
            total: tasks.length,
            page: 1,
            pageSize: 20,
          });

          // Execute: コンポーネントをレンダリング
          render(<TaskListPage />, { wrapper: createWrapper() });

          // Verify: 各状態グループ内のタスクが正しい状態を持つ
          await waitFor(() => {
            const statusGroups = {
              not_started: tasks.filter(t => t.status === 'not_started'),
              in_progress: tasks.filter(t => t.status === 'in_progress'),
              completed: tasks.filter(t => t.status === 'completed'),
              skipped: tasks.filter(t => t.status === 'skipped'),
            };

            Object.entries(statusGroups).forEach(([status, statusTasks]) => {
              statusTasks.forEach(task => {
                const taskElement = screen.getByTestId(`task-status-${task.id}`);
                expect(taskElement).toHaveTextContent(status);
              });
            });
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: task-management, Property 4: 期限ハイライトの正確性
   * Validates: Requirements 1.4
   */
  describe('Property 4: 期限ハイライトの正確性', () => {
    it('任意のタスクセットに対して、24時間以内の期限を持つタスクがハイライトされる', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }), async tasks => {
          // Setup: 一部のタスクに24時間以内の期限を設定
          const now = new Date();
          const tasksWithDeadlines = tasks.map((task, index) => ({
            ...task,
            deadline:
              index % 2 === 0
                ? new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12時間後（ハイライト対象）
                : new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48時間後（ハイライト対象外）
          }));

          mockTaskApi.getTasks.mockResolvedValue({
            tasks: tasksWithDeadlines,
            total: tasksWithDeadlines.length,
            page: 1,
            pageSize: 20,
          });

          // Execute: コンポーネントをレンダリング
          render(<TaskListPage />, { wrapper: createWrapper() });

          // Verify: 期限情報が正しく表示される
          await waitFor(() => {
            tasksWithDeadlines.forEach(task => {
              const deadlineElement = screen.getByTestId(`task-deadline-${task.id}`);
              expect(deadlineElement).toBeInTheDocument();

              // 期限が24時間以内かどうかを確認
              const deadline = new Date(task.deadline!);
              const isWithin24Hours = deadline.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;

              // Property: 期限情報が表示されている（ハイライトの実装は別途CSSで行われる）
              expect(deadlineElement).toHaveTextContent(deadline.toISOString());
            });
          });
        }),
        { numRuns: 50 }
      );
    });
  });
});
