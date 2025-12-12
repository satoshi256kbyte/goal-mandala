import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reflectionApi } from '../services/reflectionApi';
import type { Reflection, CreateReflectionInput, UpdateReflectionInput } from '../types/reflection';

/**
 * Query keys
 */
export const reflectionKeys = {
  all: ['reflections'] as const,
  lists: () => [...reflectionKeys.all, 'list'] as const,
  list: (goalId: string) => [...reflectionKeys.lists(), goalId] as const,
  details: () => [...reflectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...reflectionKeys.details(), id] as const,
  actionProgress: (goalId: string) => [...reflectionKeys.all, 'actionProgress', goalId] as const,
};

/**
 * 振り返り作成フック
 */
export const useCreateReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReflectionInput) => reflectionApi.createReflection(input),
    onSuccess: (data, variables) => {
      // 作成された振り返りをキャッシュに追加
      queryClient.setQueryData(reflectionKeys.detail(data.id), data);

      // 目標の振り返り一覧を無効化して再取得
      queryClient.invalidateQueries({ queryKey: reflectionKeys.list(variables.goalId) });
    },
  });
};

/**
 * 振り返り取得フック（単一）
 */
export const useReflection = (reflectionId: string) => {
  return useQuery({
    queryKey: reflectionKeys.detail(reflectionId),
    queryFn: () => reflectionApi.getReflection(reflectionId),
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
    gcTime: 10 * 60 * 1000, // 10分後にガベージコレクション
    enabled: !!reflectionId,
  });
};

/**
 * 目標に紐づく振り返り一覧取得フック
 */
export const useReflectionsByGoal = (goalId: string) => {
  return useQuery({
    queryKey: reflectionKeys.list(goalId),
    queryFn: () => reflectionApi.getReflectionsByGoal(goalId),
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
    gcTime: 10 * 60 * 1000, // 10分後にガベージコレクション
    enabled: !!goalId,
  });
};

/**
 * 振り返り更新フック
 */
export const useUpdateReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reflectionId, input }: { reflectionId: string; input: UpdateReflectionInput }) =>
      reflectionApi.updateReflection(reflectionId, input),
    onMutate: async ({ reflectionId, input }) => {
      // 楽観的更新
      await queryClient.cancelQueries({ queryKey: reflectionKeys.detail(reflectionId) });

      const previousReflection = queryClient.getQueryData(reflectionKeys.detail(reflectionId));

      // 振り返り詳細を楽観的に更新
      queryClient.setQueryData(
        reflectionKeys.detail(reflectionId),
        (old: Reflection | undefined) => {
          if (!old) return old;
          return {
            ...old,
            ...input,
            updatedAt: new Date().toISOString(),
          };
        }
      );

      return { previousReflection };
    },
    onError: (err, { reflectionId }, context) => {
      // エラー時にロールバック
      if (context?.previousReflection) {
        queryClient.setQueryData(reflectionKeys.detail(reflectionId), context.previousReflection);
      }
    },
    onSuccess: (data, { reflectionId }) => {
      // 成功時に最新データで更新
      queryClient.setQueryData(reflectionKeys.detail(reflectionId), data);

      // 振り返り一覧も無効化
      queryClient.invalidateQueries({ queryKey: reflectionKeys.lists() });
    },
  });
};

/**
 * 振り返り削除フック
 */
export const useDeleteReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reflectionId: string) => reflectionApi.deleteReflection(reflectionId),
    onSuccess: (data, reflectionId) => {
      // 削除された振り返りのキャッシュを削除
      queryClient.removeQueries({ queryKey: reflectionKeys.detail(reflectionId) });

      // 全ての振り返り一覧を無効化して再取得
      queryClient.invalidateQueries({ queryKey: reflectionKeys.lists() });
    },
  });
};

/**
 * アクション進捗取得フック
 */
export const useActionProgress = (goalId: string) => {
  return useQuery({
    queryKey: reflectionKeys.actionProgress(goalId),
    queryFn: () => reflectionApi.getActionProgress(goalId),
    staleTime: 1 * 60 * 1000, // 1分キャッシュ
    gcTime: 5 * 60 * 1000, // 5分後にガベージコレクション
    enabled: !!goalId,
  });
};
