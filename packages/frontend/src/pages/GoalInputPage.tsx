import React, { useEffect, useState, useCallback } from 'react';
import { PartialGoalFormData } from '../schemas/goal-form';
import { useNavigate } from 'react-router-dom';
import { GoalInputForm } from '../components/forms/GoalInputForm';
import { GoalFormProvider } from '../contexts/GoalFormContext';
import {
  GoalFormService,
  CreateGoalResponse,
  SaveDraftResponse,
  getErrorMessage,
} from '../services/goalFormService';
import { GoalFormData } from '../schemas/goal-form';
import { useAuth } from '../hooks/useAuth';

/**
 * 目標入力ページのプロパティ
 */
export interface GoalInputPageProps {
  /** カスタムクラス名 */
  className?: string;
}

/**
 * ページの状態
 */
interface PageState {
  /** ページの読み込み状態 */
  isLoading: boolean;
  /** 下書きデータ */
  draftData: PartialGoalFormData | null;
  /** エラーメッセージ */
  error: string | null;
  /** 成功メッセージ */
  successMessage: string | null;
  /** 初期化完了フラグ */
  isInitialized: boolean;
}

/**
 * 目標入力ページコンポーネント
 *
 * 機能:
 * - 目標入力フォームの表示
 * - 下書きデータの自動復元
 * - フォーム送信処理
 * - 下書き保存機能
 * - 認証チェック
 * - エラーハンドリング
 *
 * 要件: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */
