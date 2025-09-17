import { SeedDataSet, SeedUser, SeedGoal } from '../types';

const users: SeedUser[] = [
  // IT業界ユーザー
  {
    id: 'demo-it-user',
    email: 'tech.lead@startup.com',
    name: '山田 技術',
    industry: 'IT・ソフトウェア',
    company_size: '11-50名',
    job_title: 'テックリード',
    position: 'リーダー',
    profile: {
      persona: 'corporate',
      experience_level: 'advanced',
      goal_types: ['technical', 'team', 'product'],
    },
  },
  // 製造業ユーザー
  {
    id: 'demo-manufacturing-user',
    email: 'factory.manager@manufacturing.co.jp',
    name: '鈴木 製造',
    industry: '製造業',
    company_size: '1001名以上',
    job_title: '工場長',
    position: 'マネージャー',
    profile: {
      persona: 'corporate',
      experience_level: 'advanced',
      goal_types: ['efficiency', 'quality', 'safety'],
    },
  },
  // 教育業界ユーザー
  {
    id: 'demo-education-user',
    email: 'principal@school.edu',
    name: '田中 教育',
    industry: '教育',
    company_size: '51-200名',
    job_title: '校長',
    position: 'エグゼクティブ',
    profile: {
      persona: 'corporate',
      experience_level: 'advanced',
      goal_types: ['education', 'management', 'community'],
    },
  },
  // ヘルスケア業界ユーザー
  {
    id: 'demo-healthcare-user',
    email: 'director@hospital.med',
    name: '佐藤 医療',
    industry: 'ヘルスケア・医療',
    company_size: '201-1000名',
    job_title: '医療ディレクター',
    position: 'ディレクター',
    profile: {
      persona: 'corporate',
      experience_level: 'advanced',
      goal_types: ['healthcare', 'quality', 'patient-care'],
    },
  },
];

