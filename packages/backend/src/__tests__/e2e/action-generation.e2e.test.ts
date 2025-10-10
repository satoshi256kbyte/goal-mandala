/**
 * アクション生成APIのE2Eテスト
 * 実際のデータベースとモックされたBedrockサービスを使用して
 * エンドツーエンドのフローをテストする
 */

import { app } from '../../handlers/action-generation.js';
import { BedrockService } from '../../services/bedrock.service.js';
import type { ActionGenerationResponse } from '../../types/action-generation.types.js';
import { prisma } from '../../config/database.js';

// BedrockServiceのモック
jest.mock('../../services/bedrock.service.js');

describe('アクション生成API E2Eテスト', () => {
  let testUserId: string;
  let testGoalId: string;
  let testSubGoalId: string;
  let authToken: string;

  beforeAll(async () => {
    // データベース接続
    await prisma.$connect();

    // テストユーザーの作成
    const testUser = await prisma.user.create({
      data: {
        email: `test-action-${Date.now()}@example.com`,
        name: 'Test User for Actions',
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
    const mockGenerateActions = jest.fn().mockResolvedValue([
      {
        title: 'TypeScript公式ドキュメントを読む',
        description:
          'TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを実際に動かして理解を深める',
        background:
          '公式ドキュメントは最も正確で体系的な情報源であり、基礎を固めるために不可欠である',
        type: 'execution',
        position: 0,
      },
      {
        title: '毎日TypeScriptコードを書く',
        description: '毎日最低30分はTypeScriptでコードを書き、型システムの理解を深める習慣を作る',
        background: '継続的な実践により、TypeScriptの型システムが自然に身につく',
        type: 'habit',
        position: 1,
      },
      {
        title: '型定義ファイルを作成する',
        description:
          '既存のJavaScriptライブラリに対して型定義ファイルを作成し、型システムの理解を深める',
        background: '型定義ファイルの作成は、TypeScriptの型システムを深く理解する最良の方法である',
        type: 'execution',
        position: 2,
      },
      {
        title: 'TypeScriptの型エラーを解決する',
        description:
          '既存のコードベースの型エラーを1つずつ解決し、型システムの実践的な理解を深める',
        background: '実際の型エラーを解決することで、型システムの実践的な知識が身につく',
        type: 'execution',
        position: 3,
      },
      {
        title: 'TypeScriptのベストプラクティスを学ぶ',
        description:
          'TypeScriptのベストプラクティスに関する記事やブログを読み、実践的な知識を習得する',
        background: 'ベストプラクティスを学ぶことで、より良いコードを書けるようになる',
        type: 'execution',
        position: 4,
      },
      {
        title: 'TypeScriptのコードレビューを受ける',
        description: '書いたTypeScriptコードをレビューしてもらい、改善点を学ぶ',
        background: 'コードレビューを通じて、自分では気づかない改善点を学べる',
        type: 'execution',
        position: 5,
      },
      {
        title: 'TypeScriptの型パズルを解く',
        description: 'type-challengesなどの型パズルを解いて、型システムの理解を深める',
        background: '型パズルを解くことで、型システムの深い理解が得られる',
        type: 'execution',
        position: 6,
      },
      {
        title: 'TypeScriptのコミュニティに参加する',
        description: 'TypeScriptのコミュニティに参加し、他の開発者と交流して知識を深める',
        background: 'コミュニティでの交流を通じて、最新の情報や実践的な知識が得られる',
        type: 'habit',
        position: 7,
      },
    ]);

    (BedrockService as jest.MockedClass<typeof BedrockService>).mockImplementation(
      () =>
        ({
          generateActions: mockGenerateActions,
        }) as any
    );
  });

  describe('12.1 正常系テストケース', () => {
    it('サブ目標からアクションを生成できる', async () => {
      // リクエストデータ
      const requestData = {
        subGoalId: testSubGoalId,
        regenerate: false,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-action-request-001',
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

      const responseData: ActionGenerationResponse = await response.json();

      // レスポンス構造の検証
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.data?.subGoalId).toBe(testSubGoalId);
      expect(responseData.data?.actions).toHaveLength(8);
      expect(responseData.metadata).toBeDefined();
      expect(responseData.metadata?.generatedAt).toBeDefined();
      expect(responseData.metadata?.tokensUsed).toBeGreaterThan(0);
      expect(responseData.metadata?.estimatedCost).toBeGreaterThan(0);
      expect(responseData.metadata?.goalContext).toBeDefined();
      expect(responseData.metadata?.goalContext.goalTitle).toBe('TypeScriptのエキスパートになる');
      expect(responseData.metadata?.goalContext.subGoalTitle).toBe(
        'TypeScriptの基礎文法を習得する'
      );

      // データベースに保存されていることを確認
      const savedActions = await prisma.action.findMany({
        where: { subGoalId: testSubGoalId },
        orderBy: { position: 'asc' },
      });

      expect(savedActions).toHaveLength(8);
      savedActions.forEach((action, index) => {
        expect(action.title).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.background).toBeDefined();
        expect(['execution', 'habit']).toContain(action.type);
        expect(action.position).toBe(index);
        expect(action.progress).toBe(0);
      });
    });

    it('8個のアクションが生成される', async () => {
      // 既存のアクションを削除
      await prisma.action.deleteMany({
        where: { subGoalId: testSubGoalId },
      });

      // リクエストデータ
      const requestData = {
        subGoalId: testSubGoalId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-action-request-002',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: ActionGenerationResponse = await response.json();

      // 8個のアクションが生成されることを確認
      expect(responseData.data?.actions).toHaveLength(8);

      // データベースにも8個保存されていることを確認
      const savedActions = await prisma.action.findMany({
        where: { subGoalId: testSubGoalId },
      });

      expect(savedActions).toHaveLength(8);
    });

    it('アクション種別（EXECUTION/HABIT）が正しく設定される', async () => {
      // 既存のアクションを削除
      await prisma.action.deleteMany({
        where: { subGoalId: testSubGoalId },
      });

      // リクエストデータ
      const requestData = {
        subGoalId: testSubGoalId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-action-request-003',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      const responseData: ActionGenerationResponse = await response.json();

      // アクション種別が正しく設定されていることを確認
      responseData.data?.actions.forEach(action => {
        expect(['execution', 'habit']).toContain(action.type);
      });

      // データベースでも確認
      const savedActions = await prisma.action.findMany({
        where: { subGoalId: testSubGoalId },
      });

      savedActions.forEach(action => {
        expect(['execution', 'habit']).toContain(action.type);
      });

      // 少なくとも1つのEXECUTIONと1つのHABITが含まれることを確認
      const executionActions = savedActions.filter(a => a.type === 'execution');
      const habitActions = savedActions.filter(a => a.type === 'habit');

      expect(executionActions.length).toBeGreaterThan(0);
      expect(habitActions.length).toBeGreaterThan(0);
    });

    it('データベースに正しく保存される', async () => {
      // 既存のアクションを削除
      await prisma.action.deleteMany({
        where: { subGoalId: testSubGoalId },
      });

      // リクエストデータ
      const requestData = {
        subGoalId: testSubGoalId,
      };

      // APIリクエスト
      const request = new Request('http://localhost/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'x-request-id': 'test-action-request-004',
        },
        body: JSON.stringify(requestData),
      });

      // APIコール
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(200);

      // データベースから直接取得して検証
      const savedActions = await prisma.action.findMany({
        where: { subGoalId: testSubGoalId },
        orderBy: { position: 'asc' },
      });

      expect(savedActions).toHaveLength(8);

      savedActions.forEach((action, index) => {
        // 必須フィールドの検証
        expect(action.id).toBeDefined();
        expect(action.subGoalId).toBe(testSubGoalId);
        expect(action.title).toBeDefined();
        expect(action.title.length).toBeGreaterThan(0);
        expect(action.title.length).toBeLessThanOrEqual(50);
        expect(action.description).toBeDefined();
        expect(action.description.length).toBeGreaterThanOrEqual(100);
        expect(action.description.length).toBeLessThanOrEqual(200);
        expect(action.background).toBeDefined();
        expect(action.background.length).toBeLessThanOrEqual(100);
        expect(['execution', 'habit']).toContain(action.type);
        expect(action.position).toBe(index);
        expect(action.progress).toBe(0);
        expect(action.createdAt).toBeDefined();
        expect(action.updatedAt).toBeDefined();
      });
    });
  });
});
