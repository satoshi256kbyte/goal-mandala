import { Hono, Context, Next } from 'hono';
import { PrismaClient } from '../generated/prisma-client';
import { TaskService } from '../services/task.service';
import { FilterService } from '../services/filter.service';
import { ProgressService } from '../services/progress.service';
import { NotificationService } from '../services/notification.service';
import { authMiddleware, getCurrentUser } from '../middleware/auth';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../utils/logger';

const app = new Hono();
const prisma = new PrismaClient();
const taskService = new TaskService(prisma);
const filterService = new FilterService(prisma);
const progressService = new ProgressService(prisma);
const notificationService = new NotificationService();

// Resource access control middleware
const authorizeTaskAccess = async (c: Context, next: Next) => {
  try {
    const taskId = c.req.param('id');
    const user = getCurrentUser(c);

    if (taskId) {
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        throw new HTTPException(404, { message: 'Task not found' });
      }

      // Check if user owns this task through goal ownership
      const hasAccess = await taskService.checkUserAccess(user.id, taskId);
      if (!hasAccess) {
        throw new HTTPException(403, { message: 'Access denied' });
      }
    }

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    logger.error('Authorization error:', error);
    throw new HTTPException(500, { message: 'Authorization failed' });
  }
};

// Validation schemas with Japanese error messages
const TaskStatusUpdateSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped'], {
    errorMap: () => ({ message: '有効なタスク状態を選択してください' }),
  }),
});

const TaskNoteSchema = z.object({
  content: z
    .string()
    .min(1, { message: 'ノート内容は必須です' })
    .max(5000, { message: 'ノート内容は5000文字以内で入力してください' })
    .refine(val => val.trim().length > 0, { message: 'ノート内容を入力してください' }),
});

const BulkOperationSchema = z.object({
  taskIds: z
    .array(z.string().uuid({ message: '有効なタスクIDを指定してください' }))
    .min(1, { message: '最低1つのタスクを選択してください' })
    .max(100, { message: '一度に処理できるタスクは100個までです' }),
  status: z
    .enum(['not_started', 'in_progress', 'completed', 'skipped'], {
      errorMap: () => ({ message: '有効なタスク状態を選択してください' }),
    })
    .optional(),
});

const SavedViewSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'ビュー名は必須です' })
    .max(100, { message: 'ビュー名は100文字以内で入力してください' }),
  filters: z.object({
    statuses: z.array(z.enum(['not_started', 'in_progress', 'completed', 'skipped'])).optional(),
    deadlineRange: z.enum(['today', 'this_week', 'overdue', 'custom']).optional(),
    actionIds: z.array(z.string().uuid()).optional(),
  }),
  searchQuery: z
    .string()
    .max(500, { message: '検索クエリは500文字以内で入力してください' })
    .optional(),
});

const TaskFiltersSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
  deadlineRange: z.enum(['today', 'this_week', 'overdue', 'custom']).optional(),
  actionIds: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().max(500).optional(),
});

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// Error handling middleware
app.onError((err, c) => {
  logger.error('Task management error:', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    userId: c.get('user')?.id,
  });

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        code: err.status,
      },
      err.status
    );
  }

  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: 'バリデーションエラー',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  return c.json(
    {
      error: 'サーバーエラーが発生しました',
      code: 500,
    },
    500
  );
});

// GET /api/tasks
app.get('/tasks', async c => {
  try {
    const user = getCurrentUser(c);
    const query = c.req.query();

    // Validate query parameters
    const validatedQuery = TaskFiltersSchema.parse(query);

    const filters = {
      statuses: validatedQuery.status
        ? Array.isArray(validatedQuery.status)
          ? validatedQuery.status
          : [validatedQuery.status]
        : undefined,
      deadlineRange: validatedQuery.deadlineRange,
      actionIds: validatedQuery.actionIds
        ? Array.isArray(validatedQuery.actionIds)
          ? validatedQuery.actionIds
          : [validatedQuery.actionIds]
        : undefined,
    };

    let tasks = await taskService.getTasks(user.id, filters);

    if (validatedQuery.search) {
      tasks = filterService.searchTasks(tasks, validatedQuery.search);
    }

    return c.json({
      tasks,
      total: tasks.length,
      filters: filters,
      searchQuery: validatedQuery.search,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: 'クエリパラメータが無効です' });
    }
    throw error;
  }
});

