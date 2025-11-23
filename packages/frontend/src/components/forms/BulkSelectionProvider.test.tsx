import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  BulkSelectionProvider,
  useBulkSelection,
  SelectableItem,
  BulkSelectionControls,
  SelectionIndicator,
  SelectableItem as SelectableItemType,
} from './BulkSelectionProvider';

// テスト用のモックデータ
const mockItems: SelectableItemType[] = [
  { id: 'item-1', title: 'アイテム1' },
  { id: 'item-2', title: 'アイテム2' },
  { id: 'item-3', title: 'アイテム3' },
  { id: 'item-4', title: 'アイテム4' },
  { id: 'item-5', title: 'アイテム5' },
];

// テスト用コンポーネント
const TestComponent: React.FC = () => {
  const {
    selectionState,
    selectedItems,
    toggleItem,
    toggleAll,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    isSelected,
    getSelectedCount,
  } = useBulkSelection();

  return (
    <div>
      <div data-testid="selection-state">
        <span data-testid="selected-count">{getSelectedCount()}</span>
        <span data-testid="is-all-selected">{selectionState.isAllSelected.toString()}</span>
        <span data-testid="is-partially-selected">
          {selectionState.isPartiallySelected.toString()}
        </span>
        <span data-testid="is-selection-mode">{selectionState.isSelectionMode.toString()}</span>
      </div>

      <div data-testid="selected-items">
        {selectedItems.map(item => (
          <span key={item.id} data-testid={`selected-${item.id}`}>
            {item.title}
          </span>
        ))}
      </div>

      <div data-testid="controls">
        <button onClick={() => toggleItem(mockItems[0])}>Toggle Item 1</button>
        <button onClick={() => toggleAll(mockItems)}>Toggle All</button>
        <button onClick={() => selectAll(mockItems)}>Select All</button>
        <button onClick={clearSelection}>Clear Selection</button>
        <button onClick={enterSelectionMode}>Enter Selection Mode</button>
        <button onClick={exitSelectionMode}>Exit Selection Mode</button>
      </div>

      <div data-testid="item-states">
        {mockItems.map(item => (
          <span key={item.id} data-testid={`is-selected-${item.id}`}>
            {isSelected(item.id).toString()}
          </span>
        ))}
      </div>
    </div>
  );
};

const TestWrapper: React.FC<{
  onSelectionChange?: (items: SelectableItemType[]) => void;
  onSelectionModeChange?: (isSelectionMode: boolean) => void;
  maxSelection?: number;
  minSelection?: number;
}> = ({ onSelectionChange, onSelectionModeChange, maxSelection, minSelection }) => (
  <BulkSelectionProvider
    onSelectionChange={onSelectionChange}
    onSelectionModeChange={onSelectionModeChange}
    maxSelection={maxSelection}
    minSelection={minSelection}
  >
    <TestComponent />
  </BulkSelectionProvider>
);

