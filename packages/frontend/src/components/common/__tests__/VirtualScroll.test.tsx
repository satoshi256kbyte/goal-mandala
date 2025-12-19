import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualScroll, VirtualScrollItem } from '../VirtualScroll';

// テスト用のアイテム型
interface TestItem extends VirtualScrollItem {
  id: string;
  data: {
    title: string;
  };
}

// テスト用のアイテムを生成
const createTestItems = (count: number): TestItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    data: {
      title: `Item ${i + 1}`,
    },
  }));
};

describe('VirtualScroll', () => {
  describe('基本機能', () => {
    it('should render items', () => {
      const items = createTestItems(10);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={items} itemHeight={50} height={300} renderItem={renderItem} />);

      // 最初のアイテムが表示されることを確認
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should have role="listbox"', () => {
      const items = createTestItems(5);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={items} itemHeight={50} height={300} renderItem={renderItem} />);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const items = createTestItems(5);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(
        <VirtualScroll
          items={items}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          className="custom-class"
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveClass('custom-class');
    });
  });

  describe('ローディング状態', () => {
    it('should show loading state', () => {
      const items = createTestItems(10);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(
        <VirtualScroll
          items={items}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          loading={true}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('should have aria-label for loading state', () => {
      const items = createTestItems(10);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(
        <VirtualScroll
          items={items}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          loading={true}
        />
      );

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', '読み込み中');
    });
  });

  describe('エラー状態', () => {
    it('should show error state', () => {
      const items = createTestItems(10);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(
        <VirtualScroll
          items={items}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          error="エラーが発生しました"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('should have aria-label for error state', () => {
      const items = createTestItems(10);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(
        <VirtualScroll
          items={items}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          error="エラーが発生しました"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', 'エラー');
    });
  });

  describe('空の状態', () => {
    it('should show empty state', () => {
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={[]} itemHeight={50} height={300} renderItem={renderItem} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('アイテムがありません')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(
        <VirtualScroll
          items={[]}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          emptyMessage="カスタム空メッセージ"
        />
      );

      expect(screen.getByText('カスタム空メッセージ')).toBeInTheDocument();
    });

    it('should have aria-label for empty state', () => {
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={[]} itemHeight={50} height={300} renderItem={renderItem} />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', '空の状態');
    });
  });

  describe('コールバック', () => {
    it('should call onScroll callback', () => {
      const items = createTestItems(20);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;
      const onScroll = vi.fn();

      const { container } = render(
        <VirtualScroll
          items={items}
          itemHeight={50}
          height={300}
          renderItem={renderItem}
          onScroll={onScroll}
        />
      );

      const listbox = container.querySelector('[role="listbox"]');
      if (listbox) {
        listbox.scrollTop = 100;
        listbox.dispatchEvent(new Event('scroll'));
      }

      expect(onScroll).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('should handle single item', () => {
      const items = createTestItems(1);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={items} itemHeight={50} height={300} renderItem={renderItem} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should handle large number of items', () => {
      const items = createTestItems(1000);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={items} itemHeight={50} height={300} renderItem={renderItem} />);

      // 最初のアイテムが表示されることを確認
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should handle zero height', () => {
      const items = createTestItems(10);
      const renderItem = (item: TestItem) => <div>{item.data.title}</div>;

      render(<VirtualScroll items={items} itemHeight={50} height={0} renderItem={renderItem} />);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });
  });
});
