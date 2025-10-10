/**
 * BedrockService - AI生成機能の中核サービス
 */

import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient } from './bedrock-client.js';
import { PromptTemplateManager } from './prompt-template.js';
import { ResponseParser } from './response-parser.js';
import { MODEL_CONFIG } from '../config/bedrock.config.js';
import type {
  GoalInput,
  SubGoalInput,
  ActionInput,
  SubGoalOutput,
  ActionOutput,
  TaskOutput,
} from '../types/ai-generation.types.js';
import type { GenerationContext } from '../types/action-generation.types.js';

/**
 * BedrockService
 */
export class BedrockService {
  private promptManager: PromptTemplateManager;
  private responseParser: ResponseParser;
  private client: ReturnType<typeof getBedrockClient>;

  constructor() {
    this.promptManager = new PromptTemplateManager();
    this.responseParser = new ResponseParser();
    // クライアントをインスタンス変数として保持（再利用のため）
    this.client = getBedrockClient();
  }

  /**
   * サブ目標を生成
   */
  async generateSubGoals(input: GoalInput): Promise<SubGoalOutput[]> {
    const prompt = this.promptManager.buildSubGoalPrompt(input);
    const response = await this.invokeModel(prompt);
    return this.responseParser.parseSubGoals(response);
  }

  /**
   * アクションを生成
   */
  async generateActions(input: SubGoalInput): Promise<ActionOutput[]> {
    const prompt = this.promptManager.buildActionPrompt(input);
    const response = await this.invokeModel(prompt);
    return this.responseParser.parseActions(response);
  }

  /**
   * アクションを生成（GenerationContext版）
   */
  async generateActionsWithContext(context: GenerationContext): Promise<ActionOutput[]> {
    const prompt = this.promptManager.buildActionPromptWithContext(context);
    const response = await this.invokeModel(prompt);
    return this.responseParser.parseActions(response);
  }

  /**
   * タスクを生成
   */
  async generateTasks(input: ActionInput): Promise<TaskOutput[]> {
    const prompt = this.promptManager.buildTaskPrompt(input);
    const response = await this.invokeModel(prompt);
    return this.responseParser.parseTasks(response);
  }

  /**
   * Bedrockモデルを呼び出し
   */
  private async invokeModel(prompt: string): Promise<string> {
    // インスタンス変数のクライアントを再利用
    const client = this.client;

    const command = new InvokeModelCommand({
      modelId: MODEL_CONFIG.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt,
              },
            ],
          },
        ],
        inferenceConfig: MODEL_CONFIG.inferenceConfig,
      }),
    });

    try {
      const response = await client.send(command);

      // レスポンスボディをパース
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // テキストコンテンツを抽出
      const text = responseBody.output?.message?.content?.[0]?.text;

      if (!text) {
        throw new Error('Bedrockレスポンスにテキストが含まれていません');
      }

      return text;
    } catch (error) {
      console.error('Bedrock API呼び出しエラー:', error);
      throw error;
    }
  }
}
