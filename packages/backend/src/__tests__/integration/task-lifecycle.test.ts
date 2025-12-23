import { PrismaClient } from '../../generated/prisma-client';
import { TaskService } from '../../services/task.service';
import { FilterService } from '../../services/filter.service';
import { ProgressService } from '../../services/progress.service';

jest.mock('../../generated/prisma-client');

// Note: モックを簡素化して統合テストを有効化
describe('Task Lifecycle Integration Tests', () => {
  let prisma: jest.Mocked<PrismaClient>;
  let taskService: TaskService;
  let filterService: FilterService;
  let progressService: ProgressService;

  beforeAll(async () => {
    prisma = {
      $disconnect: jest.fn(),
      taskHistory: { deleteMany: jest.fn() },
      taskNote: { deleteMany: jest.fn() },
      task: {
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      action: {
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(args =>
          Promise.resolve({
            id: args.data.id,
            subGoalId: args.data.subGoalId,
            title: args.data.title,
            description: args.data.description,
            background: args.data.background,
            type: args.data.type,
            position: args.data.position,
            progress: args.data.progress,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      subGoal: {
        deleteMany: jest.fn(),
        create: jest.fn().mockImplementation(args =>
          Promise.resolve({
            id: args.data.id,
            goalId: args.data.goalId,
            title: args.data.title,
            description: args.data.description,
            background: args.data.background,
            position: args.data.position,
            progress: args.data.progress,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      goal: {
        deleteMany: jest.fn(),
        create: jest.fn().mockImplementation(args =>
          Promise.resolve({
            id: args.data.id,
            userId: args.data.userId,
            title: args.data.title,
            description: args.data.description,
            deadline: args.data.deadline,
            background: args.data.background,
            status: args.data.status,
            progress: args.data.progress,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      user: {
        deleteMany: jest.fn(),
        create: jest.fn().mockImplementation(args =>
          Promise.resolve({
            id: args.data.id,
            email: args.data.email,
            name: args.data.name,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
    } as any;

    taskService = new TaskService(prisma);
    filterService = new FilterService(prisma);
    progressService = new ProgressService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.taskHistory.deleteMany();
    await prisma.taskNote.deleteMany();
    await prisma.task.deleteMany();
    await prisma.action.deleteMany();
    await prisma.subGoal.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should complete full task lifecycle', async () => {
    // Setup test data
    const user = await prisma.user.create({
      data: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    const goal = await prisma.goal.create({
      data: {
        id: 'test-goal',
        userId: user.id,
        title: 'Test Goal',
        description: 'Test Description',
        deadline: new Date('2025-12-31'),
        background: 'Test Background',
        status: 'ACTIVE',
        progress: 0,
      },
    });

    const subGoal = await prisma.subGoal.create({
      data: {
        id: 'test-subgoal',
        goalId: goal.id,
        title: 'Test SubGoal',
        description: 'Test Description',
        background: 'Test Background',
        position: 0,
        progress: 0,
      },
    });

    const action = await prisma.action.create({
      data: {
        id: 'test-action',
        subGoalId: subGoal.id,
        title: 'Test Action',
        description: 'Test Description',
        background: 'Test Background',
        type: 'EXECUTION',
        position: 0,
        progress: 0,
      },
    });

    const task = await prisma.task.create({
      data: {
        id: 'test-task',
        actionId: action.id,
        title: 'Test Task',
        description: 'Test Description',
        type: 'execution',
        status: 'not_started',
        estimatedMinutes: 30,
        deadline: new Date('2025-12-31'),
      },
    });

    // 1. Get tasks
    const tasks = await taskService.getTasks(user.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(task.id);

    // 2. Update task status
    const updatedTask = await taskService.updateTaskStatus(task.id, 'in_progress');
    expect(updatedTask.status).toBe('in_progress');

    // 3. Add note
    const note = await taskService.addNote(task.id, user.id, 'Test note');
    expect(note.content).toBe('Test note');

    // 4. Get task with notes and history
    const taskDetail = await taskService.getTaskById(task.id);
    const notes = await taskService.getTaskNotes(task.id);
    const history = await taskService.getTaskHistory(task.id);

    expect(taskDetail.id).toBe(task.id);
    expect(notes).toHaveLength(1);
    expect(history).toHaveLength(1);
    expect(history[0].newStatus).toBe('in_progress');

    // 5. Complete task
    const completedTask = await taskService.updateTaskStatus(task.id, 'completed');
    expect(completedTask.status).toBe('completed');
    expect(completedTask.completedAt).toBeDefined();

    // 6. Update progress
    await progressService.updateProgress(task.id);

    // Verify progress was updated
    const updatedAction = await prisma.action.findUnique({
      where: { id: action.id },
    });
    expect(updatedAction?.progress).toBeGreaterThan(0);
  });

  it('should handle bulk operations', async () => {
    // Setup test data with multiple tasks
    const user = await prisma.user.create({
      data: {
        id: 'test-user-bulk',
        email: 'bulk@example.com',
        name: 'Bulk User',
      },
    });

    const goal = await prisma.goal.create({
      data: {
        id: 'test-goal-bulk',
        userId: user.id,
        title: 'Bulk Goal',
        description: 'Bulk Description',
        deadline: new Date('2025-12-31'),
        background: 'Bulk Background',
        status: 'ACTIVE',
        progress: 0,
      },
    });

    const subGoal = await prisma.subGoal.create({
      data: {
        id: 'test-subgoal-bulk',
        goalId: goal.id,
        title: 'Bulk SubGoal',
        description: 'Bulk Description',
        background: 'Bulk Background',
        position: 0,
        progress: 0,
      },
    });

    const action = await prisma.action.create({
      data: {
        id: 'test-action-bulk',
        subGoalId: subGoal.id,
        title: 'Bulk Action',
        description: 'Bulk Description',
        background: 'Bulk Background',
        type: 'EXECUTION',
        position: 0,
        progress: 0,
      },
    });

    const tasks = await Promise.all([
      prisma.task.create({
        data: {
          id: 'bulk-task-1',
          actionId: action.id,
          title: 'Bulk Task 1',
          type: 'execution',
          status: 'not_started',
          estimatedMinutes: 30,
        },
      }),
      prisma.task.create({
        data: {
          id: 'bulk-task-2',
          actionId: action.id,
          title: 'Bulk Task 2',
          type: 'execution',
          status: 'not_started',
          estimatedMinutes: 30,
        },
      }),
    ]);

    const taskIds = tasks.map(t => t.id);

    // Bulk update status
    await taskService.bulkUpdateStatus(taskIds, 'completed');

    // Verify all tasks were updated
    const updatedTasks = await taskService.getTasks(user.id);
    expect(updatedTasks.every(t => t.status === 'completed')).toBe(true);
    expect(updatedTasks.every(t => t.completedAt)).toBe(true);
  });

  it('should handle filtering and searching', async () => {
    // Setup test data
    const user = await prisma.user.create({
      data: {
        id: 'test-user-filter',
        email: 'filter@example.com',
        name: 'Filter User',
      },
    });

    const goal = await prisma.goal.create({
      data: {
        id: 'test-goal-filter',
        userId: user.id,
        title: 'Filter Goal',
        description: 'Filter Description',
        deadline: new Date('2025-12-31'),
        background: 'Filter Background',
        status: 'ACTIVE',
        progress: 0,
      },
    });

    const subGoal = await prisma.subGoal.create({
      data: {
        id: 'test-subgoal-filter',
        goalId: goal.id,
        title: 'Filter SubGoal',
        description: 'Filter Description',
        background: 'Filter Background',
        position: 0,
        progress: 0,
      },
    });

    const action = await prisma.action.create({
      data: {
        id: 'test-action-filter',
        subGoalId: subGoal.id,
        title: 'Filter Action',
        description: 'Filter Description',
        background: 'Filter Background',
        type: 'EXECUTION',
        position: 0,
        progress: 0,
      },
    });

    await Promise.all([
      prisma.task.create({
        data: {
          id: 'filter-task-1',
          actionId: action.id,
          title: 'Important Task',
          type: 'execution',
          status: 'not_started',
          estimatedMinutes: 30,
        },
      }),
      prisma.task.create({
        data: {
          id: 'filter-task-2',
          actionId: action.id,
          title: 'Regular Task',
          type: 'execution',
          status: 'completed',
          estimatedMinutes: 30,
        },
      }),
    ]);

    // Test filtering
    const completedTasks = await taskService.getTasks(user.id, {
      statuses: ['completed'],
    });
    expect(completedTasks).toHaveLength(1);
    expect(completedTasks[0].status).toBe('completed');

    // Test searching
    const allTasks = await taskService.getTasks(user.id);
    const searchResults = filterService.searchTasks(allTasks, 'Important');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].title).toBe('Important Task');
  });
});
