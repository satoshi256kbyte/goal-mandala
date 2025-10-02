import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SubGoalProvider } from '../contexts/SubGoalContext';
import { DragDropProvider } from '../components/forms/DragDropProvider';
import { BulkEditModal } from '../components/forms/BulkEditModal';
import { BulkSelectionProvider } from '../components/forms/BulkSelectionProvider';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { SuccessMessage } from '../components/common/SuccessMessage';
import { SubGoal } from '../types/mandala';
import { useAuth } from '../components/auth/AuthProvider';
// import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
// import { useLiveRegion } from '../hooks/useAccessibility';
// import { handleKeyboardNavigation } from '../utils/accessibility';

/**
 * サブ目標編集ページのプロパティ
 */
export interface SubGoalEditPageProps {
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
  /** 選択されたサブ目標 */
  selectedSubGoal: SubGoal | null;
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
 * サブ目標編集ページコンポーネント
 *
 * 機能:
 * - サブ目標一覧表示
 * - 個別サブ目標選択・編集
 * - ドラッグ&ドロップによる並び替え
 * - 一括編集モード
 * - AI再生成機能
 *
 * 要件: 要件1, 要件4, 要件5
 */
export const SubGoalEditPage: React.FC<SubGoalEditPageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // キーボードナビゲーション
  const { containerRef } = useKeyboardNavigation();
  // const { announce } = useLiveRegion();

  const [pageState, setPageState] = useState<PageState>({
    isLoading: true,
    subGoals: [],
    selectedSubGoal: null,
    error: null,
    successMessage: null,
    isInitialized: false,
    isBulkEditMode: false,
    showBulkEditModal: false,
  });

  /**
   * サブ目標データを取得する
   */
  const loadSubGoals = useCallback(async () => {
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
      // const subGoals = await subGoalAPI.getSubGoals(goalId);

      // モックデータ（実装時は削除）
      const mockSubGoals: SubGoal[] = Array.from({ length: 8 }, (_, index) => ({
        id: `subgoal-${index + 1}`,
        goal_id: goalId,
        title: `サブ目標 ${index + 1}`,
        description: `サブ目標 ${index + 1} の説明文です。`,
        position: index,
        progress: Math.floor(Math.random() * 100),
      }));

      setPageState(prev => ({
        ...prev,
        subGoals: mockSubGoals,
        isLoading: false,
        isInitialized: true,
      }));
    } catch (error) {
      console.error('サブ目標の取得に失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : 'サブ目標の取得に失敗しました';
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
      loadSubGoals();
    } else if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, pageState.isInitialized, loadSubGoals, navigate]);

  /**
   * サブ目標を選択
   */
  const handleSelectSubGoal = useCallback((subGoal: SubGoal | null) => {
    setPageState(prev => ({ ...prev, selectedSubGoal: subGoal }));
  }, []);

