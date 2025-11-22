import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionProvider } from '../contexts/ActionContext';
import { DragDropProvider } from '../components/forms/DragDropProvider';
import { BulkEditModal } from '../components/forms/BulkEditModal';
import { BulkSelectionProvider } from '../components/forms/BulkSelectionProvider';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { SuccessMessage } from '../components/common/SuccessMessage';
import { Action, ActionType } from '../types/mandala';
import { useAuth } from '../components/auth/AuthProvider';
import { useKeyboardNavigation } from '../hooks/useAccessibility';

/**
 * アクション編集ページのプロパティ
 */
export interface ActionEditPageProps {
  /** カスタムクラス名 */
  className?: string;
}

/**
 * ページの状態
 */
interface PageState {
  /** ページの読み込み状態 */
  isLoading: boolean;
  /** サブ目標データ */
  subGoals: SubGoal[];
  /** アクションデータ */
  actions: Action[];
  /** 選択されたサブ目標ID */
  selectedSubGoalId: string | null;
  /** 選択されたアクション */
  selectedAction: Action | null;
  /** エラーメッセージ */
  error: string | null;
  /** 成功メッセージ */
  successMessage: string | null;
  /** 初期化完了フラグ */
  isInitialized: boolean;
  /** 一括編集モードフラグ */
  isBulkEditMode: boolean;
  /** 一括編集モーダル表示フラグ */
  showBulkEditModal: boolean;
}

/**
 * アクション編集ページコンポーネント
 *
 * 機能:
 * - サブ目標別タブ表示
 * - アクション一覧表示（8×8）
 * - サブ目標切り替え機能
 * - 一括編集モード統合
 *
 * 要件: 要件2, 要件5
 */
