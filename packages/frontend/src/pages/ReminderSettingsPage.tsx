import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getReminderPreference,
  updateReminderPreference,
  ReminderPreference,
} from '../services/reminderApi';

/**
 * リマインド設定画面
 *
 * 機能:
 * - リマインドの有効/無効切り替え
 * - 気分選択（「このまま行く」「気分を変える」）
 *
 * Requirements: 4.1-4.3, 9.4
 */
export const ReminderSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [preference, setPreference] = useState<ReminderPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 初期データ取得
  useEffect(() => {
    const fetchPreference = async () => {
      try {
        setIsLoading(true);
        const data = await getReminderPreference();
        setPreference(data);
      } catch (err) {
        console.error('Failed to fetch reminder preference:', err);
        setError('設定の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreference();
  }, []);

  // リマインド有効/無効切り替え
  const handleToggleEnabled = async () => {
    if (!preference) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const newEnabled = !preference.enabled;
      await updateReminderPreference({
        enabled: newEnabled,
        moodPreference: preference.moodPreference,
      });

      setPreference({
        ...preference,
        enabled: newEnabled,
      });

      setSuccessMessage(newEnabled ? 'リマインドを有効にしました' : 'リマインドを無効にしました');
    } catch (err) {
      console.error('Failed to update reminder preference:', err);
      setError('設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 気分選択の更新
  const handleMoodPreferenceChange = async (
    moodPreference: 'stay_on_track' | 'change_pace' | null
  ) => {
    if (!preference) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await updateReminderPreference({
        enabled: preference.enabled,
        moodPreference,
      });

      setPreference({
        ...preference,
        moodPreference,
      });

      setSuccessMessage('気分選択を更新しました');
    } catch (err) {
      console.error('Failed to update mood preference:', err);
      setError('気分選択の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">設定を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">リマインド設定</h1>
          <p className="mt-2 text-gray-600">毎日のタスクリマインドの設定を管理します</p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* リマインド有効/無効切り替え */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">リマインド通知</h2>
              <p className="text-sm text-gray-600">
                平日の午前10時にタスクをメールでお知らせします
              </p>
            </div>
            <button
              onClick={handleToggleEnabled}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                preference?.enabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={preference?.enabled}
              aria-label="リマインド通知の有効/無効を切り替え"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preference?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 気分選択 */}
        {preference?.enabled && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">明日の気分選択</h2>
            <p className="text-sm text-gray-600 mb-6">
              タスクの選択傾向を設定します。選択した気分に基づいて、翌日のタスクが選ばれます。
            </p>

            <div className="space-y-4">
              {/* このまま行く */}
              <button
                onClick={() => handleMoodPreferenceChange('stay_on_track')}
                disabled={isSaving}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  preference.moodPreference === 'stay_on_track'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        preference.moodPreference === 'stay_on_track'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {preference.moodPreference === 'stay_on_track' && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base font-medium text-gray-900">このまま行く</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      同じ調子で進めます。2/3は同じ・隣接アクションから、1/3は古いタスクからランダムに選択されます。
                    </p>
                  </div>
                </div>
              </button>

              {/* 気分を変える */}
              <button
                onClick={() => handleMoodPreferenceChange('change_pace')}
                disabled={isSaving}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  preference.moodPreference === 'change_pace'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        preference.moodPreference === 'change_pace'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {preference.moodPreference === 'change_pace' && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base font-medium text-gray-900">気分を変える</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      違うタスクに取り組みます。全て古いタスクからランダムに選択されます。
                    </p>
                  </div>
                </div>
              </button>

              {/* リセット */}
              {preference.moodPreference && (
                <button
                  onClick={() => handleMoodPreferenceChange(null)}
                  disabled={isSaving}
                  className="w-full text-center py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  気分選択をリセット
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderSettingsPage;
