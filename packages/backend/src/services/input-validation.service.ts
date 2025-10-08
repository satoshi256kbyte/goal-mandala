import { z } from 'zod';
import { SubGoalGenerationRequest } from '../types/subgoal-generation.types';
import { SubGoalGenerationRequestSchema } from '../schemas/subgoal-generation.schema';
import { ValidationError } from '../errors/subgoal-generation.errors';

/**
 * 入力検証サービスのインターフェース
 */
export interface IInputValidationService {
  /**
   * サブ目標生成リクエストを検証する
   * @param request - 検証対象のリクエスト
   * @returns 検証結果
   * @throws ValidationError - 検証に失敗した場合
   */
  validateSubGoalGenerationRequest(request: unknown): SubGoalGenerationRequest;

  /**
   * 入力をサニタイズする
   * @param input - サニタイズ対象の文字列
   * @returns サニタイズされた文字列
   */
  sanitizeInput(input: string): string;

  /**
   * プロンプトインジェクションを検出する
   * @param input - 検査対象の文字列
   * @throws ValidationError - インジェクションが検出された場合
   */
  detectInjection(input: string): void;
}

/**
 * 入力検証サービス
 * リクエストデータのバリデーション、サニタイゼーション、
 * プロンプトインジェクション検出を行う
 */
export class InputValidationService implements IInputValidationService {
  /**
   * プロンプトインジェクションパターン
   */
  private readonly INJECTION_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /ignore\s+all\s+previous\s+instructions/i,
    /disregard\s+previous\s+instructions/i,
    /system\s*:/i,
    /assistant\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
    /\{\{.*system.*\}\}/i,
  ];

  /**
   * サブ目標生成リクエストを検証する
   * @param request - 検証対象のリクエスト
   * @returns 検証済みのリクエスト
   * @throws ValidationError - 検証に失敗した場合
   */
  validateSubGoalGenerationRequest(request: unknown): SubGoalGenerationRequest {
    try {
      // Zodスキーマによる検証
      const validatedRequest = SubGoalGenerationRequestSchema.parse(request);

      // 各フィールドのサニタイゼーションとインジェクション検出
      const sanitizedRequest: SubGoalGenerationRequest = {
        goalId: validatedRequest.goalId,
        title: this.sanitizeInput(validatedRequest.title),
        description: this.sanitizeInput(validatedRequest.description),
        deadline: validatedRequest.deadline,
        background: this.sanitizeInput(validatedRequest.background),
        constraints: validatedRequest.constraints
          ? this.sanitizeInput(validatedRequest.constraints)
          : undefined,
      };

      // プロンプトインジェクション検出
      this.detectInjection(sanitizedRequest.title);
      this.detectInjection(sanitizedRequest.description);
      this.detectInjection(sanitizedRequest.background);
      if (sanitizedRequest.constraints) {
        this.detectInjection(sanitizedRequest.constraints);
      }

      return sanitizedRequest;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Zodエラーを整形してValidationErrorに変換
        const details: ValidationErrorType[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ValidationError('入力データが不正です', details);
      }

      // その他のエラーはそのまま再スロー
      throw error;
    }
  }

  /**
   * 入力をサニタイズする
   * HTMLタグ除去、特殊文字エスケープを行う
   * @param input - サニタイズ対象の文字列
   * @returns サニタイズされた文字列
   */
  sanitizeInput(input: string): string {
    let sanitized = input;

    // HTMLタグ除去
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // 中括弧除去（プロンプトテンプレート対策）
    sanitized = sanitized.replace(/[{}]/g, '');

    // 制御文字除去
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // 前後の空白を削除
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * プロンプトインジェクションを検出する
   * @param input - 検査対象の文字列
   * @throws ValidationError - インジェクションが検出された場合
   */
  detectInjection(input: string): void {
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        throw new ValidationError('不正な入力が検出されました', [
          {
            field: 'input',
            message: 'プロンプトインジェクションの可能性がある入力が検出されました',
          },
        ]);
      }
    }
  }
}
