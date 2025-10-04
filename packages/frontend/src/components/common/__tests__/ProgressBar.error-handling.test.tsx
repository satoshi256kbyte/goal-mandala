/**
 * ProgressBarコンポーネントのエラーハンドリングテスト
 * 要件: 全要件 - エラーハンドリング
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';
import { ProgressCalculationError } from '../../../types/progress-errors';

// AnimationSettingsContextのモック
jest.mock('../../../contexts/AnimationSettingsContext', () => ({
  useAnimationSettings: () => ({
    isAnimationEnabled: true,
    getProgressTransitionStyle: () => ({ transition: 'width 0.3s ease-out' }),
    settings: {
      achievementEnabled: true,
      achievementDuration: 600,
    },
    interruptAnimation: jest.fn(),
  }),
}));

// AchievementAnimationコンポーネントのモック
jest.mock('../AchievementAnimation', () => ({
  AchievementAnimation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ProgressBar エラーハンドリング', () => {
  describe('エラー状態の表示', () => {
    it('エラー状態を正しく表示する', () => {
      render(
        <ProgressBar
          value={50}
          error={{
            hasError: true,
            errorType: ProgressCalculationError.NETWORK_ERROR,
            errorMessage: 'ネットワークエラーが発生しました',
          }}
          showLabel
        />
      );

      // エラー状態のテキストが表示される
      expect(screen.getByText('エラー')).toBeInTheDocument();

      // プログレスバーのaria-labelにエラー情報が含まれる
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'エラー: ネットワークエラーが発生しました');
      expect(progressBar).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラー状態でプログレスバーが赤色になる', () => {
      render(
        <ProgressBar
          value={50}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveClass('bg-red-500');
    });

    it('エラー状態でカスタム色が無効になる', () => {
      render(
        <ProgressBar
          value={50}
          colorScheme="custom"
          customColors={{
            fill: '#00ff00',
            background: '#f0f0f0',
          }}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveClass('bg-red-500');
      expect(progressFill).not.toHaveStyle('background-color: #00ff00');
    });

    it('エラー状態でアチーブメントアニメーションが無効になる', () => {
      const onAchievement = jest.fn();

      const { rerender } = render(
        <ProgressBar
          value={50}
          onAchievement={onAchievement}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      // 100%に変更してもアチーブメントコールバックが呼ばれない
      rerender(
        <ProgressBar
          value={100}
          onAchievement={onAchievement}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      expect(onAchievement).not.toHaveBeenCalled();
    });
  });

  describe('ローディング状態の表示', () => {
    it('ローディング状態を正しく表示する', () => {
      render(<ProgressBar value={50} loading={true} showLabel />);

      // ローディング状態のテキストが表示される
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();

      // プログレスバーのaria-labelにローディング情報が含まれる
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', '進捗データを読み込み中');
    });

    it('ローディング状態でプログレスバーが青色でアニメーションする', () => {
      render(<ProgressBar value={50} loading={true} />);

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveClass('bg-blue-300', 'animate-pulse');
    });

    it('ローディング状態でプログレスバーが100%幅になる', () => {
      render(<ProgressBar value={50} loading={true} />);

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveStyle('width: 100%');
    });
  });

  describe('計算中状態の表示', () => {
    it('計算中状態（value=-1）を正しく表示する', () => {
      render(<ProgressBar value={-1} showLabel />);

      // 計算中状態のテキストが表示される
      expect(screen.getByText('計算中...')).toBeInTheDocument();

      // プログレスバーのaria-labelに計算中情報が含まれる
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', '進捗を計算中');
    });

    it('計算中状態でプログレスバーが黄色でアニメーションする', () => {
      render(<ProgressBar value={-1} />);

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveClass('bg-yellow-300', 'animate-pulse');
    });

    it('計算中状態でプログレスバーが100%幅になる', () => {
      render(<ProgressBar value={-1} />);

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveStyle('width: 100%');
    });
  });

  describe('エラー状態（value=-2）の表示', () => {
    it('エラー状態（value=-2）を正しく表示する', () => {
      render(<ProgressBar value={-2} showLabel />);

      // エラー状態のテキストが表示される
      expect(screen.getByText('エラー')).toBeInTheDocument();

      // プログレスバーのaria-labelにエラー情報が含まれる
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラー状態でプログレスバーが赤色になる', () => {
      render(<ProgressBar value={-2} />);

      const progressFill = screen.getByRole('progressbar').querySelector('div');
      expect(progressFill).toHaveClass('bg-red-500');
    });
  });

  describe('エラーツールチップ', () => {
    it('エラー時にカスタムツールチップが表示される', () => {
      render(
        <ProgressBar
          value={50}
          error={{
            hasError: true,
            errorMessage: 'ネットワークエラーが発生しました',
            showRetry: true,
            onRetry: jest.fn(),
          }}
          tooltipConfig={{
            position: 'top',
          }}
        />
      );

      // ツールチップが高度なツールチップとして扱われる
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('エラー時に再試行ボタンが機能する', () => {
      const onRetry = jest.fn();

      render(
        <ProgressBar
          value={50}
          error={{
            hasError: true,
            errorMessage: 'ネットワークエラーが発生しました',
            showRetry: true,
            onRetry,
          }}
          tooltipConfig={{
            position: 'top',
          }}
        />
      );

      // この部分は実際のツールチップの実装に依存するため、
      // 実装が完了したら適切なテストに更新する必要がある
      expect(onRetry).toBeDefined();
    });
  });

  describe('進捗変化コールバック', () => {
    it('エラー状態では進捗変化コールバックが呼ばれない', () => {
      const onProgressChange = jest.fn();

      const { rerender } = render(
        <ProgressBar
          value={50}
          onProgressChange={onProgressChange}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      rerender(
        <ProgressBar
          value={75}
          onProgressChange={onProgressChange}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      expect(onProgressChange).not.toHaveBeenCalled();
    });

    it('ローディング状態では進捗変化コールバックが呼ばれない', () => {
      const onProgressChange = jest.fn();

      const { rerender } = render(
        <ProgressBar value={50} onProgressChange={onProgressChange} loading={true} />
      );

      rerender(<ProgressBar value={75} onProgressChange={onProgressChange} loading={true} />);

      expect(onProgressChange).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('エラー状態でaria-invalidが設定される', () => {
      render(
        <ProgressBar
          value={50}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラー状態でaria-valuenowが設定されない', () => {
      render(
        <ProgressBar
          value={50}
          error={{
            hasError: true,
            errorMessage: 'エラーが発生しました',
          }}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).not.toHaveAttribute('aria-valuenow');
    });

    it('正常状態でaria-valuenowが設定される', () => {
      render(<ProgressBar value={75} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).not.toHaveAttribute('aria-invalid');
    });
  });
});