  /**
   * サブ目標を更新
   */
  const handleUpdateSubGoal = useCallback(async (id: string, changes: Partial<SubGoal>) => {
    try {
      // TODO: API呼び出しを実装
      // await subGoalAPI.updateSubGoal(id, changes);

      setPageState(prev => ({
        ...prev,
        subGoals: prev.subGoals.map(subGoal =>
          subGoal.id === id ? { ...subGoal, ...changes } : subGoal
        ),
        selectedSubGoal:
          prev.selectedSubGoal?.id === id
            ? { ...prev.selectedSubGoal, ...changes }
            : prev.selectedSubGoal,
        successMessage: 'サブ目標を更新しました',
      }));

      // メッセージを3秒後に自動で消す
      setTimeout(() => {
        setPageState(prev => ({ ...prev, successMessage: null }));
      }, 3000);
    } catch (error) {
      console.error('サブ目標の更新に失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : 'サブ目標の更新に失敗しました';
      setPageState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  /**
   * サブ目標を並び替え
   */
  const handleReorderSubGoals = useCallback(async (newOrder: SubGoal[]) => {
    try {
      // TODO: API呼び出しを実装
      // await subGoalAPI.reorderSubGoals(goalId, newOrder);

      setPageState(prev => ({
        ...prev,
        subGoals: newOrder,
        successMessage: 'サブ目標の順序を更新しました',
      }));

      // メッセージを3秒後に自動で消す
      setTimeout(() => {
        setPageState(prev => ({ ...prev, successMessage: null }));
      }, 3000);
    } catch (error) {
      console.error('サブ目標の並び替えに失敗しました:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'サブ目標の並び替えに失敗しました';
      setPageState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  /**
   * 一括編集を実行
   */
  const handleBulkEdit = useCallback(
    async (updates: Array<{ id: string; changes: Partial<SubGoal> }>, deletes: string[]) => {
      try {
        // TODO: API呼び出しを実装
        // await subGoalAPI.bulkUpdateSubGoals(updates, deletes);

        setPageState(prev => {
          let updatedSubGoals = [...prev.subGoals];

          // 更新処理
          updates.forEach(({ id, changes }) => {
            updatedSubGoals = updatedSubGoals.map(subGoal =>
              subGoal.id === id ? { ...subGoal, ...changes } : subGoal
            );
          });

          // 削除処理
          updatedSubGoals = updatedSubGoals.filter(subGoal => !deletes.includes(subGoal.id));

          return {
            ...prev,
            subGoals: updatedSubGoals,
            selectedSubGoal: deletes.includes(prev.selectedSubGoal?.id || '')
              ? null
              : prev.selectedSubGoal,
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
   * AI再生成を実行
   */
  const handleRegenerate = useCallback(async () => {
    if (!goalId) return;

    try {
      setPageState(prev => ({ ...prev, isLoading: true, error: null }));

      // TODO: API呼び出しを実装
      // const newSubGoals = await subGoalAPI.regenerateSubGoals(goalId);

      // モックデータ（実装時は削除）
      const mockNewSubGoals: SubGoal[] = Array.from({ length: 8 }, (_, index) => ({
        id: `subgoal-new-${index + 1}`,
        goal_id: goalId,
        title: `新しいサブ目標 ${index + 1}`,
        description: `AI再生成されたサブ目標 ${index + 1} の説明文です。`,
        position: index,
        progress: 0,
      }));

      setPageState(prev => ({
        ...prev,
        subGoals: mockNewSubGoals,
        selectedSubGoal: null,
        isLoading: false,
        successMessage: 'サブ目標を再生成しました',
      }));

      // メッセージを3秒後に自動で消す
      setTimeout(() => {
        setPageState(prev => ({ ...prev, successMessage: null }));
      }, 3000);
    } catch (error) {
      console.error('サブ目標の再生成に失敗しました:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'サブ目標の再生成に失敗しました';
      setPageState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [goalId]);

  /**
   * 一括編集モードを切り替え
   */
  const toggleBulkEditMode = useCallback(() => {
    setPageState(prev => ({
      ...prev,
      isBulkEditMode: !prev.isBulkEditMode,
      selectedSubGoal: null, // 一括編集モード時は個別選択をクリア
    }));

    // スクリーンリーダーに通知
    announce(
      pageState.isBulkEditMode ? '一括編集モードを終了しました' : '一括編集モードを開始しました',
      'polite'
    );
  }, [pageState.isBulkEditMode]);

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
   * 次のステップに進む
   */
  const handleNext = useCallback(() => {
    if (!goalId) return;
    navigate(`/mandala/create/actions/${goalId}`);
  }, [goalId, navigate]);

  /**
   * 前のステップに戻る
   */
  const handleBack = useCallback(() => {
    if (!goalId) return;
    navigate(`/mandala/create/goal/${goalId}`);
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
   * キーボードイベントハンドラー
   */
  /*
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      handleKeyboardNavigation(event, {
        onEscape: () => {
          if (pageState.showBulkEditModal) {
            closeBulkEditModal();
          } else if (pageState.selectedSubGoal) {
            handleSelectSubGoal(null);
          }
        },
        onArrowUp: () => {
          focusPrevious();
        },
        onArrowDown: () => {
          focusNext();
        },
        onArrowLeft: () => {
          focusPrevious();
        },
        onArrowRight: () => {
          focusNext();
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
            if (pageState.selectedSubGoal) {
              // 選択されたサブ目標を保存（実装時に追加）
              announce('サブ目標を保存しました', 'polite');
            }
            break;
          case 'r':
            event.preventDefault();
            handleRegenerate();
            break;
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
      pageState.selectedSubGoal,
      closeBulkEditModal,
      handleSelectSubGoal,
      focusNext,
      focusPrevious,
      focusFirst,
      focusLast,
      toggleBulkEditMode,
      handleRegenerate,
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
        <LoadingSpinner size="large" message="サブ目標を読み込んでいます..." />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gray-50 ${className || ''}`}
      ref={containerRef}
      role="main"
      aria-label="サブ目標編集ページ"
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
                サブ目標の確認・編集
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
        role="main"
        aria-label="サブ目標編集メインコンテンツ"
      >
        {/* ページ説明 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            AI生成されたサブ目標を確認してください
          </h2>
          <p className="text-gray-600">
            目標達成のために生成された8つのサブ目標です。必要に応じて編集や並び替えを行ってください。
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
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-4"
          role="toolbar"
          aria-label="サブ目標編集ツール"
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleBulkEditMode}
              className={`px-4 py-2 rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                pageState.isBulkEditMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              aria-pressed={pageState.isBulkEditMode}
              aria-describedby="bulk-edit-help"
              title="Ctrl+B で切り替え"
            >
              {pageState.isBulkEditMode ? '一括編集モード終了' : '一括編集モード'}
            </button>
            <div id="bulk-edit-help" className="sr-only">
              一括編集モードでは複数のサブ目標を同時に編集できます
            </div>
            {pageState.isBulkEditMode && (
              <button
                onClick={showBulkEditModal}
                className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                aria-describedby="bulk-execute-help"
              >
                一括編集実行
              </button>
            )}
            <div id="bulk-execute-help" className="sr-only">
              選択されたサブ目標に対して一括編集を実行します
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              disabled={pageState.isLoading}
              aria-describedby="regenerate-help"
              title="Ctrl+R で実行"
            >
              AI再生成
            </button>
            <div id="regenerate-help" className="sr-only">
              AIを使用してサブ目標を再生成します。現在の内容は上書きされます
            </div>
          </div>
        </div>

        {/* サブ目標一覧 */}
        <SubGoalProvider goalId={goalId} initialSubGoals={pageState.subGoals}>
          <BulkSelectionProvider>
            <DragDropProvider
              items={pageState.subGoals.map(subGoal => ({
                id: subGoal.id,
                position: subGoal.position,
                type: 'subgoal' as const,
              }))}
              onReorder={newOrder => {
                const reorderedSubGoals = newOrder.map((item, index) => {
                  const subGoal = pageState.subGoals.find(sg => sg.id === item.id);
                  if (!subGoal) {
                    throw new Error(`サブ目標が見つかりません: ${item.id}`);
                  }
                  return { ...subGoal, position: index };
                });
                handleReorderSubGoals(reorderedSubGoals);
              }}
              constraints={{
                allowCrossGroup: false,
                maxItems: 8,
                minItems: 8,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pageState.subGoals.map((subGoal, index) => (
                  <SubGoalCard
                    key={subGoal.id}
                    subGoal={subGoal}
                    index={index}
                    isSelected={pageState.selectedSubGoal?.id === subGoal.id}
                    isBulkEditMode={pageState.isBulkEditMode}
                    onSelect={() => handleSelectSubGoal(subGoal)}
                    onUpdate={changes => handleUpdateSubGoal(subGoal.id, changes)}
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
              />
            )}
          </BulkSelectionProvider>
        </SubGoalProvider>

        {/* ナビゲーションボタン */}
        <nav
          className="mt-8 flex justify-between"
          role="navigation"
          aria-label="ページナビゲーション"
        >
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            aria-describedby="back-help"
          >
            前に戻る
          </button>
          <div id="back-help" className="sr-only">
            目標入力画面に戻ります
          </div>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-describedby="next-help"
          >
            次へ進む
          </button>
          <div id="next-help" className="sr-only">
            アクション編集画面に進みます
          </div>
        </nav>
      </main>
    </div>
  );
};

/**
 * サブ目標カードコンポーネント
 */
interface SubGoalCardProps {
  subGoal: SubGoal;
  index: number;
  isSelected: boolean;
  isBulkEditMode: boolean;
  onSelect: () => void;
  onUpdate: (changes: Partial<SubGoal>) => void;
}

const SubGoalCard: React.FC<SubGoalCardProps> = ({
  subGoal,
  index,
  isSelected,
  isBulkEditMode,
  onSelect,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: subGoal.title,
    description: subGoal.description,
  });

  const cardRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    onUpdate(editData);
    setIsEditing(false);
  }, [editData, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditData({
      title: subGoal.title,
      description: subGoal.description,
    });
    setIsEditing(false);
  }, [subGoal]);

  /**
   * キーボードイベントハンドラー
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isBulkEditMode) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          if (!isEditing) {
            event.preventDefault();
            onSelect();
          }
          break;
        case 'Escape':
          if (isEditing) {
            event.preventDefault();
            handleCancel();
          }
          break;
        case 'e':
        case 'E':
          if (!isEditing && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            setIsEditing(true);
          }
          break;
        case 's':
        case 'S':
          if (isEditing && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handleSave();
          }
          break;
      }
    },
    [isBulkEditMode, isEditing, onSelect, handleCancel, handleSave]
  );

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-lg shadow-md p-6 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
      } ${!isBulkEditMode ? 'cursor-pointer' : ''}`}
      onClick={!isBulkEditMode ? onSelect : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={isBulkEditMode ? -1 : 0}
      role={isBulkEditMode ? undefined : 'button'}
      aria-pressed={isBulkEditMode ? undefined : isSelected}
      aria-label={`サブ目標 ${index + 1}: ${subGoal.title}`}
      aria-describedby={`subgoal-${index}-description`}
    >
      {/* カードヘッダー */}
      <div className="flex items-center justify-between mb-4">
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
          <span className="text-sm font-medium text-gray-500">サブ目標 {index + 1}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">進捗: {subGoal.progress}%</span>
          {!isBulkEditMode && (
            <button
              onClick={e => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
              className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              aria-label={isEditing ? '編集をキャンセル' : 'サブ目標を編集'}
              title="Ctrl+E で編集"
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
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${subGoal.progress}%` }}
          />
        </div>
      </div>

      {/* コンテンツ */}
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="subgoal-title" className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              id="subgoal-title"
              type="text"
              value={editData.title}
              onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>
          <div>
            <label
              htmlFor="subgoal-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              説明
            </label>
            <textarea
              id="subgoal-description"
              value={editData.description}
              onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              title="Ctrl+S で保存"
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-1"
              title="Escape でキャンセル"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{subGoal.title}</h3>
          <p id={`subgoal-${index}-description`} className="text-sm text-gray-600 line-clamp-3">
            {subGoal.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default SubGoalEditPage;
