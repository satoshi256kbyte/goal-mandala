import { EnvironmentConfig } from './environment';
import { constants, Environment } from './constants';

/**
 * 環境が本番環境かどうかを判定
 */
export function isProductionEnvironment(environment: string): boolean {
  return environment === constants.ENVIRONMENTS.PROD;
}

/**
 * 環境が開発環境かどうかを判定
 */
export function isDevelopmentEnvironment(environment: string): boolean {
  return environment === constants.ENVIRONMENTS.LOCAL || environment === constants.ENVIRONMENTS.DEV;
}

/**
 * スタック名を生成
 */
export function generateStackName(config: EnvironmentConfig, stackType: string): string {
  return `${config.stackPrefix}${constants.STACK_NAMING.SEPARATOR}${stackType}`;
}

/**
 * リソース名を生成
 */
export function generateResourceName(
  config: EnvironmentConfig,
  resourceType: string,
  resourceName: string
): string {
  return `${config.stackPrefix}${constants.STACK_NAMING.SEPARATOR}${resourceType}${constants.STACK_NAMING.SEPARATOR}${resourceName}`;
}

/**
 * 共通タグを生成
 */
export function generateCommonTags(
  config: EnvironmentConfig,
  additionalTags: Record<string, string> = {}
): Record<string, string> {
  return {
    ...config.tags,
    ...additionalTags,
  };
}

/**
 * データベース設定の取得（デフォルト値適用済み）
 */
export function getDatabaseConfig(config: EnvironmentConfig) {
  return {
    databaseName: config.database.databaseName || constants.DATABASE.DEFAULT_DATABASE_NAME,
    instanceClass: config.database.instanceClass,
    minCapacity: config.database.minCapacity,
    maxCapacity: config.database.maxCapacity,
    backupRetentionDays:
      config.database.backupRetentionDays || constants.DATABASE.BACKUP_RETENTION_DAYS,
    deletionProtection:
      config.database.deletionProtection ?? constants.DATABASE.DELETION_PROTECTION,
    engineVersion: constants.DATABASE.ENGINE_VERSION,
  };
}

/**
 * Lambda設定の取得（デフォルト値適用済み）
 */
export function getLambdaConfig(config: EnvironmentConfig) {
  return {
    timeout: config.lambda.timeout,
    memorySize: config.lambda.memorySize,
    runtime: config.lambda.runtime || constants.LAMBDA.RUNTIME,
  };
}

/**
 * 監視設定の取得（デフォルト値適用済み）
 */
export function getMonitoringConfig(config: EnvironmentConfig) {
  return {
    logRetentionDays:
      config.monitoring?.logRetentionDays || constants.MONITORING.LOG_RETENTION_DAYS,
    enableDetailedMonitoring: config.monitoring?.enableDetailedMonitoring ?? false,
    metricRetentionDays: constants.MONITORING.METRIC_RETENTION_DAYS,
    alarmEvaluationPeriods: constants.MONITORING.ALARM_EVALUATION_PERIODS,
    alarmDatapointsToAlarm: constants.MONITORING.ALARM_DATAPOINTS_TO_ALARM,
  };
}

/**
 * セキュリティ設定の取得
 */
export function getSecurityConfig() {
  return {
    tlsVersion: constants.SECURITY.TLS_VERSION,
    hstsMaxAge: constants.SECURITY.HSTS_MAX_AGE,
    contentTypeOptions: constants.SECURITY.CONTENT_TYPE_OPTIONS,
    frameOptions: constants.SECURITY.FRAME_OPTIONS,
    xssProtection: constants.SECURITY.XSS_PROTECTION,
  };
}

/**
 * CloudFront設定の取得
 */
export function getCloudFrontConfig(config: EnvironmentConfig) {
  return {
    defaultRootObject: constants.CLOUDFRONT.DEFAULT_ROOT_OBJECT,
    errorPagePath: constants.CLOUDFRONT.ERROR_PAGE_PATH,
    cachePolicyId: constants.CLOUDFRONT.CACHE_POLICY_ID,
    originRequestPolicyId: constants.CLOUDFRONT.ORIGIN_REQUEST_POLICY_ID,
    customErrorResponses: config.frontend.customErrorResponses ?? true,
    domainName: config.frontend.domainName,
    certificateArn: config.frontend.certificateArn,
  };
}

/**
 * 環境固有の設定を適用
 */
export function applyEnvironmentSpecificConfig(
  config: EnvironmentConfig,
  environment: Environment
): EnvironmentConfig {
  const environmentSpecificConfig = { ...config };

  // 本番環境固有の設定
  if (isProductionEnvironment(environment)) {
    environmentSpecificConfig.database.deletionProtection = true;
    if (!environmentSpecificConfig.monitoring) {
      environmentSpecificConfig.monitoring = {};
    }
    environmentSpecificConfig.monitoring.enableDetailedMonitoring = true;
  }

  // 開発環境固有の設定
  if (isDevelopmentEnvironment(environment)) {
    environmentSpecificConfig.database.deletionProtection = false;
    if (!environmentSpecificConfig.monitoring) {
      environmentSpecificConfig.monitoring = {};
    }
    environmentSpecificConfig.monitoring.enableDetailedMonitoring = false;
  }

  return environmentSpecificConfig;
}

/**
 * 設定の妥当性を再検証
 */
export function validateConfigConsistency(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // 本番環境での安全性チェック
  if (config.tags?.Environment === 'production') {
    if (!config.database.deletionProtection) {
      errors.push('Production environment must have database deletion protection enabled');
    }

    if (config.database.backupRetentionDays && config.database.backupRetentionDays < 7) {
      errors.push('Production environment must have at least 7 days of backup retention');
    }

    if (!config.monitoring?.enableDetailedMonitoring) {
      errors.push('Production environment should have detailed monitoring enabled');
    }
  }

  // SSL証明書とドメイン名の整合性チェック
  if (config.frontend.domainName && !config.frontend.certificateArn) {
    errors.push('Custom domain name requires a valid SSL certificate ARN');
  }

  if (config.frontend.certificateArn && !config.frontend.domainName) {
    errors.push('SSL certificate ARN provided but no domain name specified');
  }

  // データベース容量の論理チェック
  if (config.database.maxCapacity < config.database.minCapacity * 2) {
    console.warn(
      `Warning: maxCapacity (${config.database.maxCapacity}) is less than twice the minCapacity (${config.database.minCapacity}). This may limit auto-scaling effectiveness.`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Configuration consistency validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * 設定のサマリーを生成（デバッグ用）
 */
export function generateConfigSummary(config: EnvironmentConfig): string {
  return `
Configuration Summary:
- Stack Prefix: ${config.stackPrefix}
- Region: ${config.region}
- Environment: ${config.tags?.Environment || 'unknown'}
- Database: ${config.database.instanceClass} (${config.database.minCapacity}-${config.database.maxCapacity} ACUs)
- Lambda: ${config.lambda.memorySize}MB, ${config.lambda.timeout}s timeout
- Monitoring: ${config.monitoring?.enableDetailedMonitoring ? 'Detailed' : 'Basic'}
- Deletion Protection: ${config.database.deletionProtection ? 'Enabled' : 'Disabled'}
- Custom Domain: ${config.frontend.domainName || 'None'}
`.trim();
}
