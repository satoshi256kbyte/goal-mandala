import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';

export interface MigrationMetrics {
  migrationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  tablesAffected?: number;
  recordsAffected?: number;
  errorMessage?: string;
}

export class MigrationMetricsCollector {
  private cloudWatchClient?: CloudWatchClient;
  private namespace: string;
  private metrics: Map<string, MigrationMetrics>;

  constructor(namespace = 'GoalMandala/Migration') {
    this.namespace = namespace;
    this.metrics = new Map();

    // CloudWatchクライアントの初期化（本番環境のみ）
    if (process.env.NODE_ENV === 'production' && process.env.AWS_REGION) {
      this.cloudWatchClient = new CloudWatchClient({
        region: process.env.AWS_REGION,
      });
    }
  }

  /**
   * マイグレーション開始メトリクス記録
   */
  startMigration(migrationName: string): void {
    const metrics: MigrationMetrics = {
      migrationName,
      startTime: Date.now(),
      status: 'started',
    };

    this.metrics.set(migrationName, metrics);
    this.sendMetricToCloudWatch('MigrationStarted', 1, migrationName);
  }

  /**
   * マイグレーション完了メトリクス記録
   */
  completeMigration(
    migrationName: string,
    tablesAffected?: number,
    recordsAffected?: number
  ): void {
    const metrics = this.metrics.get(migrationName);
    if (!metrics) {
      console.warn(`マイグレーション ${migrationName} の開始メトリクスが見つかりません`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    const updatedMetrics: MigrationMetrics = {
      ...metrics,
      endTime,
      duration,
      status: 'completed',
      tablesAffected,
      recordsAffected,
    };

    this.metrics.set(migrationName, updatedMetrics);

    // CloudWatchメトリクス送信
    this.sendMetricToCloudWatch('MigrationCompleted', 1, migrationName);
    this.sendMetricToCloudWatch('MigrationDuration', duration, migrationName);

    if (tablesAffected !== undefined) {
      this.sendMetricToCloudWatch('TablesAffected', tablesAffected, migrationName);
    }

    if (recordsAffected !== undefined) {
      this.sendMetricToCloudWatch('RecordsAffected', recordsAffected, migrationName);
    }
  }

  /**
   * マイグレーション失敗メトリクス記録
   */
  failMigration(migrationName: string, errorMessage: string): void {
    const metrics = this.metrics.get(migrationName);
    if (!metrics) {
      console.warn(`マイグレーション ${migrationName} の開始メトリクスが見つかりません`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    const updatedMetrics: MigrationMetrics = {
      ...metrics,
      endTime,
      duration,
      status: 'failed',
      errorMessage,
    };

    this.metrics.set(migrationName, updatedMetrics);

    // CloudWatchメトリクス送信
    this.sendMetricToCloudWatch('MigrationFailed', 1, migrationName);
    this.sendMetricToCloudWatch('MigrationDuration', duration, migrationName);
  }

  /**
   * データベース接続メトリクス記録
   */
  recordDatabaseConnection(success: boolean, connectionTime?: number): void {
    this.sendMetricToCloudWatch('DatabaseConnection', success ? 1 : 0);

    if (connectionTime !== undefined) {
      this.sendMetricToCloudWatch('DatabaseConnectionTime', connectionTime);
    }
  }

  /**
   * スキーマ検証メトリクス記録
   */
  recordSchemaValidation(success: boolean, validationTime?: number): void {
    this.sendMetricToCloudWatch('SchemaValidation', success ? 1 : 0);

    if (validationTime !== undefined) {
      this.sendMetricToCloudWatch('SchemaValidationTime', validationTime);
    }
  }

  /**
   * CloudWatchメトリクス送信
   */
  private async sendMetricToCloudWatch(
    metricName: string,
    value: number,
    migrationName?: string
  ): Promise<void> {
    if (!this.cloudWatchClient) {
      // 開発環境ではローカルログ出力
      console.log(`[METRICS] ${metricName}: ${value}${migrationName ? ` (${migrationName})` : ''}`);
      return;
    }

    try {
      const metricData: MetricDatum = {
        MetricName: metricName,
        Value: value,
        Unit: this.getMetricUnit(metricName),
        Timestamp: new Date(),
        Dimensions: migrationName
          ? [
              {
                Name: 'MigrationName',
                Value: migrationName,
              },
            ]
          : undefined,
      };

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [metricData],
      });

      await this.cloudWatchClient.send(command);
    } catch (error) {
      console.error('CloudWatchメトリクス送信エラー:', error);
    }
  }

  /**
   * メトリクスの単位を決定
   */
  private getMetricUnit(metricName: string): StandardUnit {
    const timeMetrics = ['MigrationDuration', 'DatabaseConnectionTime', 'SchemaValidationTime'];
    const countMetrics = [
      'MigrationStarted',
      'MigrationCompleted',
      'MigrationFailed',
      'TablesAffected',
      'RecordsAffected',
    ];
    const booleanMetrics = ['DatabaseConnection', 'SchemaValidation'];

    if (timeMetrics.includes(metricName)) {
      return StandardUnit.Milliseconds;
    } else if (countMetrics.includes(metricName)) {
      return StandardUnit.Count;
    } else if (booleanMetrics.includes(metricName)) {
      return StandardUnit.None;
    }

    return StandardUnit.None;
  }

  /**
   * 現在のメトリクス取得
   */
  getMetrics(migrationName?: string): MigrationMetrics | MigrationMetrics[] {
    if (migrationName) {
      return this.metrics.get(migrationName) || ({} as MigrationMetrics);
    }

    return Array.from(this.metrics.values());
  }

  /**
   * メトリクスサマリー生成
   */
  generateSummary(): {
    totalMigrations: number;
    completedMigrations: number;
    failedMigrations: number;
    averageDuration: number;
    totalDuration: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const completedMetrics = allMetrics.filter(m => m.status === 'completed' && m.duration);
    const failedMetrics = allMetrics.filter(m => m.status === 'failed');

    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration =
      completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0;

    return {
      totalMigrations: allMetrics.length,
      completedMigrations: completedMetrics.length,
      failedMigrations: failedMetrics.length,
      averageDuration: Math.round(averageDuration),
      totalDuration,
    };
  }

  /**
   * パフォーマンス分析
   */
  analyzePerformance(): {
    slowMigrations: MigrationMetrics[];
    fastMigrations: MigrationMetrics[];
    recommendations: string[];
  } {
    const completedMetrics = Array.from(this.metrics.values()).filter(
      m => m.status === 'completed' && m.duration
    );

    const slowThreshold = 30000; // 30秒
    const fastThreshold = 5000; // 5秒

    const slowMigrations = completedMetrics.filter(m => (m.duration || 0) > slowThreshold);
    const fastMigrations = completedMetrics.filter(m => (m.duration || 0) < fastThreshold);

    const recommendations: string[] = [];

    if (slowMigrations.length > 0) {
      recommendations.push(
        '遅いマイグレーションが検出されました。インデックス作成の最適化を検討してください。'
      );
    }

    if (completedMetrics.length > 10) {
      recommendations.push(
        'マイグレーション数が多くなっています。定期的なスキーマ整理を検討してください。'
      );
    }

    return {
      slowMigrations,
      fastMigrations,
      recommendations,
    };
  }

  /**
   * メトリクスクリア
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// シングルトンインスタンス
export const migrationMetrics = new MigrationMetricsCollector();
