// Jest setup file for backend tests

// Mock AWS SDK clients for testing
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  InvokeModelCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

// Mock CloudWatch clients for testing
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutMetricDataCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutLogEventsCommand: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file::memory:?cache=shared';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32chars';
process.env.AWS_REGION = 'ap-northeast-1';
process.env.BEDROCK_MODEL_ID = 'amazon.nova-micro-v1:0';
process.env.BEDROCK_REGION = 'ap-northeast-1';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.LOG_LEVEL = 'ERROR'; // テスト時はエラーログのみ
process.env.ENABLE_MOCK_AUTH = 'true';
process.env.MOCK_USER_EMAIL = 'test@example.com';
process.env.MOCK_USER_NAME = 'Test User';
process.env.MOCK_USER_ID = 'test-user-id';

// グローバルテストタイムアウト設定
jest.setTimeout(30000); // 30秒に延長（データベース操作のため）
