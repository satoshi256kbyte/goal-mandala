import React from 'react';

/**
 * パフォーマンス監視ユーティリティ
 */

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  /** レンダリング時間 */
  renderTime: number;
  /** メモリ使用量 */
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  } | null;
  /** FPS */
  fps: number;
  /** ネットワーク情報 */
  network: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null;
  /** バッテリー情報 */
  battery: {
    level: number;
    charging: boolean;
  } | null;
}

/**
 * パフォーマンス監視クラス
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: Map<string, PerformanceObserver> = new Map();
  private metrics: Map<string, number[]> = new Map();
  private isMonitoring = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 監視開始
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // レンダリング性能の監視
    this.observeRenderPerformance();

    // メモリ使用量の監視
    this.observeMemoryUsage();

    // FPSの監視
    this.observeFPS();

    // ネットワーク性能の監視
    this.observeNetworkPerformance();

    console.log('Performance monitoring started');
  }

  /**
   * 監視停止
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // すべてのオブザーバーを停止
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    console.log('Performance monitoring stopped');
  }

  /**
   * レンダリング性能の監視
   */
  private observeRenderPerformance(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            this.addMetric('render', entry.duration);
          }
        });
      });

      observer.observe({ entryTypes: ['measure'] });
      this.observers.set('render', observer);
    } catch (error) {
      console.warn('Failed to observe render performance:', error);
    }
  }

  /**
   * メモリ使用量の監視
   */
  private observeMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      if (!this.isMonitoring) return;

      const memory = (performance as any).memory;
      this.addMetric('memory_used', memory.usedJSHeapSize);
      this.addMetric('memory_total', memory.totalJSHeapSize);
      this.addMetric('memory_limit', memory.jsHeapSizeLimit);

      setTimeout(checkMemory, 5000); // 5秒ごと
    };

    checkMemory();
  }

  /**
   * FPSの監視
   */
  private observeFPS(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = (currentTime: number) => {
      if (!this.isMonitoring) return;

      frameCount++;
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        // 1秒ごと
        const fps = Math.round((frameCount * 1000) / elapsed);
        this.addMetric('fps', fps);

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * ネットワーク性能の監視
   */
  private observeNetworkPerformance(): void {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (!connection) return;

    const checkNetwork = () => {
      if (!this.isMonitoring) return;

      this.addMetric('network_downlink', connection.downlink);
      this.addMetric('network_rtt', connection.rtt);

      setTimeout(checkNetwork, 10000); // 10秒ごと
    };

    checkNetwork();

    // ネットワーク状態変化の監視
    connection.addEventListener('change', checkNetwork);
  }

  /**
   * メトリクスの追加
   */
  private addMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name);
    if (!values) {
      throw new Error(`メトリクス配列が見つかりません: ${name}`);
    }
    values.push(value);

    // 最新の100件のみ保持
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * 現在のメトリクスを取得
   */
  getCurrentMetrics(): PerformanceMetrics {
    const getLatestMetric = (name: string): number => {
      const values = this.metrics.get(name);
      return values && values.length > 0 ? values[values.length - 1] : 0;
    };

    const getMemoryUsage = () => {
      if (!('memory' in performance)) return null;

      return {
        used: getLatestMetric('memory_used'),
        total: getLatestMetric('memory_total'),
        limit: getLatestMetric('memory_limit'),
      };
    };

    const getNetworkInfo = () => {
      if (!('connection' in navigator)) return null;

      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: getLatestMetric('network_downlink'),
        rtt: getLatestMetric('network_rtt'),
      };
    };

    // const getBatteryInfo = async () => { // 将来使用予定
    //   if (!('getBattery' in navigator)) return null;
    //   try {
    //     const battery = await (navigator as any).getBattery();
    //     return {
    //       level: battery.level,
    //       charging: battery.charging,
    //     };
    //   } catch {
    //     return null;
    //   }
    // };

    return {
      renderTime: getLatestMetric('render'),
      memoryUsage: getMemoryUsage(),
      fps: getLatestMetric('fps'),
      network: getNetworkInfo(),
      battery: null, // 非同期なので別途取得が必要
    };
  }

  /**
   * メトリクスの統計情報を取得
   */
  getMetricStats(name: string) {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * すべてのメトリクス統計を取得
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getMetricStats(name);
    }
    return stats;
  }

  /**
   * パフォーマンス警告のチェック
   */
  checkPerformanceWarnings(): string[] {
    const warnings: string[] = [];
    const metrics = this.getCurrentMetrics();

    // FPS警告
    if (metrics.fps > 0 && metrics.fps < 30) {
      warnings.push(`Low FPS detected: ${metrics.fps}`);
    }

    // メモリ使用量警告
    if (metrics.memoryUsage) {
      const memoryUsagePercent = (metrics.memoryUsage.used / metrics.memoryUsage.limit) * 100;
      if (memoryUsagePercent > 80) {
        warnings.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      }
    }

    // ネットワーク警告
    if (metrics.network) {
      if (metrics.network.effectiveType === 'slow-2g' || metrics.network.effectiveType === '2g') {
        warnings.push(`Slow network detected: ${metrics.network.effectiveType}`);
      }
    }

    return warnings;
  }

  /**
   * パフォーマンスレポートの生成
   */
  generateReport(): string {
    const stats = this.getAllStats();
    const warnings = this.checkPerformanceWarnings();

    let report = '=== Performance Report ===\n\n';

    // 統計情報
    report += 'Metrics:\n';
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat) {
        report += `  ${name}: avg=${stat.avg.toFixed(2)}, p95=${stat.p95.toFixed(2)}, max=${stat.max.toFixed(2)}\n`;
      }
    });

    // 警告
    if (warnings.length > 0) {
      report += '\nWarnings:\n';
      warnings.forEach(warning => {
        report += `  - ${warning}\n`;
      });
    }

    // 推奨事項
    report += '\nRecommendations:\n';
    if (stats.fps && stats.fps.avg < 50) {
      report += '  - Consider optimizing rendering performance\n';
    }
    if (stats.memory_used && stats.memory_used.avg > 50 * 1024 * 1024) {
      report += '  - Consider reducing memory usage\n';
    }

    return report;
  }
}

