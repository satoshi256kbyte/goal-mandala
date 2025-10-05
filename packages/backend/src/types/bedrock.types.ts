/**
 * Bedrock関連の型定義
 */

/**
 * Bedrockモデル設定
 */
export interface BedrockModelConfig {
  modelId: string;
  region: string;
  inferenceConfig: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
}

/**
 * Bedrockリクエスト形式
 */
export interface BedrockRequest {
  modelId: string;
  contentType: string;
  accept: string;
  body: string;
}

/**
 * Bedrockレスポンス形式
 */
export interface BedrockResponse {
  output: {
    message: {
      role: string;
      content: Array<{
        text: string;
      }>;
    };
  };
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * エラータイプ
 */
export enum BedrockErrorType {
  THROTTLING = 'ThrottlingException',
  VALIDATION = 'ValidationException',
  SERVICE_UNAVAILABLE = 'ServiceUnavailableException',
  INTERNAL_SERVER = 'InternalServerException',
  TIMEOUT = 'TimeoutError',
  PARSE_ERROR = 'ParseError',
  UNKNOWN = 'UnknownError',
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
