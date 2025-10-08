/**
 * サブ目標生成APIのテスト用フィクスチャ
 * モックデータとテストケースを定義
 */

import type { SubGoalOutput } from '../../types/subgoal-generation.types';

/**
 * 有効なサブ目標の例（8個）
 */
export const validSubGoals: SubGoalOutput[] = [
  {
    id: 'subgoal-1',
    title: 'TypeScriptの基礎文法を習得する',
    description:
      '型システム、インターフェース、ジェネリクスなどの基本概念を理解し、実践できるようになる',
    background: 'TypeScriptの基礎がなければ、高度な機能を理解することは困難である',
    position: 0,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-2',
    title: '高度な型システムを理解する',
    description: 'ユニオン型、交差型、条件型、マップ型などの高度な型機能を習得する',
    background: '複雑なアプリケーションでは高度な型システムの理解が必須である',
    position: 1,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-3',
    title: 'デコレータとメタデータを活用する',
    description: 'デコレータの仕組みを理解し、実務で活用できるようになる',
    background: 'フレームワークの理解にはデコレータの知識が重要である',
    position: 2,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-4',
    title: 'モジュールシステムを理解する',
    description: 'ESModules、CommonJS、名前空間などのモジュールシステムを習得する',
    background: '大規模プロジェクトではモジュール管理が重要である',
    position: 3,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-5',
    title: 'ビルドツールを使いこなす',
    description: 'TypeScriptコンパイラ、webpack、Viteなどのツールを習得する',
    background: '実務ではビルドツールの理解が必須である',
    position: 4,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-6',
    title: 'テストを書けるようになる',
    description: 'Jest、Vitestなどを使った型安全なテストコードを書けるようになる',
    background: '品質の高いコードにはテストが不可欠である',
    position: 5,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-7',
    title: 'フレームワークで実践する',
    description: 'React、Vue、Angularなどのフレームワークで実践的に活用する',
    background: '実務ではフレームワークとの組み合わせが重要である',
    position: 6,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal-8',
    title: 'パフォーマンスを最適化する',
    description: 'コンパイル時間、バンドルサイズ、実行速度の最適化を習得する',
    background: '大規模プロジェクトではパフォーマンスが重要である',
    position: 7,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 品質エラーのあるサブ目標（個数不足）
 */
export const insufficientSubGoals: SubGoalOutput[] = validSubGoals.slice(0, 7);

/**
 * 品質エラーのあるサブ目標（タイトルが長すぎる）
 */
export const longTitleSubGoals: SubGoalOutput[] = [
  {
    ...validSubGoals[0],
    title:
      'これは非常に長いタイトルで30文字を超えています。このようなタイトルは品質基準を満たしません。',
  },
  ...validSubGoals.slice(1),
];

/**
 * 品質エラーのあるサブ目標（説明が短すぎる）
 */
export const shortDescriptionSubGoals: SubGoalOutput[] = [
  {
    ...validSubGoals[0],
    description: '短い説明',
  },
  ...validSubGoals.slice(1),
];

/**
 * 品質エラーのあるサブ目標（説明が長すぎる）
 */
export const longDescriptionSubGoals: SubGoalOutput[] = [
  {
    ...validSubGoals[0],
    description: 'a'.repeat(201),
  },
  ...validSubGoals.slice(1),
];

/**
 * 品質エラーのあるサブ目標（背景が長すぎる）
 */
export const longBackgroundSubGoals: SubGoalOutput[] = [
  {
    ...validSubGoals[0],
    background: 'a'.repeat(101),
  },
  ...validSubGoals.slice(1),
];

/**
 * 品質エラーのあるサブ目標（重複タイトル）
 */
export const duplicateTitleSubGoals: SubGoalOutput[] = [
  validSubGoals[0],
  { ...validSubGoals[1], title: validSubGoals[0].title },
  ...validSubGoals.slice(2),
];

/**
 * Bedrock APIのモックレスポンス（成功）
 */
export const mockBedrockSuccessResponse = {
  body: new TextEncoder().encode(
    JSON.stringify({
      subGoals: validSubGoals.map(sg => ({
        title: sg.title,
        description: sg.description,
        background: sg.background,
        position: sg.position,
      })),
    })
  ),
  contentType: 'application/json',
};

/**
 * Bedrock APIのモックレスポンス（不正なJSON）
 */
export const mockBedrockInvalidJsonResponse = {
  body: new TextEncoder().encode('Invalid JSON'),
  contentType: 'text/plain',
};

/**
 * Bedrock APIのモックレスポンス（品質エラー）
 */
export const mockBedrockQualityErrorResponse = {
  body: new TextEncoder().encode(
    JSON.stringify({
      subGoals: insufficientSubGoals.map(sg => ({
        title: sg.title,
        description: sg.description,
        background: sg.background,
        position: sg.position,
      })),
    })
  ),
  contentType: 'application/json',
};

/**
 * データベースのモックデータ（Goal）
 */
export const mockGoal = {
  id: 'goal-123',
  userId: 'user-123',
  title: 'TypeScriptのエキスパートになる',
  description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
  deadline: new Date('2025-12-31'),
  background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
  constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
  status: 'ACTIVE' as const,
  progress: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * データベースのモックデータ（SubGoal）
 */
export const mockSubGoalsDB = validSubGoals.map(sg => ({
  id: sg.id,
  goalId: mockGoal.id,
  title: sg.title,
  description: sg.description,
  background: sg.background,
  constraints: null,
  position: sg.position,
  progress: sg.progress,
  createdAt: new Date(sg.createdAt),
  updatedAt: new Date(sg.updatedAt),
}));

/**
 * ユーザー情報のモックデータ
 */
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  industry: 'IT・通信',
  companySize: '100-499人',
  jobTitle: 'フロントエンドエンジニア',
  position: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * エラーメッセージの定数
 */
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: '入力データが不正です',
  QUALITY_ERROR: 'AI生成結果の品質が基準を満たしませんでした',
  DATABASE_ERROR: 'データの保存に失敗しました',
  AI_SERVICE_ERROR: 'AI生成サービスが一時的に利用できません',
  AUTHENTICATION_ERROR: '認証が必要です',
  AUTHORIZATION_ERROR: 'この目標を編集する権限がありません',
  NOT_FOUND_ERROR: '目標が見つかりません',
  RATE_LIMIT_ERROR: 'リクエスト制限を超えました',
};

/**
 * テストケースのタイムアウト設定
 */
export const TEST_TIMEOUTS = {
  UNIT: 5000,
  INTEGRATION: 10000,
  E2E: 30000,
};
