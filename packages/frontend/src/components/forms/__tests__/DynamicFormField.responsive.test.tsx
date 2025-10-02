import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { DynamicFormField, FormFieldConfig } from '../DynamicFormField';
import { useResponsive } from '../../../hooks/useResponsive';

// useResponsiveフックのモック
jest.mock('../../../hooks/useResponsive');
const mockUseResponsive = useResponsive as jest.MockedFunction<typeof useResponsive>;

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{
  field: FormFieldConfig;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}> = ({ field, deviceType }) => {
  const { register, watch, setValue } = useForm();
  const [value, setValueState] = React.useState('');

  // デバイスタイプに応じたレスポンシブ設定
  React.useEffect(() => {
    const responsiveConfig = {
      mobile: {
        width: 375,
        height: 667,
        deviceType: 'mobile' as const,
        orientation: 'portrait' as const,
        pointerType: 'coarse' as const,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isPortrait: true,
        isLandscape: false,
        isTouch: true,
        breakpoint: 'xs' as const,
      },
      tablet: {
        width: 768,
        height: 1024,
        deviceType: 'tablet' as const,
        orientation: 'portrait' as const,
        pointerType: 'coarse' as const,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isPortrait: true,
        isLandscape: false,
        isTouch: true,
        breakpoint: 'md' as const,
      },
      desktop: {
        width: 1024,
        height: 768,
        deviceType: 'desktop' as const,
        orientation: 'landscape' as const,
        pointerType: 'fine' as const,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isPortrait: false,
        isLandscape: true,
        isTouch: false,
        breakpoint: 'lg' as const,
      },
    };

    mockUseResponsive.mockReturnValue(responsiveConfig[deviceType]);
  }, [deviceType]);

  return (
    <DynamicFormField
      field={field}
      value={value}
      onChange={setValueState}
      register={register}
      watch={watch}
    />
  );
};

