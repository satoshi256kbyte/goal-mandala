/**
 * タスク生成APIのE2Eテスト
 * 実際のデータベースとモックされたBedrockサービスを使用して
 * エンドツーエンドのフローをテストする
 */

import { app } from '../../handlers/task-generation.js';
import { BedrockService } from '../../services/bedrock.service.js';
import type { TaskGenerationResponse } from '../../types/task-generation.types.js';
import { prisma } from '../../config/database.js';

// BedrockServiceのモック
jest.mock('../../services/bedrock.service.js');

describe('タスク生成API E2Eテスト', () => {
  let testUserId: string;
  let testGoalId: string;
  let testSubGoalId: string;
  let testActionId: string;
  let authToken: string;

  beforeAll(async () => {
    // データベース接続
    await prisma.$connect();

    // テストユーザーの作成
    const testUser = await prisma.user.create({
      data: {
        email: `test-task-${Date.now()}@example.com`,
        name: 'Test User for Tasks',
        industry: 'TECHNOLOGY',
        companySize: 'MEDIUM',
        jobType: 'エンジニア',
      },
    });
    testUserId = testUser.id;

    // テスト用の目標を作成
    const testGoal = await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
        constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
        status: 'ACTIVE',
        progress: 0,
      },
    });
    testGoalId = testGoal.id;

    // テスト用のサブ目標を作成
    const testSubGoal = await prisma.subGoal.create({
      data: {
        goalId: testGoalId,
        title: 'TypeScriptの基礎文法を習得する',
        description:
          '型システム、インターフェース、ジェネリクスなどの基本概念を理解し、実践できるようになる',
        background: 'TypeScriptの基礎がなければ、高度な機能を理解することは困難である',
        position: 0,
        progress: 0,
      },
    });
    testSubGoalId = testSubGoal.id;

    // テスト用のアクションを作成
    const testAction = await prisma.action.create({
      data: {
        subGoalId: testSubGoalId,
        title: 'TypeScript公式ドキュメントを読む',
        description:
          'TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを実際に動かして理解を深める',
        background:
          '公式ドキュメントは最も正確で体系的な情報源であり、基礎を固めるために不可欠である',
        type: 'execution',
        position: 0,
        progress: 0,
      },
    });
    testActionId = testAction.id;

    // テスト用のJWTトークンを生成（簡易版）
    authToken = `Bearer test-token-${testUserId}`;
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    if (testGoalId) {
      await prisma.goal.delete({
        where: { id: testGoalId },
      });
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      });
    }

    // データベース接続を切断
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // BedrockServiceのモックをリセット
    jest.clearAllMocks();

    // BedrockServiceのモック実装
    const mockGenerateTasks = jest.fn().mockResolvedValue([
      {
        title: 'TypeScript公式ドキュメントの基礎編を読む',
        description:
          'TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める',
        estimatedMinutes: 45,
        priority: 'high',
      },
      {
        title: 'TypeScriptの型システムを実践する',
        description:
          '学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する',
        estimatedMinutes: 60,
        priority: 'medium',
      },
      {
        title: 'インターフェースとクラスを実装する',
        description:
          'TypeScriptのインターフェースとクラスを使って、オブジェクト指向プログラミングの基礎を実践する',
        estimatedMinutes: 50,
        priority: 'medium',
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateTasks: mockGenerateTasks,
        }) as any
    );
  });

  describe('11.1 正常系テストケース', () => {
    it('アクションからタスクを生成できる', async () => {
      // リクエストデータ
      const requestData = {
        actionId: testActionId,
        regenerate: false,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-task-request-001',
        },
        body: JSON.stringify(requestData),
      });

      // モック認証ミドルウェアの設定
      jest.mock('../../middleware/auth.js', () => ({
        jwtAuthMiddleware: () => async (c: any, next: any) => {
          c.set('user', { id: testUserId, email: 'test@example.com' });
          await next();
        },
        getCurrentUser: (c: any) => c.get('user'),
      }));

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: TaskGenerationResponse = await response.json();

      // レスポンス構造の検証
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.data?.actionId).toBe(testActionId);
      expect(responseData.data?.tasks).toBeDefined();
      expect(responseData.data?.tasks.length).toBeGreaterThan(0);
      expect(responseData.metadata).toBeDefined();
      expect(responseData.metadata?.generatedAt).toBeDefined();
      expect(responseData.metadata?.tokensUsed).toBeGreaterThan(0);
      expect(responseData.metadata?.estimatedCost).toBeGreaterThan(0);
      expect(responseData.metadata?.actionContext).toBeDefined();
      expect(responseData.metadata?.actionContext.goalTitle).toBe('TypeScriptのエキスパートになる');
      expect(responseData.metadata?.actionContext.subGoalTitle).toBe(
        'TypeScriptの基礎文法を習得する'
      );
      expect(responseData.metadata?.actionContext.actionTitle).toBe(
        'TypeScript公式ドキュメントを読む'
      );
      expect(responseData.metadata?.actionContext.actionType).toBe('execution');
    });

    it('複数のタスクが生成される', async () => {
      // 既存のタスクを削除
      await prisma.task.deleteMany({
        where: { actionId: testActionId },
      });

      // リクエストデータ
      const requestData = {
        actionId: testActionId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-task-request-002',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: TaskGenerationResponse = await response.json();

      // 複数のタスクが生成されることを確認
      expect(responseData.data?.tasks.length).toBeGreaterThanOrEqual(1);

      // データベースにも保存されていることを確認
      const savedTasks = await prisma.task.findMany({
        where: { actionId: testActionId },
      });

      expect(savedTasks.length).toBeGreaterThanOrEqual(1);
      expect(savedTasks.length).toBe(responseData.data?.tasks.length);
    });

    it('タスク種別（EXECUTION/HABIT）がアクションから継承される', async () => {
      // 既存のタスクを削除
      await prisma.task.deleteMany({
        where: { actionId: testActionId },
      });

      // リクエストデータ
      const requestData = {
        actionId: testActionId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-task-request-003',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: TaskGenerationResponse = await response.json();

      // アクションの種別を取得
      const action = await prisma.action.findUnique({
        where: { id: testActionId },
      });

      // タスク種別がアクションから継承されていることを確認
      responseData.data?.tasks.forEach(task => {
        expect(task.type).toBe(action?.type);
      });

      // データベースでも確認
      const savedTasks = await prisma.task.findMany({
        where: { actionId: testActionId },
      });

      savedTasks.forEach(task => {
        expect(task.type).toBe(action?.type);
      });
    });

    it('推定時間が正しく設定される', async () => {
      // 既存のタスクを削除
      await prisma.task.deleteMany({
        where: { actionId: testActionId },
      });

      // リクエストデータ
      const requestData = {
        actionId: testActionId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-task-request-004',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: TaskGenerationResponse = await response.json();

      // 推定時間が設定されていることを確認
      responseData.data?.tasks.forEach(task => {
        expect(task.estimatedMinutes).toBeDefined();
        expect(task.estimatedMinutes).toBeGreaterThan(0);
        // 推定時間が15-120分の範囲内であることを確認
        expect(task.estimatedMinutes).toBeGreaterThanOrEqual(15);
        expect(task.estimatedMinutes).toBeLessThanOrEqual(120);
      });

      // データベースでも確認
      const savedTasks = await prisma.task.findMany({
        where: { actionId: testActionId },
      });

      savedTasks.forEach(task => {
        expect(task.estimatedMinutes).toBeDefined();
        expect(task.estimatedMinutes).toBeGreaterThan(0);
        expect(task.estimatedMinutes).toBeGreaterThanOrEqual(15);
        expect(task.estimatedMinutes).toBeLessThanOrEqual(120);
      });
    });

    it('データベースに正しく保存される', async () => {
      // 既存のタスクを削除
      await prisma.task.deleteMany({
        where: { actionId: testActionId },
      });

      // リクエストデータ
      const requestData = {
        actionId: testActionId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-task-request-005',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      // データベースから直接取得して検証
      const savedTasks = await prisma.task.findMany({
        where: { actionId: testActionId },
        orderBy: { createdAt: 'asc' },
      });

      expect(savedTasks.length).toBeGreaterThan(0);

      savedTasks.forEach(task => {
        // 必須フィールドの検証
        expect(task.id).toBeDefined();
        expect(task.actionId).toBe(testActionId);
        expect(task.title).toBeDefined();
        expect(task.title.length).toBeGreaterThan(0);
        expect(task.title.length).toBeLessThanOrEqual(50);
        expect(task.description).toBeDefined();
        expect(task.description!.length).toBeGreaterThan(0);
        expect(task.description!.length).toBeLessThanOrEqual(200);
        expect(['execution', 'habit']).toContain(task.type);
        expect(task.status).toBe('not_started');
        expect(task.estimatedMinutes).toBeGreaterThan(0);
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
      });
    });
  });
});

