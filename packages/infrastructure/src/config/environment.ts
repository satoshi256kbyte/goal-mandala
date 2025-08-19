import * as fs from 'fs';
import * as path from 'path';
import { constants, Environment, ValidRegion, ValidInstanceClass } from './constants';

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

  let config: any;
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

function validateConfig(config: any, environment: string): EnvironmentConfig {
  const errors: string[] = [];

  // 必須フィールドの検証
  if (!config.stackPrefix || typeof config.stackPrefix !== 'string') {
    errors.push('stackPrefix is required and must be a string');
  }

  if (!config.region || typeof config.region !== 'string') {
    errors.push('region is required and must be a string');
  }

  if (!config.network || typeof config.network !== 'object') {
    errors.push('network configuration is required and must be an object');
  }

  if (!config.database || typeof config.database !== 'object') {
    errors.push('database configuration is required and must be an object');
  }

  if (!config.lambda || typeof config.lambda !== 'object') {
    errors.push('lambda configuration is required and must be an object');
  }

  if (!config.frontend || typeof config.frontend !== 'object') {
    errors.push('frontend configuration is required and must be an object');
  }

  // 早期エラー終了
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  // スタックプレフィックスの詳細検証
  validateStackPrefix(config.stackPrefix, errors);

  // リージョンの詳細検証
  validateRegion(config.region, errors);

  // ネットワーク設定の詳細検証
  validateNetworkConfig(config.network, errors);

  // データベース設定の詳細検証
  validateDatabaseConfig(config.database, errors);

  // Lambda設定の詳細検証
  validateLambdaConfig(config.lambda, errors);

  // フロントエンド設定の詳細検証
  validateFrontendConfig(config.frontend, errors);

  // オプション設定の検証
  if (config.monitoring) {
    validateMonitoringConfig(config.monitoring, errors);
  }

  if (config.tags) {
    validateTagsConfig(config.tags, errors);
  }

  // アカウントIDの検証（オプション）
  if (config.account && typeof config.account === 'string') {
    validateAccountId(config.account, errors);
  }

  // エラーがある場合は例外を投げる
  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed for environment '${environment}':\n${errors.join('\n')}`
    );
  }

  // デフォルト値の設定
  const validatedConfig: EnvironmentConfig = {
    ...config,
    network: {
      ...config.network,
      vpcCidr: config.network.vpcCidr || '10.0.0.0/16',
      maxAzs: config.network.maxAzs || 2,
    },
    database: {
      ...config.database,
      databaseName: config.database.databaseName || constants.DATABASE.DEFAULT_DATABASE_NAME,
      backupRetentionDays:
        config.database.backupRetentionDays || constants.DATABASE.BACKUP_RETENTION_DAYS,
      deletionProtection:
        config.database.deletionProtection ?? constants.DATABASE.DELETION_PROTECTION,
      performanceInsights: config.database.performanceInsights ?? true,
      monitoringInterval: config.database.monitoringInterval ?? 60,
      enableAuditLog: config.database.enableAuditLog ?? true,
      enableSlowQueryLog: config.database.enableSlowQueryLog ?? true,
      slowQueryLogThreshold: config.database.slowQueryLogThreshold ?? 1000,
      enableEncryption: config.database.enableEncryption ?? true,
      enableIamDatabaseAuthentication: config.database.enableIamDatabaseAuthentication ?? true,
      enableSslConnection: config.database.enableSslConnection ?? true,
    },
    lambda: {
      ...config.lambda,
      runtime: config.lambda.runtime || constants.LAMBDA.RUNTIME,
    },
    frontend: {
      ...config.frontend,
      customErrorResponses: config.frontend.customErrorResponses ?? true,
    },
    monitoring: {
      logRetentionDays:
        config.monitoring?.logRetentionDays || constants.MONITORING.LOG_RETENTION_DAYS,
      enableDetailedMonitoring: config.monitoring?.enableDetailedMonitoring ?? false,
      ...config.monitoring,
    },
    tags: {
      ...constants.TAGS,
      Environment: environment,
      ...config.tags,
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

function validateNetworkConfig(network: any, errors: string[]): void {
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
    if (!cidrPattern.test(network.vpcCidr)) {
      errors.push('network.vpcCidr must be a valid CIDR notation (e.g., 10.0.0.0/16)');
    }
  }

  if (network.maxAzs !== undefined) {
    if (typeof network.maxAzs !== 'number' || network.maxAzs < 2 || network.maxAzs > 6) {
      errors.push('network.maxAzs must be a number between 2 and 6');
    }
  }
}

function validateDatabaseConfig(database: any, errors: string[]): void {
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

  if (database.maxCapacity < database.minCapacity) {
    errors.push('database.maxCapacity must be greater than or equal to minCapacity');
  }

  if (typeof database.multiAz !== 'boolean') {
    errors.push('database.multiAz is required and must be a boolean');
  }

  // Aurora Serverless V2の容量制限チェック
  if (database.instanceClass === 'serverless') {
    if (database.minCapacity < 0.5 || database.minCapacity > 128) {
      errors.push('database.minCapacity for serverless must be between 0.5 and 128 ACUs');
    }
    if (database.maxCapacity < 0.5 || database.maxCapacity > 128) {
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
    validateTagsConfig(database.tags, errors);
  }
}

function validateLambdaConfig(lambda: any, errors: string[]): void {
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

function validateFrontendConfig(frontend: any, errors: string[]): void {
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

  // ドメイン名の形式チェック
  if (frontend.domainName) {
    const domainPattern =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainPattern.test(frontend.domainName)) {
      errors.push('frontend.domainName must be a valid domain name');
    }
  }

  // 証明書ARNの形式チェック
  if (frontend.certificateArn) {
    const arnPattern = /^arn:aws:acm:[a-z0-9-]+:\d{12}:certificate\/[a-f0-9-]+$/;
    if (!arnPattern.test(frontend.certificateArn)) {
      errors.push('frontend.certificateArn must be a valid ACM certificate ARN');
    }
  }
}

function validateMonitoringConfig(monitoring: any, errors: string[]): void {
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

function validateTagsConfig(tags: any, errors: string[]): void {
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
