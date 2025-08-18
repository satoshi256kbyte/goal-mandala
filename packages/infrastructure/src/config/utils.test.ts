import {
  isProductionEnvironment,
  isDevelopmentEnvironment,
  generateStackName,
  generateResourceName,
  generateCommonTags,
  getDatabaseConfig,
  getLambdaConfig,
  getMonitoringConfig,
  getSecurityConfig,
  getCloudFrontConfig,
  applyEnvironmentSpecificConfig,
  validateConfigConsistency,
  generateConfigSummary,
} from './utils';
import { EnvironmentConfig } from './environment';
import { constants } from './constants';

describe('Configuration Utils', () => {
  const createMockConfig = (): EnvironmentConfig => ({
    stackPrefix: 'test-app',
    region: 'ap-northeast-1',
    database: {
      instanceClass: 'serverless',
      minCapacity: 0.5,
      maxCapacity: 2,
      backupRetentionDays: 7,
      deletionProtection: true,
    },
    lambda: {
      timeout: 30,
      memorySize: 256,
    },
    frontend: {
      domainName: 'example.com',
      certificateArn:
        'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
    },
    monitoring: {
      logRetentionDays: 30,
      enableDetailedMonitoring: true,
    },
    tags: {
      Environment: 'test',
      Project: 'goal-mandala',
    },
  });

  describe('Environment Detection', () => {
    it('should correctly identify production environment', () => {
      expect(isProductionEnvironment('prod')).toBe(true);
      expect(isProductionEnvironment('dev')).toBe(false);
      expect(isProductionEnvironment('stg')).toBe(false);
      expect(isProductionEnvironment('local')).toBe(false);
    });

    it('should correctly identify development environments', () => {
      expect(isDevelopmentEnvironment('local')).toBe(true);
      expect(isDevelopmentEnvironment('dev')).toBe(true);
      expect(isDevelopmentEnvironment('stg')).toBe(false);
      expect(isDevelopmentEnvironment('prod')).toBe(false);
    });
  });

  describe('Name Generation', () => {
    it('should generate correct stack name', () => {
      const mockConfig = createMockConfig();
      const stackName = generateStackName(mockConfig, 'database');
      expect(stackName).toBe('test-app-database');
    });

    it('should generate correct resource name', () => {
      const mockConfig = createMockConfig();
      const resourceName = generateResourceName(mockConfig, 'lambda', 'api-handler');
      expect(resourceName).toBe('test-app-lambda-api-handler');
    });

    it('should generate common tags', () => {
      const mockConfig = createMockConfig();
      const tags = generateCommonTags(mockConfig, { CustomTag: 'value' });
      expect(tags).toEqual({
        Environment: 'test',
        Project: 'goal-mandala',
        CustomTag: 'value',
      });
    });
  });

  describe('Configuration Getters', () => {
    it('should get database config with defaults', () => {
      const mockConfig = createMockConfig();
      const dbConfig = getDatabaseConfig(mockConfig);
      expect(dbConfig).toEqual({
        databaseName: constants.DATABASE.DEFAULT_DATABASE_NAME,
        instanceClass: 'serverless',
        minCapacity: 0.5,
        maxCapacity: 2,
        backupRetentionDays: 7,
        deletionProtection: true,
        engineVersion: constants.DATABASE.ENGINE_VERSION,
      });
    });

    it('should get lambda config with defaults', () => {
      const mockConfig = createMockConfig();
      const lambdaConfig = getLambdaConfig(mockConfig);
      expect(lambdaConfig).toEqual({
        timeout: 30,
        memorySize: 256,
        runtime: constants.LAMBDA.RUNTIME,
      });
    });

    it('should get monitoring config with defaults', () => {
      const mockConfig = createMockConfig();
      const monitoringConfig = getMonitoringConfig(mockConfig);
      expect(monitoringConfig).toEqual({
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        metricRetentionDays: constants.MONITORING.METRIC_RETENTION_DAYS,
        alarmEvaluationPeriods: constants.MONITORING.ALARM_EVALUATION_PERIODS,
        alarmDatapointsToAlarm: constants.MONITORING.ALARM_DATAPOINTS_TO_ALARM,
      });
    });

    it('should get security config', () => {
      const securityConfig = getSecurityConfig();
      expect(securityConfig).toEqual({
        tlsVersion: constants.SECURITY.TLS_VERSION,
        hstsMaxAge: constants.SECURITY.HSTS_MAX_AGE,
        contentTypeOptions: constants.SECURITY.CONTENT_TYPE_OPTIONS,
        frameOptions: constants.SECURITY.FRAME_OPTIONS,
        xssProtection: constants.SECURITY.XSS_PROTECTION,
      });
    });

    it('should get CloudFront config', () => {
      const mockConfig = createMockConfig();
      const cloudFrontConfig = getCloudFrontConfig(mockConfig);
      expect(cloudFrontConfig).toEqual({
        defaultRootObject: constants.CLOUDFRONT.DEFAULT_ROOT_OBJECT,
        errorPagePath: constants.CLOUDFRONT.ERROR_PAGE_PATH,
        cachePolicyId: constants.CLOUDFRONT.CACHE_POLICY_ID,
        originRequestPolicyId: constants.CLOUDFRONT.ORIGIN_REQUEST_POLICY_ID,
        customErrorResponses: true,
        domainName: 'example.com',
        certificateArn:
          'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
      });
    });
  });

  describe('Environment Specific Configuration', () => {
    it('should apply production-specific settings', () => {
      const mockConfig = createMockConfig();
      const prodConfig = applyEnvironmentSpecificConfig(mockConfig, 'prod');
      expect(prodConfig.database.deletionProtection).toBe(true);
      expect(prodConfig.monitoring?.enableDetailedMonitoring).toBe(true);
    });

    it('should apply development-specific settings', () => {
      const mockConfig = createMockConfig();
      const devConfig = applyEnvironmentSpecificConfig(mockConfig, 'dev');
      expect(devConfig.database.deletionProtection).toBe(false);
      expect(devConfig.monitoring?.enableDetailedMonitoring).toBe(false);
    });

    it('should apply local-specific settings', () => {
      const mockConfig = createMockConfig();
      const localConfig = applyEnvironmentSpecificConfig(mockConfig, 'local');
      expect(localConfig.database.deletionProtection).toBe(false);
      expect(localConfig.monitoring?.enableDetailedMonitoring).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate production environment requirements', () => {
      const mockConfig = createMockConfig();
      const prodConfig: EnvironmentConfig = {
        ...mockConfig,
        tags: { Environment: 'production' },
        database: {
          ...mockConfig.database,
          deletionProtection: false, // Invalid for production
        },
      };

      expect(() => validateConfigConsistency(prodConfig)).toThrow(
        'Production environment must have database deletion protection enabled'
      );
    });

    it('should validate SSL certificate and domain consistency', () => {
      const mockConfig = createMockConfig();
      const invalidConfig: EnvironmentConfig = {
        ...mockConfig,
        frontend: {
          domainName: 'example.com',
          certificateArn: undefined, // Missing certificate for custom domain
        },
      };

      expect(() => validateConfigConsistency(invalidConfig)).toThrow(
        'Custom domain name requires a valid SSL certificate ARN'
      );
    });

    it('should validate certificate without domain', () => {
      const mockConfig = createMockConfig();
      const invalidConfig: EnvironmentConfig = {
        ...mockConfig,
        frontend: {
          domainName: undefined,
          certificateArn:
            'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
        },
      };

      expect(() => validateConfigConsistency(invalidConfig)).toThrow(
        'SSL certificate ARN provided but no domain name specified'
      );
    });

    it('should pass validation for valid configuration', () => {
      const mockConfig = createMockConfig();
      expect(() => validateConfigConsistency(mockConfig)).not.toThrow();
    });

    it('should warn about inefficient capacity settings', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockConfig = createMockConfig();
      const inefficientConfig: EnvironmentConfig = {
        ...mockConfig,
        database: {
          ...mockConfig.database,
          minCapacity: 2,
          maxCapacity: 2.5, // Less than twice the minimum
        },
      };

      validateConfigConsistency(inefficientConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: maxCapacity (2.5) is less than twice the minCapacity (2)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Summary', () => {
    it('should generate readable configuration summary', () => {
      const mockConfig = createMockConfig();
      const summary = generateConfigSummary(mockConfig);

      expect(summary).toContain('Stack Prefix: test-app');
      expect(summary).toContain('Region: ap-northeast-1');
      expect(summary).toContain('Environment: test');
      expect(summary).toContain('Database: serverless (0.5-2 ACUs)');
      expect(summary).toContain('Lambda: 256MB, 30s timeout');
      expect(summary).toContain('Monitoring: Detailed');
      expect(summary).toContain('Deletion Protection: Enabled');
      expect(summary).toContain('Custom Domain: example.com');
    });

    it('should handle missing optional fields in summary', () => {
      const minimalConfig: EnvironmentConfig = {
        stackPrefix: 'minimal-app',
        region: 'us-east-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {},
      };

      const summary = generateConfigSummary(minimalConfig);

      expect(summary).toContain('Environment: unknown');
      expect(summary).toContain('Monitoring: Basic');
      expect(summary).toContain('Custom Domain: None');
    });
  });
});
