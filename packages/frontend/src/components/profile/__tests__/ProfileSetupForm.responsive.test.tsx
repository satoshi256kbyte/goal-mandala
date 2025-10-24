import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileSetupForm } from '../ProfileSetupForm';
import type { ProfileFormData } from '../../../types/profile';
import * as useProfileFormModule from '../../../hooks/useProfileForm';

// useProfileFormフックをモック
vi.mock('../../../hooks/useProfileForm');

/**
 * レスポンシブデザインのテスト
 *
 * 要件:
 * - 9.1: モバイル（< 768px）で1カラムレイアウト
 * - 9.2: タブレット（768px - 1024px）で適切な幅
 * - 9.3: デスクトップ（> 1024px）で中央配置・最大幅制限
 * - 9.4: モバイルでタッチ操作に適したボタンサイズ
 * - 9.5: モバイルでネイティブ選択UI
 * - 9.6: 画面サイズ変更時のレイアウト調整
 */
describe('ProfileSetupForm - レスポンシブデザイン', () => {
  // デフォルトのモック関数
  const mockSetFieldValue = vi.fn();
  const mockSetFieldTouched = vi.fn();
  const mockHandleSubmit = vi.fn();

  // デフォルトのフォームデータ
  const defaultFormData: ProfileFormData = {
    industry: 'it-communication',
    companySize: '11-50',
    jobTitle: 'エンジニア',
    position: 'マネージャー',
  };

  // デフォルトのuseProfileFormの戻り値
  const defaultUseProfileFormReturn = {
    formData: defaultFormData,
    errors: {},
    touched: {},
    isLoading: false,
    isSubmitting: false,
    error: null,
    successMessage: null,
    setFieldValue: mockSetFieldValue,
    setFieldTouched: mockSetFieldTouched,
    validateField: vi.fn(),
    validateForm: vi.fn(),
    handleSubmit: mockHandleSubmit,
    resetForm: vi.fn(),
    clearError: vi.fn(),
    clearSuccess: vi.fn(),
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();

    // useProfileFormのデフォルトモック実装
    vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue(defaultUseProfileFormReturn);
  });

  afterEach(() => {
    cleanup();
  });

  describe('モバイル表示のテスト（< 768px）', () => {
    beforeEach(() => {
      // モバイルサイズに設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE サイズ
      });
    });

    it('フォームコンテナに1カラムレイアウトのクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('max-w-2xl', 'mx-auto');
    });

    it('モバイル用のパディングクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      // px-4 はモバイル用の基本パディング
      expect(form).toHaveClass('px-4');
    });

    it('送信ボタンがフルワイドで表示される', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      // w-full はモバイルでフルワイド
      expect(submitButton).toHaveClass('w-full');
    });

    it('送信ボタンが最小44px × 44pxのタッチ操作に適したサイズである', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      // py-3 は上下12px、合計で44px以上を確保
      expect(submitButton).toHaveClass('py-3');
      expect(submitButton).toHaveClass('px-6');
    });

    it('セクションが縦方向に配置される', () => {
      const { container } = render(<ProfileSetupForm />);

      const sections = container.querySelectorAll('section');
      expect(sections).toHaveLength(2);

      // 各セクションにマージンボトムが設定されている
      sections.forEach(section => {
        expect(section).toHaveClass('mb-8');
      });
    });

    it('入力フィールドが縦方向に配置される', () => {
      const { container } = render(<ProfileSetupForm />);

      const fieldContainers = container.querySelectorAll('.space-y-6');
      expect(fieldContainers.length).toBeGreaterThan(0);
    });

    it('セクション内のフィールドが適切な間隔で配置される', () => {
      const { container } = render(<ProfileSetupForm />);

      // space-y-6 は各フィールド間に1.5remの間隔
      const organizationSection = container.querySelector('section');
      const fieldContainer = organizationSection?.querySelector('.space-y-6');
      expect(fieldContainer).toBeInTheDocument();
    });
  });

  describe('タブレット表示のテスト（768px - 1024px）', () => {
    beforeEach(() => {
      // タブレットサイズに設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // iPad サイズ
      });
    });

    it('フォームコンテナに中央寄せレイアウトが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('mx-auto');
    });

    it('タブレット用のパディングクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      // sm:px-6 はタブレット用のパディング
      expect(form).toHaveClass('sm:px-6');
    });

    it('最大幅が制限される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      // max-w-2xl は最大幅を42remに制限
      expect(form).toHaveClass('max-w-2xl');
    });

    it('送信ボタンが自動幅で表示される', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      // sm:w-auto はタブレット以上で自動幅
      expect(submitButton).toHaveClass('sm:w-auto');
    });

    it('送信ボタンに最小幅が設定される', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      // min-w-[200px] は最小幅200px
      expect(submitButton).toHaveClass('min-w-[200px]');
    });

    it('セクションが適切な幅で表示される', () => {
      const { container } = render(<ProfileSetupForm />);

      const sections = container.querySelectorAll('section');
      sections.forEach(section => {
        // セクションは親コンテナの幅に従う
        expect(section).toHaveClass('mb-8', 'p-6');
      });
    });
  });

  describe('デスクトップ表示のテスト（> 1024px）', () => {
    beforeEach(() => {
      // デスクトップサイズに設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920, // フルHD サイズ
      });
    });

    it('フォームコンテナに中央配置が適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('mx-auto');
    });

    it('デスクトップ用のパディングクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      // lg:px-8 はデスクトップ用のパディング
      expect(form).toHaveClass('lg:px-8');
    });

    it('最大幅が制限される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      // max-w-2xl は最大幅を42remに制限
      expect(form).toHaveClass('max-w-2xl');
    });

    it('送信ボタンが自動幅で表示される', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toHaveClass('sm:w-auto');
    });

    it('送信ボタンが右寄せで配置される', () => {
      const { container } = render(<ProfileSetupForm />);

      const buttonContainer = container.querySelector('.flex.justify-end');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('セクションが適切な間隔で配置される', () => {
      const { container } = render(<ProfileSetupForm />);

      const sections = container.querySelectorAll('section');
      sections.forEach(section => {
        expect(section).toHaveClass('mb-8');
      });
    });

    it('セクション内のコンテンツが適切にレイアウトされる', () => {
      const { container } = render(<ProfileSetupForm />);

      const sections = container.querySelectorAll('section');
      sections.forEach(section => {
        // セクションヘッダーとコンテンツの間に境界線
        const header = section.querySelector('.border-b');
        expect(header).toBeInTheDocument();
      });
    });
  });

  describe('画面サイズ変更のテスト', () => {
    it('モバイルからタブレットへのサイズ変更に対応する', () => {
      // モバイルサイズで初期レンダリング
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container, rerender } = render(<ProfileSetupForm />);

      let form = container.querySelector('form');
      expect(form).toHaveClass('px-4');

      // タブレットサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      rerender(<ProfileSetupForm />);

      form = container.querySelector('form');
      // Tailwindのレスポンシブクラスは両方適用される
      expect(form).toHaveClass('px-4', 'sm:px-6');
    });

    it('タブレットからデスクトップへのサイズ変更に対応する', () => {
      // タブレットサイズで初期レンダリング
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { container, rerender } = render(<ProfileSetupForm />);

      let form = container.querySelector('form');
      expect(form).toHaveClass('sm:px-6');

      // デスクトップサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      rerender(<ProfileSetupForm />);

      form = container.querySelector('form');
      // Tailwindのレスポンシブクラスは全て適用される
      expect(form).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });

    it('デスクトップからモバイルへのサイズ変更に対応する', () => {
      // デスクトップサイズで初期レンダリング
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      const { container, rerender } = render(<ProfileSetupForm />);

      let submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toHaveClass('w-full', 'sm:w-auto');

      // モバイルサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      rerender(<ProfileSetupForm />);

      submitButton = screen.getByRole('button', { name: /次へ/i });
      // クラスは変わらないが、CSSメディアクエリで適用される
      expect(submitButton).toHaveClass('w-full', 'sm:w-auto');
    });

    it('複数回のサイズ変更に対応する', () => {
      const sizes = [375, 768, 1024, 1920, 768, 375];

      const { container, rerender } = render(<ProfileSetupForm />);

      sizes.forEach(size => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: size,
        });

        rerender(<ProfileSetupForm />);

        const form = container.querySelector('form');
        expect(form).toBeInTheDocument();
        expect(form).toHaveClass('max-w-2xl', 'mx-auto');
      });
    });
  });

  describe('レスポンシブクラスの検証', () => {
    it('フォームコンテナに全てのレスポンシブクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass(
        'max-w-2xl', // 最大幅制限
        'mx-auto', // 中央寄せ
        'px-4', // モバイルパディング
        'sm:px-6', // タブレットパディング
        'lg:px-8', // デスクトップパディング
        'py-8' // 上下パディング
      );
    });

    it('送信ボタンに全てのレスポンシブクラスが適用される', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toHaveClass(
        'w-full', // モバイルでフルワイド
        'sm:w-auto', // タブレット以上で自動幅
        'min-w-[200px]', // 最小幅
        'py-3', // 上下パディング（タッチ操作対応）
        'px-6' // 左右パディング
      );
    });

    it('セクションに適切なスペーシングクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const sections = container.querySelectorAll('section');
      sections.forEach(section => {
        expect(section).toHaveClass(
          'mb-8', // セクション間のマージン
          'p-6', // セクション内のパディング
          'bg-white', // 背景色
          'rounded-lg', // 角丸
          'shadow-sm' // 影
        );
      });
    });

    it('フィールドコンテナに適切なスペーシングクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const fieldContainers = container.querySelectorAll('.space-y-6');
      expect(fieldContainers.length).toBeGreaterThan(0);

      fieldContainers.forEach(container => {
        expect(container).toHaveClass('space-y-6');
      });
    });

    it('セクションヘッダーに適切なスタイリングクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const headers = container.querySelectorAll('.border-b');
      expect(headers.length).toBeGreaterThan(0);

      headers.forEach(header => {
        expect(header).toHaveClass('border-b', 'border-gray-200', 'pb-4', 'mb-6');
      });
    });
  });

  describe('ブレークポイント境界値のテスト', () => {
    it('767px（モバイル最大）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('px-4');
    });

    it('768px（タブレット最小）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('sm:px-6');
    });

    it('1023px（タブレット最大）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1023,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('sm:px-6');
    });

    it('1024px（デスクトップ最小）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('lg:px-8');
    });
  });

  describe('特殊なデバイスサイズのテスト', () => {
    it('iPhone SE（375px）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('px-4');
    });

    it('iPad（768px）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('sm:px-6');
    });

    it('iPad Pro（1024px）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('lg:px-8');
    });

    it('フルHD（1920px）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('max-w-2xl', 'mx-auto');
    });

    it('4K（3840px）で正しく表示される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 3840,
      });

      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
      // 最大幅が制限されているため、中央に配置される
      expect(form).toHaveClass('max-w-2xl', 'mx-auto');
    });
  });
});
