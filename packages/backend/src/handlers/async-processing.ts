/**
 * 非同期処理開始Lambda Handler
 * POST /api/ai/async/generate エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { ProcessingStateService } from '../services/processing-state.service.js';
import {
  AsyncProcessingRequestSchema,
  ESTIMATED_COMPLETION_TIME,
} from '../schemas/async-processing.schema.js';
import type {
  AsyncProcessingRequest,
  AsyncProcessingResponse,
  StepFunctionsExecutionInput,
} from '../types/async-processing.types.js';
import { ProcessingType } from '../generated/prisma-client';
import {
  ValidationError,
  DatabaseError,
  StepFunctionsError,
  AuthenticationError,
} from '../errors/async-processing.errors.js';
import { sanitizeErrorForLogging } from '../utils/security.js';

// Honoアプリケーションの作成
const app = new Hono();

// ミドルウェアの設定
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*', // TODO: 本番環境では適切なオリジンを設定
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// サービスのインスタンス化
const processingStateService = new ProcessingStateService();
const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

/**
 * 非同期処理開始エンドポイント
 * POST /api/ai/async/generate
 */
app.post('/api/ai/async/generate', jwtAuthMiddleware(), async (c: Context) => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || `req-${Date.now()}`;

  try {
    // 1. ユーザーIDの抽出
    const userId = extractUserId(c);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        action: 'async_processing_start',
        message: '非同期処理リクエスト開始',
      })
    );

    // 2. リクエストボディの取得
    const body = await c.req.json();

    // 3. リクエスト検証
    const validatedRequest = validateRequest(body);

    // 4. 処理状態レコード作成
    const processingState = await createProcessingState(
      userId,
      validatedRequest.type,
      validatedRequest.params
    );

    // 5. Step Functions起動
    await startStepFunctionsExecution(processingState.id, userId, validatedRequest);

    // 6. 完了予定時刻の推定
    const estimatedCompletionTime = estimateCompletionTime(validatedRequest.type);

    // 7. レスポンス返却
    const response = formatResponse(
      processingState.id,
      processingState.status,
      validatedRequest.type,
      processingState.createdAt,
      estimatedCompletionTime
    );

    // 8. 処理時間の記録
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        action: 'async_processing_accepted',
        duration,
        metadata: {
          processId: processingState.id,
          type: validatedRequest.type,
          estimatedCompletionTime: estimatedCompletionTime.toISOString(),
        },
      })
    );

    return c.json(response, 202);
  } catch (error) {
    // 9. エラーハンドリング
    const duration = Date.now() - startTime;
    return handleError(error, c, requestId, duration);
  }
});

/**
 * ヘルスチェックエンドポイント
 * GET /health
 */
app.get('/health', (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() }, 200);
});

/**
 * ユーザーIDの抽出
 * @param c Honoコンテキスト
 * @returns ユーザーID
 * @throws AuthenticationError 認証情報が無効な場合
 */
function extractUserId(c: Context): string {
  try {
    const user = getCurrentUser(c);
    return user.id;
  } catch (error) {
    throw new AuthenticationError('認証が必要です');
  }
}

/**
 * リクエスト検証
 * @param body リクエストボディ
 * @returns 検証済みリクエスト
 * @throws ValidationError バリデーションエラー
 */
function validateRequest(body: unknown): AsyncProcessingRequest {
  try {
    return AsyncProcessingRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError('リクエストの形式が正しくありません', error);
    }
    throw new ValidationError('リクエストの形式が正しくありません');
  }
}

/**
 * 処理状態レコード作成
 * @param userId ユーザーID
 * @param type 処理タイプ
 * @param params 処理パラメータ
 * @returns 作成された処理状態
 * @throws DatabaseError データベースエラー
 */
async function createProcessingState(
  userId: string,
  type: ProcessingType,
  params: AsyncProcessingRequest['params']
): Promise<{
  id: string;
  userId: string;
  type: ProcessingType;
  status: string;
  progress: number;
  createdAt: Date;
}> {
  try {
    // targetIdの抽出（処理タイプに応じて）
    let targetId: string | undefined;
    if ('goalId' in params) {
      targetId = params.goalId;
    } else if ('subGoalId' in params) {
      targetId = params.subGoalId;
    } else if ('actionId' in params) {
      targetId = params.actionId;
    }

    const processingState = await processingStateService.createProcessingState({
      userId,
      type,
      targetId,
    });

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'processing_state_created',
        userId,
        processId: processingState.id,
        type,
        targetId,
      })
    );

    return processingState;
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'processing_state_creation_failed',
        userId,
        type,
        error: sanitizeErrorForLogging(error),
      })
    );
    throw new DatabaseError('処理状態の作成に失敗しました', error as Error);
  }
}

/**
 * Step Functions実行開始
 * @param processId 処理ID
 * @param userId ユーザーID
 * @param request 非同期処理リクエスト
 * @throws StepFunctionsError Step Functions起動エラー
 */
