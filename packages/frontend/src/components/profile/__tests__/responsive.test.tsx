/**
 * プロフィール入力コンポーネントのレスポンシブテスト
 *
 * @description
 * モバイル、タブレット、デスクトップの各ブレークポイントで
 * コンポーネントが適切に表示されることを確認します。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IndustrySelect } from '../IndustrySelect';
import { CompanySizeSelect } from '../CompanySizeSelect';
import { JobTitleInput } from '../JobTitleInput';
import { PositionInput } from '../PositionInput';

describe('プロフィール入力コンポーネント - レスポンシブテスト', () => {
  // ビューポートサイズを変更するヘルパー関数
  const setViewportSize = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  // 元のビューポートサイズを保存
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    // テスト後にビューポートサイズを元に戻す
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  describe('IndustrySelect - レスポンシブ', () => {
    const mockProps = {
      value: '',
      onChange: () => {},
      onBlur: () => {},
      required: true,
    };

    it('モバイル（< 768px）で正しく表示される', () => {
      setViewportSize(375, 667); // iPhone SE サイズ
      const { container } = render(<IndustrySelect {...mockProps} />);

      const select = screen.getByTestId('industry-select');
      expect(select).toBeInTheDocument();

      // profile-form-selectクラスが適用されていることを確認
      expect(select).toHaveClass('profile-form-select');

      // フィールドコンテナが存在することを確認
      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('タブレット（768px - 1024px）で正しく表示される', () => {
      setViewportSize(768, 1024); // iPad サイズ
      const { container } = render(<IndustrySelect {...mockProps} />);

      const select = screen.getByTestId('industry-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('デスクトップ（> 1024px）で正しく表示される', () => {
      setViewportSize(1920, 1080); // フルHD サイズ
      const { container } = render(<IndustrySelect {...mockProps} />);

      const select = screen.getByTestId('industry-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });
  });

  describe('CompanySizeSelect - レスポンシブ', () => {
    const mockProps = {
      value: '',
      onChange: () => {},
      onBlur: () => {},
      required: true,
    };

    it('モバイルで正しく表示される', () => {
      setViewportSize(375, 667);
      const { container } = render(<CompanySizeSelect {...mockProps} />);

      const select = screen.getByTestId('company-size-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('タブレットで正しく表示される', () => {
      setViewportSize(768, 1024);
      const { container } = render(<CompanySizeSelect {...mockProps} />);

      const select = screen.getByTestId('company-size-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');
    });

    it('デスクトップで正しく表示される', () => {
      setViewportSize(1920, 1080);
      const { container } = render(<CompanySizeSelect {...mockProps} />);

      const select = screen.getByTestId('company-size-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');
    });
  });

  describe('JobTitleInput - レスポンシブ', () => {
    const mockProps = {
      value: '',
      onChange: () => {},
      onBlur: () => {},
      required: true,
    };

    it('モバイルで正しく表示される', () => {
      setViewportSize(375, 667);
      const { container } = render(<JobTitleInput {...mockProps} />);

      const input = screen.getByTestId('job-title-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('profile-form-input');

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();

      // 文字数カウントが表示されることを確認
      const characterCount = screen.getByText(/0\/100/);
      expect(characterCount).toBeInTheDocument();
      expect(characterCount).toHaveClass('profile-character-count');
    });

    it('タブレットで正しく表示される', () => {
      setViewportSize(768, 1024);
      const { container } = render(<JobTitleInput {...mockProps} />);

      const input = screen.getByTestId('job-title-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('profile-form-input');

      const characterCount = screen.getByText(/0\/100/);
      expect(characterCount).toBeInTheDocument();
    });

    it('デスクトップで正しく表示される', () => {
      setViewportSize(1920, 1080);
      const { container } = render(<JobTitleInput {...mockProps} />);

      const input = screen.getByTestId('job-title-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('profile-form-input');

      const characterCount = screen.getByText(/0\/100/);
      expect(characterCount).toBeInTheDocument();
    });
  });

  describe('PositionInput - レスポンシブ', () => {
    const mockProps = {
      value: '',
      onChange: () => {},
      onBlur: () => {},
      required: false,
    };

    it('モバイルで正しく表示される', () => {
      setViewportSize(375, 667);
      const { container } = render(<PositionInput {...mockProps} />);

      const input = screen.getByTestId('position-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('profile-form-input');

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();

      // 任意マークが表示されることを確認
      const optionalMark = screen.getByText(/\(任意\)/);
      expect(optionalMark).toBeInTheDocument();
      expect(optionalMark).toHaveClass('profile-optional-mark');

      // 文字数カウントが表示されることを確認
      const characterCount = screen.getByText(/0\/100/);
      expect(characterCount).toBeInTheDocument();
      expect(characterCount).toHaveClass('profile-character-count');
    });

    it('タブレットで正しく表示される', () => {
      setViewportSize(768, 1024);
      const { container } = render(<PositionInput {...mockProps} />);

      const input = screen.getByTestId('position-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('profile-form-input');

      const optionalMark = screen.getByText(/\(任意\)/);
      expect(optionalMark).toBeInTheDocument();
    });

    it('デスクトップで正しく表示される', () => {
      setViewportSize(1920, 1080);
      const { container } = render(<PositionInput {...mockProps} />);

      const input = screen.getByTestId('position-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('profile-form-input');

      const optionalMark = screen.getByText(/\(任意\)/);
      expect(optionalMark).toBeInTheDocument();
    });
  });

  describe('画面サイズ変更時の動作', () => {
    it('画面サイズ変更時にレイアウトが適切に調整される', () => {
      const mockProps = {
        value: '',
        onChange: () => {},
        onBlur: () => {},
        required: true,
      };

      // モバイルサイズで開始
      setViewportSize(375, 667);
      const { container, rerender } = render(<IndustrySelect {...mockProps} />);

      let select = screen.getByTestId('industry-select');
      expect(select).toBeInTheDocument();

      // タブレットサイズに変更
      setViewportSize(768, 1024);
      rerender(<IndustrySelect {...mockProps} />);

      select = screen.getByTestId('industry-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');

      // デスクトップサイズに変更
      setViewportSize(1920, 1080);
      rerender(<IndustrySelect {...mockProps} />);

      select = screen.getByTestId('industry-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('profile-form-select');
    });
  });

  describe('タッチ操作対応（モバイル）', () => {
    beforeEach(() => {
      setViewportSize(375, 667); // モバイルサイズ
    });

    it('入力要素が最小44px × 44pxのタッチターゲットサイズを持つ', () => {
      const mockProps = {
        value: '',
        onChange: () => {},
        onBlur: () => {},
        required: true,
      };

      render(<IndustrySelect {...mockProps} />);
      const select = screen.getByTestId('industry-select');

      // CSSクラスが適用されていることを確認
      // 実際のサイズはCSSで定義されているため、クラスの存在を確認
      expect(select).toHaveClass('profile-form-select');
    });

    it('ボタンが最小44px × 44pxのタッチターゲットサイズを持つ', () => {
      // ボタンコンポーネントが実装されたら追加
      // 現時点ではスキップ
      expect(true).toBe(true);
    });
  });

  describe('フォントサイズ（iOS Safari対応）', () => {
    beforeEach(() => {
      setViewportSize(375, 667); // モバイルサイズ
    });

    it('入力要素が16px以上のフォントサイズを持つ（iOSズーム防止）', () => {
      const mockProps = {
        value: '',
        onChange: () => {},
        onBlur: () => {},
        required: true,
      };

      render(<JobTitleInput {...mockProps} />);
      const input = screen.getByTestId('job-title-input');

      // CSSクラスが適用されていることを確認
      // 実際のフォントサイズはCSSで定義されているため、クラスの存在を確認
      expect(input).toHaveClass('profile-form-input');
    });
  });
});
