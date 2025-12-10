/**
 * Performance Testing Utility
 *
 * Provides utilities for load testing, latency measurement, and throughput testing
 *
 * Requirements: 12.4, 12.5
 * - Measure execution time and performance metrics
 * - Detect performance degradation
 */

import { PERFORMANCE_MONITORING_CONFIG } from '../performance-config';
import { getConnectionPoolStats } from './connection-pool-manager';
import { getAllCacheStats } from './cache-manager';

/**
 * Performance test result
 */
export interface PerformanceTestResult {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metrics: {
    executionTime: number;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    customMetrics?: Record<string, number>;
  };
}

/**
 * Load test result
 */
export interface LoadTestResult {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  duration: number;
  errors: Array<{ message: string; count: number }>;
}

/**
 * Performance Test Runner
 */
export class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  /**
   * Run a performance test
   *
   * @param testName - Name of the test
   * @param testFn - Test function to execute
   * @returns Performance test result
   */
  public async runTest(
    testName: string,
    testFn: () => Promise<void>
  ): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    let success = true;
    let error: string | undefined;

    try {
      await testFn();
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;

    const result: PerformanceTestResult = {
      testName,
      startTime,
      endTime,
      duration,
      success,
      error,
      metrics: {
        executionTime: duration,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external,
          rss: endMemory.rss,
        },
      },
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run a load test
   *
   * @param testName - Name of the test
   * @param testFn - Test function to execute
   * @param options - Load test options
   * @returns Load test result
   */
  public async runLoadTest(
    testName: string,
    testFn: () => Promise<void>,
    options: {
      concurrency: number;
      totalRequests: number;
      rampUpTime?: number;
    }
  ): Promise<LoadTestResult> {
    const { concurrency, totalRequests, rampUpTime = 0 } = options;

    const latencies: number[] = [];
    const errors: Map<string, number> = new Map();
    let successfulRequests = 0;
    let failedRequests = 0;

    const startTime = Date.now();

    // Calculate requests per batch
    const batchSize = Math.ceil(totalRequests / concurrency);
    const batches: Promise<void>[][] = [];

    for (let i = 0; i < concurrency; i++) {
      const batch: Promise<void>[] = [];

      for (let j = 0; j < batchSize && i * batchSize + j < totalRequests; j++) {
        const requestPromise = (async () => {
          const requestStart = Date.now();

          try {
            await testFn();
            successfulRequests++;
          } catch (err) {
            failedRequests++;
            const errorMessage = err instanceof Error ? err.message : String(err);
            errors.set(errorMessage, (errors.get(errorMessage) || 0) + 1);
          }

          const requestEnd = Date.now();
          latencies.push(requestEnd - requestStart);
        })();

        batch.push(requestPromise);
      }

      batches.push(batch);

      // Ramp up delay
      if (rampUpTime > 0 && i < concurrency - 1) {
        await new Promise(resolve => setTimeout(resolve, rampUpTime / concurrency));
      }
    }

    // Execute all batches concurrently
    await Promise.all(batches.map(batch => Promise.all(batch)));

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate statistics
    latencies.sort((a, b) => a - b);
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const minLatency = latencies[0] || 0;
    const maxLatency = latencies[latencies.length - 1] || 0;
    const p50Latency = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const throughput = (successfulRequests / duration) * 1000; // requests per second

    return {
      testName,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageLatency,
      minLatency,
      maxLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      throughput,
      duration,
      errors: Array.from(errors.entries()).map(([message, count]) => ({ message, count })),
    };
  }

  /**
   * Measure latency of a function
   *
   * @param fn - Function to measure
   * @returns Latency in milliseconds
   */
  public async measureLatency(fn: () => Promise<void>): Promise<number> {
    const start = Date.now();
    await fn();
    const end = Date.now();
    return end - start;
  }

  /**
   * Measure throughput of a function
   *
   * @param fn - Function to measure
   * @param duration - Duration to measure in milliseconds
   * @returns Throughput (operations per second)
   */
  public async measureThroughput(fn: () => Promise<void>, duration: number): Promise<number> {
    const startTime = Date.now();
    let operationCount = 0;

    while (Date.now() - startTime < duration) {
      await fn();
      operationCount++;
    }

    const actualDuration = Date.now() - startTime;
    return (operationCount / actualDuration) * 1000;
  }

  /**
   * Get all test results
   *
   * @returns Array of test results
   */
  public getResults(): PerformanceTestResult[] {
    return this.results;
  }

  /**
   * Clear all test results
   */
  public clearResults(): void {
    this.results = [];
  }

  /**
   * Generate performance report
   *
   * @returns Performance report
   */
  public generateReport(): {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageDuration: number;
    totalDuration: number;
    slowestTest: PerformanceTestResult | null;
    fastestTest: PerformanceTestResult | null;
  } {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    const sortedByDuration = [...this.results].sort((a, b) => b.duration - a.duration);
    const slowestTest = sortedByDuration[0] || null;
    const fastestTest = sortedByDuration[sortedByDuration.length - 1] || null;

    return {
      totalTests,
      successfulTests,
      failedTests,
      averageDuration,
      totalDuration,
      slowestTest,
      fastestTest,
    };
  }
}

