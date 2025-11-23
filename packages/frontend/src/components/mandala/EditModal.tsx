import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Goal, SubGoal, Action, ActionType } from '../../types/mandala';
import './EditModal.css';

// バリデーションスキーマ
const goalSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
  deadline: z.string().refine(
    val => {
      const date = new Date(val);
      return date > new Date();
    },
    { message: '達成期限は未来の日付を指定してください' }
  ),
  background: z.string().min(1, '背景は必須です').max(1000, '背景は1000文字以内で入力してください'),
  constraints: z.string().max(1000, '制約事項は1000文字以内で入力してください').optional(),
});

const subGoalSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
  background: z.string().min(1, '背景は必須です').max(1000, '背景は1000文字以内で入力してください'),
  constraints: z.string().max(1000, '制約事項は1000文字以内で入力してください').optional(),
});

const actionSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
  background: z.string().min(1, '背景は必須です').max(1000, '背景は1000文字以内で入力してください'),
  constraints: z.string().max(1000, '制約事項は1000文字以内で入力してください').optional(),
  type: z.enum(['execution', 'habit']),
});

export interface EditModalProps {
  isOpen: boolean;
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  initialData: Goal | SubGoal | Action;
  onSave: (data: Goal | SubGoal | Action) => Promise<void>;
  onClose: () => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  entityType,
  entityId: _entityId,
  initialData,
  onSave,
  onClose,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // エンティティタイプに応じたスキーマを選択
  const getSchema = () => {
    switch (entityType) {
      case 'goal':
        return goalSchema;
      case 'subgoal':
        return subGoalSchema;
      case 'action':
        return actionSchema;
      default:
        return goalSchema;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
  } = useForm({
    resolver: zodResolver(getSchema()),
    mode: 'onChange',
    defaultValues: getDefaultValues(),
    criteriaMode: 'all',
  });

  function getDefaultValues(): any {
    if (entityType === 'goal') {
      const goal = initialData as Goal;
      return {
        title: goal.title,
        description: goal.description,
        deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
        background: (goal as any).background || '',
        constraints: (goal as any).constraints || '',
      };
    } else if (entityType === 'subgoal') {
      const subGoal = initialData as SubGoal;
      return {
        title: subGoal.title,
        description: subGoal.description,
        background: (subGoal as any).background || '',
        constraints: (subGoal as any).constraints || '',
      };
    } else {
      const action = initialData as Action;
      return {
        title: action.title,
        description: action.description,
        background: (action as any).background || '',
        constraints: (action as any).constraints || '',
        type: action.type,
      };
    }
  }

  // モーダルが開いた時の処理
  useEffect(() => {
    if (isOpen) {
      // フォームをリセット
      reset(getDefaultValues());
      setSaveError(null);

      // フォーカスを最初の入力フィールドに移動
      // 複数のrequestAnimationFrameを使用して確実にフォーカスを設定
      let rafId1: number | null = null;
      let rafId2: number | null = null;

      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          firstInputRef.current?.focus();
        });
      });

