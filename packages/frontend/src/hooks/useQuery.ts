/**
 * React Query統合とデータ取得最適化フック
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { SubGoal, Action } from '../types/mandala';
import { subGoalAPI } from '../services/subgoal-api';
import { actionAPI } from '../services/action-api';

/**
 * クエリキーの定数定義
 */
export const QUERY_KEYS = {
  goals: ['goals'] as const,
  goal: (id: string) => ['goals', id] as const,
  subGoals: (goalId: string) => ['subGoals', goalId] as const,
  subGoal: (id: string) => ['subGoals', 'detail', id] as const,
  actions: (goalId: string) => ['actions', goalId] as const,
  actionsBySubGoal: (subGoalId: string) => ['actions', 'subGoal', subGoalId] as const,
  action: (id: string) => ['actions', 'detail', id] as const,
  drafts: ['drafts'] as const,
  draft: (type: string, id: string) => ['drafts', type, id] as const,
} as const;

/**
 * サブ目標データ取得フック
 */
export const useSubGoals = (
  goalId: string,
  options?: Omit<UseQueryOptions<SubGoal[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: QUERY_KEYS.subGoals(goalId),
    queryFn: async () => {
      const response = await subGoalAPI.getSubGoals(goalId);
      return response.subGoals;
    },
    staleTime: 5 * 60 * 1000, // 5分間はフレッシュとみなす
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};

/**
 * 個別サブ目標データ取得フック
 */
export const useSubGoal = (
  id: string,
  goalId: string,
  options?: Omit<UseQueryOptions<SubGoal | undefined, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: QUERY_KEYS.subGoal(id),
    queryFn: async () => {
      const response = await subGoalAPI.getSubGoals(goalId);
      return response.subGoals.find(subGoal => subGoal.id === id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * アクションデータ取得フック
 */
export const useActions = (
  goalId: string,
  options?: Omit<UseQueryOptions<Action[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: QUERY_KEYS.actions(goalId),
    queryFn: async () => {
      const response = await actionAPI.getActions(goalId);
      return response.actions;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};

/**
 * サブ目標別アクションデータ取得フック
 */
export const useActionsBySubGoal = (
  subGoalId: string,
  options?: Omit<UseQueryOptions<Action[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: QUERY_KEYS.actionsBySubGoal(subGoalId),
    queryFn: () => actionAPI.getActionsBySubGoal(subGoalId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * サブ目標更新ミューテーションフック
 */
export const useUpdateSubGoal = (
  options?: UseMutationOptions<SubGoal, Error, { id: string; data: Partial<SubGoal> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await subGoalAPI.updateSubGoal(id, data as any);
      return response.subGoal;
    },
    onMutate: async ({ id, data }) => {
      // 楽観的更新の実装
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.subGoal(id) });

      const previousSubGoal = queryClient.getQueryData<SubGoal>(QUERY_KEYS.subGoal(id));

      if (previousSubGoal) {
        queryClient.setQueryData<SubGoal>(QUERY_KEYS.subGoal(id), {
          ...previousSubGoal,
          ...data,
        });
      }

      return { previousSubGoal };
    },
    onError: (err, { id }, context: any) => {
      // エラー時にロールバック
      if (context?.previousSubGoal) {
        queryClient.setQueryData(QUERY_KEYS.subGoal(id), context.previousSubGoal);
      }
    },
    onSettled: (data, error, { id }) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subGoal(id) });
      if (data) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subGoals(data.goal_id) });
      }
    },
    ...options,
  });
};

/**
 * アクション更新ミューテーションフック
 */
export const useUpdateAction = (
  options?: UseMutationOptions<Action, Error, { id: string; data: Partial<Action> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await actionAPI.updateAction(id, data as any);
      return response.action;
    },
    onMutate: async ({ id, data }) => {
      // 楽観的更新の実装
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.action(id) });

      const previousAction = queryClient.getQueryData<Action>(QUERY_KEYS.action(id));

      if (previousAction) {
        queryClient.setQueryData<Action>(QUERY_KEYS.action(id), {
          ...previousAction,
          ...data,
        });
      }

      return { previousAction };
    },
    onError: (err, { id }, context: any) => {
      // エラー時にロールバック
      if (context?.previousAction) {
        queryClient.setQueryData(QUERY_KEYS.action(id), context.previousAction);
      }
    },
    onSettled: (data, error, { id }) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.action(id) });
      if (data) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionsBySubGoal(data.sub_goal_id) });
      }
    },
    ...options,
  });
};

/**
 * サブ目標一括更新ミューテーションフック
 */
