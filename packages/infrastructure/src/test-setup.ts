/**
 * Jest テストセットアップファイル
 * 全てのテストファイルで共通して使用される設定を記述
 */

// AWS CDK のテスト用設定
process.env.CDK_DEFAULT_REGION = 'ap-northeast-1';
process.env.CDK_DEFAULT_ACCOUNT = '123456789012';

// ログレベルを設定（テスト時は警告以上のみ表示）
process.env.LOG_LEVEL = 'warn';

// タイムゾーンを設定
process.env.TZ = 'Asia/Tokyo';

// AWS SDK のモック設定は不要（CDK v2では@aws-sdk/client-*を使用）
// 必要に応じて個別のクライアントをモック

// CDK の警告を抑制
const originalConsoleWarn = console.warn;
console.warn = (message: unknown, ...args: unknown[]) => {
  // CDK の特定の警告メッセージを抑制
  if (
    typeof message === 'string' &&
    (message.includes('AWS CDK') ||
      message.includes('deprecated') ||
      message.includes('feature flag'))
  ) {
    return;
  }
  originalConsoleWarn(message, ...args);
};

// テスト用のグローバル設定
beforeEach(() => {
  // 各テスト前にモックをクリア
  jest.clearAllMocks();
});

// テスト用のヘルパー関数
afterEach(() => {
  // 各テスト後のクリーンアップ
  jest.restoreAllMocks();
});

// 非同期テストのタイムアウト設定
jest.setTimeout(30000);

// CDK テスト用のカスタムマッチャー
expect.extend({
  toHaveResourceProperties(
    received: unknown,
    resourceType: string,
    properties: Record<string, unknown>
  ) {
    try {
      const template = received as unknown as {
        hasResourceProperties: (resourceType: string, properties: Record<string, unknown>) => void;
      };
      template.hasResourceProperties(resourceType, properties);
      return {
        message: () => `Expected template to have resource ${resourceType} with properties`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () =>
          `Expected template to have resource ${resourceType} with properties: ${error}`,
        pass: false,
      };
    }
  },
});

// TypeScript の型定義を拡張
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveResourceProperties(resourceType: string, properties: Record<string, unknown>): R;
    }
  }
}

export {};
