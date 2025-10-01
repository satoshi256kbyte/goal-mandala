import { DraftService, DraftServiceError, draftUtils } from './draftService';
import { PartialGoalFormData } from '../schemas/goal-form';

// LocalStorageのモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('DraftService', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveDraft', () => {
    it('下書きデータを正常に保存できる', async () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      await DraftService.saveDraft(formData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'goal-form-draft',
        expect.stringContaining('"formData"')
      );

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.formData).toEqual(formData);
      expect(savedData.version).toBe(1);
      expect(savedData.savedAt).toBeDefined();
    });

    it('LocalStorageエラー時にDraftServiceErrorを投げる', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const formData: PartialGoalFormData = { title: 'テスト' };

      await expect(DraftService.saveDraft(formData)).rejects.toThrow(DraftServiceError);
    });
  });

  describe('loadDraft', () => {
    it('保存された下書きデータを正常に読み込める', async () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      await DraftService.saveDraft(formData);
      const loadedData = await DraftService.loadDraft();

      expect(loadedData).not.toBeNull();
      expect(loadedData!.formData).toEqual(formData);
      expect(loadedData!.version).toBe(1);
    });

    it('下書きが存在しない場合はnullを返す', async () => {
      const loadedData = await DraftService.loadDraft();
      expect(loadedData).toBeNull();
    });

    it('バージョンが古い場合は下書きを削除してnullを返す', async () => {
      const oldVersionData = {
        formData: { title: 'テスト' },
        savedAt: new Date().toISOString(),
        version: 0, // 古いバージョン
      };

      mockLocalStorage.setItem('goal-form-draft', JSON.stringify(oldVersionData));

      const loadedData = await DraftService.loadDraft();

      expect(loadedData).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });

    it('破損したデータの場合は下書きを削除してnullを返す', async () => {
      mockLocalStorage.setItem('goal-form-draft', 'invalid json');

      const loadedData = await DraftService.loadDraft();

      expect(loadedData).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });
  });

  describe('clearDraft', () => {
    it('下書きデータを正常に削除できる', async () => {
      await DraftService.saveDraft({ title: 'テスト' });
      await DraftService.clearDraft();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('goal-form-draft');
    });

    it('LocalStorageエラー時にDraftServiceErrorを投げる', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(DraftService.clearDraft()).rejects.toThrow(DraftServiceError);
    });
  });

  describe('hasDraft', () => {
    it('下書きが存在する場合はtrueを返す', async () => {
      await DraftService.saveDraft({ title: 'テスト' });
      const hasDraft = await DraftService.hasDraft();
      expect(hasDraft).toBe(true);
    });

    it('下書きが存在しない場合はfalseを返す', async () => {
      const hasDraft = await DraftService.hasDraft();
      expect(hasDraft).toBe(false);
    });

    it('エラーが発生した場合はfalseを返す', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const hasDraft = await DraftService.hasDraft();
      expect(hasDraft).toBe(false);
    });
  });

  describe('isDraftEmpty', () => {
    it('空の下書きの場合はtrueを返す', () => {
      const emptyData: PartialGoalFormData = {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      expect(DraftService.isDraftEmpty(emptyData)).toBe(true);
    });

    it('空白のみの下書きの場合はtrueを返す', () => {
      const whitespaceData: PartialGoalFormData = {
        title: '   ',
        description: '\t\n',
        deadline: '',
        background: ' ',
        constraints: '',
      };

      expect(DraftService.isDraftEmpty(whitespaceData)).toBe(true);
    });

    it('データが入力されている場合はfalseを返す', () => {
      const dataWithContent: PartialGoalFormData = {
        title: 'テスト目標',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      expect(DraftService.isDraftEmpty(dataWithContent)).toBe(false);
    });
  });

  describe('getDraftSavedAt', () => {
    it('下書きの保存日時を正常に取得できる', async () => {
      const beforeSave = new Date();
      await DraftService.saveDraft({ title: 'テスト' });
      const afterSave = new Date();

      const savedAt = await DraftService.getDraftSavedAt();

      expect(savedAt).not.toBeNull();
      expect(savedAt!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedAt!.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('下書きが存在しない場合はnullを返す', async () => {
      const savedAt = await DraftService.getDraftSavedAt();
      expect(savedAt).toBeNull();
    });
  });

  describe('isStorageAvailable', () => {
    it('LocalStorageが利用可能な場合はtrueを返す', () => {
      expect(DraftService.isStorageAvailable()).toBe(true);
    });

    it('LocalStorageが利用不可能な場合はfalseを返す', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });

      expect(DraftService.isStorageAvailable()).toBe(false);
    });
  });
});

describe('draftUtils', () => {
  describe('isWorthSaving', () => {
    it('タイトルが入力されている場合はtrueを返す', () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      expect(draftUtils.isWorthSaving(formData)).toBe(true);
    });

    it('説明が入力されている場合はtrueを返す', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: 'テスト説明',
        deadline: '',
        background: '',
        constraints: '',
      };

      expect(draftUtils.isWorthSaving(formData)).toBe(true);
    });

    it('すべて空の場合はfalseを返す', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      expect(draftUtils.isWorthSaving(formData)).toBe(false);
    });

    it('空白のみの場合はfalseを返す', () => {
      const formData: PartialGoalFormData = {
        title: '   ',
        description: '\t',
        deadline: '',
        background: ' ',
        constraints: '',
      };

      expect(draftUtils.isWorthSaving(formData)).toBe(false);
    });
  });

  describe('getDraftSummary', () => {
    it('タイトルがある場合はタイトルを返す', () => {
      const formData: PartialGoalFormData = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      expect(draftUtils.getDraftSummary(formData)).toBe('テスト目標');
    });

    it('タイトルがなく説明がある場合は説明を返す', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: 'テスト説明',
      };

      expect(draftUtils.getDraftSummary(formData)).toBe('テスト説明');
    });

    it('説明が長い場合は省略する', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: 'これは非常に長い説明文です。30文字を超える場合は省略されるはずです。',
      };

      const summary = draftUtils.getDraftSummary(formData);
      expect(summary).toBe('これは非常に長い説明文です。30文字を超える場合は省略され...');
      expect(summary.length).toBe(33); // 30文字 + "..."
    });

    it('タイトルも説明もない場合はデフォルトメッセージを返す', () => {
      const formData: PartialGoalFormData = {
        title: '',
        description: '',
      };

      expect(draftUtils.getDraftSummary(formData)).toBe('無題の下書き');
    });
  });

  describe('getTimeSinceSave', () => {
    it('1分未満の場合は「たった今」を返す', () => {
      const savedAt = new Date(Date.now() - 30 * 1000); // 30秒前
      expect(draftUtils.getTimeSinceSave(savedAt)).toBe('たった今');
    });

    it('分単位の場合は「X分前」を返す', () => {
      const savedAt = new Date(Date.now() - 5 * 60 * 1000); // 5分前
      expect(draftUtils.getTimeSinceSave(savedAt)).toBe('5分前');
    });

    it('時間単位の場合は「X時間前」を返す', () => {
      const savedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2時間前
      expect(draftUtils.getTimeSinceSave(savedAt)).toBe('2時間前');
    });

    it('日単位の場合は「X日前」を返す', () => {
      const savedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3日前
      expect(draftUtils.getTimeSinceSave(savedAt)).toBe('3日前');
    });
  });
});
