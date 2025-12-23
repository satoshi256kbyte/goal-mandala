import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DraftService, DraftServiceError, draftUtils } from '../draftService';
import type { PartialGoalFormData } from '../../schemas/goal-form';

// localStorageのモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('DraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveDraft', () => {
    it('正常に下書きを保存できる', async () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      await DraftService.saveDraft(formData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'goal-form-draft',
        expect.stringContaining('"title":"テスト目標"')
      );
    });

    it('保存時にバージョン情報を含める', async () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
      };

      await DraftService.saveDraft(formData);

      const savedData = mockLocalStorage.setItem.mock.calls[0][1];
      const parsedData = JSON.parse(savedData);

      expect(parsedData.version).toBe(1);
      expect(parsedData.savedAt).toBeDefined();
    });

    it('保存に失敗した場合、DraftServiceErrorをスローする', async () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      const formData: PartialGoalFormData = {
        title: 'テスト目標',
      };

      await expect(DraftService.saveDraft(formData)).rejects.toThrow(DraftServiceError);
    });
  });

  describe('loadDraft', () => {
    it('正常に下書きを読み込める', async () => {
      const draftData = {
        formData: {
          title: 'テスト目標',
          description: 'テスト説明',
        },
        savedAt: '2025-12-19T10:00:00Z',
        version: 1,
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = await DraftService.loadDraft();

      expect(result).toEqual(draftData);
    });

    it('下書きが存在しない場合、nullを返す', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);

      const result = await DraftService.loadDraft();

      expect(result).toBeNull();
    });

    it('バージョンが古い場合、nullを返して削除する', async () => {
      const oldDraftData = {
        formData: {
          title: 'テスト目標',
        },
        savedAt: '2025-12-19T10:00:00Z',
        version: 0, // 古いバージョン
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(oldDraftData));

      const result = await DraftService.loadDraft();

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });

    it('破損したデータの場合、nullを返して削除する', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json');

      const result = await DraftService.loadDraft();

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });
  });

  describe('clearDraft', () => {
    it('正常に下書きを削除できる', async () => {
      await DraftService.clearDraft();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });

    it('削除に失敗した場合、DraftServiceErrorをスローする', async () => {
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Failed to remove');
      });

      await expect(DraftService.clearDraft()).rejects.toThrow(DraftServiceError);
    });
  });

  describe('hasDraft', () => {
    it('下書きが存在する場合、trueを返す', async () => {
      const draftData = {
        formData: {
          title: 'テスト目標',
        },
        savedAt: '2025-12-19T10:00:00Z',
        version: 1,
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = await DraftService.hasDraft();

      expect(result).toBe(true);
    });

    it('下書きが存在しない場合、falseを返す', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);

      const result = await DraftService.hasDraft();

      expect(result).toBe(false);
    });

    it('エラーが発生した場合、falseを返す', async () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = await DraftService.hasDraft();

      expect(result).toBe(false);
    });
  });

  describe('isDraftEmpty', () => {
    it('全てのフィールドが空の場合、trueを返す', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      const result = DraftService.isDraftEmpty(formData);

      expect(result).toBe(true);
    });

    it('1つでもフィールドに値がある場合、falseを返す', () => {
      const formData: PartialGoalFormData = {
        title: 'テスト',
        description: '',
      };

      const result = DraftService.isDraftEmpty(formData);

      expect(result).toBe(false);
    });

    it('空白のみのフィールドは空とみなす', () => {
      const formData: PartialGoalFormData = {
        title: '   ',
        description: '',
      };

      const result = DraftService.isDraftEmpty(formData);

      expect(result).toBe(true);
    });
  });

  describe('getDraftSavedAt', () => {
    it('下書きの保存日時を取得できる', async () => {
      const savedAt = '2025-12-19T10:00:00Z';
      const draftData = {
        formData: {
          title: 'テスト目標',
        },
        savedAt,
        version: 1,
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = await DraftService.getDraftSavedAt();

      expect(result).toEqual(new Date(savedAt));
    });

    it('下書きが存在しない場合、nullを返す', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);

      const result = await DraftService.getDraftSavedAt();

      expect(result).toBeNull();
    });
  });

  describe('isStorageAvailable', () => {
    it('localStorageが利用可能な場合、trueを返す', () => {
      const result = DraftService.isStorageAvailable();

      expect(result).toBe(true);
    });

    it('localStorageが利用不可の場合、falseを返す', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage not available');
      });

      const result = DraftService.isStorageAvailable();

      expect(result).toBe(false);
    });
  });
});

