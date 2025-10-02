/**
 * パフォーマンステスト設定
 */

/**
 * パフォーマンステストの閾値設定
 */
export const PERFORMANCE_THRESHOLDS = {
  // レンダリング性能（ミリ秒）
  RENDER: {
    SMALL_FORM: 50, // 10フィールド以下
    MEDIUM_FORM: 200, // 50フィールド以下
    LARGE_FORM: 500, // 100フィールド以下
    VIRTUAL_SCROLL_100: 30, // 100アイテム
    VIRTUAL_SCROLL_1000: 100, // 1000アイテム
    VIRTUAL_GRID_64: 30, // 64アイテム（8x8）
    INTEGRATED_PAGE: 200, // 統合ページ
  },

  // メモリ使用量（バイト）
  MEMORY: {
    COMPONENT_INCREASE: 10 * 1024 * 1024, // 10MB
    VIRTUAL_SCROLL_INCREASE: 5 * 1024 * 1024, // 5MB
    TOTAL_USAGE_LIMIT: 100 * 1024 * 1024, // 100MB
  },

  // ネットワーク性能（ミリ秒）
  NETWORK: {
    API_RESPONSE: 2000, // API応答時間
    OPTIMISTIC_UPDATE: 50, // 楽観的更新のUI応答時間
    CACHE_HIT: 10, // キャッシュヒット時間
  },

  // FPS
  FPS: {
    MINIMUM: 30, // 最低FPS
    TARGET: 60, // 目標FPS
  },

  // 下書き保存
  DRAFT_SAVE: {
    DEBOUNCE_EFFICIENCY: 2, // デバウンス効率（最大保存回数）
    DIFF_DETECTION: 10, // 差分検出時間（ミリ秒）
    COMPRESSION_RATIO: 0.7, // 圧縮率（70%以下）
  },
} as const;

/**
 * テスト環境設定
 */
export const TEST_ENVIRONMENT = {
  // テストデータサイズ
  DATA_SIZES: {
    SMALL: 10,
    MEDIUM: 50,
    LARGE: 100,
    EXTRA_LARGE: 1000,
  },

  // 測定回数
  MEASUREMENT_ITERATIONS: 5,

  // タイムアウト設定
  TIMEOUTS: {
    RENDER: 5000,
    NETWORK: 10000,
    ASYNC_OPERATION: 15000,
  },

  // メモリ測定間隔
  MEMORY_CHECK_INTERVAL: 1000,

  // FPS測定期間
  FPS_MEASUREMENT_DURATION: 5000,
} as const;

/**
 * パフォーマンステストのカテゴリ
 */
export enum PerformanceTestCategory {
  RENDERING = 'rendering',
  MEMORY = 'memory',
  NETWORK = 'network',
  USER_INTERACTION = 'user_interaction',
  DATA_PROCESSING = 'data_processing',
}

/**
 * テストケース定義
 */
export interface PerformanceTestCase {
  name: string;
  category: PerformanceTestCategory;
  description: string;
  threshold: number;
  unit: string;
  setup?: () => void;
  teardown?: () => void;
  test: () => Promise<number> | number;
}

/**
 * 標準的なパフォーマンステストケース
 */
export const STANDARD_TEST_CASES: PerformanceTestCase[] = [
  {
    name: 'Small Form Rendering',
    category: PerformanceTestCategory.RENDERING,
    description: '小規模フォーム（10フィールド）のレンダリング性能',
    threshold: PERFORMANCE_THRESHOLDS.RENDER.SMALL_FORM,
    unit: 'ms',
    test: async () => {
      // テスト実装は performance.test.tsx で定義
      return 0;
    },
  },
  {
    name: 'Medium Form Rendering',
    category: PerformanceTestCategory.RENDERING,
    description: '中規模フォーム（50フィールド）のレンダリング性能',
    threshold: PERFORMANCE_THRESHOLDS.RENDER.MEDIUM_FORM,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'Large Form Rendering',
    category: PerformanceTestCategory.RENDERING,
    description: '大規模フォーム（100フィールド）のレンダリング性能',
    threshold: PERFORMANCE_THRESHOLDS.RENDER.LARGE_FORM,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'Virtual Scroll 1000 Items',
    category: PerformanceTestCategory.RENDERING,
    description: '仮想スクロール（1000アイテム）のレンダリング性能',
    threshold: PERFORMANCE_THRESHOLDS.RENDER.VIRTUAL_SCROLL_1000,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'Virtual Grid 64 Items',
    category: PerformanceTestCategory.RENDERING,
    description: '仮想グリッド（64アイテム）のレンダリング性能',
    threshold: PERFORMANCE_THRESHOLDS.RENDER.VIRTUAL_GRID_64,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'Memory Usage - Large Components',
    category: PerformanceTestCategory.MEMORY,
    description: '大量コンポーネントのメモリ使用量',
    threshold: PERFORMANCE_THRESHOLDS.MEMORY.COMPONENT_INCREASE,
    unit: 'bytes',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'API Response Time',
    category: PerformanceTestCategory.NETWORK,
    description: 'API応答時間',
    threshold: PERFORMANCE_THRESHOLDS.NETWORK.API_RESPONSE,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'Optimistic Update Response',
    category: PerformanceTestCategory.USER_INTERACTION,
    description: '楽観的更新のUI応答時間',
    threshold: PERFORMANCE_THRESHOLDS.NETWORK.OPTIMISTIC_UPDATE,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
  {
    name: 'Diff Detection Performance',
    category: PerformanceTestCategory.DATA_PROCESSING,
    description: '差分検出の処理性能',
    threshold: PERFORMANCE_THRESHOLDS.DRAFT_SAVE.DIFF_DETECTION,
    unit: 'ms',
    test: async () => {
      return 0;
    },
  },
];

/**
 * パフォーマンステスト結果
 */
export interface PerformanceTestResult {
  testCase: PerformanceTestCase;
  actualValue: number;
  passed: boolean;
  executionTime: number;
  timestamp: Date;
  environment: {
    userAgent: string;
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
    connection?: {
      effectiveType: string;
      downlink: number;
    };
  };
}

/**
 * パフォーマンステストレポート
 */
export interface PerformanceTestReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    executionTime: number;
  };
  results: PerformanceTestResult[];
  recommendations: string[];
}

