/**
 * Save Tasks Lambda Mock
 *
 * Requirements: 11.2 - Lambda関数モック
 */

import { mockDatabase, MockTask, createMockData } from '../database.mock';

export interface SaveTasksEvent {
  actionId: string;
  tasks: Array<{
    title: string;
    description: string;
    type: 'execution' | 'habit';
    estimatedMinutes: number;
  }>;
}

export interface SaveTasksResponse {
  actionId: string;
  savedTaskIds: string[];
  status: 'success' | 'failed';
  error?: string;
}

/**
 * タスク保存のモック実装
 */
export const mockSaveTasks = async (event: SaveTasksEvent): Promise<SaveTasksResponse> => {
  try {
    const savedTaskIds: string[] = [];
    const mockTasks: MockTask[] = [];

    for (const task of event.tasks) {
      const mockTask = createMockData.task({
        actionId: event.actionId,
        title: task.title,
        description: task.description,
        type: task.type,
        estimatedMinutes: task.estimatedMinutes,
      });

      mockTasks.push(mockTask);
      savedTaskIds.push(mockTask.id);
    }

    // トランザクション的に全タスクを保存
    await mockDatabase.saveTasks(mockTasks);

    return {
      actionId: event.actionId,
      savedTaskIds,
      status: 'success',
    };
  } catch (error) {
    return {
      actionId: event.actionId,
      savedTaskIds: [],
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
