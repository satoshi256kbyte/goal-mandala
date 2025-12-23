import * as fc from 'fast-check';
import { ActionProgressService, ActionProgress } from '../action-progress.service';

describe('ActionProgressService - Property-Based Tests', () => {
  let actionProgressService: ActionProgressService;

  beforeEach(() => {
    // Prismaクライアントは不要（categorizeActionsメソッドのみテスト）
    actionProgressService = new ActionProgressService({} as any);
  });

  describe('Property 6: アクション進捗分類の正確性', () => {
    it('should categorize actions with progress >= 80 as regretful', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              progress: fc.integer({ min: 80, max: 100 }),
              subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 進捗80%以上のアクションが全て「惜しかった」に分類されることを確認
            expect(result.regretful).toHaveLength(actions.length);
            expect(result.slowProgress).toHaveLength(0);
            expect(result.untouched).toHaveLength(0);

            // Verify: 全てのアクションが含まれていることを確認
            const regretfulIds = result.regretful.map(a => a.id).sort();
            const actionIds = actions.map(a => a.id).sort();
            expect(regretfulIds).toEqual(actionIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize actions with progress <= 20 (but > 0) as slowProgress', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              progress: fc.integer({ min: 1, max: 20 }),
              subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 進捗1-20%のアクションが全て「進まなかった」に分類されることを確認
            expect(result.regretful).toHaveLength(0);
            expect(result.slowProgress).toHaveLength(actions.length);
            expect(result.untouched).toHaveLength(0);

            // Verify: 全てのアクションが含まれていることを確認
            const slowProgressIds = result.slowProgress.map(a => a.id).sort();
            const actionIds = actions.map(a => a.id).sort();
            expect(slowProgressIds).toEqual(actionIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize actions with progress = 0 as untouched', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              progress: fc.constant(0),
              subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 進捗0%のアクションが全て「未着手」に分類されることを確認
            expect(result.regretful).toHaveLength(0);
            expect(result.slowProgress).toHaveLength(0);
            expect(result.untouched).toHaveLength(actions.length);

            // Verify: 全てのアクションが含まれていることを確認
            const untouchedIds = result.untouched.map(a => a.id).sort();
            const actionIds = actions.map(a => a.id).sort();
            expect(untouchedIds).toEqual(actionIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not categorize actions with progress between 21-79', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              progress: fc.integer({ min: 21, max: 79 }),
              subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 進捗21-79%のアクションはどのカテゴリにも含まれないことを確認
            expect(result.regretful).toHaveLength(0);
            expect(result.slowProgress).toHaveLength(0);
            expect(result.untouched).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly categorize mixed progress actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              progress: fc.integer({ min: 0, max: 100 }),
              subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 各カテゴリの進捗範囲が正しいことを確認
            for (const action of result.regretful) {
              expect(action.progress).toBeGreaterThanOrEqual(80);
              expect(action.progress).toBeLessThanOrEqual(100);
            }

            for (const action of result.slowProgress) {
              expect(action.progress).toBeGreaterThan(0);
              expect(action.progress).toBeLessThanOrEqual(20);
            }

            for (const action of result.untouched) {
              expect(action.progress).toBe(0);
            }

            // Verify: 全てのアクションが正しく分類されていることを確認
            const categorizedCount =
              result.regretful.length + result.slowProgress.length + result.untouched.length;

            const expectedCount = actions.filter(
              a => a.progress === 0 || a.progress <= 20 || a.progress >= 80
            ).length;

            expect(categorizedCount).toBe(expectedCount);

            // Verify: 重複がないことを確認
            const allIds = [
              ...result.regretful.map(a => a.id),
              ...result.slowProgress.map(a => a.id),
              ...result.untouched.map(a => a.id),
            ];
            const uniqueIds = new Set(allIds);
            expect(allIds.length).toBe(uniqueIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle boundary values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                progress: fc.constant(0),
                subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                progress: fc.constant(20),
                subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                progress: fc.constant(21),
                subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                progress: fc.constant(79),
                subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                progress: fc.constant(80),
                subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                progress: fc.constant(100),
                subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
              })
            ),
            { minLength: 1, maxLength: 30 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 境界値が正しく分類されていることを確認
            for (const action of actions) {
              if (action.progress === 0) {
                expect(result.untouched.some(a => a.id === action.id)).toBe(true);
              } else if (action.progress === 20) {
                expect(result.slowProgress.some(a => a.id === action.id)).toBe(true);
              } else if (action.progress === 21 || action.progress === 79) {
                // 21-79は分類されない
                expect(result.regretful.some(a => a.id === action.id)).toBe(false);
                expect(result.slowProgress.some(a => a.id === action.id)).toBe(false);
                expect(result.untouched.some(a => a.id === action.id)).toBe(false);
              } else if (action.progress === 80 || action.progress === 100) {
                expect(result.regretful.some(a => a.id === action.id)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve action data during categorization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              progress: fc.integer({ min: 0, max: 100 }),
              subGoalTitle: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 30 }
          ),
          async actions => {
            // Execute: アクションを分類
            const result = actionProgressService.categorizeActions(actions);

            // Verify: 分類されたアクションのデータが元のデータと一致することを確認
            const allCategorized = [
              ...result.regretful,
              ...result.slowProgress,
              ...result.untouched,
            ];

            for (const categorized of allCategorized) {
              const original = actions.find(a => a.id === categorized.id);
              expect(original).toBeDefined();
              expect(categorized.title).toBe(original!.title);
              expect(categorized.progress).toBe(original!.progress);
              expect(categorized.subGoalTitle).toBe(original!.subGoalTitle);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
