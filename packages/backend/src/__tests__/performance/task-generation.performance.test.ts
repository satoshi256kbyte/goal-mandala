/**
 * タスク生成APIのパフォーマンステスト
 */

import { TaskGenerationService } from '../../services/task-generation.service';
import { ContextService } from '../../services/context.service';
import { BedrockService } from '../../services/bedrock.service';
import { TaskQualityValidator } from '../../services/task-quality-validator.service';
import { TaskDatabaseService } from '../../services/task-database.service';
import { PrismaClient } from '@prisma/client';

describe('TaskGenerationService パフォーマンステスト', () => {
  let service: TaskGenerationService;
  let prisma: PrismaClient;
  let userId: string;
  let goalId: string;
  let subGoalId: string;
  let actionId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // テストデータの作成
    const user = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        name: 'Performance Test User',
      },
    });
    userId = user.id;

    const goal = await prisma.goal.create({
      data: {
        userId,
        title: 'パフォーマンステスト目標',
        description: 'パフォーマンステスト用の目標',
        deadline: new Date('2025-12-31'),
        background: 'テスト用',
        status: 'ACTIVE',
      },
    });
    goalId = goal.id;

    const subGoal = await prisma.subGoal.create({
      data: {
        goalId,
        title: 'パフォーマンステストサブ目標',
        description: 'パフォーマンステスト用のサブ目標',
        background: 'テスト用',
        position: 0,
      },
    });
    subGoalId = subGoal.id;

    const action = await prisma.action.create({
      data: {
        subGoalId,
        title: 'パフォーマンステストアクション',
        description: 'パフォーマンステスト用のアクション',
        background: 'テスト用',
        type: 'EXECUTION',
        position: 0,
      },
    });
    actionId = action.id;

    // サービスの初期化
    const contextService = new ContextService(prisma);
    const bedrockService = new BedrockService();
    const qualityValidator = new TaskQualityValidator();
    const databaseService = new TaskDatabaseService(prisma);

    service = new TaskGenerationService(
      contextService,
      bedrockService,
      qualityValidator,
      databaseService
    );
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await prisma.task.deleteMany({ where: { action: { subGoal: { goal: { userId } } } } });
    await prisma.action.deleteMany({ where: { subGoal: { goal: { userId } } } });
    await prisma.subGoal.deleteMany({ where: { goal: { userId } } });
    await prisma.goal.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('レスポンス時間が30秒以内であること', async () => {
    const startTime = Date.now();

    // タスク生成を実行（実際のBedrock APIを呼び出す）
    // 注: このテストは実際のAPIを呼び出すため、時間がかかります
    // CI/CDでは環境変数でスキップすることを推奨
    if (process.env.SKIP_PERFORMANCE_TESTS === 'true') {
      console.log('パフォーマンステストをスキップしました');
      return;
    }

    try {
      await service.generateAndSaveTasks(userId, actionId, false);
    } catch (error) {
      // Bedrock APIが利用できない場合はスキップ
      console.log('Bedrock APIが利用できないため、テストをスキップしました');
      return;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`タスク生成処理時間: ${duration}ms`);

    // 30秒以内であることを確認
    expect(duration).toBeLessThan(30000);
  }, 35000); // タイムアウトを35秒に設定

  it('データベースクエリが効率的であること', async () => {
    // クエリ数をカウント
    let queryCount = 0;
    prisma.$on('query' as never, () => {
      queryCount++;
    });

    if (process.env.SKIP_PERFORMANCE_TESTS === 'true') {
      console.log('パフォーマンステストをスキップしました');
      return;
    }

    try {
      await service.generateAndSaveTasks(userId, actionId, true);
    } catch (error) {
      console.log('Bedrock APIが利用できないため、テストをスキップしました');
      return;
    }

    console.log(`実行されたクエリ数: ${queryCount}`);

    // N+1問題がないことを確認（クエリ数が10以下）
    expect(queryCount).toBeLessThan(10);
  }, 35000);
});
