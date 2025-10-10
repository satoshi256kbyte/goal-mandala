/**
 * サブ目標生成APIのE2Eテスト
 * 実際のデータベースとモックされたBedrockサービスを使用して
 * エンドツーエンドのフローをテストする
 */

import { PrismaClient } from '@prisma/client';
import { app } from '../../handlers/subgoal-generation.js';
import { BedrockService } from '../../services/bedrock.service.js';
import type { SubGoalGenerationResponse } from '../../types/subgoal-generation.types.js';

// Prismaクライアントのインスタンス化
const prisma = new PrismaClient();

// BedrockServiceのモック
jest.mock('../../services/bedrock.service.js');

describe('サブ目標生成API E2Eテスト', () => {
  let testUserId: string;
  let testGoalId: string;
  let authToken: string;

  beforeAll(async () => {
    // データベース接続
    await prisma.$connect();

    // テストユーザーの作成
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        industry: 'TECHNOLOGY',
        companySize: 'MEDIUM',
        jobType: 'エンジニア',
      },
    });
    testUserId = testUser.id;

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
    const mockGenerateSubGoals = jest.fn().mockResolvedValue([
      {
        title: 'TypeScriptの基礎文法を習得する',
        description:
          '型システム、インターフェース、ジェネリクスなどの基本概念を理解し、実践できるようになる',
        background: 'TypeScriptの基礎がなければ、高度な機能を理解することは困難である',
        position: 0,
      },
      {
        title: '高度な型システムを理解する',
        description: 'ユニオン型、交差型、条件付き型などの高度な型機能を習得する',
        background: '複雑なアプリケーションでは高度な型システムの理解が必要',
        position: 1,
      },
      {
        title: 'TypeScriptの設定とツールを習得する',
        description: 'tsconfig.json、ESLint、Prettierなどの設定を理解し、適切に設定できる',
        background: 'プロジェクトの品質を保つためにはツールの理解が不可欠',
        position: 2,
      },
      {
        title: 'Reactとの統合を学ぶ',
        description: 'React + TypeScriptの開発パターンを習得し、型安全なコンポーネントを作成できる',
        background: 'フロントエンド開発ではReactとの統合が重要',
        position: 3,
      },
      {
        title: 'Node.jsとの統合を学ぶ',
        description: 'Node.js + TypeScriptでバックエンド開発ができるようになる',
        background: 'フルスタック開発のためにはバックエンドの知識も必要',
        position: 4,
      },
      {
        title: 'テストコードを書けるようになる',
        description: 'Jest、Vitestなどを使用して型安全なテストコードを書けるようになる',
        background: '品質の高いコードを書くためにはテストが不可欠',
        position: 5,
      },
      {
        title: 'デザインパターンを理解する',
        description: 'TypeScriptでのデザインパターンの実装方法を習得する',
        background: '保守性の高いコードを書くためにはデザインパターンの理解が必要',
        position: 6,
      },
      {
        title: '実践的なプロジェクトを完成させる',
        description: 'TypeScriptを使用した実践的なプロジェクトを最初から最後まで完成させる',
        background: '学んだ知識を実践で活用することで真の理解が得られる',
        position: 7,
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateSubGoals: mockGenerateSubGoals,
        }) as any
    );
  });

  describe('11.1 正常系テストケース', () => {
    it('新規目標作成からサブ目標生成まで正常に完了する', async () => {
      // リクエストデータ
      const requestData = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180日後
        background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
        constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-request-001',
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

      const responseData: SubGoalGenerationResponse = await response.json();

      // レスポンス構造の検証
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.data?.goalId).toBeDefined();
      expect(responseData.data?.subGoals).toHaveLength(8);
      expect(responseData.metadata).toBeDefined();
      expect(responseData.metadata?.generatedAt).toBeDefined();
      expect(responseData.metadata?.tokensUsed).toBeGreaterThan(0);
      expect(responseData.metadata?.estimatedCost).toBeGreaterThan(0);

      // サブ目標の検証
      responseData.data?.subGoals.forEach((subGoal, index) => {
        expect(subGoal.id).toBeDefined();
        expect(subGoal.title).toBeDefined();
        expect(subGoal.title.length).toBeLessThanOrEqual(30);
        expect(subGoal.description).toBeDefined();
        expect(subGoal.description.length).toBeGreaterThanOrEqual(50);
        expect(subGoal.description.length).toBeLessThanOrEqual(200);
        expect(subGoal.background).toBeDefined();
        expect(subGoal.background.length).toBeLessThanOrEqual(100);
        expect(subGoal.position).toBe(index);
        expect(subGoal.progress).toBe(0);
        expect(subGoal.createdAt).toBeDefined();
        expect(subGoal.updatedAt).toBeDefined();
      });

      // データベースに保存されていることを確認
      testGoalId = responseData.data!.goalId;
      const savedGoal = await prisma.goal.findUnique({
        where: { id: testGoalId },
        include: { subGoals: true },
      });

      expect(savedGoal).toBeDefined();
      expect(savedGoal?.title).toBe(requestData.title);
      expect(savedGoal?.description).toBe(requestData.description);
      expect(savedGoal?.background).toBe(requestData.background);
      expect(savedGoal?.constraints).toBe(requestData.constraints);
      expect(savedGoal?.subGoals).toHaveLength(8);
    });

    it('既存目標の更新でサブ目標を再生成できる', async () => {
      // 既存の目標を作成
      const existingGoal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: '既存の目標',
          description: '既存の目標の説明',
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          background: '既存の背景',
          status: 'ACTIVE',
          progress: 0,
        },
      });

      // 既存のサブ目標を作成
      await prisma.subGoal.createMany({
        data: [
          {
            goalId: existingGoal.id,
            title: '既存サブ目標1',
            description: '既存サブ目標1の説明',
            background: '既存サブ目標1の背景',
            position: 0,
            progress: 0,
          },
          {
            goalId: existingGoal.id,
            title: '既存サブ目標2',
            description: '既存サブ目標2の説明',
            background: '既存サブ目標2の背景',
            position: 1,
            progress: 0,
          },
        ],
      });

      // 更新リクエストデータ
      const requestData = {
        goalId: existingGoal.id,
        title: '更新された目標',
        description: '更新された目標の説明',
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        background: '更新された背景',
        constraints: '更新された制約事項',
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-request-002',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: SubGoalGenerationResponse = await response.json();

      expect(responseData.success).toBe(true);
      expect(responseData.data?.goalId).toBe(existingGoal.id);
      expect(responseData.data?.subGoals).toHaveLength(8);

      // データベースの検証
      const updatedGoal = await prisma.goal.findUnique({
        where: { id: existingGoal.id },
        include: { subGoals: true },
      });

      expect(updatedGoal?.title).toBe(requestData.title);
      expect(updatedGoal?.description).toBe(requestData.description);
      expect(updatedGoal?.subGoals).toHaveLength(8);

      // 既存のサブ目標が削除され、新しいサブ目標が作成されていることを確認
      const newSubGoalTitles = updatedGoal?.subGoals.map(sg => sg.title);
      expect(newSubGoalTitles).not.toContain('既存サブ目標1');
      expect(newSubGoalTitles).not.toContain('既存サブ目標2');

      // クリーンアップ
      await prisma.goal.delete({
        where: { id: existingGoal.id },
      });
    });
  });
});

