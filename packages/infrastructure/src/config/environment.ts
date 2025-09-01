import * as fs from 'fs';
import * as path from 'path';
import { constants, Environment, ValidRegion, ValidInstanceClass } from './constants';

// 型ガード関数
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getString(obj: Record<string, unknown>, key: string, defaultValue?: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : (defaultValue ?? '');
}

function getNumber(obj: Record<string, unknown>, key: string, defaultValue?: number): number {
  const value = obj[key];
  return typeof value === 'number' ? value : (defaultValue ?? 0);
}

function getBoolean(obj: Record<string, unknown>, key: string, defaultValue?: boolean): boolean {
  const value = obj[key];
  return typeof value === 'boolean' ? value : (defaultValue ?? false);
}

function getRecord(obj: Record<string, unknown> | unknown, key: string): Record<string, unknown> {
  if (!isRecord(obj)) return {};
  const value = obj[key];
  return isRecord(value) ? value : {};
}

export interface EnvironmentConfig {
  stackPrefix: string;
  region: ValidRegion;
  account?: string;
  environment?: string;
  network: {
    natGateways: number;
    enableVpcEndpoints: boolean;
    vpcCidr?: string;
    maxAzs?: number;
  };
  database: {
    instanceClass: ValidInstanceClass;
    minCapacity: number;
    maxCapacity: number;
    multiAz: boolean;
    databaseName?: string;
    backupRetentionDays?: number;
    deletionProtection?: boolean;
    performanceInsights?: boolean;
    monitoringInterval?: number;
    enableAuditLog?: boolean;
    enableSlowQueryLog?: boolean;
    slowQueryLogThreshold?: number;
    enableEncryption?: boolean;
    enableIamDatabaseAuthentication?: boolean;
    enableSslConnection?: boolean;
    enableAutomaticSnapshots?: boolean;
    snapshotRetentionDays?: number;
    preferredBackupWindow?: string;
    preferredMaintenanceWindow?: string;
    enableRotation?: boolean;
    rotationIntervalDays?: number;
    tags?: Record<string, string>;
  };
  secretsManager?: {
    enableEncryption?: boolean;
    enableRotation?: boolean;
    rotationIntervalDays?: number;
    enableCaching?: boolean;
    cacheTtlMinutes?: number;
    enableMonitoring?: boolean;
    tags?: Record<string, string>;
  };
  lambda: {
    timeout: number;
    memorySize: number;
    runtime?: string;
  };
  frontend: {
    domainName?: string;
    certificateArn?: string;
    customErrorResponses?: boolean;
    security?: {
      enableHsts?: boolean;
      hstsMaxAge?: number;
      hstsIncludeSubdomains?: boolean;
      hstsPreload?: boolean;
      enableContentTypeOptions?: boolean;
      enableFrameOptions?: boolean;
      frameOptionsValue?: 'DENY' | 'SAMEORIGIN';
      enableReferrerPolicy?: boolean;
      referrerPolicyValue?: string;
      enableCsp?: boolean;
      cspDirectives?: Record<string, string[]>;
      customHeaders?: Record<string, string>;
    };
    s3: {
      enableVersioning?: boolean;
      enableLogging?: boolean;
      lifecyclePolicyEnabled?: boolean;
      oldVersionExpirationDays?: number;
      incompleteMultipartUploadDays?: number;
    };
    monitoring: {
      enableAccessLogs?: boolean;
      enableCloudFrontLogs?: boolean;
      enableCostMonitoring?: boolean;
      logRetentionDays?: number;
      retainLogsOnDelete?: boolean;
      alertEmail?: string;
      slackWebhookUrl?: string;
      errorRateThreshold?: number;
      cacheHitRateThreshold?: number;
      s3RequestsThreshold?: number;
      monthlyBudgetLimit?: number;
    };
    deployment?: {
      buildCommand?: string;
      buildDirectory?: string;
      excludePatterns?: string[];
      invalidationPaths?: string[];
      retainOnDelete?: boolean;
      enableBuildCache?: boolean;
      enableCompressionUpload?: boolean;
      enableParallelUpload?: boolean;
      maxConcurrentUploads?: number;
      uploadTimeout?: number;
      cacheControl?: {
        html?: string;
        css?: string;
        js?: string;
        images?: string;
        fonts?: string;
        default?: string;
      };
    };
  };
  monitoring?: {
    logRetentionDays?: number;
    enableDetailedMonitoring?: boolean;
    enableAlerts?: boolean;
    alertEmail?: string;
  };
  tags?: Record<string, string>;
}

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const configPath = path.join(__dirname, '..', '..', 'config', `${environment}.json`);

  if (!fs.existsSync(configPath)) {
    // 環境名の検証（ファイルが存在しない場合のみ）
    if (!isValidEnvironment(environment)) {
      throw new Error(
        `Invalid environment: ${environment}. Valid environments are: ${Object.values(constants.ENVIRONMENTS).join(', ')}`
      );
    }
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  let config: unknown;
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
  } catch (error) {
    throw new Error(
      `Failed to parse configuration file ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return validateConfig(config, environment);
}

function isValidEnvironment(environment: string): environment is Environment {
  return Object.values(constants.ENVIRONMENTS).includes(environment as Environment);
}

function validateConfig(config: unknown, environment: string): EnvironmentConfig {
  const errors: string[] = [];

  // 型ガード: configがオブジェクトかチェック
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  const configObj = config as Record<string, unknown>;

  // 必須フィールドの検証
  if (!configObj.stackPrefix || typeof configObj.stackPrefix !== 'string') {
    errors.push('stackPrefix is required and must be a string');
  }

  if (!configObj.region || typeof configObj.region !== 'string') {
    errors.push('region is required and must be a string');
  }

  if (!configObj.network || typeof configObj.network !== 'object') {
    errors.push('network configuration is required and must be an object');
  }

  if (!configObj.database || typeof configObj.database !== 'object') {
    errors.push('database configuration is required and must be an object');
  }

  if (!configObj.lambda || typeof configObj.lambda !== 'object') {
    errors.push('lambda configuration is required and must be an object');
  }

  if (!configObj.frontend || typeof configObj.frontend !== 'object') {
    errors.push('frontend configuration is required and must be an object');
  }

  // 早期エラー終了
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  // スタックプレフィックスの詳細検証
  validateStackPrefix(configObj.stackPrefix as string, errors);

  // リージョンの詳細検証
  validateRegion(configObj.region as string, errors);

  // ネットワーク設定の詳細検証
  validateNetworkConfig(configObj.network as Record<string, unknown>, errors);

  // データベース設定の詳細検証
  validateDatabaseConfig(configObj.database as Record<string, unknown>, errors);

  // Lambda設定の詳細検証
  validateLambdaConfig(configObj.lambda as Record<string, unknown>, errors);

  // フロントエンド設定の詳細検証
  validateFrontendConfig(configObj.frontend as Record<string, unknown>, errors);

  // オプション設定の検証
  if (configObj.monitoring) {
    validateMonitoringConfig(configObj.monitoring as Record<string, unknown>, errors);
  }

  if (configObj.secretsManager) {
    validateSecretsManagerConfig(configObj.secretsManager as Record<string, unknown>, errors);
  }

  if (configObj.tags) {
    validateTagsConfig(configObj.tags as Record<string, unknown>, errors);
  }

  // アカウントIDの検証（オプション）
  if (configObj.account && typeof configObj.account === 'string') {
    validateAccountId(configObj.account, errors);
  }

  // エラーがある場合は例外を投げる
  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed for environment '${environment}':\n${errors.join('\n')}`
    );
  }

  // デフォルト値の設定
  const networkConfig = getRecord(configObj, 'network');
  const databaseConfig = getRecord(configObj, 'database');
  const secretsManagerConfig = getRecord(configObj, 'secretsManager');
  const lambdaConfig = getRecord(configObj, 'lambda');
  const frontendConfig = getRecord(configObj, 'frontend');
  const monitoringConfig = getRecord(configObj, 'monitoring');
  const tagsConfig = getRecord(configObj, 'tags');

  const validatedConfig: EnvironmentConfig = {
    stackPrefix: getString(configObj, 'stackPrefix'),
    region: getString(configObj, 'region') as ValidRegion,
    network: {
      vpcCidr: getString(networkConfig, 'vpcCidr', '10.0.0.0/16'),
      maxAzs: getNumber(networkConfig, 'maxAzs', 2),
      natGateways: getNumber(networkConfig, 'natGateways', 1),
      enableVpcEndpoints: getBoolean(networkConfig, 'enableVpcEndpoints', false),
    },
    database: {
      instanceClass: getString(
        databaseConfig,
        'instanceClass',
        'db.serverless'
      ) as ValidInstanceClass,
      minCapacity: getNumber(databaseConfig, 'minCapacity', 0.5),
      maxCapacity: getNumber(databaseConfig, 'maxCapacity', 1),
      multiAz: getBoolean(databaseConfig, 'multiAz', false),
      databaseName: getString(
        databaseConfig,
        'databaseName',
        constants.DATABASE.DEFAULT_DATABASE_NAME
      ),
      backupRetentionDays: getNumber(
        databaseConfig,
        'backupRetentionDays',
        constants.DATABASE.BACKUP_RETENTION_DAYS
      ),
      deletionProtection: getBoolean(
        databaseConfig,
        'deletionProtection',
        constants.DATABASE.DELETION_PROTECTION
      ),
      performanceInsights: getBoolean(databaseConfig, 'performanceInsights', true),
      monitoringInterval: getNumber(databaseConfig, 'monitoringInterval', 60),
      enableAuditLog: getBoolean(databaseConfig, 'enableAuditLog', true),
      enableSlowQueryLog: getBoolean(databaseConfig, 'enableSlowQueryLog', true),
      slowQueryLogThreshold: getNumber(databaseConfig, 'slowQueryLogThreshold', 1000),
      enableEncryption: getBoolean(databaseConfig, 'enableEncryption', true),
      enableIamDatabaseAuthentication: getBoolean(
        databaseConfig,
        'enableIamDatabaseAuthentication',
        true
      ),
      enableSslConnection: getBoolean(databaseConfig, 'enableSslConnection', true),
      tags: getRecord(databaseConfig, 'tags') as Record<string, string>,
    },
    secretsManager: {
      enableEncryption: getBoolean(secretsManagerConfig, 'enableEncryption', true),
      enableRotation: getBoolean(secretsManagerConfig, 'enableRotation', false),
      rotationIntervalDays: getNumber(secretsManagerConfig, 'rotationIntervalDays', 30),
      enableCaching: getBoolean(secretsManagerConfig, 'enableCaching', true),
      cacheTtlMinutes: getNumber(secretsManagerConfig, 'cacheTtlMinutes', 5),
      enableMonitoring: getBoolean(secretsManagerConfig, 'enableMonitoring', true),
      tags: getRecord(secretsManagerConfig, 'tags') as Record<string, string>,
    },
    lambda: {
      runtime: getString(lambdaConfig, 'runtime', constants.LAMBDA.RUNTIME),
      timeout: getNumber(lambdaConfig, 'timeout', 30),
      memorySize: getNumber(lambdaConfig, 'memorySize', 128),
    },
    frontend: {
      domainName: getString(frontendConfig, 'domainName', ''),
      certificateArn: getString(frontendConfig, 'certificateArn', ''),
      customErrorResponses: getBoolean(frontendConfig, 'customErrorResponses', true),
      security: {
        enableHsts: getBoolean(getRecord(frontendConfig, 'security'), 'enableHsts', true),
        hstsMaxAge: getNumber(getRecord(frontendConfig, 'security'), 'hstsMaxAge', 31536000),
        hstsIncludeSubdomains: getBoolean(
          getRecord(frontendConfig, 'security'),
          'hstsIncludeSubdomains',
          true
        ),
        hstsPreload: getBoolean(getRecord(frontendConfig, 'security'), 'hstsPreload', true),
        enableContentTypeOptions: getBoolean(
          getRecord(frontendConfig, 'security'),
          'enableContentTypeOptions',
          true
        ),
        enableFrameOptions: getBoolean(
          getRecord(frontendConfig, 'security'),
          'enableFrameOptions',
          true
        ),
        frameOptionsValue: getString(
          getRecord(frontendConfig, 'security'),
          'frameOptionsValue',
          'DENY'
        ) as 'DENY' | 'SAMEORIGIN',
        enableReferrerPolicy: getBoolean(
          getRecord(frontendConfig, 'security'),
          'enableReferrerPolicy',
          true
        ),
        referrerPolicyValue: getString(
          getRecord(frontendConfig, 'security'),
          'referrerPolicyValue',
          'strict-origin-when-cross-origin'
        ),
        enableCsp: getBoolean(getRecord(frontendConfig, 'security'), 'enableCsp', false),
        cspDirectives: getRecord(getRecord(frontendConfig, 'security'), 'cspDirectives') as Record<
          string,
          string[]
        >,
        customHeaders: getRecord(getRecord(frontendConfig, 'security'), 'customHeaders') as Record<
          string,
          string
        >,
      },
      s3: {
        enableVersioning: getBoolean(getRecord(frontendConfig, 's3'), 'enableVersioning', true),
        enableLogging: getBoolean(getRecord(frontendConfig, 's3'), 'enableLogging', false),
        lifecyclePolicyEnabled: getBoolean(
          getRecord(frontendConfig, 's3'),
          'lifecyclePolicyEnabled',
          true
        ),
        oldVersionExpirationDays: getNumber(
          getRecord(frontendConfig, 's3'),
          'oldVersionExpirationDays',
          30
        ),
        incompleteMultipartUploadDays: getNumber(
          getRecord(frontendConfig, 's3'),
          'incompleteMultipartUploadDays',
          7
        ),
      },
      monitoring: {
        enableCloudFrontLogs: getBoolean(
          getRecord(frontendConfig, 'monitoring'),
          'enableCloudFrontLogs',
          true
        ),
        enableAccessLogs: getBoolean(
          getRecord(frontendConfig, 'monitoring'),
          'enableAccessLogs',
          true
        ),
        logRetentionDays: getNumber(
          getRecord(frontendConfig, 'monitoring'),
          'logRetentionDays',
          30
        ),
      },
    },
    monitoring: {
      logRetentionDays: getNumber(
        monitoringConfig,
        'logRetentionDays',
        constants.MONITORING.LOG_RETENTION_DAYS
      ),
      enableDetailedMonitoring: getBoolean(monitoringConfig, 'enableDetailedMonitoring', false),
    },
    tags: {
      ...constants.TAGS,
      Environment: environment,
      ...(tagsConfig as Record<string, string>),
    },
  };

  return validatedConfig;
}

