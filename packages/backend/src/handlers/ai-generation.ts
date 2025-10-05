/**
 * AI生成Lambda Handler
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockService } from '../services/bedrock.service.js';
import type {
  GenerateRequest,
  GenerateResponse,
  ErrorDetail,
  GoalInput,
  SubGoalInput,
  ActionInput,
  SubGoalOutput,
  ActionOutput,
  TaskOutput,
} from '../types/ai-generation.types.js';

/**
 * Lambda Handler関数
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext?.requestId || 'unknown';

  try {
    // 認証チェック（API Gateway Cognito Authorizerによる認証を想定）
    const authenticatedUserId = extractAuthenticatedUserId(event);
    if (!authenticatedUserId) {
      throw new AuthenticationError('認証が必要です');
    }

    // リクエストの検証とパース
    const request = validateAndParseRequest(event);

    // リクエストのuserIdと認証されたuserIdが一致するか確認
    if (request.userId !== authenticatedUserId) {
      throw new AuthenticationError('ユーザーIDが一致しません');
    }

    // BedrockServiceのインスタンス作成
    const bedrockService = new BedrockService();

    // 生成タイプに応じた処理
    let data: SubGoalOutput[] | ActionOutput[] | TaskOutput[] | undefined = undefined;

    switch (request.type) {
      case 'subgoal':
        data = await bedrockService.generateSubGoals(request.input as GoalInput);
        break;
      case 'action':
        data = await bedrockService.generateActions(request.input as SubGoalInput);
        break;
      case 'task':
        data = await bedrockService.generateTasks(request.input as ActionInput);
        break;
      default:
        throw new Error(`不正な生成タイプ: ${request.type}`);
    }

    // 成功レスポンスの返却
    const response: GenerateResponse = {
      success: true,
      data,
    };

    return formatSuccessResponse(response);
  } catch (error) {
    // エラーレスポンスの返却
    console.error('AI生成エラー:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return formatErrorResponse(error);
  }
}

/**
 * リクエストの検証とパース
 */
function validateAndParseRequest(event: APIGatewayProxyEvent): GenerateRequest {
  // bodyの存在チェック
  if (!event.body) {
    throw new ValidationError('リクエストボディが存在しません');
  }

  // JSONパース
  let body: unknown;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    throw new ValidationError('不正なJSON形式です');
  }

  // 型チェック
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('リクエストボディがオブジェクトではありません');
  }

  const requestBody = body as Record<string, unknown>;

  // 必須フィールドのチェック
  if (!requestBody.type) {
    throw new ValidationError('typeフィールドが存在しません');
  }

  if (!requestBody.input) {
    throw new ValidationError('inputフィールドが存在しません');
  }

  if (!requestBody.userId) {
    throw new ValidationError('userIdフィールドが存在しません');
  }

  // typeの値チェック
  const validTypes = ['subgoal', 'action', 'task'];
  if (!validTypes.includes(requestBody.type as string)) {
    throw new ValidationError(`不正なtypeです。有効な値: ${validTypes.join(', ')}`);
  }

  return requestBody as GenerateRequest;
}

/**
 * 成功レスポンスのフォーマット
 */
function formatSuccessResponse(response: GenerateResponse): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
}

/**
 * エラーレスポンスのフォーマット
 */
function formatErrorResponse(error: unknown): APIGatewayProxyResult {
  let statusCode = 500;
  let errorDetail: ErrorDetail;

  if (error instanceof ValidationError) {
    statusCode = 400;
    errorDetail = {
      code: 'VALIDATION_ERROR',
      message: error.message,
      retryable: false,
    };
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    errorDetail = {
      code: 'AUTHENTICATION_ERROR',
      message: error.message,
      retryable: false,
    };
  } else if (error instanceof Error) {
    errorDetail = {
      code: 'INTERNAL_ERROR',
      message: error.message,
      retryable: true,
    };
  } else {
    errorDetail = {
      code: 'UNKNOWN_ERROR',
      message: '不明なエラーが発生しました',
      retryable: true,
    };
  }

  const response: GenerateResponse = {
    success: false,
    error: errorDetail,
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
}

/**
 * 認証されたユーザーIDを抽出
 * API Gateway Cognito Authorizerから設定されたクレームを取得
 */
function extractAuthenticatedUserId(event: APIGatewayProxyEvent): string | null {
  // Cognito Authorizerが設定したクレームから取得
  const claims = event.requestContext?.authorizer?.claims;
  if (claims && typeof claims === 'object') {
    // Cognitoのsubクレームがユーザーの一意識別子
    return (claims as Record<string, string>).sub || null;
  }

  // 開発環境用: ヘッダーからユーザーIDを取得（本番では使用しない）
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return event.headers?.['x-user-id'] || null;
  }

  return null;
}

/**
 * バリデーションエラー
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 認証エラー
 */
class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
