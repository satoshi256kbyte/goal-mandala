import * as fc from 'fast-check';
import { createReflectionSchema, updateReflectionSchema } from '../reflection.schema';

/**
 * Property 8: バリデーションエラーの一貫性
 *
 * For any 無効な入力データ、バリデーションエラーが発生し、データベースには保存されない
 *
 * Validates: Requirements 1.4, 3.4
 */
describe('Property 8: バリデーションエラーの一貫性', () => {
  describe('createReflectionSchema', () => {
    it('無効なgoalId（UUID以外）でバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => !isValidUUID(s)), // UUID以外の文字列
          fc.string({ minLength: 1, maxLength: 5000 }), // 有効なsummary
          async (invalidGoalId, summary) => {
            const result = createReflectionSchema.safeParse({
              goalId: invalidGoalId,
              summary,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['goalId']);
              expect(result.error.issues[0].message).toBe('目標IDの形式が正しくありません');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('空のsummaryでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 有効なgoalId
          async goalId => {
            const result = createReflectionSchema.safeParse({
              goalId,
              summary: '',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['summary']);
              expect(result.error.issues[0].message).toBe('総括は必須です');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('5000文字を超えるsummaryでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 有効なgoalId
          fc.string({ minLength: 5001, maxLength: 6000 }), // 5000文字超
          async (goalId, longSummary) => {
            const result = createReflectionSchema.safeParse({
              goalId,
              summary: longSummary,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['summary']);
              expect(result.error.issues[0].message).toBe('総括は5000文字以内で入力してください');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('2000文字を超えるregretfulActionsでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 有効なgoalId
          fc.string({ minLength: 1, maxLength: 5000 }), // 有効なsummary
          fc.string({ minLength: 2001, maxLength: 3000 }), // 2000文字超
          async (goalId, summary, longRegretfulActions) => {
            const result = createReflectionSchema.safeParse({
              goalId,
              summary,
              regretfulActions: longRegretfulActions,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['regretfulActions']);
              expect(result.error.issues[0].message).toBe(
                '惜しかったアクションは2000文字以内で入力してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('2000文字を超えるslowProgressActionsでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 有効なgoalId
          fc.string({ minLength: 1, maxLength: 5000 }), // 有効なsummary
          fc.string({ minLength: 2001, maxLength: 3000 }), // 2000文字超
          async (goalId, summary, longSlowProgressActions) => {
            const result = createReflectionSchema.safeParse({
              goalId,
              summary,
              slowProgressActions: longSlowProgressActions,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['slowProgressActions']);
              expect(result.error.issues[0].message).toBe(
                '進まなかったアクションは2000文字以内で入力してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('2000文字を超えるuntouchedActionsでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 有効なgoalId
          fc.string({ minLength: 1, maxLength: 5000 }), // 有効なsummary
          fc.string({ minLength: 2001, maxLength: 3000 }), // 2000文字超
          async (goalId, summary, longUntouchedActions) => {
            const result = createReflectionSchema.safeParse({
              goalId,
              summary,
              untouchedActions: longUntouchedActions,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['untouchedActions']);
              expect(result.error.issues[0].message).toBe(
                '未着手アクションは2000文字以内で入力してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('有効な入力データでバリデーションが成功する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 有効なgoalId
          fc.string({ minLength: 1, maxLength: 5000 }), // 有効なsummary
          fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
            nil: undefined,
          }), // 有効なregretfulActions
          fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
            nil: undefined,
          }), // 有効なslowProgressActions
          fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
            nil: undefined,
          }), // 有効なuntouchedActions
          async (goalId, summary, regretfulActions, slowProgressActions, untouchedActions) => {
            const result = createReflectionSchema.safeParse({
              goalId,
              summary,
              regretfulActions,
              slowProgressActions,
              untouchedActions,
            });

            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.goalId).toBe(goalId);
              expect(result.data.summary).toBe(summary);
              expect(result.data.regretfulActions).toBe(regretfulActions);
              expect(result.data.slowProgressActions).toBe(slowProgressActions);
              expect(result.data.untouchedActions).toBe(untouchedActions);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('updateReflectionSchema', () => {
    it('空のsummaryでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // ダミーの arbitrary
          async () => {
            const result = updateReflectionSchema.safeParse({
              summary: '',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['summary']);
              expect(result.error.issues[0].message).toBe('総括は必須です');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('5000文字を超えるsummaryでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5001, maxLength: 6000 }), // 5000文字超
          async longSummary => {
            const result = updateReflectionSchema.safeParse({
              summary: longSummary,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['summary']);
              expect(result.error.issues[0].message).toBe('総括は5000文字以内で入力してください');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('2000文字を超えるregretfulActionsでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2001, maxLength: 3000 }), // 2000文字超
          async longRegretfulActions => {
            const result = updateReflectionSchema.safeParse({
              regretfulActions: longRegretfulActions,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['regretfulActions']);
              expect(result.error.issues[0].message).toBe(
                '惜しかったアクションは2000文字以内で入力してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('2000文字を超えるslowProgressActionsでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2001, maxLength: 3000 }), // 2000文字超
          async longSlowProgressActions => {
            const result = updateReflectionSchema.safeParse({
              slowProgressActions: longSlowProgressActions,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['slowProgressActions']);
              expect(result.error.issues[0].message).toBe(
                '進まなかったアクションは2000文字以内で入力してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('2000文字を超えるuntouchedActionsでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2001, maxLength: 3000 }), // 2000文字超
          async longUntouchedActions => {
            const result = updateReflectionSchema.safeParse({
              untouchedActions: longUntouchedActions,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].path).toEqual(['untouchedActions']);
              expect(result.error.issues[0].message).toBe(
                '未着手アクションは2000文字以内で入力してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('空のオブジェクトでバリデーションエラーが発生する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // ダミーの arbitrary
          async () => {
            const result = updateReflectionSchema.safeParse({});

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues).toHaveLength(1);
              expect(result.error.issues[0].message).toBe(
                '少なくとも1つのフィールドを更新してください'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('有効な入力データでバリデーションが成功する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.string({ minLength: 1, maxLength: 5000 }), {
            nil: undefined,
          }), // 有効なsummary
          fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
            nil: undefined,
          }), // 有効なregretfulActions
          fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
            nil: undefined,
          }), // 有効なslowProgressActions
          fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
            nil: undefined,
          }), // 有効なuntouchedActions
          async (summary, regretfulActions, slowProgressActions, untouchedActions) => {
            // 少なくとも1つのフィールドが存在する場合のみテスト
            if (
              summary !== undefined ||
              regretfulActions !== undefined ||
              slowProgressActions !== undefined ||
              untouchedActions !== undefined
            ) {
              const result = updateReflectionSchema.safeParse({
                summary,
                regretfulActions,
                slowProgressActions,
                untouchedActions,
              });

              expect(result.success).toBe(true);
              if (result.success) {
                expect(result.data.summary).toBe(summary);
                expect(result.data.regretfulActions).toBe(regretfulActions);
                expect(result.data.slowProgressActions).toBe(slowProgressActions);
                expect(result.data.untouchedActions).toBe(untouchedActions);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * UUID形式の文字列かどうかを判定するヘルパー関数
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