function validateStackPrefix(stackPrefix: string, errors: string[]): void {
  if (!constants.STACK_NAMING.VALID_CHARACTERS.test(stackPrefix)) {
    errors.push(
      'stackPrefix must start with a letter and contain only letters, numbers, and hyphens'
    );
  }

  if (stackPrefix.length > constants.STACK_NAMING.MAX_LENGTH) {
    errors.push(`stackPrefix must not exceed ${constants.STACK_NAMING.MAX_LENGTH} characters`);
  }

  if (stackPrefix.endsWith('-')) {
    errors.push('stackPrefix must not end with a hyphen');
  }
}

function validateRegion(region: string, errors: string[]): void {
  if (!constants.VALID_REGIONS.includes(region as ValidRegion)) {
    errors.push(`region must be one of: ${constants.VALID_REGIONS.join(', ')}`);
  }
}

function validateNetworkConfig(network: Record<string, unknown>, errors: string[]): void {
  if (
    typeof network.natGateways !== 'number' ||
    network.natGateways < 1 ||
    network.natGateways > 2
  ) {
    errors.push('network.natGateways must be a number between 1 and 2');
  }

  if (typeof network.enableVpcEndpoints !== 'boolean') {
    errors.push('network.enableVpcEndpoints must be a boolean');
  }

  if (network.vpcCidr && typeof network.vpcCidr !== 'string') {
    errors.push('network.vpcCidr must be a string');
  }

  if (network.vpcCidr) {
    // CIDR形式の基本的な検証
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrPattern.test((network.vpcCidr as string) || '')) {
      errors.push('network.vpcCidr must be a valid CIDR notation (e.g., 10.0.0.0/16)');
    }
  }

  if (network.maxAzs !== undefined) {
    if (typeof network.maxAzs !== 'number' || network.maxAzs < 2 || network.maxAzs > 6) {
      errors.push('network.maxAzs must be a number between 2 and 6');
    }
  }
}

