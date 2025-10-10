/**
 * レスポンス解析サービス
 */

import { z } from 'zod';
import type { SubGoalOutput, ActionOutput, TaskOutput } from '../types/ai-generation.types.js';

// Zodスキーマ定義
const SubGoalSchema = z.object({
  title: z.string(),
  description: z.string(),
  background: z.string(),
  position: z.number(),
});

const ActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(['execution', 'habit']),
  background: z.string(),
  position: z.number(),
});

const TaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(['execution', 'habit']),
  estimatedMinutes: z.number(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  dependencies: z.array(z.string()).optional(),
});

const SubGoalsResponseSchema = z.object({
  subGoals: z.array(SubGoalSchema),
});

const ActionsResponseSchema = z.object({
  actions: z.array(ActionSchema),
});

const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
});

/**
 * ResponseParser
 */
export class ResponseParser {
  /**
   * サブ目標レスポンスを解析
   */
  parseSubGoals(response: string): SubGoalOutput[] {
    const json = this.extractJSON(response);
    const parsed = SubGoalsResponseSchema.parse(json);

    if (parsed.subGoals.length !== 8) {
      throw new Error(`サブ目標は8個である必要があります（実際: ${parsed.subGoals.length}個）`);
    }

    return parsed.subGoals;
  }

  /**
   * アクションレスポンスを解析
   */
  parseActions(response: string): ActionOutput[] {
    const json = this.extractJSON(response);
    const parsed = ActionsResponseSchema.parse(json);

    if (parsed.actions.length !== 8) {
      throw new Error(`アクションは8個である必要があります（実際: ${parsed.actions.length}個）`);
    }

    return parsed.actions;
  }

  /**
   * タスクレスポンスを解析
   */
  parseTasks(response: string): TaskOutput[] {
    const json = this.extractJSON(response);
    const parsed = TasksResponseSchema.parse(json);

    return parsed.tasks;
  }

  /**
   * レスポンスからJSON部分を抽出
   */
  private extractJSON(response: string): unknown {
    // マークダウンコードブロックを削除
    let cleaned = response.trim();

    // ```json ... ``` または ``` ... ``` の形式を処理
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('JSON解析エラー:', error);
      console.error('レスポンス:', response);
      throw new Error('レスポンスのJSON解析に失敗しました');
    }
  }
}
