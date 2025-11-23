import React from 'react';
import { useErrorRecovery, RecoveryStrategy } from '../../hooks/useErrorRecovery';
import { ApiError } from '../../services/api';
import { ValidationMessage } from './ValidationMessage';

/**
 * 回復アクションの種類
 */
export enum RecoveryAction {
  RETRY = 'RETRY',
  RELOAD = 'RELOAD',
  CLEAR_CACHE = 'CLEAR_CACHE',
  CLEAR_STORAGE = 'CLEAR_STORAGE',
  SUGGEST_ALTERNATIVE = 'SUGGEST_ALTERNATIVE',
  CONTACT_SUPPORT = 'CONTACT_SUPPORT',
}

/**
 * エラー回復パネルのプロパティ
 */
export interface ErrorRecoveryPanelProps {
  /** 発生したエラー */
  error: ApiError | null;
  /** 回復コンテキスト */
  context?: {
    retryFunction?: () => Promise<unknown>;
    fallbackFunction?: () => Promise<unknown>;
    operation?: string;
  };
  /** 追加のクラス名 */
  className?: string;
  /** 回復成功時のコールバック */
  onRecoverySuccess?: () => void;
  /** 回復失敗時のコールバック */
  onRecoveryFailure?: (error: Error) => void;
  /** パネルを閉じるコールバック */
  onClose?: () => void;
  /** 自動回復を有効にするか */
  enableAutoRecovery?: boolean;
}

/**
 * 回復アクションのラベルマッピング
 */
const ACTION_LABELS: Record<RecoveryAction, string> = {
  [RecoveryAction.RETRY]: '再試行',
  [RecoveryAction.RELOAD]: 'ページを再読み込み',
  [RecoveryAction.CLEAR_CACHE]: 'キャッシュをクリア',
  [RecoveryAction.CLEAR_STORAGE]: 'ローカルデータをクリア',
  [RecoveryAction.SUGGEST_ALTERNATIVE]: '代替手段を試す',
  [RecoveryAction.CONTACT_SUPPORT]: 'サポートに連絡',
};

/**
 * 回復戦略の説明マッピング
 */
const STRATEGY_DESCRIPTIONS: Record<RecoveryStrategy, string> = {
  [RecoveryStrategy.AUTO_RETRY]: '自動的に再試行しています...',
  [RecoveryStrategy.MANUAL_RETRY]: '手動で再試行してください',
  [RecoveryStrategy.WAIT_ONLINE]: 'インターネット接続の復旧を待っています...',
  [RecoveryStrategy.FALLBACK]: '代替手段を実行しています...',
  [RecoveryStrategy.USER_INTERVENTION]: 'ユーザーの操作が必要です',
  [RecoveryStrategy.UNRECOVERABLE]: 'このエラーは回復できません',
};

/**
 * エラー回復パネルコンポーネント
 */
export const ErrorRecoveryPanel: React.FC<ErrorRecoveryPanelProps> = ({
  error,
  context = {},
  className = '',
  onRecoverySuccess,
  onRecoveryFailure,
  onClose,
  enableAutoRecovery = true,
}) => {
  const errorRecovery = useErrorRecovery({
    enableAutoRecovery,
    onRecoverySuccess: strategy => {
      console.log(`回復成功: ${strategy}`);
      onRecoverySuccess?.();
    },
    onRecoveryFailure: (strategy, recoveryError) => {
      console.error(`回復失敗: ${strategy}`, recoveryError);
      onRecoveryFailure?.(recoveryError);
    },
  });

  // エラーが変更されたら自動回復を開始
  React.useEffect(() => {
    if (error && errorRecovery.isRecoverable(error)) {
      errorRecovery.startRecovery(error, context);
    }
  }, [error, context, errorRecovery]);

  if (!error) {
    return null;
  }

  const { recoveryState, recoveryProgress } = errorRecovery;
  const isRecoverable = errorRecovery.isRecoverable(error);

  /**
   * 回復アクションを実行
   */
  const handleRecoveryAction = async (action: RecoveryAction) => {
    try {
      const success = await errorRecovery.executeRecoveryAction(action);
      if (success && onRecoverySuccess) {
        onRecoverySuccess();
      }
    } catch (actionError) {
      console.error('回復アクション実行エラー:', actionError);
      if (onRecoveryFailure) {
        onRecoveryFailure(actionError as Error);
      }
    }
  };

  /**
   * 進捗バーを表示
   */
  const renderProgressBar = () => {
    if (!recoveryState.isRecovering) return null;

    return (
      <div className="mt-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>回復中...</span>
          <span>{Math.round(recoveryProgress * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${recoveryProgress * 100}%` }}
          />
        </div>
      </div>
    );
  };

  /**
   * 回復アクションボタンを表示
   */
  const renderRecoveryActions = () => {
    if (recoveryState.isRecovering || recoveryState.recommendedActions.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-800">推奨アクション:</h4>
        <div className="flex flex-wrap gap-2">
          {recoveryState.recommendedActions.map(action => (
            <button
              key={action}
              onClick={() => handleRecoveryAction(action)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={recoveryState.isRecovering}
            >
              {getActionIcon(action)}
              <span className="ml-1">{ACTION_LABELS[action]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  /**
   * アクションアイコンを取得
   */
  const getActionIcon = (action: RecoveryAction) => {
    switch (action) {
      case RecoveryAction.RETRY:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        );
      case RecoveryAction.RELOAD:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
              clipRule="evenodd"
            />
          </svg>
        );
      case RecoveryAction.CLEAR_CACHE:
      case RecoveryAction.CLEAR_STORAGE:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
            <path
              fillRule="evenodd"
              d="M10 5a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2V7a2 2 0 00-2-2h-4zm3 4a1 1 0 10-2 0v4a1 1 0 102 0V9zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0v-3z"
              clipRule="evenodd"
            />
          </svg>
        );
      case RecoveryAction.SUGGEST_ALTERNATIVE:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case RecoveryAction.CONTACT_SUPPORT:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  /**
   * 回復状態の説明を表示
   */
  const renderRecoveryStatus = () => {
    if (!recoveryState.strategy) return null;

    const description = STRATEGY_DESCRIPTIONS[recoveryState.strategy];

    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center">
          {recoveryState.isRecovering && (
            <svg
              className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span className="text-sm text-blue-800">{description}</span>
        </div>
        {renderProgressBar()}
      </div>
    );
  };

  /**
   * 回復履歴を表示
   */
  const renderRecoveryHistory = () => {
    if (recoveryState.recoveryAttempts === 0) return null;

    return (
      <div className="mt-3 text-xs text-gray-500">
        回復試行回数: {recoveryState.recoveryAttempts}
        {recoveryState.lastRecoveryAttempt && (
          <span className="ml-2">
            最終試行: {recoveryState.lastRecoveryAttempt.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`border border-red-200 bg-red-50 rounded-md p-4 ${className}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <ValidationMessage
            message={error.message}
            type="error"
            className="mb-0 bg-transparent border-0 p-0"
          />

          {!isRecoverable && (
            <div className="mt-2 text-sm text-red-700">
              このエラーは自動回復できません。サポートにお問い合わせください。
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-red-400 hover:text-red-600"
            aria-label="エラーパネルを閉じる"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {isRecoverable && (
        <>
          {renderRecoveryStatus()}
          {renderRecoveryActions()}
          {renderRecoveryHistory()}
        </>
      )}
    </div>
  );
};

export default ErrorRecoveryPanel;