function validateDatabaseConfig(database: Record<string, unknown>, errors: string[]): void {
  if (!database.instanceClass || typeof database.instanceClass !== 'string') {
    errors.push('database.instanceClass is required and must be a string');
  } else if (
    !constants.DATABASE.VALID_INSTANCE_CLASSES.includes(
      database.instanceClass as ValidInstanceClass
    )
  ) {
    errors.push(
      `database.instanceClass must be one of: ${constants.DATABASE.VALID_INSTANCE_CLASSES.join(', ')}`
    );
  }

  if (typeof database.minCapacity !== 'number' || database.minCapacity <= 0) {
    errors.push('database.minCapacity must be a positive number');
  }

  if (typeof database.maxCapacity !== 'number' || database.maxCapacity <= 0) {
    errors.push('database.maxCapacity must be a positive number');
  }

  if (
    typeof database.maxCapacity === 'number' &&
    typeof database.minCapacity === 'number' &&
    database.maxCapacity < database.minCapacity
  ) {
    errors.push('database.maxCapacity must be greater than or equal to minCapacity');
  }

  if (typeof database.multiAz !== 'boolean') {
    errors.push('database.multiAz is required and must be a boolean');
  }

  // Aurora Serverless V2の容量制限チェック
  if (database.instanceClass === 'serverless') {
    if (
      typeof database.minCapacity === 'number' &&
      (database.minCapacity < 0.5 || database.minCapacity > 128)
    ) {
      errors.push('database.minCapacity for serverless must be between 0.5 and 128 ACUs');
    }
    if (
      typeof database.maxCapacity === 'number' &&
      (database.maxCapacity < 0.5 || database.maxCapacity > 128)
    ) {
      errors.push('database.maxCapacity for serverless must be between 0.5 and 128 ACUs');
    }
  }

  // オプション設定の検証
  if (database.backupRetentionDays !== undefined) {
    if (
      typeof database.backupRetentionDays !== 'number' ||
      database.backupRetentionDays < 1 ||
      database.backupRetentionDays > 35
    ) {
      errors.push('database.backupRetentionDays must be a number between 1 and 35');
    }
  }

  if (
    database.deletionProtection !== undefined &&
    typeof database.deletionProtection !== 'boolean'
  ) {
    errors.push('database.deletionProtection must be a boolean');
  }

  if (
    database.performanceInsights !== undefined &&
    typeof database.performanceInsights !== 'boolean'
  ) {
    errors.push('database.performanceInsights must be a boolean');
  }

  if (database.monitoringInterval !== undefined) {
    const validIntervals = [0, 1, 5, 10, 15, 30, 60];
    if (
      typeof database.monitoringInterval !== 'number' ||
      !validIntervals.includes(database.monitoringInterval)
    ) {
      errors.push(`database.monitoringInterval must be one of: ${validIntervals.join(', ')}`);
    }
  }

  if (database.enableAuditLog !== undefined && typeof database.enableAuditLog !== 'boolean') {
    errors.push('database.enableAuditLog must be a boolean');
  }

  if (
    database.enableSlowQueryLog !== undefined &&
    typeof database.enableSlowQueryLog !== 'boolean'
  ) {
    errors.push('database.enableSlowQueryLog must be a boolean');
  }

  if (database.slowQueryLogThreshold !== undefined) {
    if (typeof database.slowQueryLogThreshold !== 'number' || database.slowQueryLogThreshold < 0) {
      errors.push('database.slowQueryLogThreshold must be a non-negative number (milliseconds)');
    }
  }

  if (database.enableEncryption !== undefined && typeof database.enableEncryption !== 'boolean') {
    errors.push('database.enableEncryption must be a boolean');
  }

  if (
    database.enableIamDatabaseAuthentication !== undefined &&
    typeof database.enableIamDatabaseAuthentication !== 'boolean'
  ) {
    errors.push('database.enableIamDatabaseAuthentication must be a boolean');
  }

  if (
    database.enableSslConnection !== undefined &&
    typeof database.enableSslConnection !== 'boolean'
  ) {
    errors.push('database.enableSslConnection must be a boolean');
  }

  if (database.tags !== undefined) {
    validateTagsConfig(database.tags as Record<string, unknown>, errors);
  }
}

