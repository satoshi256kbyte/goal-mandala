import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { TextArea } from './TextArea';

// テスト用のラッパーコンポーネント
const TestWrapper = ({
  maxLength,
  showCounter = false,
  showWarning = false,
  rows = 4,
  resize = 'vertical' as const,
  onLengthChange,
  onLimitReached,
  warningThreshold,
}: {
  maxLength?: number;
  showCounter?: boolean;
  showWarning?: boolean;
  rows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  onLengthChange?: (length: number, value: string) => void;
  onLimitReached?: (value: string) => void;
  warningThreshold?: number;
}) => {
  const { register } = useForm();

  return (
    <TextArea
      name="testTextArea"
      placeholder="テストテキストエリア"
      maxLength={maxLength}
      showCounter={showCounter}
      showWarning={showWarning}
      rows={rows}
      register={register}
      resize={resize}
      onLengthChange={onLengthChange}
      onLimitReached={onLimitReached}
      warningThreshold={warningThreshold}
    />
  );
};

describe('TextArea', () => {
  describe('基本機能', () => {
    it('基本的なテキストエリアが表示される', () => {
      render(<TestWrapper />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('指定した行数が設定される', () => {
      render(<TestWrapper rows={6} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      expect(textarea).toHaveAttribute('rows', '6');
    });

    it('resizeクラスが正しく適用される', () => {
      render(<TestWrapper resize="none" />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      expect(textarea).toHaveClass('resize-none');
    });
  });

  describe('文字数カウンター機能', () => {
    it('文字数カウンターが表示される', () => {
      render(<TestWrapper maxLength={500} showCounter={true} />);

      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('文字数カウンターが入力に応じて更新される', async () => {
      render(<TestWrapper maxLength={500} showCounter={true} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: 'abcdefg' } });

      await waitFor(() => {
        expect(screen.getByText('7/500')).toBeInTheDocument();
      });
    });

    it('showCounterがfalseの場合、カウンターが表示されない', () => {
      render(<TestWrapper maxLength={500} showCounter={false} />);

      expect(screen.queryByText('0/500')).not.toBeInTheDocument();
    });

    it('文字数が80%を超えると警告色になる', async () => {
      render(<TestWrapper maxLength={10} showCounter={true} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: '12345678' } }); // 8文字 = 80%

      await waitFor(() => {
        const counter = screen.getByText('8/10');
        expect(counter).toHaveClass('text-yellow-600');
      });
    });

    it('文字数が100%に達するとエラー色になる', async () => {
      render(<TestWrapper maxLength={10} showCounter={true} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: '1234567890' } }); // 10文字 = 100%

      await waitFor(() => {
        const counter = screen.getByText('10/10');
        expect(counter).toHaveClass('text-red-600');
      });
    });

    it('カウンターが右下に配置される', () => {
      render(<TestWrapper maxLength={500} showCounter={true} />);

      const counter = screen.getByText('0/500');
      expect(counter).toHaveClass('absolute', 'right-2', 'bottom-2');
    });
  });

  describe('文字数制限機能', () => {
    it('制限を超える入力が切り詰められる', async () => {
      render(<TestWrapper maxLength={5} showCounter={true} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'hello world' } });

      await waitFor(() => {
        expect(textarea.value).toBe('hello');
        expect(screen.getByText('5/5')).toBeInTheDocument();
      });
    });

    it('制限到達時にコールバックが呼ばれる', async () => {
      const onLimitReached = vi.fn();
      render(<TestWrapper maxLength={5} onLimitReached={onLimitReached} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: 'hello world' } });

      await waitFor(() => {
        expect(onLimitReached).toHaveBeenCalledWith('hello');
      });
    });

    it('文字数変更時にコールバックが呼ばれる', async () => {
      const onLengthChange = vi.fn();
      render(<TestWrapper maxLength={100} onLengthChange={onLengthChange} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: 'test' } });

      await waitFor(() => {
        expect(onLengthChange).toHaveBeenCalledWith(4, 'test');
      });
    });
  });

  describe('警告機能', () => {
    it('警告メッセージが表示される', async () => {
      render(<TestWrapper maxLength={10} showWarning={true} warningThreshold={80} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: '12345678' } }); // 8文字 = 80%

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('残り2文字です')).toBeInTheDocument();
      });
    });

    it('エラーメッセージが表示される', async () => {
      render(<TestWrapper maxLength={5} showWarning={true} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: 'hello world' } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('文字数制限を超えています（0文字超過）')).toBeInTheDocument();
      });
    });

    it('カスタム警告しきい値が適用される', async () => {
      render(<TestWrapper maxLength={10} showWarning={true} warningThreshold={70} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: '1234567' } }); // 7文字 = 70%

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('残り3文字です')).toBeInTheDocument();
      });
    });
  });

  describe('スタイル変更', () => {
    it('警告状態で境界線の色が変わる', async () => {
      render(<TestWrapper maxLength={10} showCounter={true} warningThreshold={80} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: '12345678' } }); // 8文字 = 80%

      await waitFor(() => {
        expect(textarea).toHaveClass('border-yellow-300');
      });
    });

    it('エラー状態で境界線の色が変わる', async () => {
      render(<TestWrapper maxLength={5} showCounter={true} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: 'hello world' } });

      await waitFor(() => {
        expect(textarea).toHaveClass('border-red-300');
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('文字数カウンターにaria-labelが設定される', () => {
      render(<TestWrapper maxLength={100} showCounter={true} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-label', '文字数: 0文字 / 100文字 (入力可能)');
    });

    it('警告メッセージにrole="alert"が設定される', async () => {
      render(<TestWrapper maxLength={10} showWarning={true} warningThreshold={80} />);

      const textarea = screen.getByPlaceholderText('テストテキストエリア');
      fireEvent.change(textarea, { target: { value: '12345678' } });

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });
  });
});
