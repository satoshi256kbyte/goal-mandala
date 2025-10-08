/**
 * テストユーティリティ関数
 * テストで使用する汎用的なユーティリティ関数
 */

/**
 * オブジェクトのディープコピーを作成
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 配列をシャッフル
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * ランダムな文字列を生成
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * ランダムな整数を生成
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 未来の日付を生成
 */
export function futureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

/**
 * 過去の日付を生成
 */
export function pastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * ISO 8601形式の日付文字列を生成
 */
export function isoDateString(date: Date): string {
  return date.toISOString();
}

/**
 * モックタイマーのセットアップ
 */
export function setupMockTimers(): void {
  jest.useFakeTimers();
}

/**
 * モックタイマーのクリーンアップ
 */
export function cleanupMockTimers(): void {
  jest.useRealTimers();
}

/**
 * 非同期関数のタイムアウト付き実行
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
}

/**
 * エラーがスローされることを検証
 */
export async function expectToThrow(
  fn: () => Promise<unknown>,
  errorClass?: new (...args: unknown[]) => Error,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (errorClass) {
      expect(error).toBeInstanceOf(errorClass);
    }
    if (errorMessage) {
      expect((error as Error).message).toContain(errorMessage);
    }
  }
}

/**
 * オブジェクトの部分一致を検証
 */
export function expectPartialMatch<T extends object>(actual: T, expected: Partial<T>): void {
  Object.keys(expected).forEach(key => {
    expect(actual[key as keyof T]).toEqual(expected[key as keyof T]);
  });
}

/**
 * 配列の要素数を検証
 */
export function expectArrayLength<T>(array: T[], expectedLength: number): void {
  expect(array).toHaveLength(expectedLength);
}

/**
 * 配列の各要素が条件を満たすことを検証
 */
export function expectArrayEvery<T>(array: T[], predicate: (item: T) => boolean): void {
  expect(array.every(predicate)).toBe(true);
}

/**
 * 配列の少なくとも1つの要素が条件を満たすことを検証
 */
export function expectArraySome<T>(array: T[], predicate: (item: T) => boolean): void {
  expect(array.some(predicate)).toBe(true);
}

/**
 * 文字列が特定のパターンにマッチすることを検証
 */
export function expectStringMatch(actual: string, pattern: RegExp): void {
  expect(actual).toMatch(pattern);
}

/**
 * 数値が範囲内にあることを検証
 */
export function expectNumberInRange(actual: number, min: number, max: number): void {
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

/**
 * 日付が範囲内にあることを検証
 */
export function expectDateInRange(actual: Date, min: Date, max: Date): void {
  expect(actual.getTime()).toBeGreaterThanOrEqual(min.getTime());
  expect(actual.getTime()).toBeLessThanOrEqual(max.getTime());
}

/**
 * オブジェクトが特定のプロパティを持つことを検証
 */
export function expectHasProperties<T extends object>(obj: T, properties: (keyof T)[]): void {
  properties.forEach(prop => {
    expect(obj).toHaveProperty(String(prop));
  });
}

/**
 * 関数が特定の回数呼ばれたことを検証
 */
export function expectCalledTimes(mockFn: jest.Mock, expectedTimes: number): void {
  expect(mockFn).toHaveBeenCalledTimes(expectedTimes);
}

/**
 * 関数が特定の引数で呼ばれたことを検証
 */
export function expectCalledWith(mockFn: jest.Mock, ...expectedArgs: unknown[]): void {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
}

/**
 * モック関数のリセット
 */
export function resetMock(mockFn: jest.Mock): void {
  mockFn.mockReset();
}

/**
 * 複数のモック関数のリセット
 */
export function resetMocks(...mockFns: jest.Mock[]): void {
  mockFns.forEach(fn => fn.mockReset());
}

/**
 * コンソール出力のモック
 */
export function mockConsole(): {
  log: jest.SpyInstance;
  error: jest.SpyInstance;
  warn: jest.SpyInstance;
  info: jest.SpyInstance;
} {
  return {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
  };
}

/**
 * コンソール出力のモックをリストア
 */
export function restoreConsole(mocks: {
  log: jest.SpyInstance;
  error: jest.SpyInstance;
  warn: jest.SpyInstance;
  info: jest.SpyInstance;
}): void {
  mocks.log.mockRestore();
  mocks.error.mockRestore();
  mocks.warn.mockRestore();
  mocks.info.mockRestore();
}

/**
 * テスト用のPromiseを作成（resolve/rejectを外部から制御可能）
 */
export function createControllablePromise<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * 非同期処理の完了を待つ
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * テストデータのクリーンアップ
 */
export function cleanupTestData(): void {
  // テスト後のクリーンアップ処理
  jest.clearAllMocks();
  jest.restoreAllMocks();
}
