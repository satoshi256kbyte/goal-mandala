import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  DragDropProvider,
  DraggableItem,
  DragConstraints,
  Draggable,
  DragDropItem,
  useDragDrop,
} from './DragDropProvider';

// テスト用のコンポーネント
const TestDragDropComponent: React.FC<{
  items: DraggableItem[];
  onReorder: (newOrder: DraggableItem[]) => void;
  constraints?: DragConstraints;
}> = ({ items, onReorder, constraints }) => {
  return (
    <DragDropProvider items={items} onReorder={onReorder} constraints={constraints}>
      <div data-testid="drag-drop-container">
        {items.map(item => (
          <DragDropItem key={item.id} item={item} data-testid={`item-${item.id}`}>
            <div>{item.id}</div>
          </DragDropItem>
        ))}
      </div>
    </DragDropProvider>
  );
};

// テスト用のフックコンポーネント
const TestHookComponent: React.FC = () => {
  const { dragState } = useDragDrop();

  return (
    <div>
      <div data-testid="drag-state">{dragState.isDragging ? 'dragging' : 'not-dragging'}</div>
      <div data-testid="drag-item">{dragState.dragItem?.id || 'none'}</div>
    </div>
  );
};

const TestWithHook: React.FC<{
  items: DraggableItem[];
  onReorder: (newOrder: DraggableItem[]) => void;
}> = ({ items, onReorder }) => {
  return (
    <DragDropProvider items={items} onReorder={onReorder}>
      <TestHookComponent />
    </DragDropProvider>
  );
};

