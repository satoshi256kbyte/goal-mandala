// インフラ定数
export const constants = {
  // AWS リージョン
  DEFAULT_REGION: 'ap-northeast-1',
  VALID_REGIONS: [
    'us-east-1',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-central-1',
    'ap-northeast-1',
    'ap-southeast-1',
    'ap-southeast-2',
  ] as const,

  // データベース設定
  DATABASE: {
    DEFAULT_DATABASE_NAME: 'goalmandalamain',
    MIN_CAPACITY: 0.5,
    MAX_CAPACITY: 4,
    VALID_INSTANCE_CLASSES: ['serverless', 't3.micro', 't3.small', 't3.medium'] as const,
    ENGINE_VERSION: '15.4',
    BACKUP_RETENTION_DAYS: 7,
    DELETION_PROTECTION: true,
  },

  // Lambda設定
  LAMBDA: {
    DEFAULT_TIMEOUT: 30,
    DEFAULT_MEMORY_SIZE: 256,
    RUNTIME: 'nodejs20.x',
    MIN_MEMORY_SIZE: 64,
    MAX_MEMORY_SIZE: 10240,
    MEMORY_SIZE_INCREMENT: 64,
    MIN_TIMEOUT: 1,
    MAX_TIMEOUT: 900, // 15分
  },

  // CloudFront設定
  CLOUDFRONT: {
    DEFAULT_ROOT_OBJECT: 'index.html',
    ERROR_PAGE_PATH: '/index.html',
    CACHE_POLICY_ID: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // CachingOptimized
    ORIGIN_REQUEST_POLICY_ID: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf', // CORS-S3Origin
  },

  // S3設定
  S3: {
    BUCKET_VERSIONING: true,
    ENCRYPTION_ALGORITHM: 'AES256',
    PUBLIC_ACCESS_BLOCK: true,
  },

  // セキュリティ設定
  SECURITY: {
    TLS_VERSION: '1.2',
    HSTS_MAX_AGE: 31536000, // 1年
    CONTENT_TYPE_OPTIONS: 'nosniff',
    FRAME_OPTIONS: 'DENY',
    XSS_PROTECTION: '1; mode=block',
  },

  // 監視設定
  MONITORING: {
    LOG_RETENTION_DAYS: 30,
    METRIC_RETENTION_DAYS: 90,
    ALARM_EVALUATION_PERIODS: 2,
    ALARM_DATAPOINTS_TO_ALARM: 2,
  },

  // 環境名
  ENVIRONMENTS: {
    LOCAL: 'local',
    DEV: 'dev',
    STG: 'stg',
    PROD: 'prod',
  } as const,

  // スタック名パターン
  STACK_NAMING: {
    SEPARATOR: '-',
    MAX_LENGTH: 128,
    VALID_CHARACTERS: /^[a-zA-Z][a-zA-Z0-9-]*$/,
  },

  // タグ設定
  TAGS: {
    Project: 'goal-mandala',
    ManagedBy: 'cdk',
  },
} as const;

// 型定義
export type Environment = (typeof constants.ENVIRONMENTS)[keyof typeof constants.ENVIRONMENTS];
export type ValidRegion = (typeof constants.VALID_REGIONS)[number];
export type ValidInstanceClass = (typeof constants.DATABASE.VALID_INSTANCE_CLASSES)[number];
