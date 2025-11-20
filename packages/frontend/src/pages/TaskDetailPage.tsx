import React, { useState } from 'react';
import { Task, TaskNote, TaskHistory } from '@goal-mandala/shared';

interface TaskDetailPageProps {
  task: Task;
  notes: TaskNote[];
  history: TaskHistory[];
  onStatusChange: (status: TaskStatus) => void;
  onAddNote: (content: string) => void;
  onUpdateNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  task,
  notes,
  history,
  onStatusChange,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const statusLabels = {
    not_started: '未着手',
    in_progress: '進行中',
    completed: '完了',
    skipped: 'スキップ',
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    skipped: 'bg-yellow-100 text-yellow-800',
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  const handleEditNote = (note: TaskNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (editingNote && editContent.trim()) {
      onUpdateNote(editingNote, editContent.trim());
      setEditingNote(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
              {task.description && <p className="text-gray-600 mb-4">{task.description}</p>}
            </div>

            <span
              className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${statusColors[task.status]}
            `}
            >
              {statusLabels[task.status]}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label
                htmlFor="estimated-time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                推定時間
              </label>
              <p id="estimated-time" className="text-sm text-gray-900">
                {task.estimatedMinutes}分
              </p>
            </div>

            {task.deadline && (
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  期限
                </label>
                <p id="deadline" className="text-sm text-gray-900">
                  {new Date(task.deadline).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="task-type" className="block text-sm font-medium text-gray-700 mb-1">
                種別
              </label>
              <p id="task-type" className="text-sm text-gray-900">
                {task.type === 'execution' ? '実行タスク' : '習慣タスク'}
              </p>
            </div>
          </div>

          {task.completedAt && (
            <div className="mb-6">
              <label
                htmlFor="completed-at"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                完了日時
              </label>
              <p id="completed-at" className="text-sm text-gray-900">
                {new Date(task.completedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Status Update */}
          <div>
            <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-2">
              状態を変更
            </label>
            <select
              id="status-select"
              value={task.status}
              onChange={e => onStatusChange(e.target.value as TaskStatus)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="not_started">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
              <option value="skipped">スキップ</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ノート</h2>

            {/* Add Note */}
            <div className="mb-6">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="ノートを追加..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="mt-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ノートを追加
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="border border-gray-200 rounded-md p-3">
                  {editingNote === note.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-900 mb-2">{note.content}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                        <div className="space-x-2">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {notes.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">ノートがありません</p>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">履歴</h2>

            <div className="space-y-3">
              {history.map(entry => (
                <div key={entry.id} className="flex items-center space-x-3 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <span className="text-gray-900">
                      {statusLabels[entry.oldStatus]} → {statusLabels[entry.newStatus]}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.changedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">履歴がありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
