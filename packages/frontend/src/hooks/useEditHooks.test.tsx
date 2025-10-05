import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useUpdateGoal, useUpdateSubGoal, useUpdateAction, useHistory } from './useEditHooks';

// モックデータ
const mockGoal = {
  id: 'goal-1',
  title: '目標タイトル',
  description: '目標説明',
  deadline: '2024-12-31',
  background: '背景情報',
  constraints: '制約事項',
  updated_at: '2024-01-15T10:30:00Z',
};

const mockSubGoal = {
  id: 'subgoal-1',
  goal_id: 'goal-1',
  title: 'サブ目標タイトル',
  description: 'サブ目標説明',
  background: '背景情報',
  constraints: '制約事項',
  position: 0,
  updated_at: '2024-01-15T10:30:00Z',
};

const mockAction = {
  id: 'action-1',
  sub_goal_id: 'subgoal-1',
  title: 'アクションタイトル',
  description: 'アクション説明',
  background: '背景情報',
  constraints: '制約事項',
  type: 'execution' as const,
  position: 0,
  updated_at: '2024-01-15T10:30:00Z',
};

const mockHistoryEntry = {
  id: 'history-1',
  entityType: 'goal' as const,
  entityId: 'goal-1',
  userId: 'user-1',
  userName: '山田太郎',
  changedAt: '2024-01-15T10:30:00Z',
  changes: [
    {
      field: 'title',
      oldValue: '古いタイトル',
      newValue: '新しいタイトル',
    },
  ],
};

// テスト用のQueryClientプロバイダー
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// APIモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useUpdateGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('目標更新が成功する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockGoal, title: '更新されたタイトル' }),
    });

    const { result } = renderHook(() => useUpdateGoal(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'goal-1',
      data: { ...mockGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/goals/goal-1'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.any(String),
      })
    );
  });

  it('楽観的更新が実行される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockGoal, title: '更新されたタイトル' }),
    });

    const onMutate = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateGoal({
          onMutate,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'goal-1',
      data: { ...mockGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(onMutate).toHaveBeenCalled();
    });
  });

  it('エラー時にロールバックが実行される', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateGoal({
          onError,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'goal-1',
      data: { ...mockGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalled();
  });

  it('409エラー時に競合エラーが検出される', async () => {
    const latestData = { ...mockGoal, title: '他のユーザーが更新したタイトル' };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'EDIT_CONFLICT',
        message: 'データが他のユーザーによって更新されています',
        latestData,
      }),
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateGoal({
          onError,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'goal-1',
      data: { ...mockGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EDIT_CONFLICT',
        latestData,
      }),
      expect.anything(),
      expect.anything()
    );
  });

  it('バリデーションエラーが処理される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: { title: 'タイトルは必須です' },
      }),
    });

    const { result } = renderHook(() => useUpdateGoal(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'goal-1',
      data: { ...mockGoal, title: '' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('権限エラーが処理される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: 'PERMISSION_DENIED',
        message: '編集権限がありません',
      }),
    });

    const { result } = renderHook(() => useUpdateGoal(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'goal-1',
      data: mockGoal,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateSubGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('サブ目標更新が成功する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockSubGoal, title: '更新されたタイトル' }),
    });

    const { result } = renderHook(() => useUpdateSubGoal(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'subgoal-1',
      data: { ...mockSubGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subgoals/subgoal-1'),
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('楽観的更新が実行される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockSubGoal, title: '更新されたタイトル' }),
    });

    const onMutate = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateSubGoal({
          onMutate,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'subgoal-1',
      data: { ...mockSubGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(onMutate).toHaveBeenCalled();
    });
  });

  it('エラー時にロールバックが実行される', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateSubGoal({
          onError,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'subgoal-1',
      data: { ...mockSubGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalled();
  });

  it('409エラー時に競合エラーが検出される', async () => {
    const latestData = { ...mockSubGoal, title: '他のユーザーが更新したタイトル' };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'EDIT_CONFLICT',
        message: 'データが他のユーザーによって更新されています',
        latestData,
      }),
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateSubGoal({
          onError,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'subgoal-1',
      data: { ...mockSubGoal, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EDIT_CONFLICT',
        latestData,
      }),
      expect.anything(),
      expect.anything()
    );
  });
});

describe('useUpdateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('アクション更新が成功する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockAction, title: '更新されたタイトル' }),
    });

    const { result } = renderHook(() => useUpdateAction(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'action-1',
      data: { ...mockAction, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/actions/action-1'),
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('楽観的更新が実行される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockAction, title: '更新されたタイトル' }),
    });

    const onMutate = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateAction({
          onMutate,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'action-1',
      data: { ...mockAction, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(onMutate).toHaveBeenCalled();
    });
  });

  it('エラー時にロールバックが実行される', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateAction({
          onError,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'action-1',
      data: { ...mockAction, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalled();
  });

  it('409エラー時に競合エラーが検出される', async () => {
    const latestData = { ...mockAction, title: '他のユーザーが更新したタイトル' };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'EDIT_CONFLICT',
        message: 'データが他のユーザーによって更新されています',
        latestData,
      }),
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUpdateAction({
          onError,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      id: 'action-1',
      data: { ...mockAction, title: '更新されたタイトル' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EDIT_CONFLICT',
        latestData,
      }),
      expect.anything(),
      expect.anything()
    );
  });
});

describe('useHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('履歴データが取得できる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [mockHistoryEntry],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    });

    const { result } = renderHook(
      () =>
        useHistory({
          entityType: 'goal',
          entityId: 'goal-1',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      history: [mockHistoryEntry],
      total: 1,
      limit: 20,
      offset: 0,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/goals/goal-1/history'),
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('ページネーションパラメータが正しく渡される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [],
        total: 0,
        limit: 10,
        offset: 20,
      }),
    });

    const { result } = renderHook(
      () =>
        useHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          limit: 10,
          offset: 20,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10'), expect.anything());
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('offset=20'), expect.anything());
  });

  it('サブ目標の履歴が取得できる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ ...mockHistoryEntry, entityType: 'subgoal' }],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    });

    const { result } = renderHook(
      () =>
        useHistory({
          entityType: 'subgoal',
          entityId: 'subgoal-1',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subgoals/subgoal-1/history'),
      expect.anything()
    );
  });

  it('アクションの履歴が取得できる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ ...mockHistoryEntry, entityType: 'action' }],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    });

    const { result } = renderHook(
      () =>
        useHistory({
          entityType: 'action',
          entityId: 'action-1',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/actions/action-1/history'),
      expect.anything()
    );
  });

  it('履歴取得エラーが処理される', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () =>
        useHistory({
          entityType: 'goal',
          entityId: 'goal-1',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('空の履歴が正しく処理される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [],
        total: 0,
        limit: 20,
        offset: 0,
      }),
    });

    const { result } = renderHook(
      () =>
        useHistory({
          entityType: 'goal',
          entityId: 'goal-1',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.history).toEqual([]);
  });
});