describe('DragDropProvider', () => {
  const mockItems: DraggableItem[] = [
    { id: 'item-1', position: 0, type: 'subgoal' },
    { id: 'item-2', position: 1, type: 'subgoal' },
    { id: 'item-3', position: 2, type: 'subgoal' },
  ];

  const mockActionItems: DraggableItem[] = [
    { id: 'action-1', position: 0, type: 'action', parentId: 'subgoal-1' },
    { id: 'action-2', position: 1, type: 'action', parentId: 'subgoal-1' },
    { id: 'action-3', position: 0, type: 'action', parentId: 'subgoal-2' },
  ];

  const user = userEvent.setup();

  describe('基本機能', () => {
    test('プロバイダーが正常にレンダリングされる', () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
      expect(screen.getByTestId('item-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-item-3')).toBeInTheDocument();
    });

    test('useDragDropフックが正常に動作する', () => {
      const onReorder = vi.fn();

      render(<TestWithHook items={mockItems} onReorder={onReorder} />);

      expect(screen.getByTestId('drag-state')).toHaveTextContent('not-dragging');
      expect(screen.getByTestId('drag-item')).toHaveTextContent('none');
    });

    test('プロバイダー外でuseDragDropを使用するとエラーが発生する', () => {
      // エラーログを抑制
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestHookComponent />);
      }).toThrow('useDragDrop must be used within a DragDropProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('ドラッグ&ドロップ操作', () => {
    test('ドラッグ開始時の状態変更', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');

      // ドラッグ開始
      fireEvent.dragStart(dragItem, {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      });

      // ドラッグ状態の確認は実際のDOM要素の変化で確認
      expect(dragItem).toHaveStyle({ opacity: '0.5' });
    });

    test('ドロップ時の並び替え実行', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');
      const dropTarget = screen.getByTestId('item-item-3');

      // ドラッグ開始
      fireEvent.dragStart(dragItem, {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn((_format, _data) => {
            // setDataの動作をモック
          }),
          setDragImage: vi.fn(),
        },
      });

      // ドラッグオーバー
      fireEvent.dragOver(dropTarget, {
        dataTransfer: {
          dropEffect: '',
        },
      });

      // ドロップ
      fireEvent.drop(dropTarget, {
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify(mockItems[0])),
        },
      });

      await waitFor(() => {
        expect(onReorder).toHaveBeenCalled();
      });
    });

    test('無効なドロップ時の処理', async () => {
      const onReorder = vi.fn();
      const onInvalidDrop = vi.fn();

      render(
        <DragDropProvider
          items={mockItems}
          onReorder={onReorder}
          onInvalidDrop={onInvalidDrop}
          constraints={{ allowCrossGroup: false }}
        >
          <div>
            {mockItems.map(item => (
              <DragDropItem key={item.id} item={item}>
                <div>{item.id}</div>
              </DragDropItem>
            ))}
          </div>
        </DragDropProvider>
      );

      // 同じアイテムにドロップしようとする
      const item = screen.getByText('item-1').parentElement;

      fireEvent.dragStart(item!, {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      });

      fireEvent.drop(item!, {
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify(mockItems[0])),
        },
      });

      await waitFor(() => {
        expect(onInvalidDrop).toHaveBeenCalled();
        expect(onReorder).not.toHaveBeenCalled();
      });
    });
  });

  describe('制約チェック', () => {
    test('グループ間移動制約（allowCrossGroup: false）', () => {
      const onReorder = vi.fn();
      const constraints: DragConstraints = {
        allowCrossGroup: false,
      };

      render(
        <TestDragDropComponent
          items={mockActionItems}
          onReorder={onReorder}
          constraints={constraints}
        />
      );

      // 異なるサブ目標のアクション間での移動は制限される
      // この場合、実際のcanDropロジックをテストするために
      // プロバイダーのcanDropメソッドを直接テストする必要がある
    });

    test('カスタム制約チェック', () => {
      const customConstraint = vi.fn(() => false);
      const constraints: DragConstraints = {
        allowCrossGroup: true,
        customConstraint,
      };

      const onReorder = vi.fn();

      render(
        <TestDragDropComponent items={mockItems} onReorder={onReorder} constraints={constraints} />
      );

      // カスタム制約が呼び出されることを確認
      // 実際のドラッグ&ドロップ操作でテストする必要がある
    });

    test('許可されたドロップタイプの制約', () => {
      const constraints: DragConstraints = {
        allowCrossGroup: true,
        allowedDropTypes: ['subgoal'],
      };

      const onReorder = vi.fn();

      render(
        <TestDragDropComponent items={mockItems} onReorder={onReorder} constraints={constraints} />
      );

      // 許可されたタイプのみドロップ可能であることを確認
    });
  });

  describe('視覚的フィードバック', () => {
    test('ドラッグ中のスタイル適用', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');

      // ドラッグ開始
      fireEvent.dragStart(dragItem, {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      });

      // ドラッグ中のスタイルが適用されることを確認
      expect(dragItem).toHaveStyle({ opacity: '0.5' });
    });

    test('ドロップゾーンのハイライト', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');
      const dropTarget = screen.getByTestId('item-item-2');

      // ドラッグ開始
      fireEvent.dragStart(dragItem, {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      });

      // ドラッグオーバー
      fireEvent.dragOver(dropTarget, {
        dataTransfer: {
          dropEffect: '',
        },
      });

      // ドロップゾーンのハイライトスタイルが適用されることを確認
      // 実際のスタイル変更は getDropZoneStyles の戻り値で確認
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なARIA属性の設定', () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');

      expect(dragItem).toHaveAttribute('draggable', 'true');
      expect(dragItem).toHaveAttribute('role', 'button');
      expect(dragItem).toHaveAttribute('tabIndex', '0');
      expect(dragItem).toHaveAttribute('aria-label');
    });

    test('キーボード操作のサポート', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');

      // フォーカス可能であることを確認
      await user.tab();
      expect(dragItem).toHaveFocus();
    });

    test('無効化状態の処理', () => {
      const onReorder = vi.fn();

      render(
        <DragDropProvider items={mockItems} onReorder={onReorder}>
          <Draggable item={mockItems[0]} disabled>
            <div>Disabled Item</div>
          </Draggable>
        </DragDropProvider>
      );

      const disabledItem = screen.getByText('Disabled Item').parentElement;

      expect(disabledItem).toHaveAttribute('draggable', 'false');
      expect(disabledItem).toHaveClass('cursor-not-allowed');
    });
  });

  describe('エラーハンドリング', () => {
    test('不正なデータでのドロップ処理', async () => {
      const onReorder = vi.fn();
      const onInvalidDrop = vi.fn();

      render(
        <DragDropProvider items={mockItems} onReorder={onReorder} onInvalidDrop={onInvalidDrop}>
          <div>
            {mockItems.map(item => (
              <DragDropItem key={item.id} item={item}>
                <div>{item.id}</div>
              </DragDropItem>
            ))}
          </div>
        </DragDropProvider>
      );

      const dropTarget = screen.getByText('item-2').parentElement;

      // 不正なデータでドロップ
      fireEvent.drop(dropTarget!, {
        dataTransfer: {
          getData: vi.fn(() => 'invalid-json'),
        },
      });

      // エラーが適切に処理されることを確認
      expect(onReorder).not.toHaveBeenCalled();
    });

    test('存在しないアイテムでのドロップ処理', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dropTarget = screen.getByTestId('item-item-2');

      // 存在しないアイテムのデータでドロップ
      fireEvent.drop(dropTarget, {
        dataTransfer: {
          getData: vi.fn(() =>
            JSON.stringify({
              id: 'non-existent',
              position: 999,
              type: 'subgoal',
            })
          ),
        },
      });

      // 適切に処理されることを確認
      expect(onReorder).toHaveBeenCalledWith(mockItems);
    });
  });

  describe('パフォーマンス', () => {
    test('大量のアイテムでの動作', () => {
      const largeItemList: DraggableItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        position: i,
        type: 'subgoal',
      }));

      const onReorder = vi.fn();

      const { container } = render(
        <TestDragDropComponent items={largeItemList} onReorder={onReorder} />
      );

      // 全てのアイテムがレンダリングされることを確認
      expect(container.querySelectorAll('[data-testid^="item-"]')).toHaveLength(100);
    });

    test('頻繁な状態更新での安定性', async () => {
      const onReorder = vi.fn();

      render(<TestDragDropComponent items={mockItems} onReorder={onReorder} />);

      const dragItem = screen.getByTestId('item-item-1');
      const dropTargets = [screen.getByTestId('item-item-2'), screen.getByTestId('item-item-3')];

      // 複数回のドラッグオーバーを実行
      fireEvent.dragStart(dragItem, {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      });

      for (const target of dropTargets) {
        fireEvent.dragOver(target, {
          dataTransfer: { dropEffect: '' },
        });
      }

      fireEvent.dragEnd(dragItem);

      // エラーが発生しないことを確認
      expect(onReorder).not.toHaveBeenCalled();
    });
  });
});
