/**
 * サブ目標生成APIのテストヘルパー
 */

import {
  SubGoalGenerationRequest,
  SubGoalOutput,
  ValidationErrorDetail,
} from '../../types/subgoal-generation.types';

/**
 * 有効なサブ目標生成リクエストのモックデータ
 */
export const mockValidRequest: SubGoalGenerationRequest = {
  title: 'TypeScriptのエキスパートになる',
  description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
  deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180日後
  background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
  constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
};

/**
 * goalIdを含む有効なリクエスト
 */
export const mockValidRequestWithGoalId: SubGoalGenerationRequest = {
  ...mockValidRequest,
  goalId: '550e8400-e29b-41d4-a716-446655440000',
};

/**
 * 無効なリクエスト（タイトルが空）
 */
export const mockInvalidRequestEmptyTitle: Partial<SubGoalGenerationRequest> = {
  title: '',
  description: '説明',
  deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  background: '背景',
};

/**
 * 無効なリクエスト（タイトルが長すぎる）
 */
export const mockInvalidRequestLongTitle: Partial<SubGoalGenerationRequest> = {
  title: 'a'.repeat(201),
  description: '説明',
  deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  background: '背景',
};

/**
 * 無効なリクエスト（過去の日付）
 */
export const mockInvalidRequestPastDeadline: Partial<SubGoalGenerationRequest> = {
  title: 'タイトル',
  description: '説明',
  deadline: '2020-01-01T00:00:00Z',
  background: '背景',
};

/**
 * モックサブ目標データ（8個）
 */
export const mockSubGoals: SubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
  id: `550e8400-e29b-41d4-a716-44665544000${i}`,
  title: `サブ目標${i + 1}`,
  description: 'a'.repeat(100), // 50文字以上200文字以内
  background: '背景情報',
  position: i,
  progress: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

/**
 * 品質基準を満たさないサブ目標（7個のみ）
 */
export const mockInvalidSubGoalsCount: SubGoalOutput[] = mockSubGoals.slice(0, 7);

/**
 * 品質基準を満たさないサブ目標（タイトルが長すぎる）
 */
export const mockInvalidSubGoalsLongTitle: SubGoalOutput[] = mockSubGoals.map((sg, i) =>
  i === 0 ? { ...sg, title: 'a'.repeat(31) } : sg
);

/**
 * 品質基準を満たさないサブ目標（説明が短すぎる）
 */
export const mockInvalidSubGoalsShortDescription: SubGoalOutput[] = mockSubGoals.map((sg, i) =>
  i === 0 ? { ...sg, description: 'a'.repeat(30) } : sg
);

/**
 * 品質基準を満たさないサブ目標（重複タイトル）
 */
export const mockInvalidSubGoalsDuplicateTitle: SubGoalOutput[] = mockSubGoals.map((sg, i) =>
  i === 0 || i === 1 ? { ...sg, title: '重複タイトル' } : sg
);

/**
 * バリデーションエラー詳細のモック
 */
export const mockValidationErrors: ValidationErrorDetail[] = [
  {
    field: 'title',
    message: '目標タイトルは必須です',
  },
];

/**
 * モックユーザーID
 */
export const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

/**
 * モック目標ID
 */
export const mockGoalId = '550e8400-e29b-41d4-a716-446655440000';

/**
 * テスト用のAPIGatewayProxyEventを生成
 */
export function createMockAPIGatewayEvent(
  body: unknown,
  userId: string = mockUserId
): Record<string, unknown> {
  return {
    httpMethod: 'POST',
    path: '/api/ai/generate/subgoals',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token',
    },
    body: JSON.stringify(body),
    requestContext: {
      requestId: 'test-request-001',
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    },
    isBase64Encoded: false,
  };
}

/**
 * テスト用のPrismaモックを生成
 */
export function createMockPrismaClient() {
  return {
    $transaction: jest.fn(),
    goal: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    subGoal: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
}

/**
 * テスト用のBedrockServiceモックを生成
 */
export function createMockBedrockService() {
  return {
    generateSubGoals: jest.fn().mockResolvedValue(mockSubGoals),
  };
}
