import { SeedDataSet, SeedUser, SeedGoal } from '../types';

// 大量データ生成用のヘルパー関数
function generateUsers(count: number): SeedUser[] {
  const industries = [
    'IT・ソフトウェア',
    '製造業',
    '教育',
    'ヘルスケア・医療',
    '金融',
    '小売',
    '建設',
    'コンサルティング',
  ];
  const companySizes = ['1-10名', '11-50名', '51-200名', '201-1000名', '1001名以上'];
  const jobTitles = [
    'エンジニア',
    'マネージャー',
    'ディレクター',
    'VP',
    'CEO',
    'CTO',
    'プロダクトマネージャー',
    'デザイナー',
  ];
  const positions = [
    'メンバー',
    'シニア',
    'リーダー',
    'マネージャー',
    'ディレクター',
    'VP',
    'エグゼクティブ',
  ];
  const personas = ['individual', 'corporate', 'student', 'freelancer'] as const;
  const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const;

  return Array.from({ length: count }, (_, i) => ({
    id: `perf-user-${String(i).padStart(6, '0')}`,
    email: `user${i}@performance-test.com`,
    name: `パフォーマンステストユーザー${i}`,
    industry: industries[i % industries.length],
    company_size: companySizes[i % companySizes.length],
    job_title: jobTitles[i % jobTitles.length],
    position: positions[i % positions.length],
    profile: {
      persona: personas[i % personas.length],
      experience_level: experienceLevels[i % experienceLevels.length],
      goal_types: ['performance', 'test', 'load'],
    },
  }));
}

function generateGoals(users: SeedUser[], goalsPerUser: number): SeedGoal[] {
  const goalTemplates = [
    '売上目標達成プロジェクト',
    'チーム生産性向上',
    '新サービス開発',
    '顧客満足度向上',
    'コスト削減プロジェクト',
    '品質改善活動',
    'デジタル変革推進',
    '人材育成プログラム',
    'マーケット拡大戦略',
    'イノベーション創出',
  ];

  const goals: SeedGoal[] = [];

  users.forEach((user, userIndex) => {
    for (let goalIndex = 0; goalIndex < goalsPerUser; goalIndex++) {
      const goalId = `perf-goal-${String(userIndex).padStart(6, '0')}-${String(goalIndex).padStart(2, '0')}`;
      const templateIndex = (userIndex * goalsPerUser + goalIndex) % goalTemplates.length;

      goals.push({
        id: goalId,
        user_id: user.id,
        title: `${goalTemplates[templateIndex]}${goalIndex + 1}`,
        description: `パフォーマンステスト用の目標${goalIndex + 1}。大量データでの動作確認を行う。`,
        deadline: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000), // ランダムな未来日
        background: `ユーザー${userIndex}の目標${goalIndex + 1}として設定`,
        constraints: 'パフォーマンステスト用データのため制約は最小限',
        status: ['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED'][Math.floor(Math.random() * 4)] as
          | 'DRAFT'
          | 'ACTIVE'
          | 'COMPLETED'
          | 'PAUSED',
        progress: Math.floor(Math.random() * 101),
        sub_goals: Array.from({ length: 8 }, (_, sgIndex) => ({
          id: `${goalId}-sg-${sgIndex}`,
          title: `サブ目標${sgIndex + 1}`,
          description: `パフォーマンステスト用サブ目標${sgIndex + 1}`,
          background: `サブ目標${sgIndex + 1}の背景`,
          position: sgIndex,
          progress: Math.floor(Math.random() * 101),
          actions: Array.from({ length: 8 }, (_, actionIndex) => ({
            id: `${goalId}-sg-${sgIndex}-action-${actionIndex}`,
            title: `アクション${actionIndex + 1}`,
            description: `パフォーマンステスト用アクション${actionIndex + 1}`,
            background: `アクション${actionIndex + 1}の背景`,
            type: actionIndex % 2 === 0 ? 'EXECUTION' : ('HABIT' as const),
            position: actionIndex,
            progress: Math.floor(Math.random() * 101),
            tasks:
              actionIndex < 2
                ? [
                    {
                      id: `${goalId}-sg-${sgIndex}-action-${actionIndex}-task-0`,
                      title: `タスク1`,
                      description: 'パフォーマンステスト用タスク',
                      type: 'EXECUTION' as const,
                      status: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'][
                        Math.floor(Math.random() * 4)
                      ] as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED',
                      estimated_minutes: Math.floor(Math.random() * 240) + 15,
                      completed_at: Math.random() > 0.5 ? new Date() : undefined,
                      reminders: [],
                    },
                  ]
                : [],
          })),
        })),
        reflections: [],
      });
    }
  });

  return goals;
}

// 1000ユーザー、10000目標のデータセット生成
const users = generateUsers(1000);
const goals = generateGoals(users, 10); // 1ユーザーあたり10目標

export const performanceDataSet: SeedDataSet = {
  name: 'Performance Test Dataset',
  description: 'パフォーマンステスト用大量データセット（1000ユーザー、10000目標）',
  environment: 'performance',
  users,
  goals,
  metadata: {
    version: '1.0.0',
    createdAt: new Date(),
    author: 'Performance Team',
    tags: ['performance', 'load-test', 'large-dataset'],
    estimatedRecords: users.length + goals.length * 65, // ユーザー + 目標×65(サブ目標8+アクション64+その他)
  },
};
