import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubGoalEditPage } from '../../pages/SubGoalEditPage';
import { ActionEditPage } from '../../pages/ActionEditPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// テスト用のプロバイダー
const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('データ整合性テスト', () => {
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('サブ目標データ整合性', () => {
    it('サブ目標の作成・更新・削除が正しく同期される', async () => {
      const mockSubGoals = [
        {
          id: '1',
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
          position: 0,
        },
        {
          id: '2',
          title: 'サブ目標2',
          description: '説明2',
          background: '背景2',
          position: 1,
        },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockSubGoals });
      mockApiClient.put.mockResolvedValue({
        data: { ...mockSubGoals[0], title: '更新されたサブ目標1' },
      });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // サブ目標一覧が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('サブ目標1')).toBeInTheDocument();
        expect(screen.getByText('サブ目標2')).toBeInTheDocument();
      });

      // サブ目標を編集
      const editButton = screen.getByTestId('edit-subgoal-1');
      await userEvent.click(editButton);

      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, '更新されたサブ目標1');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // APIが正しく呼ばれることを確認
      expect(mockApiClient.put).toHaveBeenCalledWith('/subgoals/1', {
        title: '更新されたサブ目標1',
        description: '説明1',
        background: '背景1',
      });

      // UIが更新されることを確認
      await waitFor(() => {
        expect(screen.getByText('更新されたサブ目標1')).toBeInTheDocument();
      });
    });

    it('サブ目標の並び替えが正しく反映される', async () => {
      const mockSubGoals = [
        { id: '1', title: 'サブ目標1', position: 0 },
        { id: '2', title: 'サブ目標2', position: 1 },
        { id: '3', title: 'サブ目標3', position: 2 },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockSubGoals });
      mockApiClient.put.mockResolvedValue({ data: {} });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // ドラッグ&ドロップで並び替え
      const dragItem = screen.getByTestId('draggable-subgoal-0');
      const dropTarget = screen.getByTestId('draggable-subgoal-2');

      // ドラッグ&ドロップをシミュレート
      await userEvent.pointer([
        { keys: '[MouseLeft>]', target: dragItem },
        { coords: { x: 0, y: 100 } },
        { keys: '[/MouseLeft]', target: dropTarget },
      ]);

      // 並び替えAPIが正しく呼ばれることを確認
      expect(mockApiClient.put).toHaveBeenCalledWith('/subgoals/reorder', {
        subGoals: [
          { id: '2', position: 0 },
          { id: '3', position: 1 },
          { id: '1', position: 2 },
        ],
      });
    });
  });

  describe('アクションデータ整合性', () => {
    it('アクションの種別変更が正しく保存される', async () => {
      const mockActions = [
        {
          id: '1',
          title: 'アクション1',
          type: 'execution',
          subGoalId: 'subgoal-1',
        },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockActions });
      mockApiClient.put.mockResolvedValue({
        data: { ...mockActions[0], type: 'habit' },
      });

      render(
        <TestProvider>
          <ActionEditPage />
        </TestProvider>
      );

      // アクションを選択
      const actionItem = await screen.findByTestId('action-item-1');
      await userEvent.click(actionItem);

      // アクション種別を変更
      const typeSelect = screen.getByTestId('action-type');
      await userEvent.selectOptions(typeSelect, 'habit');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // APIが正しく呼ばれることを確認
      expect(mockApiClient.put).toHaveBeenCalledWith('/actions/1', {
        title: 'アクション1',
        type: 'habit',
        subGoalId: 'subgoal-1',
      });
    });
  });

  describe('フォーム状態整合性', () => {
    it('下書き保存と復元が正しく動作する', async () => {
      const mockDraftData = {
        title: '下書きタイトル',
        description: '下書き説明',
        background: '下書き背景',
      };

      mockApiClient.get.mockResolvedValue({ data: [] });
      mockApiClient.post.mockResolvedValue({ data: mockDraftData });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // フォームに入力
      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, '下書きタイトル');

      // 下書き保存ボタンをクリック
      const draftSaveButton = screen.getByTestId('draft-save-button');
      await userEvent.click(draftSaveButton);

      // 下書き保存APIが呼ばれることを確認
      expect(mockApiClient.post).toHaveBeenCalledWith('/drafts/subgoals', {
        title: '下書きタイトル',
        description: '',
        background: '',
      });

      // 成功メッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('下書きを保存しました')).toBeInTheDocument();
      });
    });

    it('バリデーションエラーが正しく表示される', async () => {
      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // 必須フィールドを空のまま保存を試行
      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
        expect(screen.getByText('説明は必須です')).toBeInTheDocument();
        expect(screen.getByText('背景は必須です')).toBeInTheDocument();
      });

      // フィールドがエラー状態になることを確認
      const titleInput = screen.getByTestId('subgoal-title');
      expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('API レスポンス整合性', () => {
    it('ネットワークエラー時の適切な処理', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
      });

      // 再試行ボタンが表示されることを確認
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('サーバーエラー時の適切な処理', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Internal Server Error' } },
      });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('サーバーエラーが発生しました')).toBeInTheDocument();
      });
    });
  });
});
