/**
 * タスク生成APIのテストフィクスチャ
 */

import type {
  TaskGenerationRequest,
  TaskGenerationContext,
  TaskOutput,
  ActionContext,
  TaskType,
  TaskPriority,
} from '../../types/task-generation.types.js';

/**
 * テスト用アクションID
 */
export const TEST_ACTION_ID = '550e8400-e29b-41d4-a716-446655440003';
export const TEST_SUB_GOAL_ID = '550e8400-e29b-41d4-a716-446655440002';
export const TEST_GOAL_ID = '550e8400-e29b-41d4-a716-446655440001';
export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

/**
 * テスト用タスク生成リクエスト
 */
export const mockTaskGenerationRequest: TaskGenerationRequest = {
  actionId: TEST_ACTION_ID,
  regenerate: false,
};

/**
 * テスト用タスク生成コンテキスト（実行アクション）
 */
export const mockExecutionContext: TaskGenerationContext = {
  action: {
    id: TEST_ACTION_ID,
    title: 'TypeScript公式ドキュメントを読む',
    description:
      'TypeScript公式ドキュメントの基礎編を読み、型システム、インターフェース、クラスについて理解を深める',
    background: 'TypeScriptの基礎知識を習得するため',
    type: 'execution',
  },
  subGoal: {
    id: TEST_SUB_GOAL_ID,
    title: 'TypeScriptの基礎文法を習得する',
    description: 'TypeScriptの基本的な文法と型システムを理解し、実践的なコードを書けるようになる',
  },
  goal: {
    id: TEST_GOAL_ID,
    title: 'TypeScriptのエキスパートになる',
    description: 'TypeScriptを使った高品質なアプリケーション開発ができるようになる',
    deadline: new Date('2025-12-31'),
  },
  user: {
    preferences: {
      workStyle: 'focused',
      timeAvailable: 120,
    },
  },
};

/**
 * テスト用タスク生成コンテキスト（習慣アクション）
 */
export const mockHabitContext: TaskGenerationContext = {
  action: {
    id: TEST_ACTION_ID,
    title: '毎日TypeScriptのコードを書く',
    description: '毎日30分以上TypeScriptのコードを書いて、実践的なスキルを身につける',
    background: '継続的な学習により、TypeScriptのスキルを定着させるため',
    type: 'habit',
  },
  subGoal: {
    id: TEST_SUB_GOAL_ID,
    title: 'TypeScriptの実践力を高める',
    description: '実際のプロジェクトでTypeScriptを使いこなせるようになる',
  },
  goal: {
    id: TEST_GOAL_ID,
    title: 'TypeScriptのエキスパートになる',
    description: 'TypeScriptを使った高品質なアプリケーション開発ができるようになる',
    deadline: new Date('2025-12-31'),
  },
  user: {
    preferences: {
      workStyle: 'consistent',
      timeAvailable: 60,
    },
  },
};

/**
 * テスト用タスク出力（実行タスク）
 */
export const mockExecutionTasks: TaskOutput[] = [
  {
    title: 'TypeScript公式ドキュメントの基礎編を読む',
    description:
      'TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める',
    type: TaskType.EXECUTION,
    estimatedMinutes: 45,
    priority: TaskPriority.HIGH,
    dependencies: [],
    position: 0,
  },
  {
    title: 'TypeScriptの型システムを実践する',
    description:
      '学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する',
    type: TaskType.EXECUTION,
    estimatedMinutes: 60,
    priority: TaskPriority.MEDIUM,
    dependencies: [],
    position: 1,
  },
  {
    title: 'インターフェースとクラスの違いを理解する',
    description: 'インターフェースとクラスの使い分けを学び、実際のコードで両方を使ってみる',
    type: TaskType.EXECUTION,
    estimatedMinutes: 30,
    priority: TaskPriority.MEDIUM,
    dependencies: [],
    position: 2,
  },
];

/**
 * テスト用タスク出力（習慣タスク）
 */
export const mockHabitTasks: TaskOutput[] = [
  {
    title: 'TypeScriptで簡単なプログラムを書く',
    description: '毎日30分、TypeScriptで簡単なプログラムを書いて、基本的な文法に慣れる',
    type: TaskType.HABIT,
    estimatedMinutes: 30,
    priority: TaskPriority.HIGH,
    dependencies: [],
    position: 0,
  },
];

/**
 * テスト用アクションコンテキスト
 */
export const mockActionContext: ActionContext = {
  goalTitle: 'TypeScriptのエキスパートになる',
  subGoalTitle: 'TypeScriptの基礎文法を習得する',
  actionTitle: 'TypeScript公式ドキュメントを読む',
  actionType: 'execution',
};

/**
 * テスト用データベースレコード（アクション）
 */
export const mockActionRecord = {
  id: TEST_ACTION_ID,
  subGoalId: TEST_SUB_GOAL_ID,
  title: 'TypeScript公式ドキュメントを読む',
  description:
    'TypeScript公式ドキュメントの基礎編を読み、型システム、インターフェース、クラスについて理解を深める',
  background: 'TypeScriptの基礎知識を習得するため',
  constraints: null,
  type: 'execution',
  position: 0,
  progress: 0,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  subGoal: {
    id: TEST_SUB_GOAL_ID,
    goalId: TEST_GOAL_ID,
    title: 'TypeScriptの基礎文法を習得する',
    description: 'TypeScriptの基本的な文法と型システムを理解し、実践的なコードを書けるようになる',
    background: 'TypeScriptの基礎を固めるため',
    constraints: null,
    position: 0,
    progress: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    goal: {
      id: TEST_GOAL_ID,
      userId: TEST_USER_ID,
      title: 'TypeScriptのエキスパートになる',
      description: 'TypeScriptを使った高品質なアプリケーション開発ができるようになる',
      deadline: new Date('2025-12-31'),
      background: 'キャリアアップのため',
      constraints: null,
      status: 'active',
      progress: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      user: {
        id: TEST_USER_ID,
        email: 'test@example.com',
        name: 'テストユーザー',
        industry: 'IT',
        companySize: '100-500',
        jobTitle: 'エンジニア',
        position: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    },
  },
};

/**
 * テスト用データベースレコード（タスク）
 */
export const mockTaskRecords = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    actionId: TEST_ACTION_ID,
    title: 'TypeScript公式ドキュメントの基礎編を読む',
    description:
      'TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める',
    type: 'execution',
    status: 'not_started',
    estimatedMinutes: 45,
    completedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    actionId: TEST_ACTION_ID,
    title: 'TypeScriptの型システムを実践する',
    description:
      '学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する',
    type: 'execution',
    status: 'not_started',
    estimatedMinutes: 60,
    completedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
];
