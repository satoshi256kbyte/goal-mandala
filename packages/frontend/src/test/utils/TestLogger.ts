/**
 * テストログユーティリティ
 * テスト実行のログとリアルタイム進捗表示を管理するクラス
 */

export interface TestLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  testName: string;
  message: string;
  duration?: number;
  error?: Error;
}

export class TestLogger {
  private logs: TestLogEntry[] = [];
  private startTimes: Map<string, number> = new Map();
  private testCounts = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  /**
   * テスト開始をログ
   */
  logTestStart(testName: string): void {
    const timestamp = Date.now();
    this.startTimes.set(testName, timestamp);
    this.testCounts.total++;

    const entry: TestLogEntry = {
      timestamp: new Date(timestamp),
      level: 'info',
      testName,
      message: `Starting test: ${testName}`,
    };

    this.logs.push(entry);
    this.printLog(entry);
  }

  /**
   * テスト終了をログ
   */
  logTestEnd(testName: string, status: 'passed' | 'failed' | 'skipped'): void {
    const startTime = this.startTimes.get(testName);
    const endTime = Date.now();
    const duration = startTime ? endTime - startTime : 0;

    this.startTimes.delete(testName);

    // カウントを更新
    if (status === 'passed') {
      this.testCounts.passed++;
    } else if (status === 'failed') {
      this.testCounts.failed++;
    } else if (status === 'skipped') {
      this.testCounts.skipped++;
    }

    const entry: TestLogEntry = {
      timestamp: new Date(endTime),
      level: status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'warn',
      testName,
      message: `Test ${status}: ${testName}`,
      duration,
    };

    this.logs.push(entry);
    this.printLog(entry);
    this.printProgress();
  }

  /**
   * エラーをログ
   */
  logError(testName: string, error: Error): void {
    const entry: TestLogEntry = {
      timestamp: new Date(),
      level: 'error',
      testName,
      message: `Test error: ${testName}`,
      error,
    };

    this.logs.push(entry);
    this.printLog(entry);
    this.printErrorDetails(error);
  }

  /**
   * 情報メッセージをログ
   */
  logInfo(testName: string, message: string): void {
    const entry: TestLogEntry = {
      timestamp: new Date(),
      level: 'info',
      testName,
      message,
    };

    this.logs.push(entry);
    this.printLog(entry);
  }

  /**
   * 警告メッセージをログ
   */
  logWarn(testName: string, message: string): void {
    const entry: TestLogEntry = {
      timestamp: new Date(),
      level: 'warn',
      testName,
      message,
    };

    this.logs.push(entry);
    this.printLog(entry);
  }

  /**
   * ログエントリーをコンソールに出力
   */
  private printLog(entry: TestLogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = this.getColoredLevel(entry.level);
    const duration = entry.duration ? ` (${entry.duration}ms)` : '';

    console.log(`[${timestamp}] ${level} ${entry.message}${duration}`);
  }

  /**
   * エラー詳細を出力
   */
  private printErrorDetails(error: Error): void {
    console.error('Error details:');
    console.error(`  Message: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack}`);
    }
  }

  /**
   * リアルタイム進捗を表示
   */
  private printProgress(): void {
    const { total, passed, failed, skipped } = this.testCounts;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('Test Progress:');
    console.log(`  Total:   ${total}`);
    console.log(`  Passed:  ${this.colorize(passed.toString(), 'green')} (${successRate}%)`);
    console.log(`  Failed:  ${this.colorize(failed.toString(), 'red')}`);
    console.log(`  Skipped: ${this.colorize(skipped.toString(), 'yellow')}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * 最終サマリーを表示
   */
  printSummary(): void {
    const { total, passed, failed, skipped } = this.testCounts;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('Test Summary:');
    console.log('='.repeat(60));
    console.log(`Total Tests:    ${total}`);
    console.log(`Passed:         ${this.colorize(passed.toString(), 'green')}`);
    console.log(`Failed:         ${this.colorize(failed.toString(), 'red')}`);
    console.log(`Skipped:        ${this.colorize(skipped.toString(), 'yellow')}`);
    console.log(
      `Success Rate:   ${this.colorize(`${successRate}%`, passed === total ? 'green' : 'yellow')}`
    );
    console.log('='.repeat(60) + '\n');
  }

  /**
   * レベルに応じた色付き文字列を取得
   */
  private getColoredLevel(level: TestLogEntry['level']): string {
    switch (level) {
      case 'info':
        return this.colorize('[INFO]', 'blue');
      case 'warn':
        return this.colorize('[WARN]', 'yellow');
      case 'error':
        return this.colorize('[ERROR]', 'red');
      case 'success':
        return this.colorize('[SUCCESS]', 'green');
      default:
        return '[LOG]';
    }
  }

  /**
   * 文字列に色を付ける（ANSIカラーコード）
   */
  private colorize(text: string, color: 'red' | 'green' | 'yellow' | 'blue'): string {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
    };
    const reset = '\x1b[0m';
    return `${colors[color]}${text}${reset}`;
  }

  /**
   * すべてのログを取得
   */
  getLogs(): TestLogEntry[] {
    return [...this.logs];
  }

  /**
   * テストカウントを取得
   */
  getTestCounts() {
    return { ...this.testCounts };
  }

  /**
   * ログをクリア
   */
  clear(): void {
    this.logs = [];
    this.startTimes.clear();
    this.testCounts = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * ログをファイルに出力（オプション）
   */
  exportLogs(filePath?: string): string {
    const logText = this.logs
      .map(entry => {
        const timestamp = entry.timestamp.toISOString();
        const duration = entry.duration ? ` (${entry.duration}ms)` : '';
        let text = `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${duration}`;

        if (entry.error) {
          text += `\n  Error: ${entry.error.message}`;
          if (entry.error.stack) {
            text += `\n  Stack: ${entry.error.stack}`;
          }
        }

        return text;
      })
      .join('\n');

    if (filePath) {
      // Node.js環境でのみファイル出力
      try {
        const fs = require('fs');
        fs.writeFileSync(filePath, logText, 'utf-8');
        console.log(`Logs exported to: ${filePath}`);
      } catch (error) {
        console.error('Failed to export logs:', error);
      }
    }

    return logText;
  }
}

// シングルトンインスタンスをエクスポート
export const testLogger = new TestLogger();
