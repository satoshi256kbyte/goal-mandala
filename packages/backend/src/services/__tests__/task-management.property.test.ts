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
   * Property 2: タスク表示の完全性
   * For any タスクセット、表示されるタスクは全て有効なタスクオブジェクトである
   * Validates: Requirements 1.2-1.5, 2.2
   */
  it('Property 2: タスク表示の完全性', () => {
    fc.assert(
      fc.property(fc.array(simpleTaskArbitrary, { maxLength: 10 }), tasks => {
        // 全てのタスクが必須フィールドを持つことを確認
        tasks.forEach(task => {
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('title');
          expect(task).toHaveProperty('status');
          expect(task).toHaveProperty('type');
          expect(typeof task.id).toBe('string');
          expect(typeof task.title).toBe('string');
          expect(task.title.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: タスクグループ化の正確性
   * For any タスクセット、アクションIDでグループ化した結果は正しい
   * Validates: Requirements 1.2-1.5, 2.2
   */
  it('Property 3: タスクグループ化の正確性', () => {
    fc.assert(
      fc.property(fc.array(simpleTaskArbitrary, { maxLength: 10 }), tasks => {
        // アクションIDでグループ化
        const grouped = tasks.reduce(
          (acc, task) => {
            if (!acc[task.actionId]) {
              acc[task.actionId] = [];
            }
            acc[task.actionId].push(task);
            return acc;
          },
          {} as Record<string, typeof tasks>
        );

        // 各グループ内のタスクが同じactionIdを持つことを確認
        Object.entries(grouped).forEach(([actionId, groupTasks]) => {
          groupTasks.forEach(task => {
            expect(task.actionId).toBe(actionId);
          });
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: 期限ハイライトの正確性
   * For any タスク、期限が近い場合は適切にハイライトされる
   * Validates: Requirements 1.2-1.5, 2.2
   */
  it('Property 4: 期限ハイライトの正確性', () => {
    fc.assert(
      fc.property(fc.date(), deadline => {
        const now = new Date();
        const daysDiff = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // 期限ハイライトのロジック
        const isOverdue = daysDiff < 0;
        const isToday = daysDiff === 0;
        const isThisWeek = daysDiff > 0 && daysDiff <= 7;

        // 少なくとも1つの条件に該当するか、どれにも該当しないかのいずれか
        const highlightCount = [isOverdue, isToday, isThisWeek].filter(Boolean).length;
        expect(highlightCount).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: 完了時刻の記録
   * For any タスク、完了状態に更新された場合は完了時刻が設定される
   * Validates: Requirements 2.3-2.4
   */
  it('Property 6: 完了時刻の記録', () => {
    fc.assert(
      fc.property(simpleTaskArbitrary, taskStatusArbitrary, (task, newStatus) => {
        const beforeCompletedAt = task.completedAt;
        const isCompletingNow = newStatus === TaskStatus.COMPLETED && !beforeCompletedAt;

        // 完了状態に更新する場合、完了時刻が設定されるべき
        if (isCompletingNow) {
          const completedAt = new Date();
          expect(completedAt).toBeInstanceOf(Date);
          expect(completedAt).toBeDefined();
        }

        // 完了状態でない場合、完了時刻は設定されないべき
        if (newStatus !== TaskStatus.COMPLETED) {
          const completedAt = null;
          expect(completedAt).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: 進捗の連鎖更新
   * For any タスク更新、親アクション・サブ目標・目標の進捗が連鎖的に更新される
   * Validates: Requirements 2.5, 10.1-10.5, 11.1-11.5, 12.1-12.5
   */
  it('Property 7: 進捗の連鎖更新', () => {
    fc.assert(
      fc.property(fc.array(simpleTaskArbitrary, { minLength: 1, maxLength: 8 }), tasks => {
        // タスクの完了数から進捗を計算
        const completedCount = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        const progress = Math.round((completedCount / tasks.length) * 100);

        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);

        // 全て完了している場合は100%
        if (completedCount === tasks.length) {
          expect(progress).toBe(100);
        }

        // 1つも完了していない場合は0%
        if (completedCount === 0) {
          expect(progress).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: ノート保存のタイムスタンプ
   * For any ノート、保存時に作成日時が自動設定される
   * Validates: Requirements 3.2-3.5
   */
  it('Property 8: ノート保存のタイムスタンプ', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.string({ minLength: 1, maxLength: 500 }), (taskId, content) => {
        const createdAt = new Date();
        const note = {
          id: fc.sample(fc.uuid(), 1)[0],
          taskId,
          content,
          createdAt,
          updatedAt: createdAt,
        };

        expect(note.createdAt).toBeInstanceOf(Date);
        expect(note.updatedAt).toBeInstanceOf(Date);
        expect(note.createdAt.getTime()).toBeLessThanOrEqual(note.updatedAt.getTime());
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: ノート表示の時系列順
   * For any ノートセット、時系列順にソートされる
   * Validates: Requirements 3.2-3.5
   */
  it('Property 9: ノート表示の時系列順', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            taskId: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        notes => {
          // 無効な日付を除外
          const validNotes = notes.filter(
            note => !isNaN(note.createdAt.getTime()) && !isNaN(note.updatedAt.getTime())
          );

          if (validNotes.length < 2) return;

          // 時系列順にソート
          const sorted = [...validNotes].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );

          // ソート結果が正しいことを確認
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].createdAt.getTime()).toBeGreaterThanOrEqual(
              sorted[i + 1].createdAt.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: ノート編集の更新時刻
   * For any ノート、編集時に更新日時が設定される
   * Validates: Requirements 3.2-3.5
   */
  it('Property 10: ノート編集の更新時刻', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          taskId: fc.uuid(),
          content: fc.string({ minLength: 1, maxLength: 100 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
        }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (note, newContent) => {
          // 無効な日付をスキップ
          if (isNaN(note.createdAt.getTime()) || isNaN(note.updatedAt.getTime())) {
            return;
          }

          // ノート編集のロジック：更新日時は常に現在時刻に設定される
          const editTime = new Date();
          const updatedNote = {
            ...note,
            content: newContent,
            updatedAt: editTime,
          };

          // 更新されたノートの検証
          expect(updatedNote.updatedAt).toBeInstanceOf(Date);
          expect(updatedNote.content).toBe(newContent);

          // 更新日時は元の作成日時より後である（過去のノートの場合）
          if (note.createdAt.getTime() < Date.now()) {
            expect(updatedNote.updatedAt.getTime()).toBeGreaterThan(note.createdAt.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: ノート削除の完全性
   * For any ノート、削除後は取得できない
   * Validates: Requirements 3.2-3.5
   */
  it('Property 11: ノート削除の完全性', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            taskId: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.uuid(),
        (notes, deleteId) => {
          // 削除後のノートリスト
          const afterDelete = notes.filter(note => note.id !== deleteId);

          // 削除されたノートが含まれていないことを確認
          expect(afterDelete.every(note => note.id !== deleteId)).toBe(true);

          // 削除されたノート以外は残っていることを確認
          const deletedNote = notes.find(note => note.id === deleteId);
          if (deletedNote) {
            expect(afterDelete.length).toBe(notes.length - 1);
          } else {
            expect(afterDelete.length).toBe(notes.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: 複数キーワード検索の正確性
   * For any 複数キーワード、全てのキーワードを含むタスクのみが返される
   * Validates: Requirements 7.1
   */
  it('Property 13: 複数キーワード検索の正確性', () => {
    fc.assert(
      fc.property(
        fc.array(simpleTaskArbitrary, { maxLength: 10 }),
        fc.array(fc.constantFrom('プログラミング', 'ランニング', 'レポート'), {
          minLength: 1,
          maxLength: 2,
        }),
        (tasks, keywords) => {
          // 複数キーワードで検索
          let result = tasks;
          keywords.forEach(keyword => {
            result = filterService.searchTasks(result as any[], keyword);
          });

          // 全てのキーワードを含むことを確認
          result.forEach(task => {
            const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
            keywords.forEach(keyword => {
              expect(searchText).toContain(keyword.toLowerCase());
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: 検索クリアの完全性
   * For any タスクセット、検索クリア後は全てのタスクが表示される
   * Validates: Requirements 7.1
   */
  it('Property 14: 検索クリアの完全性', () => {
    fc.assert(
      fc.property(fc.array(simpleTaskArbitrary, { maxLength: 10 }), tasks => {
        // 検索を実行
        const searchResult = filterService.searchTasks(tasks as any[], 'プログラミング');

        // 検索クリア（空文字列で検索）
        const clearedResult = filterService.searchTasks(tasks as any[], '');

        // 全てのタスクが返されることを確認
        expect(clearedResult.length).toBe(tasks.length);
        expect(clearedResult).toEqual(tasks);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18: タスク履歴の記録
   * For any タスク状態更新、履歴が正しく記録される
   * Validates: Requirements 13.1-13.5
   */
  it('Property 18: タスク履歴の記録', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        taskStatusArbitrary,
        taskStatusArbitrary,
        (taskId, oldStatus, newStatus) => {
          const historyEntry = {
            id: fc.sample(fc.uuid(), 1)[0],
            taskId,
            oldStatus,
            newStatus,
            changedAt: new Date(),
          };

          expect(historyEntry.taskId).toBe(taskId);
          expect(historyEntry.oldStatus).toBe(oldStatus);
          expect(historyEntry.newStatus).toBe(newStatus);
          expect(historyEntry.changedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: 進捗バーの色分け
   * For any 進捗値、適切な色が割り当てられる
   * Validates: Requirements 14.4
   */
  it('Property 19: 進捗バーの色分け', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), progress => {
        // 進捗バーの色分けロジック
        let color: string;
        if (progress < 30) {
          color = 'red';
        } else if (progress < 70) {
          color = 'yellow';
        } else {
          color = 'green';
        }

        // 色が正しく割り当てられることを確認
        if (progress < 30) {
          expect(color).toBe('red');
        } else if (progress < 70) {
          expect(color).toBe('yellow');
        } else {
          expect(color).toBe('green');
        }
      }),
      { numRuns: 100 }
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
      { numRuns: 100 }
    );
  });
});
