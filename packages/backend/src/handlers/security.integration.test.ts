import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma-client';
import goalsHandler from './goals';
import subgoalsHandler from './subgoals';
import actionsHandler from './actions';

describe('セキュリティ統合テスト', () => {
  let app: Hono;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
    app = new Hono();
    app.route('/api/goals', goalsHandler);
    app.route('/api/subgoals', subgoalsHandler);
    app.route('/api/actions', actionsHandler);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('XSS攻撃の防止', () => {
    it('目標更新時にスクリプトタグを削除する', async () => {
      const userId = 'test-user-xss';
      const goalId = 'test-goal-xss';

      // テストデータ作成
      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: userId,
          title: 'Test Goal',
          description: 'Test Description',
          deadline: new Date('2025-12-31'),
          background: 'Test Background',
          status: 'active',
          progress: 0,
        },
      });

      const maliciousData = {
        title: '<script>alert("XSS")</script>Malicious Title',
        description: '<img src=x onerror="alert(1)">',
        deadline: '2025-12-31',
        background: '<iframe src="evil.com"></iframe>Background',
        constraints: '<a href="javascript:void(0)">Click</a>',
        updatedAt: goal.updatedAt.toISOString(),
      };

      const response = await app.request(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-token-${userId}`,
        },
        body: JSON.stringify(maliciousData),
      });

      expect(response.status).toBe(200);

      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goalId },
      });

      // XSS攻撃が防がれていることを確認
      expect(updatedGoal?.title).not.toContain('<script>');
      expect(updatedGoal?.description).not.toContain('onerror');
      expect(updatedGoal?.background).not.toContain('<iframe>');
      expect(updatedGoal?.constraints).not.toContain('javascript:');

      // クリーンアップ
      await prisma.goal.delete({ where: { id: goalId } });
    });

    it('サブ目標更新時にXSS攻撃を防ぐ', async () => {
      const userId = 'test-user-xss-subgoal';
      const goalId = 'test-goal-xss-subgoal';
      const subGoalId = 'test-subgoal-xss';

      // テストデータ作成
      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: userId,
          title: 'Test Goal',
          description: 'Test Description',
          deadline: new Date('2025-12-31'),
          background: 'Test Background',
          status: 'active',
          progress: 0,
        },
      });

      const subGoal = await prisma.subGoal.create({
        data: {
          id: subGoalId,
          goalId: goalId,
          title: 'Test SubGoal',
          description: 'Test Description',
          background: 'Test Background',
          position: 0,
          progress: 0,
        },
      });

      const maliciousData = {
        title: '<svg onload="alert(1)">Title',
        description: '<body onload="alert(1)">Description',
        background: '<object data="evil.swf"></object>',
        updatedAt: subGoal.updatedAt.toISOString(),
      };

      const response = await app.request(`/api/subgoals/${subGoalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-token-${userId}`,
        },
        body: JSON.stringify(maliciousData),
      });

      expect(response.status).toBe(200);

      const updatedSubGoal = await prisma.subGoal.findUnique({
        where: { id: subGoalId },
      });

      expect(updatedSubGoal?.title).not.toContain('onload');
      expect(updatedSubGoal?.description).not.toContain('onload');
      expect(updatedSubGoal?.background).not.toContain('<object>');

      // クリーンアップ
      await prisma.subGoal.delete({ where: { id: subGoalId } });
      await prisma.goal.delete({ where: { id: goalId } });
    });
  });

  describe('権限チェック', () => {
    it('他人の目標を編集できない', async () => {
      const ownerId = 'owner-user';
      const attackerId = 'attacker-user';
      const goalId = 'test-goal-permission';

      // 所有者の目標を作成
      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: ownerId,
          title: 'Owner Goal',
          description: 'Owner Description',
          deadline: new Date('2025-12-31'),
          background: 'Owner Background',
          status: 'active',
          progress: 0,
        },
      });

      // 攻撃者が編集を試みる
      const response = await app.request(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-token-${attackerId}`,
        },
        body: JSON.stringify({
          title: 'Hacked Title',
          description: 'Hacked Description',
          deadline: '2025-12-31',
          background: 'Hacked Background',
          updatedAt: goal.updatedAt.toISOString(),
        }),
      });

      expect(response.status).toBe(403);

      const unchangedGoal = await prisma.goal.findUnique({
        where: { id: goalId },
      });

      expect(unchangedGoal?.title).toBe('Owner Goal');
      expect(unchangedGoal?.description).toBe('Owner Description');

      // クリーンアップ
      await prisma.goal.delete({ where: { id: goalId } });
    });

    it('認証なしでは編集できない', async () => {
      const userId = 'test-user-auth';
      const goalId = 'test-goal-auth';

      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: userId,
          title: 'Test Goal',
          description: 'Test Description',
          deadline: new Date('2025-12-31'),
          background: 'Test Background',
          status: 'active',
          progress: 0,
        },
      });

      const response = await app.request(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Unauthorized Title',
          description: 'Unauthorized Description',
          deadline: '2025-12-31',
          background: 'Unauthorized Background',
          updatedAt: goal.updatedAt.toISOString(),
        }),
      });

      expect(response.status).toBe(401);

      // クリーンアップ
      await prisma.goal.delete({ where: { id: goalId } });
    });

    it('サブ目標の所有者でない場合は編集できない', async () => {
      const ownerId = 'owner-user-subgoal';
      const attackerId = 'attacker-user-subgoal';
      const goalId = 'test-goal-subgoal-permission';
      const subGoalId = 'test-subgoal-permission';

      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: ownerId,
          title: 'Owner Goal',
          description: 'Owner Description',
          deadline: new Date('2025-12-31'),
          background: 'Owner Background',
          status: 'active',
          progress: 0,
        },
      });

      const subGoal = await prisma.subGoal.create({
        data: {
          id: subGoalId,
          goalId: goalId,
          title: 'Owner SubGoal',
          description: 'Owner Description',
          background: 'Owner Background',
          position: 0,
          progress: 0,
        },
      });

      const response = await app.request(`/api/subgoals/${subGoalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-token-${attackerId}`,
        },
        body: JSON.stringify({
          title: 'Hacked SubGoal',
          description: 'Hacked Description',
          background: 'Hacked Background',
          updatedAt: subGoal.updatedAt.toISOString(),
        }),
      });

      expect(response.status).toBe(403);

      const unchangedSubGoal = await prisma.subGoal.findUnique({
        where: { id: subGoalId },
      });

      expect(unchangedSubGoal?.title).toBe('Owner SubGoal');

      // クリーンアップ
      await prisma.subGoal.delete({ where: { id: subGoalId } });
      await prisma.goal.delete({ where: { id: goalId } });
    });
  });

  describe('入力バリデーション', () => {
    it('長すぎるタイトルを拒否する', async () => {
      const userId = 'test-user-validation';
      const goalId = 'test-goal-validation';

      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: userId,
          title: 'Test Goal',
          description: 'Test Description',
          deadline: new Date('2025-12-31'),
          background: 'Test Background',
          status: 'active',
          progress: 0,
        },
      });

      const response = await app.request(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-token-${userId}`,
        },
        body: JSON.stringify({
          title: 'a'.repeat(101), // 100文字を超える
          description: 'Test Description',
          deadline: '2025-12-31',
          background: 'Test Background',
          updatedAt: goal.updatedAt.toISOString(),
        }),
      });

      expect(response.status).toBe(400);

      // クリーンアップ
      await prisma.goal.delete({ where: { id: goalId } });
    });

    it('空のタイトルを拒否する', async () => {
      const userId = 'test-user-empty';
      const goalId = 'test-goal-empty';

      const goal = await prisma.goal.create({
        data: {
          id: goalId,
          userId: userId,
          title: 'Test Goal',
          description: 'Test Description',
          deadline: new Date('2025-12-31'),
          background: 'Test Background',
          status: 'active',
          progress: 0,
        },
      });

      const response = await app.request(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-token-${userId}`,
        },
        body: JSON.stringify({
          title: '',
          description: 'Test Description',
          deadline: '2025-12-31',
          background: 'Test Background',
          updatedAt: goal.updatedAt.toISOString(),
        }),
      });

      expect(response.status).toBe(400);

      // クリーンアップ
      await prisma.goal.delete({ where: { id: goalId } });
    });
  });
});
