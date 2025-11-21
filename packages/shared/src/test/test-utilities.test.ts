import * as fc from 'fast-check';
import {
  generateMockTask,
  generateMockTaskNote,
  generateMockTaskHistory,
  generateMockSavedView,
  generateMockTaskFilters,
} from './generators';
import {
  taskArbitrary,
  taskNoteArbitrary,
  taskHistoryArbitrary,
  savedViewArbitrary,
  taskFiltersArbitrary,
} from './arbitraries';
import { TaskType, TaskStatus } from '../types';

describe('Test Utilities', () => {
  describe('Mock Generators', () => {
    it('should generate valid Task', () => {
      const task = generateMockTask();

      expect(task.id).toBeDefined();
      expect(task.actionId).toBeDefined();
      expect(task.title).toBe('サンプルタスク');
      expect(task.type).toBe(TaskType.EXECUTION);
      expect(task.status).toBe(TaskStatus.NOT_STARTED);
      expect(task.estimatedMinutes).toBe(30);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate Task with overrides', () => {
      const task = generateMockTask({
        title: 'Custom Task',
        type: TaskType.HABIT,
        status: TaskStatus.COMPLETED,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.type).toBe(TaskType.HABIT);
      expect(task.status).toBe(TaskStatus.COMPLETED);
    });

    it('should generate valid TaskNote', () => {
      const note = generateMockTaskNote();

      expect(note.id).toBeDefined();
      expect(note.taskId).toBeDefined();
      expect(note.userId).toBeDefined();
      expect(note.content).toBe('サンプルノート');
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate valid TaskHistory', () => {
      const history = generateMockTaskHistory();

      expect(history.id).toBeDefined();
      expect(history.taskId).toBeDefined();
      expect(history.userId).toBeDefined();
      expect(history.oldStatus).toBe(TaskStatus.NOT_STARTED);
      expect(history.newStatus).toBe(TaskStatus.IN_PROGRESS);
      expect(history.changedAt).toBeInstanceOf(Date);
    });

    it('should generate valid SavedView', () => {
      const view = generateMockSavedView();

      expect(view.id).toBeDefined();
      expect(view.userId).toBeDefined();
      expect(view.name).toBe('サンプルビュー');
      expect(view.filters).toBeDefined();
      expect(view.searchQuery).toBe('');
      expect(view.createdAt).toBeInstanceOf(Date);
      expect(view.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate valid TaskFilters', () => {
      const filters = generateMockTaskFilters();

      expect(filters.statuses).toEqual([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]);
      expect(filters.deadlineRange).toBe('today');
      expect(filters.actionIds).toBeDefined();
    });
  });

  describe('Fast-check Arbitraries', () => {
    it('should generate valid Task with taskArbitrary', () => {
      fc.assert(
        fc.property(taskArbitrary, task => {
          expect(task.id).toBeDefined();
          expect(task.actionId).toBeDefined();
          expect(task.title).toBeDefined();
          expect([TaskType.EXECUTION, TaskType.HABIT]).toContain(task.type);
          expect([
            TaskStatus.NOT_STARTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.COMPLETED,
            TaskStatus.SKIPPED,
          ]).toContain(task.status);
          expect(task.estimatedMinutes).toBeGreaterThan(0);
          expect(task.estimatedMinutes).toBeLessThanOrEqual(480);
          expect(task.createdAt).toBeInstanceOf(Date);
          expect(task.updatedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid TaskNote with taskNoteArbitrary', () => {
      fc.assert(
        fc.property(taskNoteArbitrary, note => {
          expect(note.id).toBeDefined();
          expect(note.taskId).toBeDefined();
          expect(note.userId).toBeDefined();
          expect(note.content).toBeDefined();
          expect(note.content.length).toBeGreaterThan(0);
          expect(note.content.length).toBeLessThanOrEqual(5000);
          expect(note.createdAt).toBeInstanceOf(Date);
          expect(note.updatedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid TaskHistory with taskHistoryArbitrary', () => {
      fc.assert(
        fc.property(taskHistoryArbitrary, history => {
          expect(history.id).toBeDefined();
          expect(history.taskId).toBeDefined();
          expect(history.userId).toBeDefined();
          expect([
            TaskStatus.NOT_STARTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.COMPLETED,
            TaskStatus.SKIPPED,
          ]).toContain(history.oldStatus);
          expect([
            TaskStatus.NOT_STARTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.COMPLETED,
            TaskStatus.SKIPPED,
          ]).toContain(history.newStatus);
          expect(history.changedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid SavedView with savedViewArbitrary', () => {
      fc.assert(
        fc.property(savedViewArbitrary, view => {
          expect(view.id).toBeDefined();
          expect(view.userId).toBeDefined();
          expect(view.name).toBeDefined();
          expect(view.name.length).toBeGreaterThan(0);
          expect(view.name.length).toBeLessThanOrEqual(50);
          expect(view.filters).toBeDefined();
          expect(view.createdAt).toBeInstanceOf(Date);
          expect(view.updatedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid TaskFilters with taskFiltersArbitrary', () => {
      fc.assert(
        fc.property(taskFiltersArbitrary, filters => {
          if (filters.statuses) {
            expect(filters.statuses.length).toBeGreaterThan(0);
            expect(filters.statuses.length).toBeLessThanOrEqual(4);
            filters.statuses.forEach(status => {
              expect([
                TaskStatus.NOT_STARTED,
                TaskStatus.IN_PROGRESS,
                TaskStatus.COMPLETED,
                TaskStatus.SKIPPED,
              ]).toContain(status);
            });
          }

          if (filters.deadlineRange) {
            expect(['today', 'this_week', 'overdue', 'custom']).toContain(filters.deadlineRange);
          }

          if (filters.actionIds) {
            expect(filters.actionIds.length).toBeGreaterThan(0);
            expect(filters.actionIds.length).toBeLessThanOrEqual(10);
          }
        }),
        { numRuns: 10 }
      );
    });
  });
});