describe('BulkSelectionProvider', () => {
  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      render(<TestWrapper />);

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('is-partially-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('false');
    });

    it('アイテムの選択/選択解除ができる', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      // アイテム1を選択
      await user.click(screen.getByText('Toggle Item 1'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('is-selected-item-1')).toHaveTextContent('true');

      // アイテム1を選択解除
      await user.click(screen.getByText('Toggle Item 1'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-selected-item-1')).toHaveTextContent('false');
    });

    it('全選択ができる', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByText('Select All'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('5');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('true');
      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('true');

      // 全てのアイテムが選択されている
      mockItems.forEach(item => {
        expect(screen.getByTestId(`is-selected-${item.id}`)).toHaveTextContent('true');
      });
    });

    it('全選択/全解除の切り替えができる', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      // 全選択
      await user.click(screen.getByText('Toggle All'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('5');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('true');

      // 全解除
      await user.click(screen.getByText('Toggle All'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('false');
    });

    it('選択をクリアできる', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      // いくつかのアイテムを選択
      await user.click(screen.getByText('Select All'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('5');

      // 選択をクリア
      await user.click(screen.getByText('Clear Selection'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('is-partially-selected')).toHaveTextContent('false');
    });
  });

  describe('選択モード', () => {
    it('選択モードに入ることができる', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByText('Enter Selection Mode'));

      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('true');
    });

    it('選択モードを終了できる', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      // 選択モードに入り、アイテムを選択
      await user.click(screen.getByText('Enter Selection Mode'));
      await user.click(screen.getByText('Toggle Item 1'));

      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

      // 選択モードを終了
      await user.click(screen.getByText('Exit Selection Mode'));

      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    });

    it('アイテム選択時に自動的に選択モードに入る', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('false');

      await user.click(screen.getByText('Toggle Item 1'));

      expect(screen.getByTestId('is-selection-mode')).toHaveTextContent('true');
    });
  });

  describe('部分選択状態', () => {
    it('部分選択状態が正しく判定される', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      // まず全選択してallItemsを設定
      await user.click(screen.getByText('Select All'));
      await user.click(screen.getByText('Clear Selection'));

      // 1つだけ選択
      await user.click(screen.getByText('Toggle Item 1'));

      expect(screen.getByTestId('is-partially-selected')).toHaveTextContent('true');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('false');

      // 全選択
      await user.click(screen.getByText('Select All'));

      expect(screen.getByTestId('is-partially-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('is-all-selected')).toHaveTextContent('true');
    });
  });

  describe('制約機能', () => {
    it('最大選択数制限が機能する', async () => {
      const user = userEvent.setup();
      render(<TestWrapper maxSelection={2} />);

      // 2つまで選択可能
      await user.click(screen.getByText('Toggle Item 1'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

      await user.click(screen.getByText('Toggle Item 1')); // 選択解除
      await user.click(screen.getByText('Toggle Item 1')); // 再選択
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

      // 全選択は最大数まで
      await user.click(screen.getByText('Select All'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2');
    });
  });

  describe('コールバック', () => {
    it('選択変更時にコールバックが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      render(<TestWrapper onSelectionChange={onSelectionChange} />);

      await user.click(screen.getByText('Toggle Item 1'));

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith([mockItems[0]]);
      });
    });

    it('選択モード変更時にコールバックが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSelectionModeChange = vi.fn();
      render(<TestWrapper onSelectionModeChange={onSelectionModeChange} />);

      await user.click(screen.getByText('Enter Selection Mode'));

      await waitFor(() => {
        expect(onSelectionModeChange).toHaveBeenCalledWith(true);
      });

      await user.click(screen.getByText('Exit Selection Mode'));

      await waitFor(() => {
        expect(onSelectionModeChange).toHaveBeenCalledWith(false);
      });
    });
  });
});

describe('SelectableItem', () => {
  const TestSelectableWrapper: React.FC = () => {
    const { toggleItem } = useBulkSelection();

    return (
      <div>
        <SelectableItem
          item={mockItems[0]}
          className="test-item"
          selectedClassName="selected"
          selectionModeClassName="selection-mode"
        >
          <span>アイテム1</span>
        </SelectableItem>
        <button onClick={() => toggleItem(mockItems[0])}>Toggle</button>
      </div>
    );
  };

  it('選択可能アイテムが正しく表示される', () => {
    render(
      <BulkSelectionProvider>
        <TestSelectableWrapper />
      </BulkSelectionProvider>
    );

    expect(screen.getByText('アイテム1')).toBeInTheDocument();
  });

  it('選択モード時にチェックボックスが表示される', async () => {
    const user = userEvent.setup();
    render(
      <BulkSelectionProvider>
        <TestSelectableWrapper />
      </BulkSelectionProvider>
    );

    // 選択モードに入る
    await user.click(screen.getByText('Toggle'));

    expect(screen.getByLabelText('item-1を選択')).toBeInTheDocument();
  });

  it('クリックで選択状態が切り替わる', async () => {
    const user = userEvent.setup();
    render(
      <BulkSelectionProvider>
        <TestSelectableWrapper />
      </BulkSelectionProvider>
    );

    // 選択モードに入る
    await user.click(screen.getByText('Toggle'));

    const item = screen.getByText('アイテム1').closest('div');
    expect(item).toHaveAttribute('data-selected', 'true');
    expect(item).toHaveAttribute('data-selection-mode', 'true');
  });
});

describe('BulkSelectionControls', () => {
  const TestControlsWrapper: React.FC = () => (
    <BulkSelectionProvider>
      <BulkSelectionControls
        items={mockItems}
        customActions={<button>カスタムアクション</button>}
      />
    </BulkSelectionProvider>
  );

  it('選択モードでない場合、選択モードボタンが表示される', () => {
    render(<TestControlsWrapper />);

    expect(screen.getByText('選択モード')).toBeInTheDocument();
  });

  it('選択モード時にコントロールが表示される', async () => {
    const user = userEvent.setup();
    render(<TestControlsWrapper />);

    await user.click(screen.getByText('選択モード'));

    expect(screen.getByText('0個選択中')).toBeInTheDocument();
    expect(screen.getByText('全選択')).toBeInTheDocument();
    expect(screen.getByText('選択モード終了')).toBeInTheDocument();
    expect(screen.getByText('カスタムアクション')).toBeInTheDocument();
  });
});

describe('SelectionIndicator', () => {
  const TestIndicatorWrapper: React.FC = () => {
    const { toggleItem, enterSelectionMode } = useBulkSelection();

    return (
      <div>
        <SelectionIndicator />
        <button onClick={enterSelectionMode}>Enter Mode</button>
        <button onClick={() => toggleItem(mockItems[0])}>Select Item</button>
      </div>
    );
  };

  it('選択がない場合、何も表示されない', () => {
    const { container } = render(
      <BulkSelectionProvider>
        <TestIndicatorWrapper />
      </BulkSelectionProvider>
    );

    expect(container.querySelector('.inline-flex')).not.toBeInTheDocument();
  });

  it('選択モード時にインジケーターが表示される', async () => {
    const user = userEvent.setup();
    render(
      <BulkSelectionProvider>
        <TestIndicatorWrapper />
      </BulkSelectionProvider>
    );

    await user.click(screen.getByText('Enter Mode'));

    expect(screen.getByText('選択モード')).toBeInTheDocument();
  });

  it('選択時にインジケーターが表示される', async () => {
    const user = userEvent.setup();
    render(
      <BulkSelectionProvider>
        <TestIndicatorWrapper />
      </BulkSelectionProvider>
    );

    await user.click(screen.getByText('Select Item'));

    expect(screen.getByText('1個選択')).toBeInTheDocument();
  });
});

describe('エラーハンドリング', () => {
  it('プロバイダー外でフックを使用するとエラーが発生する', () => {
    const TestErrorComponent = () => {
      useBulkSelection();
      return <div>Test</div>;
    };

    // コンソールエラーを抑制
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestErrorComponent />)).toThrow(
      'useBulkSelection must be used within a BulkSelectionProvider'
    );

    consoleSpy.mockRestore();
  });
});
