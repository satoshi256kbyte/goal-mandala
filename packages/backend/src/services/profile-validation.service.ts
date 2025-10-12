import { ProfileUpdateSchema } from '../schemas/profile.schema';
import { UpdateProfileRequest } from '../types/profile.types';
import { ValidationError } from '../errors/profile.errors';
import { ZodError } from 'zod';

/**
 * プロフィールバリデーションサービスインターフェース
 */
export interface IProfileValidationService {
  validateUpdateRequest(data: unknown): UpdateProfileRequest;
  sanitizeInput(input: string): string;
}

/**
 * プロフィールバリデーションサービス
 */
export class ProfileValidationService implements IProfileValidationService {
  /**
   * プロフィール更新リクエストをバリデーション
   */
  validateUpdateRequest(data: unknown): UpdateProfileRequest {
    try {
      const validatedData = ProfileUpdateSchema.parse(data);

      // 各文字列フィールドをサニタイズ
      const sanitizedData: UpdateProfileRequest = {};

      if (validatedData.name !== undefined) {
        sanitizedData.name = this.sanitizeInput(validatedData.name);
      }
      if (validatedData.industry !== undefined) {
        sanitizedData.industry = this.sanitizeInput(validatedData.industry);
      }
      if (validatedData.company_size !== undefined) {
        sanitizedData.company_size = this.sanitizeInput(validatedData.company_size);
      }
      if (validatedData.job_title !== undefined) {
        sanitizedData.job_title = this.sanitizeInput(validatedData.job_title);
      }
      if (validatedData.position !== undefined) {
        sanitizedData.position = this.sanitizeInput(validatedData.position);
      }

      return sanitizedData;
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map(e => e.message).join(', ');
        throw new ValidationError(message);
      }
      throw new ValidationError('バリデーションエラーが発生しました');
    }
  }

  /**
   * 入力値をサニタイズ（XSS対策）
   */
  sanitizeInput(input: string): string {
    // HTMLタグの除去
    let sanitized = input.replace(/<[^>]*>/g, '');

    // 特殊文字のエスケープ
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized.trim();
  }
}
