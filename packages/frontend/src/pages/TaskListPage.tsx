import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '@goal-mandala/shared';
import { TaskCard } from '../components/task/TaskCard';
import { TaskFilter } from '../components/task/TaskFilter';
import { TaskSearch } from '../components/task/TaskSearch';
import { ProgressBar } from '../components/task/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { taskApi } from '../services/taskApi';

interface TaskFilters {
  statuses?: TaskStatus[];
  deadlineRange?: 'today' | 'this_week' | 'overdue' | 'custom';
  actionIds?: string[];
}

export const TaskListPage: React.FC = () => {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch tasks with filters and search
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', filters, searchQuery],
    queryFn: () => taskApi.getTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const tasks = tasksData?.tasks || [];

  // Mutations
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      taskApi.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: error => {
      console.error('Failed to update task status:', error);
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: TaskStatus }) =>
      taskApi.bulkUpdateStatus(taskIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTasks([]);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (taskIds: string[]) => taskApi.bulkDelete(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTasks([]);
    },
  });

  const saveViewMutation = useMutation({
    mutationFn: ({
      name,
      filters,
      searchQuery,
    }: {
      name: string;
      filters: TaskFilters;
      searchQuery: string;
    }) => taskApi.saveView(name, filters, searchQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views'] });
    },
  });

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Apply status filter
    if (filters.statuses?.length) {
      result = result.filter(task => filters.statuses!.includes(task.status));
    }

    // Apply deadline filter
    if (filters.deadlineRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      result = result.filter(task => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline);

        switch (filters.deadlineRange) {
          case 'today':
            return deadline >= today && deadline < new Date(today.getTime() + 24 * 60 * 60 * 1000);
          case 'this_week':
            return deadline >= today && deadline <= weekFromNow;
          case 'overdue':
            return deadline < now && task.status !== TaskStatus.COMPLETED;
          default:
            return true;
        }
      });
    }

    // Apply action filter
    if (filters.actionIds?.length) {
      result = result.filter(task => filters.actionIds!.includes(task.actionId));
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        task =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [tasks, filters, searchQuery]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups = {
      not_started: [] as Task[],
      in_progress: [] as Task[],
      completed: [] as Task[],
      skipped: [] as Task[],
    };

    filteredTasks.forEach(task => {
      groups[task.status].push(task);
    });

    return groups;
  }, [filteredTasks]);

  // Calculate progress
  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completedCount = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    return Math.round((completedCount / tasks.length) * 100);
  }, [tasks]);

  // Mock actions for filter
  const actions = useMemo(() => {
    const actionMap = new Map();
    tasks.forEach(task => {
      if (!actionMap.has(task.actionId)) {
        actionMap.set(task.actionId, {
          id: task.actionId,
          title: `アクション ${task.actionId.slice(-4)}`,
        });
      }
    });
    return Array.from(actionMap.values());
  }, [tasks]);

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks(prev => (selected ? [...prev, taskId] : prev.filter(id => id !== taskId)));
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedTasks(selected ? filteredTasks.map(task => task.id) : []);
  };

  const handleBulkAction = (action: 'complete' | 'delete') => {
    if (selectedTasks.length === 0) return;

    if (action === 'complete') {
      bulkUpdateStatusMutation.mutate({ taskIds: selectedTasks, status: TaskStatus.COMPLETED });
    } else if (action === 'delete') {
      bulkDeleteMutation.mutate(selectedTasks);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">タスク管理</h1>
          <div className="mt-4">
            <ProgressBar progress={progress} label="全体進捗" size="large" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <TaskSearch
              query={searchQuery}
              onChange={setSearchQuery}
              onSaveView={name => saveViewMutation.mutate({ name, filters, searchQuery })}
            />

            <TaskFilter filters={filters} onChange={setFilters} actions={actions} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mb-6">
                <ErrorAlert message="タスクの読み込みに失敗しました" onRetry={() => refetch()} />
              </div>
            )}

            {/* Content */}
            {!isLoading && !error && (
              <>
                {/* Bulk Actions */}
                {selectedTasks.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">
                        {selectedTasks.length}個のタスクが選択されています
                      </span>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleBulkAction('complete')}
                          className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          一括完了
                        </button>
                        <button
                          onClick={() => handleBulkAction('delete')}
                          className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                        >
                          一括削除
                        </button>
                        <button
                          onClick={() => setSelectedTasks([])}
                          className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          選択解除
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Select All */}
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedTasks.length === filteredTasks.length && filteredTasks.length > 0
                      }
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">すべて選択</span>
                  </label>

                  <span className="text-sm text-gray-600">{filteredTasks.length}件のタスク</span>
                </div>

                {/* Task Groups */}
                {Object.entries(groupedTasks).map(([status, statusTasks]) => {
                  if (statusTasks.length === 0) return null;

                  const statusLabels = {
                    not_started: '未着手',
                    in_progress: '進行中',
                    completed: '完了',
                    skipped: 'スキップ',
                  };

                  return (
                    <div key={status} className="mb-8">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">
                        {statusLabels[status as keyof typeof statusLabels]} ({statusTasks.length})
                      </h2>

                      <div className="space-y-3">
                        {statusTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onStatusChange={newStatus =>
                              updateTaskStatusMutation.mutate({
                                taskId: task.id,
                                status: newStatus,
                              })
                            }
                            onSelect={selected => handleTaskSelect(task.id, selected)}
                            selected={selectedTasks.includes(task.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-2">📝</div>
                    <p className="text-gray-600">条件に一致するタスクがありません</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
