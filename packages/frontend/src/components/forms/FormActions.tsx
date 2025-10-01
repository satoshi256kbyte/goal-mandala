import React from 'react';
import { DraftSaveButton } from './DraftSaveButton';
import { SubmitButton } from './SubmitButton';
import { useFormActions } from '../../hooks/useFormActions';
import { PartialGoalFormData } from '../../schemas/goal-form';

/**
 * フォームアクションのプロパティ
 */
export interface FormActionsProps {
  /** フォームデータ */
  formData: PartialGoalFormData;
  /** フォームが有効かどうか */
  isFormValid: boolean;
  /** 下書き保存成功時のコールバック */
  onDraftSaveSuccess?: (data: PartialGoalFormData) => void;
  /** 下書き保存エラー時のコールバック */
  onDraftSaveError?: (error: Error) => void;
  /** フォーム送信成功時のコールバック */
  onSubmitSuccess?: (data: PartialGoalFormData) => void;
  /** フォーム送信エラー時のコールバック */
  onSubmitError?: (error: Error) => void;
  /** レイアウト方向 */
  layout?: 'horizontal' | 'vertical';
  /** ボタンのサイズ */
  buttonSize?: 'sm' | 'md' | 'lg';
  /** カスタムクラス名 */
  className?: string;
  /** 下書き保存ボタンを表示するかどうか */
  showDraftSave?: boolean;
  /** 送信ボタンのテキスト */
  submitButtonText?: string;
  /** 下書き保存ボタンのテキスト */
  draftSaveButtonText?: string;
}

/**
 * フォームアクションコンポーネント
 */
export const FormActions: React.FC<FormActionsProps> = ({
  formData,
  isFormValid,
  onDraftSaveSuccess,
  onDraftSaveError,
  onSubmitSuccess,
  onSubmitError,
  layout = 'horizontal',
  buttonSize = 'md',
  className = '',
  showDraftSave = true,
  submitButtonText,
  draftSaveButtonText,
}) => {
  // フォームアクション管理フック
  const { state, submitForm, clearErrors, canSaveDraft, canSubmit } = useFormActions({
    formData,
    isFormValid,
    onDraftSaveSuccess,
    onDraftSaveError,
    onSubmitSuccess,
    onSubmitError,
  });

  /**
   * コンテナのレイアウトクラス
   */
  const getContainerClasses = () => {
    const baseClasses = 'flex';

    if (layout === 'vertical') {
      return `${baseClasses} flex-col space-y-3`;
    }

    return `${baseClasses} flex-row space-x-3 items-center`;
  };

  /**
   * 送信ボタンのクリックハンドラー
   */
  const handleSubmit = async () => {
    await submitForm();
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      {/* 下書き保存ボタン */}
      {showDraftSave && (
        <DraftSaveButton
          formData={formData}
          isSaving={state.isDraftSaving}
          disabled={!canSaveDraft}
          size={buttonSize}
          variant="secondary"
          onSaveSuccess={onDraftSaveSuccess}
          onSaveError={onDraftSaveError}
          onSaveStart={() => {}}
          onSaveComplete={() => {}}
        >
          {draftSaveButtonText}
        </DraftSaveButton>
      )}

      {/* 送信ボタン */}
      <SubmitButton
        isSubmitting={state.isSubmitting}
        disabled={!canSubmit}
        isFormValid={isFormValid}
        size={buttonSize}
        variant="primary"
        type="button"
        onSubmit={handleSubmit}
      >
        {submitButtonText}
      </SubmitButton>

      {/* エラー表示エリア（必要に応じて） */}
      {(state.draftSaveError || state.submitError) && (
        <div className="flex flex-col space-y-1">
          {state.draftSaveError && (
            <div className="text-sm text-red-600">
              下書き保存エラー: {state.draftSaveError.message}
            </div>
          )}
          {state.submitError && (
            <div className="text-sm text-red-600">送信エラー: {state.submitError.message}</div>
          )}
          <button
            type="button"
            onClick={clearErrors}
            className="text-xs text-gray-500 hover:text-gray-700 underline self-start"
          >
            エラーを閉じる
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * フォームアクションのメモ化版
 */
export const MemoizedFormActions = React.memo(FormActions);

/**
 * デフォルトエクスポート
 */
export default FormActions;
