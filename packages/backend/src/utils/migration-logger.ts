import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

export interface MigrationLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  metadata?: Record<string, unknown>;
  migrationName?: string;
  duration?: number;
}

export class MigrationLogger {
  private cloudWatchClient?: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;

  constructor(
    logGroupName = '/aws/lambda/goal-mandala-migration',
    logStreamName = `migration-${new Date().toISOString().split('T')[0]}`
  ) {
    this.logGroupName = logGroupName;
    this.logStreamName = logStreamName;

    // CloudWatch Logsクライアントの初期化（本番環境のみ）
    if (process.env.NODE_ENV === 'production' && process.env.AWS_REGION) {
      this.cloudWatchClient = new CloudWatchLogsClient({
        region: process.env.AWS_REGION,
      });
    }
  }

  /**
   * 構造化ログエントリを作成
   */
  private createLogEntry(
    level: MigrationLogEntry['level'],
    message: string,
    metadata?: Record<string, unknown>,
    migrationName?: string,
    duration?: number
  ): MigrationLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      migrationName,
      duration,
    };
  }

  /**
   * ローカルログ出力
   */
  private logToConsole(entry: MigrationLogEntry): void {
    const colorMap = {
      INFO: '\x1b[34m', // Blue
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      SUCCESS: '\x1b[32m', // Green
    };

    const resetColor = '\x1b[0m';
    const color = colorMap[entry.level];

    const logMessage = JSON.stringify(
      {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        ...(entry.migrationName && { migrationName: entry.migrationName }),
        ...(entry.duration && { duration: `${entry.duration}ms` }),
        ...(entry.metadata && { metadata: entry.metadata }),
      },
      null,
      2
    );

    console.log(`${color}[${entry.level}]${resetColor} ${logMessage}`);
  }

  /**
   * CloudWatch Logsに送信
   */
  private async sendToCloudWatch(entry: MigrationLogEntry): Promise<void> {
    if (!this.cloudWatchClient) {
      return;
    }

    try {
      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify(entry),
      };

      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
      });

      await this.cloudWatchClient.send(command);
    } catch (error) {
      console.error('CloudWatch Logs送信エラー:', error);
    }
  }

  /**
   * ログ出力（ローカル + CloudWatch）
   */
  private async log(
    level: MigrationLogEntry['level'],
    message: string,
    metadata?: Record<string, unknown>,
    migrationName?: string,
    duration?: number
  ): Promise<void> {
    const entry = this.createLogEntry(level, message, metadata, migrationName, duration);

    // ローカルログ出力
    this.logToConsole(entry);

    // CloudWatch Logs送信（非同期）
    this.sendToCloudWatch(entry).catch(error => {
      console.error('CloudWatch Logs送信に失敗:', error);
    });
  }

  /**
   * 情報ログ
   */
  async info(
    message: string,
    metadata?: Record<string, unknown>,
    migrationName?: string
  ): Promise<void> {
    await this.log('INFO', message, metadata, migrationName);
  }

  /**
   * 警告ログ
   */
  async warning(
    message: string,
    metadata?: Record<string, unknown>,
    migrationName?: string
  ): Promise<void> {
    await this.log('WARNING', message, metadata, migrationName);
  }

  /**
   * エラーログ
   */
  async error(
    message: string,
    metadata?: Record<string, unknown>,
    migrationName?: string
  ): Promise<void> {
    await this.log('ERROR', message, metadata, migrationName);
  }

  /**
   * 成功ログ
   */
  async success(
    message: string,
    metadata?: Record<string, unknown>,
    migrationName?: string,
    duration?: number
  ): Promise<void> {
    await this.log('SUCCESS', message, metadata, migrationName, duration);
  }

  /**
   * マイグレーション開始ログ
   */
  async migrationStart(migrationName: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.info(
      `マイグレーション開始: ${migrationName}`,
      {
        ...metadata,
        action: 'migration_start',
        environment: process.env.NODE_ENV || 'development',
      },
      migrationName
    );
  }

  /**
   * マイグレーション完了ログ
   */
  async migrationComplete(
    migrationName: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.success(
      `マイグレーション完了: ${migrationName}`,
      {
        ...metadata,
        action: 'migration_complete',
        environment: process.env.NODE_ENV || 'development',
      },
      migrationName,
      duration
    );
  }

  /**
   * マイグレーション失敗ログ
   */
  async migrationFailed(
    migrationName: string,
    error: Error,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.error(
      `マイグレーション失敗: ${migrationName}`,
      {
        ...metadata,
        action: 'migration_failed',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        environment: process.env.NODE_ENV || 'development',
      },
      migrationName
    );
  }

  /**
   * データベース接続ログ
   */
  async databaseConnection(
    status: 'success' | 'failed',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const level = status === 'success' ? 'SUCCESS' : 'ERROR';
    const message = `データベース接続${status === 'success' ? '成功' : '失敗'}`;

    await this.log(level, message, {
      ...metadata,
      action: 'database_connection',
      status,
    });
  }

  /**
   * パフォーマンスメトリクス記録
   */
  async performanceMetrics(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.info(`パフォーマンス測定: ${operation}`, {
      ...metadata,
      action: 'performance_metrics',
      operation,
      duration_ms: duration,
      performance_category: this.categorizePerformance(duration),
    });
  }

  /**
   * パフォーマンスカテゴリ分類
   */
  private categorizePerformance(duration: number): string {
    if (duration < 1000) return 'fast';
    if (duration < 5000) return 'normal';
    if (duration < 30000) return 'slow';
    return 'very_slow';
  }
}

// シングルトンインスタンス
export const migrationLogger = new MigrationLogger();