/**
 * パフォーマンス測定デコレータ
 */
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // const start = performance.now(); // 将来使用予定
      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.finally(() => {
          // const duration = performance.now() - start; // 将来使用予定
          performance.mark(`${name}-end`);
          performance.measure(name, `${name}-start`, `${name}-end`);
        });
      } else {
        // const duration = performance.now() - start; // 将来使用予定
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        return result;
      }
    };

    return descriptor;
  };
}

/**
 * React コンポーネント用パフォーマンス測定フック
 */
export const usePerformanceMonitor = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();

  React.useEffect(() => {
    // const startTime = performance.now(); // 将来使用予定
    performance.mark(`${componentName}-mount-start`);

    return () => {
      // const endTime = performance.now(); // 将来使用予定
      performance.mark(`${componentName}-mount-end`);
      performance.measure(
        `${componentName}-mount`,
        `${componentName}-mount-start`,
        `${componentName}-mount-end`
      );
    };
  }, [componentName]);

  React.useEffect(() => {
    performance.mark(`${componentName}-render`);
    performance.measure(`${componentName}-render-time`);
  });

  return {
    startMeasure: (name: string) => {
      performance.mark(`${componentName}-${name}-start`);
    },
    endMeasure: (name: string) => {
      performance.mark(`${componentName}-${name}-end`);
      performance.measure(
        `${componentName}-${name}`,
        `${componentName}-${name}-start`,
        `${componentName}-${name}-end`
      );
    },
    getCurrentMetrics: () => monitor.getCurrentMetrics(),
  };
};

/**
 * パフォーマンス監視の初期化
 */
export const initializePerformanceMonitoring = () => {
  const monitor = PerformanceMonitor.getInstance();

  // 開発環境でのみ監視を開始
  if (process.env.NODE_ENV === 'development') {
    monitor.startMonitoring();

    // 定期的にレポートを出力
    setInterval(() => {
      const warnings = monitor.checkPerformanceWarnings();
      if (warnings.length > 0) {
        console.warn('Performance warnings:', warnings);
      }
    }, 30000); // 30秒ごと

    // ページ離脱時にレポートを出力
    window.addEventListener('beforeunload', () => {
      console.log(monitor.generateReport());
    });
  }

  return monitor;
};