describe('11.2 異常系テストケース', () => {
  const authToken = 'Bearer test-token-user-123';

  it('JSON解析エラーが発生した場合、適切なエラーレスポンスを返す', async () => {
    // BedrockServiceのモックを変更してJSON解析エラーをシミュレート
    const mockGenerateSubGoals = jest
      .fn()
      .mockRejectedValue(new Error('AI生成結果の解析に失敗しました'));

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateSubGoals: mockGenerateSubGoals,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-003',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(500);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('INTERNAL_ERROR');
    expect(responseData.error?.message).toContain('サーバーエラー');
    expect(responseData.error?.retryable).toBe(true);
  });

  it('データベースエラーが発生した場合、トランザクションがロールバックされる', async () => {
    // データベースエラーをシミュレート
    const mockCreateGoal = jest
      .spyOn(prisma.goal, 'create')
      .mockRejectedValue(new Error('Database connection error'));

    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-004',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(500);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('DATABASE_ERROR');
    expect(responseData.error?.message).toBe('データの保存に失敗しました');
    expect(responseData.error?.retryable).toBe(true);

    // データベースに不完全なデータが残っていないことを確認
    const goals = await prisma.goal.findMany({
      where: {
        userId: testUserId,
        title: 'テスト目標',
      },
    });

    expect(goals).toHaveLength(0);

    // モックをリストア
    mockCreateGoal.mockRestore();
  });

  it('タイムアウトが発生した場合、適切なエラーメッセージを返す', async () => {
    // タイムアウトをシミュレート
    const mockGenerateSubGoals = jest.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('処理時間が長すぎます。もう一度お試しください'));
        }, 100);
      });
    });

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateSubGoals: mockGenerateSubGoals,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-005',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(500);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.message).toContain('処理時間が長すぎます');
  });
});

