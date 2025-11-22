import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JobTitleInput } from '../JobTitleInput';
import {
  ERROR_MESSAGES,
  PLACEHOLDERS,
  MAX_LENGTH,
  ARIA_LABELS,
  TEST_IDS,
} from '../../../constants/profile';

describe('JobTitleInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  describe('基本表示', () => {
    it('正しくレンダリングされる', () => {
      render(<JobTitleInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'jobTitle');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('ラベルが表示される', () => {
      render(<JobTitleInput {...defaultProps} />);

      const label = screen.getByText('職種');
      expect(label).toBeInTheDocument();
    });

    it('プレースホルダーが表示される', () => {
      render(<JobTitleInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('placeholder', PLACEHOLDERS.JOB_TITLE);
    });

    it('初期値が正しく設定される', () => {
      render(<JobTitleInput {...defaultProps} value="ソフトウェアエンジニア" />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT) as HTMLInputElement;
      expect(input.value).toBe('ソフトウェアエンジニア');
    });

    it('文字数カウントが表示される', () => {
      render(<JobTitleInput {...defaultProps} value="テスト" />);

      const characterCount = screen.getByText(`3/${MAX_LENGTH.JOB_TITLE}`);
      expect(characterCount).toBeInTheDocument();
    });
  });

  describe('必須フラグ', () => {
    it('required=trueの場合、必須マークが表示される', () => {
      render(<JobTitleInput {...defaultProps} required />);

      const requiredMark = screen.getByText('*');
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveClass('profile-required-mark');
    });

    it('required=falseの場合、必須マークが表示されない', () => {
      render(<JobTitleInput {...defaultProps} required={false} />);

      const requiredMark = screen.queryByText('*');
      expect(requiredMark).not.toBeInTheDocument();
    });

    it('required属性が正しく設定される', () => {
      render(<JobTitleInput {...defaultProps} required />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('required');
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合、入力が無効化される', () => {
      render(<JobTitleInput {...defaultProps} disabled />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toBeDisabled();
    });

    it('disabled=falseの場合、入力が有効', () => {
      render(<JobTitleInput {...defaultProps} disabled={false} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).not.toBeDisabled();
    });
  });

  describe('イベントハンドラー', () => {
    it('入力変更時にonChangeが呼ばれる', () => {
      const onChange = vi.fn();
      render(<JobTitleInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      fireEvent.change(input, { target: { value: 'エンジニア' } });

      expect(onChange).toHaveBeenCalledWith('エンジニア');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('フォーカス離脱時にonBlurが呼ばれる', () => {
      const onBlur = vi.fn();
      render(<JobTitleInput {...defaultProps} onBlur={onBlur} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('文字数制限', () => {
    it('maxLength属性が正しく設定される', () => {
      render(<JobTitleInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('maxLength', MAX_LENGTH.JOB_TITLE.toString());
    });

    it('カスタムmaxLengthが設定できる', () => {
      render(<JobTitleInput {...defaultProps} maxLength={50} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('maxLength', '50');
    });

    it('最大文字数を超える入力は制限される', () => {
      const onChange = vi.fn();
      render(<JobTitleInput {...defaultProps} value="" onChange={onChange} maxLength={10} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      fireEvent.change(input, { target: { value: '12345678901' } }); // 11文字

      // 最大文字数を超えているのでonChangeは呼ばれない
      expect(onChange).not.toHaveBeenCalled();
    });

    it('最大文字数以内の入力は許可される', () => {
      const onChange = vi.fn();
      render(<JobTitleInput {...defaultProps} value="" onChange={onChange} maxLength={10} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      fireEvent.change(input, { target: { value: '1234567890' } }); // 10文字

      expect(onChange).toHaveBeenCalledWith('1234567890');
    });

    it('文字数が80%を超えると警告スタイルが適用される', () => {
      const longValue = 'a'.repeat(81);
      const { container } = render(
        <JobTitleInput {...defaultProps} value={longValue} maxLength={100} />
      );

      const characterCount = container.querySelector('.profile-character-count-warning');
      expect(characterCount).toBeInTheDocument();
    });

    it('文字数が80%以下の場合、警告スタイルは適用されない', () => {
      const shortValue = 'a'.repeat(79);
      const { container } = render(
        <JobTitleInput {...defaultProps} value={shortValue} maxLength={100} />
      );

      const characterCount = container.querySelector('.profile-character-count-warning');
      expect(characterCount).not.toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('エラーがない場合、エラーメッセージが表示されない', () => {
      render(<JobTitleInput {...defaultProps} />);

      const errorMessage = screen.queryByTestId(`${TEST_IDS.JOB_TITLE_INPUT}-error`);
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('エラーがある場合、エラーメッセージが表示される', () => {
      const error = ERROR_MESSAGES.REQUIRED_JOB_TITLE;
      render(<JobTitleInput {...defaultProps} error={error} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.JOB_TITLE_INPUT}-error`);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(error);
    });

    it('エラー時にエラー用のクラスが適用される', () => {
      render(<JobTitleInput {...defaultProps} error={ERROR_MESSAGES.REQUIRED_JOB_TITLE} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveClass('profile-form-input-error');
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-labelが正しく設定される', () => {
      render(<JobTitleInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('aria-label', ARIA_LABELS.JOB_TITLE_INPUT);
    });

    it('aria-requiredが正しく設定される', () => {
      render(<JobTitleInput {...defaultProps} required />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('エラーがない場合、aria-invalidがfalse', () => {
      render(<JobTitleInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('エラーがある場合、aria-invalidがtrue', () => {
      render(<JobTitleInput {...defaultProps} error={ERROR_MESSAGES.REQUIRED_JOB_TITLE} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラーメッセージとaria-describedbyで関連付けられる', () => {
      render(<JobTitleInput {...defaultProps} error={ERROR_MESSAGES.REQUIRED_JOB_TITLE} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      const errorMessage = screen.getByTestId(`${TEST_IDS.JOB_TITLE_INPUT}-error`);

      expect(input).toHaveAttribute('aria-describedby', 'job-title-error');
      expect(errorMessage).toHaveAttribute('id', 'job-title-error');
    });

    it('エラーメッセージにrole="alert"が設定される', () => {
      render(<JobTitleInput {...defaultProps} error={ERROR_MESSAGES.REQUIRED_JOB_TITLE} />);

      const errorMessage = screen.getByTestId(`${TEST_IDS.JOB_TITLE_INPUT}-error`);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('スタイリング', () => {
    it('基本的なクラスが適用される', () => {
      render(<JobTitleInput {...defaultProps} />);

      const input = screen.getByTestId(TEST_IDS.JOB_TITLE_INPUT);
      expect(input).toHaveClass('profile-form-input');
    });

    it('フィールドコンテナのクラスが適用される', () => {
      const { container } = render(<JobTitleInput {...defaultProps} />);

      const fieldContainer = container.querySelector('.profile-form-field');
      expect(fieldContainer).toBeInTheDocument();
    });

    it('ラベルのクラスが適用される', () => {
      const { container } = render(<JobTitleInput {...defaultProps} />);

      const label = container.querySelector('.profile-form-label');
      expect(label).toBeInTheDocument();
    });
  });
});