function validateLambdaConfig(lambda: Record<string, unknown>, errors: string[]): void {
  if (
    typeof lambda.timeout !== 'number' ||
    lambda.timeout < constants.LAMBDA.MIN_TIMEOUT ||
    lambda.timeout > constants.LAMBDA.MAX_TIMEOUT
  ) {
    errors.push(
      `lambda.timeout must be a number between ${constants.LAMBDA.MIN_TIMEOUT} and ${constants.LAMBDA.MAX_TIMEOUT} seconds`
    );
  }

  if (typeof lambda.memorySize !== 'number') {
    errors.push('lambda.memorySize must be a number');
  } else {
    if (
      lambda.memorySize < constants.LAMBDA.MIN_MEMORY_SIZE ||
      lambda.memorySize > constants.LAMBDA.MAX_MEMORY_SIZE ||
      lambda.memorySize % constants.LAMBDA.MEMORY_SIZE_INCREMENT !== 0
    ) {
      errors.push(
        `lambda.memorySize must be between ${constants.LAMBDA.MIN_MEMORY_SIZE} and ${constants.LAMBDA.MAX_MEMORY_SIZE} MB and a multiple of ${constants.LAMBDA.MEMORY_SIZE_INCREMENT}`
      );
    }
  }

  if (lambda.runtime && typeof lambda.runtime !== 'string') {
    errors.push('lambda.runtime must be a string');
  }
}