export const GoalInputPage: React.FC<GoalInputPageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [pageState, setPageState] = useState<PageState>({
    isLoading: true,
    draftData: null,
    error: null,
    successMessage: null,
    isInitialized: false,
  });

  /**
   * 下書きデータを取得する
   */
  const loadDraftData = useCallback(async () => {
    try {
      setPageState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await GoalFormService.getDraft();

      // responseがundefinedまたはnullの場合の安全な処理
      if (!response) {
        setPageState(prev => ({
          ...prev,
          draftData: null,
          isLoading: false,
          isInitialized: true,
        }));
        return;
      }

      setPageState(prev => ({
        ...prev,
        draftData: response.draftData || null,
        isLoading: false,
        isInitialized: true,
      }));

      // 下書きが復元された場合のメッセージ表示
      if (response.draftData && Object.keys(response.draftData).length > 0) {
        setPageState(prev => ({
          ...prev,
          successMessage: '下書きが復元されました',
        }));

        // メッセージを3秒後に自動で消す
        setTimeout(() => {
          setPageState(prev => ({ ...prev, successMessage: null }));
        }, 3000);
      }
    } catch (error) {
      console.error('下書きの取得に失敗しました:', error);

      // 下書きの取得に失敗しても、新規作成として続行
      setPageState(prev => ({
        ...prev,
        draftData: null,
        isLoading: false,
        isInitialized: true,
        error: null, // 下書き取得エラーはユーザーに表示しない
      }));
    }
  }, []);

  /**
   * ページ初期化処理
   */
  useEffect(() => {
    if (!authLoading && isAuthenticated && !pageState.isInitialized) {
      loadDraftData();
    } else if (!authLoading && !isAuthenticated) {
      // 認証されていない場合はログインページにリダイレクト
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, pageState.isInitialized, loadDraftData, navigate]);

  /**
   * フォーム送信処理
   */
  const handleSubmit = useCallback(
    async (formData: GoalFormData): Promise<void> => {
      try {
        setPageState(prev => ({ ...prev, error: null, successMessage: null }));

        const response: CreateGoalResponse = await GoalFormService.createGoal(formData);

        // 送信成功時の処理
        setPageState(prev => ({
          ...prev,
          successMessage: 'AI生成を開始しました。処理中画面に移動します...',
        }));

        // 下書きを削除
        try {
          await GoalFormService.deleteDraft();
        } catch (error) {
          console.warn('下書きの削除に失敗しました:', error);
          // 下書き削除の失敗は処理を継続
        }

        // 処理中画面に遷移（2秒後）
        setTimeout(() => {
          navigate(`/mandala/create/processing?processingId=${response.processingId}`, {
            replace: true,
          });
        }, 2000);
      } catch (error) {
        console.error('目標の作成に失敗しました:', error);

        const errorMessage = getErrorMessage(error as Error);
        setPageState(prev => ({
          ...prev,
          error: errorMessage,
        }));

        throw error; // フォームコンポーネントでもエラーハンドリングするため再スロー
      }
    },
    [navigate]
  );

  /**
   * 下書き保存処理
   */
  const handleDraftSave = useCallback(async (formData: PartialGoalFormData): Promise<void> => {
    try {
      setPageState(prev => ({ ...prev, error: null }));

      const response: SaveDraftResponse = await GoalFormService.saveDraft(formData);

      // 保存成功メッセージを表示
      setPageState(prev => ({
        ...prev,
        successMessage: `${new Date(response.savedAt).toLocaleTimeString()}に保存しました`,
      }));

      // メッセージを3秒後に自動で消す
      setTimeout(() => {
        setPageState(prev => ({ ...prev, successMessage: null }));
      }, 3000);
    } catch (error) {
      console.error('下書きの保存に失敗しました:', error);

      const errorMessage = getErrorMessage(error as Error);
      setPageState(prev => ({
        ...prev,
        error: errorMessage,
      }));

      throw error; // フォームコンポーネントでもエラーハンドリングするため再スロー
    }
  }, []);

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

  // 認証チェック中の表示
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認しています...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合（リダイレクト処理中）
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ページを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className || ''}`}>
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl md:max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18 lg:h-20">
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl lg:text-2xl font-semibold text-gray-900">
                新しい目標を作成
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm md:text-base lg:text-base text-gray-600 hidden sm:block">
                  {user.name || user.email}
                </span>
              )}
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm md:text-base lg:text-base text-blue-600 hover:text-blue-700 font-medium min-h-[44px] md:min-h-[auto] lg:min-h-[auto] flex items-center"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl md:max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        {/* ページ説明 */}
        <div className="mb-8 md:mb-10 lg:mb-12">
          <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 md:mb-3 lg:mb-4">
            目標を入力してください
          </h2>
          <p className="text-gray-600 md:text-base lg:text-lg">
            あなたの目標について詳しく教えてください。AIが目標達成のためのマンダラチャートを生成します。
          </p>
        </div>

        {/* エラーメッセージ */}
        {pageState.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm md:text-sm lg:text-sm font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm md:text-sm lg:text-sm text-red-700">
                  <p className="break-words">{pageState.error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-sm md:text-sm lg:text-sm font-medium text-red-800 hover:text-red-900 min-h-[44px] md:min-h-[auto] lg:min-h-[auto] flex items-center"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成功メッセージ */}
        {pageState.successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <div className="text-sm md:text-sm lg:text-sm text-green-700">
                  <p className="break-words">{pageState.successMessage}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={clearSuccessMessage}
                    className="text-sm md:text-sm lg:text-sm font-medium text-green-800 hover:text-green-900 min-h-[44px] md:min-h-[auto] lg:min-h-[auto] flex items-center"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* フォーム */}
        <div className="bg-white shadow-sm rounded-lg md:shadow-md lg:shadow-md">
          <GoalFormProvider initialData={pageState.draftData || undefined}>
            <GoalInputForm
              onSubmit={handleSubmit}
              onDraftSave={handleDraftSave}
              className="p-6 md:p-6 lg:p-8"
            />
          </GoalFormProvider>
        </div>

        {/* フッター情報 */}
        <div className="mt-8 text-center text-xs md:text-sm lg:text-sm text-gray-500">
          <p>入力された情報は安全に保護され、目標達成のサポートにのみ使用されます。</p>
        </div>
      </main>
    </div>
  );
};

export default GoalInputPage;