export const useBulkUpdateSubGoals = (
  goalId: string,
  options?: UseMutationOptions<
    SubGoal[],
    Error,
    { updates: Array<{ id: string; changes: Partial<SubGoal> }>; deletes: string[] }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updates, deletes }) => {
      const response = await subGoalAPI.bulkUpdateSubGoals(goalId, updates, deletes);
      return response.updated;
    },
    onMutate: async ({ updates, deletes }) => {
      // 楽観的更新の実装
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.subGoals(goalId) });

      const previousSubGoals = queryClient.getQueryData<SubGoal[]>(QUERY_KEYS.subGoals(goalId));

      if (previousSubGoals) {
        let updatedSubGoals = [...previousSubGoals];

        // 更新処理
        updates.forEach(({ id, changes }) => {
          updatedSubGoals = updatedSubGoals.map(subGoal =>
            subGoal.id === id ? { ...subGoal, ...changes } : subGoal
          );
        });

        // 削除処理
        updatedSubGoals = updatedSubGoals.filter(subGoal => !deletes.includes(subGoal.id));

        queryClient.setQueryData<SubGoal[]>(QUERY_KEYS.subGoals(goalId), updatedSubGoals);
      }

      return { previousSubGoals };
    },
    onError: (err, variables, context: any) => {
      // エラー時にロールバック
      if (context?.previousSubGoals) {
        queryClient.setQueryData(QUERY_KEYS.subGoals(goalId), context.previousSubGoals);
      }
    },
    onSettled: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subGoals(goalId) });
    },
    ...options,
  });
};

/**
 * アクション一括更新ミューテーションフック
 */
export const useBulkUpdateActions = (
  goalId: string,
  options?: UseMutationOptions<
    Action[],
    Error,
    { updates: Array<{ id: string; changes: Partial<Action> }>; deletes: string[] }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updates, deletes }) => {
      const response = await actionAPI.bulkUpdateActions(goalId, updates, deletes);
      return response.updated;
    },
    onMutate: async ({ updates, deletes }) => {
      // 楽観的更新の実装
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.actions(goalId) });

      const previousActions = queryClient.getQueryData<Action[]>(QUERY_KEYS.actions(goalId));

      if (previousActions) {
        let updatedActions = [...previousActions];

        // 更新処理
        updates.forEach(({ id, changes }) => {
          updatedActions = updatedActions.map(action =>
            action.id === id ? { ...action, ...changes } : action
          );
        });

        // 削除処理
        updatedActions = updatedActions.filter(action => !deletes.includes(action.id));

        queryClient.setQueryData<Action[]>(QUERY_KEYS.actions(goalId), updatedActions);
      }

      return { previousActions };
    },
    onError: (err, variables, context: any) => {
      // エラー時にロールバック
      if (context?.previousActions) {
        queryClient.setQueryData(QUERY_KEYS.actions(goalId), context.previousActions);
      }
    },
    onSettled: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actions(goalId) });
    },
    ...options,
  });
};

/**
 * バックグラウンド更新フック
 */
export const useBackgroundRefresh = () => {
  const queryClient = useQueryClient();

  const refreshSubGoals = useCallback(
    (goalId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subGoals(goalId) });
    },
    [queryClient]
  );

  const refreshActions = useCallback(
    (goalId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actions(goalId) });
    },
    [queryClient]
  );

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    refreshSubGoals,
    refreshActions,
    refreshAll,
  };
};

/**
 * キャッシュ戦略フック
 */
export const useCacheStrategy = () => {
  const queryClient = useQueryClient();

  // プリフェッチ機能
  const prefetchSubGoals = useCallback(
    async (goalId: string) => {
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.subGoals(goalId),
        queryFn: () => subGoalAPI.getSubGoals(goalId),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchActions = useCallback(
    async (goalId: string) => {
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.actions(goalId),
        queryFn: () => actionAPI.getActions(goalId),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  // キャッシュクリア機能
  const clearCache = useCallback(
    (pattern?: string) => {
      if (pattern) {
        queryClient.removeQueries({ queryKey: [pattern] });
      } else {
        queryClient.clear();
      }
    },
    [queryClient]
  );

  // キャッシュサイズ監視
  const getCacheInfo = useCallback(() => {
    const cache = queryClient.getQueryCache();
    return {
      queryCount: cache.getAll().length,
      queries: cache.getAll().map(query => ({
        queryKey: query.queryKey,
        state: query.state,
        dataUpdatedAt: query.state.dataUpdatedAt,
      })),
    };
  }, [queryClient]);

  return {
    prefetchSubGoals,
    prefetchActions,
    clearCache,
    getCacheInfo,
  };
};

/**
 * オフライン対応フック
 */
export const useOfflineSupport = () => {
  const queryClient = useQueryClient();

  // オフライン時のデータ取得
  const getOfflineData = useCallback(
    <T>(queryKey: readonly unknown[]): T | undefined => {
      return queryClient.getQueryData<T>(queryKey);
    },
    [queryClient]
  );

  // オンライン復帰時の同期
  const syncOnReconnect = useCallback(() => {
    queryClient.resumePausedMutations();
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    getOfflineData,
    syncOnReconnect,
  };
};

/**
 * パフォーマンス監視フック
 */
export const useQueryPerformance = () => {
  const queryClient = useQueryClient();

  const getPerformanceMetrics = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const metrics = {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      cacheHitRate: 0, // 実装時に計算
    };

    return metrics;
  }, [queryClient]);

  return {
    getPerformanceMetrics,
  };
};
