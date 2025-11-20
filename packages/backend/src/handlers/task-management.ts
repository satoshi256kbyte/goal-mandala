import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma-client';
import { TaskService } from '../services/task.service';
import { FilterService } from '../services/filter.service';
import { ProgressService } from '../services/progress.service';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const app = new Hono();
const prisma = new PrismaClient();
const taskService = new TaskService(prisma);
const filterService = new FilterService(prisma);
const progressService = new ProgressService(prisma);

// Validation schemas
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
  name: z.string().min(1).max(100),
  filters: z.object({
    statuses: z.array(z.enum(['not_started', 'in_progress', 'completed', 'skipped'])).optional(),
    deadlineRange: z.enum(['today', 'this_week', 'overdue', 'custom']).optional(),
    actionIds: z.array(z.string().uuid()).optional(),
  }),
  searchQuery: z.string().optional(),
});

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// GET /api/tasks
app.get('/tasks', async c => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const filters = {
      statuses: query.status
        ? Array.isArray(query.status)
          ? query.status
          : [query.status]
        : undefined,
      deadlineRange: query.deadlineRange,
      actionIds: query.actionIds
        ? Array.isArray(query.actionIds)
          ? query.actionIds
          : [query.actionIds]
        : undefined,
    };

    let tasks = await taskService.getTasks(userId, filters);

    if (query.search) {
      tasks = filterService.searchTasks(tasks, query.search);
    }

    return c.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

// GET /api/tasks/:id
app.get('/tasks/:id', async c => {
  try {
    const taskId = c.req.param('id');
    const task = await taskService.getTaskById(taskId);
    const notes = await taskService.getTaskNotes(taskId);
    const history = await taskService.getTaskHistory(taskId);

    return c.json({ task, notes, history });
  } catch (error) {
    console.error('Error fetching task:', error);
    return c.json({ error: 'Failed to fetch task' }, 500);
  }
});

// PATCH /api/tasks/:id/status
app.patch('/tasks/:id/status', async c => {
  try {
    const taskId = c.req.param('id');
    const body = await c.req.json();
    const { status } = TaskStatusUpdateSchema.parse(body);

    const task = await taskService.updateTaskStatus(taskId, status);
    await progressService.updateProgress(taskId);

    return c.json({ task });
  } catch (error) {
    console.error('Error updating task status:', error);
    return c.json({ error: 'Failed to update task status' }, 500);
  }
});

// POST /api/tasks/:id/notes
app.post('/tasks/:id/notes', async c => {
  try {
    const taskId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { content } = TaskNoteSchema.parse(body);

    const note = await taskService.addNote(taskId, userId, content);
    return c.json({ note });
  } catch (error) {
    console.error('Error adding note:', error);
    return c.json({ error: 'Failed to add note' }, 500);
  }
});

// PATCH /api/tasks/:id/notes/:noteId
app.patch('/tasks/:id/notes/:noteId', async c => {
  try {
    const noteId = c.req.param('noteId');
    const body = await c.req.json();
    const { content } = TaskNoteSchema.parse(body);

    const note = await taskService.updateNote(noteId, content);
    return c.json({ note });
  } catch (error) {
    console.error('Error updating note:', error);
    return c.json({ error: 'Failed to update note' }, 500);
  }
});

// DELETE /api/tasks/:id/notes/:noteId
app.delete('/tasks/:id/notes/:noteId', async c => {
  try {
    const noteId = c.req.param('noteId');
    await taskService.deleteNote(noteId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return c.json({ error: 'Failed to delete note' }, 500);
  }
});

// POST /api/tasks/bulk/status
app.post('/tasks/bulk/status', async c => {
  try {
    const body = await c.req.json();
    const { taskIds, status } = BulkOperationSchema.parse(body);

    if (!status) {
      return c.json({ error: 'Status is required for bulk update' }, 400);
    }

    await taskService.bulkUpdateStatus(taskIds, status);

    // Update progress for all affected tasks
    await Promise.all(taskIds.map(taskId => progressService.updateProgress(taskId)));

    return c.json({ success: true, updatedCount: taskIds.length });
  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    return c.json({ error: 'Failed to bulk update tasks' }, 500);
  }
});

// DELETE /api/tasks/bulk
app.delete('/tasks/bulk', async c => {
  try {
    const body = await c.req.json();
    const { taskIds } = BulkOperationSchema.parse(body);

    await taskService.bulkDelete(taskIds);
    return c.json({ success: true, deletedCount: taskIds.length });
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    return c.json({ error: 'Failed to bulk delete tasks' }, 500);
  }
});

// GET /api/saved-views
app.get('/saved-views', async c => {
  try {
    const userId = c.get('userId');
    const views = await filterService.getSavedViews(userId);
    return c.json({ views });
  } catch (error) {
    console.error('Error fetching saved views:', error);
    return c.json({ error: 'Failed to fetch saved views' }, 500);
  }
});

// POST /api/saved-views
app.post('/saved-views', async c => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, filters, searchQuery } = SavedViewSchema.parse(body);

    const view = await filterService.saveView(userId, name, filters, searchQuery);
    return c.json({ view });
  } catch (error) {
    console.error('Error saving view:', error);
    return c.json({ error: 'Failed to save view' }, 500);
  }
});

// DELETE /api/saved-views/:id
app.delete('/saved-views/:id', async c => {
  try {
    const viewId = c.req.param('id');
    await filterService.deleteSavedView(viewId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved view:', error);
    return c.json({ error: 'Failed to delete saved view' }, 500);
  }
});

export default app;
