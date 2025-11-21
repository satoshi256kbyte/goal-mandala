import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../services/taskApi';
import { Task, TaskStatus, TaskFilters, TaskNote } from '@goal-mandala/shared';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters, searchQuery?: string) =>
    [...taskKeys.lists(), { filters, searchQuery }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  savedViews: () => [...taskKeys.all, 'savedViews'] as const,
};

// タスク一覧取得フック
export const useTasks = (filters?: TaskFilters, searchQuery?: string) => {
  return useQuery({
    queryKey: taskKeys.list(filters, searchQuery),
    queryFn: () => taskApi.getTasks(filters, searchQuery),
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
    gcTime: 10 * 60 * 1000, // 10分後にガベージコレクション
  });
};

// タスク詳細取得フック
export const useTaskDetail = (taskId: string) => {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => taskApi.getTaskById(taskId),
    staleTime: 2 * 60 * 1000, // 2分キャッシュ
    enabled: !!taskId,
  });
};

// タスク状態更新フック
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      taskApi.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // 楽観的更新
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });

      const previousTaskDetail = queryClient.getQueryData(taskKeys.detail(taskId));

      // タスク詳細を楽観的に更新
      queryClient.setQueryData(taskKeys.detail(taskId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          task: {
            ...old.task,
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : old.task.completedAt,
            updatedAt: new Date().toISOString(),
          },
        };
      });

      // タスク一覧も更新
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: any) => {
        if (!old?.tasks) return old;
        return {
          ...old,
          tasks: old.tasks.map((task: Task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  completedAt: status === 'completed' ? new Date().toISOString() : task.completedAt,
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        };
      });

      return { previousTaskDetail };
    },
    onError: (err, { taskId }, context) => {
      // エラー時にロールバック
      if (context?.previousTaskDetail) {
        queryClient.setQueryData(taskKeys.detail(taskId), context.previousTaskDetail);
      }
    },
    onSettled: (data, error, { taskId }) => {
      // 成功・失敗に関わらず関連データを再取得
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
};

// ノート追加フック
export const useAddNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      taskApi.addNote(taskId, content),
    onSuccess: (data, { taskId }) => {
      // タスク詳細のノート一覧を更新
      queryClient.setQueryData(taskKeys.detail(taskId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notes: [...(old.notes || []), data.note],
        };
      });
    },
  });
};

// ノート更新フック
export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      noteId,
      content,
    }: {
      taskId: string;
      noteId: string;
      content: string;
    }) => taskApi.updateNote(taskId, noteId, content),
    onSuccess: (data, { taskId, noteId }) => {
      // タスク詳細のノート一覧を更新
      queryClient.setQueryData(taskKeys.detail(taskId), (old: any) => {
        if (!old?.notes) return old;
        return {
          ...old,
          notes: old.notes.map((note: TaskNote) => (note.id === noteId ? data.note : note)),
        };
      });
    },
  });
};

// ノート削除フック
export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, noteId }: { taskId: string; noteId: string }) =>
      taskApi.deleteNote(taskId, noteId),
    onSuccess: (data, { taskId, noteId }) => {
      // タスク詳細のノート一覧を更新
      queryClient.setQueryData(taskKeys.detail(taskId), (old: any) => {
        if (!old?.notes) return old;
        return {
          ...old,
          notes: old.notes.filter((note: TaskNote) => note.id !== noteId),
        };
      });
    },
  });
};

// 一括状態更新フック
export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: TaskStatus }) =>
      taskApi.bulkUpdateStatus(taskIds, status),
    onSuccess: (data, { taskIds, status }) => {
      // 全てのタスク一覧を無効化して再取得
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      // 詳細ページが開かれているタスクも無効化
      taskIds.forEach(taskId => {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      });
    },
  });
};

// 一括削除フック
export const useBulkDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskIds }: { taskIds: string[] }) => taskApi.bulkDelete(taskIds),
    onSuccess: (data, { taskIds }) => {
      // 全てのタスク一覧を無効化して再取得
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      // 削除されたタスクの詳細データを削除
      taskIds.forEach(taskId => {
        queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
      });
    },
  });
};

// 保存済みビュー取得フック
export const useSavedViews = () => {
  return useQuery({
    queryKey: taskKeys.savedViews(),
    queryFn: () => taskApi.getSavedViews(),
    staleTime: 10 * 60 * 1000, // 10分キャッシュ
  });
};

// ビュー保存フック
export const useSaveView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      filters,
      searchQuery,
    }: {
      name: string;
      filters: TaskFilters;
      searchQuery?: string;
    }) => taskApi.saveView(name, filters, searchQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.savedViews() });
    },
  });
};

// ビュー削除フック
export const useDeleteSavedView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ viewId }: { viewId: string }) => taskApi.deleteSavedView(viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.savedViews() });
    },
  });
};