function validateFrontendConfig(frontend: Record<string, unknown>, errors: string[]): void {
  if (frontend.domainName && typeof frontend.domainName !== 'string') {
    errors.push('frontend.domainName must be a string');
  }

  if (frontend.certificateArn && typeof frontend.certificateArn !== 'string') {
    errors.push('frontend.certificateArn must be a string');
  }

  if (
    frontend.customErrorResponses !== undefined &&
    typeof frontend.customErrorResponses !== 'boolean'
  ) {
    errors.push('frontend.customErrorResponses must be a boolean');
  }

  // セキュリティ設定の検証
  if (frontend.security) {
    validateSecurityConfig(frontend.security as Record<string, unknown>, errors);
  }

  // S3設定の検証
  if (!frontend.s3 || typeof frontend.s3 !== 'object') {
    errors.push('frontend.s3 configuration is required and must be an object');
  } else {
    validateS3Config(frontend.s3 as Record<string, unknown>, errors);
  }

  // ドメイン名の形式チェック
  if (frontend.domainName) {
    const domainPattern =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainPattern.test(frontend.domainName as string)) {
      errors.push('frontend.domainName must be a valid domain name');
    }
  }

  // 証明書ARNの形式チェック
  if (frontend.certificateArn) {
    const arnPattern = /^arn:aws:acm:[a-z0-9-]+:\d{12}:certificate\/[a-f0-9-]+$/;
    if (!arnPattern.test(frontend.certificateArn as string)) {
      errors.push('frontend.certificateArn must be a valid ACM certificate ARN');
    }
  }
}

