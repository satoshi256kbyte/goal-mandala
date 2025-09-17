import { PrismaClient } from '../src/generated/prisma-client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'テストユーザー',
      industry: 'TECHNOLOGY',
      companySize: 'STARTUP',
      jobType: 'エンジニア',
      position: 'シニアエンジニア',
    },
  });

  console.log(`Created user: ${user.name} (${user.email})`);

  // Create sample goal
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: 'プロダクト開発スキルの向上',
      description: '次世代のWebアプリケーション開発に必要なスキルを習得する',
      deadline: new Date('2024-12-31'),
      background: 'AI技術の進歩により、従来の開発手法では競争力を維持できない',
      constraints: '平日夜間と週末のみ学習時間を確保可能',
      status: 'ACTIVE',
      progress: 25,
    },
  });

  console.log(`Created goal: ${goal.title}`);

  // Create sub goals (8 positions)
  const subGoalTitles = [
    'AI/ML基礎知識の習得',
    'クラウドアーキテクチャの理解',
    'フロントエンド技術の向上',
    'バックエンド設計の習得',
    'DevOps/CI-CD の実践',
    'セキュリティ知識の強化',
    'パフォーマンス最適化',
    'チーム開発手法の習得',
  ];

  const subGoals = [];
  for (let i = 0; i < 8; i++) {
    const subGoal = await prisma.subGoal.create({
      data: {
        goalId: goal.id,
        title: subGoalTitles[i],
        description: `${subGoalTitles[i]}に関する具体的な学習と実践`,
        background: `現在の技術トレンドに対応するため`,
        constraints: `週2-3時間の学習時間を確保`,
        position: i,
        progress: Math.floor(Math.random() * 50),
      },
    });
    subGoals.push(subGoal);
  }

  console.log(`Created ${subGoals.length} sub goals`);

  // Create actions for first sub goal (AI/ML基礎知識の習得)
  const actionTitles = [
    'Python基礎の復習',
    'NumPy/Pandasの習得',
    '機械学習ライブラリの学習',
    'データ前処理の実践',
    'モデル評価手法の理解',
    '実際のデータセットでの練習',
    'Kaggleコンペへの参加',
    'ポートフォリオ作成',
  ];

  const actions = [];
  for (let i = 0; i < 8; i++) {
    const action = await prisma.action.create({
      data: {
        subGoalId: subGoals[0].id,
        title: actionTitles[i],
        description: `${actionTitles[i]}を通じてAI/ML基礎を固める`,
        background: `実践的なスキル習得のため`,
        constraints: `オンライン教材を中心に学習`,
        position: i,
        progress: Math.floor(Math.random() * 80),
      },
    });
    actions.push(action);
  }

  console.log(`Created ${actions.length} actions`);

  // Create tasks for first action
  const taskTitles = [
    'Python環境のセットアップ',
    '基本文法の復習（変数、関数）',
    'データ構造の理解（リスト、辞書）',
    'オブジェクト指向の復習',
    '例外処理の実装',
    'ファイル操作の練習',
    '簡単なスクリプト作成',
    '学習内容のまとめ',
  ];

  const tasks = [];
  for (let i = 0; i < taskTitles.length; i++) {
    const task = await prisma.task.create({
      data: {
        actionId: actions[0].id,
        title: taskTitles[i],
        description: `${taskTitles[i]}を実施する`,
        type: i < 2 ? 'LEARNING' : i < 6 ? 'ACTION' : 'REVIEW',
        status: i < 3 ? 'COMPLETED' : i < 5 ? 'IN_PROGRESS' : 'PENDING',
        estimatedTime: 60 + Math.floor(Math.random() * 120), // 60-180分
        completedAt: i < 3 ? new Date() : null,
      },
    });
    tasks.push(task);
  }

  console.log(`Created ${tasks.length} tasks`);

  // Create task reminders
  const pendingTasks = tasks.filter(task => task.status === 'PENDING');
  for (const task of pendingTasks) {
    await prisma.taskReminder.create({
      data: {
        taskId: task.id,
        reminderAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        message: `「${task.title}」の実施をお忘れなく！`,
        status: 'PENDING',
      },
    });
  }

  console.log(`Created reminders for ${pendingTasks.length} pending tasks`);

  // Create reflections for completed tasks
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
  for (const task of completedTasks) {
    await prisma.reflection.create({
      data: {
        taskId: task.id,
        content: `${task.title}を完了しました。予想より時間がかかりましたが、理解が深まりました。`,
        rating: 4 + Math.floor(Math.random() * 2), // 4-5の評価
      },
    });
  }

  console.log(`Created reflections for ${completedTasks.length} completed tasks`);

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
