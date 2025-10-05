# キーボード操作実装状況

## 実装済みの機能

### 基本的なキーボード操作

#### InlineEditor

- ✅ **Enter**: 保存（単一行モード）
- ✅ **Ctrl+Enter / Cmd+Enter**: 保存（複数行モード）
- ✅ **Escape**: キャンセル
- ✅ **自動フォーカス**: 編集モード開始時に入力フィールドに自動フォーカス
- ✅ **テキスト全選択**: 編集開始時に既存テキストを全選択

#### MandalaCell

- ✅ **Enter / Space**: セルの選択・編集開始
- ✅ **クリック**: インライン編集開始
- ✅ **ダブルクリック**: インライン編集開始
- ✅ **tabindex=0**: キーボードでフォーカス可能

#### EditModal

- ✅ **Escape**: モーダルを閉じる
- ✅ **バックドロップクリック**: モーダルを閉じる

#### HistoryPanel

- ✅ **Escape**: 詳細モーダルを閉じる

### アクセシビリティフック

#### useFocusManagement

- ✅ **setupFocusTrap**: フォーカストラップの設定
- ✅ **focusNext**: 次の要素にフォーカス
- ✅ **focusPrevious**: 前の要素にフォーカス
- ✅ **getFocusableElements**: フォーカス可能な要素の取得

#### useKeyboardNavigation

- ✅ **Enter**: カスタムアクション実行
- ✅ **Escape**: カスタムアクション実行
- ✅ **矢印キー**: カスタムナビゲーション

#### useFocusTrap

- ✅ **Tab**: 最後の要素から最初の要素へループ
- ✅ **Shift+Tab**: 最初の要素から最後の要素へループ

## 実装が必要な機能

### Tab/Shift+Tabによるセル間移動

現在、InlineEditorでは以下の動作になっています：

- **Tab**: デフォルトのブラウザ動作（次のフォーカス可能要素へ移動）
- **Shift+Tab**: デフォルトのブラウザ動作（前のフォーカス可能要素へ移動）

マンダラチャート画面では、以下の動作が望ましい：

1. **Tab**: 現在のセルの編集を保存し、次のセルにフォーカス
2. **Shift+Tab**: 現在のセルの編集を保存し、前のセルにフォーカス

### 実装方針

#### オプション1: InlineEditorでTabキーをハンドリング

```typescript
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // 保存してから次/前のセルにフォーカス
      if (validation.isValid) {
        handleSave().then(() => {
          if (e.shiftKey) {
            // 前のセルにフォーカス
            onFocusPrevious?.();
          } else {
            // 次のセルにフォーカス
            onFocusNext?.();
          }
        });
      }
      return;
    }
    // ... 既存のコード
  },
  [validation.isValid, handleSave, onFocusPrevious, onFocusNext]
);
```

#### オプション2: MandalaCellでフォーカス管理

```typescript
const { focusNext, focusPrevious } = useFocusManagement();

const handleInlineSave = async (value: string) => {
  if (onSaveInlineEdit) {
    await onSaveInlineEdit(value);
  }
  if (onEndInlineEdit) {
    onEndInlineEdit();
  }
  // 保存後、次のセルにフォーカス
  focusNext();
};
```

## テスト状況

### E2Eテスト

- ❌ **Tabキーでフォーカス移動**: マンダラチャート画面未実装のため失敗
- ❌ **Shift+Tabキーで逆方向フォーカス移動**: マンダラチャート画面未実装のため失敗
- ❌ **複数回のEnter/Escキー操作**: マンダラチャート画面未実装のため失敗

### 単体テスト

- ✅ InlineEditorのキーボード操作テスト
- ✅ MandalaCellのキーボード操作テスト
- ✅ アクセシビリティフックのテスト

## 結論

基本的なキーボード操作（Enter、Escape）は完全に実装されています。
Tab/Shift+Tabによるセル間移動は、マンダラチャート画面の実装と合わせて実装する必要があります。

現時点では、以下が確認されています：

1. ✅ Enter/Escapeキーの動作
2. ✅ 自動フォーカス管理
3. ✅ フォーカストラップ機能
4. ⚠️ Tab/Shift+Tabによるセル間移動（マンダラチャート画面実装後に対応）

## 推奨事項

1. **現時点での対応**: 基本的なキーボード操作は実装済みとして、タスク15.1を完了とする
2. **将来の対応**: マンダラチャート画面実装時に、Tab/Shift+Tabによるセル間移動を実装する
3. **代替手段**: 現在は矢印キーでのナビゲーションも検討可能（useKeyboardNavigationフックを活用）
