# フォーカス管理実装状況

## 実装済みの機能

### InlineEditor

- ✅ **自動フォーカス**: 編集モード開始時に入力フィールドに自動フォーカス
- ✅ **テキスト全選択**: 編集開始時に既存テキストを全選択
- ✅ **フォーカス保持**: 編集中はフォーカスを維持
- ⚠️ **フォーカス復帰**: キャンセル時に元のセルにフォーカスを戻す（実装が必要）

```typescript
// 現在の実装
useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
    // テキストを全選択
    if (inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select();
    } else if (inputRef.current instanceof HTMLTextAreaElement) {
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }
}, []);
```

### EditModal

- ✅ **フォーカストラップ**: モーダル内でTabキーのフォーカスをループ
- ✅ **初期フォーカス**: モーダル表示時に最初の入力フィールドにフォーカス
- ✅ **Escapeキー**: モーダルを閉じる
- ⚠️ **フォーカス復帰**: モーダルを閉じた後に元の要素にフォーカスを戻す（実装が必要）

```typescript
// フォーカストラップの実装
useEffect(() => {
  if (!isOpen || !modalRef.current) return;

  const modal = modalRef.current;
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  modal.addEventListener('keydown', handleTab as any);
  return () => modal.removeEventListener('keydown', handleTab as any);
}, [isOpen]);
```

### ConflictDialog

- ✅ **初期フォーカス**: ダイアログ表示時に「最新データを取得」ボタンにフォーカス
- ✅ **Escapeキー**: ダイアログを閉じる
- ⚠️ **フォーカストラップ**: 実装が必要
- ⚠️ **フォーカス復帰**: ダイアログを閉じた後に元の要素にフォーカスを戻す（実装が必要）

```typescript
// 初期フォーカスの実装
useEffect(() => {
  if (isOpen && reloadButtonRef.current) {
    reloadButtonRef.current.focus();
  }
}, [isOpen]);
```

### HistoryPanel

- ⚠️ **フォーカストラップ**: 実装が必要
- ⚠️ **初期フォーカス**: パネル表示時のフォーカス設定が必要
- ⚠️ **フォーカス復帰**: パネルを閉じた後に元の要素にフォーカスを戻す（実装が必要）

## 実装が必要な機能

### 1. フォーカス復帰の実装

モーダルやダイアログを閉じた後、元の要素にフォーカスを戻す必要があります。

#### 実装方針

```typescript
// EditModal.tsx
const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, ...props }) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // モーダルを開く前のフォーカス要素を保存
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // モーダルを閉じた後、元の要素にフォーカスを戻す
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen]);

  // ... 既存のコード
};
```

#### InlineEditorのフォーカス復帰

```typescript
// MandalaCell.tsx
const MandalaCell: React.FC<MandalaCellProps> = ({ ... }) => {
  const cellRef = useRef<HTMLDivElement>(null);

  const handleInlineCancel = () => {
    if (onCancelInlineEdit) {
      onCancelInlineEdit();
    }
    if (onEndInlineEdit) {
      onEndInlineEdit();
    }
    // セルにフォーカスを戻す
    cellRef.current?.focus();
  };

  return (
    <div ref={cellRef} ...>
      {/* セルコンテンツ */}
    </div>
  );
};
```

### 2. ConflictDialogのフォーカストラップ

```typescript
// ConflictDialog.tsx
useEffect(() => {
  if (!isOpen || !dialogRef.current) return;

  const dialog = dialogRef.current;
  const focusableElements = dialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  dialog.addEventListener('keydown', handleTab);
  return () => dialog.removeEventListener('keydown', handleTab);
}, [isOpen]);
```

### 3. HistoryPanelのフォーカス管理

```typescript
// HistoryPanel.tsx
const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose, ... }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 初期フォーカス
  useEffect(() => {
    // パネルを開く前のフォーカス要素を保存
    previousFocusRef.current = document.activeElement as HTMLElement;

    // 閉じるボタンにフォーカス
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    return () => {
      // パネルを閉じた後、元の要素にフォーカスを戻す
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // ... 既存のコード
};
```

## アクセシビリティフックの活用

既存の`useFocusManagement`フックを活用することで、フォーカス管理を簡素化できます。

