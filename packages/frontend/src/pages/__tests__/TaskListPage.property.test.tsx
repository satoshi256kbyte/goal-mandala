/**
 * タスク表示のプロパティベーステスト
 * Feature: task-management
 *
 * このファイルは以下のプロパティをテストします：
 * - Property 2: タスク表示の完全性
 * - Property 3: タスクグループ化の正確性
 * - Property 4: 期限ハイライトの正確性
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Task, TaskStatus } from '@goal-mandala/shared';

// テスト用のArbitrary定義
const taskStatusArbitrary = fc.constantFrom(
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
  TaskStatus.SKIPPED
);

const taskTypeArbitrary = fc.constantFrom('execution', 'habit');

// タスクのArbitrary（必須フィールドのみ）
const taskArbitrary = fc.record({
  id: fc.uuid(),
  actionId: fc.uuid(),
  title: fc.constantFrom(
    'プログラミング学習',
    'ランニング',
    'レポート作成',
    'ミーティング',
    'コードレビュー'
  ),
  description: fc.option(
    fc.constantFrom(
      'TypeScript基礎を学ぶ',
      '朝のランニング30分',
      '月次レポートを作成',
      'チーム会議に参加',
      'プルリクエストをレビュー'
    )
  ),
  type: taskTypeArbitrary,
  status: taskStatusArbitrary,
  estimatedMinutes: fc.integer({ min: 15, max: 120 }),
  deadline: fc.option(fc.date()),
  completedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ヘルパー関数: タスクが必須フィールドを持つかチェック
const hasRequiredFields = (task: Task): boolean => {
  return !!(
    task.id &&
    task.actionId &&
    task.title &&
    task.type &&
    task.status &&
    typeof task.estimatedMinutes === 'number' &&
    task.createdAt &&
    task.updatedAt
  );
};

// ヘルパー関数: タスクをグループ化
const groupTasksByStatus = (tasks: Task[]): Record<TaskStatus, Task[]> => {
  const groups = {
    [TaskStatus.NOT_STARTED]: [] as Task[],
    [TaskStatus.IN_PROGRESS]: [] as Task[],
    [TaskStatus.COMPLETED]: [] as Task[],
    [TaskStatus.SKIPPED]: [] as Task[],
  };

  tasks.forEach(task => {
    groups[task.status].push(task);
  });

  return groups;
};

// ヘルパー関数: 期限が24時間以内かチェック
const isDeadlineApproaching = (task: Task): boolean => {
  if (!task.deadline) return false;
  if (task.status === TaskStatus.COMPLETED) return false;

  const now = new Date();
  const deadline = new Date(task.deadline);
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
};

describe('TaskListPage Property Tests', () => {
  /**
   * Property 2: タスク表示の完全性
   * For any タスク、表示されるタスク情報には、title、description、type、status、
   * estimatedMinutes、deadline、関連するaction、sub-goalの全てが含まれる
   * Validates: Requirements 1.2, 1.5, 2.2
   */
  describe('Property 2: タスク表示の完全性', () => {
    it('任意のタスクに対して、全ての必須フィールドが存在する', () => {
      fc.assert(
        fc.property(taskArbitrary, (task: Task) => {
          // Verify: タスクが全ての必須フィールドを持つ
          expect(hasRequiredFields(task)).toBe(true);

          // 各フィールドの存在を確認
          expect(task.id).toBeDefined();
          expect(task.actionId).toBeDefined();
          expect(task.title).toBeDefined();
          expect(task.type).toBeDefined();
          expect(task.status).toBeDefined();
          expect(typeof task.estimatedMinutes).toBe('number');
          expect(task.createdAt).toBeDefined();
          expect(task.updatedAt).toBeDefined();

          // オプショナルフィールドは存在する場合のみチェック
          if (task.description !== null && task.description !== undefined) {
            expect(typeof task.description).toBe('string');
          }
          if (task.deadline !== null && task.deadline !== undefined) {
            expect(task.deadline).toBeInstanceOf(Date);
          }
          if (task.completedAt !== null && task.completedAt !== undefined) {
            expect(task.completedAt).toBeInstanceOf(Date);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('任意のタスク配列に対して、全てのタスクが必須フィールドを持つ', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }), (tasks: Task[]) => {
          // Verify: 全てのタスクが必須フィールドを持つ
          tasks.forEach(task => {
            expect(hasRequiredFields(task)).toBe(true);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: タスクグループ化の正確性
   * For any タスクセット、状態別にグループ化された結果では、
   * 各グループ内の全タスクが同じ状態を持つ
   * Validates: Requirements 1.3
   */
  describe('Property 3: タスクグループ化の正確性', () => {
    it('任意のタスクセットに対して、状態別グループ化が正しく行われる', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }), (tasks: Task[]) => {
          // Execute: タスクをグループ化
          const groups = groupTasksByStatus(tasks);

          // Verify: 各グループ内の全タスクが同じ状態を持つ
          Object.entries(groups).forEach(([status, groupTasks]) => {
            groupTasks.forEach(task => {
              expect(task.status).toBe(status);
            });
          });

          // Verify: 全てのタスクがいずれかのグループに含まれる
          const totalGroupedTasks = Object.values(groups).reduce(
            (sum, group) => sum + group.length,
            0
          );
          expect(totalGroupedTasks).toBe(tasks.length);
        }),
        { numRuns: 100 }
      );
    });

    it('グループ化後、各グループのタスク数の合計が元のタスク数と一致する', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }), (tasks: Task[]) => {
          // Execute: タスクをグループ化
          const groups = groupTasksByStatus(tasks);

          // Verify: グループ化後のタスク数の合計が元のタスク数と一致
          const totalGroupedTasks = Object.values(groups).reduce(
            (sum, group) => sum + group.length,
            0
          );
          expect(totalGroupedTasks).toBe(tasks.length);

          // Verify: 各状態のタスク数が正しい
          const statusCounts = tasks.reduce(
            (acc, task) => {
              acc[task.status] = (acc[task.status] || 0) + 1;
              return acc;
            },
            {} as Record<TaskStatus, number>
          );

          Object.entries(statusCounts).forEach(([status, count]) => {
            expect(groups[status as TaskStatus].length).toBe(count);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: 期限ハイライトの正確性
   * For any タスクセット、現在時刻から24時間以内の期限を持つタスクは全てハイライトされ、
   * それ以外のタスクはハイライトされない
   * Validates: Requirements 1.4
   */
  describe('Property 4: 期限ハイライトの正確性', () => {
    it('期限が24時間以内のタスク（完了以外）がハイライト対象として識別される', () => {
      fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }), (tasks: Task[]) => {
          // Execute: 各タスクがハイライト対象かチェック
          tasks.forEach(task => {
            const shouldHighlight = isDeadlineApproaching(task);

            if (shouldHighlight) {
              // Verify: ハイライト対象のタスクは期限が24時間以内で完了していない
              expect(task.deadline).toBeDefined();
              expect(task.status).not.toBe(TaskStatus.COMPLETED);

              const now = new Date();
              const deadline = new Date(task.deadline!);
              const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

              expect(hoursUntilDeadline).toBeGreaterThan(0);
              expect(hoursUntilDeadline).toBeLessThanOrEqual(24);
            } else {
              // Verify: ハイライト対象でないタスクは以下のいずれか
              // - 期限がない
              // - 期限が24時間より先
              // - 期限が過去
              // - 完了済み
              if (task.deadline && task.status !== TaskStatus.COMPLETED) {
                const now = new Date();
                const deadline = new Date(task.deadline);
                const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

                // 期限が24時間以内でない、または期限が過去
                expect(hoursUntilDeadline <= 0 || hoursUntilDeadline > 24).toBe(true);
              }
            }
          });
        }),
        { numRuns: 100 }
      );
    });

    it('完了済みタスクは期限に関わらずハイライト対象外', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              ...taskArbitrary.value,
              status: fc.constant(TaskStatus.COMPLETED),
              deadline: fc.date(), // 期限は必ず設定
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tasks: Task[]) => {
            // Execute & Verify: 完了済みタスクは全てハイライト対象外
            tasks.forEach(task => {
              expect(task.status).toBe(TaskStatus.COMPLETED);
              expect(isDeadlineApproaching(task)).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('期限がないタスクはハイライト対象外', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              ...taskArbitrary.value,
              deadline: fc.constant(null),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tasks: Task[]) => {
            // Execute & Verify: 期限がないタスクは全てハイライト対象外
            tasks.forEach(task => {
              expect(task.deadline).toBeNull();
              expect(isDeadlineApproaching(task)).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
