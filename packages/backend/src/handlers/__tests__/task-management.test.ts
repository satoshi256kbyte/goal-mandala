import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import taskManagementApp from '../task-management';

// Mock services
vi.mock('../services/task.service');
vi.mock('../services/filter.service');
vi.mock('../services/progress.service');
vi.mock('../services/notification.service');
vi.mock('../middleware/auth');

describe('Task Management API', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api', taskManagementApp);
  });

  describe('GET /api/tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const mockTasks = [{ id: '1', title: 'Test Task', status: 'not_started' }];

      const res = await app.request('/api/tasks', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('should update task status', async () => {
      const res = await app.request('/api/tasks/1/status', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid status', async () => {
      const res = await app.request('/api/tasks/1/status', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'invalid' }),
      });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/tasks/:id/notes', () => {
    it('should add note to task', async () => {
      const res = await app.request('/api/tasks/1/notes', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Test note' }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/tasks/bulk/status', () => {
    it('should bulk update task status', async () => {
      const res = await app.request('/api/tasks/bulk/status', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds: ['1', '2'],
          status: 'completed',
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/saved-views', () => {
    it('should return saved views for user', async () => {
      const res = await app.request('/api/saved-views', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(200);
    });
  });
});