// GET /api/tasks/:id
app.get('/tasks/:id', authorizeTaskAccess, async c => {
  const taskId = c.req.param('id');
  const task = await taskService.getTaskById(taskId);
  const notes = await taskService.getTaskNotes(taskId);
  const history = await taskService.getTaskHistory(taskId);

  return c.json({ task, notes, history });
});

// PATCH /api/tasks/:id/status
app.patch('/tasks/:id/status', authorizeTaskAccess, async c => {
  const taskId = c.req.param('id');
  const body = await c.req.json();
  const { status } = TaskStatusUpdateSchema.parse(body);

  const task = await taskService.updateTaskStatus(taskId, status);

  // Update progress and handle notifications
  await progressService.updateProgress(taskId);

  if (status === 'completed') {
    await notificationService.cancelNotification(taskId);
  }

  return c.json({
    task,
    message: 'タスクの状態を更新しました',
  });
});

// POST /api/tasks/:id/notes
app.post('/tasks/:id/notes', authorizeTaskAccess, async c => {
  const taskId = c.req.param('id');
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { content } = TaskNoteSchema.parse(body);

  const note = await taskService.addNote(taskId, user.id, content);
  return c.json({
    note,
    message: 'ノートを追加しました',
  });
});

// PATCH /api/tasks/:id/notes/:noteId
app.patch('/tasks/:id/notes/:noteId', authorizeTaskAccess, async c => {
  const noteId = c.req.param('noteId');
  const body = await c.req.json();
  const { content } = TaskNoteSchema.parse(body);

  const note = await taskService.updateNote(noteId, content);
  return c.json({
    note,
    message: 'ノートを更新しました',
  });
});

// DELETE /api/tasks/:id/notes/:noteId
app.delete('/tasks/:id/notes/:noteId', authorizeTaskAccess, async c => {
  const noteId = c.req.param('noteId');
  await taskService.deleteNote(noteId);
  return c.json({
    success: true,
    message: 'ノートを削除しました',
  });
});

// POST /api/tasks/bulk/status
app.post('/tasks/bulk/status', async c => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { taskIds, status } = BulkOperationSchema.parse(body);

  if (!status) {
    throw new HTTPException(400, { message: '一括更新には状態の指定が必要です' });
  }

  // Check access for all tasks
  for (const taskId of taskIds) {
    const hasAccess = await taskService.checkUserAccess(user.id, taskId);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'アクセス権限がないタスクが含まれています' });
    }
  }

  await taskService.bulkUpdateStatus(taskIds, status);

  // Update progress for all affected tasks
  await Promise.all(taskIds.map(taskId => progressService.updateProgress(taskId)));

  // Handle notifications for completed tasks
  if (status === 'completed') {
    await Promise.all(taskIds.map(taskId => notificationService.cancelNotification(taskId)));
  }

  return c.json({
    success: true,
    updatedCount: taskIds.length,
    message: `${taskIds.length}件のタスクを更新しました`,
  });
});

// DELETE /api/tasks/bulk
app.delete('/tasks/bulk', async c => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { taskIds } = BulkOperationSchema.parse(body);

  // Check access for all tasks
  for (const taskId of taskIds) {
    const hasAccess = await taskService.checkUserAccess(user.id, taskId);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'アクセス権限がないタスクが含まれています' });
    }
  }

  await taskService.bulkDelete(taskIds);
  return c.json({
    success: true,
    deletedCount: taskIds.length,
    message: `${taskIds.length}件のタスクを削除しました`,
  });
});

// GET /api/saved-views
app.get('/saved-views', async c => {
  const user = getCurrentUser(c);
  const views = await filterService.getSavedViews(user.id);
  return c.json({ views });
});

// POST /api/saved-views
app.post('/saved-views', async c => {
  const user = getCurrentUser(c);
  const body = await c.req.json();
  const { name, filters, searchQuery } = SavedViewSchema.parse(body);

  const view = await filterService.saveView(user.id, name, filters, searchQuery);
  return c.json({
    view,
    message: 'ビューを保存しました',
  });
});

// DELETE /api/saved-views/:id
app.delete('/saved-views/:id', async c => {
  const user = getCurrentUser(c);
  const viewId = c.req.param('id');

  // Check if user owns this view
  const view = await filterService.getSavedViewById(viewId);
  if (!view || view.userId !== user.id) {
    throw new HTTPException(404, { message: 'ビューが見つかりません' });
  }

  await filterService.deleteSavedView(viewId);
  return c.json({
    success: true,
    message: 'ビューを削除しました',
  });
});

export default app;
