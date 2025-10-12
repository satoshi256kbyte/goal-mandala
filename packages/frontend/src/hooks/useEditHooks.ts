import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

// 型定義
export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  background: string;
  constraints?: string;
  updated_at: string;
}

export interface SubGoal {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  position: number;
  updated_at: string;
}

export interface Action {
  id: string;
  sub_goal_id: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: 'execution' | 'habit';
  position: number;
  updated_at: string;
}

export interface HistoryEntry {
  id: string;
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  userId: string;
  userName: string;
  changedAt: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface HistoryResponse {
  history: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export enum EditErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EDIT_CONFLICT = 'EDIT_CONFLICT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface EditError {
  type: EditErrorType;
  message: string;
  details?: any;
  latestData?: Goal | SubGoal | Action;
}

// API呼び出し関数
const updateGoalApi = async (id: string, data: Partial<Goal>): Promise<Goal> => {
  const response = await fetch(`/api/goals/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (response.status === 409) {
      throw {
        type: EditErrorType.EDIT_CONFLICT,
        message: errorData.message,
        latestData: errorData.latestData,
      } as EditError;
    }

    if (response.status === 400) {
      throw {
        type: EditErrorType.VALIDATION_ERROR,
        message: errorData.message,
        details: errorData.details,
      } as EditError;
    }

    if (response.status === 403) {
      throw {
        type: EditErrorType.PERMISSION_DENIED,
        message: errorData.message,
      } as EditError;
    }

    if (response.status === 404) {
      throw {
        type: EditErrorType.NOT_FOUND,
        message: errorData.message,
      } as EditError;
    }

    throw {
      type: EditErrorType.UNKNOWN_ERROR,
      message: errorData.message || 'Unknown error occurred',
    } as EditError;
  }

  return response.json();
};

const updateSubGoalApi = async (id: string, data: Partial<SubGoal>): Promise<SubGoal> => {
  const response = await fetch(`/api/subgoals/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (response.status === 409) {
      throw {
        type: EditErrorType.EDIT_CONFLICT,
        message: errorData.message,
        latestData: errorData.latestData,
      } as EditError;
    }

    if (response.status === 400) {
      throw {
        type: EditErrorType.VALIDATION_ERROR,
        message: errorData.message,
        details: errorData.details,
      } as EditError;
    }

    if (response.status === 403) {
      throw {
        type: EditErrorType.PERMISSION_DENIED,
        message: errorData.message,
      } as EditError;
    }

    if (response.status === 404) {
      throw {
        type: EditErrorType.NOT_FOUND,
        message: errorData.message,
      } as EditError;
    }

    throw {
      type: EditErrorType.UNKNOWN_ERROR,
      message: errorData.message || 'Unknown error occurred',
    } as EditError;
  }

  return response.json();
};

const updateActionApi = async (id: string, data: Partial<Action>): Promise<Action> => {
  const response = await fetch(`/api/actions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (response.status === 409) {
      throw {
        type: EditErrorType.EDIT_CONFLICT,
        message: errorData.message,
        latestData: errorData.latestData,
      } as EditError;
    }

    if (response.status === 400) {
      throw {
        type: EditErrorType.VALIDATION_ERROR,
        message: errorData.message,
        details: errorData.details,
      } as EditError;
    }

    if (response.status === 403) {
      throw {
        type: EditErrorType.PERMISSION_DENIED,
        message: errorData.message,
      } as EditError;
    }

    if (response.status === 404) {
      throw {
        type: EditErrorType.NOT_FOUND,
        message: errorData.message,
      } as EditError;
    }

    throw {
      type: EditErrorType.UNKNOWN_ERROR,
      message: errorData.message || 'Unknown error occurred',
    } as EditError;
  }

  return response.json();
};

const fetchHistoryApi = async (
  entityType: 'goal' | 'subgoal' | 'action',
  entityId: string,
  limit: number = 20,
  offset: number = 0
): Promise<HistoryResponse> => {
  const endpoint =
    entityType === 'goal'
      ? `/api/goals/${entityId}/history`
      : entityType === 'subgoal'
        ? `/api/subgoals/${entityId}/history`
        : `/api/actions/${entityId}/history`;

  const response = await fetch(`${endpoint}?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw {
      type: EditErrorType.UNKNOWN_ERROR,
      message: errorData.message || 'Failed to fetch history',
    } as EditError;
  }

  return response.json();
};

// カスタムフック

/**
 * 目標更新フック
 * 楽観的更新とエラー時のロールバックをサポート
 */
export const useUpdateGoal = (
  options?: UseMutationOptions<Goal, EditError, { id: string; data: Partial<Goal> }>
) => {
  const queryClient = useQueryClient();

  return useMutation<Goal, EditError, { id: string; data: Partial<Goal> }>({
    mutationFn: ({ id, data }) => updateGoalApi(id, data),
    onMutate: async ({ id, data }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['goal', id] });

      // 以前のデータを取得（ロールバック用）
      const previousGoal = queryClient.getQueryData<Goal>(['goal', id]);

      // 楽観的更新
      if (previousGoal) {
        queryClient.setQueryData<Goal>(['goal', id], {
          ...previousGoal,
          ...data,
        });
      }

      // コールバック実行
      if (options?.onMutate) {
        await options.onMutate({ id, data }, {} as any);
      }

      return { previousGoal } as any;
    },
    onError: (error: any, variables: any, context: any) => {
      // ロールバック
      if (context?.previousGoal) {
        queryClient.setQueryData(['goal', variables.id], context.previousGoal);
      }

      // コールバック実行
      if (options?.onError) {
        options.onError(error, variables, context, {} as any);
      }
    },
    onSuccess: (data: any, variables: any, context: any) => {
      // キャッシュを更新
      queryClient.setQueryData(['goal', variables.id], data);

      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: ['goals'] });

