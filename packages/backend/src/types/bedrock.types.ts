export interface BedrockConfig {
  region: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
}

export interface BedrockModelConfig {
  modelId: string;
  region: string;
  inferenceConfig: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface BedrockError extends Error {
  retryable: boolean;
  code?: string;
  name: string;
  type?: string;
  originalError?: Error;
  details?: Record<string, unknown>;
}

export interface BedrockResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
