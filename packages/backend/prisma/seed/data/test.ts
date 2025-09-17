import { SeedDataSet, SeedUser, SeedGoal } from '../types';

// エッジケース用ユーザー
const users: SeedUser[] = [
  // 最小値テスト用ユーザー
  {
    id: 'test-min-user',
    email: 'a@b.co',
    name: 'A',
    profile: {
      persona: 'individual',
      experience_level: 'beginner',
      goal_types: ['personal'],
    },
  },
  // 最大値テスト用ユーザー
  {
    id: 'test-max-user',
    email:
      'very.long.email.address.for.testing.maximum.length@very-long-domain-name-for-testing.example.com',
    name: 'とても長い名前のユーザーでテスト用の最大文字数を確認するためのサンプルデータです',
    industry: '非常に長い業界名でテスト用の最大文字数制限を確認するためのサンプルデータです',
    company_size: '1001名以上',
    job_title: '非常に長い職種名でテスト用の最大文字数制限を確認するためのサンプルデータです',
    position: '非常に長い役職名でテスト用の最大文字数制限を確認するためのサンプルデータです',
    profile: {
      persona: 'corporate',
      experience_level: 'advanced',
      goal_types: ['career', 'skill', 'project', 'management', 'personal'],
    },
  },
  // 境界値テスト用ユーザー
  {
    id: 'test-boundary-user',
    email: 'boundary@test.com',
    name: '境界値テスト',
    profile: {
      persona: 'freelancer',
      experience_level: 'intermediate',
      goal_types: ['business'],
    },
  },
];

// 境界値テスト用目標
const goals: SeedGoal[] = [
  // 進捗率0%の目標
  {
    id: 'test-goal-min-progress',
    user_id: 'test-min-user',
    title: '進捗率0%テスト目標',
    description: '進捗率の最小値（0%）をテストするための目標',
    deadline: new Date('2025-01-01'),
    background: '境界値テストのため',
    status: 'ACTIVE',
    progress: 0,
    sub_goals: Array.from({ length: 8 }, (_, i) => ({
      id: `test-subgoal-min-${i}`,
      title: `サブ目標${i}`,
      description: `サブ目標の説明${i}`,
      background: `背景${i}`,
      position: i,
      progress: 0,
      actions: Array.from({ length: 8 }, (_, j) => ({
        id: `test-action-min-${i}-${j}`,
        title: `アクション${j}`,
        description: `アクションの説明${j}`,
        background: `背景${j}`,
        type: 'EXECUTION' as const,
        position: j,
        progress: 0,
        tasks: [],
      })),
    })),
    reflections: [],
  },
  // 進捗率100%の目標
  {
    id: 'test-goal-max-progress',
    user_id: 'test-max-user',
    title: '進捗率100%テスト目標',
    description: '進捗率の最大値（100%）をテストするための目標',
    deadline: new Date('2024-12-31'),
    background: '境界値テストのため',
    status: 'COMPLETED',
    progress: 100,
    sub_goals: Array.from({ length: 8 }, (_, i) => ({
      id: `test-subgoal-max-${i}`,
      title: `完了サブ目標${i}`,
      description: `完了したサブ目標の説明${i}`,
      background: `背景${i}`,
      position: i,
      progress: 100,
      actions: Array.from({ length: 8 }, (_, j) => ({
        id: `test-action-max-${i}-${j}`,
        title: `完了アクション${j}`,
        description: `完了したアクションの説明${j}`,
        background: `背景${j}`,
        type: j % 2 === 0 ? 'EXECUTION' : ('HABIT' as const),
        position: j,
        progress: 100,
        tasks: [
          {
            id: `test-task-max-${i}-${j}-0`,
            title: '完了タスク',
            description: '完了したタスクの説明',
            type: 'EXECUTION' as const,
            status: 'COMPLETED' as const,
            estimated_minutes: 30,
            completed_at: new Date('2024-12-30'),
            reminders: [
              {
                id: `test-reminder-max-${i}-${j}-0`,
                reminder_date: new Date('2024-12-29'),
                sent: true,
                sent_at: new Date('2024-12-29T09:00:00Z'),
              },
            ],
          },
        ],
      })),
    })),
    reflections: [
      {
        id: 'test-reflection-max',
        summary:
          '目標を100%達成できました。計画通りに進行し、全てのタスクを完了することができました。',
        regretful_actions: '特になし。全て順調に進みました。',
        slow_progress_actions:
          '一部のタスクで予想より時間がかかりましたが、最終的には完了できました。',
        untouched_actions: '全てのアクションに取り組むことができました。',
      },
    ],
  },
  // エッジケース：最小限のデータ
  {
    id: 'test-goal-minimal',
    user_id: 'test-boundary-user',
    title: '最小',
    description: '最小限のデータでテストする目標',
    deadline: new Date('2025-06-30'),
    background: '最小',
    status: 'DRAFT',
    progress: 50,
    sub_goals: Array.from({ length: 8 }, (_, i) => ({
      id: `test-subgoal-minimal-${i}`,
      title: `最小${i}`,
      description: `最小${i}`,
      background: `最小${i}`,
      position: i,
      progress: i * 12, // 0, 12, 24, 36, 48, 60, 72, 84
      actions: Array.from({ length: 8 }, (_, j) => ({
        id: `test-action-minimal-${i}-${j}`,
        title: `最小${j}`,
        description: `最小${j}`,
        background: `最小${j}`,
        type: 'EXECUTION' as const,
        position: j,
        progress: j * 14, // 0, 14, 28, 42, 56, 70, 84, 98
        tasks:
          j < 2
            ? [
                {
                  id: `test-task-minimal-${i}-${j}`,
                  title: `最小タスク${j}`,
                  type: 'EXECUTION' as const,
                  status: 'NOT_STARTED' as const,
                  estimated_minutes: 15,
                  reminders: [],
                },
              ]
            : [],
      })),
    })),
    reflections: [],
  },
];

export const testDataSet: SeedDataSet = {
  name: 'Test Dataset',
  description: 'テスト用のエッジケース・境界値データセット',
  environment: 'test',
  users,
  goals,
  metadata: {
    version: '1.0.0',
    createdAt: new Date(),
    author: 'QA Team',
    tags: ['test', 'edge-case', 'boundary-value'],
    estimatedRecords:
      users.length +
      goals.reduce(
        (sum, goal) =>
          sum +
          1 +
          goal.sub_goals.length +
          goal.sub_goals.reduce((subSum, sg) => subSum + sg.actions.length, 0) +
          goal.sub_goals.reduce(
            (subSum, sg) =>
              subSum + sg.actions.reduce((actionSum, a) => actionSum + a.tasks.length, 0),
            0
          ),
        0
      ),
  },
};