      return () => {
        // クリーンアップ: requestAnimationFrameをキャンセル
        if (rafId1 !== null) {
          cancelAnimationFrame(rafId1);
        }
        if (rafId2 !== null) {
          cancelAnimationFrame(rafId2);
        }
      };
    }
  }, [isOpen]);

  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();

        // 確認ダイアログが表示されている場合は、ダイアログを閉じる
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isDirty, showConfirmDialog]);

  // フォーカストラップ
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab as any);
    return () => modal.removeEventListener('keydown', handleTab as any);
  }, [isOpen]);

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // エンティティタイプに応じてデータを整形
      let updatedData: Goal | SubGoal | Action;

      if (entityType === 'goal') {
        updatedData = {
          ...initialData,
          title: data.title,
          description: data.description,
          deadline: new Date(data.deadline),
          background: data.background,
          constraints: data.constraints || '',
        } as Goal;
      } else if (entityType === 'subgoal') {
        updatedData = {
          ...initialData,
          title: data.title,
          description: data.description,
          background: data.background,
          constraints: data.constraints || '',
        } as SubGoal;
      } else {
        updatedData = {
          ...initialData,
          title: data.title,
          description: data.description,
          background: data.background,
          constraints: data.constraints || '',
          type: data.type as ActionType,
        } as Action;
      }

      await onSave(updatedData);
      setIsSaving(false);
      onClose();
    } catch (error) {
      setIsSaving(false);
      setSaveError(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (entityType) {
      case 'goal':
        return '目標の編集';
      case 'subgoal':
        return 'サブ目標の編集';
      case 'action':
        return 'アクションの編集';
      default:
        return '編集';
    }
  };

  return (
    <>
      {/* メインモーダル */}
      <div
        className="edit-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={handleBackdropClick}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
        role="presentation"
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="edit-modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"
        >
          {/* ヘッダー */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
              {getTitle()}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4">
            {/* エラーメッセージ */}
            {saveError && (
              <div className="edit-modal-save-error">
                <p className="text-sm">{saveError}</p>
              </div>
            )}

            {/* タイトル */}
            <div className="edit-modal-form-field mb-4">
              <label htmlFor="title" className="edit-modal-form-label">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                {...register('title', {
                  setValueAs: value => value,
                })}
                ref={e => {
                  register('title').ref(e);
                  firstInputRef.current = e;
                }}
                className={`edit-modal-form-input ${errors.title ? 'error' : ''}`}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <p id="title-error" className="edit-modal-error-message" role="alert">
                  {errors.title.message as string}
                </p>
              )}
            </div>

            {/* 説明 */}
            <div className="edit-modal-form-field mb-4">
              <label htmlFor="description" className="edit-modal-form-label">
                説明 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className={`edit-modal-form-textarea ${errors.description ? 'error' : ''}`}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {errors.description && (
                <p id="description-error" className="edit-modal-error-message" role="alert">
                  {errors.description.message as string}
                </p>
              )}
            </div>

            {/* 達成期限（目標のみ） */}
            {entityType === 'goal' && (
              <div className="edit-modal-form-field mb-4">
                <label htmlFor="deadline" className="edit-modal-form-label">
                  達成期限 <span className="text-red-500">*</span>
                </label>
                <input
                  id="deadline"
                  type="date"
                  {...register('deadline')}
                  className={`edit-modal-form-input ${errors.deadline ? 'error' : ''}`}
                  aria-invalid={!!errors.deadline}
                  aria-describedby={errors.deadline ? 'deadline-error' : undefined}
                />
                {errors.deadline && (
                  <p id="deadline-error" className="edit-modal-error-message" role="alert">
                    {errors.deadline.message as string}
                  </p>
                )}
              </div>
            )}

            {/* 背景 */}
            <div className="edit-modal-form-field mb-4">
              <label htmlFor="background" className="edit-modal-form-label">
                背景 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="background"
                {...register('background')}
                rows={4}
                className={`edit-modal-form-textarea ${errors.background ? 'error' : ''}`}
                aria-invalid={!!errors.background}
                aria-describedby={errors.background ? 'background-error' : undefined}
              />
              {errors.background && (
                <p id="background-error" className="edit-modal-error-message" role="alert">
                  {errors.background.message as string}
                </p>
              )}
            </div>

            {/* 制約事項 */}
            <div className="edit-modal-form-field mb-4">
              <label htmlFor="constraints" className="edit-modal-form-label">
                制約事項
              </label>
              <textarea
                id="constraints"
                {...register('constraints')}
                rows={4}
                className={`edit-modal-form-textarea ${errors.constraints ? 'error' : ''}`}
                aria-invalid={!!errors.constraints}
                aria-describedby={errors.constraints ? 'constraints-error' : undefined}
              />
              {errors.constraints && (
                <p id="constraints-error" className="edit-modal-error-message" role="alert">
                  {errors.constraints.message as string}
                </p>
              )}
            </div>

            {/* アクション種別（アクションのみ） */}
            {entityType === 'action' && (
              <div className="edit-modal-form-field mb-4">
                <fieldset>
                  <legend className="edit-modal-form-label mb-2">
                    種別 <span className="text-red-500">*</span>
                  </legend>
                  <div className="edit-modal-radio-group">
                    <label className="edit-modal-radio-label">
                      <input type="radio" {...register('type')} value="execution" />
                      <span>実行</span>
                    </label>
                    <label className="edit-modal-radio-label">
                      <input type="radio" {...register('type')} value="habit" />
                      <span>習慣</span>
                    </label>
                  </div>
                </fieldset>
                {errors.type && (
                  <p className="edit-modal-error-message" role="alert">
                    {errors.type.message as string}
                  </p>
                )}
              </div>
            )}

            {/* フッター */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="edit-modal-button edit-modal-button-secondary"
                disabled={isSaving}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="edit-modal-button edit-modal-button-primary"
                disabled={!isValid || isSaving}
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="edit-modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="edit-modal-confirm-dialog bg-white rounded-lg shadow-xl max-w-md w-full m-4 p-6"
          >
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900 mb-4">
              変更を破棄しますか？
            </h3>
            <p className="text-sm text-gray-600 mb-6">保存されていない変更は失われます。</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelClose}
                className="edit-modal-button edit-modal-button-secondary"
              >
                いいえ
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="edit-modal-button edit-modal-confirm-button-danger"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
