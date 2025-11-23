import React from 'react';
import { Task, TaskStatus } from '@goal-mandala/shared';

interface TaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onSelect: (selected: boolean) => void;
  selected: boolean;
}

const statusColors = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  skipped: 'スキップ',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onSelect, selected }) => {
  const isOverdue =
    task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
  const isApproaching =
    task.deadline &&
    new Date(task.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 &&
    task.status !== 'completed';

  return (
    <div
      className={`
      p-4 border rounded-lg shadow-sm transition-all duration-200 hover:shadow-md
      ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}
      ${isOverdue ? 'border-red-300' : isApproaching ? 'border-yellow-300' : 'border-gray-200'}
    `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={e => onSelect(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
          />

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>

            {task.description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{task.description}</p>
            )}

            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              <span>{task.estimatedMinutes}分</span>

              {task.deadline && (
                <span
                  className={
                    isOverdue
                      ? 'text-red-600 font-medium'
                      : isApproaching
                        ? 'text-yellow-600 font-medium'
                        : ''
                  }
                >
                  期限: {new Date(task.deadline).toLocaleDateString()}
                </span>
              )}

              <span className="capitalize">{task.type === 'execution' ? '実行' : '習慣'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <span
            className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${statusColors[task.status]}
          `}
          >
            {statusLabels[task.status]}
          </span>

          <select
            value={task.status}
            onChange={e => onStatusChange(e.target.value as TaskStatus)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="not_started">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="completed">完了</option>
            <option value="skipped">スキップ</option>
          </select>
        </div>
      </div>

      {task.completedAt && (
        <div className="mt-2 text-xs text-gray-500">
          完了日時: {new Date(task.completedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};
