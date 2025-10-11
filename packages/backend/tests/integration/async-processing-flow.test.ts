/**
 * 非同期処理完全フローの統合テスト
 *
 * このテストは、非同期処理の開始から完了までの完全なフローを検証します。
 * - 処理開始
 * - 状態確認
 * - 完了確認
 */

import { PrismaClient, ProcessingStatus, ProcessingType } from '@prisma/client';
import { ProcessingStateService } from '../../src/services/processing-state.service';

describe('非同期処理完全フロー統合テスト', () => {
  let prisma: PrismaClient;
  let processingStateService: ProcessingStateService;
  let testUserId: string;
  let testGoalId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    processingStateService = new ProcessingStateService(prisma);

    // テストユーザーとゴールを作成
    const user = await prisma.user.create({
      data: {
        email: `test-async-flow-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = user.id;

    const goal = await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'Test Goal',
        description: 'Test Description',
        deadline: new Date('2025-12-31'),
        background: 'Test Background',
        status: 'DRAFT',
        progress: 0,
      },
    });
    testGoalId = goal.id;
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await prisma.processingState.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.goal.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('サブ目標生成の完全フロー', () => {
    it('処理開始 → 状態確認 → 完了確認のフローが正常に動作する', async () => {
      // 1. 処理開始
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: {
          goalId: testGoalId,
          title: 'Test Goal',
          description: 'Test Description',
          deadline: '2025-12-31T23:59:59Z',
          background: 'Test Background',
        },
      });

      expect(processingState).toBeDefined();
      expect(processingState.id).toBeDefined();
      expect(processingState.status).toBe(ProcessingStatus.PENDING);
      expect(processingState.progress).toBe(0);
      expect(processingState.userId).toBe(testUserId);
      expect(processingState.type).toBe(ProcessingType.SUBGOAL_GENERATION);

      const processId = processingState.id;

      // 2. 状態確認（PENDING）
      const pendingState = await processingStateService.getProcessingState(processId, testUserId);
      expect(pendingState).toBeDefined();
      expect(pendingState.status).toBe(ProcessingStatus.PENDING);
      expect(pendingState.progress).toBe(0);

      // 3. 処理中に更新
      await processingStateService.updateProcessingStatus(processId, ProcessingStatus.PROCESSING);

      // 4. 状態確認（PROCESSING）
      const processingStateCheck = await processingStateService.getProcessingState(
        processId,
        testUserId
      );
      expect(processingStateCheck.status).toBe(ProcessingStatus.PROCESSING);

      // 5. 進捗更新（50%）
      await processingStateService.updateProcessingProgress(processId, 50);

      // 6. 状態確認（進捗50%）
      const progressState = await processingStateService.getProcessingState(processId, testUserId);
      expect(progressState.progress).toBe(50);

      // 7. 完了に更新
      const result = {
        goalId: testGoalId,
        subGoals: [
          { title: 'SubGoal 1', description: 'Description 1' },
          { title: 'SubGoal 2', description: 'Description 2' },
        ],
      };
      await processingStateService.updateProcessingResult(processId, result);

      // 8. 状態確認（COMPLETED）
      const completedState = await processingStateService.getProcessingState(processId, testUserId);
      expect(completedState.status).toBe(ProcessingStatus.COMPLETED);
      expect(completedState.progress).toBe(100);
      expect(completedState.result).toEqual(result);
      expect(completedState.completedAt).toBeDefined();
    });

    it('複数の処理を並行して実行できる', async () => {
      // 3つの処理を並行して開始
      const processes = await Promise.all([
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
        }),
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
        }),
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
        }),
      ]);

      // 全ての処理が正常に作成されたことを確認
      expect(processes).toHaveLength(3);
      processes.forEach(process => {
        expect(process.id).toBeDefined();
        expect(process.status).toBe(ProcessingStatus.PENDING);
      });

      // 各処理を異なる状態に更新
      await processingStateService.updateProcessingStatus(
        processes[0].id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingResult(processes[1].id, { success: true });
      await processingStateService.updateProcessingError(processes[2].id, {
        code: 'TEST_ERROR',
        message: 'Test error',
      });

      // 各処理の状態を確認
      const states = await Promise.all(
        processes.map(p => processingStateService.getProcessingState(p.id, testUserId))
      );

      expect(states[0].status).toBe(ProcessingStatus.PROCESSING);
      expect(states[1].status).toBe(ProcessingStatus.COMPLETED);
      expect(states[2].status).toBe(ProcessingStatus.FAILED);
    });
  });

  describe('アクション生成の完全フロー', () => {
    it('アクション生成の処理フローが正常に動作する', async () => {
      // サブ目標を作成
      const subGoal = await prisma.subGoal.create({
        data: {
          goalId: testGoalId,
          title: 'Test SubGoal',
          description: 'Test Description',
          background: 'Test Background',
          position: 0,
          progress: 0,
        },
      });

      // 処理開始
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: subGoal.id,
        params: {
          subGoalId: subGoal.id,
        },
      });

      expect(processingState.type).toBe(ProcessingType.ACTION_GENERATION);
      expect(processingState.status).toBe(ProcessingStatus.PENDING);

      // 処理中に更新
      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // 段階的に進捗更新（8個のサブ目標、各12.5%）
      for (let i = 1; i <= 8; i++) {
        await processingStateService.updateProcessingProgress(processingState.id, i * 12.5);
        const state = await processingStateService.getProcessingState(
          processingState.id,
          testUserId
        );
        expect(state.progress).toBe(i * 12.5);
      }

      // 完了
      await processingStateService.updateProcessingResult(processingState.id, {
        subGoalId: subGoal.id,
        actions: Array.from({ length: 8 }, (_, i) => ({
          title: `Action ${i + 1}`,
          description: `Description ${i + 1}`,
        })),
      });

      const completedState = await processingStateService.getProcessingState(
        processingState.id,
        testUserId
      );
      expect(completedState.status).toBe(ProcessingStatus.COMPLETED);
      expect(completedState.progress).toBe(100);
    });
  });

  describe('タスク生成の完全フロー', () => {
    it('タスク生成の処理フローが正常に動作する', async () => {
      // サブ目標とアクションを作成
      const subGoal = await prisma.subGoal.create({
        data: {
          goalId: testGoalId,
          title: 'Test SubGoal',
          description: 'Test Description',
          background: 'Test Background',
          position: 1,
          progress: 0,
        },
      });

      const action = await prisma.action.create({
        data: {
          subGoalId: subGoal.id,
          title: 'Test Action',
          description: 'Test Description',
          background: 'Test Background',
          type: 'EXECUTION',
          position: 0,
          progress: 0,
        },
      });

      // 処理開始
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: action.id,
        params: {
          actionId: action.id,
        },
      });

      expect(processingState.type).toBe(ProcessingType.TASK_GENERATION);

      // 処理中に更新
      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // 進捗更新
      await processingStateService.updateProcessingProgress(processingState.id, 50);

      // 完了
      await processingStateService.updateProcessingResult(processingState.id, {
        actionId: action.id,
        tasks: [
          { title: 'Task 1', description: 'Description 1', estimatedMinutes: 30 },
          { title: 'Task 2', description: 'Description 2', estimatedMinutes: 45 },
        ],
      });

      const completedState = await processingStateService.getProcessingState(
        processingState.id,
        testUserId
      );
      expect(completedState.status).toBe(ProcessingStatus.COMPLETED);
      expect(completedState.progress).toBe(100);
    });
  });

  describe('処理履歴の取得', () => {
    it('ユーザーの処理履歴を取得できる', async () => {
      // 複数の処理を作成
      await Promise.all([
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
        }),
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
        }),
      ]);

      // 処理履歴を取得
      const history = await processingStateService.getProcessingHistory(testUserId, {
        page: 1,
        pageSize: 10,
      });

      expect(history.processes.length).toBeGreaterThan(0);
      expect(history.pagination.totalCount).toBeGreaterThan(0);
      expect(history.pagination.page).toBe(1);
      expect(history.pagination.pageSize).toBe(10);

      // 全ての処理が同じユーザーのものであることを確認
      history.processes.forEach(process => {
        expect(process.userId).toBe(testUserId);
      });
    });

    it('処理タイプでフィルタリングできる', async () => {
      // 異なるタイプの処理を作成
      await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      // フィルタリングして取得
      const history = await processingStateService.getProcessingHistory(testUserId, {
        page: 1,
        pageSize: 10,
        type: ProcessingType.SUBGOAL_GENERATION,
      });

      // 全ての処理が指定したタイプであることを確認
      history.processes.forEach(process => {
        expect(process.type).toBe(ProcessingType.SUBGOAL_GENERATION);
      });
    });

    it('ステータスでフィルタリングできる', async () => {
      // 完了した処理を作成
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingResult(process.id, { success: true });

      // フィルタリングして取得
      const history = await processingStateService.getProcessingHistory(testUserId, {
        page: 1,
        pageSize: 10,
        status: ProcessingStatus.COMPLETED,
      });

      // 全ての処理が指定したステータスであることを確認
      history.processes.forEach(process => {
        expect(process.status).toBe(ProcessingStatus.COMPLETED);
      });
    });
  });

  describe('エラーケース', () => {
    it('存在しない処理IDでエラーが発生する', async () => {
      await expect(
        processingStateService.getProcessingState('non-existent-id', testUserId)
      ).rejects.toThrow();
    });

    it('他のユーザーの処理にアクセスできない', async () => {
      // 別のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          name: 'Other User',
        },
      });

      // テストユーザーの処理を作成
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      // 別のユーザーでアクセスを試みる
      await expect(
        processingStateService.getProcessingState(process.id, otherUser.id)
      ).rejects.toThrow();

      // クリーンアップ
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});
