/**
 * Task Generation Lambda Mock
 *
 * Requirements: 11.2 - Lambda関数モック
 */

import { mockAIService, MockTaskGenerationInput } from '../ai-service.mock';

export interface TaskGenerationEvent {
  actionId: string;
  actionTitle: string;
  actionDescription: string;
  goalContext: {
    title: string;
    description: string;
    deadline: string;
  };
}

export interface TaskGenerationResponse {
  actionId: string;
  tasks: Array<{
    title: string;
    description: string;
    type: 'execution' | 'habit';
    estimatedMinutes: number;
  }>;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * タスク生成のモック実装
 */
export const mockTaskGeneration = async (
  event: TaskGenerationEvent
): Promise<TaskGenerationResponse> => {
  const input: MockTaskGenerationInput = {
    actionId: event.actionId,
    actionTitle: event.actionTitle,
    actionDescription: event.actionDescription,
    goalContext: event.goalContext,
  };

  return await mockAIService.generateTasks(input);
};