async function startStepFunctionsExecution(
  processId: string,
  userId: string,
  request: AsyncProcessingRequest
): Promise<void> {
  const stateMachineArn = process.env.STATE_MACHINE_ARN;

  if (!stateMachineArn) {
    throw new StepFunctionsError(
      processId,
      'Step Functions State MachineのARNが設定されていません'
    );
  }

  try {
    const input: StepFunctionsExecutionInput = {
      processId,
      userId,
      type: request.type,
      params: request.params,
    };

    const command = new StartExecutionCommand({
      stateMachineArn,
      name: `${processId}-${Date.now()}`,
      input: JSON.stringify(input),
    });

    const response = await sfnClient.send(command);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'step_functions_execution_started',
        processId,
        userId,
        executionArn: response.executionArn,
        type: request.type,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'step_functions_execution_failed',
        processId,
        userId,
        error: sanitizeErrorForLogging(error),
      })
    );
    throw new StepFunctionsError(
      processId,
      'Step Functionsの起動に失敗しました',
      undefined,
      error as Error
    );
  }
}

/**
 * 完了予定時刻の推定
 * @param type 処理タイプ
 * @returns 完了予定時刻
 */
function estimateCompletionTime(type: ProcessingType): Date {
  const estimatedSeconds = ESTIMATED_COMPLETION_TIME[type];
  const completionTime = new Date();
  completionTime.setSeconds(completionTime.getSeconds() + estimatedSeconds);
  return completionTime;
}

/**
 * レスポンスの整形
 * @param processId 処理ID
 * @param status 処理ステータス
 * @param type 処理タイプ
 * @param createdAt 作成日時
 * @param estimatedCompletionTime 完了予定時刻
 * @returns 整形されたレスポンス
 */
function formatResponse(
  processId: string,
  status: string,
  type: ProcessingType,
  createdAt: Date,
  estimatedCompletionTime: Date
): AsyncProcessingResponse {
  return {
    success: true,
    data: {
      processId,
      status: status as AsyncProcessingResponse['data']['status'],
      type,
      createdAt: createdAt.toISOString(),
      estimatedCompletionTime: estimatedCompletionTime.toISOString(),
    },
  };
}

/**
 * エラーハンドリング
 * @param error エラーオブジェクト
 * @param c Honoコンテキスト
 * @param requestId リクエストID
 * @param duration 処理時間
 * @returns エラーレスポンス
 */
function handleError(error: unknown, c: Context, requestId: string, duration: number): Response {
  const errorResponse = mapErrorToResponse(error);

  // エラーオブジェクトを安全な形式に変換（機密情報をマスキング）
  const sanitizedError = sanitizeErrorForLogging(error);

  // エラーログの記録
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      requestId,
      action: 'async_processing_error',
      duration,
      error: {
        code: errorResponse.error?.code || 'UNKNOWN_ERROR',
        message: sanitizedError.message,
        name: sanitizedError.name,
        stack: sanitizedError.stack,
      },
    })
  );

  const statusCode = getStatusCode(errorResponse.error?.code || 'INTERNAL_ERROR');
  return c.json(errorResponse, statusCode as 200);
}

/**
 * エラーをレスポンスにマッピング
 * @param error エラーオブジェクト
 * @returns エラーレスポンス
 */
function mapErrorToResponse(error: unknown): AsyncProcessingResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;

  if (error instanceof ValidationError) {
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    retryable = false;
  } else if (error instanceof DatabaseError) {
    errorCode = 'DATABASE_ERROR';
    message = 'データの保存に失敗しました';
    retryable = true;
  } else if (error instanceof StepFunctionsError) {
    errorCode = 'STEP_FUNCTIONS_ERROR';
    message = '処理の開始に失敗しました';
    retryable = true;
  } else if (error instanceof AuthenticationError) {
    errorCode = 'AUTHENTICATION_ERROR';
    message = '認証が必要です';
    retryable = false;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  return {
    success: false,
    data: {
      processId: '',
      status: 'FAILED' as AsyncProcessingResponse['data']['status'],
      type: 'SUBGOAL_GENERATION' as ProcessingType,
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: new Date().toISOString(),
    },
    error: {
      code: errorCode,
      message,
      retryable,
    },
  };
}

/**
 * エラーコードからHTTPステータスコードを取得
 * @param errorCode エラーコード
 * @returns HTTPステータスコード
 */
function getStatusCode(errorCode: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'AUTHENTICATION_ERROR':
      return 401;
    case 'FORBIDDEN_ERROR':
      return 403;
    case 'NOT_FOUND_ERROR':
      return 404;
    case 'DATABASE_ERROR':
      return 500;
    case 'STEP_FUNCTIONS_ERROR':
      return 503;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

// Lambda Handlerのエクスポート
export const handler = app.fetch;

// テスト用にアプリケーションもエクスポート
export { app };
