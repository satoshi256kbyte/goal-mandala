/**
 * Bedrock設定
 */

import type { BedrockModelConfig, RetryConfig } from '../types/bedrock.types.js';

/**
 * モデル設定
 */
export const MODEL_CONFIG: BedrockModelConfig = {
  modelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0',
  region: process.env.BEDROCK_REGION || 'ap-northeast-1',
  inferenceConfig: {
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '2000', 10),
    topP: parseFloat(process.env.BEDROCK_TOP_P || '0.9'),
  },
};

/**
 * リトライ設定
 */
export const RETRY_CONFIG: RetryConfig = {
  maxRetries: parseInt(process.env.BEDROCK_MAX_RETRIES || '3', 10),
  baseDelay: parseInt(process.env.BEDROCK_BASE_DELAY || '1000', 10),
  maxDelay: parseInt(process.env.BEDROCK_MAX_DELAY || '10000', 10),
  backoffMultiplier: parseFloat(process.env.BEDROCK_BACKOFF_MULTIPLIER || '2'),
};

/**
 * リトライ可能なエラー
 */
export const RETRYABLE_ERRORS = [
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerException',
  'TimeoutError',
];

/**
 * Lambda設定
 */
export const LAMBDA_CONFIG = {
  memorySize: 1024,
  timeout: 300, // 5分
  reservedConcurrency: 10,
};

/**
 * 入力制限
 */
export const INPUT_LIMITS = {
  maxTitleLength: 100,
  maxDescriptionLength: 1000,
  maxBackgroundLength: 500,
  maxConstraintsLength: 500,
};

/**
 * プロンプトインジェクション検出パターン
 */
export const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /forget\s+everything/i,
  /disregard\s+all/i,
];

/**
 * コスト設定
 */
export const COST_CONFIG = {
  costPer1kTokens: 0.00015, // Nova Microの料金（USD）
  monthlyBudget: parseFloat(process.env.MONTHLY_BUDGET || '100'), // USD
};

/**
 * CloudWatchメトリクス名
 */
export const METRICS = {
  GenerationSuccess: 'AI/Generation/Success',
  GenerationFailure: 'AI/Generation/Failure',
  GenerationDuration: 'AI/Generation/Duration',
  TokensUsed: 'AI/Tokens/Used',
  Cost: 'AI/Cost/Estimated',
};
