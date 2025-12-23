import { apiClient } from './api-client';

/**
 * リマインド設定
 */
export interface ReminderPreference {
  enabled: boolean;
  moodPreference: 'stay_on_track' | 'change_pace' | null;
  lastReminderSentAt?: Date | null;
  unsubscribedAt?: Date | null;
}

/**
 * リマインド設定更新リクエスト
 */
export interface UpdateReminderPreferenceRequest {
  enabled: boolean;
  moodPreference: 'stay_on_track' | 'change_pace' | null;
}

/**
 * リマインド設定を取得する
 *
 * @returns リマインド設定
 *
 * Requirements: 9.4
 */
export async function getReminderPreference(): Promise<ReminderPreference> {
  try {
    const response = await apiClient.get<ReminderPreference>('/api/reminders/preference');

    return response.data;
  } catch (error) {
    console.error('Failed to get reminder preference:', error);
    throw error;
  }
}

/**
 * リマインド設定を更新する
 *
 * @param request - 更新リクエスト
 * @returns 更新後のリマインド設定
 *
 * Requirements: 9.4, 4.1-4.3
 */
export async function updateReminderPreference(
  request: UpdateReminderPreferenceRequest
): Promise<ReminderPreference> {
  try {
    const response = await apiClient.put<ReminderPreference>('/api/reminders/preference', request);

    return response.data;
  } catch (error) {
    console.error('Failed to update reminder preference:', error);
    throw error;
  }
}

/**
 * リマインドを無効化する（配信停止）
 *
 * @param token - 配信停止トークン
 * @returns 更新後のリマインド設定
 *
 * Requirements: 9.2
 */
export async function unsubscribeReminder(token: string): Promise<ReminderPreference> {
  try {
    const response = await apiClient.get<ReminderPreference>(`/api/reminders/unsubscribe/${token}`);

    return response.data;
  } catch (error) {
    console.error('Failed to unsubscribe reminder:', error);
    throw error;
  }
}

/**
 * リマインドを再有効化する
 *
 * @returns 更新後のリマインド設定
 *
 * Requirements: 9.4, 9.5
 */
export async function enableReminder(): Promise<ReminderPreference> {
  try {
    const response = await apiClient.post<ReminderPreference>('/api/reminders/enable');

    return response.data;
  } catch (error) {
    console.error('Failed to enable reminder:', error);
    throw error;
  }
}
