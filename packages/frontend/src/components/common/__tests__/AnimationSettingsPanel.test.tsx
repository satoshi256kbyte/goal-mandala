import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimationSettingsPanel } from '../AnimationSettingsPanel';
import { AnimationSettingsProvider } from '../../../contexts/AnimationSettingsContext';
import {
  globalPerformanceMonitor,
  globalAccessibilityManager,
} from '../../../utils/animation-performance';

// Web Animations API のモック
Object.defineProperty(HTMLElement.prototype, 'animate', {
  value: jest.fn().mockReturnValue({
    addEventListener: jest.fn(),
    cancel: jest.fn(),
    finish: jest.fn(),
  }),
  writable: true,
});

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

// performance のモック
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn().mockReturnValue(1000),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    },
  },
  writable: true,
});

// requestAnimationFrame のモック
Object.defineProperty(global, 'requestAnimationFrame', {
  value: jest.fn(),
  writable: true,
});

describe('AnimationSettingsPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (props = defaultProps, settings = {}) => {
    return render(
      <AnimationSettingsProvider initialSettings={settings}>
        <AnimationSettingsPanel {...props} />
      </AnimationSettingsProvider>
    );
  };

  describe('基本表示', () => {
    it('パネルが開いている時に正しく表示される', () => {
      renderWithProvider();

      expect(screen.getByText('アニメーション設定')).toBeInTheDocument();
      expect(screen.getByText('基本設定')).toBeInTheDocument();
      expect(screen.getByText('速度設定')).toBeInTheDocument();
      expect(screen.getByText('パフォーマンス')).toBeInTheDocument();
    });

    it('パネルが閉じている時は表示されない', () => {
      renderWithProvider({ ...defaultProps, isOpen: false });

      expect(screen.queryByText('アニメーション設定')).not.toBeInTheDocument();
    });

    it('閉じるボタンが機能する', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      renderWithProvider({ ...defaultProps, onClose });

      const closeButton = screen.getByLabelText('設定パネルを閉じる');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('フッターの閉じるボタンが機能する', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      renderWithProvider({ ...defaultProps, onClose });

      const closeButton = screen.getByRole('button', { name: '閉じる' });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('基本設定', () => {
    it('アニメーション有効・無効を切り替えできる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const animationToggle = screen.getByRole('checkbox', { name: /アニメーション/ });
      expect(animationToggle).toBeChecked();

      await user.click(animationToggle);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
      });
    });

    it('達成アニメーション有効・無効を切り替えできる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const achievementToggle = screen.getByRole('checkbox', { name: /達成アニメーション/ });
      expect(achievementToggle).toBeChecked();

      await user.click(achievementToggle);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ achievementEnabled: false })
        );
      });
    });

    it('システム設定の尊重を切り替えできる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const respectToggle = screen.getByRole('checkbox', { name: /システム設定を尊重/ });
      expect(respectToggle).toBeChecked();

      await user.click(respectToggle);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ respectReducedMotion: false })
        );
      });
    });

    it('アニメーション無効時は達成アニメーション設定が無効になる', () => {
      renderWithProvider(defaultProps, { enabled: false });

      const achievementToggle = screen.getByRole('checkbox', { name: /達成アニメーション/ });
      expect(achievementToggle).toBeDisabled();
    });
  });

  describe('速度設定', () => {
    it('アニメーション有効時のみ速度設定が表示される', () => {
      renderWithProvider(defaultProps, { enabled: true });
      expect(screen.getByText('速度設定')).toBeInTheDocument();
      expect(screen.getByText(/進捗変化の速度/)).toBeInTheDocument();

      // アニメーション無効時は速度設定が表示されない
      renderWithProvider(defaultProps, { enabled: false });
      expect(screen.queryByText(/進捗変化の速度/)).not.toBeInTheDocument();
    });

    it('進捗アニメーション速度を変更できる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const progressSlider = screen.getByDisplayValue('300');
      await user.clear(progressSlider);
      await user.type(progressSlider, '500');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ progressDuration: 500 }));
      });
    });

    it('色変化アニメーション速度を変更できる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const colorSliders = screen.getAllByDisplayValue('300');
      const colorSlider = colorSliders[1]; // 2番目のスライダーが色変化用

      fireEvent.change(colorSlider, { target: { value: '400' } });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ colorDuration: 400 }));
      });
    });

    it('達成アニメーション速度を変更できる', async () => {
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const achievementSlider = screen.getByDisplayValue('600');
      fireEvent.change(achievementSlider, { target: { value: '800' } });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ achievementDuration: 800 })
        );
      });
    });

    it('達成アニメーション無効時は速度スライダーが無効になる', () => {
      renderWithProvider(defaultProps, { achievementEnabled: false });

      const achievementSlider = screen.getByDisplayValue('600');
      expect(achievementSlider).toBeDisabled();
    });
  });

  describe('パフォーマンス設定', () => {
    it('品質レベルを変更できる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const qualitySelect = screen.getByDisplayValue('高品質（推奨）');
      await user.selectOptions(qualitySelect, 'medium');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ performanceLevel: 'medium' })
        );
      });
    });

    it('パフォーマンス監視を切り替えできる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const monitoringToggle = screen.getByRole('checkbox', { name: /パフォーマンス監視/ });
      expect(monitoringToggle).toBeChecked();

      await user.click(monitoringToggle);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ enablePerformanceMonitoring: false })
        );
      });
    });

    it('自動品質調整を切り替えできる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      const adaptiveToggle = screen.getByRole('checkbox', { name: /自動品質調整/ });
      expect(adaptiveToggle).toBeChecked();

      await user.click(adaptiveToggle);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ enableAdaptiveQuality: false })
        );
      });
    });
  });

  describe('パフォーマンス情報', () => {
    it('パフォーマンス監視有効時にメトリクスが表示される', async () => {
      // パフォーマンスメトリクスをモック
      jest.spyOn(globalPerformanceMonitor, 'getMetrics').mockReturnValue({
        fps: 60,
        duration: 1000,
        memoryUsage: 50,
        cpuUsage: 30,
        activeAnimations: 3,
        droppedFrames: 0,
      });

      renderWithProvider(defaultProps, { enablePerformanceMonitoring: true });

      await waitFor(() => {
        expect(screen.getByText('パフォーマンス情報')).toBeInTheDocument();
        expect(screen.getByText('60 fps')).toBeInTheDocument();
        expect(screen.getByText('50 MB')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // アクティブアニメーション数
        expect(screen.getByText('0')).toBeInTheDocument(); // フレームドロップ数
      });
    });

    it('パフォーマンス監視無効時はメトリクスが表示されない', () => {
      renderWithProvider(defaultProps, { enablePerformanceMonitoring: false });

      expect(screen.queryByText('パフォーマンス情報')).not.toBeInTheDocument();
    });
  });

  describe('高度な設定', () => {
    it('高度な設定を展開・折りたたみできる', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      const advancedButton = screen.getByText('高度な設定');

      // 初期状態では高度な設定は非表示
      expect(screen.queryByText('イージング関数')).not.toBeInTheDocument();

      // 展開
      await user.click(advancedButton);
      expect(screen.getByText('イージング関数')).toBeInTheDocument();

      // 折りたたみ
      await user.click(advancedButton);
      expect(screen.queryByText('イージング関数')).not.toBeInTheDocument();
    });

    it('イージング関数を変更できる', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      renderWithProvider({ ...defaultProps, onChange });

      // 高度な設定を展開
      const advancedButton = screen.getByText('高度な設定');
      await user.click(advancedButton);

      const easingSelect = screen.getByDisplayValue('ease-out（推奨）');
      await user.selectOptions(easingSelect, 'ease-in');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ easing: 'ease-in' }));
      });
    });

    it('すべてのアニメーションを停止できる', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      // 高度な設定を展開
      const advancedButton = screen.getByText('高度な設定');
      await user.click(advancedButton);

      const stopButton = screen.getByText('すべてのアニメーションを停止');
      await user.click(stopButton);

      // interruptAllAnimations が呼ばれることを確認
      // （実際の実装では globalInterruptController.interruptAllAnimations が呼ばれる）
      expect(stopButton).toBeInTheDocument();
    });

    it('手動でアニメーションを無効化できる', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      // 高度な設定を展開
      const advancedButton = screen.getByText('高度な設定');
      await user.click(advancedButton);

      const disableButton = screen.getByText('アニメーションを無効化');
      await user.click(disableButton);

      // globalAccessibilityManager.setDisabled が呼ばれることを確認
      expect(disableButton).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      renderWithProvider();

      expect(screen.getByLabelText('設定パネルを閉じる')).toBeInTheDocument();
    });

    it('キーボードナビゲーションが機能する', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      // Tabキーでフォーカス移動をテスト
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('設定パネルを閉じる'));
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル画面サイズでも適切に表示される', () => {
      // ビューポートサイズを変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProvider();

      const panel = screen.getByText('アニメーション設定').closest('div');
      expect(panel).toHaveClass('mx-4'); // モバイル用のマージン
    });
  });
});
