import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../api-client';
import {
  getReminderPreference,
  updateReminderPreference,
  unsubscribeReminder,
  enableReminder,
  type ReminderPreference,
  type UpdateReminderPreferenceRequest,
} from '../reminderApi';

/**
 * Feature: 4.5-test-coverage-improvement, Task 8.1: 残りのサービスのテスト追加
 *
 * ReminderApiのテスト
 */
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ReminderApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReminderPreference', () => {
    it('リマインド設定を取得できる', async () => {
      const mockPreference: ReminderPreference = {
        enabled: true,
        moodPreference: 'stay_on_track',
        lastReminderSentAt: new Date('2025-01-01'),
        unsubscribedAt: null,
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPreference });

      const result = await getReminderPreference();

      expect(result).toEqual(mockPreference);
      expect(apiClient.get).toHaveBeenCalledWith('/api/reminders/preference');
    });

    it('エラーが発生した場合は例外をスロー', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(getReminderPreference()).rejects.toThrow('Network error');
    });
  });

  describe('updateReminderPreference', () => {
    it('リマインド設定を更新できる', async () => {
      const request: UpdateReminderPreferenceRequest = {
        enabled: true,
        moodPreference: 'change_pace',
      };

      const mockPreference: ReminderPreference = {
        enabled: true,
        moodPreference: 'change_pace',
        lastReminderSentAt: null,
        unsubscribedAt: null,
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockPreference });

      const result = await updateReminderPreference(request);

      expect(result).toEqual(mockPreference);
      expect(apiClient.put).toHaveBeenCalledWith('/api/reminders/preference', request);
    });

    it('リマインドを無効化できる', async () => {
      const request: UpdateReminderPreferenceRequest = {
        enabled: false,
        moodPreference: null,
      };

      const mockPreference: ReminderPreference = {
        enabled: false,
        moodPreference: null,
        lastReminderSentAt: null,
        unsubscribedAt: new Date('2025-01-01'),
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockPreference });

      const result = await updateReminderPreference(request);

      expect(result.enabled).toBe(false);
      expect(result.unsubscribedAt).toBeDefined();
    });

    it('エラーが発生した場合は例外をスロー', async () => {
      const request: UpdateReminderPreferenceRequest = {
        enabled: true,
        moodPreference: 'stay_on_track',
      };

      const error = new Error('Validation error');
      vi.mocked(apiClient.put).mockRejectedValue(error);

      await expect(updateReminderPreference(request)).rejects.toThrow('Validation error');
    });
  });

  describe('unsubscribeReminder', () => {
    it('配信停止トークンでリマインドを無効化できる', async () => {
      const token = 'test-token-123';
      const mockPreference: ReminderPreference = {
        enabled: false,
        moodPreference: null,
        lastReminderSentAt: null,
        unsubscribedAt: new Date('2025-01-01'),
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPreference });

      const result = await unsubscribeReminder(token);

      expect(result.enabled).toBe(false);
      expect(result.unsubscribedAt).toBeDefined();
      expect(apiClient.get).toHaveBeenCalledWith(`/api/reminders/unsubscribe/${token}`);
    });

    it('無効なトークンの場合はエラー', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(unsubscribeReminder(token)).rejects.toThrow('Invalid token');
    });
  });

  describe('enableReminder', () => {
    it('リマインドを再有効化できる', async () => {
      const mockPreference: ReminderPreference = {
        enabled: true,
        moodPreference: 'stay_on_track',
        lastReminderSentAt: null,
        unsubscribedAt: null,
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPreference });

      const result = await enableReminder();

      expect(result.enabled).toBe(true);
      expect(result.unsubscribedAt).toBeNull();
      expect(apiClient.post).toHaveBeenCalledWith('/api/reminders/enable');
    });

    it('エラーが発生した場合は例外をスロー', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(enableReminder()).rejects.toThrow('Network error');
    });
  });

  describe('気分選択', () => {
    it('「このまま行く」を選択できる', async () => {
      const request: UpdateReminderPreferenceRequest = {
        enabled: true,
        moodPreference: 'stay_on_track',
      };

      const mockPreference: ReminderPreference = {
        enabled: true,
        moodPreference: 'stay_on_track',
        lastReminderSentAt: null,
        unsubscribedAt: null,
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockPreference });

      const result = await updateReminderPreference(request);

      expect(result.moodPreference).toBe('stay_on_track');
    });

    it('「気分を変える」を選択できる', async () => {
      const request: UpdateReminderPreferenceRequest = {
        enabled: true,
        moodPreference: 'change_pace',
      };

      const mockPreference: ReminderPreference = {
        enabled: true,
        moodPreference: 'change_pace',
        lastReminderSentAt: null,
        unsubscribedAt: null,
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockPreference });

      const result = await updateReminderPreference(request);

      expect(result.moodPreference).toBe('change_pace');
    });

    it('気分選択をnullに設定できる', async () => {
      const request: UpdateReminderPreferenceRequest = {
        enabled: true,
        moodPreference: null,
      };

      const mockPreference: ReminderPreference = {
        enabled: true,
        moodPreference: null,
        lastReminderSentAt: null,
        unsubscribedAt: null,
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockPreference });

      const result = await updateReminderPreference(request);

      expect(result.moodPreference).toBeNull();
    });
  });
});
