import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CompanySizeSelect } from '../CompanySizeSelect';
import {
  COMPANY_SIZE_OPTIONS,
  ERROR_MESSAGES,
  ARIA_LABELS,
  TEST_IDS,
} from '../../../constants/profile';

describe('CompanySizeSelect', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  describe('基本表示', () => {
    it('正しくレンダリングされる', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('name', 'companySize');
    });

    it('ラベルが表示される', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      const label = screen.getByText('組織規模');
      expect(label).toBeInTheDocument();
    });

    it('全ての選択肢が表示される', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      COMPANY_SIZE_OPTIONS.forEach(option => {
        const optionElement = screen.getByText(option.label);
        expect(optionElement).toBeInTheDocument();
      });
    });

    it('初期値が正しく設定される', () => {
      render(<CompanySizeSelect {...defaultProps} value="11-50" />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT) as HTMLSelectElement;
      expect(select.value).toBe('11-50');
    });
  });

  describe('必須フラグ', () => {
    it('required=trueの場合、必須マークが表示される', () => {
      render(<CompanySizeSelect {...defaultProps} required />);

      const requiredMark = screen.getByText('*');
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveClass('profile-required-mark');
    });

    it('required=falseの場合、必須マークが表示されない', () => {
      render(<CompanySizeSelect {...defaultProps} required={false} />);

      const requiredMark = screen.queryByText('*');
      expect(requiredMark).not.toBeInTheDocument();
    });

    it('required属性が正しく設定される', () => {
      render(<CompanySizeSelect {...defaultProps} required />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveAttribute('required');
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合、選択が無効化される', () => {
      render(<CompanySizeSelect {...defaultProps} disabled />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toBeDisabled();
    });

    it('disabled=falseの場合、選択が有効', () => {
      render(<CompanySizeSelect {...defaultProps} disabled={false} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).not.toBeDisabled();
    });
  });

  describe('イベントハンドラー', () => {
    it('選択変更時にonChangeが呼ばれる', () => {
      const onChange = vi.fn();
      render(<CompanySizeSelect {...defaultProps} onChange={onChange} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      fireEvent.change(select, { target: { value: '51-200' } });

      expect(onChange).toHaveBeenCalledWith('51-200');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('フォーカス離脱時にonBlurが呼ばれる', () => {
      const onBlur = vi.fn();
      render(<CompanySizeSelect {...defaultProps} onBlur={onBlur} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      fireEvent.blur(select);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー表示', () => {
    it('エラーがない場合、エラーメッセージが表示されない', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      const errorMessage = screen.queryByTestId(`${TEST_IDS.COMPANY_SIZE_SELECT}-error`);
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('エラーがある場合、エラーメッセージが表示される', () => {
      const error = ERROR_MESSAGES.REQUIRED_COMPANY_SIZE;
      render(<CompanySizeSelect {...defaultProps} error={error} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.COMPANY_SIZE_SELECT}-error`);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(error);
    });

    it('エラー時にエラー用のクラスが適用される', () => {
      render(<CompanySizeSelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_COMPANY_SIZE} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveClass('profile-form-select-error');
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-labelが正しく設定される', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveAttribute('aria-label', ARIA_LABELS.COMPANY_SIZE_SELECT);
    });

    it('aria-requiredが正しく設定される', () => {
      render(<CompanySizeSelect {...defaultProps} required />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveAttribute('aria-required', 'true');
    });

    it('エラーがない場合、aria-invalidがfalse', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveAttribute('aria-invalid', 'false');
    });

    it('エラーがある場合、aria-invalidがtrue', () => {
      render(<CompanySizeSelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_COMPANY_SIZE} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラーメッセージとaria-describedbyで関連付けられる', () => {
      render(<CompanySizeSelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_COMPANY_SIZE} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      const errorMessage = screen.getByTestId(`${TEST_IDS.COMPANY_SIZE_SELECT}-error`);

      expect(select).toHaveAttribute('aria-describedby', 'company-size-error');
      expect(errorMessage).toHaveAttribute('id', 'company-size-error');
    });

    it('エラーメッセージにrole="alert"が設定される', () => {
      render(<CompanySizeSelect {...defaultProps} error={ERROR_MESSAGES.REQUIRED_COMPANY_SIZE} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.COMPANY_SIZE_SELECT}-error`);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('スタイリング', () => {
    it('基本的なクラスが適用される', () => {
      render(<CompanySizeSelect {...defaultProps} />);

      const select = screen.getByTestId(TEST_IDS.COMPANY_SIZE_SELECT);
      expect(select).toHaveClass('profile-form-select');
    });

    it('フィールドコンテナのクラスが適用される', () => {
      const { container } = render(<CompanySizeSelect {...defaultProps} />);

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('ラベルのクラスが適用される', () => {
      const { container } = render(<CompanySizeSelect {...defaultProps} />);

      const label = container.querySelector('.profile-form-label');
      expect(label).toBeInTheDocument();
    });
  });
});
