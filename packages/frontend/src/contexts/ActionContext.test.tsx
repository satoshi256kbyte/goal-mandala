import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../test/test-utils';
import {
  ActionProvider,
  useActionContext,
  useActionState,
  useActionActions,
} from './ActionContext';
import { Action } from '../types/mandala';

// テスト用のアクションデータ
const mockActions: Action[] = [
  {
    id: 'action-1',
    sub_goal_id: 'subgoal-1',
    title: 'アクション1',
    description: 'アクション1の説明',
    type: ActionType.EXECUTION,
    position: 0,
    progress: 0,
  },
  {
    id: 'action-2',
    sub_goal_id: 'subgoal-1',
    title: 'アクション2',
    description: 'アクション2の説明',
    type: ActionType.HABIT,
    position: 1,
    progress: 25,
  },
  {
    id: 'action-3',
    sub_goal_id: 'subgoal-2',
    title: 'アクション3',
    description: 'アクション3の説明',
    type: ActionType.EXECUTION,
    position: 0,
    progress: 50,
  },
];

// テスト用コンポーネント
const TestComponent: React.FC = () => {
  const { state } = useActionContext();
  const {
    selectSubGoal,
    selectAction,
    updateAction,
    reorderActions,
    bulkUpdateActions,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    getActionsBySubGoal,
  } = useActionActions();

  return (
    <div>
      <div data-testid="actions-count">{state.actions.length}</div>
      <div data-testid="selected-subgoal-id">{state.selectedSubGoalId || 'none'}</div>
      <div data-testid="selected-action-id">{state.selectedAction?.id || 'none'}</div>
      <div data-testid="is-loading">{state.isLoading.toString()}</div>
      <div data-testid="is-dirty">{state.isDirty.toString()}</div>
      <div data-testid="validation-errors">{JSON.stringify(state.validationErrors)}</div>
      <div data-testid="errors">{JSON.stringify(state.errors)}</div>
      <div data-testid="success">{state.success.toString()}</div>
      <div data-testid="subgoal-1-actions">{getActionsBySubGoal('subgoal-1').length}</div>
      <div data-testid="subgoal-2-actions">{getActionsBySubGoal('subgoal-2').length}</div>

      <button data-testid="select-subgoal-1" onClick={() => selectSubGoal('subgoal-1')}>
        サブ目標1を選択
      </button>
      <button data-testid="select-action-1" onClick={() => selectAction(mockActions[0])}>
        アクション1を選択
      </button>
      <button
        data-testid="update-action-1"
        onClick={() => updateAction('action-1', { title: '更新されたアクション1' })}
      >
        アクション1を更新
      </button>
      <button
        data-testid="reorder-actions"
        onClick={() => reorderActions('subgoal-1', [mockActions[1], mockActions[0]])}
      >
        アクションを並び替え
      </button>
      <button
        data-testid="bulk-update"
        onClick={() =>
          bulkUpdateActions([{ id: 'action-1', changes: { progress: 75 } }], ['action-2'])
        }
      >
        一括更新
      </button>
      <button
        data-testid="set-validation-errors"
        onClick={() => setValidationErrors({ title: 'タイトルは必須です' })}
      >
        バリデーションエラー設定
      </button>
      <button data-testid="clear-validation-errors" onClick={() => clearValidationErrors()}>
        バリデーションエラークリア
      </button>
      <button
        data-testid="set-errors"
        onClick={() => setErrors({ api: 'API エラーが発生しました' })}
      >
        エラー設定
      </button>
      <button data-testid="clear-errors" onClick={() => clearErrors()}>
        エラークリア
      </button>
      <button data-testid="set-success" onClick={() => setSuccess(true)}>
        成功状態設定
      </button>
      <button data-testid="set-dirty" onClick={() => setDirty(true)}>
        ダーティ状態設定
      </button>
    </div>
  );
};

// テスト用の状態監視コンポーネント
const StateTestComponent: React.FC = () => {
  const state = useActionState();
  return (
    <div>
      <div data-testid="state-actions-count">{state.actions.length}</div>
      <div data-testid="state-is-loading">{state.isLoading.toString()}</div>
    </div>
  );
};

