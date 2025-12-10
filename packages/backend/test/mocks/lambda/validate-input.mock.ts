/**
 * Validate Input Lambda Mock
 *
 * Requirements: 11.2 - Lambda関数モック
 */

import { mockDatabase } from '../database.mock';

export interface ValidateInputEvent {
  goalId: string;
  userId: string;
}

export interface ValidateInputResponse {
  goalId: string;
  userId: string;
  actionIds: string[];
  isValid: boolean;
  error?: string;
}

/**
 * 入力検証のモック実装
 */
export const mockValidateInput = async (
  event: ValidateInputEvent
): Promise<ValidateInputResponse> => {
  // 入力検証
  if (!event.goalId || !event.userId) {
    return {
      goalId: event.goalId,
      userId: event.userId,
      actionIds: [],
      isValid: false,
      error: 'Missing required fields: goalId or userId',
    };
  }

  // 目標の存在確認
  const goal = await mockDatabase.getGoal(event.goalId);
  if (!goal) {
    return {
      goalId: event.goalId,
      userId: event.userId,
      actionIds: [],
      isValid: false,
      error: `Goal not found: ${event.goalId}`,
    };
  }

  // ユーザーの所有権確認
  if (goal.userId !== event.userId) {
    return {
      goalId: event.goalId,
      userId: event.userId,
      actionIds: [],
      isValid: false,
      error: 'User does not own this goal',
    };
  }

  // モックアクションIDを返す
  const actionIds = Array.from({ length: 8 }, (_, i) => `action-${i + 1}`);

  return {
    goalId: event.goalId,
    userId: event.userId,
    actionIds,
    isValid: true,
  };
};