function validateSecurityConfig(security: Record<string, unknown>, errors: string[]): void {
  if (security.enableHsts !== undefined && typeof security.enableHsts !== 'boolean') {
    errors.push('frontend.security.enableHsts must be a boolean');
  }

  if (security.hstsMaxAge !== undefined) {
    if (typeof security.hstsMaxAge !== 'number' || security.hstsMaxAge < 0) {
      errors.push('frontend.security.hstsMaxAge must be a non-negative number');
    }
  }

  if (
    security.hstsIncludeSubdomains !== undefined &&
    typeof security.hstsIncludeSubdomains !== 'boolean'
  ) {
    errors.push('frontend.security.hstsIncludeSubdomains must be a boolean');
  }

  if (security.hstsPreload !== undefined && typeof security.hstsPreload !== 'boolean') {
    errors.push('frontend.security.hstsPreload must be a boolean');
  }

  if (
    security.enableContentTypeOptions !== undefined &&
    typeof security.enableContentTypeOptions !== 'boolean'
  ) {
    errors.push('frontend.security.enableContentTypeOptions must be a boolean');
  }

  if (
    security.enableFrameOptions !== undefined &&
    typeof security.enableFrameOptions !== 'boolean'
  ) {
    errors.push('frontend.security.enableFrameOptions must be a boolean');
  }

  if (security.frameOptionsValue !== undefined) {
    const validValues = ['DENY', 'SAMEORIGIN'];
    if (!validValues.includes(security.frameOptionsValue as string)) {
      errors.push(`frontend.security.frameOptionsValue must be one of: ${validValues.join(', ')}`);
    }
  }

  if (
    security.enableReferrerPolicy !== undefined &&
    typeof security.enableReferrerPolicy !== 'boolean'
  ) {
    errors.push('frontend.security.enableReferrerPolicy must be a boolean');
  }

  if (
    security.referrerPolicyValue !== undefined &&
    typeof security.referrerPolicyValue !== 'string'
  ) {
    errors.push('frontend.security.referrerPolicyValue must be a string');
  }

  if (security.enableCsp !== undefined && typeof security.enableCsp !== 'boolean') {
    errors.push('frontend.security.enableCsp must be a boolean');
  }

  if (security.cspDirectives !== undefined) {
    if (typeof security.cspDirectives !== 'object' || Array.isArray(security.cspDirectives)) {
      errors.push('frontend.security.cspDirectives must be an object');
    } else {
      for (const [key, value] of Object.entries(
        security.cspDirectives as Record<string, unknown>
      )) {
        if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
          errors.push(`frontend.security.cspDirectives.${key} must be an array of strings`);
        }
      }
    }
  }

  if (security.customHeaders !== undefined) {
    if (typeof security.customHeaders !== 'object' || Array.isArray(security.customHeaders)) {
      errors.push('frontend.security.customHeaders must be an object');
    } else {
      for (const [key, value] of Object.entries(
        security.customHeaders as Record<string, unknown>
      )) {
        if (typeof key !== 'string' || typeof value !== 'string') {
          errors.push('frontend.security.customHeaders keys and values must be strings');
        }
      }
    }
  }
}

