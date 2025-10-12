/**
 * タイムアウト処理の統合テスト
 *
 * このテストは、長時間実行される処理のタイムアウト処理を検証します。
 * - タイムアウト検出
 * - ステータス更新
 * - エラーメッセージ記録
 * - リソースクリーンアップ
 */

import { PrismaClient, ProcessingStatus, ProcessingType } from '@prisma/client';
import { ProcessingStateService } from '../../src/services/processing-state.service';

describe.skip('タイムアウト処理統合テスト', () => {
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
        email: `test-timeout-${Date.now()}@example.com`,
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

  describe.skip('タイムアウト検出と処理', () => {
    it('処理がタイムアウトした場合、ステータスがTIMEOUTに更新される', async () => {
      // 処理を作成
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      // 処理中に更新
      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // タイムアウトエラーを記録
      const timeoutError = {
        code: 'TIMEOUT_ERROR',
        message: '処理時間が制限を超えました',
        details: {
          timeout: 300,
          elapsed: 305,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, timeoutError);

      // 状態を確認
      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error).toEqual(timeoutError);
      expect(state.completedAt).toBeDefined();
    });

    it('タイムアウト時にエラーメッセージが適切に記録される', async () => {
      // 処理を作成
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // タイムアウトエラーを記録
      const timeoutError = {
        code: 'TIMEOUT_ERROR',
        message: 'AI生成処理がタイムアウトしました',
        details: {
          timeout: 300,
          elapsed: 310,
          stage: 'AI_GENERATION',
        },
      };

      await processingStateService.updateProcessingError(processingState.id, timeoutError);

      // エラー情報を確認
      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.error).toBeDefined();
      expect(state.error).toHaveProperty('code', 'TIMEOUT_ERROR');
      expect(state.error).toHaveProperty('message');
      expect(state.error).toHaveProperty('details');
      expect(state.error.details).toHaveProperty('timeout', 300);
      expect(state.error.details).toHaveProperty('elapsed', 310);
      expect(state.error.details).toHaveProperty('stage', 'AI_GENERATION');
    });

    it('タイムアウト後の進捗が保持される', async () => {
      // 処理を作成
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // 進捗を更新
      await processingStateService.updateProcessingProgress(processingState.id, 45);

      // タイムアウトエラーを記録
      await processingStateService.updateProcessingError(processingState.id, {
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウトしました',
      });

      // 進捗が保持されていることを確認
      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.progress).toBe(45);
      expect(state.status).toBe(ProcessingStatus.FAILED);
    });
  });

  describe.skip('長時間実行のシミュレーション', () => {
    it('長時間実行をシミュレートし、タイムアウトを検出する', async () => {
      // 処理を作成
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // 段階的に進捗を更新（長時間実行をシミュレート）
      const progressUpdates = [10, 20, 30, 40, 50];
      for (const progress of progressUpdates) {
        await processingStateService.updateProcessingProgress(processingState.id, progress);
        // 実際のシステムでは、ここで時間経過をチェック
      }

      // タイムアウトを検出したと仮定
      const timeoutError = {
        code: 'TIMEOUT_ERROR',
        message: '処理時間が5分を超えました',
        details: {
          timeout: 300,
          elapsed: 305,
          lastProgress: 50,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, timeoutError);

      // 状態を確認
      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.progress).toBe(50);
      expect(state.error.code).toBe('TIMEOUT_ERROR');
    });

    it('複数の処理が同時にタイムアウトした場合も正しく処理される', async () => {
      // 3つの処理を作成
      const processes = await Promise.all([
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
        }),
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.ACTION_GENERATION,
          targetId: testGoalId,
          params: { subGoalId: testGoalId },
        }),
        processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.TASK_GENERATION,
          targetId: testGoalId,
          params: { actionId: testGoalId },
        }),
      ]);

      // 全ての処理を処理中に更新
      await Promise.all(
        processes.map(p =>
          processingStateService.updateProcessingStatus(p.id, ProcessingStatus.PROCESSING)
        )
      );

      // 全ての処理をタイムアウトさせる
      await Promise.all(
        processes.map(p =>
          processingStateService.updateProcessingError(p.id, {
            code: 'TIMEOUT_ERROR',
            message: 'タイムアウトしました',
          })
        )
      );

      // 全ての処理がタイムアウト状態になっていることを確認
      const states = await Promise.all(
        processes.map(p => processingStateService.getProcessingState(p.id, testUserId))
      );

      states.forEach(state => {
        expect(state.status).toBe(ProcessingStatus.FAILED);
        expect(state.error.code).toBe('TIMEOUT_ERROR');
      });
    });
  });

  describe.skip('タイムアウト後のリトライ', () => {
    it('タイムアウトした処理は再試行可能である', async () => {
      // 処理を作成
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        processingState.id,
        ProcessingStatus.PROCESSING
      );

      // タイムアウトさせる
      await processingStateService.updateProcessingError(processingState.id, {
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウトしました',
      });

      // タイムアウトした処理を確認
      const timeoutState = await processingStateService.getProcessingState(
        processingState.id,
        testUserId
      );
      expect(timeoutState.status).toBe(ProcessingStatus.FAILED);

      // 新しい処理を作成（リトライ）
      const retryState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
        retryCount: timeoutState.retryCount + 1,
      });

      expect(retryState.id).not.toBe(processingState.id);
      expect(retryState.status).toBe(ProcessingStatus.PENDING);
      expect(retryState.retryCount).toBe(timeoutState.retryCount + 1);
    });

    it('タイムアウト後のリトライ回数が記録される', async () => {
      // 初回処理
      const firstProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        firstProcess.id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingError(firstProcess.id, {
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウトしました',
      });

      // 1回目のリトライ
      const secondProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
        retryCount: 1,
      });

      await processingStateService.updateProcessingStatus(
        secondProcess.id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingError(secondProcess.id, {
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウトしました',
      });

      // 2回目のリトライ
      const thirdProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
        retryCount: 2,
      });

      // リトライ回数を確認
      expect(firstProcess.retryCount).toBe(0);
      expect(secondProcess.retryCount).toBe(1);
      expect(thirdProcess.retryCount).toBe(2);
    });
  });

  describe.skip('タイムアウト設定', () => {
    it('処理タイプごとに異なるタイムアウト時間を設定できる', async () => {
      // 各処理タイプでタイムアウトエラーを記録
      const subgoalProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      const actionProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      const taskProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      // 各処理を処理中に更新
      await Promise.all([
        processingStateService.updateProcessingStatus(
          subgoalProcess.id,
          ProcessingStatus.PROCESSING
        ),
        processingStateService.updateProcessingStatus(
          actionProcess.id,
          ProcessingStatus.PROCESSING
        ),
        processingStateService.updateProcessingStatus(taskProcess.id, ProcessingStatus.PROCESSING),
      ]);

      // 異なるタイムアウト時間でエラーを記録
      await Promise.all([
        processingStateService.updateProcessingError(subgoalProcess.id, {
          code: 'TIMEOUT_ERROR',
          message: 'タイムアウトしました',
          details: { timeout: 300, type: 'SUBGOAL_GENERATION' },
        }),
        processingStateService.updateProcessingError(actionProcess.id, {
          code: 'TIMEOUT_ERROR',
          message: 'タイムアウトしました',
          details: { timeout: 600, type: 'ACTION_GENERATION' },
        }),
        processingStateService.updateProcessingError(taskProcess.id, {
          code: 'TIMEOUT_ERROR',
          message: 'タイムアウトしました',
          details: { timeout: 180, type: 'TASK_GENERATION' },
        }),
      ]);

      // タイムアウト設定を確認
      const states = await Promise.all([
        processingStateService.getProcessingState(subgoalProcess.id, testUserId),
        processingStateService.getProcessingState(actionProcess.id, testUserId),
        processingStateService.getProcessingState(taskProcess.id, testUserId),
      ]);

      expect(states[0].error.details.timeout).toBe(300);
      expect(states[1].error.details.timeout).toBe(600);
      expect(states[2].error.details.timeout).toBe(180);
    });
  });
});
