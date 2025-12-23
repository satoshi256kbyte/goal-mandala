/**
 * useQuery フックのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSubGoals,
  useSubGoal,
  useActions,
  useActionsBySubGoal,
  useUpdateSubGoal,
  useUpdateAction,
  useBulkUpdateSubGoals,
  useBulkUpdateActions,
  QUERY_KEYS,
} from '../useQuery';
import { subGoalAPI } from '../../services/subgoal-api';
import { actionAPI } from '../../services/action-api';
import type { SubGoal, Action } from '../../types/mandala';

// モック
vi.mock('../../services/subgoal-api');
vi.mock('../../services/action-api');

// テスト用のQueryClientを作成
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

// テスト用のラッパーコンポーネント
const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

// モックデータ
const mockSubGoals: SubGoal[] = [
  {
    id: 'subgoal-1',
    goal_id: 'goal-1',
    title: 'サブ目標1',
    description: '説明1',
    background: '背景1',
    constraints: '制約1',
    position: 0,
    progress: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'subgoal-2',
    goal_id: 'goal-1',
    title: 'サブ目標2',
    description: '説明2',
    background: '背景2',
    constraints: '制約2',
    position: 1,
    progress: 50,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockActions: Action[] = [
  {
    id: 'action-1',
    sub_goal_id: 'subgoal-1',
    title: 'アクション1',
    description: '説明1',
    background: '背景1',
    constraints: '制約1',
    type: 'execution',
    position: 0,
    progress: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'action-2',
    sub_goal_id: 'subgoal-1',
    title: 'アクション2',
    description: '説明2',
    background: '背景2',
    constraints: '制約2',
    type: 'habit',
    position: 1,
    progress: 30,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('useQuery フック', () => {
  let testQueryClient: QueryClient;

  beforeEach(() => {
    testQueryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    testQueryClient.clear();
  });

  describe('useSubGoals', () => {
    it('サブ目標一覧を取得できる', async () => {
      vi.mocked(subGoalAPI.getSubGoals).mockResolvedValue({
        subGoals: mockSubGoals,
      });

      const { result } = renderHook(() => useSubGoals('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSubGoals);
      expect(subGoalAPI.getSubGoals).toHaveBeenCalledWith('goal-1');
    });

    it('エラー時にエラー状態を返す', async () => {
      const error = new Error('API Error');
      vi.mocked(subGoalAPI.getSubGoals).mockRejectedValue(error);

      const { result } = renderHook(() => useSubGoals('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('キャッシュが有効な場合は再取得しない', async () => {
      vi.mocked(subGoalAPI.getSubGoals).mockResolvedValue({
        subGoals: mockSubGoals,
      });

      const { result, rerender } = renderHook(() => useSubGoals('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 再レンダリング
      rerender();

      // APIは1回のみ呼ばれる（キャッシュが使用される）
      expect(subGoalAPI.getSubGoals).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSubGoal', () => {
    it('個別サブ目標を取得できる', async () => {
      vi.mocked(subGoalAPI.getSubGoals).mockResolvedValue({
        subGoals: mockSubGoals,
      });

      const { result } = renderHook(() => useSubGoal('subgoal-1', 'goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSubGoals[0]);
    });

    it('存在しないIDの場合はundefinedを返す', async () => {
      vi.mocked(subGoalAPI.getSubGoals).mockResolvedValue({
        subGoals: mockSubGoals,
      });

      const { result } = renderHook(() => useSubGoal('non-existent', 'goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useActions', () => {
    it('アクション一覧を取得できる', async () => {
      vi.mocked(actionAPI.getActions).mockResolvedValue({
        actions: mockActions,
      });

      const { result } = renderHook(() => useActions('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockActions);
      expect(actionAPI.getActions).toHaveBeenCalledWith('goal-1');
    });

    it('エラー時にエラー状態を返す', async () => {
      const error = new Error('API Error');
      vi.mocked(actionAPI.getActions).mockRejectedValue(error);

      const { result } = renderHook(() => useActions('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActionsBySubGoal', () => {
    it('サブ目標別アクション一覧を取得できる', async () => {
      vi.mocked(actionAPI.getActionsBySubGoal).mockResolvedValue(mockActions);

      const { result } = renderHook(() => useActionsBySubGoal('subgoal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockActions);
      expect(actionAPI.getActionsBySubGoal).toHaveBeenCalledWith('subgoal-1');
    });
  });

  describe('useUpdateSubGoal', () => {
    it('サブ目標を更新できる', async () => {
      const updatedSubGoal = { ...mockSubGoals[0], title: '更新されたタイトル' };
      vi.mocked(subGoalAPI.updateSubGoal).mockResolvedValue({
        subGoal: updatedSubGoal,
      });

      const { result } = renderHook(() => useUpdateSubGoal(), {
        wrapper: createWrapper(testQueryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'subgoal-1',
          data: { title: '更新されたタイトル' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedSubGoal);
    });

    it('楽観的更新が機能する', async () => {
      // 初期データをキャッシュに設定
      testQueryClient.setQueryData(QUERY_KEYS.subGoal('subgoal-1'), mockSubGoals[0]);

      const updatedSubGoal = { ...mockSubGoals[0], title: '更新されたタイトル' };
      vi.mocked(subGoalAPI.updateSubGoal).mockResolvedValue({
        subGoal: updatedSubGoal,
      });

      const { result } = renderHook(() => useUpdateSubGoal(), {
        wrapper: createWrapper(testQueryClient),
      });

      act(() => {
        result.current.mutate({
          id: 'subgoal-1',
          data: { title: '更新されたタイトル' },
        });
      });

      // 楽観的更新が即座に反映される
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData<SubGoal>(QUERY_KEYS.subGoal('subgoal-1'));
        expect(cachedData?.title).toBe('更新されたタイトル');
      });
    });

    it('エラー時にロールバックする', async () => {
      // 初期データをキャッシュに設定
      testQueryClient.setQueryData(QUERY_KEYS.subGoal('subgoal-1'), mockSubGoals[0]);

      const error = new Error('Update failed');
      vi.mocked(subGoalAPI.updateSubGoal).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateSubGoal(), {
        wrapper: createWrapper(testQueryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 'subgoal-1',
            data: { title: '更新されたタイトル' },
          });
        } catch (e) {
          // エラーを無視
        }
      });

      // ロールバックされて元のデータに戻る
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData<SubGoal>(QUERY_KEYS.subGoal('subgoal-1'));
        expect(cachedData?.title).toBe('サブ目標1');
      });
    });
  });

  describe('useUpdateAction', () => {
    it('アクションを更新できる', async () => {
      const updatedAction = { ...mockActions[0], title: '更新されたタイトル' };
      vi.mocked(actionAPI.updateAction).mockResolvedValue({
        action: updatedAction,
      });

      const { result } = renderHook(() => useUpdateAction(), {
        wrapper: createWrapper(testQueryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'action-1',
          data: { title: '更新されたタイトル' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedAction);
    });

    it('楽観的更新が機能する', async () => {
      // 初期データをキャッシュに設定
      testQueryClient.setQueryData(QUERY_KEYS.action('action-1'), mockActions[0]);

      const updatedAction = { ...mockActions[0], title: '更新されたタイトル' };
      vi.mocked(actionAPI.updateAction).mockResolvedValue({
        action: updatedAction,
      });

      const { result } = renderHook(() => useUpdateAction(), {
        wrapper: createWrapper(testQueryClient),
      });

      act(() => {
        result.current.mutate({
          id: 'action-1',
          data: { title: '更新されたタイトル' },
        });
      });

      // 楽観的更新が即座に反映される
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData<Action>(QUERY_KEYS.action('action-1'));
        expect(cachedData?.title).toBe('更新されたタイトル');
      });
    });
  });

  describe('useBulkUpdateSubGoals', () => {
    it('サブ目標を一括更新できる', async () => {
      const updatedSubGoals = [
        { ...mockSubGoals[0], title: '更新1' },
        { ...mockSubGoals[1], title: '更新2' },
      ];
      vi.mocked(subGoalAPI.bulkUpdateSubGoals).mockResolvedValue({
        updated: updatedSubGoals,
      });

      const { result } = renderHook(() => useBulkUpdateSubGoals('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          updates: [
            { id: 'subgoal-1', changes: { title: '更新1' } },
            { id: 'subgoal-2', changes: { title: '更新2' } },
          ],
          deletes: [],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedSubGoals);
    });

    it('楽観的更新が機能する（更新）', async () => {
      // 初期データをキャッシュに設定
      testQueryClient.setQueryData(QUERY_KEYS.subGoals('goal-1'), mockSubGoals);

      vi.mocked(subGoalAPI.bulkUpdateSubGoals).mockResolvedValue({
        updated: mockSubGoals,
      });

      const { result } = renderHook(() => useBulkUpdateSubGoals('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      act(() => {
        result.current.mutate({
          updates: [{ id: 'subgoal-1', changes: { title: '更新されたタイトル' } }],
          deletes: [],
        });
      });

      // 楽観的更新が即座に反映される
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData<SubGoal[]>(QUERY_KEYS.subGoals('goal-1'));
        expect(cachedData?.[0].title).toBe('更新されたタイトル');
      });
    });

    it('楽観的更新が機能する（削除）', async () => {
      // 初期データをキャッシュに設定
      testQueryClient.setQueryData(QUERY_KEYS.subGoals('goal-1'), mockSubGoals);

      vi.mocked(subGoalAPI.bulkUpdateSubGoals).mockResolvedValue({
        updated: [mockSubGoals[1]],
      });

      const { result } = renderHook(() => useBulkUpdateSubGoals('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      act(() => {
        result.current.mutate({
          updates: [],
          deletes: ['subgoal-1'],
        });
      });

      // 楽観的更新が即座に反映される（削除）
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData<SubGoal[]>(QUERY_KEYS.subGoals('goal-1'));
        expect(cachedData?.length).toBe(1);
        expect(cachedData?.[0].id).toBe('subgoal-2');
      });
    });
  });

  describe('useBulkUpdateActions', () => {
    it('アクションを一括更新できる', async () => {
      const updatedActions = [
        { ...mockActions[0], title: '更新1' },
        { ...mockActions[1], title: '更新2' },
      ];
      vi.mocked(actionAPI.bulkUpdateActions).mockResolvedValue({
        updated: updatedActions,
      });

      const { result } = renderHook(() => useBulkUpdateActions('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          updates: [
            { id: 'action-1', changes: { title: '更新1' } },
            { id: 'action-2', changes: { title: '更新2' } },
          ],
          deletes: [],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedActions);
    });

    it('楽観的更新が機能する（更新と削除）', async () => {
      // 初期データをキャッシュに設定
      testQueryClient.setQueryData(QUERY_KEYS.actions('goal-1'), mockActions);

      vi.mocked(actionAPI.bulkUpdateActions).mockResolvedValue({
        updated: [{ ...mockActions[1], title: '更新されたタイトル' }],
      });

      const { result } = renderHook(() => useBulkUpdateActions('goal-1'), {
        wrapper: createWrapper(testQueryClient),
      });

      act(() => {
        result.current.mutate({
          updates: [{ id: 'action-2', changes: { title: '更新されたタイトル' } }],
          deletes: ['action-1'],
        });
      });

      // 楽観的更新が即座に反映される
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData<Action[]>(QUERY_KEYS.actions('goal-1'));
        expect(cachedData?.length).toBe(1);
        expect(cachedData?.[0].id).toBe('action-2');
        expect(cachedData?.[0].title).toBe('更新されたタイトル');
      });
    });
  });
});
