import { useQuery, useMutation } from '@tanstack/react-query';
import { TaskStatus } from '@goal-mandala/shared';
import { taskApi } from '../services/taskApi';

export const useTasks = (filters?: TaskFilters, searchQuery?: string) => {
  return useQuery({
    queryKey: ['tasks', filters, searchQuery],
    queryFn: () => taskApi.getTasks(filters, searchQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTaskDetail = (taskId: string) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTaskById(taskId),
    enabled: !!taskId,
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      taskApi.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTasks = queryClient.getQueryData(['tasks']);

      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: any) => {
        if (!old?.tasks) return old;

        return {
          ...old,
          tasks: old.tasks.map((task: any) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  completedAt: status === 'completed' ? new Date().toISOString() : task.completedAt,
                }
              : task
          ),
        };
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useAddNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      taskApi.addNote(taskId, content),
    onSuccess: (data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

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
    onSuccess: (data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, noteId }: { taskId: string; noteId: string }) =>
      taskApi.deleteNote(taskId, noteId),
    onSuccess: (data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: TaskStatus }) =>
      taskApi.bulkUpdateStatus(taskIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useBulkDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: string[]) => taskApi.bulkDelete(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useSavedViews = () => {
  return useQuery({
    queryKey: ['saved-views'],
    queryFn: () => taskApi.getSavedViews(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

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
      queryClient.invalidateQueries({ queryKey: ['saved-views'] });
    },
  });
};
