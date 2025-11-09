import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SortDropdown } from '../SortDropdown';

describe('SortDropdown', () => {
  afterEach(() => {
    cleanup();
  });
  describe('表示内容', () => {
    it('ソートドロップダウンが表示される', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} />);

      const select = screen.getByLabelText('並び替え');
      expect(select).toBeInTheDocument();
    });

    it('全ての選択肢が表示される', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} />);

      expect(screen.getByRole('option', { name: '作成日時（新しい順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '作成日時（古い順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '更新日時（新しい順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '更新日時（古い順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '達成期限（近い順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '達成期限（遠い順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '進捗率（高い順）' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '進捗率（低い順）' })).toBeInTheDocument();
    });

    it('選択された値が正しく表示される', () => {
      render(<SortDropdown value="deadline_asc" onChange={vi.fn()} />);

      const select = screen.getByLabelText('並び替え') as HTMLSelectElement;
      expect(select.value).toBe('deadline_asc');
    });

    it('ドロップダウンアイコンが表示される', () => {
      const { container } = render(<SortDropdown value="created_at_desc" onChange={vi.fn()} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('選択操作', () => {
    it('選択変更時にonChangeが呼ばれる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'deadline_asc' } });

      expect(handleChange).toHaveBeenCalledWith('deadline_asc');
    });

    it('「作成日時（新しい順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="deadline_asc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'created_at_desc' } });

      expect(handleChange).toHaveBeenCalledWith('created_at_desc');
    });

    it('「作成日時（古い順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'created_at_asc' } });

      expect(handleChange).toHaveBeenCalledWith('created_at_asc');
    });

    it('「更新日時（新しい順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'updated_at_desc' } });

      expect(handleChange).toHaveBeenCalledWith('updated_at_desc');
    });

    it('「更新日時（古い順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'updated_at_asc' } });

      expect(handleChange).toHaveBeenCalledWith('updated_at_asc');
    });

    it('「達成期限（近い順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'deadline_asc' } });

      expect(handleChange).toHaveBeenCalledWith('deadline_asc');
    });

    it('「達成期限（遠い順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'deadline_desc' } });

      expect(handleChange).toHaveBeenCalledWith('deadline_desc');
    });

    it('「進捗率（高い順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'progress_desc' } });

      expect(handleChange).toHaveBeenCalledWith('progress_desc');
    });

    it('「進捗率（低い順）」を選択できる', () => {
      const handleChange = vi.fn();
      render(<SortDropdown value="created_at_desc" onChange={handleChange} />);

      const select = screen.getByLabelText('並び替え');
      fireEvent.change(select, { target: { value: 'progress_asc' } });

      expect(handleChange).toHaveBeenCalledWith('progress_asc');
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合にドロップダウンが無効化される', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} disabled={true} />);

      const select = screen.getByLabelText('並び替え');
      expect(select).toBeDisabled();
    });

    it('disabled=falseの場合にドロップダウンが有効化される', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} disabled={false} />);

      const select = screen.getByLabelText('並び替え');
      expect(select).not.toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-label属性が正しく設定される', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} />);

      const select = screen.getByLabelText('並び替え');
      expect(select).toHaveAttribute('aria-label', '並び替え');
    });

    it('aria-describedby属性が正しく設定される', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} />);

      const select = screen.getByLabelText('並び替え');
      expect(select).toHaveAttribute('aria-describedby', 'sort-description');
    });

    it('説明テキストが存在する', () => {
      render(<SortDropdown value="deadline_asc" onChange={vi.fn()} />);

      const description = document.getElementById('sort-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('達成期限（近い順）で並び替え中');
    });

    it('label要素が存在する', () => {
      render(<SortDropdown value="created_at_desc" onChange={vi.fn()} />);

      const label = screen.getByLabelText('並び替え');
      expect(label).toBeInTheDocument();
    });
  });
});