export const ActionEditPage: React.FC<ActionEditPageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // キーボードナビゲーション
  const { containerRef } = useKeyboardNavigation();
  const { announce: _announce } = useLiveRegion();

  const [pageState, setPageState] = useState<PageState>({
    isLoading: true,
    subGoals: [],
    actions: [],
    selectedSubGoalId: null,
    selectedAction: null,
    error: null,
    successMessage: null,
    isInitialized: false,
    isBulkEditMode: false,
    showBulkEditModal: false,
  });

  /**
   * サブ目標とアクションデータを取得する
   */
  const loadData = useCallback(async () => {
    if (!goalId) {
      setPageState(prev => ({
        ...prev,
        error: '目標IDが指定されていません',
        isLoading: false,
      }));
      return;
    }

    try {
      setPageState(prev => ({ ...prev, isLoading: true, error: null }));

      // TODO: API呼び出しを実装
      // const [subGoals, actions] = await Promise.all([
      //   subGoalAPI.getSubGoals(goalId),
      //   actionAPI.getActions(goalId)
      // ]);

      // モックデータ（実装時は削除）
      const mockSubGoals: SubGoal[] = Array.from({ length: 8 }, (_, index) => ({
        id: `subgoal-${index + 1}`,
        goal_id: goalId,
        title: `サブ目標 ${index + 1}`,
        description: `サブ目標 ${index + 1} の説明文です。`,
        position: index,
        progress: Math.floor(Math.random() * 100),
      }));

      const mockActions: Action[] = mockSubGoals.flatMap((subGoal, subGoalIndex) =>
        Array.from({ length: 8 }, (_, actionIndex) => ({
          id: `action-${subGoalIndex + 1}-${actionIndex + 1}`,
          sub_goal_id: subGoal.id,
          title: `アクション ${subGoalIndex + 1}-${actionIndex + 1}`,
          description: `アクション ${subGoalIndex + 1}-${actionIndex + 1} の説明文です。`,
          type: actionIndex % 2 === 0 ? ActionType.EXECUTION : ActionType.HABIT,
          position: actionIndex,
          progress: Math.floor(Math.random() * 100),
        }))
      );

      setPageState(prev => ({
        ...prev,
        subGoals: mockSubGoals,
        actions: mockActions,
        selectedSubGoalId: mockSubGoals[0]?.id || null,
        isLoading: false,
        isInitialized: true,
      }));
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : 'データの取得に失敗しました';
      setPageState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [goalId]);

  /**
   * ページ初期化処理
   */
  useEffect(() => {
    if (!authLoading && isAuthenticated && !pageState.isInitialized) {
      loadData();
    } else if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, pageState.isInitialized, loadData, navigate]);

  /**
   * サブ目標を選択
   */
  const handleSelectSubGoal = useCallback((subGoalId: string) => {
    setPageState(prev => ({
      ...prev,
      selectedSubGoalId: subGoalId,
      selectedAction: null, // サブ目標が変わったらアクション選択をクリア
    }));
  }, []);

  /**
   * アクションを選択
   */
  const handleSelectAction = useCallback((action: Action | null) => {
    setPageState(prev => ({ ...prev, selectedAction: action }));
  }, []);

  /**
   * アクションを更新
   */
  const handleUpdateAction = useCallback(async (id: string, changes: Partial<Action>) => {
    try {
      // TODO: API呼び出しを実装
      // await actionAPI.updateAction(id, changes);

      setPageState(prev => ({
        ...prev,
        actions: prev.actions.map(action =>
          action.id === id ? { ...action, ...changes } : action
        ),
        selectedAction:
          prev.selectedAction?.id === id
            ? { ...prev.selectedAction, ...changes }
            : prev.selectedAction,
        successMessage: 'アクションを更新しました',
      }));

      // メッセージを3秒後に自動で消す
      setTimeout(() => {
        setPageState(prev => ({ ...prev, successMessage: null }));
      }, 3000);
    } catch (error) {
      console.error('アクションの更新に失敗しました:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'アクションの更新に失敗しました';
      setPageState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  /**
   * アクションを並び替え
   */
  const handleReorderActions = useCallback(async (subGoalId: string, newOrder: Action[]) => {
    try {
      // TODO: API呼び出しを実装
      // await actionAPI.reorderActions(subGoalId, newOrder);

      setPageState(prev => ({
        ...prev,
        actions: prev.actions.map(action => {
          if (action.sub_goal_id === subGoalId) {
            const reorderedAction = newOrder.find(a => a.id === action.id);
            return reorderedAction || action;
          }
          return action;
        }),
        successMessage: 'アクションの順序を更新しました',
      }));

      // メッセージを3秒後に自動で消す
      setTimeout(() => {
        setPageState(prev => ({ ...prev, successMessage: null }));
      }, 3000);
    } catch (error) {
      console.error('アクションの並び替えに失敗しました:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'アクションの並び替えに失敗しました';
      setPageState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  /**
   * 一括編集を実行
   */
  const handleBulkEdit = useCallback(
    async (updates: Array<{ id: string; changes: Partial<Action> }>, deletes: string[]) => {
      try {
        // TODO: API呼び出しを実装
        // await actionAPI.bulkUpdateActions(updates, deletes);

        setPageState(prev => {
          let updatedActions = [...prev.actions];

          // 更新処理
          updates.forEach(({ id, changes }) => {
            updatedActions = updatedActions.map(action =>
              action.id === id ? { ...action, ...changes } : action
            );
          });

          // 削除処理
          updatedActions = updatedActions.filter(action => !deletes.includes(action.id));

          return {
            ...prev,
            actions: updatedActions,
            selectedAction: deletes.includes(prev.selectedAction?.id || '')
              ? null
              : prev.selectedAction,
            successMessage: '一括編集を完了しました',
            showBulkEditModal: false,
          };
        });

        // メッセージを3秒後に自動で消す
        setTimeout(() => {
          setPageState(prev => ({ ...prev, successMessage: null }));
        }, 3000);
      } catch (error) {
        console.error('一括編集に失敗しました:', error);
        const errorMessage = error instanceof Error ? error.message : '一括編集に失敗しました';
        setPageState(prev => ({ ...prev, error: errorMessage }));
      }
    },
    []
  );

  /**
   * 一括編集モードを切り替え
   */
  const toggleBulkEditMode = useCallback(() => {
    setPageState(prev => ({
      ...prev,
      isBulkEditMode: !prev.isBulkEditMode,
      selectedAction: null, // 一括編集モード時は個別選択をクリア
    }));
  }, []);

  /**
   * 一括編集モーダルを表示
   */
  const showBulkEditModal = useCallback(() => {
    setPageState(prev => ({ ...prev, showBulkEditModal: true }));
  }, []);

  /**
   * 一括編集モーダルを閉じる
   */
  const closeBulkEditModal = useCallback(() => {
    setPageState(prev => ({ ...prev, showBulkEditModal: false }));
  }, []);

  /**
   * 活動開始に進む
   */
  const handleStartActivity = useCallback(() => {
    if (!goalId) return;
    navigate(`/mandala/create/confirm/${goalId}`);
  }, [goalId, navigate]);

  /**
   * 前のステップに戻る
   */
  const handleBack = useCallback(() => {
    if (!goalId) return;
    navigate(`/mandala/create/subgoals/${goalId}`);
  }, [goalId, navigate]);

  /**
   * エラーメッセージをクリア
   */
  const clearError = useCallback(() => {
    setPageState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 成功メッセージをクリア
   */
  const clearSuccessMessage = useCallback(() => {
    setPageState(prev => ({ ...prev, successMessage: null }));
  }, []);

  /**
   * 選択されたサブ目標のアクションを取得
   */
  const getSelectedSubGoalActions = useCallback(() => {
    if (!pageState.selectedSubGoalId) return [];
    return pageState.actions.filter(action => action.sub_goal_id === pageState.selectedSubGoalId);
  }, [pageState.selectedSubGoalId, pageState.actions]);

  /**
   * キーボードイベントハンドラー
   */
  /*
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      handleKeyboardNavigation(event, {
        onEscape: () => {
          if (pageState.showBulkEditModal) {
            closeBulkEditModal();
          } else if (pageState.selectedAction) {
            handleSelectAction(null);
          }
        },
        onArrowUp: () => {
          focusPrevious();
        },
        onArrowDown: () => {
          focusNext();
        },
        onArrowLeft: () => {
          // サブ目標タブの切り替え
          const currentIndex = pageState.subGoals.findIndex(
            sg => sg.id === pageState.selectedSubGoalId
          );
          if (currentIndex > 0) {
            handleSelectSubGoal(pageState.subGoals[currentIndex - 1].id);
            announce(`サブ目標 ${currentIndex} に切り替えました`, 'polite');
          }
        },
        onArrowRight: () => {
          // サブ目標タブの切り替え
          const currentIndex = pageState.subGoals.findIndex(
            sg => sg.id === pageState.selectedSubGoalId
          );
          if (currentIndex < pageState.subGoals.length - 1) {
            handleSelectSubGoal(pageState.subGoals[currentIndex + 1].id);
            announce(`サブ目標 ${currentIndex + 2} に切り替えました`, 'polite');
          }
        },
      });

      // ショートカットキー
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            toggleBulkEditMode();
            break;
          case 's':
            event.preventDefault();
            if (pageState.selectedAction) {
              // 選択されたアクションを保存（実装時に追加）
              announce('アクションを保存しました', 'polite');
            }
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8': {
            event.preventDefault();
            const tabIndex = parseInt(event.key) - 1;
            if (tabIndex < pageState.subGoals.length) {
              handleSelectSubGoal(pageState.subGoals[tabIndex].id);
              announce(`サブ目標 ${tabIndex + 1} に切り替えました`, 'polite');
            }
            break;
          }
          case 'Home':
            event.preventDefault();
            focusFirst();
            break;
          case 'End':
            event.preventDefault();
            focusLast();
            break;
        }
      }
    },
    [
      pageState.showBulkEditModal,
      pageState.selectedAction,
      pageState.subGoals,
      pageState.selectedSubGoalId,
      closeBulkEditModal,
      handleSelectAction,
      handleSelectSubGoal,
      focusNext,
      focusPrevious,
      focusFirst,
      focusLast,
      toggleBulkEditMode,
      announce,
    ]
  );
  */

  // 認証チェック中の表示
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" message="認証状態を確認しています..." />
      </div>
    );
  }

  // 認証されていない場合
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">ログインページに移動しています...</p>
        </div>
      </div>
    );
  }

  // ページ初期化中の表示
  if (pageState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" message="アクションを読み込んでいます..." />
      </div>
    );
  }

  const selectedSubGoalActions = getSelectedSubGoalActions();

  return (
    <div
      className={`min-h-screen bg-gray-50 ${className || ''}`}
      ref={containerRef}
      role="main"
      aria-label="アクション編集ページ"
    >
      {/* スキップリンク */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50"
      >
        メインコンテンツにスキップ
      </a>

      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                アクションの確認・編集
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user.name || user.email}
                </span>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        aria-label="アクション編集メインコンテンツ"
      >
        {/* ページ説明 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            AI生成されたアクションを確認してください
          </h2>
          <p className="text-gray-600">
            各サブ目標に対して生成された8つのアクション（合計64個）です。アクション種別の設定や編集を行ってください。
          </p>
        </div>

        {/* エラーメッセージ */}
        {pageState.error && (
          <div className="mb-6">
            <ErrorAlert message={pageState.error} onClose={clearError} />
          </div>
        )}

        {/* 成功メッセージ */}
        {pageState.successMessage && (
          <div className="mb-6">
            <SuccessMessage message={pageState.successMessage} onClose={clearSuccessMessage} />
          </div>
        )}

        {/* ツールバー */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleBulkEditMode}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                pageState.isBulkEditMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {pageState.isBulkEditMode ? '一括編集モード終了' : '一括編集モード'}
            </button>
            {pageState.isBulkEditMode && (
              <button
                onClick={showBulkEditModal}
                className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                一括編集実行
              </button>
            )}
          </div>
        </div>

        {/* サブ目標タブ */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div
              className="-mb-px flex space-x-8 overflow-x-auto"
              role="tablist"
              aria-label="サブ目標選択"
            >
              {pageState.subGoals.map((subGoal, index) => (
                <button
                  key={subGoal.id}
                  onClick={() => handleSelectSubGoal(subGoal.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    pageState.selectedSubGoalId === subGoal.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  role="tab"
                  aria-selected={pageState.selectedSubGoalId === subGoal.id}
                  aria-controls={`tabpanel-${subGoal.id}`}
                  id={`tab-${subGoal.id}`}
                  title={`Ctrl+${index + 1} で選択`}
                >
                  サブ目標 {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 選択されたサブ目標の情報 */}
        {pageState.selectedSubGoalId && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
            {(() => {
              const selectedSubGoal = pageState.subGoals.find(
                sg => sg.id === pageState.selectedSubGoalId
              );
              return selectedSubGoal ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedSubGoal.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{selectedSubGoal.description}</p>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">進捗: {selectedSubGoal.progress}%</span>
                    <div className="flex-1 max-w-xs">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${selectedSubGoal.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* アクション一覧 */}
        <ActionProvider goalId={goalId} initialActions={pageState.actions}>
          <BulkSelectionProvider>
            <DragDropProvider
              items={selectedSubGoalActions.map(action => ({
                id: action.id,
                position: action.position,
                type: 'action' as const,
                parentId: action.sub_goal_id,
              }))}
              onReorder={newOrder => {
                if (!pageState.selectedSubGoalId) return;
                const reorderedActions = newOrder.map((item, index) => {
                  const action = selectedSubGoalActions.find(a => a.id === item.id);
                  if (!action) {
                    throw new Error(`アクションが見つかりません: ${item.id}`);
                  }
                  return { ...action, position: index };
                });
                handleReorderActions(pageState.selectedSubGoalId, reorderedActions);
              }}
              constraints={{
                allowCrossGroup: false,
                maxItems: 8,
                minItems: 8,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedSubGoalActions.map((action, index) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    index={index}
                    isSelected={pageState.selectedAction?.id === action.id}
                    isBulkEditMode={pageState.isBulkEditMode}
                    onSelect={() => handleSelectAction(action)}
                    onUpdate={changes => handleUpdateAction(action.id, changes)}
                  />
                ))}
              </div>
            </DragDropProvider>

            {/* 一括編集モーダル */}
            {pageState.showBulkEditModal && (
              <BulkEditModal
                isOpen={pageState.showBulkEditModal}
                selectedItems={[]} // BulkSelectionProviderから取得
                onClose={closeBulkEditModal}
                onSave={changes => {
                  handleBulkEdit(changes.updates || [], changes.deleteItems || []);
                }}
                itemType="action"
              />
            )}
          </BulkSelectionProvider>
        </ActionProvider>

        {/* ナビゲーションボタン */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
          >
            前に戻る
          </button>
          <button
            onClick={handleStartActivity}
            className="px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            活動開始
          </button>
        </div>
      </main>
    </div>
  );
};

/**
 * アクションカードコンポーネント
 */
interface ActionCardProps {
  action: Action;
  index: number;
  isSelected: boolean;
  isBulkEditMode: boolean;
  onSelect: () => void;
  onUpdate: (changes: Partial<Action>) => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  action,
  index,
  isSelected,
  isBulkEditMode,
  onSelect,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: action.title,
    description: action.description,
    type: action.type,
  });

  const handleSave = useCallback(() => {
    onUpdate(editData);
    setIsEditing(false);
  }, [editData, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditData({
      title: action.title,
      description: action.description,
      type: action.type,
    });
    setIsEditing(false);
  }, [action]);

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
      }`}
      onClick={!isBulkEditMode ? onSelect : undefined}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !isBulkEditMode && onSelect) {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={!isBulkEditMode ? 0 : -1}
      role={!isBulkEditMode ? 'button' : undefined}
    >
      {/* カードヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isBulkEditMode && (
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
              onChange={e => {
                // TODO: BulkSelectionProviderと連携
                console.log('Bulk selection:', e.target.checked);
              }}
            />
          )}
          <span className="text-xs font-medium text-gray-500">アクション {index + 1}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              action.type === ActionType.EXECUTION
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {action.type === ActionType.EXECUTION ? '実行' : '習慣'}
          </span>
          {!isBulkEditMode && (
            <button
              onClick={e => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${action.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 mt-1">進捗: {action.progress}%</span>
      </div>

      {/* コンテンツ */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="action-title" className="block text-xs font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              id="action-title"
              type="text"
              value={editData.title}
              onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={100}
            />
          </div>
          <div>
            <label
              htmlFor="action-description"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              説明
            </label>
            <textarea
              id="action-description"
              value={editData.description}
              onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              maxLength={500}
            />
          </div>
          <div>
            <label htmlFor="action-type" className="block text-xs font-medium text-gray-700 mb-1">
              種別
            </label>
            <select
              id="action-type"
              value={editData.type}
              onChange={e => setEditData(prev => ({ ...prev, type: e.target.value as ActionType }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={ActionType.EXECUTION}>実行アクション</option>
              <option value={ActionType.HABIT}>習慣アクション</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">{action.title}</h4>
          <p className="text-xs text-gray-600 line-clamp-2">{action.description}</p>
        </div>
      )}
    </div>
  );
};

export default ActionEditPage;
