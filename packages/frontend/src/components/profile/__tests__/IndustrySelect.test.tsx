import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IndustrySelect } from '../IndustrySelect';
import {
  INDUSTRY_OPTIONS,
  ERROR_MESSAGES,
  ARIA_LABELS,
  TEST_IDS,
} from '../../../constants/profile';

describe('IndustrySelect', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  describe('基本表示', () => {
    it('正しくレンダリングされる', () => {
      render(<IndustrySelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('name', 'industry');
    });

    it('ラベルが表示される', () => {
      render(<IndustrySelect {...defaultProps} />);

      const label = screen.getByText('業種');
      expect(label).toBeInTheDocument();
    });

    it('全ての選択肢が表示される', () => {
      render(<IndustrySelect {...defaultProps} />);

      INDUSTRY_OPTIONS.forEach(option => {
        const optionElement = screen.getByText(option.label);
        expect(optionElement).toBeInTheDocument();
      });
    });

    it('初期値が正しく設定される', () => {
      render(<IndustrySelect {...defaultProps} value="it-communication" />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT) as HTMLSelectElement;
      expect(select.value).toBe('it-communication');
    });
  });

  describe('必須フラグ', () => {
    it('required=trueの場合、必須マークが表示される', () => {
      render(<IndustrySelect {...defaultProps} required />);

      const requiredMark = screen.getByText('*');
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveClass('profile-required-mark');
    });

    it('required=falseの場合、必須マークが表示されない', () => {
      render(<IndustrySelect {...defaultProps} required={false} />);

      const requiredMark = screen.queryByText('*');
      expect(requiredMark).not.toBeInTheDocument();
    });

    it('required属性が正しく設定される', () => {
      render(<IndustrySelect {...defaultProps} required />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveAttribute('required');
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合、選択が無効化される', () => {
      render(<IndustrySelect {...defaultProps} disabled />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toBeDisabled();
    });

    it('disabled=falseの場合、選択が有効', () => {
      render(<IndustrySelect {...defaultProps} disabled={false} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).not.toBeDisabled();
    });
  });

  describe('イベントハンドラー', () => {
    it('選択変更時にonChangeが呼ばれる', () => {
      const onChange = vi.fn();
      render(<IndustrySelect {...defaultProps} onChange={onChange} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      fireEvent.change(select, { target: { value: 'it-communication' } });

      expect(onChange).toHaveBeenCalledWith('it-communication');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('フォーカス離脱時にonBlurが呼ばれる', () => {
      const onBlur = vi.fn();
      render(<IndustrySelect {...defaultProps} onBlur={onBlur} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      fireEvent.blur(select);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー表示', () => {
    it('エラーがない場合、エラーメッセージが表示されない', () => {
      render(<IndustrySelect {...defaultProps} />);

      const errorMessage = screen.queryByTestId(`${TEST_IDS.INDUSTRY_SELECT}-error`);
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('エラーがある場合、エラーメッセージが表示される', () => {
      const error = ERROR_MESSAGES.REQUIRED_INDUSTRY;
      render(<IndustrySelect {...defaultProps} error={error} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.INDUSTRY_SELECT}-error`);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(error);
    });

    it('エラー時にエラー用のクラスが適用される', () => {
      render(<IndustrySelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_INDUSTRY} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveClass('profile-form-select-error');
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-labelが正しく設定される', () => {
      render(<IndustrySelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveAttribute('aria-label', ARIA_LABELS.INDUSTRY_SELECT);
    });

    it('aria-requiredが正しく設定される', () => {
      render(<IndustrySelect {...defaultProps} required />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveAttribute('aria-required', 'true');
    });

    it('エラーがない場合、aria-invalidがfalse', () => {
      render(<IndustrySelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveAttribute('aria-invalid', 'false');
    });

    it('エラーがある場合、aria-invalidがtrue', () => {
      render(<IndustrySelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_INDUSTRY} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラーメッセージとaria-describedbyで関連付けられる', () => {
      render(<IndustrySelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_INDUSTRY} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      const errorMessage = screen.getByTestId(`${TEST_IDS.INDUSTRY_SELECT}-error`);

      expect(select).toHaveAttribute('aria-describedby', 'industry-error');
      expect(errorMessage).toHaveAttribute('id', 'industry-error');
    });

    it('エラーメッセージにrole="alert"が設定される', () => {
      render(<IndustrySelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_INDUSTRY} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.INDUSTRY_SELECT}-error`);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('スタイリング', () => {
    it('基本的なクラスが適用される', () => {
      render(<IndustrySelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.INDUSTRY_SELECT);
      expect(select).toHaveClass('profile-form-select');
    });

    it('フィールドコンテナのクラスが適用される', () => {
      const { container } = render(<IndustrySelect {...defaultProps} />);

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('ラベルのクラスが適用される', () => {
      const { container } = render(<IndustrySelect {...defaultProps} />);

      const label = container.querySelector('.profile-form-label');
      expect(label).toBeInTheDocument();
    });
  });
});
