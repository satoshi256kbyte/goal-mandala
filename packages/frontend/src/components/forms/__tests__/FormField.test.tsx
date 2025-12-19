import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormField, FormFieldGroup } from '../FormField';

describe('FormField', () => {
  describe('基本機能', () => {
    it('ラベルを表示する', () => {
      render(
        <FormField label="テストフィールド">
          <input type="text" />
        </FormField>
      );

      expect(screen.getByText('テストフィールド')).toBeInTheDocument();
    });

    it('必須マークを表示する', () => {
      render(
        <FormField label="テストフィールド" required>
          <input type="text" />
        </FormField>
      );

      expect(screen.getByLabelText('必須')).toBeInTheDocument();
    });

    it('ヘルプテキストを表示する', () => {
      render(
        <FormField label="テストフィールド" helpText="これはヘルプテキストです">
          <input type="text" />
        </FormField>
      );

      expect(screen.getByText('これはヘルプテキストです')).toBeInTheDocument();
    });

    it('エラーメッセージを表示する', () => {
      render(
        <FormField label="テストフィールド" error="エラーが発生しました">
          <input type="text" />
        </FormField>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('子要素をレンダリングする', () => {
      render(
        <FormField label="テストフィールド">
          <input type="text" placeholder="テスト入力" />
        </FormField>
      );

      expect(screen.getByPlaceholderText('テスト入力')).toBeInTheDocument();
    });
  });

  describe('バリデーション状態', () => {
    it('バリデーション中の状態を表示する', () => {
      render(
        <FormField
          label="テストフィールド"
          validationState={{ isValid: false, isValidating: true }}
        >
          <input type="text" />
        </FormField>
      );

      expect(screen.getByText('確認中...')).toBeInTheDocument();
    });

    it('バリデーション成功の状態を表示する', () => {
      render(
        <FormField label="テストフィールド" validationState={{ isValid: true }}>
          <input type="text" />
        </FormField>
      );

      // バリデーション成功のアイコンが表示される
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('バリデーションエラーの状態を表示する', () => {
      render(
        <FormField
          label="テストフィールド"
          validationState={{ isValid: false, error: 'バリデーションエラー' }}
        >
          <input type="text" />
        </FormField>
      );

      expect(screen.getByText('バリデーションエラー')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-describedby属性を設定する', () => {
      render(
        <FormField label="テストフィールド" helpText="ヘルプテキスト">
          <input type="text" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('エラー時にaria-invalid属性を設定する', () => {
      render(
        <FormField label="テストフィールド" error="エラー">
          <input type="text" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('ラベルとinputを関連付ける', () => {
      render(
        <FormField label="テストフィールド">
          <input type="text" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
    });
  });

  describe('コールバック', () => {
    it('onFocusコールバックを呼び出す', async () => {
      const onFocus = vi.fn();
      const user = userEvent.setup();

      render(
        <FormField label="テストフィールド" onFocus={onFocus}>
          <input type="text" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(onFocus).toHaveBeenCalled();
    });

    it('onBlurコールバックを呼び出す', async () => {
      const onBlur = vi.fn();
      const user = userEvent.setup();

      render(
        <FormField label="テストフィールド" onBlur={onBlur}>
          <input type="text" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('子要素がnullの場合を処理する', () => {
      render(<FormField label="テストフィールド">{null}</FormField>);

      expect(screen.getByText('無効なフィールドコンポーネントです')).toBeInTheDocument();
    });

    it('エラーとヘルプテキストが両方ある場合、エラーを優先する', () => {
      render(
        <FormField label="テストフィールド" error="エラーメッセージ" helpText="ヘルプテキスト">
          <input type="text" />
        </FormField>
      );

      expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
      expect(screen.queryByText('ヘルプテキスト')).not.toBeInTheDocument();
    });

    it('カスタムクラス名を適用できる', () => {
      const { container } = render(
        <FormField label="テストフィールド" className="custom-class">
          <input type="text" />
        </FormField>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('FormFieldGroup', () => {
  describe('基本機能', () => {
    it('タイトルを表示する', () => {
      render(
        <FormFieldGroup title="グループタイトル">
          <div>コンテンツ</div>
        </FormFieldGroup>
      );

      expect(screen.getByText('グループタイトル')).toBeInTheDocument();
    });

    it('説明を表示する', () => {
      render(
        <FormFieldGroup description="グループの説明">
          <div>コンテンツ</div>
        </FormFieldGroup>
      );

      expect(screen.getByText('グループの説明')).toBeInTheDocument();
    });

    it('子要素をレンダリングする', () => {
      render(
        <FormFieldGroup>
          <div>テストコンテンツ</div>
        </FormFieldGroup>
      );

      expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
    });

    it('エラー状態のスタイルを適用する', () => {
      const { container } = render(
        <FormFieldGroup hasError>
          <div>コンテンツ</div>
        </FormFieldGroup>
      );

      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toHaveClass('border-red-200');
    });

    it('カスタムクラス名を適用できる', () => {
      const { container } = render(
        <FormFieldGroup className="custom-class">
          <div>コンテンツ</div>
        </FormFieldGroup>
      );

      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toHaveClass('custom-class');
    });
  });

  describe('エッジケース', () => {
    it('タイトルなしでレンダリングできる', () => {
      render(
        <FormFieldGroup>
          <div>コンテンツ</div>
        </FormFieldGroup>
      );

      expect(screen.getByText('コンテンツ')).toBeInTheDocument();
    });

    it('説明なしでレンダリングできる', () => {
      render(
        <FormFieldGroup title="タイトル">
          <div>コンテンツ</div>
        </FormFieldGroup>
      );

      expect(screen.getByText('タイトル')).toBeInTheDocument();
      expect(screen.getByText('コンテンツ')).toBeInTheDocument();
    });

    it('複数の子要素をレンダリングできる', () => {
      render(
        <FormFieldGroup>
          <div>コンテンツ1</div>
          <div>コンテンツ2</div>
          <div>コンテンツ3</div>
        </FormFieldGroup>
      );

      expect(screen.getByText('コンテンツ1')).toBeInTheDocument();
      expect(screen.getByText('コンテンツ2')).toBeInTheDocument();
      expect(screen.getByText('コンテンツ3')).toBeInTheDocument();
    });
  });
});