const goals: SeedGoal[] = [
  // IT業界：成功事例（完了済み）
  {
    id: 'demo-success-goal',
    user_id: 'demo-it-user',
    title: 'チーム生産性30%向上プロジェクト',
    description: '開発チームの生産性を30%向上させ、リリースサイクルを短縮する',
    deadline: new Date('2024-12-31'),
    background: '競合他社との差別化を図るため、開発速度の向上が急務となった',
    constraints: '既存システムを維持しながらの改善が必要',
    status: 'COMPLETED',
    progress: 100,
    sub_goals: [
      {
        id: 'demo-sg-001-0',
        title: 'アジャイル開発プロセス導入',
        description: 'スクラム手法を導入し、2週間スプリントを確立',
        background: '従来のウォーターフォール開発からの脱却',
        position: 0,
        progress: 100,
        actions: Array.from({ length: 8 }, (_, i) => ({
          id: `demo-action-001-0-${i}`,
          title: [
            'スクラム研修実施',
            'スプリント計画会議設定',
            'デイリースタンドアップ導入',
            'レトロスペクティブ実施',
            'バックログ管理ツール導入',
            'ベロシティ測定開始',
            'バーンダウンチャート作成',
            'チーム振り返り文化醸成',
          ][i],
          description: `アジャイル開発に必要な${['研修', '計画', '会議', '振り返り', 'ツール', '測定', 'チャート', '文化'][i]}を実装`,
          background: 'アジャイル開発の基盤構築',
          type: 'EXECUTION' as const,
          position: i,
          progress: 100,
          tasks: [
            {
              id: `demo-task-001-0-${i}-0`,
              title: `${['研修計画策定', '会議室予約', '朝会時間設定', '振り返り議題作成', 'ツール選定', '測定基準定義', 'テンプレート作成', '文化浸透計画'][i]}`,
              type: 'EXECUTION' as const,
              status: 'COMPLETED' as const,
              estimated_minutes: 120,
              completed_at: new Date('2024-11-15'),
              reminders: [],
            },
          ],
        })),
      },
      {
        id: 'demo-sg-001-1',
        title: 'CI/CD パイプライン構築',
        description: '自動テスト・デプロイメントパイプラインを構築',
        background: '手動デプロイによる時間ロスとヒューマンエラーの削減',
        position: 1,
        progress: 100,
        actions: Array.from({ length: 8 }, (_, i) => ({
          id: `demo-action-001-1-${i}`,
          title: [
            'GitHub Actions設定',
            '自動テスト実装',
            'Docker化',
            'ステージング環境構築',
            '本番デプロイ自動化',
            'ロールバック機能',
            '監視・アラート設定',
            'パフォーマンス測定',
          ][i],
          description: `CI/CDに必要な${['設定', 'テスト', 'コンテナ', '環境', 'デプロイ', 'ロールバック', '監視', '測定'][i]}を実装`,
          background: 'DevOps文化の確立',
          type: 'EXECUTION' as const,
          position: i,
          progress: 100,
          tasks: [],
        })),
      },
      // 残り6つのサブ目標も同様に100%完了
      ...Array.from({ length: 6 }, (_, sgIndex) => ({
        id: `demo-sg-001-${sgIndex + 2}`,
        title: [
          'コードレビュー文化醸成',
          'テスト自動化推進',
          'ドキュメント整備',
          '技術的負債解消',
          'チームスキル向上',
          '成果測定・改善',
        ][sgIndex],
        description: `${['コードレビュー', 'テスト自動化', 'ドキュメント', '技術的負債', 'スキル向上', '成果測定'][sgIndex]}による生産性向上`,
        background: '継続的な改善活動',
        position: sgIndex + 2,
        progress: 100,
        actions: Array.from({ length: 8 }, (_, i) => ({
          id: `demo-action-001-${sgIndex + 2}-${i}`,
          title: `アクション${i + 1}`,
          description: `${['コードレビュー', 'テスト自動化', 'ドキュメント', '技術的負債', 'スキル向上', '成果測定'][sgIndex]}関連のアクション${i + 1}`,
          background: '生産性向上のための施策',
          type: 'EXECUTION' as const,
          position: i,
          progress: 100,
          tasks: [],
        })),
      })),
    ],
    reflections: [
      {
        id: 'demo-reflection-success',
        summary: '目標を100%達成。特にアジャイル導入とCI/CD構築が効果的で、生産性が32%向上した。',
        regretful_actions: 'コードレビュープロセスの改善をもっと早く着手すべきだった。',
        slow_progress_actions:
          'チーム研修の実施が予想より時間がかかった。全員のスケジュール調整が困難だった。',
        untouched_actions:
          '外部ツール連携の一部機能は次期プロジェクトに持ち越し。優先度を見直す必要がある。',
      },
    ],
  },
  // 製造業：進行中の目標
  {
    id: 'demo-manufacturing-goal',
    user_id: 'demo-manufacturing-user',
    title: '工場安全性向上と効率化プロジェクト',
    description: '労働災害ゼロを目指し、同時に生産効率を15%向上させる',
    deadline: new Date('2025-06-30'),
    background: '近年の労働災害増加と競争激化への対応',
    constraints: '既存設備を活用しながらの改善が必要',
    status: 'ACTIVE',
    progress: 65,
    sub_goals: Array.from({ length: 8 }, (_, i) => ({
      id: `demo-sg-002-${i}`,
      title: [
        '安全教育プログラム強化',
        '設備点検システム改善',
        '作業手順標準化',
        'IoTセンサー導入',
        '品質管理システム強化',
        '従業員スキル向上',
        '環境改善活動',
        '成果測定・分析',
      ][i],
      description: `${['安全教育', '設備点検', '作業標準化', 'IoT活用', '品質管理', 'スキル向上', '環境改善', '成果分析'][i]}による工場改善`,
      background: '安全性と効率性の両立',
      position: i,
      progress: [90, 80, 70, 60, 65, 50, 40, 30][i],
      actions: Array.from({ length: 8 }, (_, j) => ({
        id: `demo-action-002-${i}-${j}`,
        title: `アクション${j + 1}`,
        description: `${['安全教育', '設備点検', '作業標準化', 'IoT活用', '品質管理', 'スキル向上', '環境改善', '成果分析'][i]}のアクション${j + 1}`,
        background: '工場改善のための具体的施策',
        type: j % 2 === 0 ? 'EXECUTION' : ('HABIT' as const),
        position: j,
        progress: Math.max(0, [90, 80, 70, 60, 65, 50, 40, 30][i] - j * 10),
        tasks:
          j < 3
            ? [
                {
                  id: `demo-task-002-${i}-${j}-0`,
                  title: `タスク${j + 1}`,
                  type: 'EXECUTION' as const,
                  status: j < 2 ? 'COMPLETED' : ('IN_PROGRESS' as const),
                  estimated_minutes: 90,
                  completed_at: j < 2 ? new Date('2025-01-15') : undefined,
                  reminders: [],
                },
              ]
            : [],
      })),
    })),
    reflections: [],
  },
];

export const demoDataSet: SeedDataSet = {
  name: 'Demo Dataset',
  description: 'デモンストレーション用の業界別リアルデータセット',
  environment: 'demo',
  users,
  goals,
  metadata: {
    version: '1.0.0',
    createdAt: new Date(),
    author: 'Product Team',
    tags: ['demo', 'industry-specific', 'success-stories'],
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
