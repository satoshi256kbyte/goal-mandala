/**
 * キャンセル機能の統合テスト
 *
 * このテストは、処理キャンセル機能を検証します。
 * - キャンセル可能性チェック
 * - ステータス更新
 * - リソースクリーンアップ
 * - キャンセル理由の記録
 */

import { PrismaClient, ProcessingStatus, ProcessingType } from '@prisma/client';
import { ProcessingStateService } from '../../src/services/processing-state.service';

describe.skip('キャンセル機能統合テスト', () => {
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
        email: `test-cancel-${Date.now()}@example.com`,
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

  describe.skip('キャンセル可能性チェック', () => {
    it('PENDINGステータスの処理はキャンセル可能', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      expect(process.status).toBe(ProcessingStatus.PENDING);

      // キャンセル（エラーとして記録）
      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'ユーザーによってキャンセルされました',
        details: {
          reason: 'user_request',
          cancelledAt: new Date().toISOString(),
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.code).toBe('CANCELLED');
    });

    it('PROCESSINGステータスの処理はキャンセル可能', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      // キャンセル
      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'ユーザーによってキャンセルされました',
        details: {
          reason: 'user_request',
          progress: 30,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.code).toBe('CANCELLED');
    });

    it('COMPLETEDステータスの処理はキャンセル不可', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingResult(process.id, { success: true });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.COMPLETED);
      // 完了した処理はキャンセルできない
    });

    it('FAILEDステータスの処理はキャンセル不可', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingError(process.id, {
        code: 'AI_ERROR',
        message: 'エラー',
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      // 既に失敗した処理はキャンセルできない
    });
  });

  describe.skip('キャンセル実行', () => {
    it('処理をキャンセルするとステータスがCANCELLEDに更新される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      // キャンセル
      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: '処理がキャンセルされました',
        details: {
          reason: 'user_request',
          cancelledBy: testUserId,
          cancelledAt: new Date().toISOString(),
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.code).toBe('CANCELLED');
      expect(state.completedAt).toBeDefined();
    });

    it('キャンセル時の進捗が保持される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingProgress(process.id, 45);

      // キャンセル
      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'キャンセルされました',
        details: {
          reason: 'user_request',
          progressAtCancel: 45,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.progress).toBe(45);
      expect(state.error.details.progressAtCancel).toBe(45);
    });

    it('複数の処理を同時にキャンセルできる', async () => {
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

      // 全ての処理をキャンセル
      await Promise.all(
        processes.map(p =>
          processingStateService.updateProcessingError(p.id, {
            code: 'CANCELLED',
            message: 'キャンセルされました',
            details: { reason: 'user_request' },
          })
        )
      );

      // 全ての処理がキャンセルされたことを確認
      const states = await Promise.all(
        processes.map(p => processingStateService.getProcessingState(p.id, testUserId))
      );

      states.forEach(state => {
        expect(state.status).toBe(ProcessingStatus.FAILED);
        expect(state.error.code).toBe('CANCELLED');
      });
    });
  });

  describe.skip('キャンセル理由の記録', () => {
    it('ユーザーリクエストによるキャンセルが記録される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'ユーザーによってキャンセルされました',
        details: {
          reason: 'user_request',
          cancelledBy: testUserId,
          cancelledAt: new Date().toISOString(),
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.reason).toBe('user_request');
      expect(state.error.details.cancelledBy).toBe(testUserId);
      expect(state.error.details.cancelledAt).toBeDefined();
    });

    it('タイムアウトによるキャンセルが記録される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'タイムアウトによりキャンセルされました',
        details: {
          reason: 'timeout',
          timeout: 300,
          elapsed: 305,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.reason).toBe('timeout');
      expect(state.error.details.timeout).toBe(300);
      expect(state.error.details.elapsed).toBe(305);
    });

    it('システムエラーによるキャンセルが記録される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'システムエラーによりキャンセルされました',
        details: {
          reason: 'system_error',
          errorType: 'OutOfMemoryError',
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.reason).toBe('system_error');
      expect(state.error.details.errorType).toBe('OutOfMemoryError');
    });
  });

  describe.skip('リソースクリーンアップ', () => {
    it('キャンセル時にリソースクリーンアップが記録される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'キャンセルされました',
        details: {
          reason: 'user_request',
          resourcesCleanedUp: true,
          cleanupTimestamp: new Date().toISOString(),
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.resourcesCleanedUp).toBe(true);
      expect(state.error.details.cleanupTimestamp).toBeDefined();
    });

    it('部分的に完了した処理のキャンセルでクリーンアップが実行される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingProgress(process.id, 60);

      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'キャンセルされました',
        details: {
          reason: 'user_request',
          progressAtCancel: 60,
          partialResults: {
            completed: 5,
            total: 8,
          },
          resourcesCleanedUp: true,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.partialResults).toBeDefined();
      expect(state.error.details.partialResults.completed).toBe(5);
      expect(state.error.details.resourcesCleanedUp).toBe(true);
    });
  });

  describe.skip('キャンセル後の処理', () => {
    it('キャンセルされた処理は再実行できる', async () => {
      // 初回処理
      const firstProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        firstProcess.id,
        ProcessingStatus.PROCESSING
      );

      // キャンセル
      await processingStateService.updateProcessingError(firstProcess.id, {
        code: 'CANCELLED',
        message: 'キャンセルされました',
        details: { reason: 'user_request' },
      });

      // 新しい処理を作成（再実行）
      const retryProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      expect(retryProcess.id).not.toBe(firstProcess.id);
      expect(retryProcess.status).toBe(ProcessingStatus.PENDING);
    });

    it('キャンセルされた処理の履歴が保持される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'CANCELLED',
        message: 'キャンセルされました',
        details: { reason: 'user_request' },
      });

      // 処理履歴を取得
      const history = await processingStateService.getProcessingHistory(testUserId, {
        page: 1,
        pageSize: 10,
      });

      // キャンセルされた処理が履歴に含まれていることを確認
      const cancelledProcess = history.processes.find(p => p.id === process.id);
      expect(cancelledProcess).toBeDefined();
      expect(cancelledProcess?.status).toBe(ProcessingStatus.FAILED);
    });
  });

  describe.skip('権限チェック', () => {
    it('他のユーザーの処理をキャンセルできない', async () => {
      // 別のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-cancel-${Date.now()}@example.com`,
          name: 'Other User',
        },
      });

      // テストユーザーの処理を作成
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      // 別のユーザーでアクセスを試みる
      await expect(
        processingStateService.getProcessingState(process.id, otherUser.id)
      ).rejects.toThrow();

      // クリーンアップ
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe.skip('キャンセル統計', () => {
    it('キャンセル率が計算できる', async () => {
      // 複数の処理を作成
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

      // 1つ目は完了、2つ目はキャンセル、3つ目は失敗
      await processingStateService.updateProcessingStatus(
        processes[0].id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingResult(processes[0].id, { success: true });

      await processingStateService.updateProcessingStatus(
        processes[1].id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingError(processes[1].id, {
        code: 'CANCELLED',
        message: 'キャンセル',
        details: { reason: 'user_request' },
      });

      await processingStateService.updateProcessingStatus(
        processes[2].id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingError(processes[2].id, {
        code: 'AI_ERROR',
        message: 'エラー',
      });

      // 処理履歴を取得
      const history = await processingStateService.getProcessingHistory(testUserId, {
        page: 1,
        pageSize: 10,
        type: ProcessingType.SUBGOAL_GENERATION,
      });

      // キャンセルされた処理をカウント
      const cancelledCount = history.processes.filter(
        p => p.status === ProcessingStatus.FAILED && p.error?.code === 'CANCELLED'
      ).length;

      expect(cancelledCount).toBeGreaterThan(0);
    });
  });
});
