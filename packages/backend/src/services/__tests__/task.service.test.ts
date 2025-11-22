/**
 * TaskServiceのユニットテスト
 * Requirements: 1.1, 2.1-2.3, 3.1-3.5, 9.2-9.5, 13.1-13.5
 */

import { TaskService } from '../task.service';
import { TaskStatus } from '../../generated/prisma-client';

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
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  taskHistory: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

// TaskServiceのインスタンス作成
const taskService = new TaskService(mockPrisma as any);

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    const mockUserId = 'user-1';
    const mockTasks = [
      {
        id: 'task-1',
        actionId: 'action-1',
        title: 'タスク1',
        description: 'タスク1の説明',
        type: 'EXECUTION',
        status: TaskStatus.NOT_STARTED,
        estimatedMinutes: 30,
        deadline: new Date('2025-12-31'),
        completedAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        action: {
          id: 'action-1',
          title: 'アクション1',
          subGoal: {
            id: 'subgoal-1',
            title: 'サブ目標1',
            goal: {
              id: 'goal-1',
              userId: mockUserId,
              title: '目標1',
            },
          },
        },
      },
    ];

    it('should return all tasks for a user', async () => {
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const result = await taskService.getTasks(mockUserId);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          action: {
            subGoal: {
              goal: {
                userId: mockUserId,
              },
            },
          },
        },
        include: {
          action: {
            include: {
              subGoal: {
                include: {
                  goal: true,
                },
              },
            },
          },
        },
        orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
      });
      expect(result).toEqual(mockTasks);
    });

    it('should filter tasks by status', async () => {
      const filters = { statuses: [TaskStatus.COMPLETED] };
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      await taskService.getTasks(mockUserId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [TaskStatus.COMPLETED] },
          }),
        })
      );
    });

    it('should filter tasks by today deadline', async () => {
      const filters = { deadlineRange: 'today' as const };
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      await taskService.getTasks(mockUserId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deadline: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter overdue tasks', async () => {
      const filters = { deadlineRange: 'overdue' as const };
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      await taskService.getTasks(mockUserId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deadline: expect.objectContaining({
              lt: expect.any(Date),
            }),
            status: {
              not: TaskStatus.COMPLETED,
            },
          }),
        })
      );
    });
  });

  describe('getTaskById', () => {
    const mockTaskId = 'task-1';
    const mockTask = {
      id: mockTaskId,
      title: 'タスク1',
      action: {
        id: 'action-1',
        title: 'アクション1',
        subGoal: {
          id: 'subgoal-1',
          title: 'サブ目標1',
          goal: {
            id: 'goal-1',
            title: '目標1',
          },
        },
      },
      notes: [],
      history: [],
    };

    it('should return task by id', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await taskService.getTaskById(mockTaskId);

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        include: {
          action: {
            include: {
              subGoal: {
                include: {
                  goal: true,
                },
              },
            },
          },
          notes: {
            orderBy: { createdAt: 'asc' },
          },
          history: {
            orderBy: { changedAt: 'desc' },
          },
        },
      });
      expect(result).toEqual(mockTask);
    });

    it('should return null if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await taskService.getTaskById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateTaskStatus', () => {
    const mockTaskId = 'task-1';
    const mockUserId = 'user-1';
    const mockCurrentTask = {
      id: mockTaskId,
      status: TaskStatus.NOT_STARTED,
      completedAt: null,
    };
    const mockUpdatedTask = {
      ...mockCurrentTask,
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
    };

    it('should update task status and record completion time', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockCurrentTask);
      mockPrisma.$transaction.mockImplementation(async callback => {
        const mockTx = {
          task: {
            update: jest.fn().mockResolvedValue(mockUpdatedTask),
          },
          taskHistory: {
            create: jest.fn(),
          },
        };
        return await callback(mockTx);
      });

      const result = await taskService.updateTaskStatus(
        mockTaskId,
        TaskStatus.COMPLETED,
        mockUserId
      );

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: mockTaskId },
      });
      expect(result).toEqual(mockUpdatedTask);
    });

    it('should throw error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        taskService.updateTaskStatus(mockTaskId, TaskStatus.COMPLETED, mockUserId)
      ).rejects.toThrow('Task not found');
    });
  });

  describe('bulkUpdateStatus', () => {
    const mockTaskIds = ['task-1', 'task-2'];
    const mockUserId = 'user-1';
    const mockCurrentTasks = [
      { id: 'task-1', status: TaskStatus.NOT_STARTED, completedAt: null },
      { id: 'task-2', status: TaskStatus.IN_PROGRESS, completedAt: null },
    ];

    it('should update multiple tasks status', async () => {
      mockPrisma.task.findMany.mockResolvedValue(mockCurrentTasks);
      mockPrisma.$transaction.mockImplementation(async callback => {
        const mockTx = {
          task: {
            updateMany: jest.fn(),
          },
          taskHistory: {
            createMany: jest.fn(),
          },
        };
        return await callback(mockTx);
      });

      await taskService.bulkUpdateStatus(mockTaskIds, TaskStatus.COMPLETED, mockUserId);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { id: { in: mockTaskIds } },
        select: { id: true, status: true, completedAt: true },
      });
    });
  });

  describe('bulkDelete', () => {
    const mockTaskIds = ['task-1', 'task-2'];
    const mockUserId = 'user-1';
    const mockTasks = [
      {
        id: 'task-1',
        action: {
          subGoal: {
            goal: { userId: mockUserId },
          },
        },
      },
      {
        id: 'task-2',
        action: {
          subGoal: {
            goal: { userId: mockUserId },
          },
        },
      },
    ];

    it('should delete multiple tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      mockPrisma.task.deleteMany.mockResolvedValue({ count: 2 });

      await taskService.bulkDelete(mockTaskIds, mockUserId);

      expect(mockPrisma.task.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: mockTaskIds } },
      });
    });

    it('should throw error if user does not own all tasks', async () => {
      const unauthorizedTasks = [
        {
          id: 'task-1',
          action: {
            subGoal: {
              goal: { userId: 'other-user' },
            },
          },
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(unauthorizedTasks);

      await expect(taskService.bulkDelete(mockTaskIds, mockUserId)).rejects.toThrow(
        'Unauthorized: Cannot delete tasks owned by other users'
      );
    });
  });

  describe('addNote', () => {
    const mockTaskId = 'task-1';
    const mockUserId = 'user-1';
    const mockContent = 'テストノート';
    const mockNote = {
      id: 'note-1',
      taskId: mockTaskId,
      userId: mockUserId,
      content: mockContent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should add note to task', async () => {
      mockPrisma.taskNote.create.mockResolvedValue(mockNote);

      const result = await taskService.addNote(mockTaskId, mockContent, mockUserId);

      expect(mockPrisma.taskNote.create).toHaveBeenCalledWith({
        data: {
          taskId: mockTaskId,
          userId: mockUserId,
          content: mockContent,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockNote);
    });
  });

  describe('updateNote', () => {
    const mockNoteId = 'note-1';
    const mockUserId = 'user-1';
    const mockContent = '更新されたノート';
    const mockExistingNote = {
      id: mockNoteId,
      userId: mockUserId,
      content: '元のノート',
    };
    const mockUpdatedNote = {
      ...mockExistingNote,
      content: mockContent,
      updatedAt: new Date(),
    };

    it('should update note content', async () => {
      mockPrisma.taskNote.findUnique.mockResolvedValue(mockExistingNote);
      mockPrisma.taskNote.update.mockResolvedValue(mockUpdatedNote);

      const result = await taskService.updateNote(mockNoteId, mockContent, mockUserId);

      expect(mockPrisma.taskNote.update).toHaveBeenCalledWith({
        where: { id: mockNoteId },
        data: {
          content: mockContent,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockUpdatedNote);
    });

    it('should throw error if note not found', async () => {
      mockPrisma.taskNote.findUnique.mockResolvedValue(null);

      await expect(taskService.updateNote(mockNoteId, mockContent, mockUserId)).rejects.toThrow(
        'Note not found'
      );
    });

    it('should throw error if user does not own note', async () => {
      const unauthorizedNote = { ...mockExistingNote, userId: 'other-user' };
      mockPrisma.taskNote.findUnique.mockResolvedValue(unauthorizedNote);

      await expect(taskService.updateNote(mockNoteId, mockContent, mockUserId)).rejects.toThrow(
        'Unauthorized: Cannot update note owned by other user'
      );
    });
  });

  describe('deleteNote', () => {
    const mockNoteId = 'note-1';
    const mockUserId = 'user-1';
    const mockExistingNote = {
      id: mockNoteId,
      userId: mockUserId,
    };

    it('should delete note', async () => {
      mockPrisma.taskNote.findUnique.mockResolvedValue(mockExistingNote);
      mockPrisma.taskNote.delete.mockResolvedValue(mockExistingNote);

      await taskService.deleteNote(mockNoteId, mockUserId);

      expect(mockPrisma.taskNote.delete).toHaveBeenCalledWith({
        where: { id: mockNoteId },
      });
    });

    it('should throw error if note not found', async () => {
      mockPrisma.taskNote.findUnique.mockResolvedValue(null);

      await expect(taskService.deleteNote(mockNoteId, mockUserId)).rejects.toThrow(
        'Note not found'
      );
    });

    it('should throw error if user does not own note', async () => {
      const unauthorizedNote = { ...mockExistingNote, userId: 'other-user' };
      mockPrisma.taskNote.findUnique.mockResolvedValue(unauthorizedNote);

      await expect(taskService.deleteNote(mockNoteId, mockUserId)).rejects.toThrow(
        'Unauthorized: Cannot delete note owned by other user'
      );
    });
  });

  describe('getTaskHistory', () => {
    const mockTaskId = 'task-1';
    const mockHistory = [
      {
        id: 'history-1',
        taskId: mockTaskId,
        userId: 'user-1',
        oldStatus: TaskStatus.NOT_STARTED,
        newStatus: TaskStatus.IN_PROGRESS,
        changedAt: new Date(),
      },
    ];

    it('should return task history', async () => {
      mockPrisma.taskHistory.findMany.mockResolvedValue(mockHistory);

      const result = await taskService.getTaskHistory(mockTaskId);

      expect(mockPrisma.taskHistory.findMany).toHaveBeenCalledWith({
        where: { taskId: mockTaskId },
        orderBy: { changedAt: 'desc' },
      });
      expect(result).toEqual(mockHistory);
    });
  });

  describe('disconnect', () => {
    it('should disconnect prisma client', async () => {
      await taskService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
