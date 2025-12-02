import React, { useState, useCallback } from 'react';
import { debounce } from 'lodash';

interface TaskSearchProps {
  query: string;
  onChange: (query: string) => void;
  onSaveView: (name: string) => void;
}

export const TaskSearch: React.FC<TaskSearchProps> = ({ query, onChange, onSaveView }) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');

  const debouncedOnChange = useCallback(
    debounce((value: string) => onChange(value), 300),
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debouncedOnChange(value);
  };

  const handleSaveView = () => {
    if (viewName.trim()) {
      onSaveView(viewName.trim());
      setViewName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center space-x-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="タスクを検索..."
            defaultValue={query}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
        >
          ビューを保存
        </button>
      </div>

      {query && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>検索中: &quot;{query}&quot;</span>
          <button
            onClick={() => onChange('')}
            className="text-blue-600 hover:text-blue-800"
            aria-label="検索をクリア"
          >
            クリア
          </button>
        </div>
      )}

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ビューを保存</h3>

            <input
              type="text"
              placeholder="ビュー名を入力..."
              value={viewName}
              onChange={e => setViewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setViewName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
