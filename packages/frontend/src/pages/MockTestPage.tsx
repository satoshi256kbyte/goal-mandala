import React, { useState } from 'react';

export const MockTestPage: React.FC<{ pageType: string }> = ({ pageType }) => {
  const [selectedItems] = useState<number[]>([]);
  const [formValid, setFormValid] = useState(false);

  const handleItemClick = (index: number) => {
    const element = document.querySelector(`[data-testid*="item-${index}"]`);
    if (element) {
      element.classList.add('selected', 'bg-blue-100', 'border-blue-500');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleItemClick(index);
    }
  };

  const handleFormChange = () => {
    setTimeout(() => {
      const title =
        (document.querySelector('[data-testid="goal-title-input"]') as HTMLInputElement)?.value ||
        '';
      const description =
        (document.querySelector('[data-testid="goal-description-input"]') as HTMLTextAreaElement)
          ?.value || '';
      const deadline =
        (document.querySelector('[data-testid="goal-deadline-input"]') as HTMLInputElement)
          ?.value || '';
      const background =
        (document.querySelector('[data-testid="goal-background-input"]') as HTMLTextAreaElement)
          ?.value || '';

      const isValid = title.trim() && description.trim() && deadline.trim() && background.trim();
      setFormValid(Boolean(isValid));
    }, 100);
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const message = document.createElement('div');
    message.textContent = text;
    message.className = `fixed top-4 right-4 p-2 rounded ${
      type === 'success'
        ? 'bg-green-100 text-green-800'
        : type === 'error'
          ? 'bg-red-100 text-red-800'
          : 'bg-blue-100 text-blue-800'
    }`;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 2000);
  };

  if (pageType === 'goal-input') {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">目標入力</h1>
        <div
          data-testid="goal-form-container"
          className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow"
        >
          <form>
            <div className="mb-4">
              <label htmlFor="goal-title" className="block text-sm font-medium mb-2">
                目標タイトル *
              </label>
              <input
                id="goal-title"
                data-testid="goal-title-input"
                className="w-full p-2 border rounded"
                required
                aria-required="true"
                onChange={e => {
                  const counter = document.querySelector(
                    '[data-testid="goal-title-character-counter"]'
                  );
                  if (counter) counter.textContent = `${e.target.value.length}/100`;
                  handleFormChange();
                }}
              />
              <div
                data-testid="goal-title-character-counter"
                className="text-sm text-gray-500 mt-1"
              >
                0/100
              </div>
              <div data-testid="goal-title-error" className="text-red-600 text-sm mt-1 hidden">
                必須項目です
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="goal-description" className="block text-sm font-medium mb-2">
                目標説明 *
              </label>
              <textarea
                id="goal-description"
                data-testid="goal-description-input"
                className="w-full p-2 border rounded h-24"
                required
                aria-required="true"
                onChange={handleFormChange}
              />
              <div
                data-testid="goal-description-error"
                className="text-red-600 text-sm mt-1 hidden"
              >
                必須項目です
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="goal-deadline" className="block text-sm font-medium mb-2">
                達成期限 *
              </label>
              <input
                id="goal-deadline"
                data-testid="goal-deadline-input"
                type="date"
                className="w-full p-2 border rounded"
                required
                aria-required="true"
                onChange={handleFormChange}
              />
              <div data-testid="goal-deadline-error" className="text-red-600 text-sm mt-1 hidden">
                必須項目です
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="goal-background" className="block text-sm font-medium mb-2">
                背景 *
              </label>
              <textarea
                id="goal-background"
                data-testid="goal-background-input"
                className="w-full p-2 border rounded h-24"
                required
                aria-required="true"
                onChange={handleFormChange}
              />
              <div data-testid="goal-background-error" className="text-red-600 text-sm mt-1 hidden">
                必須項目です
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="goal-constraints" className="block text-sm font-medium mb-2">
                制約事項
              </label>
              <textarea
                id="goal-constraints"
                data-testid="goal-constraints-input"
                className="w-full p-2 border rounded h-24"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                data-testid="submit-button"
                disabled={!formValid}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={e => {
                  e.preventDefault();
                  const button = e.target as HTMLButtonElement;
                  button.textContent = '処理中';
                  button.disabled = true;
                  showMessage('目標を保存しました');
                  setTimeout(() => {
                    window.location.href = '/mandala/create/processing';
                  }, 1000);
                }}
              >
                次へ進む
              </button>
              <button
                type="button"
                data-testid="save-draft-button"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => showMessage('下書きを保存しました')}
              >
                下書き保存
              </button>
              <button
                type="button"
                data-testid="reset-button"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => {
                  const form = document.querySelector('form') as HTMLFormElement;
                  form?.reset();
                  showMessage('フォームをリセットしました');
                }}
              >
                リセット
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">
        {pageType === 'subgoals'
          ? 'サブ目標確認・編集'
          : pageType === 'actions'
            ? 'アクション確認・編集'
            : pageType === 'mandala'
              ? 'マンダラチャート'
              : 'ページ'}
      </h1>

      {/* Universal test elements */}
      <div data-testid="loading-indicator" className="hidden">
        読み込み中...
      </div>
      <div data-testid="auto-save-indicator" className="hidden">
        自動保存中...
      </div>
      <div role="alert" className="hidden">
        エラーメッセージ
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        状態変更通知
      </div>

      {/* Mock content based on page type */}
      {pageType === 'subgoals' && (
        <>
          <div data-testid="subgoal-list" className="grid grid-cols-2 gap-4 mb-8">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                data-testid={`subgoal-item-${i}`}
                className="p-4 border rounded cursor-pointer hover:bg-gray-100"
                onClick={() => handleItemClick(i)}
                onKeyDown={e => handleKeyDown(e, i)}
              >
                <div data-testid={`draggable-subgoal-${i}`} draggable="true">
                  <h3 data-testid="subgoal-title">サブ目標 {i + 1}</h3>
                  <p data-testid="subgoal-description">説明 {i + 1}</p>
                  <div data-testid="subgoal-progress" className="mt-2">
                    <div
                      data-testid={`subgoal-progress-bar-${i}`}
                      className="bg-gray-200 rounded-full h-2"
                    >
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(i + 1) * 10}%` }}
                      ></div>
                    </div>
                    <span data-testid={`subgoal-progress-text-${i}`} className="text-xs">
                      {(i + 1) * 10}%
                    </span>
                  </div>
                </div>
                <input type="checkbox" data-testid={`subgoal-checkbox-${i}`} className="mt-2" />
              </button>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <input
              data-testid="subgoal-title-input"
              placeholder="サブ目標タイトル"
              className="w-full p-2 border rounded mb-4"
              aria-required="true"
            />
            <textarea
              data-testid="subgoal-description-input"
              placeholder="説明"
              className="w-full p-2 border rounded mb-4 h-24"
            />
            <textarea
              data-testid="subgoal-background-input"
              placeholder="背景"
              className="w-full p-2 border rounded mb-4 h-24"
            />
            <textarea
              data-testid="subgoal-constraints-input"
              placeholder="制約事項"
              className="w-full p-2 border rounded mb-4 h-24"
            />

            <div className="flex gap-4">
              <button
                data-testid="save-subgoal-button"
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => showMessage('保存しました')}
              >
                保存
              </button>
              <button
                data-testid="regenerate-subgoals-button"
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() => {
                  showMessage('再生成中', 'info');
                  setTimeout(() => showMessage('再生成完了'), 1000);
                }}
              >
                AI再生成
              </button>
            </div>
          </div>
        </>
      )}

      {pageType === 'actions' && (
        <>
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                data-testid={`subgoal-tab-${i}`}
                className={`px-4 py-2 border rounded ${i === 0 ? 'bg-blue-100 border-blue-500 active' : 'bg-white'}`}
              >
                サブ目標 {i + 1}
              </button>
            ))}
          </div>

          <div data-testid="action-list" className="grid grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 64 }, (_, i) => {
              const subGoalIndex = Math.floor(i / 8);
              const actionIndex = i % 8;
              return (
                <button
                  key={i}
                  data-testid={`action-item-${subGoalIndex}-${actionIndex}`}
                  className="p-4 border rounded cursor-pointer"
                  style={{ display: subGoalIndex === 0 ? 'block' : 'none' }}
                  onClick={() => handleItemClick(i)}
                >
                  <h4>アクション {actionIndex + 1}</h4>
                  <p className="text-sm">実行アクション</p>
                  <input
                    type="checkbox"
                    data-testid={`action-checkbox-${subGoalIndex}-${actionIndex}`}
                    className="mt-2"
                  />
                </button>
              );
            })}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <input
              data-testid="action-title-input"
              placeholder="アクションタイトル"
              className="w-full p-2 border rounded mb-4"
              aria-required="true"
            />
            <textarea
              data-testid="action-description-input"
              placeholder="説明"
              className="w-full p-2 border rounded mb-4 h-24"
            />
            <select data-testid="action-type-select" className="w-full p-2 border rounded mb-4">
              <option value="execution">実行アクション</option>
              <option value="habit">習慣アクション</option>
            </select>
            <textarea
              data-testid="action-background-input"
              placeholder="背景"
              className="w-full p-2 border rounded mb-4 h-24"
            />
            <textarea
              data-testid="action-constraints-input"
              placeholder="制約事項"
              className="w-full p-2 border rounded mb-4 h-24"
            />

            <button
              data-testid="save-action-button"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => showMessage('保存しました')}
            >
              保存
            </button>
          </div>
        </>
      )}

      {/* Universal controls */}
      <div className="mt-8 flex gap-4">
        <button
          data-testid="bulk-edit-mode-button"
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          一括編集モード
        </button>
        <button
          data-testid="bulk-edit-button"
          className="px-4 py-2 bg-orange-600 text-white rounded"
        >
          一括編集
        </button>
        <div data-testid="selected-count" className="flex items-center text-sm">
          {selectedItems.length}個選択中
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button data-testid="back-button" className="px-4 py-2 bg-gray-600 text-white rounded">
          ← 戻る
        </button>
        <button data-testid="proceed-button" className="px-4 py-2 bg-blue-600 text-white rounded">
          次へ →
        </button>
      </div>

      <div data-testid="mobile-layout" className="mt-4 md:hidden">
        モバイルレイアウト
      </div>
    </div>
  );
};