function validateS3Config(s3: Record<string, unknown>, errors: string[]): void {
  if (s3.enableVersioning !== undefined && typeof s3.enableVersioning !== 'boolean') {
    errors.push('frontend.s3.enableVersioning must be a boolean');
  }

  if (s3.enableLogging !== undefined && typeof s3.enableLogging !== 'boolean') {
    errors.push('frontend.s3.enableLogging must be a boolean');
  }

  if (s3.lifecyclePolicyEnabled !== undefined && typeof s3.lifecyclePolicyEnabled !== 'boolean') {
    errors.push('frontend.s3.lifecyclePolicyEnabled must be a boolean');
  }

  if (s3.oldVersionExpirationDays !== undefined) {
    if (
      typeof s3.oldVersionExpirationDays !== 'number' ||
      s3.oldVersionExpirationDays < 1 ||
      s3.oldVersionExpirationDays > 365
    ) {
      errors.push('frontend.s3.oldVersionExpirationDays must be a number between 1 and 365');
    }
  }

  if (s3.incompleteMultipartUploadDays !== undefined) {
    if (
      typeof s3.incompleteMultipartUploadDays !== 'number' ||
      s3.incompleteMultipartUploadDays < 1 ||
      s3.incompleteMultipartUploadDays > 30
    ) {
      errors.push('frontend.s3.incompleteMultipartUploadDays must be a number between 1 and 30');
    }
  }
}

