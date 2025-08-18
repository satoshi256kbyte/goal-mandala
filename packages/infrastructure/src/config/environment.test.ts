import * as fs from 'fs';
import * as path from 'path';
import { getEnvironmentConfig, EnvironmentConfig } from './environment';

// fs.existsSync と fs.readFileSync をモック
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Environment Configuration', () => {
  const mockConfigPath = path.join(__dirname, '..', '..', 'config', 'test.json');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnvironmentConfig', () => {
    it('正常な設定ファイルを読み込める', () => {
      const mockConfig = {
        stackPrefix: 'goal-mandala-test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {
          domainName: null,
          certificateArn: null,
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = getEnvironmentConfig('test');

      expect(result).toMatchObject({
        stackPrefix: 'goal-mandala-test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
          databaseName: 'goalmandalamain',
          backupRetentionDays: 7,
          deletionProtection: true,
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
          runtime: 'nodejs20.x',
        },
        frontend: {
          domainName: null,
          certificateArn: null,
          customErrorResponses: true,
        },
      });
    });

    it('設定ファイルが存在しない場合はエラーを投げる', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => getEnvironmentConfig('dev')).toThrow('Configuration file not found');
    });

    it('無効な環境名の場合はエラーを投げる', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => getEnvironmentConfig('invalid-env')).toThrow('Invalid environment: invalid-env');
    });

    it('JSONパースエラーの場合はエラーを投げる', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      expect(() => getEnvironmentConfig('dev')).toThrow('Failed to parse configuration file');
    });

    it('必須フィールドが不足している場合はエラーを投げる', () => {
      const invalidConfig = {
        // stackPrefix が不足
        region: 'ap-northeast-1',
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow(
        'stackPrefix is required and must be a string'
      );
    });

    it('無効なリージョンの場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'invalid-region',
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

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow('region must be one of:');
    });

    it('無効なデータベース設定の場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'invalid-class',
          minCapacity: -1,
          maxCapacity: 0.1,
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {},
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow('database.instanceClass must be one of:');
    });

    it('無効なLambda設定の場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
        },
        lambda: {
          timeout: 1000, // 最大値を超える
          memorySize: 100, // 最小値を下回る
        },
        frontend: {},
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow('lambda.timeout must be a number between');
    });

    it('Aurora Serverless V2の容量制限をチェックする', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.1, // 最小値を下回る
          maxCapacity: 200, // 最大値を超える
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {},
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow(
        'database.minCapacity for serverless must be between 0.5 and 128 ACUs'
      );
    });

    it('maxCapacityがminCapacityより小さい場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 2,
          maxCapacity: 1, // minCapacityより小さい
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {},
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow(
        'database.maxCapacity must be greater than or equal to minCapacity'
      );
    });

    it('無効なドメイン名の場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {
          domainName: 'invalid..domain',
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow(
        'frontend.domainName must be a valid domain name'
      );
    });

    it('無効な証明書ARNの場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
        },
        lambda: {
          timeout: 30,
          memorySize: 256,
        },
        frontend: {
          certificateArn: 'invalid-arn',
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow(
        'frontend.certificateArn must be a valid ACM certificate ARN'
      );
    });

    it('無効なアカウントIDの場合はエラーを投げる', () => {
      const invalidConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        account: 'invalid-account-id',
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

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => getEnvironmentConfig('dev')).toThrow(
        'account must be a 12-digit AWS account ID'
      );
    });

    it('オプション設定が正しく適用される', () => {
      const configWithOptions = {
        stackPrefix: 'goal-mandala-test',
        region: 'ap-northeast-1',
        database: {
          instanceClass: 'serverless',
          minCapacity: 0.5,
          maxCapacity: 1,
          databaseName: 'custom_db',
          backupRetentionDays: 14,
          deletionProtection: true,
        },
        lambda: {
          timeout: 60,
          memorySize: 512,
          runtime: 'nodejs18.x',
        },
        frontend: {
          domainName: 'example.com',
          certificateArn:
            'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
          customErrorResponses: false,
        },
        monitoring: {
          logRetentionDays: 30,
          enableDetailedMonitoring: true,
        },
        tags: {
          Project: 'GoalMandala',
          Owner: 'DevTeam',
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configWithOptions));

      const result = getEnvironmentConfig('test');

      expect(result).toMatchObject({
        database: {
          databaseName: 'custom_db',
          backupRetentionDays: 14,
          deletionProtection: true,
        },
        lambda: {
          runtime: 'nodejs18.x',
        },
        frontend: {
          domainName: 'example.com',
          customErrorResponses: false,
        },
        monitoring: {
          logRetentionDays: 30,
          enableDetailedMonitoring: true,
        },
        tags: {
          Project: 'GoalMandala',
          Owner: 'DevTeam',
          Environment: 'test',
        },
      });
    });
  });
});
