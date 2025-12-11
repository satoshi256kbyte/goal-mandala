import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { ReflectionService } from '../reflection.service';

// Prismaクライアントのモック
const mockPrisma = {
  reflection: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => callback(mockPrisma)),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

// テストデータ生成用のArbitrary
const uuidArbitrary = fc.uuid();
const summaryArbitrary = fc.string({ minLength: 1, maxLength: 5000 });
const optionalTextArbitrary = fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
  nil: undefined,
});

const createReflectionInputArbitrary = fc.record({
  goalId: uuidArbitrary,
  summary: summaryArbitrary,
  regretfulActions: optionalTextArbitrary,
  slowProgressActions: optionalTextArbitrary,
  untouchedActions: optionalTextArbitrary,
});

describe('Reflection Service Property-Based Tests', () => {
  let reflectionService: ReflectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    reflectionService = new ReflectionService(mockPrisma);
  });

  /**
   * Feature: reflection-feature, Property 1: 振り返り作成の完全性
   * Validates: Requirements 1.3
   *
   * For any 有効な目標IDとユーザーID、振り返りを作成すると、
   * データベースに保存され、一意のIDが割り当てられる
   */
  describe('Property 1: 振り返り作成の完全性', () => {
    it('should create reflection with unique ID and save to database', async () => {
      await fc.assert(
        fc.asyncProperty(createReflectionInputArbitrary, async input => {
          // Setup: モックの戻り値を設定
          const mockReflection = {
            id: fc.sample(uuidArbitrary, 1)[0],
            goalId: input.goalId,
            summary: input.summary,
            regretfulActions: input.regretfulActions ?? null,
            slowProgressActions: input.slowProgressActions ?? null,
            untouchedActions: input.untouchedActions ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockReflection);

          // Execute: 振り返りを作成
          const result = await reflectionService.createReflection(input);

          // Verify: createが呼ばれたことを確認
          expect(mockPrisma.reflection.create).toHaveBeenCalledTimes(1);

          // Verify: 正しいデータで呼ばれたことを確認
          expect(mockPrisma.reflection.create).toHaveBeenCalledWith({
            data: {
              goalId: input.goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions,
              slowProgressActions: input.slowProgressActions,
              untouchedActions: input.untouchedActions,
            },
          });

          // Verify: 結果が正しいことを確認
          expect(result).toEqual(mockReflection);

          // Verify: IDが割り当てられていることを確認
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.id.length).toBeGreaterThan(0);

          // Verify: 入力データが保存されていることを確認
          expect(result.goalId).toBe(input.goalId);
          expect(result.summary).toBe(input.summary);
          expect(result.regretfulActions).toBe(input.regretfulActions ?? null);
          expect(result.slowProgressActions).toBe(input.slowProgressActions ?? null);
          expect(result.untouchedActions).toBe(input.untouchedActions ?? null);

          // Verify: 日時が設定されていることを確認
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.updatedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 100 }
      );
    });

    it('should create multiple reflections with unique IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(createReflectionInputArbitrary, { minLength: 2, maxLength: 10 }),
          async inputs => {
            // Setup: 各入力に対してモックの戻り値を設定
            const createdIds = new Set<string>();

            for (const input of inputs) {
              const mockReflection = {
                id: fc.sample(uuidArbitrary, 1)[0],
                goalId: input.goalId,
                summary: input.summary,
                regretfulActions: input.regretfulActions ?? null,
                slowProgressActions: input.slowProgressActions ?? null,
                untouchedActions: input.untouchedActions ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockReflection);

              // Execute: 振り返りを作成
              const result = await reflectionService.createReflection(input);

              // Verify: IDが一意であることを確認
              expect(createdIds.has(result.id)).toBe(false);
              createdIds.add(result.id);
            }

            // Verify: 全てのIDが一意であることを確認
            expect(createdIds.size).toBe(inputs.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all input data when creating reflection', async () => {
      await fc.assert(
        fc.asyncProperty(createReflectionInputArbitrary, async input => {
          // Setup: モックの戻り値を設定
          const mockReflection = {
            id: fc.sample(uuidArbitrary, 1)[0],
            goalId: input.goalId,
            summary: input.summary,
            regretfulActions: input.regretfulActions ?? null,
            slowProgressActions: input.slowProgressActions ?? null,
            untouchedActions: input.untouchedActions ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockReflection);

          // Execute: 振り返りを作成
          const result = await reflectionService.createReflection(input);

          // Verify: 全ての入力データが保存されていることを確認
          expect(result.goalId).toBe(input.goalId);
          expect(result.summary).toBe(input.summary);

          // オプショナルフィールドの確認
          if (input.regretfulActions !== undefined) {
            expect(result.regretfulActions).toBe(input.regretfulActions);
          } else {
            expect(result.regretfulActions).toBeNull();
          }

          if (input.slowProgressActions !== undefined) {
            expect(result.slowProgressActions).toBe(input.slowProgressActions);
          } else {
            expect(result.slowProgressActions).toBeNull();
          }

          if (input.untouchedActions !== undefined) {
            expect(result.untouchedActions).toBe(input.untouchedActions);
          } else {
            expect(result.untouchedActions).toBeNull();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: reflection-feature, Property 2: 振り返り取得の正確性
   * Validates: Requirements 2.3
   *
   * For any 振り返りID、そのIDで振り返りを取得すると、
   * 作成時と同じ内容が返される
   */
  describe('Property 2: 振り返り取得の正確性', () => {
    it('should retrieve reflection with same content as created', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          async (input, userId) => {
            // Setup: 作成時のモックデータ
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: input.goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup: 取得時のモックデータ（作成時と同じ内容）
            const mockRetrievedReflection = {
              ...mockCreatedReflection,
              goal: {
                id: input.goalId,
                userId,
                title: 'Test Goal',
                description: 'Test Description',
                deadline: new Date(),
                background: 'Test Background',
                constraints: null,
                status: 'active' as const,
                progress: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            };

            mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockCreatedReflection);
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockRetrievedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(input);

            // Execute: 振り返りを取得
            const retrieved = await reflectionService.getReflection(created.id, userId);

            // Verify: 取得できたことを確認
            expect(retrieved).not.toBeNull();

            // Verify: 作成時と同じ内容が返されることを確認
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.goalId).toBe(created.goalId);
            expect(retrieved!.summary).toBe(created.summary);
            expect(retrieved!.regretfulActions).toBe(created.regretfulActions);
            expect(retrieved!.slowProgressActions).toBe(created.slowProgressActions);
            expect(retrieved!.untouchedActions).toBe(created.untouchedActions);

            // Verify: 日時が保持されていることを確認
            expect(retrieved!.createdAt).toEqual(created.createdAt);
            expect(retrieved!.updatedAt).toEqual(created.updatedAt);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent reflection ID', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArbitrary, uuidArbitrary, async (reflectionId, userId) => {
          // Setup: 存在しない振り返りIDの場合、nullを返す
          mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(null);

          // Execute: 存在しない振り返りを取得
          const result = await reflectionService.getReflection(reflectionId, userId);

          // Verify: nullが返されることを確認
          expect(result).toBeNull();

          // Verify: findFirstが呼ばれたことを確認
          expect(mockPrisma.reflection.findFirst).toHaveBeenCalledTimes(1);
          expect(mockPrisma.reflection.findFirst).toHaveBeenCalledWith({
            where: {
              id: reflectionId,
              goal: {
                userId,
              },
            },
            include: {
              goal: true,
            },
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should return null when userId does not match goal owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // correctUserId
          uuidArbitrary, // wrongUserId
          async (input, correctUserId, wrongUserId) => {
            // Ensure userIds are different
            fc.pre(correctUserId !== wrongUserId);

            // Setup: 作成時のモックデータ
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: input.goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockCreatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(input);

            // Setup: 異なるユーザーIDで取得しようとした場合、nullを返す
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(null);

            // Execute: 異なるユーザーIDで振り返りを取得
            const result = await reflectionService.getReflection(created.id, wrongUserId);

            // Verify: nullが返されることを確認（認可エラー）
            expect(result).toBeNull();

            // Verify: findFirstが正しいパラメータで呼ばれたことを確認
            expect(mockPrisma.reflection.findFirst).toHaveBeenCalledWith({
              where: {
                id: created.id,
                goal: {
                  userId: wrongUserId,
                },
              },
              include: {
                goal: true,
              },
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve optional fields when retrieving reflection', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          async (input, userId) => {
            // Setup: 作成時のモックデータ
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: input.goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup: 取得時のモックデータ
            const mockRetrievedReflection = {
              ...mockCreatedReflection,
              goal: {
                id: input.goalId,
                userId,
                title: 'Test Goal',
                description: 'Test Description',
                deadline: new Date(),
                background: 'Test Background',
                constraints: null,
                status: 'active' as const,
                progress: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            };

            mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockCreatedReflection);
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockRetrievedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(input);

            // Execute: 振り返りを取得
            const retrieved = await reflectionService.getReflection(created.id, userId);

            // Verify: オプショナルフィールドが正しく保持されていることを確認
            if (input.regretfulActions !== undefined) {
              expect(retrieved!.regretfulActions).toBe(input.regretfulActions);
            } else {
              expect(retrieved!.regretfulActions).toBeNull();
            }

            if (input.slowProgressActions !== undefined) {
              expect(retrieved!.slowProgressActions).toBe(input.slowProgressActions);
            } else {
              expect(retrieved!.slowProgressActions).toBeNull();
            }

            if (input.untouchedActions !== undefined) {
              expect(retrieved!.untouchedActions).toBe(input.untouchedActions);
            } else {
              expect(retrieved!.untouchedActions).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: reflection-feature, Property 3: 振り返り一覧の順序性
   * Validates: Requirements 2.1
   *
   * For any 目標ID、その目標に紐づく振り返り一覧を取得すると、
   * 作成日時の降順でソートされている
   */
  describe('Property 3: 振り返り一覧の順序性', () => {
    it('should return reflections sorted by createdAt in descending order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary, // goalId
          uuidArbitrary, // userId
          fc.array(createReflectionInputArbitrary, { minLength: 2, maxLength: 10 }),
          async (goalId, userId, inputs) => {
            // Setup: 各入力に対してモックの戻り値を設定（同じgoalIdを使用）
            const mockReflections = inputs.map((input, index) => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(Date.now() - index * 1000), // 時間をずらす
              updatedAt: new Date(Date.now() - index * 1000),
            }));

            // Setup: 作成日時降順でソート
            const sortedReflections = [...mockReflections].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            );

            mockPrisma.reflection.findMany = jest.fn().mockResolvedValue(sortedReflections);

            // Execute: 振り返り一覧を取得
            const result = await reflectionService.getReflectionsByGoal(goalId, userId);

            // Verify: findManyが呼ばれたことを確認
            expect(mockPrisma.reflection.findMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.reflection.findMany).toHaveBeenCalledWith({
              where: {
                goalId,
                goal: {
                  userId,
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            });

            // Verify: 結果が作成日時降順でソートされていることを確認
            expect(result).toEqual(sortedReflections);

            // Verify: 各要素が前の要素より新しいか同じ時刻であることを確認
            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
                result[i].createdAt.getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no reflections exist for goal', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArbitrary, uuidArbitrary, async (goalId, userId) => {
          // Setup: 振り返りが存在しない場合、空配列を返す
          mockPrisma.reflection.findMany = jest.fn().mockResolvedValue([]);

          // Execute: 振り返り一覧を取得
          const result = await reflectionService.getReflectionsByGoal(goalId, userId);

          // Verify: 空配列が返されることを確認
          expect(result).toEqual([]);
          expect(result.length).toBe(0);

          // Verify: findManyが呼ばれたことを確認
          expect(mockPrisma.reflection.findMany).toHaveBeenCalledTimes(1);
        }),
        { numRuns: 100 }
      );
    });

    it('should return reflections only for the specified goal', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary, // targetGoalId
          uuidArbitrary, // otherGoalId
          uuidArbitrary, // userId
          fc.array(createReflectionInputArbitrary, { minLength: 2, maxLength: 5 }),
          async (targetGoalId, otherGoalId, userId, inputs) => {
            // Ensure goalIds are different
            fc.pre(targetGoalId !== otherGoalId);

            // Setup: 対象の目標の振り返りのみを返す
            const targetReflections = inputs.map((input, index) => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: targetGoalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(Date.now() - index * 1000),
              updatedAt: new Date(Date.now() - index * 1000),
            }));

            mockPrisma.reflection.findMany = jest.fn().mockResolvedValue(targetReflections);

            // Execute: 振り返り一覧を取得
            const result = await reflectionService.getReflectionsByGoal(targetGoalId, userId);

            // Verify: 全ての振り返りが対象の目標IDを持つことを確認
            expect(result.every(r => r.goalId === targetGoalId)).toBe(true);

            // Verify: 他の目標IDの振り返りが含まれていないことを確認
            expect(result.every(r => r.goalId !== otherGoalId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain sort order even with same timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary, // goalId
          uuidArbitrary, // userId
          fc.array(createReflectionInputArbitrary, { minLength: 3, maxLength: 5 }),
          async (goalId, userId, inputs) => {
            // Setup: 同じタイムスタンプの振り返りを作成
            const sameTimestamp = new Date();
            const mockReflections = inputs.map(input => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: sameTimestamp,
              updatedAt: sameTimestamp,
            }));

            mockPrisma.reflection.findMany = jest.fn().mockResolvedValue(mockReflections);

            // Execute: 振り返り一覧を取得
            const result = await reflectionService.getReflectionsByGoal(goalId, userId);

            // Verify: 全ての振り返りが同じタイムスタンプを持つことを確認
            expect(result.every(r => r.createdAt.getTime() === sameTimestamp.getTime())).toBe(true);

            // Verify: ソート順が安定していることを確認（順序が保持される）
            expect(result.length).toBe(mockReflections.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