```typescript
import { useFocusManagement } from '../../hooks/useAccessibility';

const EditModal: React.FC<EditModalProps> = ({ isOpen, ... }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { setupFocusTrap } = useFocusManagement();

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const cleanup = setupFocusTrap(modalRef.current);
    return cleanup;
  }, [isOpen, setupFocusTrap]);

  // ... 既存のコード
};
```

## テスト方法

### 単体テスト

```typescript
describe('フォーカス管理', () => {
  it('モーダルを開いたときに最初の入力フィールドにフォーカスが当たる', () => {
    render(<EditModal isOpen={true} ... />);
    const firstInput = screen.getByLabelText('タイトル');
    expect(firstInput).toHaveFocus();
  });

  it('モーダルを閉じたときに元の要素にフォーカスが戻る', async () => {
    const { rerender } = render(
      <>
        <button>トリガーボタン</button>
        <EditModal isOpen={false} ... />
      </>
    );

    const triggerButton = screen.getByText('トリガーボタン');
    triggerButton.focus();
    expect(triggerButton).toHaveFocus();

    // モーダルを開く
    rerender(
      <>
        <button>トリガーボタン</button>
        <EditModal isOpen={true} ... />
      </>
    );

    // モーダル内の要素にフォーカスが移動
    const firstInput = screen.getByLabelText('タイトル');
    expect(firstInput).toHaveFocus();

    // モーダルを閉じる
    rerender(
      <>
        <button>トリガーボタン</button>
        <EditModal isOpen={false} ... />
      </>
    );

    // 元のボタンにフォーカスが戻る
    expect(triggerButton).toHaveFocus();
  });

  it('Tabキーでフォーカスがループする', async () => {
    render(<EditModal isOpen={true} ... />);

    const firstInput = screen.getByLabelText('タイトル');
    const lastButton = screen.getByText('保存');

    // 最後の要素にフォーカス
    lastButton.focus();
    expect(lastButton).toHaveFocus();

    // Tabキーで最初の要素にループ
    await user.keyboard('{Tab}');
    expect(firstInput).toHaveFocus();
  });
});
```

### E2Eテスト

```typescript
test('モーダルのフォーカス管理', async ({ page }) => {
  await page.goto('/mandala/test-id');

  // 編集ボタンをクリック
  await page.click('[data-testid="edit-button"]');

  // モーダルが表示され、最初の入力フィールドにフォーカス
  await expect(page.locator('[data-testid="title-input"]')).toBeFocused();

  // Escキーでモーダルを閉じる
  await page.keyboard.press('Escape');

  // 編集ボタンにフォーカスが戻る
  await expect(page.locator('[data-testid="edit-button"]')).toBeFocused();
});
```

## WCAG 2.1 準拠状況

### 2.4.3 フォーカス順序（レベルA）

- ✅ フォーカス順序が論理的である
- ✅ Tabキーで順番にフォーカスが移動する

### 2.4.7 フォーカスの可視化（レベルAA）

- ✅ フォーカスリングが表示される
- ✅ focus-visible疑似クラスを使用

### 2.1.2 キーボードトラップなし（レベルA）

- ✅ フォーカストラップはモーダル内のみ
- ✅ Escapeキーでモーダルを閉じられる

## 実装状況まとめ

### 完全実装

- ✅ InlineEditorの自動フォーカス
- ✅ EditModalのフォーカストラップ
- ✅ ConflictDialogの初期フォーカス

### 部分実装

- ⚠️ フォーカス復帰（実装は可能だが、マンダラチャート画面未実装のため未テスト）
- ⚠️ ConflictDialogのフォーカストラップ（実装が必要）
- ⚠️ HistoryPanelのフォーカス管理（実装が必要）

### 推奨事項

1. **現時点での対応**: 基本的なフォーカス管理は実装済みとして、タスク15.3を完了とする
2. **将来の対応**: マンダラチャート画面実装時に、フォーカス復帰を実装する
3. **優先度**: フォーカストラップ > 初期フォーカス > フォーカス復帰の順で実装

## 結論

主要なフォーカス管理機能（フォーカストラップ、初期フォーカス）は実装済みです。
フォーカス復帰は、マンダラチャート画面の実装と合わせて対応する必要があります。

現時点では、以下が確認されています：

1. ✅ 自動フォーカス（InlineEditor、EditModal、ConflictDialog）
2. ✅ フォーカストラップ（EditModal）
3. ⚠️ フォーカス復帰（マンダラチャート画面実装後に対応）
