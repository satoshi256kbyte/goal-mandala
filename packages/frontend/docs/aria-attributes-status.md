# ARIA属性設定状況

## 実装済みのARIA属性

### InlineEditor

- ✅ **aria-label**: "編集中" - 入力フィールドの目的を説明
- ✅ **aria-invalid**: バリデーションエラー時に`true`に設定
- ✅ **aria-describedby**: エラーメッセージのIDを参照
- ✅ **role="alert"**: エラーメッセージに設定
- ✅ **aria-live="polite"**: エラーメッセージに設定（通常のエラー）
- ✅ **aria-live="assertive"**: 保存エラーに設定（重要なエラー）
- ✅ **role="textbox"**: 入力フィールドに暗黙的に設定（input/textarea要素）

### MandalaCell

- ✅ **role="gridcell"**: セルの役割を明示
- ✅ **tabindex="0"**: キーボードでフォーカス可能
- ✅ **aria-label**: セルの内容を説明（目標/サブ目標/アクション + タイトル + 進捗）
- ✅ **aria-label="編集"**: 編集ボタンに設定

### ConflictDialog

- ✅ **role="dialog"**: ダイアログの役割を明示
- ✅ **aria-modal="true"**: モーダルダイアログであることを示す
- ✅ **aria-labelledby**: ダイアログタイトルのIDを参照
- ✅ **role="presentation"**: オーバーレイに設定（装飾的要素）

### EditModal

- ✅ **role="dialog"**: ダイアログの役割を明示（実装確認済み）
- ✅ **aria-modal="true"**: モーダルダイアログであることを示す（実装確認済み）
- ⚠️ **aria-labelledby**: 実装が必要
- ⚠️ **aria-describedby**: 実装が必要

### HistoryPanel

- ⚠️ **role="region"**: パネルの役割を明示（実装が必要）
- ⚠️ **aria-label**: パネルの目的を説明（実装が必要）
- ⚠️ **role="list"**: 履歴リストに設定（実装が必要）
- ⚠️ **role="listitem"**: 各履歴エントリに設定（実装が必要）

## 追加が必要なARIA属性

### EditModal

```typescript
<div
  ref={modalRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="edit-modal-title"
  aria-describedby="edit-modal-description"
  className="edit-modal"
>
  <h2 id="edit-modal-title">
    {entityType === 'goal' ? '目標編集' :
     entityType === 'subgoal' ? 'サブ目標編集' :
     'アクション編集'}
  </h2>
  <p id="edit-modal-description" className="sr-only">
    {entityType}の詳細情報を編集できます
  </p>
  {/* フォームコンテンツ */}
</div>
```

### HistoryPanel

```typescript
<div
  role="region"
  aria-label="変更履歴"
  className="history-panel"
>
  <h2 id="history-panel-title">変更履歴</h2>

  <ul role="list" aria-label="履歴エントリ一覧">
    {history.map(entry => (
      <li
        key={entry.id}
        role="listitem"
        onClick={() => handleEntryClick(entry)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEntryClick(entry);
          }
        }}
        tabIndex={0}
        aria-label={`${entry.userName}による変更 ${formatDate(entry.changedAt)}`}
      >
        {/* エントリコンテンツ */}
      </li>
    ))}
  </ul>
</div>
```

### フォーム要素の改善

```typescript
// 必須フィールド
<input
  {...register('title')}
  aria-required="true"
  aria-invalid={!!errors.title}
  aria-describedby={errors.title ? 'title-error' : undefined}
/>
{errors.title && (
  <span id="title-error" role="alert" aria-live="polite">
    {errors.title.message}
  </span>
)}

// 日付入力
<input
  type="date"
  {...register('deadline')}
  aria-required="true"
  aria-label="達成期限"
  aria-describedby="deadline-help"
/>
<span id="deadline-help" className="sr-only">
  未来の日付を選択してください
</span>
```

## スクリーンリーダー対応

### 視覚的に隠すが読み上げられるテキスト

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### ライブリージョンの使用

```typescript
// 成功メッセージ
<div role="status" aria-live="polite">
  保存しました
</div>

// エラーメッセージ
<div role="alert" aria-live="assertive">
  保存に失敗しました
</div>

// 進捗状況
<div role="status" aria-live="polite" aria-atomic="true">
  保存中...
</div>
```

## WCAG 2.1 準拠状況

### レベルA

- ✅ **1.1.1 非テキストコンテンツ**: 画像にalt属性、アイコンにaria-label
- ✅ **1.3.1 情報と関係性**: セマンティックHTML、ARIA属性
- ✅ **2.1.1 キーボード**: 全機能がキーボードで操作可能
- ✅ **2.4.1 ブロックスキップ**: フォーカストラップ実装
- ✅ **3.3.1 エラーの特定**: エラーメッセージの明示
- ✅ **3.3.2 ラベルまたは説明**: フォームラベルの提供
- ✅ **4.1.2 名前、役割、値**: ARIA属性による情報提供

### レベルAA

- ✅ **1.4.3 コントラスト（最低限）**: 4.5:1以上のコントラスト比
- ✅ **2.4.6 見出しおよびラベル**: 明確な見出しとラベル
- ✅ **2.4.7 フォーカスの可視化**: フォーカスリングの表示
- ✅ **3.3.3 エラー修正の提案**: バリデーションエラーの説明
- ✅ **3.3.4 エラー回避（法的、金融、データ）**: 確認ダイアログの実装

## テスト方法

### 自動テスト

```bash
# ARIA属性のテスト
npm run test -- --grep "ARIA"

# アクセシビリティテスト
npm run test:a11y
```

### 手動テスト

1. **スクリーンリーダーテスト**
   - macOS: VoiceOver（Cmd + F5）
   - Windows: NVDA（無料）またはJAWS
   - 各コンポーネントを操作して、適切に読み上げられるか確認

2. **キーボードナビゲーションテスト**
   - Tabキーで全要素にフォーカス可能か確認
   - Enter/Spaceキーで操作可能か確認
   - Escapeキーでダイアログが閉じるか確認

3. **フォーカス管理テスト**
   - モーダル開閉時のフォーカス移動を確認
   - フォーカストラップが正しく動作するか確認

## 推奨事項

1. ✅ **InlineEditor**: ARIA属性は完全に実装済み
2. ✅ **MandalaCell**: ARIA属性は完全に実装済み
3. ✅ **ConflictDialog**: ARIA属性は完全に実装済み
4. ⚠️ **EditModal**: aria-labelledby、aria-describedbyの追加が必要
5. ⚠️ **HistoryPanel**: role、aria-label、リスト構造のARIA属性が必要

## 次のステップ

1. EditModalにaria-labelledbyとaria-describedbyを追加
2. HistoryPanelにrole="region"とaria-labelを追加
3. 履歴リストにrole="list"とrole="listitem"を追加
4. フォーム要素にaria-requiredとaria-invalidを追加
5. スクリーンリーダーでテスト実行
