/**
 * 楽観的更新フック
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { SubGoal, Action } from '../types/mandala';
import { QUERY_KEYS } from './useQuery';
import { useStableCallback } from '../utils/performance';

/**
 * 楽観的更新の結果
 */
interface OptimisticUpdateResult<T> {
  /** 更新前のデータ */
  previousData: T | undefined;
  /** ロールバック関数 */
  rollback: () => void;
}

/**
 * 楽観的更新フック
 */
export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient();
  const rollbackFunctions = useRef<Map<string, () => void>>(new Map());

  /**
   * サブ目標の楽観的更新
   */
  const optimisticUpdateSubGoal = useStableCallback(
    async (id: string, updates: Partial<SubGoal>): Promise<OptimisticUpdateResult<SubGoal>> => {
      const queryKey = QUERY_KEYS.subGoal(id);

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey });

      // 現在のデータを取得
      const previousData = queryClient.getQueryData<SubGoal>(queryKey);

      // 楽観的更新を実行
      if (previousData) {
        const optimisticData = { ...previousData, ...updates };
        queryClient.setQueryData<SubGoal>(queryKey, optimisticData);

        // サブ目標リストも更新
        const subGoalsQueryKey = QUERY_KEYS.subGoals(previousData.goal_id);
        const previousSubGoals = queryClient.getQueryData<SubGoal[]>(subGoalsQueryKey);

        if (previousSubGoals) {
          const updatedSubGoals = previousSubGoals.map(subGoal =>
            subGoal.id === id ? optimisticData : subGoal
          );
          queryClient.setQueryData<SubGoal[]>(subGoalsQueryKey, updatedSubGoals);
        }
      }

      // ロールバック関数を作成
      const rollback = () => {
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);

          // サブ目標リストもロールバック
          const subGoalsQueryKey = QUERY_KEYS.subGoals(previousData.goal_id);
          const currentSubGoals = queryClient.getQueryData<SubGoal[]>(subGoalsQueryKey);

          if (currentSubGoals) {
            const rolledBackSubGoals = currentSubGoals.map(subGoal =>
              subGoal.id === id ? previousData : subGoal
            );
            queryClient.setQueryData<SubGoal[]>(subGoalsQueryKey, rolledBackSubGoals);
          }
        }
      };

      // ロールバック関数を保存
      rollbackFunctions.current.set(`subgoal-${id}`, rollback);

      return { previousData, rollback };
    },
    [queryClient]
  );

  /**
   * アクションの楽観的更新
   */
  const optimisticUpdateAction = useStableCallback(
    async (id: string, updates: Partial<Action>): Promise<OptimisticUpdateResult<Action>> => {
      const queryKey = QUERY_KEYS.action(id);

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey });

      // 現在のデータを取得
      const previousData = queryClient.getQueryData<Action>(queryKey);

      // 楽観的更新を実行
      if (previousData) {
        const optimisticData = { ...previousData, ...updates };
        queryClient.setQueryData<Action>(queryKey, optimisticData);

        // アクションリストも更新
        const actionsQueryKey = QUERY_KEYS.actionsBySubGoal(previousData.sub_goal_id);
        const previousActions = queryClient.getQueryData<Action[]>(actionsQueryKey);

        if (previousActions) {
          const updatedActions = previousActions.map(action =>
            action.id === id ? optimisticData : action
          );
          queryClient.setQueryData<Action[]>(actionsQueryKey, updatedActions);
        }
      }

      // ロールバック関数を作成
      const rollback = () => {
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);

          // アクションリストもロールバック
          const actionsQueryKey = QUERY_KEYS.actionsBySubGoal(previousData.sub_goal_id);
          const currentActions = queryClient.getQueryData<Action[]>(actionsQueryKey);

          if (currentActions) {
            const rolledBackActions = currentActions.map(action =>
              action.id === id ? previousData : action
            );
            queryClient.setQueryData<Action[]>(actionsQueryKey, rolledBackActions);
          }
        }
      };

      // ロールバック関数を保存
      rollbackFunctions.current.set(`action-${id}`, rollback);

      return { previousData, rollback };
    },
    [queryClient]
  );

  /**
   * サブ目標の一括楽観的更新
   */
  const optimisticBulkUpdateSubGoals = useStableCallback(
    async (
      goalId: string,
      updates: Array<{ id: string; changes: Partial<SubGoal> }>,
      deletes: string[]
    ): Promise<OptimisticUpdateResult<SubGoal[]>> => {
      const queryKey = QUERY_KEYS.subGoals(goalId);

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey });

      // 現在のデータを取得
      const previousData = queryClient.getQueryData<SubGoal[]>(queryKey);

      // 楽観的更新を実行
      if (previousData) {
        let optimisticData = [...previousData];

        // 更新処理
        updates.forEach(({ id, changes }) => {
          optimisticData = optimisticData.map(subGoal =>
            subGoal.id === id ? { ...subGoal, ...changes } : subGoal
          );
        });

        // 削除処理
        optimisticData = optimisticData.filter(subGoal => !deletes.includes(subGoal.id));

        queryClient.setQueryData<SubGoal[]>(queryKey, optimisticData);
      }

      // ロールバック関数を作成
      const rollback = () => {
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
      };

      // ロールバック関数を保存
      rollbackFunctions.current.set(`subgoals-bulk-${goalId}`, rollback);

      return { previousData, rollback };
    },
    [queryClient]
  );

  /**
   * アクションの一括楽観的更新
   */
  const optimisticBulkUpdateActions = useStableCallback(
    async (
      goalId: string,
      updates: Array<{ id: string; changes: Partial<Action> }>,
      deletes: string[]
    ): Promise<OptimisticUpdateResult<Action[]>> => {
      const queryKey = QUERY_KEYS.actions(goalId);

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey });

      // 現在のデータを取得
      const previousData = queryClient.getQueryData<Action[]>(queryKey);

      // 楽観的更新を実行
      if (previousData) {
        let optimisticData = [...previousData];

        // 更新処理
        updates.forEach(({ id, changes }) => {
          optimisticData = optimisticData.map(action =>
            action.id === id ? { ...action, ...changes } : action
          );
        });

        // 削除処理
        optimisticData = optimisticData.filter(action => !deletes.includes(action.id));

        queryClient.setQueryData<Action[]>(queryKey, optimisticData);
      }

      // ロールバック関数を作成
      const rollback = () => {
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
      };

      // ロールバック関数を保存
      rollbackFunctions.current.set(`actions-bulk-${goalId}`, rollback);

      return { previousData, rollback };
    },
    [queryClient]
  );

  /**
   * 並び替えの楽観的更新
   */
  const optimisticReorderSubGoals = useStableCallback(
    async (goalId: string, newOrder: SubGoal[]): Promise<OptimisticUpdateResult<SubGoal[]>> => {
      const queryKey = QUERY_KEYS.subGoals(goalId);

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey });

      // 現在のデータを取得
      const previousData = queryClient.getQueryData<SubGoal[]>(queryKey);

      // 楽観的更新を実行
      queryClient.setQueryData<SubGoal[]>(queryKey, newOrder);

      // ロールバック関数を作成
      const rollback = () => {
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
      };

      // ロールバック関数を保存
      rollbackFunctions.current.set(`subgoals-reorder-${goalId}`, rollback);

      return { previousData, rollback };
    },
    [queryClient]
  );

  /**
   * アクション並び替えの楽観的更新
   */
  const optimisticReorderActions = useStableCallback(
    async (subGoalId: string, newOrder: Action[]): Promise<OptimisticUpdateResult<Action[]>> => {
      const queryKey = QUERY_KEYS.actionsBySubGoal(subGoalId);

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey });

      // 現在のデータを取得
      const previousData = queryClient.getQueryData<Action[]>(queryKey);

      // 楽観的更新を実行
      queryClient.setQueryData<Action[]>(queryKey, newOrder);

      // ロールバック関数を作成
      const rollback = () => {
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
      };

      // ロールバック関数を保存
      rollbackFunctions.current.set(`actions-reorder-${subGoalId}`, rollback);

      return { previousData, rollback };
    },
    [queryClient]
  );

  /**
   * 特定のロールバック関数を実行
   */
  const executeRollback = useStableCallback((key: string) => {
    const rollback = rollbackFunctions.current.get(key);
    if (rollback) {
      rollback();
      rollbackFunctions.current.delete(key);
    }
  }, []);

  /**
   * すべてのロールバック関数を実行
   */
  const executeAllRollbacks = useStableCallback(() => {
    rollbackFunctions.current.forEach(rollback => {
      rollback();
    });
    rollbackFunctions.current.clear();
  }, []);

  /**
   * 楽観的更新の確定（ロールバック関数を削除）
   */
  const confirmOptimisticUpdate = useStableCallback((key: string) => {
    rollbackFunctions.current.delete(key);
  }, []);

  /**
   * すべての楽観的更新を確定
   */
  const confirmAllOptimisticUpdates = useStableCallback(() => {
    rollbackFunctions.current.clear();
  }, []);

  return {
    optimisticUpdateSubGoal,
    optimisticUpdateAction,
    optimisticBulkUpdateSubGoals,
    optimisticBulkUpdateActions,
    optimisticReorderSubGoals,
    optimisticReorderActions,
    executeRollback,
    executeAllRollbacks,
    confirmOptimisticUpdate,
    confirmAllOptimisticUpdates,
  };
};
