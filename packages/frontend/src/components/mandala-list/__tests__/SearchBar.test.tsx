import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  describe('表示内容', () => {
    it('検索入力フィールドが表示される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toBeInTheDocument();
    });

    it('プレースホルダーが表示される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toHaveAttribute('placeholder', '目標を検索...');
    });

    it('カスタムプレースホルダーが表示される', () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          onClear={vi.fn()}
          placeholder="カスタムプレースホルダー"
        />
      );

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toHaveAttribute('placeholder', 'カスタムプレースホルダー');
    });

    it('検索アイコンが表示される', () => {
      const { container } = render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('値が空の場合にクリアボタンが表示されない', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const clearButton = screen.queryByLabelText('検索をクリア');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('値がある場合にクリアボタンが表示される', () => {
      render(<SearchBar value="test" onChange={vi.fn()} onClear={vi.fn()} />);

      const clearButton = screen.getByLabelText('検索をクリア');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('入力操作', () => {
    it('テキスト入力時にonChangeが呼ばれる', () => {
      const handleChange = vi.fn();
      render(<SearchBar value="" onChange={handleChange} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox');
      fireEvent.change(searchbox, { target: { value: 'test' } });

      expect(handleChange).toHaveBeenCalledWith('test');
    });

    it('入力値が正しく表示される', () => {
      render(<SearchBar value="test value" onChange={vi.fn()} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox') as HTMLInputElement;
      expect(searchbox.value).toBe('test value');
    });

    it('クリアボタンクリック時にonClearが呼ばれる', () => {
      const handleClear = vi.fn();
      render(<SearchBar value="test" onChange={vi.fn()} onClear={handleClear} />);

      const clearButton = screen.getByLabelText('検索をクリア');
      fireEvent.click(clearButton);

      expect(handleClear).toHaveBeenCalled();
    });

    it('Escapeキー押下時にonClearが呼ばれる', () => {
      const handleClear = vi.fn();
      render(<SearchBar value="test" onChange={vi.fn()} onClear={handleClear} />);

      const searchbox = screen.getByRole('searchbox');
      fireEvent.keyDown(searchbox, { key: 'Escape' });

      expect(handleClear).toHaveBeenCalled();
    });

    it('値が空の場合にEscapeキーを押してもonClearが呼ばれない', () => {
      const handleClear = vi.fn();
      render(<SearchBar value="" onChange={vi.fn()} onClear={handleClear} />);

      const searchbox = screen.getByRole('searchbox');
      fireEvent.keyDown(searchbox, { key: 'Escape' });

      expect(handleClear).not.toHaveBeenCalled();
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合に入力フィールドが無効化される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} disabled={true} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toBeDisabled();
    });

    it('disabled=trueの場合にクリアボタンが表示されない', () => {
      render(<SearchBar value="test" onChange={vi.fn()} onClear={vi.fn()} disabled={true} />);

      const clearButton = screen.queryByLabelText('検索をクリア');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('disabled=falseの場合に入力フィールドが有効化される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} disabled={false} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).not.toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    it('role属性が正しく設定される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toBeInTheDocument();
    });

    it('aria-label属性が正しく設定される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toHaveAttribute('aria-label', 'マンダラチャートを検索');
    });

    it('aria-describedby属性が正しく設定される', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toHaveAttribute('aria-describedby', 'search-description');
    });

    it('説明テキストが存在する', () => {
      render(<SearchBar value="" onChange={vi.fn()} onClear={vi.fn()} />);

      const description = document.getElementById('search-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('目標タイトルと説明を検索します');
    });
  });
});
