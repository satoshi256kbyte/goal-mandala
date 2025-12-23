import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ReminderSettingsPage } from './ReminderSettingsPage';
import * as reminderApi from '../services/reminderApi';

// Mock the reminderApi module
vi.mock('../services/reminderApi');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ReminderSettingsPage', () => {
  const mockPreference: reminderApi.ReminderPreference = {
    enabled: true,
    moodPreference: 'stay_on_track',
    lastReminderSentAt: null,
    unsubscribedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('ローディング状態を表示する', () => {
      vi.mocked(reminderApi.getReminderPreference).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      expect(screen.getByText('設定を読み込んでいます...')).toBeInTheDocument();
    });

    it('リマインド設定を取得して表示する', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('リマインド設定')).toBeInTheDocument();
      });

      expect(screen.getByText('リマインド通知')).toBeInTheDocument();
      expect(screen.getByText('明日の気分選択')).toBeInTheDocument();
    });

    it('設定取得エラー時にエラーメッセージを表示する', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('設定の取得に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('トグルスイッチのテスト', () => {
    it('リマインドが有効な場合、トグルスイッチがオンになっている', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('リマインドが無効な場合、トグルスイッチがオフになっている', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
      });
    });

    it('トグルスイッチをクリックするとリマインドを無効化できる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: false,
          moodPreference: 'stay_on_track',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('リマインドを無効にしました')).toBeInTheDocument();
      });
    });

    it('トグルスイッチをクリックするとリマインドを有効化できる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: true,
          moodPreference: 'stay_on_track',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('リマインドを有効にしました')).toBeInTheDocument();
      });
    });

    it('トグルスイッチ更新エラー時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockRejectedValue(new Error('Update failed'));

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText('設定の更新に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('気分選択のテスト', () => {
    it('リマインドが有効な場合、気分選択が表示される', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('明日の気分選択')).toBeInTheDocument();
      });

      expect(screen.getByText('このまま行く')).toBeInTheDocument();
      expect(screen.getByText('気分を変える')).toBeInTheDocument();
    });

    it('リマインドが無効な場合、気分選択が表示されない', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('リマインド通知')).toBeInTheDocument();
      });

      expect(screen.queryByText('明日の気分選択')).not.toBeInTheDocument();
    });

    it('「このまま行く」を選択できる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: null,
      });
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: 'stay_on_track',
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('このまま行く')).toBeInTheDocument();
      });

      const stayOnTrackButton = screen.getByText('このまま行く').closest('button');
      expect(stayOnTrackButton).toBeInTheDocument();
      await user.click(stayOnTrackButton!);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: true,
          moodPreference: 'stay_on_track',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('気分選択を更新しました')).toBeInTheDocument();
      });
    });

    it('「気分を変える」を選択できる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: null,
      });
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: 'change_pace',
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('気分を変える')).toBeInTheDocument();
      });

      const changePaceButton = screen.getByText('気分を変える').closest('button');
      expect(changePaceButton).toBeInTheDocument();
      await user.click(changePaceButton!);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: true,
          moodPreference: 'change_pace',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('気分選択を更新しました')).toBeInTheDocument();
      });
    });

    it('気分選択をリセットできる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: null,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('気分選択をリセット')).toBeInTheDocument();
      });

      const resetButton = screen.getByText('気分選択をリセット');
      await user.click(resetButton);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: true,
          moodPreference: null,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('気分選択を更新しました')).toBeInTheDocument();
      });
    });

    it('気分選択更新エラー時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockRejectedValue(new Error('Update failed'));

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('このまま行く')).toBeInTheDocument();
      });

      const stayOnTrackButton = screen.getByText('このまま行く').closest('button');
      await user.click(stayOnTrackButton!);

      await waitFor(() => {
        expect(screen.getByText('気分選択の更新に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('ナビゲーション', () => {
    it('戻るボタンをクリックすると前のページに戻る', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('戻る')).toBeInTheDocument();
      });

      const backButton = screen.getByText('戻る');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('API統合のテスト', () => {
    it('初期表示時にgetReminderPreferenceが呼ばれる', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(reminderApi.getReminderPreference).toHaveBeenCalledTimes(1);
      });
    });

    it('トグルスイッチ変更時にupdateReminderPreferenceが正しいパラメータで呼ばれる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: false,
          moodPreference: 'stay_on_track',
        });
      });
    });

    it('気分選択変更時にupdateReminderPreferenceが正しいパラメータで呼ばれる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: 'change_pace',
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('気分を変える')).toBeInTheDocument();
      });

      const changePaceButton = screen.getByText('気分を変える').closest('button');
      await user.click(changePaceButton!);

      await waitFor(() => {
        expect(reminderApi.updateReminderPreference).toHaveBeenCalledWith({
          enabled: true,
          moodPreference: 'change_pace',
        });
      });
    });
  });

  describe('エッジケース', () => {
    it('トグルスイッチを連続してクリックできる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');

      // 複数回クリック
      await user.click(toggle);
      await user.click(toggle);
      await user.click(toggle);

      // 最後の呼び出しが記録される
      expect(reminderApi.updateReminderPreference).toHaveBeenCalled();
    });

    it('気分選択を連続して変更できる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);
      vi.mocked(reminderApi.updateReminderPreference).mockResolvedValue({
        ...mockPreference,
        moodPreference: 'change_pace',
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('このまま行く')).toBeInTheDocument();
      });

      const stayOnTrackButton = screen.getByText('このまま行く').closest('button');
      const changePaceButton = screen.getByText('気分を変える').closest('button');

      // 複数回クリック
      await user.click(stayOnTrackButton!);
      await user.click(changePaceButton!);
      await user.click(stayOnTrackButton!);

      expect(reminderApi.updateReminderPreference).toHaveBeenCalled();
    });

    it('リマインドが無効な場合に気分選択が表示されない', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue({
        ...mockPreference,
        enabled: false,
      });

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('リマインド通知')).toBeInTheDocument();
      });

      expect(screen.queryByText('明日の気分選択')).not.toBeInTheDocument();
    });

    it('ネットワークエラー時に適切なエラーメッセージが表示される', async () => {
      vi.mocked(reminderApi.getReminderPreference).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('設定の取得に失敗しました')).toBeInTheDocument();
      });
    });

    it('戻るボタンを複数回クリックできる', async () => {
      const user = userEvent.setup();
      vi.mocked(reminderApi.getReminderPreference).mockResolvedValue(mockPreference);

      render(
        <BrowserRouter>
          <ReminderSettingsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('戻る')).toBeInTheDocument();
      });

      const backButton = screen.getByText('戻る');

      // 複数回クリック
      await user.click(backButton);
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
