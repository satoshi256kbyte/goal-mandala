import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  describe('表示内容', () => {
    it('ページ番号ボタンが正しく表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // ページ番号ボタンが表示される
      expect(screen.getByRole('button', { name: 'ページ1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ5' })).toBeInTheDocument();
    });

    it('前へ・次へボタンが表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByRole('button', { name: '前のページ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '次のページ' })).toBeInTheDocument();
    });

    it('現在ページがハイライト表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const currentPageButton = screen.getByRole('button', { name: 'ページ3' });
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
      expect(currentPageButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('ページ情報が正しく表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // 21-40 / 100件
      expect(screen.getByText('21-40 / 100件')).toBeInTheDocument();
    });

    it('最終ページのページ情報が正しく表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={5}
          totalItems={95}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // 81-95 / 95件
      expect(screen.getByText('81-95 / 95件')).toBeInTheDocument();
    });

    it('ページが多い場合に省略記号が表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={10}
          totalItems={200}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // 省略記号が表示される
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('総ページ数が1以下の場合は表示されない', () => {
      const onPageChange = vi.fn();
      const { container } = render(
        <Pagination
          currentPage={1}
          totalPages={1}
          totalItems={10}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('ページ遷移', () => {
    it('ページ番号ボタンをクリックすると該当ページに遷移する', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const page3Button = screen.getByRole('button', { name: 'ページ3' });
      await user.click(page3Button);

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('次へボタンをクリックすると次のページに遷移する', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: '次のページ' });
      await user.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('前へボタンをクリックすると前のページに遷移する', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: '前のページ' });
      await user.click(prevButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('現在のページボタンをクリックしても遷移しない', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const currentPageButton = screen.getByRole('button', { name: 'ページ3' });
      await user.click(currentPageButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('ボタンの有効/無効制御', () => {
    it('最初のページでは前へボタンが無効化される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: '前のページ' });
      expect(prevButton).toBeDisabled();
      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('最後のページでは次へボタンが無効化される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: '次のページ' });
      expect(nextButton).toBeDisabled();
      expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('中間ページでは前へ・次へボタンが有効化される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: '前のページ' });
      const nextButton = screen.getByRole('button', { name: '次のページ' });

      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('disabled=trueの場合は全てのボタンが無効化される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
          disabled={true}
        />
      );

      const prevButton = screen.getByRole('button', { name: '前のページ' });
      const nextButton = screen.getByRole('button', { name: '次のページ' });
      const page1Button = screen.getByRole('button', { name: 'ページ1' });

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
      expect(page1Button).toBeDisabled();
    });

    it('disabled=trueの場合はクリックしても遷移しない', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
          disabled={true}
        />
      );

      const nextButton = screen.getByRole('button', { name: '次のページ' });
      await user.click(nextButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('nav要素にaria-label属性が設定される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'ページネーション');
    });

    it('現在のページにaria-current属性が設定される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const currentPageButton = screen.getByRole('button', { name: 'ページ3' });
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    it('ページ情報にaria-live属性が設定される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const pageInfo = screen.getByText('21-40 / 100件');
      expect(pageInfo).toHaveAttribute('aria-live', 'polite');
    });

    it('省略記号にaria-hidden属性が設定される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={10}
          totalItems={200}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      const ellipses = screen.getAllByText('...');
      ellipses.forEach(ellipsis => {
        expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('ページ番号の表示ロジック', () => {
    it('総ページ数が7以下の場合は全てのページ番号が表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          totalItems={100}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByRole('button', { name: 'ページ1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ5' })).toBeInTheDocument();
    });

    it('総ページ数が8以上の場合は省略記号が表示される', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={10}
          totalItems={200}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // 最初と最後のページは常に表示
      expect(screen.getByRole('button', { name: 'ページ1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ10' })).toBeInTheDocument();

      // 現在のページとその前後が表示
      expect(screen.getByRole('button', { name: 'ページ4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ5' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ6' })).toBeInTheDocument();

      // 省略記号が表示される
      expect(screen.getAllByText('...').length).toBeGreaterThan(0);
    });

    it('最初のページ付近では左側の省略記号が表示されない', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={10}
          totalItems={200}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // 1, 2, 3が表示される
      expect(screen.getByRole('button', { name: 'ページ1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ3' })).toBeInTheDocument();

      // 右側のみ省略記号が表示される
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBe(1);
    });

    it('最後のページ付近では右側の省略記号が表示されない', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={9}
          totalPages={10}
          totalItems={200}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      );

      // 8, 9, 10が表示される
      expect(screen.getByRole('button', { name: 'ページ8' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ9' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページ10' })).toBeInTheDocument();

      // 左側のみ省略記号が表示される
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBe(1);
    });
  });
});