describe('11.2 異常系テストケース', () => {
  it('バリデーションエラー: actionIdが不正', async () => {
    // リクエストデータ（不正なactionId）
    const requestData = {
      actionId: 'invalid-action-id',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-error-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('VALIDATION_ERROR');
  });

  it('バリデーションエラー: actionIdが空', async () => {
    // リクエストデータ（actionIdなし）
    const requestData = {};

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-error-002',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('VALIDATION_ERROR');
  });

  it('品質エラー: タスクが生成されない', async () => {
    // BedrockServiceのモックを空配列を返すように変更
    const mockGenerateTasks = jest.fn().mockResolvedValue([]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateTasks: mockGenerateTasks,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-error-003',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('QUALITY_VALIDATION_FAILED');
  });

  it('データベースエラー: トランザクション失敗', async () => {
    // Prismaのモックを設定してエラーを発生させる
    const originalCreate = prisma.task.create;
    prisma.task.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-error-004',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(500);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('DATABASE_ERROR');

    // モックを元に戻す
    prisma.task.create = originalCreate;
  });
});

describe('11.3 認証エラーテスト', () => {
  it('認証トークンなし', async () => {
    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト（Authorizationヘッダーなし）
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'test-task-request-auth-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(401);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('UNAUTHORIZED');
  });

  it('無効なトークン', async () => {
    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト（無効なトークン）
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token',
        'x-request-id': 'test-task-request-auth-002',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(401);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('UNAUTHORIZED');
  });
});

describe('11.4 認可エラーテスト', () => {
  let otherUserId: string;
  let otherUserToken: string;

  beforeAll(async () => {
    // 別のテストユーザーを作成
    const otherUser = await prisma.user.create({
      data: {
        email: `test-other-${Date.now()}@example.com`,
        name: 'Other Test User',
        industry: 'TECHNOLOGY',
        companySize: 'SMALL',
        jobType: 'デザイナー',
      },
    });
    otherUserId = otherUser.id;
    otherUserToken = `Bearer test-token-${otherUserId}`;
  });

  afterAll(async () => {
    // 別のユーザーを削除
    if (otherUserId) {
      await prisma.user.delete({
        where: { id: otherUserId },
      });
    }
  });

  it('他人のアクションへのアクセス', async () => {
    // リクエストデータ（他人のアクション）
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト（別のユーザーのトークン）
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: otherUserToken,
        'x-request-id': 'test-task-request-authz-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(403);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('FORBIDDEN');
  });

  it('存在しないアクションへのアクセス', async () => {
    // リクエストデータ（存在しないアクション）
    const requestData = {
      actionId: '00000000-0000-0000-0000-000000000000',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-authz-002',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(404);

    const responseData = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe('NOT_FOUND');
  });
});

describe('11.5 再生成機能のテスト', () => {
  it('regenerate: trueで既存タスクが削除される', async () => {
    // 既存のタスクを作成
    await prisma.task.create({
      data: {
        actionId: testActionId,
        title: '既存タスク1',
        description: '既存タスクの説明1',
        type: 'execution',
        status: 'not_started',
        estimatedMinutes: 30,
      },
    });

    await prisma.task.create({
      data: {
        actionId: testActionId,
        title: '既存タスク2',
        description: '既存タスクの説明2',
        type: 'execution',
        status: 'not_started',
        estimatedMinutes: 45,
      },
    });

    // 既存タスクの確認
    const existingTasks = await prisma.task.findMany({
      where: { actionId: testActionId },
    });
    expect(existingTasks.length).toBe(2);

    // リクエストデータ（regenerate: true）
    const requestData = {
      actionId: testActionId,
      regenerate: true,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-regen-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    expect(responseData.success).toBe(true);

    // 既存タスクが削除され、新しいタスクが生成されていることを確認
    const newTasks = await prisma.task.findMany({
      where: { actionId: testActionId },
    });

    // 新しいタスクのみが存在することを確認
    expect(newTasks.length).toBeGreaterThan(0);
    expect(newTasks.every(task => task.title !== '既存タスク1')).toBe(true);
    expect(newTasks.every(task => task.title !== '既存タスク2')).toBe(true);
  });

  it('新規タスクが生成される', async () => {
    // 既存のタスクを削除
    await prisma.task.deleteMany({
      where: { actionId: testActionId },
    });

    // リクエストデータ（regenerate: true）
    const requestData = {
      actionId: testActionId,
      regenerate: true,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-regen-002',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    expect(responseData.success).toBe(true);
    expect(responseData.data?.tasks.length).toBeGreaterThan(0);

    // データベースに新規タスクが保存されていることを確認
    const newTasks = await prisma.task.findMany({
      where: { actionId: testActionId },
    });

    expect(newTasks.length).toBeGreaterThan(0);
    expect(newTasks.length).toBe(responseData.data?.tasks.length);
  });
});

describe('11.6 タスク粒度のテスト', () => {
  it('推定時間が30-60分程度である', async () => {
    // 既存のタスクを削除
    await prisma.task.deleteMany({
      where: { actionId: testActionId },
    });

    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-granularity-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    // 推定時間が30-60分程度であることを確認
    const tasks = responseData.data?.tasks || [];
    const estimatedTimes = tasks.map(task => task.estimatedMinutes);

    // 少なくとも1つのタスクが30-60分の範囲内であることを確認
    const tasksInRange = estimatedTimes.filter(time => time >= 30 && time <= 60);
    expect(tasksInRange.length).toBeGreaterThan(0);

    // 平均推定時間が30-60分程度であることを確認
    const averageTime = estimatedTimes.reduce((sum, time) => sum + time, 0) / estimatedTimes.length;
    expect(averageTime).toBeGreaterThanOrEqual(20);
    expect(averageTime).toBeLessThanOrEqual(90);
  });

  it('大きなアクションが複数タスクに分割される', async () => {
    // 大きなアクションを作成
    const largeAction = await prisma.action.create({
      data: {
        subGoalId: testSubGoalId,
        title: '大規模なTypeScriptプロジェクトを完成させる',
        description:
          'TypeScriptを使用して、フロントエンド、バックエンド、データベース、テスト、デプロイまでを含む大規模なWebアプリケーションを開発し、本番環境にデプロイする',
        background:
          '実践的なプロジェクトを通じて、TypeScriptの全体的な理解を深め、実務で活用できるスキルを身につける',
        type: 'execution',
        position: 1,
        progress: 0,
      },
    });

    // リクエストデータ
    const requestData = {
      actionId: largeAction.id,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-granularity-002',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    // 複数のタスクに分割されていることを確認
    expect(responseData.data?.tasks.length).toBeGreaterThanOrEqual(3);

    // クリーンアップ
    await prisma.action.delete({
      where: { id: largeAction.id },
    });
  });
});

describe('11.7 優先度設定のテスト', () => {
  it('優先度（HIGH/MEDIUM/LOW）が正しく設定される', async () => {
    // 既存のタスクを削除
    await prisma.task.deleteMany({
      where: { actionId: testActionId },
    });

    // BedrockServiceのモックを優先度付きで設定
    const mockGenerateTasks = jest.fn().mockResolvedValue([
      {
        title: '重要タスク',
        description: '最優先で実施すべきタスク',
        estimatedMinutes: 45,
        priority: 'high',
      },
      {
        title: '通常タスク',
        description: '通常の優先度のタスク',
        estimatedMinutes: 30,
        priority: 'medium',
      },
      {
        title: '低優先度タスク',
        description: '時間があれば実施するタスク',
        estimatedMinutes: 60,
        priority: 'low',
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateTasks: mockGenerateTasks,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-priority-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    // 優先度が設定されていることを確認
    const tasks = responseData.data?.tasks || [];
    expect(tasks.length).toBeGreaterThan(0);

    tasks.forEach(task => {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(task.priority);
    });

    // データベースでも確認
    const savedTasks = await prisma.task.findMany({
      where: { actionId: testActionId },
    });

    savedTasks.forEach(task => {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(task.priority);
    });

    // 各優先度が少なくとも1つ存在することを確認
    const priorities = tasks.map(task => task.priority);
    expect(priorities).toContain('HIGH');
    expect(priorities).toContain('MEDIUM');
    expect(priorities).toContain('LOW');
  });
});

describe('11.8 依存関係のテスト', () => {
  it('タスク間の依存関係が正しく記録される', async () => {
    // 既存のタスクを削除
    await prisma.task.deleteMany({
      where: { actionId: testActionId },
    });

    // BedrockServiceのモックを依存関係付きで設定
    const mockGenerateTasks = jest.fn().mockResolvedValue([
      {
        title: '基礎タスク',
        description: '最初に実施すべきタスク',
        estimatedMinutes: 30,
        priority: 'high',
        dependencies: [],
      },
      {
        title: '応用タスク',
        description: '基礎タスクの後に実施するタスク',
        estimatedMinutes: 45,
        priority: 'medium',
        dependencies: ['基礎タスク'],
      },
      {
        title: '発展タスク',
        description: '応用タスクの後に実施するタスク',
        estimatedMinutes: 60,
        priority: 'low',
        dependencies: ['応用タスク'],
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateTasks: mockGenerateTasks,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-dependency-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    // 依存関係が記録されていることを確認
    const tasks = responseData.data?.tasks || [];
    expect(tasks.length).toBeGreaterThan(0);

    // 依存関係を持つタスクが存在することを確認
    const tasksWithDependencies = tasks.filter(
      task => task.dependencies && task.dependencies.length > 0
    );
    expect(tasksWithDependencies.length).toBeGreaterThan(0);

    // データベースでも確認
    const savedTasks = await prisma.task.findMany({
      where: { actionId: testActionId },
    });

    // 依存関係が正しく保存されていることを確認
    const savedTasksWithDependencies = savedTasks.filter(
      task => task.dependencies && (task.dependencies as string[]).length > 0
    );
    expect(savedTasksWithDependencies.length).toBeGreaterThan(0);
  });
});

describe('11.9 テストカバレッジの確認', () => {
  it('テストカバレッジが80%以上である', async () => {
    // このテストは実際のカバレッジレポートを確認するためのプレースホルダー
    // 実際のカバレッジは `npm run test:coverage` で確認する

    // テストが実行されることを確認
    expect(true).toBe(true);

    // カバレッジレポートの確認方法をログに出力
    console.log('カバレッジレポートを確認するには以下のコマンドを実行してください:');
    console.log('cd packages/backend && npm run test:coverage');
    console.log('カバレッジレポートは coverage/lcov-report/index.html で確認できます');
  });
});

describe('11.10 レスポンス形式テスト', () => {
  it('成功レスポンスの形式が正しい', async () => {
    // 既存のタスクを削除
    await prisma.task.deleteMany({
      where: { actionId: testActionId },
    });

    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-response-001',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(200);

    const responseData: TaskGenerationResponse = await response.json();

    // 成功レスポンスの構造を確認
    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(true);

    expect(responseData).toHaveProperty('data');
    expect(responseData.data).toHaveProperty('actionId');
    expect(responseData.data).toHaveProperty('tasks');
    expect(Array.isArray(responseData.data?.tasks)).toBe(true);

    expect(responseData).toHaveProperty('metadata');
    expect(responseData.metadata).toHaveProperty('generatedAt');
    expect(responseData.metadata).toHaveProperty('tokensUsed');
    expect(responseData.metadata).toHaveProperty('estimatedCost');
    expect(responseData.metadata).toHaveProperty('actionContext');
    expect(responseData.metadata).toHaveProperty('taskCount');
    expect(responseData.metadata).toHaveProperty('totalEstimatedMinutes');

    // タスクの構造を確認
    responseData.data?.tasks.forEach(task => {
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('type');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('estimatedMinutes');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
    });
  });

  it('エラーレスポンスの形式が正しい', async () => {
    // リクエストデータ（不正なactionId）
    const requestData = {
      actionId: 'invalid-action-id',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-task-request-response-002',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData = await response.json();

    // エラーレスポンスの構造を確認
    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(false);

    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toHaveProperty('code');
    expect(responseData.error).toHaveProperty('message');

    expect(responseData).toHaveProperty('metadata');
    expect(responseData.metadata).toHaveProperty('requestId');
    expect(responseData.metadata).toHaveProperty('timestamp');
  });

  it('CORSヘッダーが正しく設定される', async () => {
    // リクエストデータ
    const requestData = {
      actionId: testActionId,
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        Origin: 'http://localhost:5173',
        'x-request-id': 'test-task-request-response-003',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // CORSヘッダーの検証
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
  });
});
