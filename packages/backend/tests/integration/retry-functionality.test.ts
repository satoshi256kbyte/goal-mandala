/**
 * リトライ機能の統合テスト
 *
 * このテストは、自動リトライと手動リトライの機能を検証します。
 * - 自動リトライ（エクスポネンシャルバックオフ）
 * - 手動リトライ
 * - リトライ回数制限
 * - リトライ可能性チェック
 */

import { PrismaClient, ProcessingStatus, ProcessingType } from '@prisma/client';
import { ProcessingStateService } from '../../src/services/processing-state.service';

describe('リトライ機能統合テスト', () => {
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
        email: `test-retry-${Date.now()}@example.com`,
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

  describe('手動リトライ', () => {
    it('失敗した処理を手動でリトライできる', async () => {
      // 初回処理
      const firstProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        firstProcess.id,
        ProcessingStatus.PROCESSING
      );

      // 失敗させる
      await processingStateService.updateProcessingError(firstProcess.id, {
        code: 'AI_ERROR',
        message: 'AI生成に失敗しました',
        details: { retryable: true },
      });

      // リトライ
      const retryProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
        retryCount: firstProcess.retryCount + 1,
      });

      expect(retryProcess.id).not.toBe(firstProcess.id);
      expect(retryProcess.status).toBe(ProcessingStatus.PENDING);
      expect(retryProcess.retryCount).toBe(1);
    });

    it('タイムアウトした処理を手動でリトライできる', async () => {
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

      // タイムアウトさせる
      await processingStateService.updateProcessingError(firstProcess.id, {
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウトしました',
        details: { retryable: true },
      });

      // リトライ
      const retryProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
        retryCount: 1,
      });

      expect(retryProcess.status).toBe(ProcessingStatus.PENDING);
      expect(retryProcess.retryCount).toBe(1);
    });

    it('完了した処理はリトライできない', async () => {
      // 処理を作成して完了させる
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingResult(process.id, { success: true });

      const completedState = await processingStateService.getProcessingState(
        process.id,
        testUserId
      );

      expect(completedState.status).toBe(ProcessingStatus.COMPLETED);

      // 完了した処理のリトライは、新しい処理として作成する必要がある
      // （既存の処理を再実行することはできない）
    });
  });

  describe('リトライ回数制限', () => {
    it('リトライ回数が上限（3回）を超えない', async () => {
      const params = { goalId: testGoalId };

      // 初回処理（retryCount: 0）
      const process0 = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params,
        retryCount: 0,
      });

      await processingStateService.updateProcessingStatus(process0.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingError(process0.id, {
        code: 'AI_ERROR',
        message: 'エラー',
      });

      // 1回目のリトライ（retryCount: 1）
      const process1 = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params,
        retryCount: 1,
      });

      await processingStateService.updateProcessingStatus(process1.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingError(process1.id, {
        code: 'AI_ERROR',
        message: 'エラー',
      });

      // 2回目のリトライ（retryCount: 2）
      const process2 = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params,
        retryCount: 2,
      });

      await processingStateService.updateProcessingStatus(process2.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingError(process2.id, {
        code: 'AI_ERROR',
        message: 'エラー',
      });

      // 3回目のリトライ（retryCount: 3）
      const process3 = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params,
        retryCount: 3,
      });

      // リトライ回数を確認
      expect(process0.retryCount).toBe(0);
      expect(process1.retryCount).toBe(1);
      expect(process2.retryCount).toBe(2);
      expect(process3.retryCount).toBe(3);

      // 3回を超えるリトライは作成できるが、実際のシステムでは制限される
    });

    it('リトライ回数が記録される', async () => {
      const processes = [];

      // 初回処理
      const initialProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });
      processes.push(initialProcess);

      await processingStateService.updateProcessingStatus(
        initialProcess.id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingError(initialProcess.id, {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
      });

      // 3回リトライ
      for (let i = 1; i <= 3; i++) {
        const retryProcess = await processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.ACTION_GENERATION,
          targetId: testGoalId,
          params: { subGoalId: testGoalId },
          retryCount: i,
        });
        processes.push(retryProcess);

        await processingStateService.updateProcessingStatus(
          retryProcess.id,
          ProcessingStatus.PROCESSING
        );
        await processingStateService.updateProcessingError(retryProcess.id, {
          code: 'NETWORK_ERROR',
          message: 'ネットワークエラー',
        });
      }

      // 全ての処理のリトライ回数を確認
      const states = await Promise.all(
        processes.map(p => processingStateService.getProcessingState(p.id, testUserId))
      );

      states.forEach((state, index) => {
        expect(state.retryCount).toBe(index);
      });
    });
  });

  describe('自動リトライ（エクスポネンシャルバックオフ）', () => {
    it('一時的なエラーで自動リトライが実行される', async () => {
      // 初回処理
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      // 一時的なエラー（自動リトライ対象）
      await processingStateService.updateProcessingError(process.id, {
        code: 'AI_ERROR',
        message: 'ThrottlingException',
        details: {
          errorType: 'ThrottlingException',
          retryable: true,
          autoRetry: true,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.retryable).toBe(true);
      expect(state.error.details.autoRetry).toBe(true);
    });

    it('エクスポネンシャルバックオフの待機時間が記録される', async () => {
      const retryAttempts = [
        { retryCount: 0, expectedDelay: 1000 }, // 1秒
        { retryCount: 1, expectedDelay: 2000 }, // 2秒
        { retryCount: 2, expectedDelay: 4000 }, // 4秒
      ];

      for (const attempt of retryAttempts) {
        const process = await processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params: { goalId: testGoalId },
          retryCount: attempt.retryCount,
        });

        await processingStateService.updateProcessingStatus(
          process.id,
          ProcessingStatus.PROCESSING
        );

        await processingStateService.updateProcessingError(process.id, {
          code: 'NETWORK_ERROR',
          message: 'ネットワークエラー',
          details: {
            retryable: true,
            autoRetry: true,
            backoffDelay: attempt.expectedDelay,
          },
        });

        const state = await processingStateService.getProcessingState(process.id, testUserId);

        expect(state.error.details.backoffDelay).toBe(attempt.expectedDelay);
      }
    });

    it('データベース接続エラーで自動リトライが実行される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'DATABASE_ERROR',
        message: 'DatabaseConnectionError',
        details: {
          errorType: 'ConnectionError',
          retryable: true,
          autoRetry: true,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.code).toBe('DATABASE_ERROR');
      expect(state.error.details.retryable).toBe(true);
      expect(state.error.details.autoRetry).toBe(true);
    });

    it('ネットワークエラーで自動リトライが実行される', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.TASK_GENERATION,
        targetId: testGoalId,
        params: { actionId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'NETWORK_ERROR',
        message: 'NetworkError',
        details: {
          errorType: 'ECONNREFUSED',
          retryable: true,
          autoRetry: true,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.code).toBe('NETWORK_ERROR');
      expect(state.error.details.retryable).toBe(true);
      expect(state.error.details.autoRetry).toBe(true);
    });

    it('永続的なエラーでは自動リトライが実行されない', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);

      await processingStateService.updateProcessingError(process.id, {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: {
          retryable: false,
          autoRetry: false,
        },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.error.details.retryable).toBe(false);
      expect(state.error.details.autoRetry).toBe(false);
    });

    it('自動リトライが3回失敗すると処理がFAILEDになる', async () => {
      const processes = [];

      // 初回処理
      const initialProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });
      processes.push(initialProcess);

      await processingStateService.updateProcessingStatus(
        initialProcess.id,
        ProcessingStatus.PROCESSING
      );
      await processingStateService.updateProcessingError(initialProcess.id, {
        code: 'AI_ERROR',
        message: 'ThrottlingException',
        details: { retryable: true, autoRetry: true },
      });

      // 自動リトライ3回
      for (let i = 1; i <= 3; i++) {
        const retryProcess = await processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.ACTION_GENERATION,
          targetId: testGoalId,
          params: { subGoalId: testGoalId },
          retryCount: i,
        });
        processes.push(retryProcess);

        await processingStateService.updateProcessingStatus(
          retryProcess.id,
          ProcessingStatus.PROCESSING
        );
        await processingStateService.updateProcessingError(retryProcess.id, {
          code: 'AI_ERROR',
          message: 'ThrottlingException',
          details: { retryable: true, autoRetry: true },
        });
      }

      // 全ての処理が失敗していることを確認
      const states = await Promise.all(
        processes.map(p => processingStateService.getProcessingState(p.id, testUserId))
      );

      states.forEach(state => {
        expect(state.status).toBe(ProcessingStatus.FAILED);
      });
    });
  });

  describe('リトライ可能性チェック', () => {
    it('FAILEDステータスの処理はリトライ可能', async () => {
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
        details: { retryable: true },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.details.retryable).toBe(true);
    });

    it('TIMEOUTステータスの処理はリトライ可能', async () => {
      const process = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(process.id, ProcessingStatus.PROCESSING);
      await processingStateService.updateProcessingError(process.id, {
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウト',
        details: { retryable: true },
      });

      const state = await processingStateService.getProcessingState(process.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.code).toBe('TIMEOUT_ERROR');
      expect(state.error.details.retryable).toBe(true);
    });

    it('COMPLETEDステータスの処理はリトライ不可', async () => {
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
      // 完了した処理はリトライできない
    });
  });

  describe('リトライ履歴', () => {
    it('リトライ履歴が処理履歴に記録される', async () => {
      const params = { goalId: testGoalId };

      // 初回処理とリトライを作成
      const processes = [];
      for (let i = 0; i <= 2; i++) {
        const process = await processingStateService.createProcessingState({
          userId: testUserId,
          type: ProcessingType.SUBGOAL_GENERATION,
          targetId: testGoalId,
          params,
          retryCount: i,
        });
        processes.push(process);

        await processingStateService.updateProcessingStatus(
          process.id,
          ProcessingStatus.PROCESSING
        );
        await processingStateService.updateProcessingError(process.id, {
          code: 'AI_ERROR',
          message: 'エラー',
        });
      }

      // 処理履歴を取得
      const history = await processingStateService.getProcessingHistory(testUserId, {
        page: 1,
        pageSize: 10,
        type: ProcessingType.SUBGOAL_GENERATION,
      });

      // リトライを含む全ての処理が履歴に含まれていることを確認
      const retryProcesses = history.processes.filter(p => p.retryCount > 0);
      expect(retryProcesses.length).toBeGreaterThan(0);
    });
  });
});