function validateMonitoringConfig(monitoring: Record<string, unknown>, errors: string[]): void {
  if (monitoring.logRetentionDays !== undefined) {
    if (typeof monitoring.logRetentionDays !== 'number' || monitoring.logRetentionDays <= 0) {
      errors.push('monitoring.logRetentionDays must be a positive number');
    }
  }

  if (
    monitoring.enableDetailedMonitoring !== undefined &&
    typeof monitoring.enableDetailedMonitoring !== 'boolean'
  ) {
    errors.push('monitoring.enableDetailedMonitoring must be a boolean');
  }

  if (monitoring.enableAlerts !== undefined && typeof monitoring.enableAlerts !== 'boolean') {
    errors.push('monitoring.enableAlerts must be a boolean');
  }

  if (monitoring.alertEmail !== undefined && monitoring.alertEmail !== null) {
    if (typeof monitoring.alertEmail !== 'string') {
      errors.push('monitoring.alertEmail must be a string or null');
    } else {
      // 基本的なメールアドレス形式チェック
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(monitoring.alertEmail)) {
        errors.push('monitoring.alertEmail must be a valid email address');
      }
    }
  }
}

function validateSecretsManagerConfig(
  secretsManager: Record<string, unknown>,
  errors: string[]
): void {
  if (
    secretsManager.enableEncryption !== undefined &&
    typeof secretsManager.enableEncryption !== 'boolean'
  ) {
    errors.push('secretsManager.enableEncryption must be a boolean');
  }

  if (
    secretsManager.enableRotation !== undefined &&
    typeof secretsManager.enableRotation !== 'boolean'
  ) {
    errors.push('secretsManager.enableRotation must be a boolean');
  }

  if (secretsManager.rotationIntervalDays !== undefined) {
    if (
      typeof secretsManager.rotationIntervalDays !== 'number' ||
      secretsManager.rotationIntervalDays < 1 ||
      secretsManager.rotationIntervalDays > 365
    ) {
      errors.push('secretsManager.rotationIntervalDays must be a number between 1 and 365');
    }
  }

  if (
    secretsManager.enableCaching !== undefined &&
    typeof secretsManager.enableCaching !== 'boolean'
  ) {
    errors.push('secretsManager.enableCaching must be a boolean');
  }

  if (secretsManager.cacheTtlMinutes !== undefined) {
    if (
      typeof secretsManager.cacheTtlMinutes !== 'number' ||
      secretsManager.cacheTtlMinutes < 1 ||
      secretsManager.cacheTtlMinutes > 60
    ) {
      errors.push('secretsManager.cacheTtlMinutes must be a number between 1 and 60');
    }
  }

  if (
    secretsManager.enableMonitoring !== undefined &&
    typeof secretsManager.enableMonitoring !== 'boolean'
  ) {
    errors.push('secretsManager.enableMonitoring must be a boolean');
  }

  if (secretsManager.tags !== undefined) {
    validateTagsConfig(secretsManager.tags as Record<string, unknown>, errors);
  }
}

function validateTagsConfig(tags: Record<string, unknown>, errors: string[]): void {
  if (typeof tags !== 'object' || Array.isArray(tags)) {
    errors.push('tags must be an object');
    return;
  }

  for (const [key, value] of Object.entries(tags)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      errors.push('all tag keys and values must be strings');
      break;
    }

    if (key.length > 128) {
      errors.push(`tag key '${key}' exceeds maximum length of 128 characters`);
    }

    if (value.length > 256) {
      errors.push(`tag value for key '${key}' exceeds maximum length of 256 characters`);
    }
  }
}

function validateAccountId(accountId: string, errors: string[]): void {
  const accountIdPattern = /^\d{12}$/;
  if (!accountIdPattern.test(accountId)) {
    errors.push('account must be a 12-digit AWS account ID');
  }
}
