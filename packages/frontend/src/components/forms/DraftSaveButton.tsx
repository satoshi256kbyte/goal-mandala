import React, { useState, useCallback } from 'react';
import { PartialGoalFormData } from '../../schemas/goal-form';
import { DraftService } from '../../services/draftService';
import { draftUtils } from '../../utils/draft-utils';

/**
 * 下書き保存ボタンのプロパティ
 */
export interface DraftSaveButtonProps {
  /** フォームデータ */
  formData?: PartialGoalFormData;
  /** 保存中フラグ */
  isSaving?: boolean;
  /** ローディング状態 */
  isLoading?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** ボタンのサイズ */
  size?: 'sm' | 'md' | 'lg';
  /** ボタンのバリアント */
  variant?: 'primary' | 'secondary' | 'outline';
  /** クリック時のコールバック */
  onClick?: () => void | Promise<void>;
  /** 保存成功時のコールバック */
  onSaveSuccess?: (data: PartialGoalFormData) => void;
  /** 保存エラー時のコールバック */
  onSaveError?: (error: Error) => void;
  /** 保存開始時のコールバック */
  onSaveStart?: () => void;
  /** 保存完了時のコールバック */
  onSaveComplete?: () => void;
  /** カスタムクラス名 */
  className?: string;
  /** ボタンのテキスト */
  children?: React.ReactNode;
}

/**
 * 下書き保存ボタンコンポーネント
 */
export const DraftSaveButton: React.FC<DraftSaveButtonProps> = ({
  formData,
  isSaving = false,
  disabled = false,
  size = 'md',
  variant = 'secondary',
  onSaveSuccess,
  onSaveError,
  onSaveStart,
  onSaveComplete,
  className = '',
  children,
}) => {
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);

  /**
   * 手動保存の実行
   */
  const handleSave = useCallback(async () => {
    // 既に保存中の場合はスキップ
    if (isSaving || isLocalSaving) {
      return;
    }

    // データが保存する価値があるかチェック
    if (!draftUtils.isWorthSaving(formData)) {
      const error = new Error('保存するデータがありません');
      setSaveError(error);
      onSaveError?.(error);
      return;
    }

    try {
      setIsLocalSaving(true);
      setSaveError(null);
      onSaveStart?.();

      // 下書き保存実行
      await DraftService.saveDraft(formData);

      // 保存成功
      const now = new Date();
      setLastSaveTime(now);
      onSaveSuccess?.(formData);
    } catch (error) {
      // 保存エラー
      const saveError = error instanceof Error ? error : new Error('下書きの保存に失敗しました');
      setSaveError(saveError);
      onSaveError?.(saveError);
    } finally {
      setIsLocalSaving(false);
      onSaveComplete?.();
    }
  }, [formData, isSaving, isLocalSaving, onSaveStart, onSaveSuccess, onSaveError, onSaveComplete]);

  /**
   * ボタンのスタイルクラス
   */
  const getButtonClasses = () => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // サイズクラス
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    // バリアントクラス
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  /**
   * ボタンのテキスト
   */
  const getButtonText = () => {
    if (children) {
      return children;
    }

    if (isSaving || isLocalSaving) {
      return (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          保存中...
        </>
      );
    }

    return '下書き保存';
  };

  /**
   * ボタンが無効かどうか
   */
  const isDisabled = disabled || isSaving || isLocalSaving || !draftUtils.isWorthSaving(formData);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSave}
        disabled={isDisabled}
        className={getButtonClasses()}
        aria-label="フォームの内容を下書きとして保存"
      >
        {getButtonText()}
      </button>

      {/* 保存成功メッセージ */}
      {lastSaveTime && !saveError && (
        <div className="absolute top-full left-0 mt-1 text-xs text-green-600">
          {draftUtils.getTimeSinceSave(lastSaveTime)}に保存しました
        </div>
      )}

      {/* エラーメッセージ */}
      {saveError && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-600">
          {saveError.message}
        </div>
      )}
    </div>
  );
};

/**
 * 下書き保存ボタンのメモ化版
 */
export const MemoizedDraftSaveButton = React.memo(DraftSaveButton);

/**
 * デフォルトエクスポート
 */
export default DraftSaveButton;