describe('draftUtils', () => {
  describe('isWorthSaving', () => {
    it('タイトルがある場合、trueを返す', () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
      };

      const result = draftUtils.isWorthSaving(formData);

      expect(result).toBe(true);
    });

    it('説明がある場合、trueを返す', () => {
      const formData: PartialGoalFormData = {
        description: 'テスト説明',
      };

      const result = draftUtils.isWorthSaving(formData);

      expect(result).toBe(true);
    });

    it('全てのフィールドが空の場合、falseを返す', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      const result = draftUtils.isWorthSaving(formData);

      expect(result).toBeFalsy();
    });

    it('空白のみのフィールドは空とみなす', () => {
      const formData: PartialGoalFormData = {
        title: '   ',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      const result = draftUtils.isWorthSaving(formData);

      expect(result).toBeFalsy();
    });
  });

  describe('getDraftSummary', () => {
    it('タイトルがある場合、タイトルを返す', () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe('テスト目標');
    });

    it('タイトルがなく説明がある場合、説明を返す', () => {
      const formData: PartialGoalFormData = {
        description: 'テスト説明',
      };

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe('テスト説明');
    });

    it('説明が30文字を超える場合、省略する', () => {
      const formData: PartialGoalFormData = {
        description: 'これは非常に長い説明文です。30文字を超えるため省略されます。',
      };

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe(
        'これは非常に長い説明文です。30文字を超えるため省略されます。'.substring(0, 30) + '...'
      );
    });

    it('タイトルも説明もない場合、デフォルトメッセージを返す', () => {
      const formData: PartialGoalFormData = {};

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe('無題の下書き');
    });
  });

  describe('getTimeSinceSave', () => {
    it('1日以上前の場合、日数を返す', () => {
      const savedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2日前

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('2日前');
    });

    it('1時間以上前の場合、時間を返す', () => {
      const savedAt = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3時間前

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('3時間前');
    });

    it('1分以上前の場合、分を返す', () => {
      const savedAt = new Date(Date.now() - 5 * 60 * 1000); // 5分前

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('5分前');
    });

    it('1分未満の場合、「たった今」を返す', () => {
      const savedAt = new Date(Date.now() - 30 * 1000); // 30秒前

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('たった今');
    });
  });
});

describe('DraftService - Edge Cases', () => {
  describe('境界値テスト', () => {
    it('非常に大きなデータを保存できる', async () => {
      const largeData: PartialGoalFormData = {
        title: 'A'.repeat(1000),
        description: 'B'.repeat(5000),
        background: 'C'.repeat(3000),
        constraints: 'D'.repeat(2000),
      };

      await expect(DraftService.saveDraft(largeData)).resolves.toBeUndefined();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('空のオブジェクトを保存できる', async () => {
      const emptyData: PartialGoalFormData = {};

      await expect(DraftService.saveDraft(emptyData)).resolves.toBeUndefined();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('特殊文字を含むデータを保存できる', async () => {
      const specialCharsData: PartialGoalFormData = {
        title: '特殊文字: <>&"\'`\n\t\r',
        description: 'Unicode: 😀🎉✨',
      };

      await expect(DraftService.saveDraft(specialCharsData)).resolves.toBeUndefined();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('エラーケーステスト', () => {
    it('localStorageが満杯の場合、エラーをスローする', async () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });

      const formData: PartialGoalFormData = {
        title: 'テスト',
      };

      await expect(DraftService.saveDraft(formData)).rejects.toThrow(DraftServiceError);
    });

    it('localStorageが無効な場合、isStorageAvailableがfalseを返す', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage is disabled');
      });

      const result = DraftService.isStorageAvailable();

      expect(result).toBe(false);
    });

    it('破損したJSONデータを読み込んだ場合、nullを返す', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('{invalid json');

      const result = await DraftService.loadDraft();

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });

    it('nullデータを読み込んだ場合、nullを返す', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);

      const result = await DraftService.loadDraft();

      expect(result).toBeNull();
    });
  });

  describe('データ変換テスト', () => {
    it('古いバージョンのデータを自動削除する', async () => {
      const oldVersionData = {
        formData: { title: 'テスト' },
        savedAt: '2025-12-19T10:00:00Z',
        version: 0,
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(oldVersionData));

      const result = await DraftService.loadDraft();

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });

    it('保存日時が正しくISO形式で保存される', async () => {
      const formData: PartialGoalFormData = {
        title: 'テスト',
      };

      await DraftService.saveDraft(formData);

      const savedData = mockLocalStorage.setItem.mock.calls[0][1];
      const parsedData = JSON.parse(savedData);

      expect(parsedData.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

describe('draftUtils - Edge Cases', () => {
  describe('境界値テスト', () => {
    it('非常に長いタイトルの概要を取得できる', () => {
      const formData: PartialGoalFormData = {
        title: 'A'.repeat(1000),
      };

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe('A'.repeat(1000));
    });

    it('非常に長い説明の概要を30文字に省略する', () => {
      const formData: PartialGoalFormData = {
        description: 'あ'.repeat(100),
      };

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe('あ'.repeat(30) + '...');
    });

    it('ちょうど30文字の説明は省略しない', () => {
      const formData: PartialGoalFormData = {
        description: 'あ'.repeat(30),
      };

      const result = draftUtils.getDraftSummary(formData);

      expect(result).toBe('あ'.repeat(30));
    });
  });

  describe('エラーケーステスト', () => {
    it('undefinedフィールドを含むデータの保存価値を判定できる', () => {
      const formData: PartialGoalFormData = {
        title: undefined,
        description: 'テスト',
      };

      const result = draftUtils.isWorthSaving(formData);

      expect(result).toBe(true);
    });

    it('nullフィールドを含むデータの保存価値を判定できる', () => {
      const formData: PartialGoalFormData = {
        title: null as any,
        description: 'テスト',
      };

      const result = draftUtils.isWorthSaving(formData);

      expect(result).toBe(true);
    });
  });

  describe('時間計算テスト', () => {
    it('0秒前の場合、「たった今」を返す', () => {
      const savedAt = new Date();

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('たった今');
    });

    it('ちょうど1分前の場合、「1分前」を返す', () => {
      const savedAt = new Date(Date.now() - 60 * 1000);

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('1分前');
    });

    it('ちょうど1時間前の場合、「1時間前」を返す', () => {
      const savedAt = new Date(Date.now() - 60 * 60 * 1000);

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('1時間前');
    });

    it('ちょうど1日前の場合、「1日前」を返す', () => {
      const savedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('1日前');
    });

    it('30日前の場合、「30日前」を返す', () => {
      const savedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = draftUtils.getTimeSinceSave(savedAt);

      expect(result).toBe('30日前');
    });
  });
});
