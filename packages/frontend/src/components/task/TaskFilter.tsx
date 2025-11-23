import React from 'react';
import { TaskStatus, TaskFilters } from '@goal-mandala/shared';

interface TaskFilterProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  actions: Array<{ id: string; title: string }>;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({ filters, onChange, actions }) => {
  const handleStatusChange = (status: TaskStatus, checked: boolean) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);

    onChange({ ...filters, statuses: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handleDeadlineRangeChange = (range: string) => {
    onChange({ ...filters, deadlineRange: range as any });
  };

  const handleActionChange = (actionId: string, checked: boolean) => {
    const currentActions = filters.actionIds || [];
    const newActions = checked
      ? [...currentActions, actionId]
      : currentActions.filter(id => id !== actionId);

    onChange({ ...filters, actionIds: newActions.length > 0 ? newActions : undefined });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-4">フィルター</h3>

      {/* Status Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">状態</h4>
        <div className="space-y-2">
          {[
            { value: 'not_started', label: '未着手' },
            { value: 'in_progress', label: '進行中' },
            { value: 'completed', label: '完了' },
            { value: 'skipped', label: 'スキップ' },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.statuses?.includes(value as TaskStatus) || false}
                onChange={e => handleStatusChange(value as TaskStatus, e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Deadline Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">期限</h4>
        <select
          value={filters.deadlineRange || ''}
          onChange={e => handleDeadlineRangeChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">すべて</option>
          <option value="today">今日</option>
          <option value="this_week">今週</option>
          <option value="overdue">期限超過</option>
        </select>
      </div>

      {/* Action Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">アクション</h4>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {actions.map(action => (
            <label key={action.id} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.actionIds?.includes(action.id) || false}
                onChange={e => handleActionChange(action.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 truncate">{action.title}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => onChange({})}
        className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        フィルターをクリア
      </button>
    </div>
  );
};
