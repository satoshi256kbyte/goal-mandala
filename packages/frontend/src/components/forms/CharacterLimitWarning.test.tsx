import React from 'react';
import { render } from '@testing-library/react';
import { CharacterLimitWarning } from './CharacterLimitWarning';

describe('CharacterLimitWarning', () => {
  describe('表示制御', () => {
    it('通常時は何も表示されない', () => {
      const { container } = render(<CharacterLimitWarning currentLength={50} maxLength={100} />);

      expect(container.firstChild).toBeNull();
    });

    it('80%を超えると警告が表示される', () => {
      render(<CharacterLimitWarning currentLength={81} maxLength={100} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('残り19文字です')).toBeInTheDocument();
    });

    it('100%を超えるとエラーが表示される', () => {
      render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('文字数制限を超えています（5文字超過）')).toBeInTheDocument();
    });
  });

  describe('メッセージカスタマイズ', () => {
    it('カスタム警告メッセージが表示される', () => {
      render(
        <CharacterLimitWarning
          currentLength={85}
          maxLength={100}
          warningMessage="カスタム警告メッセージ"
        />
      );

      expect(screen.getByText('カスタム警告メッセージ')).toBeInTheDocument();
    });

    it('カスタムエラーメッセージが表示される', () => {
      render(
        <CharacterLimitWarning
          currentLength={105}
          maxLength={100}
          errorMessage="カスタムエラーメッセージ"
        />
      );

      expect(screen.getByText('カスタムエラーメッセージ')).toBeInTheDocument();
    });
  });

  describe('しきい値設定', () => {
    it('カスタム警告しきい値が適用される', () => {
      render(<CharacterLimitWarning currentLength={71} maxLength={100} warningThreshold={70} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('残り29文字です')).toBeInTheDocument();
    });

    it('カスタムしきい値未満では表示されない', () => {
      const { container } = render(
        <CharacterLimitWarning currentLength={69} maxLength={100} warningThreshold={70} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('スタイル', () => {
    it('警告時は黄色のスタイルが適用される', () => {
      render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-yellow-600');
    });

    it('エラー時は赤色のスタイルが適用される', () => {
      render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-red-600');
    });

    it('tooltipポジションでは適切なスタイルが適用される', () => {
      render(<CharacterLimitWarning currentLength={85} maxLength={100} position="tooltip" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('absolute', 'z-10', 'bg-yellow-50', 'text-yellow-700');
    });

    it('カスタムクラス名が適用される', () => {
      render(<CharacterLimitWarning currentLength={85} maxLength={100} className="custom-class" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('警告時のaria-labelが正しく設定される', () => {
      render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', '警告: 残り15文字です');
    });

    it('エラー時のaria-labelが正しく設定される', () => {
      render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', 'エラー: 文字数制限を超えています（5文字超過）');
    });

    it('aria-liveが設定される', () => {
      render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('アイコン表示', () => {
    it('警告時は警告アイコンが表示される', () => {
      render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

      // ExclamationTriangleIcon が表示されることを確認
      const alert = screen.getByRole('alert');
      const icon = alert.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('エラー時はエラーアイコンが表示される', () => {
      render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

      // XCircleIcon が表示されることを確認
      const alert = screen.getByRole('alert');
      const icon = alert.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('maxLengthが0でもエラーにならない', () => {
      const { container } = render(<CharacterLimitWarning currentLength={0} maxLength={0} />);

      expect(container.firstChild).toBeNull();
    });

    it('currentLengthが負の値でも動作する', () => {
      const { container } = render(<CharacterLimitWarning currentLength={-1} maxLength={100} />);

      expect(container.firstChild).toBeNull();
    });

    it('ちょうど制限値の場合はエラーとして表示される', () => {
      render(<CharacterLimitWarning currentLength={100} maxLength={100} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('文字数制限を超えています（0文字超過）')).toBeInTheDocument();
    });
  });
});
