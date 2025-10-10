/**
 * アクション生成APIのテストデータヘルパー
 */

import type {
  ActionGenerationRequest,
  ActionOutput,
  GenerationContext,
} from '../../types/action-generation.types.js';
import { ActionType } from '../../types/action-generation.types.js';

/**
 * テスト用のサブ目標ID
 */
export const TEST_SUBGOAL_ID = '550e8400-e29b-41d4-a716-446655440001';
export const TEST_GOAL_ID = '550e8400-e29b-41d4-a716-446655440000';
export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

/**
 * テスト用のアクション生成リクエストを作成
 */
export function createTestActionGenerationRequest(
  overrides?: Partial<ActionGenerationRequest>
): ActionGenerationRequest {
  return {
    subGoalId: TEST_SUBGOAL_ID,
    regenerate: false,
    ...overrides,
  };
}

/**
 * テスト用のアクション出力を作成
 */
export function createTestActionOutput(overrides?: Partial<ActionOutput>): ActionOutput {
  return {
    title: 'TypeScript公式ドキュメントを読む',
    description:
      'TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを実際に動かして理解を深める',
    background: '公式ドキュメントは最も正確で体系的な情報源であり、基礎を固めるために不可欠である',
    type: ActionType.EXECUTION,
    position: 0,
    progress: 0,
    ...overrides,
  };
}

/**
 * テスト用の8個のアクション出力を作成
 */
export function createTestActionsOutput(): ActionOutput[] {
  return [
    createTestActionOutput({
      title: 'TypeScript公式ドキュメントを読む',
      type: ActionType.EXECUTION,
      position: 0,
    }),
    createTestActionOutput({
      title: '毎日TypeScriptコードを書く',
      description: '毎日最低30分はTypeScriptでコードを書き、型システムの理解を深める習慣を作る',
      background: '継続的な実践により、TypeScriptの型システムが自然に身につく',
      type: ActionType.HABIT,
      position: 1,
    }),
    createTestActionOutput({
      title: 'TypeScriptの型システムを学ぶ',
      type: ActionType.EXECUTION,
      position: 2,
    }),
    createTestActionOutput({
      title: 'ジェネリクスを理解する',
      type: ActionType.EXECUTION,
      position: 3,
    }),
    createTestActionOutput({
      title: 'ユーティリティ型を使いこなす',
      type: ActionType.EXECUTION,
      position: 4,
    }),
    createTestActionOutput({
      title: 'TypeScriptのベストプラクティスを学ぶ',
      type: ActionType.EXECUTION,
      position: 5,
    }),
    createTestActionOutput({
      title: '型定義ファイルを作成する',
      type: ActionType.EXECUTION,
      position: 6,
    }),
    createTestActionOutput({
      title: 'TypeScriptプロジェクトを構築する',
      type: ActionType.EXECUTION,
      position: 7,
    }),
  ];
}

/**
 * テスト用の生成コンテキストを作成
 */
export function createTestGenerationContext(
  overrides?: Partial<GenerationContext>
): GenerationContext {
  return {
    goal: {
      id: TEST_GOAL_ID,
      title: 'TypeScriptのエキスパートになる',
      description: 'TypeScriptの型システムを完全に理解し、実務で活用できるレベルになる',
      deadline: new Date('2025-12-31'),
      background:
        'フロントエンド開発でTypeScriptの需要が高まっており、キャリアアップのために習得が必要',
      constraints: '平日は仕事があるため、学習時間は限られる',
    },
    subGoal: {
      id: TEST_SUBGOAL_ID,
      title: 'TypeScriptの基礎文法を習得する',
      description: '型アノテーション、インターフェース、ジェネリクスなどの基本的な文法を理解する',
      background: '基礎がなければ応用的な内容を理解できない',
      position: 0,
    },
    relatedSubGoals: [
      {
        title: '型システムを深く理解する',
        description: '高度な型操作やユーティリティ型を使いこなす',
        position: 1,
      },
      {
        title: '実践的なプロジェクトを作る',
        description: 'TypeScriptで実際のアプリケーションを構築する',
        position: 2,
      },
    ],
    user: {
      industry: 'IT・通信',
      jobType: 'フロントエンドエンジニア',
    },
    ...overrides,
  };
}