describe('ActionContext', () => {
  const renderWithProvider = (
    component: React.ReactElement,
    props: {
      goalId?: string;
      initialActions?: Action[];
      autoSaveEnabled?: boolean;
    } = {}
  ) => {
    return renderWithProviders(<ActionProvider {...props}>{component}</ActionProvider>);
  };

  describe('初期化', () => {
    it('初期状態が正しく設定される', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('actions-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selected-subgoal-id')).toHaveTextContent('none');
      expect(screen.getByTestId('selected-action-id')).toHaveTextContent('none');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('is-dirty')).toHaveTextContent('false');
      expect(screen.getByTestId('validation-errors')).toHaveTextContent('{}');
      expect(screen.getByTestId('errors')).toHaveTextContent('{}');
      expect(screen.getByTestId('success')).toHaveTextContent('false');
    });

    it('初期アクションデータが設定される', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      expect(screen.getByTestId('actions-count')).toHaveTextContent('3');
      expect(screen.getByTestId('subgoal-1-actions')).toHaveTextContent('2');
      expect(screen.getByTestId('subgoal-2-actions')).toHaveTextContent('1');
    });
  });

  describe('サブ目標選択', () => {
    it('サブ目標を選択できる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      act(() => {
        screen.getByTestId('select-subgoal-1').click();
      });

      expect(screen.getByTestId('selected-subgoal-id')).toHaveTextContent('subgoal-1');
    });

    it('サブ目標選択時にアクション選択がクリアされる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      // まずアクションを選択
      act(() => {
        screen.getByTestId('select-action-1').click();
      });
      expect(screen.getByTestId('selected-action-id')).toHaveTextContent('action-1');

      // サブ目標を選択
      act(() => {
        screen.getByTestId('select-subgoal-1').click();
      });

      expect(screen.getByTestId('selected-subgoal-id')).toHaveTextContent('subgoal-1');
      expect(screen.getByTestId('selected-action-id')).toHaveTextContent('none');
    });
  });

  describe('アクション選択', () => {
    it('アクションを選択できる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      act(() => {
        screen.getByTestId('select-action-1').click();
      });

      expect(screen.getByTestId('selected-action-id')).toHaveTextContent('action-1');
    });
  });

  describe('アクション更新', () => {
    it('アクションを更新できる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      act(() => {
        screen.getByTestId('update-action-1').click();
      });

      expect(screen.getByTestId('is-dirty')).toHaveTextContent('true');
    });

    it('選択されたアクションも更新される', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      // アクションを選択
      act(() => {
        screen.getByTestId('select-action-1').click();
      });

      // アクションを更新
      act(() => {
        screen.getByTestId('update-action-1').click();
      });

      expect(screen.getByTestId('selected-action-id')).toHaveTextContent('action-1');
    });
  });

  describe('アクション並び替え', () => {
    it('アクションを並び替えできる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      act(() => {
        screen.getByTestId('reorder-actions').click();
      });

      expect(screen.getByTestId('is-dirty')).toHaveTextContent('true');
    });
  });

  describe('一括更新', () => {
    it('アクションを一括更新できる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      act(() => {
        screen.getByTestId('bulk-update').click();
      });

      expect(screen.getByTestId('is-dirty')).toHaveTextContent('true');
      expect(screen.getByTestId('actions-count')).toHaveTextContent('2'); // action-2が削除される
    });

    it('削除されたアクションが選択されていた場合、選択がクリアされる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      // action-2を選択
      act(() => {
        screen.getByTestId('select-action-1').click();
      });

      // action-2を削除する一括更新
      act(() => {
        screen.getByTestId('bulk-update').click();
      });

      expect(screen.getByTestId('selected-action-id')).toHaveTextContent('action-1');
    });
  });

  describe('バリデーションエラー', () => {
    it('バリデーションエラーを設定できる', () => {
      renderWithProvider(<TestComponent />);

      act(() => {
        screen.getByTestId('set-validation-errors').click();
      });

      expect(screen.getByTestId('validation-errors')).toHaveTextContent(
        '{"title":"タイトルは必須です"}'
      );
    });

    it('バリデーションエラーをクリアできる', () => {
      renderWithProvider(<TestComponent />);

      act(() => {
        screen.getByTestId('set-validation-errors').click();
      });
      act(() => {
        screen.getByTestId('clear-validation-errors').click();
      });

      expect(screen.getByTestId('validation-errors')).toHaveTextContent('{}');
    });
  });

  describe('エラー管理', () => {
    it('エラーを設定できる', () => {
      renderWithProvider(<TestComponent />);

      act(() => {
        screen.getByTestId('set-errors').click();
      });

      expect(screen.getByTestId('errors')).toHaveTextContent('{"api":"API エラーが発生しました"}');
    });

    it('エラーをクリアできる', () => {
      renderWithProvider(<TestComponent />);

      act(() => {
        screen.getByTestId('set-errors').click();
      });
      act(() => {
        screen.getByTestId('clear-errors').click();
      });

      expect(screen.getByTestId('errors')).toHaveTextContent('{}');
    });
  });

  describe('成功状態', () => {
    it('成功状態を設定できる', () => {
      renderWithProvider(<TestComponent />);

      act(() => {
        screen.getByTestId('set-success').click();
      });

      expect(screen.getByTestId('success')).toHaveTextContent('true');
    });

    it('成功状態設定時にエラーとダーティ状態がクリアされる', () => {
      renderWithProvider(<TestComponent />);

      // エラーとダーティ状態を設定
      act(() => {
        screen.getByTestId('set-errors').click();
      });
      act(() => {
        screen.getByTestId('set-dirty').click();
      });

      // 成功状態を設定
      act(() => {
        screen.getByTestId('set-success').click();
      });

      expect(screen.getByTestId('success')).toHaveTextContent('true');
      expect(screen.getByTestId('errors')).toHaveTextContent('{}');
      expect(screen.getByTestId('is-dirty')).toHaveTextContent('false');
    });
  });

  describe('ダーティ状態', () => {
    it('ダーティ状態を設定できる', () => {
      renderWithProvider(<TestComponent />);

      act(() => {
        screen.getByTestId('set-dirty').click();
      });

      expect(screen.getByTestId('is-dirty')).toHaveTextContent('true');
    });
  });

  describe('サブ目標別アクション取得', () => {
    it('指定されたサブ目標のアクションを取得できる', () => {
      renderWithProvider(<TestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      expect(screen.getByTestId('subgoal-1-actions')).toHaveTextContent('2');
      expect(screen.getByTestId('subgoal-2-actions')).toHaveTextContent('1');
    });
  });

  describe('フック', () => {
    it('useActionState フックが状態を返す', () => {
      renderWithProvider(<StateTestComponent />, {
        goalId: 'goal-1',
        initialActions: mockActions,
      });

      expect(screen.getByTestId('state-actions-count')).toHaveTextContent('3');
      expect(screen.getByTestId('state-is-loading')).toHaveTextContent('false');
    });

    it('プロバイダー外でフックを使用するとエラーが発生する', () => {
      // エラーログを抑制
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useActionContext must be used within an ActionProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('非同期操作', () => {
    it('loadActions が呼び出される', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const TestAsyncComponent: React.FC = () => {
        const { loadActions } = useActionActions();

        React.useEffect(() => {
          loadActions('goal-1');
        }, [loadActions]);

        return <div>Loading...</div>;
      };

      renderWithProvider(<TestAsyncComponent />);

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith('Loading actions for goal:', 'goal-1');
        },
        { timeout: 1000 }
      );

      consoleSpy.mockRestore();
    });

    it('saveDraft が呼び出される', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const TestAsyncComponent: React.FC = () => {
        const { saveDraft } = useActionActions();

        React.useEffect(() => {
          saveDraft('action-1', { title: 'テストタイトル' });
        }, [saveDraft]);

        return <div>Saving...</div>;
      };

      renderWithProvider(<TestAsyncComponent />);

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith('Saving draft for action:', 'action-1', {
            title: 'テストタイトル',
          });
        },
        { timeout: 1000 }
      );

      consoleSpy.mockRestore();
    });

    it('restoreDraft が呼び出される', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const TestAsyncComponent: React.FC = () => {
        const { restoreDraft } = useActionActions();

        React.useEffect(() => {
          restoreDraft();
        }, [restoreDraft]);

        return <div>Restoring...</div>;
      };

      renderWithProvider(<TestAsyncComponent />);

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith('Restoring draft');
        },
        { timeout: 1000 }
      );

      consoleSpy.mockRestore();
    });
  });
});