      // コールバック実行
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context, {} as any);
      }
    },
  });
};

/**
 * サブ目標更新フック
 * 楽観的更新とエラー時のロールバックをサポート
 */
export const useUpdateSubGoal = (
  options?: UseMutationOptions<SubGoal, EditError, { id: string; data: Partial<SubGoal> }>
) => {
  const queryClient = useQueryClient();

  return useMutation<SubGoal, EditError, { id: string; data: Partial<SubGoal> }>({
    mutationFn: ({ id, data }) => updateSubGoalApi(id, data),
    onMutate: async ({ id, data }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['subgoal', id] });

      // 以前のデータを取得（ロールバック用）
      const previousSubGoal = queryClient.getQueryData<SubGoal>(['subgoal', id]);

      // 楽観的更新
      if (previousSubGoal) {
        queryClient.setQueryData<SubGoal>(['subgoal', id], {
          ...previousSubGoal,
          ...data,
        });
      }

      // コールバック実行
      if (options?.onMutate) {
        await options.onMutate({ id, data }, {} as any);
      }

      return { previousSubGoal } as any;
    },
    onError: (error: any, variables: any, context: any) => {
      // ロールバック
      if (context?.previousSubGoal) {
        queryClient.setQueryData(['subgoal', variables.id], context.previousSubGoal);
      }

      // コールバック実行
      if (options?.onError) {
        options.onError(error, variables, context, {} as any);
      }
    },
    onSuccess: (data: any, variables: any, context: any) => {
      // キャッシュを更新
      queryClient.setQueryData(['subgoal', variables.id], data);

      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: ['subgoals'] });
      if (data.goal_id) {
        queryClient.invalidateQueries({ queryKey: ['goal', data.goal_id] });
      }

      // コールバック実行
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context, {} as any);
      }
    },
  });
};

/**
 * アクション更新フック
 * 楽観的更新とエラー時のロールバックをサポート
 */
export const useUpdateAction = (
  options?: UseMutationOptions<Action, EditError, { id: string; data: Partial<Action> }>
) => {
  const queryClient = useQueryClient();

  return useMutation<Action, EditError, { id: string; data: Partial<Action> }>({
    mutationFn: ({ id, data }) => updateActionApi(id, data),
    onMutate: async ({ id, data }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['action', id] });

      // 以前のデータを取得（ロールバック用）
      const previousAction = queryClient.getQueryData<Action>(['action', id]);

      // 楽観的更新
      if (previousAction) {
        queryClient.setQueryData<Action>(['action', id], {
          ...previousAction,
          ...data,
        });
      }

      // コールバック実行
      if (options?.onMutate) {
        await options.onMutate({ id, data }, {} as any);
      }

      return { previousAction } as any;
    },
    onError: (error: any, variables: any, context: any) => {
      // ロールバック
      if (context?.previousAction) {
        queryClient.setQueryData(['action', variables.id], context.previousAction);
      }

      // コールバック実行
      if (options?.onError) {
        options.onError(error, variables, context, {} as any);
      }
    },
    onSuccess: (data: any, variables: any, context: any) => {
      // キャッシュを更新
      queryClient.setQueryData(['action', variables.id], data);

      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      if (data.sub_goal_id) {
        queryClient.invalidateQueries({ queryKey: ['subgoal', data.sub_goal_id] });
      }

      // コールバック実行
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context, {} as any);
      }
    },
  });
};

/**
 * 変更履歴取得フック
 */
export const useHistory = (
  params: {
    entityType: 'goal' | 'subgoal' | 'action';
    entityId: string;
    limit?: number;
    offset?: number;
  },
  options?: UseQueryOptions<HistoryResponse, EditError>
) => {
  return useQuery<HistoryResponse, EditError>({
    queryKey: ['history', params.entityType, params.entityId, params.limit, params.offset],
    queryFn: () => fetchHistoryApi(params.entityType, params.entityId, params.limit, params.offset),
    ...options,
  });
};