describe('11.3 認証エラーテスト', () => {
  const authToken = 'Bearer test-token-user-123';

  it('認証トークンがない場合、401エラーを返す', async () => {
    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト（認証トークンなし）
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'test-request-006',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(401);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(responseData.error?.message).toBe('認証が必要です');
    expect(responseData.error?.retryable).toBe(false);
  });

  it('無効な認証トークンの場合、401エラーを返す', async () => {
    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト（無効なトークン）
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token',
        'x-request-id': 'test-request-007',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(401);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(responseData.error?.retryable).toBe(false);
  });

  it('他人の目標を更新しようとした場合、403エラーを返す', async () => {
    // 別のユーザーを作成
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@example.com`,
        name: 'Other User',
        industry: 'TECHNOLOGY',
        companySize: 'SMALL',
      },
    });

    // 別のユーザーの目標を作成
    const otherGoal = await prisma.goal.create({
      data: {
        userId: otherUser.id,
        title: '他人の目標',
        description: '他人の目標の説明',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        background: '他人の背景',
        status: 'ACTIVE',
        progress: 0,
      },
    });

    // リクエストデータ（他人の目標IDを指定）
    const requestData = {
      goalId: otherGoal.id,
      title: '更新しようとする目標',
      description: '更新しようとする目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: '更新しようとする背景',
    };

    // APIリクエスト（testUserIdのトークンで他人の目標を更新しようとする）
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-008',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(403);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('FORBIDDEN_ERROR');
    expect(responseData.error?.message).toBe('この操作を実行する権限がありません');
    expect(responseData.error?.retryable).toBe(false);

    // クリーンアップ
    await prisma.goal.delete({
      where: { id: otherGoal.id },
    });
    await prisma.user.delete({
      where: { id: otherUser.id },
    });
  });

  it('存在しない目標を更新しようとした場合、404エラーを返す', async () => {
    // リクエストデータ（存在しない目標ID）
    const requestData = {
      goalId: '00000000-0000-0000-0000-000000000000',
      title: '更新しようとする目標',
      description: '更新しようとする目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: '更新しようとする背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-009',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(404);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('NOT_FOUND_ERROR');
    expect(responseData.error?.message).toBe('指定されたリソースが見つかりません');
    expect(responseData.error?.retryable).toBe(false);
  });
});

describe('11.2 バリデーションエラーテスト（追加）', () => {
  const authToken = 'Bearer test-token-user-123';

  it('タイトルが空の場合、400エラーを返す', async () => {
    // リクエストデータ（タイトルが空）
    const requestData = {
      title: '',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-010',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.error?.code).toBe('VALIDATION_ERROR');
    expect(responseData.error?.retryable).toBe(false);
    expect(responseData.error?.details).toBeDefined();
    expect(responseData.error?.details?.length).toBeGreaterThan(0);
  });

  it('タイトルが200文字を超える場合、400エラーを返す', async () => {
    // リクエストデータ（タイトルが長すぎる）
    const requestData = {
      title: 'a'.repeat(201),
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-011',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error?.code).toBe('VALIDATION_ERROR');
    expect(responseData.error?.retryable).toBe(false);
  });

  it('達成期限が過去の日付の場合、400エラーを返す', async () => {
    // リクエストデータ（過去の日付）
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨日
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-012',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error?.code).toBe('VALIDATION_ERROR');
    expect(responseData.error?.retryable).toBe(false);
  });

  it('必須フィールドが欠けている場合、400エラーを返す', async () => {
    // リクエストデータ（descriptionが欠けている）
    const requestData = {
      title: 'テスト目標',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-013',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(400);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error?.code).toBe('VALIDATION_ERROR');
    expect(responseData.error?.retryable).toBe(false);
    expect(responseData.error?.details).toBeDefined();
  });
});

describe('11.2 品質エラーテスト（追加）', () => {
  const authToken = 'Bearer test-token-user-123';

  it('サブ目標が8個でない場合、422エラーを返す', async () => {
    // BedrockServiceのモックを変更して7個のサブ目標を返す
    const mockGenerateSubGoals = jest.fn().mockResolvedValue([
      {
        title: 'サブ目標1',
        description: 'サブ目標1の説明'.repeat(10),
        background: 'サブ目標1の背景',
        position: 0,
      },
      {
        title: 'サブ目標2',
        description: 'サブ目標2の説明'.repeat(10),
        background: 'サブ目標2の背景',
        position: 1,
      },
      {
        title: 'サブ目標3',
        description: 'サブ目標3の説明'.repeat(10),
        background: 'サブ目標3の背景',
        position: 2,
      },
      {
        title: 'サブ目標4',
        description: 'サブ目標4の説明'.repeat(10),
        background: 'サブ目標4の背景',
        position: 3,
      },
      {
        title: 'サブ目標5',
        description: 'サブ目標5の説明'.repeat(10),
        background: 'サブ目標5の背景',
        position: 4,
      },
      {
        title: 'サブ目標6',
        description: 'サブ目標6の説明'.repeat(10),
        background: 'サブ目標6の背景',
        position: 5,
      },
      {
        title: 'サブ目標7',
        description: 'サブ目標7の説明'.repeat(10),
        background: 'サブ目標7の背景',
        position: 6,
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateSubGoals: mockGenerateSubGoals,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-014',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(422);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error?.code).toBe('QUALITY_ERROR');
    expect(responseData.error?.message).toContain('品質が基準を満たしませんでした');
    expect(responseData.error?.retryable).toBe(true);
  });

  it('サブ目標のタイトルが30文字を超える場合、422エラーを返す', async () => {
    // BedrockServiceのモックを変更して長いタイトルを返す
    const mockGenerateSubGoals = jest.fn().mockResolvedValue([
      {
        title: 'a'.repeat(31), // 31文字
        description: 'サブ目標1の説明'.repeat(10),
        background: 'サブ目標1の背景',
        position: 0,
      },
      {
        title: 'サブ目標2',
        description: 'サブ目標2の説明'.repeat(10),
        background: 'サブ目標2の背景',
        position: 1,
      },
      {
        title: 'サブ目標3',
        description: 'サブ目標3の説明'.repeat(10),
        background: 'サブ目標3の背景',
        position: 2,
      },
      {
        title: 'サブ目標4',
        description: 'サブ目標4の説明'.repeat(10),
        background: 'サブ目標4の背景',
        position: 3,
      },
      {
        title: 'サブ目標5',
        description: 'サブ目標5の説明'.repeat(10),
        background: 'サブ目標5の背景',
        position: 4,
      },
      {
        title: 'サブ目標6',
        description: 'サブ目標6の説明'.repeat(10),
        background: 'サブ目標6の背景',
        position: 5,
      },
      {
        title: 'サブ目標7',
        description: 'サブ目標7の説明'.repeat(10),
        background: 'サブ目標7の背景',
        position: 6,
      },
      {
        title: 'サブ目標8',
        description: 'サブ目標8の説明'.repeat(10),
        background: 'サブ目標8の背景',
        position: 7,
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateSubGoals: mockGenerateSubGoals,
        }) as any
    );

    // リクエストデータ
    const requestData = {
      title: 'テスト目標',
      description: 'テスト目標の説明',
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      background: 'テスト背景',
    };

    // APIリクエスト
    const request = new Request('http://localhost/api/ai/generate/subgoals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
        'x-request-id': 'test-request-015',
      },
      body: JSON.stringify(requestData),
    });

    // APIコール
    const response = await app.fetch(request);

    // レスポンスの検証
    expect(response.status).toBe(422);

    const responseData: SubGoalGenerationResponse = await response.json();

    expect(responseData.success).toBe(false);
    expect(responseData.error?.code).toBe('QUALITY_ERROR');
    expect(responseData.error?.retryable).toBe(true);
  });
});
