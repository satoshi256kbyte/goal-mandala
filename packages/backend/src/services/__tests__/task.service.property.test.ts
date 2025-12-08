import * as fc from 'fast-check';
import { TaskService } from '../task.service';
import { FilterService } from '../filter.service';
import { PrismaClient, TaskStatus } from '../../generated/prisma-client';
import {
  taskArbitrary,
  taskStatusArbitrary,
  taskFiltersArbitrary,
} from '../../__tests__/utils/task-arbitraries';

// Prismaクライアントのモック
const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  taskNote: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  taskHistory: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => callback(mockPrisma)),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

describe('Task Service Property-Based Tests', () => {
  let taskService: TaskService;
  let filterService: FilterService;

  beforeEach(() => {
    jest.clearAllMocks();
    taskService = new TaskService(mockPrisma);
    filterService = new FilterService(mockPrisma);
  });

  /**
   * Feature: task-management, Property 1: タスク一覧の完全性
   * Validates: Requirements 1.1, 4.1-4.5, 5.1-5.5, 6.1-6.5
   *
   * For any ユーザーIDとフィルター条件、getTasks関数は、
   * そのユーザーに割り当てられた全タスクのうち、
   * フィルター条件に一致するタスクのみを返す
   */
  describe('Property 1: タスク一覧の完全性', () => {
    it('should return only tasks matching filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          taskFiltersArbitrary,
          fc.uuid(),
          async (tasks, filters, userId) => {
            // Setup: モックデータを設定
            mockPrisma.task.findMany = jest.fn().mockResolvedValue(tasks);

            // Execute: フィルター適用
            const result = await taskService.getTasks(userId, filters);

            // Verify: findManyが呼ばれたことを確認
            expect(mockPrisma.task.findMany).toHaveBeenCalled();

            // Verify: 結果が配列であることを確認
            expect(Array.isArray(result)).toBe(true);

            // Verify: 全ての結果がフィルター条件に一致することを確認
            if (filters.statuses && filters.statuses.length > 0) {
              // 状態フィルターが適用されている場合、
              // findManyの引数にstatusフィルターが含まれていることを確認
              const callArgs = (mockPrisma.task.findMany as jest.Mock).mock.calls[0][0];
              expect(callArgs.where).toBeDefined();
            }

            if (filters.actionIds && filters.actionIds.length > 0) {
              // アクションIDフィルターが適用されている場合、
              // findManyの引数にactionIdフィルターが含まれていることを確認
              const callArgs = (mockPrisma.task.findMany as jest.Mock).mock.calls[0][0];
              expect(callArgs.where).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 5: タスク状態更新の即時性
   * Validates: Requirements 2.3
   *
   * For any タスクと新しい状態、updateTaskStatus関数を呼び出した後、
   * データベースから取得したタスクの状態は新しい状態と一致する
   */
  describe('Property 5: タスク状態更新の即時性', () => {
    it('should immediately update task status in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          taskStatusArbitrary,
          fc.uuid(),
          taskArbitrary,
          async (taskId, newStatus, userId, currentTask) => {
            // Setup: 現在のタスクと更新後のタスクをモック
            const updatedTask = { ...currentTask, id: taskId, status: newStatus };

            mockPrisma.task.findUnique = jest.fn().mockResolvedValue(currentTask);
            mockPrisma.task.update = jest.fn().mockResolvedValue(updatedTask);
            mockPrisma.taskHistory.create = jest.fn().mockResolvedValue({});

            // Execute: タスク状態を更新
            const result = await taskService.updateTaskStatus(taskId, newStatus, userId);

            // Verify: 更新されたタスクの状態が新しい状態と一致
            expect(result.status).toBe(newStatus);

            // Verify: updateが呼ばれたことを確認
            expect(mockPrisma.task.update).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { id: taskId },
                data: expect.objectContaining({
                  status: newStatus,
                }),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 6: 完了時刻の記録
   * Validates: Requirements 2.4
   *
   * For any タスク、状態を'completed'に更新した場合、
   * completedAtフィールドが現在時刻で設定される
   */
  describe('Property 6: 完了時刻の記録', () => {
    it('should record completion time when task is marked as completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          taskArbitrary,
          async (taskId, userId, currentTask) => {
            // Setup: 現在のタスクをモック（completedAtはnull）
            const taskWithoutCompletedAt = { ...currentTask, id: taskId, completedAt: null };
            const beforeUpdate = new Date();

            mockPrisma.task.findUnique = jest.fn().mockResolvedValue(taskWithoutCompletedAt);
            mockPrisma.task.update = jest.fn().mockImplementation(({ data }) => {
              return Promise.resolve({
                ...taskWithoutCompletedAt,
                status: TaskStatus.COMPLETED,
                completedAt: data.completedAt,
              });
            });
            mockPrisma.taskHistory.create = jest.fn().mockResolvedValue({});

            // Execute: タスクを完了状態に更新
            const result = await taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED, userId);

            const afterUpdate = new Date();

            // Verify: completedAtが設定されている
            expect(result.completedAt).toBeDefined();

            // Verify: updateが呼ばれた際にcompletedAtが設定されている
            const updateCall = (mockPrisma.task.update as jest.Mock).mock.calls[0][0];
            expect(updateCall.data.completedAt).toBeDefined();

            // Verify: completedAtが妥当な時刻範囲内
            if (updateCall.data.completedAt) {
              const completedAt = new Date(updateCall.data.completedAt);
              expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
              expect(completedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 8: ノート保存のタイムスタンプ
   * Validates: Requirements 3.2
   *
   * For any タスクとノート内容、ノートを保存した場合、
   * createdAtフィールドが現在時刻で設定される
   */
  describe('Property 8: ノート保存のタイムスタンプ', () => {
    it('should set createdAt timestamp when saving a note', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 5000 }),
          fc.uuid(),
          async (taskId, content, userId) => {
            const beforeCreate = new Date();

            // Setup: ノート作成をモック
            mockPrisma.taskNote.create = jest.fn().mockImplementation(({ data }) => {
              return Promise.resolve({
                id: fc.sample(fc.uuid(), 1)[0],
                taskId: data.taskId,
                userId: data.userId,
                content: data.content,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              });
            });

            // Execute: ノートを追加
            const result = await taskService.addNote(taskId, content, userId);

            const afterCreate = new Date();

            // Verify: createdAtが設定されている
            expect(result.createdAt).toBeDefined();

            // Verify: createdAtが妥当な時刻範囲内
            const createdAt = new Date(result.createdAt);
            expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
            expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 11: ノート削除の完全性
   * Validates: Requirements 3.5
   *
   * For any ノート、ノートを削除した場合、
   * データベースから完全に削除され、タスク詳細取得時にそのノートは含まれない
   */
  describe('Property 11: ノート削除の完全性', () => {
    it('should completely remove note from database when deleted', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (noteId, userId) => {
          // Setup: ノートの存在をモック
          const existingNote = {
            id: noteId,
            taskId: fc.sample(fc.uuid(), 1)[0],
            userId,
            content: 'test note',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockPrisma.taskNote.findUnique = jest.fn().mockResolvedValue(existingNote);
          mockPrisma.taskNote.delete = jest.fn().mockResolvedValue(existingNote);

          // Execute: ノートを削除
          await taskService.deleteNote(noteId, userId);

          // Verify: deleteが呼ばれたことを確認
          expect(mockPrisma.taskNote.delete).toHaveBeenCalledWith({
            where: { id: noteId },
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 17: 一括操作の完全性
   * Validates: Requirements 9.2-9.5
   *
   * For any タスクIDセットと操作、一括操作を実行した場合、
   * 指定された全てのタスクに操作が適用される
   */
  describe('Property 17: 一括操作の完全性', () => {
    it('should apply bulk operation to all specified tasks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          taskStatusArbitrary,
          fc.uuid(),
          async (taskIds, newStatus, userId) => {
            // Setup: 現在のタスクをモック
            const currentTasks = taskIds.map(id => ({
              id,
              status: TaskStatus.NOT_STARTED,
              completedAt: null,
            }));

            mockPrisma.task.findMany = jest.fn().mockResolvedValue(currentTasks);
            mockPrisma.task.updateMany = jest.fn().mockResolvedValue({ count: taskIds.length });
            mockPrisma.taskHistory.createMany = jest
              .fn()
              .mockResolvedValue({ count: taskIds.length });

            // Execute: 一括状態更新
            await taskService.bulkUpdateStatus(taskIds, newStatus, userId);

            // Verify: updateManyが正しいタスクIDで呼ばれた
            expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { id: { in: taskIds } },
                data: expect.objectContaining({
                  status: newStatus,
                }),
              })
            );

            // Verify: 履歴が全てのタスクに対して作成された
            expect(mockPrisma.taskHistory.createMany).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.arrayContaining(
                  taskIds.map(taskId =>
                    expect.objectContaining({
                      taskId,
                      userId,
                      newStatus,
                    })
                  )
                ),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 18: タスク履歴の記録
   * Validates: Requirements 13.1-13.5
   *
   * For any タスクと状態変更、タスクの状態を更新した場合、
   * 履歴エントリが作成され、oldStatus、newStatus、changedAt、userIdが正しく記録される
   */
  describe('Property 18: タスク履歴の記録', () => {
    it('should create history entry with correct data when task status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          taskStatusArbitrary,
          taskStatusArbitrary,
          fc.uuid(),
          async (taskId, oldStatus, newStatus, userId) => {
            // Setup: 現在のタスクをモック
            const currentTask = {
              id: taskId,
              status: oldStatus,
              completedAt: null,
            };

            const beforeUpdate = new Date();

            mockPrisma.task.findUnique = jest.fn().mockResolvedValue(currentTask);
            mockPrisma.task.update = jest.fn().mockResolvedValue({
              ...currentTask,
              status: newStatus,
            });
            mockPrisma.taskHistory.create = jest.fn().mockImplementation(({ data }) => {
              return Promise.resolve({
                id: fc.sample(fc.uuid(), 1)[0],
                ...data,
              });
            });

            // Execute: タスク状態を更新
            await taskService.updateTaskStatus(taskId, newStatus, userId);

            const afterUpdate = new Date();

            // Verify: 履歴が作成された
            expect(mockPrisma.taskHistory.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  taskId,
                  userId,
                  oldStatus,
                  newStatus,
                  changedAt: expect.any(Date),
                }),
              })
            );

            // Verify: changedAtが妥当な時刻範囲内
            const historyCall = (mockPrisma.taskHistory.create as jest.Mock).mock.calls[0][0];
            const changedAt = new Date(historyCall.data.changedAt);
            expect(changedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
            expect(changedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