/**
 * Performance Monitor
 *
 * Monitors performance metrics and detects degradation
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private warnings: Array<{ timestamp: number; message: string }> = [];

  /**
   * Record a metric
   *
   * @param metricName - Name of the metric
   * @param value - Metric value
   */
  public recordMetric(metricName: string, value: number): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    this.metrics.get(metricName)!.push(value);

    // Check thresholds
    this.checkThresholds(metricName, value);
  }

  /**
   * Check if metric exceeds threshold
   *
   * @param metricName - Name of the metric
   * @param value - Metric value
   */
  private checkThresholds(metricName: string, value: number): void {
    const config = PERFORMANCE_MONITORING_CONFIG;

    if (!config.enabled) {
      return;
    }

    const thresholds = config.thresholds;
    let threshold: number | undefined;
    let message: string | undefined;

    switch (metricName) {
      case 'workflowExecutionTime':
        threshold = thresholds.workflowExecutionTime;
        message = `Workflow execution time (${value}ms) exceeds threshold (${threshold}ms)`;
        break;
      case 'actionProcessingTime':
        threshold = thresholds.actionProcessingTime;
        message = `Action processing time (${value}ms) exceeds threshold (${threshold}ms)`;
        break;
      case 'databaseQueryTime':
        threshold = thresholds.databaseQueryTime;
        message = `Database query time (${value}ms) exceeds threshold (${threshold}ms)`;
        break;
      case 'aiAPILatency':
        threshold = thresholds.aiAPILatency;
        message = `AI API latency (${value}ms) exceeds threshold (${threshold}ms)`;
        break;
      case 'coldStartTime':
        threshold = thresholds.coldStartTime;
        message = `Lambda cold start time (${value}ms) exceeds threshold (${threshold}ms)`;
        break;
      case 'memoryUsagePercentage':
        threshold = thresholds.memoryUsagePercentage;
        message = `Memory usage (${value}%) exceeds threshold (${threshold}%)`;
        break;
    }

    if (threshold !== undefined && value > threshold && message) {
      this.warnings.push({
        timestamp: Date.now(),
        message,
      });

      // Log warning
      console.warn(`[Performance Warning] ${message}`);

      // Generate optimization suggestions
      if (config.suggestions.enabled) {
        this.generateSuggestions(metricName, value, threshold);
      }
    }
  }

  /**
   * Generate optimization suggestions
   *
   * @param metricName - Name of the metric
   * @param value - Metric value (currently unused, reserved for future threshold-based suggestions)
   * @param threshold - Threshold value (currently unused, reserved for future threshold-based suggestions)
   */
  private generateSuggestions(metricName: string, value: number, threshold: number): void {
    // Note: value and threshold parameters are reserved for future use
    // when implementing threshold-based suggestion logic
    void value;
    void threshold;

    const config = PERFORMANCE_MONITORING_CONFIG.suggestions;
    const suggestions: string[] = [];

    switch (metricName) {
      case 'workflowExecutionTime':
        if (config.types.increaseConcurrency) {
          suggestions.push('Consider increasing batch concurrency to reduce execution time');
        }
        if (config.types.enableCaching) {
          suggestions.push('Enable caching for goal and action contexts');
        }
        break;
      case 'actionProcessingTime':
        if (config.types.increaseLambdaMemory) {
          suggestions.push('Consider increasing Lambda memory allocation');
        }
        if (config.types.optimizeConnectionPooling) {
          suggestions.push('Optimize connection pooling settings');
        }
        break;
      case 'databaseQueryTime':
        if (config.types.enableCaching) {
          suggestions.push('Enable database query result caching');
        }
        if (config.types.optimizeConnectionPooling) {
          suggestions.push('Increase database connection pool size');
        }
        break;
      case 'aiAPILatency':
        if (config.types.optimizeConnectionPooling) {
          suggestions.push('Enable HTTP connection pooling for AI API calls');
        }
        break;
      case 'memoryUsagePercentage':
        if (config.types.increaseLambdaMemory) {
          suggestions.push('Increase Lambda memory allocation');
        }
        if (config.types.adjustBatchSize) {
          suggestions.push('Reduce batch size to lower memory usage');
        }
        break;
    }

    for (const suggestion of suggestions) {
      console.info(`[Performance Suggestion] ${suggestion}`);
    }
  }

  /**
   * Get metric statistics
   *
   * @param metricName - Name of the metric
   * @returns Metric statistics
   */
  public getMetricStats(metricName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(metricName);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const average = sorted.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p50 = sorted[Math.floor(count * 0.5)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, average, min, max, p50, p95, p99 };
  }

  /**
   * Get all warnings
   *
   * @returns Array of warnings
   */
  public getWarnings(): Array<{ timestamp: number; message: string }> {
    return this.warnings;
  }

  /**
   * Clear all metrics and warnings
   */
  public clear(): void {
    this.metrics.clear();
    this.warnings = [];
  }

  /**
   * Generate performance summary
   *
   * @returns Performance summary
   */
  public generateSummary(): {
    metrics: Record<string, ReturnType<PerformanceMonitor['getMetricStats']>>;
    warnings: Array<{ timestamp: number; message: string }>;
    connectionPools: ReturnType<typeof getConnectionPoolStats>;
    caches: ReturnType<typeof getAllCacheStats>;
  } {
    const metricNames = Array.from(this.metrics.keys());
    const metricsStats: Record<string, ReturnType<PerformanceMonitor['getMetricStats']>> = {};

    for (const metricName of metricNames) {
      metricsStats[metricName] = this.getMetricStats(metricName);
    }

    return {
      metrics: metricsStats,
      warnings: this.warnings,
      connectionPools: getConnectionPoolStats(),
      caches: getAllCacheStats(),
    };
  }
}

/**
 * Create a new performance tester instance
 *
 * @returns Performance tester
 */
export function createPerformanceTester(): PerformanceTester {
  return new PerformanceTester();
}

/**
 * Create a new performance monitor instance
 *
 * @returns Performance monitor
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
}
