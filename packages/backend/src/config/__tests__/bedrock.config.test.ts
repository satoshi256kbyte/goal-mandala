/**
 * Bedrock設定のテスト
 */

describe('Bedrock Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('MODEL_CONFIG', () => {
    it('デフォルト値が正しく設定されている', () => {
      const { MODEL_CONFIG } = require('../bedrock.config.js');

      expect(MODEL_CONFIG.modelId).toBe('amazon.nova-micro-v1:0');
      expect(MODEL_CONFIG.region).toBe('ap-northeast-1');
      expect(MODEL_CONFIG.inferenceConfig.temperature).toBe(0.7);
      expect(MODEL_CONFIG.inferenceConfig.maxTokens).toBe(2000);
      expect(MODEL_CONFIG.inferenceConfig.topP).toBe(0.9);
    });

    it('環境変数からモデルIDを読み込む', () => {
      process.env.BEDROCK_MODEL_ID = 'custom-model-id';

      const { MODEL_CONFIG } = require('../bedrock.config.js');
      expect(MODEL_CONFIG.modelId).toBe('custom-model-id');
    });

    it('環境変数からリージョンを読み込む', () => {
      process.env.BEDROCK_REGION = 'us-west-2';

      const { MODEL_CONFIG } = require('../bedrock.config.js');
      expect(MODEL_CONFIG.region).toBe('us-west-2');
    });

    it('環境変数からtemperatureを読み込む', () => {
      process.env.BEDROCK_TEMPERATURE = '0.5';

      const { MODEL_CONFIG } = require('../bedrock.config.js');
      expect(MODEL_CONFIG.inferenceConfig.temperature).toBe(0.5);
    });

    it('環境変数からmaxTokensを読み込む', () => {
      process.env.BEDROCK_MAX_TOKENS = '3000';

      const { MODEL_CONFIG } = require('../bedrock.config.js');
      expect(MODEL_CONFIG.inferenceConfig.maxTokens).toBe(3000);
    });

    it('環境変数からtopPを読み込む', () => {
      process.env.BEDROCK_TOP_P = '0.95';

      const { MODEL_CONFIG } = require('../bedrock.config.js');
      expect(MODEL_CONFIG.inferenceConfig.topP).toBe(0.95);
    });
  });

  describe('RETRY_CONFIG', () => {
    it('デフォルト値が正しく設定されている', () => {
      const { RETRY_CONFIG } = require('../bedrock.config.js');

      expect(RETRY_CONFIG.maxRetries).toBe(3);
      expect(RETRY_CONFIG.baseDelay).toBe(1000);
      expect(RETRY_CONFIG.maxDelay).toBe(10000);
      expect(RETRY_CONFIG.backoffMultiplier).toBe(2);
    });

    it('環境変数から設定を読み込む', () => {
      process.env.BEDROCK_MAX_RETRIES = '5';
      process.env.BEDROCK_BASE_DELAY = '2000';
      process.env.BEDROCK_MAX_DELAY = '20000';
      process.env.BEDROCK_BACKOFF_MULTIPLIER = '3';

      const { RETRY_CONFIG } = require('../bedrock.config.js');

      expect(RETRY_CONFIG.maxRetries).toBe(5);
      expect(RETRY_CONFIG.baseDelay).toBe(2000);
      expect(RETRY_CONFIG.maxDelay).toBe(20000);
      expect(RETRY_CONFIG.backoffMultiplier).toBe(3);
    });
  });

  describe('RETRYABLE_ERRORS', () => {
    it('リトライ可能なエラーが定義されている', () => {
      const { RETRYABLE_ERRORS } = require('../bedrock.config.js');

      expect(RETRYABLE_ERRORS).toContain('ThrottlingException');
      expect(RETRYABLE_ERRORS).toContain('ServiceUnavailableException');
      expect(RETRYABLE_ERRORS).toContain('InternalServerException');
      expect(RETRYABLE_ERRORS).toContain('TimeoutError');
      expect(RETRYABLE_ERRORS).toHaveLength(4);
    });
  });

  describe('INPUT_LIMITS', () => {
    it('入力制限が定義されている', () => {
      const { INPUT_LIMITS } = require('../bedrock.config.js');

      expect(INPUT_LIMITS.maxTitleLength).toBe(100);
      expect(INPUT_LIMITS.maxDescriptionLength).toBe(1000);
      expect(INPUT_LIMITS.maxBackgroundLength).toBe(500);
      expect(INPUT_LIMITS.maxConstraintsLength).toBe(500);
    });
  });

  describe('INJECTION_PATTERNS', () => {
    it('プロンプトインジェクションパターンが定義されている', () => {
      const { INJECTION_PATTERNS } = require('../bedrock.config.js');

      expect(INJECTION_PATTERNS).toHaveLength(5);
      expect(INJECTION_PATTERNS[0].test('ignore previous instructions')).toBe(true);
      expect(INJECTION_PATTERNS[1].test('system:')).toBe(true);
      expect(INJECTION_PATTERNS[2].test('assistant:')).toBe(true);
    });
  });

  describe('COST_CONFIG', () => {
    it('コスト設定が定義されている', () => {
      const { COST_CONFIG } = require('../bedrock.config.js');

      expect(COST_CONFIG.costPer1kTokens).toBe(0.00015);
      expect(COST_CONFIG.monthlyBudget).toBe(100);
    });

    it('環境変数から月次予算を読み込む', () => {
      process.env.MONTHLY_BUDGET = '200';

      const { COST_CONFIG } = require('../bedrock.config.js');
      expect(COST_CONFIG.monthlyBudget).toBe(200);
    });
  });

  describe('METRICS', () => {
    it('メトリクス名が定義されている', () => {
      const { METRICS } = require('../bedrock.config.js');

      expect(METRICS.GenerationSuccess).toBe('AI/Generation/Success');
      expect(METRICS.GenerationFailure).toBe('AI/Generation/Failure');
      expect(METRICS.GenerationDuration).toBe('AI/Generation/Duration');
      expect(METRICS.TokensUsed).toBe('AI/Tokens/Used');
      expect(METRICS.Cost).toBe('AI/Cost/Estimated');
    });
  });
});
