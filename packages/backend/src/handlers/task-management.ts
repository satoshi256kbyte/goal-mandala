import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '../generated/prisma-client';
import { TaskService } from '../services/task.service';
import { FilterService } from '../services/filter.service';
import { ProgressService } from '../services/progress.service';
import { jwtAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { sanitizeErrorForLogging } from '../utils/security';
import { z } from 'zod';

// Prismaクライアントのインスタンス化
const prisma = new PrismaClient();

// サービスのインスタンス化
const taskService = new TaskService(prisma);
const filterService = new FilterService(prisma);
const progressService = new ProgressService(prisma);

// Honoアプリケーションの作成
const app = new Hono();

// CORSミドルウェアの適用
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// バリデーションスキーマ
const TaskStatusUpdateSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
});

const TaskNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

const BulkOperationSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
});

const SavedViewSchema = z.object({
  name: z.string().min(1).max(255),
  filters: z.object({
    statuses: z.array(z.enum(['not_started', 'in_progress', 'completed', 'skipped'])).optional(),
    deadlineRange: z.enum(['today', 'this_week', 'overdue', 'custom']).optional(),
    actionIds: z.array(z.string().uuid()).optional(),
  }),
  searchQuery: z.string().optional(),
});

// GET /api/tasks - タスク一覧取得
app.get('/api/tasks', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;

    // クエリパラメータの取得
    const statuses = c.req.queries('status');
    const deadlineRange = c.req.query('deadlineRange');
    const actionIds = c.req.queries('actionIds');
    const search = c.req.query('search');

    logger.info('Task list API request', {
      requestId,
      userId,
      method: 'GET',
      path: '/api/tasks',
      timestamp: new Date().toISOString(),
    });

    // フィルター構築
    const filters: any = {};
    if (statuses && statuses.length > 0) {
      filters.statuses = statuses;
    }
    if (deadlineRange) {
      filters.deadlineRange = deadlineRange;
    }
    if (actionIds && actionIds.length > 0) {
      filters.actionIds = actionIds;
    }

    // タスク取得
    let tasks = await taskService.getTasks(userId, filters);

    // 検索適用
    if (search) {
      tasks = filterService.searchTasks(tasks, search);
    }

    const duration = Date.now() - startTime;

    logger.info('Task list API response', {
      requestId,
      userId,
      statusCode: 200,
      taskCount: tasks.length,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        tasks,
        total: tasks.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task list API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// GET /api/tasks/:id - タスク詳細取得
app.get('/api/tasks/:id', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const taskId = c.req.param('id');

    logger.info('Task detail API request', {
      requestId,
      userId,
      taskId,
      method: 'GET',
      path: `/api/tasks/${taskId}`,
      timestamp: new Date().toISOString(),
    });

    // タスク詳細取得
    const task = await taskService.getTaskById(taskId);

    // 権限チェック（タスクの所有者確認）
    // TODO: タスク→アクション→サブ目標→目標→ユーザーの関連チェック

    // ノート取得
    const notes = await taskService.getNotes(taskId);

    // 履歴取得
    const history = await taskService.getTaskHistory(taskId);

    const duration = Date.now() - startTime;

    logger.info('Task detail API response', {
      requestId,
      userId,
      taskId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        task,
        notes,
        history,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task detail API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// PATCH /api/tasks/:id/status - タスク状態更新
app.patch('/api/tasks/:id/status', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const taskId = c.req.param('id');
    const body = await c.req.json();

    // バリデーション
    const validatedData = TaskStatusUpdateSchema.parse(body);

    logger.info('Task status update API request', {
      requestId,
      userId,
      taskId,
      newStatus: validatedData.status,
      method: 'PATCH',
      path: `/api/tasks/${taskId}/status`,
      timestamp: new Date().toISOString(),
    });

    // タスク状態更新
    const updatedTask = await taskService.updateTaskStatus(
      taskId,
      validatedData.status as any,
      userId
    );

    // 進捗更新
    await progressService.updateProgress(taskId);

    const duration = Date.now() - startTime;

    logger.info('Task status update API response', {
      requestId,
      userId,
      taskId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task status update API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// POST /api/tasks/:id/notes - ノート追加
app.post('/api/tasks/:id/notes', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const taskId = c.req.param('id');
    const body = await c.req.json();

    // バリデーション
    const validatedData = TaskNoteSchema.parse(body);

    logger.info('Task note add API request', {
      requestId,
      userId,
      taskId,
      method: 'POST',
      path: `/api/tasks/${taskId}/notes`,
      timestamp: new Date().toISOString(),
    });

    // ノート追加
    const note = await taskService.addNote(taskId, validatedData.content, userId);

    const duration = Date.now() - startTime;

    logger.info('Task note add API response', {
      requestId,
      userId,
      taskId,
      noteId: note.id,
      statusCode: 201,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        success: true,
        data: {
          note,
        },
      },
      201
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task note add API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// PATCH /api/tasks/:id/notes/:noteId - ノート更新
app.patch('/api/tasks/:id/notes/:noteId', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const taskId = c.req.param('id');
    const noteId = c.req.param('noteId');
    const body = await c.req.json();

    // バリデーション
    const validatedData = TaskNoteSchema.parse(body);

    logger.info('Task note update API request', {
      requestId,
      userId,
      taskId,
      noteId,
      method: 'PATCH',
      path: `/api/tasks/${taskId}/notes/${noteId}`,
      timestamp: new Date().toISOString(),
    });

    // ノート更新
    const note = await taskService.updateNote(noteId, validatedData.content, userId);

    const duration = Date.now() - startTime;

    logger.info('Task note update API response', {
      requestId,
      userId,
      taskId,
      noteId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        note,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task note update API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// DELETE /api/tasks/:id/notes/:noteId - ノート削除
app.delete('/api/tasks/:id/notes/:noteId', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const taskId = c.req.param('id');
    const noteId = c.req.param('noteId');

    logger.info('Task note delete API request', {
      requestId,
      userId,
      taskId,
      noteId,
      method: 'DELETE',
      path: `/api/tasks/${taskId}/notes/${noteId}`,
      timestamp: new Date().toISOString(),
    });

    // ノート削除
    await taskService.deleteNote(noteId, userId);

    const duration = Date.now() - startTime;

    logger.info('Task note delete API response', {
      requestId,
      userId,
      taskId,
      noteId,
      statusCode: 204,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.body(null, 204);
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task note delete API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// POST /api/tasks/bulk/status - 一括状態更新
app.post('/api/tasks/bulk/status', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const body = await c.req.json();

    // バリデーション
    const validatedData = BulkOperationSchema.parse(body);

    if (!validatedData.status) {
      throw new Error('Status is required for bulk status update');
    }

    logger.info('Task bulk status update API request', {
      requestId,
      userId,
      taskCount: validatedData.taskIds.length,
      newStatus: validatedData.status,
      method: 'POST',
      path: '/api/tasks/bulk/status',
      timestamp: new Date().toISOString(),
    });

    // 一括状態更新
    await taskService.bulkUpdateStatus(validatedData.taskIds, validatedData.status as any, userId);

    const duration = Date.now() - startTime;

    logger.info('Task bulk status update API response', {
      requestId,
      userId,
      updatedCount: validatedData.taskIds.length,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        updatedCount: validatedData.taskIds.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task bulk status update API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// DELETE /api/tasks/bulk - 一括削除
app.delete('/api/tasks/bulk', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const body = await c.req.json();

    // バリデーション
    const validatedData = BulkOperationSchema.parse(body);

    logger.info('Task bulk delete API request', {
      requestId,
      userId,
      taskCount: validatedData.taskIds.length,
      method: 'DELETE',
      path: '/api/tasks/bulk',
      timestamp: new Date().toISOString(),
    });

    // 一括削除
    await taskService.bulkDelete(validatedData.taskIds, userId);

    const duration = Date.now() - startTime;

    logger.info('Task bulk delete API response', {
      requestId,
      userId,
      deletedCount: validatedData.taskIds.length,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        deletedCount: validatedData.taskIds.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Task bulk delete API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// GET /api/saved-views - 保存済みビュー一覧取得
app.get('/api/saved-views', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;

    logger.info('Saved views list API request', {
      requestId,
      userId,
      method: 'GET',
      path: '/api/saved-views',
      timestamp: new Date().toISOString(),
    });

    // 保存済みビュー取得
    const views = await filterService.getSavedViews(userId);

    const duration = Date.now() - startTime;

    logger.info('Saved views list API response', {
      requestId,
      userId,
      viewCount: views.length,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        views,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Saved views list API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// POST /api/saved-views - ビュー保存
app.post('/api/saved-views', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const body = await c.req.json();

    // バリデーション
    const validatedData = SavedViewSchema.parse(body);

    logger.info('Saved view create API request', {
      requestId,
      userId,
      viewName: validatedData.name,
      method: 'POST',
      path: '/api/saved-views',
      timestamp: new Date().toISOString(),
    });

    // ビュー保存
    const view = await filterService.saveView(
      userId,
      validatedData.name,
      validatedData.filters,
      validatedData.searchQuery
    );

    const duration = Date.now() - startTime;

    logger.info('Saved view create API response', {
      requestId,
      userId,
      viewId: view.id,
      statusCode: 201,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        success: true,
        data: {
          view,
        },
      },
      201
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Saved view create API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// DELETE /api/saved-views/:id - 保存済みビュー削除
app.delete('/api/saved-views/:id', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const viewId = c.req.param('id');

    logger.info('Saved view delete API request', {
      requestId,
      userId,
      viewId,
      method: 'DELETE',
      path: `/api/saved-views/${viewId}`,
      timestamp: new Date().toISOString(),
    });

    // ビュー削除
    await filterService.deleteSavedView(viewId, userId);

    const duration = Date.now() - startTime;

    logger.info('Saved view delete API response', {
      requestId,
      userId,
      viewId,
      statusCode: 204,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.body(null, 204);
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Saved view delete API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// エラーハンドリング
app.onError((err, c) => {
  const timestamp = new Date().toISOString();
  const requestId = c.req.header('x-request-id') || 'unknown';

  // Zodバリデーションエラー
  if (err instanceof z.ZodError) {
    logger.error('Validation error', {
      requestId,
      errors: err.errors,
      timestamp,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          details: err.errors,
          timestamp,
        },
      },
      400
    );
  }

  // その他のエラー
  const sanitizedError = sanitizeErrorForLogging(err);
  logger.error('Unexpected error', {
    requestId,
    error: sanitizedError,
    timestamp,
  });

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '予期しないエラーが発生しました',
        timestamp,
      },
    },
    500
  );
});

export default app;
export { taskService, filterService, progressService };
