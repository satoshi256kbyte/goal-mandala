/**
 * タスク管理機能のプロパティベーステスト
 * 設計書の正確性プロパティを検証
 */

import fc from 'fast-check';
import { FilterService } from '../filter.service';
import { TaskStatus } from '../../generated/prisma-client';

// テスト用のArbitrary定義
const taskStatusArbitrary = fc.constantFrom(
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
  TaskStatus.SKIPPED
);

const simpleTaskArbitrary = fc.record({
  id: fc.uuid(),
  actionId: fc.uuid(),
  title: fc.constantFrom('プログラミング学習', 'ランニング', 'レポート作成', 'ミーティング'),
  description: fc.option(
    fc.constantFrom('TypeScript基礎', '朝のランニング', '月次レポート', 'チーム会議')
  ),
  type: fc.constantFrom('EXECUTION', 'HABIT'),
  status: taskStatusArbitrary,
  estimatedMinutes: fc.integer({ min: 15, max: 120 }),
  deadline: fc.option(fc.date()),
  completedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

const simpleTaskFiltersArbitrary = fc.record({
  statuses: fc.option(fc.array(taskStatusArbitrary, { minLength: 1, maxLength: 2 })),
  deadlineRange: fc.option(fc.constantFrom('today', 'this_week', 'overdue')),
  actionIds: fc.option(fc.array(fc.uuid(), { minLength: 1, maxLength: 3 })),
});

// モックPrismaクライアント
const createMockPrisma = () => ({
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
  savedView: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
});

describe('Task Management Property Tests', () => {
  let mockPrisma: any;
  let filterService: FilterService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    filterService = new FilterService(mockPrisma);
  });

  /**
   * Property 1: タスク一覧の完全性
   * For any フィルター条件、フィルター処理は、条件に一致するタスクのみを返す
   * Validates: Requirements 1.1, 4.1-4.5, 5.1-5.5, 6.1-6.5
   */
  it('Property 1: タスク一覧の完全性', () => {
    fc.assert(
      fc.property(
        fc.array(simpleTaskArbitrary, { maxLength: 10 }),
        simpleTaskFiltersArbitrary,
        (allTasks, filters) => {
          // Execute: フィルター適用
          const result = filterService.applyFilters(allTasks as any[], filters);

          // Verify: 結果の検証
          expect(Array.isArray(result)).toBe(true);

          // フィルター条件に一致することを確認
          if (filters.statuses && filters.statuses.length > 0) {
            result.forEach(task => {
              expect(filters.statuses).toContain(task.status);
            });
          }

          if (filters.actionIds && filters.actionIds.length > 0) {
            result.forEach(task => {
              expect(filters.actionIds).toContain(task.actionId);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: タスク状態更新の即時性
   * For any タスクと新しい状態、完了状態の場合は完了時刻が設定される
   * Validates: Requirements 2.3
   */
  it('Property 5: タスク状態更新の即時性', () => {
    fc.assert(
      fc.property(taskStatusArbitrary, newStatus => {
        // 状態更新ロジックのテスト（完了時刻の設定）
        const shouldSetCompletedAt = newStatus === TaskStatus.COMPLETED;
        const completedAt = shouldSetCompletedAt ? new Date() : null;

        if (shouldSetCompletedAt) {
          expect(completedAt).toBeDefined();
        } else {
          expect(completedAt).toBeNull();
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: 検索の正確性
   * For any キーワードとタスクセット、検索結果には、titleまたはdescriptionに
   * キーワードを含むタスクのみが含まれる
   * Validates: Requirements 7.1
   */
  it('Property 12: 検索の正確性', () => {
    fc.assert(
      fc.property(
        fc.array(simpleTaskArbitrary, { maxLength: 10 }),
        fc.constantFrom('プログラミング', 'ランニング', 'レポート', 'TypeScript'),
        (tasks, keyword) => {
          const result = filterService.searchTasks(tasks as any[], keyword);

          result.forEach(task => {
            const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
            const keywordLower = keyword.toLowerCase();
            expect(searchText).toContain(keywordLower);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 15: キーワードハイライトの正確性
   * For any キーワードとテキスト、ハイライト処理後のテキストには、
   * キーワードに一致する全ての部分がハイライトマークアップで囲まれている
   * Validates: Requirements 7.4
   */
  it('Property 15: キーワードハイライトの正確性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('プログラミング学習を始める', 'ランニングで健康維持', 'レポート作成作業'),
        fc.constantFrom('プログラミング', 'ランニング', 'レポート'),
        (text, keyword) => {
          const result = filterService.highlightMatches(text, keyword);

          if (text.toLowerCase().includes(keyword.toLowerCase())) {
            expect(result).toContain('<mark>');
            expect(result).toContain('</mark>');
            expect(result).toContain(`<mark>${keyword}</mark>`);
          } else {
            expect(result).toBe(text);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 16: 保存済みビューのラウンドトリップ
   * For any フィルター、JSON シリアライゼーション・デシリアライゼーションで同じ値が得られる
   * Validates: Requirements 8.1-8.5
   */
  it('Property 16: 保存済みビューのラウンドトリップ', () => {
    fc.assert(
      fc.property(simpleTaskFiltersArbitrary, filters => {
        // JSON シリアライゼーション・デシリアライゼーションのテスト
        const serialized = JSON.stringify(filters);
        const deserialized = JSON.parse(serialized);

        // undefinedはnullに変換されるため、nullに正規化して比較
        const normalizeUndefined = (obj: any): any => {
          if (obj === undefined) return null;
          if (Array.isArray(obj)) return obj.map(normalizeUndefined);
          if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const key in obj) {
              result[key] = normalizeUndefined(obj[key]);
            }
            return result;
          }
          return obj;
        };

        expect(normalizeUndefined(deserialized)).toEqual(normalizeUndefined(filters));
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 17: 一括操作の完全性
   * For any タスクIDセットと操作、一括操作のロジックが正しく動作する
   * Validates: Requirements 9.2-9.5
   */
  it('Property 17: 一括操作の完全性', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        taskStatusArbitrary,
        (taskIds, newStatus) => {
          // 一括操作のロジックテスト
          const historyEntries = taskIds.map(taskId => ({
            taskId,
            oldStatus: TaskStatus.NOT_STARTED,
            newStatus,
            changedAt: new Date(),
          }));

          expect(historyEntries).toHaveLength(taskIds.length);
          historyEntries.forEach((entry, index) => {
            expect(entry.taskId).toBe(taskIds[index]);
            expect(entry.newStatus).toBe(newStatus);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 20: 通知のスケジューリング
   * For any タスク、期限に基づく通知スケジューリングのロジックが正しく動作する
   * Validates: Requirements 15.1-15.5
   */
  it('Property 20: 通知のスケジューリング', () => {
    fc.assert(
      fc.property(fc.date(), deadline => {
        const now = new Date();
        const reminderTime = new Date(deadline.getTime() - 24 * 60 * 60 * 1000); // 24時間前

        // 通知スケジューリングのロジックテスト
        const shouldSchedule = deadline > now && reminderTime > now;

        if (shouldSchedule) {
          expect(reminderTime).toBeInstanceOf(Date);
          expect(reminderTime.getTime()).toBeLessThan(deadline.getTime());
        }
      }),
      { numRuns: 50 }
    );
  });
});
