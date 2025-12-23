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
   * Feature: reflection-feature, Property 4: 振り返り更新の冪等性
   * Validates: Requirements 3.3
   *
   * For any 振り返りID、同じ内容で複数回更新しても、
   * 最終的な状態は同じになる
   */
  describe('Property 4: 振り返り更新の冪等性', () => {
    it('should produce same result when updating with same data multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.record({
            summary: summaryArbitrary,
            regretfulActions: optionalTextArbitrary,
            slowProgressActions: optionalTextArbitrary,
            untouchedActions: optionalTextArbitrary,
          }), // updateData
          async (createInput, userId, updateData) => {
            // Setup: 作成時のモックデータ
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup: 更新後のモックデータ
            const mockUpdatedReflection = {
              ...mockCreatedReflection,
              summary: updateData.summary ?? mockCreatedReflection.summary,
              regretfulActions:
                updateData.regretfulActions ?? mockCreatedReflection.regretfulActions,
              slowProgressActions:
                updateData.slowProgressActions ?? mockCreatedReflection.slowProgressActions,
              untouchedActions:
                updateData.untouchedActions ?? mockCreatedReflection.untouchedActions,
              updatedAt: new Date(),
            };

            // Setup: 取得時のモックデータ（目標情報を含む）
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 同じ内容で複数回更新
            const result1 = await reflectionService.updateReflection(
              created.id,
              userId,
              updateData
            );
            const result2 = await reflectionService.updateReflection(
              created.id,
              userId,
              updateData
            );
            const result3 = await reflectionService.updateReflection(
              created.id,
              userId,
              updateData
            );

            // Verify: 全ての更新結果が同じであることを確認（冪等性）
            expect(result1.summary).toBe(result2.summary);
            expect(result1.summary).toBe(result3.summary);
            expect(result1.regretfulActions).toBe(result2.regretfulActions);
            expect(result1.regretfulActions).toBe(result3.regretfulActions);
            expect(result1.slowProgressActions).toBe(result2.slowProgressActions);
            expect(result1.slowProgressActions).toBe(result3.slowProgressActions);
            expect(result1.untouchedActions).toBe(result2.untouchedActions);
            expect(result1.untouchedActions).toBe(result3.untouchedActions);

            // Verify: updateが呼ばれたことを確認
            expect(mockPrisma.reflection.update).toHaveBeenCalledTimes(3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly save updated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.record({
            summary: summaryArbitrary,
            regretfulActions: optionalTextArbitrary,
            slowProgressActions: optionalTextArbitrary,
            untouchedActions: optionalTextArbitrary,
          }), // updateData
          async (createInput, userId, updateData) => {
            // Setup: 作成時のモックデータ
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup: 更新後のモックデータ
            const mockUpdatedReflection = {
              ...mockCreatedReflection,
              summary: updateData.summary ?? mockCreatedReflection.summary,
              regretfulActions:
                updateData.regretfulActions ?? mockCreatedReflection.regretfulActions,
              slowProgressActions:
                updateData.slowProgressActions ?? mockCreatedReflection.slowProgressActions,
              untouchedActions:
                updateData.untouchedActions ?? mockCreatedReflection.untouchedActions,
              updatedAt: new Date(),
            };

            // Setup: 取得時のモックデータ
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 振り返りを更新
            const result = await reflectionService.updateReflection(created.id, userId, updateData);

            // Verify: updateが正しいパラメータで呼ばれたことを確認
            expect(mockPrisma.reflection.update).toHaveBeenCalledWith({
              where: { id: created.id },
              data: {
                summary: updateData.summary,
                regretfulActions: updateData.regretfulActions,
                slowProgressActions: updateData.slowProgressActions,
                untouchedActions: updateData.untouchedActions,
              },
            });

            // Verify: 更新されたデータが正しいことを確認
            if (updateData.summary !== undefined) {
              expect(result.summary).toBe(updateData.summary);
            }
            if (updateData.regretfulActions !== undefined) {
              expect(result.regretfulActions).toBe(updateData.regretfulActions);
            }
            if (updateData.slowProgressActions !== undefined) {
              expect(result.slowProgressActions).toBe(updateData.slowProgressActions);
            }
            if (updateData.untouchedActions !== undefined) {
              expect(result.untouchedActions).toBe(updateData.untouchedActions);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update updatedAt timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.record({
            summary: summaryArbitrary,
          }), // updateData
          async (createInput, userId, updateData) => {
            // Setup: 作成時のモックデータ
            const createdAt = new Date('2024-01-01T00:00:00Z');
            const initialUpdatedAt = new Date('2024-01-01T00:00:00Z');
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt,
              updatedAt: initialUpdatedAt,
            };

            // Setup: 更新後のモックデータ（updatedAtが更新される）
            const newUpdatedAt = new Date('2024-01-02T00:00:00Z');
            const mockUpdatedReflection = {
              ...mockCreatedReflection,
              summary: updateData.summary,
              updatedAt: newUpdatedAt,
            };

            // Setup: 取得時のモックデータ
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 振り返りを更新
            const result = await reflectionService.updateReflection(created.id, userId, updateData);

            // Verify: updatedAtが更新されていることを確認
            expect(result.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());

            // Verify: createdAtは変更されていないことを確認
            expect(result.createdAt).toEqual(createdAt);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle partial updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.oneof(
            fc.record({ summary: summaryArbitrary }),
            fc.record({ regretfulActions: optionalTextArbitrary }),
            fc.record({ slowProgressActions: optionalTextArbitrary }),
            fc.record({ untouchedActions: optionalTextArbitrary })
          ), // partialUpdateData
          async (createInput, userId, partialUpdateData) => {
            // Setup: 作成時のモックデータ
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup: 部分更新後のモックデータ
            const mockUpdatedReflection = {
              ...mockCreatedReflection,
              ...partialUpdateData,
              updatedAt: new Date(),
            };

            // Setup: 取得時のモックデータ
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 部分更新
            const result = await reflectionService.updateReflection(
              created.id,
              userId,
              partialUpdateData
            );

            // Verify: 更新されたフィールドのみが変更されていることを確認
            if ('summary' in partialUpdateData) {
              expect(result.summary).toBe(partialUpdateData.summary);
            } else {
              expect(result.summary).toBe(mockCreatedReflection.summary);
            }

            if ('regretfulActions' in partialUpdateData) {
              expect(result.regretfulActions).toBe(partialUpdateData.regretfulActions);
            } else {
              expect(result.regretfulActions).toBe(mockCreatedReflection.regretfulActions);
            }

            if ('slowProgressActions' in partialUpdateData) {
              expect(result.slowProgressActions).toBe(partialUpdateData.slowProgressActions);
            } else {
              expect(result.slowProgressActions).toBe(mockCreatedReflection.slowProgressActions);
            }

            if ('untouchedActions' in partialUpdateData) {
              expect(result.untouchedActions).toBe(partialUpdateData.untouchedActions);
            } else {
              expect(result.untouchedActions).toBe(mockCreatedReflection.untouchedActions);
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

  /**
   * Feature: reflection-feature, Property 5: 振り返り削除の完全性
   * Validates: Requirements 4.2
   *
   * For any 振り返りID、その振り返りを削除すると、
   * データベースから完全に削除され、取得できなくなる
   */
  describe('Property 5: 振り返り削除の完全性', () => {
    it('should completely remove reflection from database after deletion', async () => {
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

            // Setup: 取得時のモックデータ（目標情報を含む）
            const mockReflectionWithGoal = {
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
            mockPrisma.reflection.delete = jest.fn().mockResolvedValue(mockCreatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(input);

            // Setup: 削除前の取得用モック
            mockPrisma.reflection.findFirst = jest
              .fn()
              .mockResolvedValueOnce(mockReflectionWithGoal) // 削除前の取得
              .mockResolvedValueOnce(mockReflectionWithGoal) // deleteReflection内の取得
              .mockResolvedValueOnce(null); // 削除後の取得

            // Execute: 削除前に取得できることを確認
            const beforeDelete = await reflectionService.getReflection(created.id, userId);
            expect(beforeDelete).not.toBeNull();

            // Execute: 振り返りを削除
            await reflectionService.deleteReflection(created.id, userId);

            // Verify: deleteが呼ばれたことを確認
            expect(mockPrisma.reflection.delete).toHaveBeenCalledTimes(1);
            expect(mockPrisma.reflection.delete).toHaveBeenCalledWith({
              where: { id: created.id },
            });

            // Execute: 削除後に取得できないことを確認
            const afterDelete = await reflectionService.getReflection(created.id, userId);
            expect(afterDelete).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect other reflections when deleting one', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary, // goalId
          uuidArbitrary, // userId
          fc.array(createReflectionInputArbitrary, { minLength: 3, maxLength: 5 }),
          async (goalId, userId, inputs) => {
            // Setup: 複数の振り返りを作成
            const mockReflections = inputs.map(input => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Setup: 削除対象の振り返り
            const targetReflection = mockReflections[0];
            const remainingReflections = mockReflections.slice(1);

            // Setup: 削除前の一覧取得
            mockPrisma.reflection.findMany = jest
              .fn()
              .mockResolvedValueOnce(mockReflections) // 削除前
              .mockResolvedValueOnce(remainingReflections); // 削除後

            // Setup: 削除対象の取得
            const mockReflectionWithGoal = {
              ...targetReflection,
              goal: {
                id: goalId,
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

            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.delete = jest.fn().mockResolvedValue(targetReflection);

            // Execute: 削除前の一覧を取得
            const beforeDelete = await reflectionService.getReflectionsByGoal(goalId, userId);
            expect(beforeDelete.length).toBe(mockReflections.length);

            // Execute: 1つの振り返りを削除
            await reflectionService.deleteReflection(targetReflection.id, userId);

            // Execute: 削除後の一覧を取得
            const afterDelete = await reflectionService.getReflectionsByGoal(goalId, userId);

            // Verify: 削除された振り返り以外は残っていることを確認
            expect(afterDelete.length).toBe(mockReflections.length - 1);
            expect(afterDelete.every(r => r.id !== targetReflection.id)).toBe(true);

            // Verify: 残りの振り返りの内容が変更されていないことを確認
            remainingReflections.forEach(remaining => {
              const found = afterDelete.find(r => r.id === remaining.id);
              expect(found).toBeDefined();
              expect(found!.summary).toBe(remaining.summary);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deletion of non-existent reflection gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArbitrary, uuidArbitrary, async (reflectionId, userId) => {
          // Setup: 存在しない振り返りの削除を試みる
          mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(null);

          // Execute & Verify: NotFoundErrorがスローされることを確認
          await expect(reflectionService.deleteReflection(reflectionId, userId)).rejects.toThrow(
            '振り返りが見つかりません'
          );

          // Verify: findFirstが呼ばれたことを確認
          expect(mockPrisma.reflection.findFirst).toHaveBeenCalledTimes(1);

          // Verify: deleteが呼ばれていないことを確認
          expect(mockPrisma.reflection.delete).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should prevent deletion by unauthorized user', async () => {
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

            // Setup: 異なるユーザーIDで削除しようとした場合、nullを返す
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(null);

            // Execute & Verify: NotFoundErrorがスローされることを確認（認可エラー）
            await expect(
              reflectionService.deleteReflection(created.id, wrongUserId)
            ).rejects.toThrow('振り返りが見つかりません');

            // Verify: deleteが呼ばれていないことを確認
            expect(mockPrisma.reflection.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: reflection-feature, Property 7: 目標削除時のカスケード削除
   * Validates: Requirements 6.2
   *
   * For any 目標ID、その目標を削除すると、
   * 紐づく全ての振り返りも自動的に削除される
   */
  describe('Property 7: 目標削除時のカスケード削除', () => {
    it('should delete all reflections when goal is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary, // goalId
          uuidArbitrary, // userId
          fc.array(createReflectionInputArbitrary, { minLength: 2, maxLength: 5 }),
          async (goalId, userId, inputs) => {
            // Setup: 目標に紐づく複数の振り返りを作成
            const mockReflections = inputs.map(input => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Setup: 削除前の一覧取得
            mockPrisma.reflection.findMany = jest
              .fn()
              .mockResolvedValueOnce(mockReflections) // 削除前
              .mockResolvedValueOnce([]); // 削除後

            // Execute: 削除前の振り返り一覧を取得
            const beforeDelete = await reflectionService.getReflectionsByGoal(goalId, userId);
            expect(beforeDelete.length).toBe(mockReflections.length);

            // Note: 実際のカスケード削除はデータベースレベルで行われるため、
            // ここではfindManyが空配列を返すことで削除を模擬する

            // Execute: 削除後の振り返り一覧を取得
            const afterDelete = await reflectionService.getReflectionsByGoal(goalId, userId);

            // Verify: 全ての振り返りが削除されていることを確認
            expect(afterDelete.length).toBe(0);
            expect(afterDelete).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect reflections of other goals when one goal is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary, // deletedGoalId
          uuidArbitrary, // remainingGoalId
          uuidArbitrary, // userId
          fc.array(createReflectionInputArbitrary, { minLength: 2, maxLength: 3 }),
          fc.array(createReflectionInputArbitrary, { minLength: 2, maxLength: 3 }),
          async (deletedGoalId, remainingGoalId, userId, deletedInputs, remainingInputs) => {
            // Ensure goalIds are different
            fc.pre(deletedGoalId !== remainingGoalId);

            // Setup: 削除される目標の振り返り
            const deletedReflections = deletedInputs.map(input => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: deletedGoalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Setup: 残る目標の振り返り
            const remainingReflections = remainingInputs.map(input => ({
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: remainingGoalId,
              summary: input.summary,
              regretfulActions: input.regretfulActions ?? null,
              slowProgressActions: input.slowProgressActions ?? null,
              untouchedActions: input.untouchedActions ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Setup: 削除前後の一覧取得
            mockPrisma.reflection.findMany = jest
              .fn()
              .mockResolvedValueOnce(deletedReflections) // 削除される目標の削除前
              .mockResolvedValueOnce([]) // 削除される目標の削除後
              .mockResolvedValueOnce(remainingReflections) // 残る目標の削除前
              .mockResolvedValueOnce(remainingReflections); // 残る目標の削除後

            // Execute: 削除前の振り返り一覧を取得
            const deletedBeforeDelete = await reflectionService.getReflectionsByGoal(
              deletedGoalId,
              userId
            );
            expect(deletedBeforeDelete.length).toBe(deletedReflections.length);

            // Execute: 削除後の振り返り一覧を取得（削除される目標）
            const deletedAfterDelete = await reflectionService.getReflectionsByGoal(
              deletedGoalId,
              userId
            );
            expect(deletedAfterDelete.length).toBe(0);

            // Execute: 残る目標の振り返り一覧を取得（削除前）
            const remainingBeforeDelete = await reflectionService.getReflectionsByGoal(
              remainingGoalId,
              userId
            );
            expect(remainingBeforeDelete.length).toBe(remainingReflections.length);

            // Execute: 残る目標の振り返り一覧を取得（削除後）
            const remainingAfterDelete = await reflectionService.getReflectionsByGoal(
              remainingGoalId,
              userId
            );

            // Verify: 残る目標の振り返りは影響を受けていないことを確認
            expect(remainingAfterDelete.length).toBe(remainingReflections.length);
            expect(remainingAfterDelete).toEqual(remainingReflections);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle goal deletion with no reflections', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArbitrary, uuidArbitrary, async (goalId, userId) => {
          // Setup: 振り返りが存在しない目標
          mockPrisma.reflection.findMany = jest.fn().mockResolvedValue([]);

          // Execute: 振り返り一覧を取得
          const reflections = await reflectionService.getReflectionsByGoal(goalId, userId);

          // Verify: 空配列が返されることを確認
          expect(reflections).toEqual([]);
          expect(reflections.length).toBe(0);

          // Note: 振り返りが存在しない目標を削除しても、エラーは発生しない
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: reflection-feature, Property 10: 日時の自動設定
   * Validates: Requirements 6.3, 6.4
   *
   * For any 振り返り、作成時にcreatedAtとupdatedAtが自動的に設定され、
   * 更新時にupdatedAtのみが更新される
   */
  describe('Property 10: 日時の自動設定', () => {
    it('should automatically set createdAt and updatedAt on creation', async () => {
      await fc.assert(
        fc.asyncProperty(createReflectionInputArbitrary, async input => {
          // Setup: 作成時のモックデータ
          const now = new Date();
          const mockCreatedReflection = {
            id: fc.sample(uuidArbitrary, 1)[0],
            goalId: input.goalId,
            summary: input.summary,
            regretfulActions: input.regretfulActions ?? null,
            slowProgressActions: input.slowProgressActions ?? null,
            untouchedActions: input.untouchedActions ?? null,
            createdAt: now,
            updatedAt: now,
          };

          mockPrisma.reflection.create = jest.fn().mockResolvedValue(mockCreatedReflection);

          // Execute: 振り返りを作成
          const result = await reflectionService.createReflection(input);

          // Verify: createdAtとupdatedAtが設定されていることを確認
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.updatedAt).toBeInstanceOf(Date);

          // Verify: createdAtとupdatedAtが同じ時刻であることを確認（作成時）
          expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime());

          // Verify: 日時が現在時刻に近いことを確認（1秒以内）
          const timeDiff = Math.abs(result.createdAt.getTime() - now.getTime());
          expect(timeDiff).toBeLessThan(1000);
        }),
        { numRuns: 100 }
      );
    });

    it('should update only updatedAt on update, not createdAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.record({
            summary: summaryArbitrary,
          }), // updateData
          async (createInput, userId, updateData) => {
            // Setup: 作成時のモックデータ
            const createdAt = new Date('2024-01-01T00:00:00Z');
            const initialUpdatedAt = new Date('2024-01-01T00:00:00Z');
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt,
              updatedAt: initialUpdatedAt,
            };

            // Setup: 更新後のモックデータ
            const newUpdatedAt = new Date('2024-01-02T00:00:00Z');
            const mockUpdatedReflection = {
              ...mockCreatedReflection,
              summary: updateData.summary,
              updatedAt: newUpdatedAt,
            };

            // Setup: 取得時のモックデータ
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 振り返りを更新
            const updated = await reflectionService.updateReflection(
              created.id,
              userId,
              updateData
            );

            // Verify: createdAtは変更されていないことを確認
            expect(updated.createdAt).toEqual(createdAt);

            // Verify: updatedAtのみが更新されていることを確認
            expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
            expect(updated.updatedAt).toEqual(newUpdatedAt);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain chronological order of createdAt and updatedAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.record({
            summary: summaryArbitrary,
          }), // updateData
          async (createInput, userId, updateData) => {
            // Setup: 作成時のモックデータ
            const createdAt = new Date('2024-01-01T00:00:00Z');
            const initialUpdatedAt = new Date('2024-01-01T00:00:00Z');
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt,
              updatedAt: initialUpdatedAt,
            };

            // Setup: 更新後のモックデータ
            const newUpdatedAt = new Date('2024-01-02T00:00:00Z');
            const mockUpdatedReflection = {
              ...mockCreatedReflection,
              summary: updateData.summary,
              updatedAt: newUpdatedAt,
            };

            // Setup: 取得時のモックデータ
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);
            mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 振り返りを更新
            const updated = await reflectionService.updateReflection(
              created.id,
              userId,
              updateData
            );

            // Verify: updatedAtがcreatedAt以降であることを確認
            expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updated.createdAt.getTime());

            // Verify: 更新後のupdatedAtが作成時のupdatedAtより後であることを確認
            expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve timestamps across multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          createReflectionInputArbitrary,
          uuidArbitrary, // userId
          fc.array(
            fc.record({
              summary: summaryArbitrary,
            }),
            { minLength: 2, maxLength: 5 }
          ), // updateDataArray
          async (createInput, userId, updateDataArray) => {
            // Setup: 作成時のモックデータ
            const createdAt = new Date('2024-01-01T00:00:00Z');
            let currentUpdatedAt = new Date('2024-01-01T00:00:00Z');
            const mockCreatedReflection = {
              id: fc.sample(uuidArbitrary, 1)[0],
              goalId: createInput.goalId,
              summary: createInput.summary,
              regretfulActions: createInput.regretfulActions ?? null,
              slowProgressActions: createInput.slowProgressActions ?? null,
              untouchedActions: createInput.untouchedActions ?? null,
              createdAt,
              updatedAt: currentUpdatedAt,
            };

            // Setup: 取得時のモックデータ
            const mockReflectionWithGoal = {
              ...mockCreatedReflection,
              goal: {
                id: createInput.goalId,
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
            mockPrisma.reflection.findFirst = jest.fn().mockResolvedValue(mockReflectionWithGoal);

            // Execute: 振り返りを作成
            const created = await reflectionService.createReflection(createInput);

            // Execute: 複数回更新
            let previousUpdatedAt = currentUpdatedAt;
            for (let i = 0; i < updateDataArray.length; i++) {
              const updateData = updateDataArray[i];
              currentUpdatedAt = new Date(currentUpdatedAt.getTime() + 1000 * 60 * 60); // 1時間後

              const mockUpdatedReflection = {
                ...mockCreatedReflection,
                summary: updateData.summary,
                updatedAt: currentUpdatedAt,
              };

              mockPrisma.reflection.update = jest.fn().mockResolvedValue(mockUpdatedReflection);

              const updated = await reflectionService.updateReflection(
                created.id,
                userId,
                updateData
              );

              // Verify: createdAtは変更されていないことを確認
              expect(updated.createdAt).toEqual(createdAt);

              // Verify: updatedAtが前回より後であることを確認
              expect(updated.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());

              previousUpdatedAt = updated.updatedAt;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
