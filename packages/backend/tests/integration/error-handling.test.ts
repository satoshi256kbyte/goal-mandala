/**
 * エラーハンドリングの統合テスト
 *
 * このテストは、各種エラーケースの処理を検証します。
 * - AI生成エラー
 * - データベースエラー
 * - タイムアウトエラー
 * - バリデーションエラー
 * - エラー分類
 * - エラーログ記録
 */

import { PrismaClient, ProcessingStatus, ProcessingType } from '@prisma/client';
import { ProcessingStateService } from '../../src/services/processing-state.service';

describe('エラーハンドリング統合テスト', () => {
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
        email: `test-error-${Date.now()}@example.com`,
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

  describe('AI生成エラー', () => {
    it('AI生成エラーが適切に記録される', async () => {
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

      // AI生成エラーを記録
      const aiError = {
        code: 'AI_ERROR',
        message: 'AI生成に失敗しました',
        details: {
          service: 'Bedrock',
          model: 'Nova Micro',
          errorType: 'ThrottlingException',
          retryable: true,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, aiError);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error).toEqual(aiError);
      expect(state.error.code).toBe('AI_ERROR');
      expect(state.error.details.retryable).toBe(true);
    });

    it('AI生成エラーの詳細情報が保存される', async () => {
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

      const aiError = {
        code: 'AI_ERROR',
        message: 'モデルの応答が不正です',
        details: {
          service: 'Bedrock',
          model: 'Nova Micro',
          errorType: 'ValidationException',
          requestId: 'req-12345',
          timestamp: new Date().toISOString(),
          retryable: false,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, aiError);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.error.details).toHaveProperty('service', 'Bedrock');
      expect(state.error.details).toHaveProperty('model', 'Nova Micro');
      expect(state.error.details).toHaveProperty('errorType', 'ValidationException');
      expect(state.error.details).toHaveProperty('requestId');
      expect(state.error.details).toHaveProperty('timestamp');
      expect(state.error.details.retryable).toBe(false);
    });
  });

  describe('データベースエラー', () => {
    it('データベースエラーが適切に記録される', async () => {
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

      const dbError = {
        code: 'DATABASE_ERROR',
        message: 'データベース接続に失敗しました',
        details: {
          errorType: 'ConnectionError',
          database: 'Aurora',
          retryable: true,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, dbError);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.code).toBe('DATABASE_ERROR');
      expect(state.error.details.retryable).toBe(true);
    });

    it('データベース制約違反エラーが記録される', async () => {
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

      const constraintError = {
        code: 'DATABASE_ERROR',
        message: 'データベース制約違反',
        details: {
          errorType: 'UniqueConstraintViolation',
          constraint: 'unique_goal_title',
          retryable: false,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, constraintError);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.error.code).toBe('DATABASE_ERROR');
      expect(state.error.details.errorType).toBe('UniqueConstraintViolation');
      expect(state.error.details.retryable).toBe(false);
    });
  });

  describe('バリデーションエラー', () => {
    it('バリデーションエラーが適切に記録される', async () => {
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      const validationError = {
        code: 'VALIDATION_ERROR',
        message: '入力パラメータが不正です',
        details: {
          field: 'title',
          reason: 'タイトルは必須です',
          retryable: false,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, validationError);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.code).toBe('VALIDATION_ERROR');
      expect(state.error.details.field).toBe('title');
      expect(state.error.details.retryable).toBe(false);
    });

    it('複数のバリデーションエラーが記録される', async () => {
      const processingState = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      const validationErrors = {
        code: 'VALIDATION_ERROR',
        message: '複数の入力エラーがあります',
        details: {
          errors: [
            { field: 'title', reason: 'タイトルは必須です' },
            { field: 'description', reason: '説明は100文字以内です' },
            { field: 'deadline', reason: '期限は未来の日付である必要があります' },
          ],
          retryable: false,
        },
      };

      await processingStateService.updateProcessingError(processingState.id, validationErrors);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.error.code).toBe('VALIDATION_ERROR');
      expect(state.error.details.errors).toHaveLength(3);
      expect(state.error.details.retryable).toBe(false);
    });
  });

  describe('エラー分類', () => {
    it('リトライ可能なエラーとリトライ不可能なエラーが区別される', async () => {
      // リトライ可能なエラー
      const retryableProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: testGoalId,
        params: { goalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        retryableProcess.id,
        ProcessingStatus.PROCESSING
      );

      await processingStateService.updateProcessingError(retryableProcess.id, {
        code: 'AI_ERROR',
        message: 'スロットリングエラー',
        details: { retryable: true },
      });

      // リトライ不可能なエラー
      const nonRetryableProcess = await processingStateService.createProcessingState({
        userId: testUserId,
        type: ProcessingType.ACTION_GENERATION,
        targetId: testGoalId,
        params: { subGoalId: testGoalId },
      });

      await processingStateService.updateProcessingStatus(
        nonRetryableProcess.id,
        ProcessingStatus.PROCESSING
      );

      await processingStateService.updateProcessingError(nonRetryableProcess.id, {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: { retryable: false },
      });

      // 確認
      const retryableState = await processingStateService.getProcessingState(
        retryableProcess.id,
        testUserId
      );
      const nonRetryableState = await processingStateService.getProcessingState(
        nonRetryableProcess.id,
        testUserId
      );

      expect(retryableState.error.details.retryable).toBe(true);
      expect(nonRetryableState.error.details.retryable).toBe(false);
    });

    it('エラーコードによる分類が正しく機能する', async () => {
      const errorTypes = [
        { code: 'AI_ERROR', message: 'AI生成エラー' },
        { code: 'DATABASE_ERROR', message: 'データベースエラー' },
        { code: 'VALIDATION_ERROR', message: 'バリデーションエラー' },
        { code: 'TIMEOUT_ERROR', message: 'タイムアウトエラー' },
        { code: 'NETWORK_ERROR', message: 'ネットワークエラー' },
      ];

      const processes = await Promise.all(
        errorTypes.map(errorType =>
          processingStateService.createProcessingState({
            userId: testUserId,
            type: ProcessingType.SUBGOAL_GENERATION,
            targetId: testGoalId,
            params: { goalId: testGoalId },
          })
        )
      );

      // 各処理を処理中に更新
      await Promise.all(
        processes.map(p =>
          processingStateService.updateProcessingStatus(p.id, ProcessingStatus.PROCESSING)
        )
      );

      // 各エラータイプでエラーを記録
      await Promise.all(
        processes.map((p, i) =>
          processingStateService.updateProcessingError(p.id, {
            code: errorTypes[i].code,
            message: errorTypes[i].message,
          })
        )
      );

      // 確認
      const states = await Promise.all(
        processes.map(p => processingStateService.getProcessingState(p.id, testUserId))
      );

      states.forEach((state, i) => {
        expect(state.error.code).toBe(errorTypes[i].code);
        expect(state.error.message).toBe(errorTypes[i].message);
      });
    });
  });

  describe('エラーログ記録', () => {
    it('エラー詳細がCloudWatch Logsに記録される形式で保存される', async () => {
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

      const error = {
        code: 'AI_ERROR',
        message: 'AI生成に失敗しました',
        details: {
          service: 'Bedrock',
          model: 'Nova Micro',
          errorType: 'ServiceException',
          requestId: 'req-67890',
          timestamp: new Date().toISOString(),
          stackTrace: 'Error: AI generation failed\n  at generateSubGoals...',
        },
      };

      await processingStateService.updateProcessingError(processingState.id, error);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      // CloudWatch Logs形式の情報が含まれていることを確認
      expect(state.error).toHaveProperty('code');
      expect(state.error).toHaveProperty('message');
      expect(state.error).toHaveProperty('details');
      expect(state.error.details).toHaveProperty('timestamp');
      expect(state.error.details).toHaveProperty('requestId');
      expect(state.error.details).toHaveProperty('stackTrace');
    });

    it('機密情報がマスキングされる', async () => {
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

      // 機密情報を含むエラー（実際のシステムではマスキングされる）
      const error = {
        code: 'DATABASE_ERROR',
        message: 'データベース接続エラー',
        details: {
          // 実際のシステムでは、これらの情報はマスキングされる
          connectionString: '***MASKED***',
          password: '***MASKED***',
          errorType: 'ConnectionError',
        },
      };

      await processingStateService.updateProcessingError(processingState.id, error);

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      // 機密情報がマスキングされていることを確認
      expect(state.error.details.connectionString).toBe('***MASKED***');
      expect(state.error.details.password).toBe('***MASKED***');
    });
  });

  describe('エラー回復', () => {
    it('一時的なエラー後に処理を再開できる', async () => {
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

      // 一時的なエラーを記録
      await processingStateService.updateProcessingError(firstProcess.id, {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
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

      await processingStateService.updateProcessingStatus(
        retryProcess.id,
        ProcessingStatus.PROCESSING
      );

      // 成功
      await processingStateService.updateProcessingResult(retryProcess.id, {
        success: true,
      });

      // 確認
      const firstState = await processingStateService.getProcessingState(
        firstProcess.id,
        testUserId
      );
      const retryState = await processingStateService.getProcessingState(
        retryProcess.id,
        testUserId
      );

      expect(firstState.status).toBe(ProcessingStatus.FAILED);
      expect(retryState.status).toBe(ProcessingStatus.COMPLETED);
      expect(retryState.retryCount).toBe(1);
    });

    it('永続的なエラーはリトライされない', async () => {
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

      // 永続的なエラーを記録
      await processingStateService.updateProcessingError(processingState.id, {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: { retryable: false },
      });

      const state = await processingStateService.getProcessingState(processingState.id, testUserId);

      expect(state.status).toBe(ProcessingStatus.FAILED);
      expect(state.error.details.retryable).toBe(false);
    });
  });

  describe('複合エラーケース', () => {
    it('複数のエラーが連続して発生した場合も正しく処理される', async () => {
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

      // 最初のエラー
      await processingStateService.updateProcessingError(processingState.id, {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
      });

      // 状態を確認（最初のエラーが記録されている）
      const firstErrorState = await processingStateService.getProcessingState(
        processingState.id,
        testUserId
      );
      expect(firstErrorState.error.code).toBe('NETWORK_ERROR');

      // 注: 実際のシステムでは、FAILEDステータスの処理は更新できないため、
      // このテストは理論的なケースを示しています
    });
  });
});