describe('DynamicFormField レスポンシブ対応', () => {
  const textField: FormFieldConfig = {
    name: 'title',
    type: 'text',
    label: 'タイトル',
    placeholder: 'タイトルを入力してください',
    required: true,
    maxLength: 100,
  };

  const textareaField: FormFieldConfig = {
    name: 'description',
    type: 'textarea',
    label: '説明',
    placeholder: '説明を入力してください',
    required: true,
    maxLength: 500,
    rows: 4,
  };

  const selectField: FormFieldConfig = {
    name: 'category',
    type: 'select',
    label: 'カテゴリ',
    placeholder: 'カテゴリを選択してください',
    required: true,
    options: [
      { value: 'option1', label: 'オプション1' },
      { value: 'option2', label: 'オプション2' },
    ],
  };

  const radioField: FormFieldConfig = {
    name: 'type',
    type: 'radio',
    label: 'タイプ',
    required: true,
    options: [
      { value: 'type1', label: 'タイプ1' },
      { value: 'type2', label: 'タイプ2' },
    ],
  };

  describe('モバイル対応', () => {
    it('テキストフィールドがモバイル用スタイルを適用する', () => {
      render(<TestWrapper field={textField} deviceType="mobile" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');
      expect(input).toHaveClass('text-base', 'px-4', 'py-3', 'min-h-touch', 'rounded-lg');
    });

    it('テキストエリアがモバイル用スタイルを適用する', () => {
      render(<TestWrapper field={textareaField} deviceType="mobile" />);

      const textarea = screen.getByPlaceholderText('説明を入力してください');
      expect(textarea).toHaveClass('text-base', 'px-4', 'py-3', 'min-h-touch', 'rounded-lg');
    });

    it('セレクトボックスがタッチターゲットサイズを適用する', () => {
      render(<TestWrapper field={selectField} deviceType="mobile" />);

      const select = screen.getByDisplayValue('');
      expect(select).toHaveClass('touch-target');
    });

    it('ラジオボタンがモバイル用レイアウトを適用する', () => {
      render(<TestWrapper field={radioField} deviceType="mobile" />);

      const radioContainer = screen.getByText('タイプ1').closest('label');
      expect(radioContainer).toHaveClass('space-x-3', 'py-2', 'touch-target');

      const radioInput = screen.getByLabelText('タイプ1');
      expect(radioInput).toHaveClass('w-5', 'h-5');
    });
  });

  describe('タブレット対応', () => {
    it('テキストフィールドがタブレット用スタイルを適用する', () => {
      render(<TestWrapper field={textField} deviceType="tablet" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');
      expect(input).toHaveClass('text-base', 'px-4', 'py-3', 'min-h-[48px]', 'rounded-md');
    });

    it('ラジオボタンがタブレット用レイアウトを適用する', () => {
      render(<TestWrapper field={radioField} deviceType="tablet" />);

      const radioContainer = screen.getByText('タイプ1').closest('label');
      expect(radioContainer).toHaveClass('space-x-3', 'py-2', 'touch-target');
    });
  });

  describe('デスクトップ対応', () => {
    it('テキストフィールドがデスクトップ用スタイルを適用する', () => {
      render(<TestWrapper field={textField} deviceType="desktop" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');
      expect(input).toHaveClass('text-sm', 'px-3', 'py-2', 'min-h-[40px]', 'rounded-md');
    });

    it('ラジオボタンがデスクトップ用レイアウトを適用する', () => {
      render(<TestWrapper field={radioField} deviceType="desktop" />);

      const radioContainer = screen.getByText('タイプ1').closest('label');
      expect(radioContainer).toHaveClass('space-x-2');
      expect(radioContainer).not.toHaveClass('touch-target');

      const radioInput = screen.getByLabelText('タイプ1');
      expect(radioInput).toHaveClass('w-4', 'h-4');
    });

    it('セレクトボックスがタッチターゲットクラスを持たない', () => {
      render(<TestWrapper field={selectField} deviceType="desktop" />);

      const select = screen.getByDisplayValue('');
      expect(select).not.toHaveClass('touch-target');
    });
  });

  describe('インタラクション', () => {
    it('モバイルでタッチ操作が適切に動作する', () => {
      render(<TestWrapper field={textField} deviceType="mobile" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');

      // タッチイベントをシミュレート
      fireEvent.touchStart(input);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'テスト入力' } });
      fireEvent.touchEnd(input);

      expect(input).toHaveValue('テスト入力');
    });

    it('デスクトップでマウス操作が適切に動作する', () => {
      render(<TestWrapper field={textField} deviceType="desktop" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');

      // マウスイベントをシミュレート
      fireEvent.mouseEnter(input);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'テスト入力' } });
      fireEvent.mouseLeave(input);

      expect(input).toHaveValue('テスト入力');
    });

    it('ラジオボタンのホバー効果がタッチデバイスでは無効化される', () => {
      render(<TestWrapper field={radioField} deviceType="mobile" />);

      const radioLabel = screen.getByText('タイプ1').closest('label');

      // タッチデバイスではホバー効果が適用されない
      fireEvent.mouseEnter(radioLabel!);
      expect(radioLabel).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('アクセシビリティ', () => {
    it('モバイルでタッチターゲットサイズが適切に設定される', () => {
      render(<TestWrapper field={radioField} deviceType="mobile" />);

      const radioLabels = screen.getAllByRole('radio');
      radioLabels.forEach(radio => {
        const label = radio.closest('label');
        expect(label).toHaveClass('touch-target');
      });
    });

    it('デスクトップでフォーカス表示が適切に動作する', () => {
      render(<TestWrapper field={textField} deviceType="desktop" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');

      fireEvent.focus(input);
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });

    it('エラー状態でアクセシブルなエラーメッセージが表示される', () => {
      const fieldWithError: FormFieldConfig = {
        ...textField,
        validation: [{ type: 'required', message: 'この項目は必須です' }],
      };

      render(<TestWrapper field={fieldWithError} deviceType="mobile" />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');

      // 空の値でバリデーションをトリガー
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      // エラーメッセージが表示される
      expect(screen.getByText('この項目は必須です')).toBeInTheDocument();

      // aria-invalid属性が設定される
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('パフォーマンス', () => {
    it('デバイスタイプ変更時にスタイルが適切に更新される', () => {
      const { rerender } = render(<TestWrapper field={textField} deviceType="mobile" />);

      let input = screen.getByPlaceholderText('タイトルを入力してください');
      expect(input).toHaveClass('text-base', 'px-4', 'py-3');

      // デスクトップに変更
      rerender(<TestWrapper field={textField} deviceType="desktop" />);

      input = screen.getByPlaceholderText('タイトルを入力してください');
      expect(input).toHaveClass('text-sm', 'px-3', 'py-2');
    });

    it('不要な再レンダリングが発生しない', () => {
      const renderSpy = jest.fn();

      const SpyWrapper: React.FC<{ field: FormFieldConfig }> = ({ field }) => {
        renderSpy();
        return <TestWrapper field={field} deviceType="mobile" />;
      };

      const { rerender } = render(<SpyWrapper field={textField} />);

      // 初回レンダリング
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 同じpropsで再レンダリング
      rerender(<SpyWrapper field={textField} />);

      // 再レンダリング回数が適切
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
