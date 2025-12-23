/**
 * 進捗色分けユーティリティのテスト
 * 要件3.1, 3.2, 3.3, 3.4, 3.5, 3.6のテスト
 */

import {
  getProgressColorScheme,
  getProgressClassName,
  getProgressAriaLabel,
  PROGRESS_TRANSITION_CONFIG,
} from '../progress-colors';

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('progress-colors', () => {
  describe('getProgressClassName', () => {
    it('進捗値に応じて正しいクラス名を返す', () => {
      expect(getProgressClassName(0)).toBe('progress-0');
      expect(getProgressClassName(25)).toBe('progress-low');
      expect(getProgressClassName(49)).toBe('progress-low');
      expect(getProgressClassName(50)).toBe('progress-medium');
      expect(getProgressClassName(79)).toBe('progress-medium');
      expect(getProgressClassName(80)).toBe('progress-high');
      expect(getProgressClassName(99)).toBe('progress-high');
      expect(getProgressClassName(100)).toBe('progress-complete');
    });
  });

  describe('getProgressAriaLabel', () => {
    it('進捗値に応じて正しいアクセシビリティラベルを返す', () => {
      expect(getProgressAriaLabel(0)).toBe('未開始');
      expect(getProgressAriaLabel(25)).toBe('低進捗');
      expect(getProgressAriaLabel(49)).toBe('低進捗');
      expect(getProgressAriaLabel(50)).toBe('中進捗');
      expect(getProgressAriaLabel(79)).toBe('中進捗');
      expect(getProgressAriaLabel(80)).toBe('高進捗');
      expect(getProgressAriaLabel(99)).toBe('高進捗');
      expect(getProgressAriaLabel(100)).toBe('完了');
    });
  });

  describe('getProgressColorScheme', () => {
    describe('デフォルト色スキーム', () => {
      it('0%の場合、灰色を返す', () => {
        const scheme = getProgressColorScheme(0);
        expect(scheme.background).toContain('156, 163, 175'); // gray-400
        expect(scheme.border).toContain('107, 114, 128'); // gray-500
        expect(scheme.text).toBe('#374151'); // gray-700
      });

      it('1-49%の場合、薄い赤色を返す', () => {
        const scheme = getProgressColorScheme(25);
        expect(scheme.background).toContain('248, 113, 113'); // red-400
        expect(scheme.border).toContain('239, 68, 68'); // red-500
        expect(scheme.text).toBe('#7f1d1d'); // red-900
      });

      it('50-79%の場合、薄い黄色を返す', () => {
        const scheme = getProgressColorScheme(65);
        expect(scheme.background).toContain('251, 191, 36'); // yellow-400
        expect(scheme.border).toContain('245, 158, 11'); // yellow-500
        expect(scheme.text).toBe('#78350f'); // yellow-900
      });

      it('80-99%の場合、薄い緑色を返す', () => {
        const scheme = getProgressColorScheme(85);
        expect(scheme.background).toContain('74, 222, 128'); // green-400
        expect(scheme.border).toContain('34, 197, 94'); // green-500
        expect(scheme.text).toBe('#14532d'); // green-900
      });

      it('100%の場合、濃い緑色を返す', () => {
        const scheme = getProgressColorScheme(100);
        expect(scheme.background).toContain('34, 197, 94'); // green-500
        expect(scheme.border).toContain('21, 128, 61'); // green-700
        expect(scheme.text).toBe('#ffffff');
      });
    });

    describe('ハイコントラストモード', () => {
      it('ハイコントラストモードで不透明度が高くなる', () => {
        const normalScheme = getProgressColorScheme(50);
        const highContrastScheme = getProgressColorScheme(50, { highContrast: true });

        // ハイコントラストモードでは不透明度が0.8になる
        expect(highContrastScheme.background).toContain('0.8');
        expect(normalScheme.background).toContain('0.6');
      });
    });

    describe('ダークモード', () => {
      it('ダークモードで適切な色を返す', () => {
        const scheme = getProgressColorScheme(50, { darkMode: true });
        expect(scheme.background).toContain('217, 119, 6'); // yellow-600 (darker)
        expect(scheme.text).toBe('#fef3c7'); // yellow-100 (lighter text)
      });
    });

    describe('カラーブラインドネス対応', () => {
      it('カラーブラインドネス対応色を返す', () => {
        const scheme = getProgressColorScheme(50, { colorBlindFriendly: true });
        expect(scheme.background).toContain('168, 85, 247'); // purple-500
      });

      it('カラーブラインドネス対応 + ダークモード', () => {
        const scheme = getProgressColorScheme(50, {
          colorBlindFriendly: true,
          darkMode: true,
        });
        expect(scheme.background).toContain('126, 34, 206'); // purple-600 (darker)
        expect(scheme.text).toBe('#e9d5ff'); // purple-100 (lighter text)
      });
    });
  });

  describe('PROGRESS_TRANSITION_CONFIG', () => {
    it('適切なトランジション設定を持つ', () => {
      expect(PROGRESS_TRANSITION_CONFIG.duration).toBe('300ms');
      expect(PROGRESS_TRANSITION_CONFIG.easing).toBe('ease-in-out');
      expect(PROGRESS_TRANSITION_CONFIG.properties).toContain('background-color');
      expect(PROGRESS_TRANSITION_CONFIG.properties).toContain('border-color');
      expect(PROGRESS_TRANSITION_CONFIG.properties).toContain('color');
      expect(PROGRESS_TRANSITION_CONFIG.properties).toContain('box-shadow');
    });
  });
});
