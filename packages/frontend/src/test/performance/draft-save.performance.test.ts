import { vi } from 'vitest';
import { DraftService, draftUtils } from '../../services/draftService';
import { PartialGoalFormData } from '../../schemas/goal-form';

// LocalStorageのモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('下書き保存機能 パフォーマンステスト', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('DraftService パフォーマンス', () => {
    it('小さなデータの保存が高速である', async () => {
      const smallData: PartialGoalFormData = {
        title: 'テスト',
        description: 'テスト説明',
      };

      const startTime = Date.now();
      await DraftService.saveDraft(smallData);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10); // 10ms未満
    });

    it('大きなデータの保存が許容範囲内である', async () => {
      const largeData: PartialGoalFormData = {
        title: 'あ'.repeat(100),
        description: 'い'.repeat(1000),
        background: 'う'.repeat(500),
        constraints: 'え'.repeat(500),
        deadline: '2024-12-31',
      };

      const startTime = Date.now();
      await DraftService.saveDraft(largeData);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // 50ms未満
    });

    it('読み込みが高速である', async () => {
      const testData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      await DraftService.saveDraft(testData);

      const startTime = Date.now();
      const loadedData = await DraftService.loadDraft();
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10); // 10ms未満
      expect(loadedData).not.toBeNull();
    });

    it('連続保存が効率的である', async () => {
      const testData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await DraftService.saveDraft({
          ...testData,
          title: `テスト目標 ${i}`,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(5); // 平均5ms未満
    });
  });

  describe('draftUtils パフォーマンス', () => {
    it('isWorthSavingが高速である', () => {
      const testData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        draftUtils.isWorthSaving(testData);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(0.01); // 平均0.01ms未満
    });

    it('getDraftSummaryが高速である', () => {
      const testData: PartialGoalFormData = {
        title: 'あ'.repeat(100),
        description: 'い'.repeat(1000),
      };

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        draftUtils.getDraftSummary(testData);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(0.01); // 平均0.01ms未満
    });

    it('getTimeSinceSaveが高速である', () => {
      const testDate = new Date();

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        draftUtils.getTimeSinceSave(testDate);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(0.01); // 平均0.01ms未満
    });
  });

  describe('メモリ使用量', () => {
    it('大量の保存操作でメモリリークが発生しない', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const testData: PartialGoalFormData = {
        title: 'メモリテスト',
        description: 'メモリリークテスト用のデータ',
      };

      // 大量の保存操作
      for (let i = 0; i < 1000; i++) {
        await DraftService.saveDraft({
          ...testData,
          title: `メモリテスト ${i}`,
        });
      }

      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が1MB未満であることを確認
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });

    it('JSON.parseとJSON.stringifyが効率的である', () => {
      const largeData: PartialGoalFormData = {
        title: 'あ'.repeat(100),
        description: 'い'.repeat(1000),
        background: 'う'.repeat(500),
        constraints: 'え'.repeat(500),
        deadline: '2024-12-31',
      };

      const draftData = {
        formData: largeData,
        savedAt: new Date().toISOString(),
        version: 1,
      };

      const iterations = 1000;

      // JSON.stringify のパフォーマンス
      const stringifyStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(draftData);
      }
      const stringifyEndTime = Date.now();
      const stringifyDuration = stringifyEndTime - stringifyStartTime;

      expect(stringifyDuration / iterations).toBeLessThan(1); // 平均1ms未満

      // JSON.parse のパフォーマンス
      const serializedData = JSON.stringify(draftData);
      const parseStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(serializedData);
      }
      const parseEndTime = Date.now();
      const parseDuration = parseEndTime - parseStartTime;

      expect(parseDuration / iterations).toBeLessThan(1); // 平均1ms未満
    });
  });

  describe('LocalStorage パフォーマンス', () => {
    it('LocalStorageの読み書きが効率的である', () => {
      const testKey = 'performance-test';
      const testValue = JSON.stringify({
        formData: {
          title: 'パフォーマンステスト',
          description: 'LocalStorageのパフォーマンステスト',
        },
        savedAt: new Date().toISOString(),
        version: 1,
      });

      const iterations = 1000;

      // 書き込みパフォーマンス
      const writeStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        mockLocalStorage.setItem(`${testKey}-${i}`, testValue);
      }
      const writeEndTime = Date.now();
      const writeDuration = writeEndTime - writeStartTime;

      expect(writeDuration / iterations).toBeLessThan(0.1); // 平均0.1ms未満

      // 読み込みパフォーマンス
      const readStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        mockLocalStorage.getItem(`${testKey}-${i}`);
      }
      const readEndTime = Date.now();
      const readDuration = readEndTime - readStartTime;

      expect(readDuration / iterations).toBeLessThan(0.1); // 平均0.1ms未満
    });

    it('大きなデータの保存が許容範囲内である', () => {
      const largeValue = JSON.stringify({
        formData: {
          title: 'あ'.repeat(1000),
          description: 'い'.repeat(10000),
          background: 'う'.repeat(5000),
          constraints: 'え'.repeat(5000),
        },
        savedAt: new Date().toISOString(),
        version: 1,
      });

      const startTime = Date.now();
      mockLocalStorage.setItem('large-data-test', largeValue);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10); // 10ms未満
    });
  });

  describe('並行処理パフォーマンス', () => {
    it('並行保存が効率的に処理される', async () => {
      const testData: PartialGoalFormData = {
        title: '並行テスト',
        description: '並行処理テスト用のデータ',
      };

      const concurrentOperations = 10;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentOperations }, (_, i) =>
        DraftService.saveDraft({
          ...testData,
          title: `並行テスト ${i}`,
        })
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 並行処理が逐次処理より高速であることを確認
      expect(duration).toBeLessThan(concurrentOperations * 10); // 各操作10ms未満
    });
  });
});