/**
 * パフォーマンステストランナー
 */
export class PerformanceTestRunner {
  private results: PerformanceTestResult[] = [];

  async runTest(testCase: PerformanceTestCase): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    try {
      // セットアップ
      if (testCase.setup) {
        testCase.setup();
      }

      // テスト実行
      const actualValue = await testCase.test();
      const passed = actualValue <= testCase.threshold;

      const result: PerformanceTestResult = {
        testCase,
        actualValue,
        passed,
        executionTime: performance.now() - startTime,
        timestamp: new Date(),
        environment: {
          userAgent: navigator.userAgent,
          memory: this.getMemoryInfo(),
          connection: this.getConnectionInfo(),
        },
      };

      this.results.push(result);
      return result;
    } finally {
      // ティアダウン
      if (testCase.teardown) {
        testCase.teardown();
      }
    }
  }

  async runAllTests(
    testCases: PerformanceTestCase[] = STANDARD_TEST_CASES
  ): Promise<PerformanceTestReport> {
    const startTime = performance.now();
    this.results = [];

    for (const testCase of testCases) {
      await this.runTest(testCase);
    }

    const summary = {
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.passed).length,
      failedTests: this.results.filter(r => !r.passed).length,
      executionTime: performance.now() - startTime,
    };

    const recommendations = this.generateRecommendations();

    return {
      summary,
      results: this.results,
      recommendations,
    };
  }

  private getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return undefined;
  }

  private getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
      };
    }
    return undefined;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.results.filter(r => !r.passed);

    if (failedTests.length === 0) {
      recommendations.push('All performance tests passed! 🎉');
      return recommendations;
    }

    // カテゴリ別の推奨事項
    const renderingFailures = failedTests.filter(
      r => r.testCase.category === PerformanceTestCategory.RENDERING
    );
    if (renderingFailures.length > 0) {
      recommendations.push(
        'Consider implementing React.memo and useMemo for rendering optimization'
      );
      recommendations.push('Use virtual scrolling for large lists');
      recommendations.push('Implement code splitting and lazy loading');
    }

    const memoryFailures = failedTests.filter(
      r => r.testCase.category === PerformanceTestCategory.MEMORY
    );
    if (memoryFailures.length > 0) {
      recommendations.push('Optimize memory usage by cleaning up event listeners and timers');
      recommendations.push('Use object pooling for frequently created/destroyed objects');
      recommendations.push('Implement proper cleanup in useEffect hooks');
    }

    const networkFailures = failedTests.filter(
      r => r.testCase.category === PerformanceTestCategory.NETWORK
    );
    if (networkFailures.length > 0) {
      recommendations.push('Implement request caching and deduplication');
      recommendations.push('Use optimistic updates for better user experience');
      recommendations.push('Consider implementing offline support');
    }

    return recommendations;
  }

  exportResults(format: 'json' | 'csv' | 'html' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.results, null, 2);

      case 'csv': {
        const headers = [
          'Test Name',
          'Category',
          'Actual Value',
          'Threshold',
          'Unit',
          'Passed',
          'Execution Time',
        ];
        const rows = this.results.map(r => [
          r.testCase.name,
          r.testCase.category,
          r.actualValue.toString(),
          r.testCase.threshold.toString(),
          r.testCase.unit,
          r.passed.toString(),
          r.executionTime.toFixed(2),
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }

      case 'html':
        return this.generateHTMLReport();

      default:
        return JSON.stringify(this.results, null, 2);
    }
  }

  private generateHTMLReport(): string {
    const passedCount = this.results.filter(r => r.passed).length;
    const failedCount = this.results.length - passedCount;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: green; }
        .failed { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Performance Test Report</h1>

    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${this.results.length}</p>
        <p class="passed">Passed: ${passedCount}</p>
        <p class="failed">Failed: ${failedCount}</p>
        <p>Success Rate: ${((passedCount / this.results.length) * 100).toFixed(1)}%</p>
    </div>

    <h2>Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Category</th>
                <th>Actual Value</th>
                <th>Threshold</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Execution Time (ms)</th>
            </tr>
        </thead>
        <tbody>
            ${this.results
              .map(
                r => `
                <tr class="${r.passed ? 'passed' : 'failed'}">
                    <td>${r.testCase.name}</td>
                    <td>${r.testCase.category}</td>
                    <td>${r.actualValue.toFixed(2)}</td>
                    <td>${r.testCase.threshold}</td>
                    <td>${r.testCase.unit}</td>
                    <td>${r.passed ? 'PASS' : 'FAIL'}</td>
                    <td>${r.executionTime.toFixed(2)}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }
}
