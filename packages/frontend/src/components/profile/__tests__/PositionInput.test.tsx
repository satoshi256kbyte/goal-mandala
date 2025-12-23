import { render, cleanup, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { PositionInput } from '../PositionInput';
import {
  ERROR_MESSAGES,
  PLACEHOLDERS,
  MAX_LENGTH,
  ARIA_LABELS,
  TEST_IDS,
} from '../../../constants/profile';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('PositionInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  describe('基本表示', () => {
    it('正しくレンダリングされる', () => {
      render(<PositionInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'position');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('ラベルが表示される', () => {
      render(<PositionInput {...defaultProps} />);

      const label = screen.getByText('役職');
      expect(label).toBeInTheDocument();
    });

    it('任意マークが表示される', () => {
      render(<PositionInput {...defaultProps} />);

      const optionalMark = screen.getByText('(任意)');
      expect(optionalMark).toBeInTheDocument();
      expect(optionalMark).toHaveClass('profile-optional-mark');
    });

    it('プレースホルダーが表示される', () => {
      render(<PositionInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('placeholder', PLACEHOLDERS.POSITION);
    });

    it('初期値が正しく設定される', () => {
      render(<PositionInput {...defaultProps} value="マネージャー" />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT) as HTMLInputElement;
      expect(input.value).toBe('マネージャー');
    });

    it('文字数カウントが表示される', () => {
      render(<PositionInput {...defaultProps} value="テスト" />);

      const characterCount = screen.getByText(`3/${MAX_LENGTH.POSITION}`);
      expect(characterCount).toBeInTheDocument();
    });
  });

  describe('必須フラグ', () => {
    it('required=trueの場合、必須マークが表示される', () => {
      render(<PositionInput {...defaultProps} required />);

      const requiredMark = screen.getByText('*');
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveClass('profile-required-mark');
    });

    it('required=trueの場合、任意マークは表示されない', () => {
      render(<PositionInput {...defaultProps} required />);

      const optionalMark = screen.queryByText('(任意)');
      expect(optionalMark).not.toBeInTheDocument();
    });

    it('required=falseの場合、必須マークが表示されない', () => {
      render(<PositionInput {...defaultProps} required={false} />);

      const requiredMark = screen.queryByText('*');
      expect(requiredMark).not.toBeInTheDocument();
    });

    it('required=falseの場合、任意マークが表示される', () => {
      render(<PositionInput {...defaultProps} required={false} />);

      const optionalMark = screen.getByText('(任意)');
      expect(optionalMark).toBeInTheDocument();
    });

    it('required属性が正しく設定される', () => {
      render(<PositionInput {...defaultProps} required />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('required');
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合、入力が無効化される', () => {
      render(<PositionInput {...defaultProps} disabled />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toBeDisabled();
    });

    it('disabled=falseの場合、入力が有効', () => {
      render(<PositionInput {...defaultProps} disabled={false} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).not.toBeDisabled();
    });
  });

  describe('イベントハンドラー', () => {
    it('入力変更時にonChangeが呼ばれる', () => {
      const onChange = vi.fn();
      render(<PositionInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      fireEvent.change(input, { target: { value: 'マネージャー' } });

      expect(onChange).toHaveBeenCalledWith('マネージャー');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('フォーカス離脱時にonBlurが呼ばれる', () => {
      const onBlur = vi.fn();
      render(<PositionInput {...defaultProps} onBlur={onBlur} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('文字数制限', () => {
    it('maxLength属性が正しく設定される', () => {
      render(<PositionInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('maxLength', MAX_LENGTH.POSITION.toString());
    });

    it('カスタムmaxLengthが設定できる', () => {
      render(<PositionInput {...defaultProps} maxLength={50} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('maxLength', '50');
    });

    it('最大文字数を超える入力は制限される', () => {
      const onChange = vi.fn();
      render(<PositionInput {...defaultProps} value="" onChange={onChange} maxLength={10} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      fireEvent.change(input, { target: { value: '12345678901' } }); // 11文字

      // 最大文字数を超えているのでonChangeは呼ばれない
      expect(onChange).not.toHaveBeenCalled();
    });

    it('最大文字数以内の入力は許可される', () => {
      const onChange = vi.fn();
      render(<PositionInput {...defaultProps} value="" onChange={onChange} maxLength={10} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      fireEvent.change(input, { target: { value: '1234567890' } }); // 10文字

      expect(onChange).toHaveBeenCalledWith('1234567890');
    });

    it('文字数が80%を超えると警告スタイルが適用される', () => {
      const longValue = 'a'.repeat(81);
      const { container } = render(
        <PositionInput {...defaultProps} value={longValue} maxLength={100} />
      );

      const characterCount = container.querySelector('.profile-character-count-warning');
      expect(characterCount).toBeInTheDocument();
    });

    it('文字数が80%以下の場合、警告スタイルは適用されない', () => {
      const shortValue = 'a'.repeat(79);
      const { container } = render(
        <PositionInput {...defaultProps} value={shortValue} maxLength={100} />
      );

      const characterCount = container.querySelector('.profile-character-count-warning');
      expect(characterCount).not.toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('エラーがない場合、エラーメッセージが表示されない', () => {
      render(<PositionInput {...defaultProps} />);

      const errorMessage = screen.queryByTestId(`${TEST_IDS.POSITION_INPUT}-error`);
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('エラーがある場合、エラーメッセージが表示される', () => {
      const error = ERROR_MESSAGES.MAX_LENGTH_POSITION;
      render(<PositionInput {...defaultProps} error={error} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.POSITION_INPUT}-error`);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(error);
    });

    it('エラー時にエラー用のクラスが適用される', () => {
      render(<PositionInput {...defaultProps} error={ERROR_MESSAGES.MAX_LENGTH_POSITION} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveClass('profile-form-input-error');
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-labelが正しく設定される', () => {
      render(<PositionInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('aria-label', ARIA_LABELS.POSITION_INPUT);
    });

    it('aria-requiredが正しく設定される', () => {
      render(<PositionInput {...defaultProps} required />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('エラーがない場合、aria-invalidがfalse', () => {
      render(<PositionInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('エラーがある場合、aria-invalidがtrue', () => {
      render(<PositionInput {...defaultProps} error={ERROR_MESSAGES.MAX_LENGTH_POSITION} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラーメッセージとaria-describedbyで関連付けられる', () => {
      render(<PositionInput {...defaultProps} error={ERROR_MESSAGES.MAX_LENGTH_POSITION} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      const errorMessage = screen.getByTestId(`${TEST_IDS.POSITION_INPUT}-error`);

      expect(input).toHaveAttribute('aria-describedby', 'position-error');
      expect(errorMessage).toHaveAttribute('id', 'position-error');
    });

    it('エラーメッセージにrole="alert"が設定される', () => {
      render(<PositionInput {...defaultProps} error={ERROR_MESSAGES.MAX_LENGTH_POSITION} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.POSITION_INPUT}-error`);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('スタイリング', () => {
    it('基本的なクラスが適用される', () => {
      render(<PositionInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.POSITION_INPUT);
      expect(input).toHaveClass('profile-form-input');
    });

    it('フィールドコンテナのクラスが適用される', () => {
      const { container } = render(<PositionInput {...defaultProps} />);

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('ラベルのクラスが適用される', () => {
      const { container } = render(<PositionInput {...defaultProps} />);

      const label = container.querySelector('.profile-form-label');
      expect(label).toBeInTheDocument();
    });
  });
});
