import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StatusFilter } from '../StatusFilter';
import { GoalStatus } from '../../../types/mandala';

describe('StatusFilter', () => {
  afterEach(() => {
    cleanup();
  });
  describe('表示内容', () => {
    it('フィルタードロップダウンが表示される', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      expect(select).toBeInTheDocument();
    });

    it('全ての選択肢が表示される', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} />);

      expect(screen.getByRole('option', { name: '全て' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '下書き' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '活動中' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '完了' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '一時停止' })).toBeInTheDocument();
    });

    it('選択された値が正しく表示される', () => {
      render(<StatusFilter value={GoalStatus.ACTIVE} onChange={vi.fn()} />);

      const select = screen.getByLabelText('目標状態でフィルター') as HTMLSelectElement;
      expect(select.value).toBe(GoalStatus.ACTIVE);
    });

    it('ドロップダウンアイコンが表示される', () => {
      const { container } = render(<StatusFilter value="all" onChange={vi.fn()} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('選択操作', () => {
    it('選択変更時にonChangeが呼ばれる', () => {
      const handleChange = vi.fn();
      render(<StatusFilter value="all" onChange={handleChange} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(select, { target: { value: GoalStatus.ACTIVE } });

      expect(handleChange).toHaveBeenCalledWith(GoalStatus.ACTIVE);
    });

    it('「全て」を選択できる', () => {
      const handleChange = vi.fn();
      render(<StatusFilter value={GoalStatus.ACTIVE} onChange={handleChange} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(select, { target: { value: 'all' } });

      expect(handleChange).toHaveBeenCalledWith('all');
    });

    it('「下書き」を選択できる', () => {
      const handleChange = vi.fn();
      render(<StatusFilter value="all" onChange={handleChange} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(select, { target: { value: GoalStatus.DRAFT } });

      expect(handleChange).toHaveBeenCalledWith(GoalStatus.DRAFT);
    });

    it('「活動中」を選択できる', () => {
      const handleChange = vi.fn();
      render(<StatusFilter value="all" onChange={handleChange} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(select, { target: { value: GoalStatus.ACTIVE } });

      expect(handleChange).toHaveBeenCalledWith(GoalStatus.ACTIVE);
    });

    it('「完了」を選択できる', () => {
      const handleChange = vi.fn();
      render(<StatusFilter value="all" onChange={handleChange} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(select, { target: { value: GoalStatus.COMPLETED } });

      expect(handleChange).toHaveBeenCalledWith(GoalStatus.COMPLETED);
    });

    it('「一時停止」を選択できる', () => {
      const handleChange = vi.fn();
      render(<StatusFilter value="all" onChange={handleChange} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(select, { target: { value: GoalStatus.PAUSED } });

      expect(handleChange).toHaveBeenCalledWith(GoalStatus.PAUSED);
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合にドロップダウンが無効化される', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} disabled={true} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      expect(select).toBeDisabled();
    });

    it('disabled=falseの場合にドロップダウンが有効化される', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} disabled={false} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      expect(select).not.toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-label属性が正しく設定される', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      expect(select).toHaveAttribute('aria-label', '目標状態でフィルター');
    });

    it('aria-describedby属性が正しく設定される', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} />);

      const select = screen.getByLabelText('目標状態でフィルター');
      expect(select).toHaveAttribute('aria-describedby', 'filter-description');
    });

    it('説明テキストが存在する', () => {
      render(<StatusFilter value={GoalStatus.ACTIVE} onChange={vi.fn()} />);

      const description = document.getElementById('filter-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('活動中でフィルタリング中');
    });

    it('label要素が存在する', () => {
      render(<StatusFilter value="all" onChange={vi.fn()} />);

      const label = screen.getByLabelText('目標状態でフィルター');
      expect(label).toBeInTheDocument();
    });
  });
});
