import React, { useCallback, useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  actionFormSchema,
  ActionFormData,
  PartialActionFormData,
  validatePartialActionForm,
} from '../../schemas/action-form';
import {
  FormField,
  TextInput,
  TextArea,
  CharacterCounter,
  ErrorDisplay,
  DraftSaveButton,
} from './index';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { /* useFocusManagement, */ useAnnouncement } from '../../hooks/useFocusManagement';
import { useActionForm } from '../../hooks/useActionForm';
import { ActionType } from '../../types/mandala';

/**
 * フィールドの最大文字数設定
 */
const FIELD_LIMITS = {
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 500,
  BACKGROUND_MAX: 500,
  CONSTRAINTS_MAX: 300,
} as const;

/**
 * ActionFormのプロパティ
 */
export interface ActionFormProps {
  /** アクションID */
  actionId: string;
  /** サブ目標ID */
  subGoalId: string;
  /** 初期データ */
  initialData?: Partial<ActionFormData>;
  /** フォーム送信時のコールバック */
  onSubmit: (data: ActionFormData) => Promise<void>;
  /** 下書き保存時のコールバック */
  onDraftSave?: (data: PartialActionFormData) => Promise<void>;
  /** 送信中フラグ */
  isSubmitting?: boolean;
  /** 下書き保存中フラグ */
  isDraftSaving?: boolean;
  /** 自動保存を有効にするか */
  enableAutoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** 追加のクラス名 */
  className?: string;
  /** フォームの無効化 */
  disabled?: boolean;
  /** エラー表示のカスタマイズ */
  showErrorSummary?: boolean;
  /** リアルタイムバリデーションを有効にするか */
  enableRealtimeValidation?: boolean;
  /** サブ目標間制約チェックを有効にするか */
  enableConstraintValidation?: boolean;
}

/**
 * アクション入力フォームコンポーネント
 *
 * 機能:
 * - アクション編集フォーム
 * - アクション種別選択
 * - リアルタイムバリデーション
 * - 下書き保存機能
 * - 文字数カウント
 * - アクセシビリティ対応
 *
 * 要件: 要件2, 要件6
 */
export const ActionForm: React.FC<ActionFormProps> = ({
  actionId,
  subGoalId,
  initialData,
  onSubmit,
  onDraftSave,
  isSubmitting = false,
  isDraftSaving = false,
  enableAutoSave = true,
  autoSaveInterval = 30000,
  className = '',
  disabled = false,
  showErrorSummary = true,
  enableRealtimeValidation = true,
  enableConstraintValidation = true,
}) => {
  // レスポンシブレイアウト管理
  const { getResponsiveClasses } = useResponsiveLayout();

  // キーボードナビゲーション管理
  const { containerRef } = useKeyboardNavigation();

  // アナウンス機能
  const { announce, AnnouncementRegion } = useAnnouncement();

  // カスタムフック使用
  const {
    formState: customFormState,
    validateConstraints,
    handleError,
    changeActionType,
  } = useActionForm({
    actionId,
    subGoalId,
    initialData,
    enableRealtimeValidation,
    enableAutoSave,
    autoSaveInterval,
    enableConstraintValidation,
  });

  // React Hook Formの初期化
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<ActionFormData>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
      type: initialData?.type || ActionType.EXECUTION,
    },
    mode: 'onBlur',
  });

  // 内部状態
  const [lastSavedData, setLastSavedData] = useState<PartialActionFormData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // フォームの値を監視
  const formWatchedValues = watch();

  // 初期データが変更された場合にフォームをリセット
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        background: initialData.background || '',
        constraints: initialData.constraints || '',
        type: initialData.type || ActionType.EXECUTION,
      });
      setLastSavedData(initialData);
      setHasUnsavedChanges(false);
    }
  }, [initialData, reset]);

  // 未保存の変更を検出
  useEffect(() => {
    if (!lastSavedData) {
      setHasUnsavedChanges(isDirty);
      return;
    }

    const currentData = getValues();
    const hasChanges = Object.keys(currentData).some(
      key =>
        currentData[key as keyof ActionFormData] !==
        lastSavedData[key as keyof PartialActionFormData]
    );
    setHasUnsavedChanges(hasChanges);
  }, [formWatchedValues, lastSavedData, isDirty, getValues]);

  // フォーム送信ハンドラー
  const handleFormSubmit: SubmitHandler<ActionFormData> = async data => {
    try {
      // 制約チェック
      if (enableConstraintValidation) {
        const constraintValid = await validateConstraints();
        if (!constraintValid) {
          announce('入力内容に制約違反があります', 'assertive');
          return;
        }
      }

      await onSubmit(data);
      setLastSavedData(data);
      setHasUnsavedChanges(false);
      announce('アクションが正常に更新されました');
    } catch (error) {
      console.error('アクション更新エラー:', error);
      announce('アクションの更新中にエラーが発生しました', 'assertive');
      handleError(error as Error);
    }
  };

  // 手動下書き保存ハンドラー
  const handleDraftSave = useCallback(async () => {
    if (!onDraftSave) {
      return;
    }

    try {
      const currentData = getValues();
      const validationResult = validatePartialActionForm(currentData);

      if (validationResult.isValid) {
        // 制約チェック
        if (enableConstraintValidation) {
          const constraintValid = await validateConstraints();
          if (!constraintValid) {
            announce('入力内容に制約違反があります', 'assertive');
            return;
          }
        }

        await onDraftSave(currentData);
        setLastSavedData(currentData);
        setHasUnsavedChanges(false);
        announce('下書きが保存されました');
      } else {
        announce('入力内容にエラーがあります', 'assertive');
      }
    } catch (error) {
      console.error('下書き保存エラー:', error);
      announce('下書き保存中にエラーが発生しました', 'assertive');
      handleError(error as Error);
    }
  }, [
    onDraftSave,
    getValues,
    validateConstraints,
    enableConstraintValidation,
    announce,
    handleError,
  ]);

  // アクション種別変更ハンドラー
  const handleActionTypeChange = useCallback(
    (type: ActionType) => {
      setValue('type', type, { shouldDirty: true, shouldValidate: true });
      changeActionType(type);
      announce(`アクション種別を${type === ActionType.EXECUTION ? '実行' : '習慣'}に変更しました`);
    },
    [setValue, changeActionType, announce]
  );

  // フィールドの文字数を取得
  const getFieldLength = (fieldName: keyof Omit<ActionFormData, 'type'>): number => {
    const value = formWatchedValues[fieldName];
    return typeof value === 'string' ? value.length : 0;
  };

  // 送信ボタンの無効化判定
  const isSubmitDisabled = !isValid || isSubmitting || disabled;

  // レスポンシブクラス名の生成
  const getContainerClasses = () => {
    return getResponsiveClasses({
      base: 'max-w-4xl mx-auto',
      mobile: '',
      tablet: 'md:max-w-4xl',
      desktop: 'lg:max-w-6xl',
    });
  };

  const getFormClasses = () => {
    return getResponsiveClasses({
      base: 'space-y-6',
      mobile: '',
      tablet: 'md:space-y-6',
      desktop: 'lg:space-y-8',
    });
  };

  const getButtonContainerClasses = () => {
    return getResponsiveClasses({
      base: 'flex flex-col gap-4 pt-6 border-t border-gray-200',
      mobile: '',
      tablet: 'md:flex-row md:justify-between',
      desktop: 'lg:flex-row lg:justify-end',
    });
  };

  const getButtonClasses = (variant: 'primary' | 'secondary' = 'primary') => {
    const baseClasses = `
      px-4 py-2 text-sm font-medium rounded-md
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      flex items-center justify-center gap-2
      transition-colors
    `;

    const variantClasses = {
      primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      secondary:
        'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
    };

    return getResponsiveClasses({
      base: `${baseClasses} ${variantClasses[variant]}`,
      mobile: '',
      tablet: 'md:flex-1 md:max-w-[200px]',
      desktop: 'lg:w-auto lg:min-w-[120px] lg:flex-none',
    });
  };

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`${getContainerClasses()} ${className}`}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={getFormClasses()}
        aria-label="アクション編集フォーム"
        noValidate
      >
        {/* エラーサマリー */}
        {showErrorSummary && Object.keys(errors).length > 0 && (
          <div role="alert" aria-live="polite">
            <ErrorDisplay
              errors={Object.entries(errors).reduce(
                (acc, [key, error]) => {
                  acc[key] = error?.message || 'エラーが発生しました';
                  return acc;
                },
                {} as Record<string, string>
              )}
              title="入力内容を確認してください"
            />
          </div>
        )}

        {/* アクションタイトル */}
        <FormField
          label="アクションタイトル"
          required
          error={errors.title?.message}
          helpText="このアクションの名前を簡潔に入力してください"
        >
          <div className="space-y-2">
            <TextInput
              name="title"
              register={register}
              placeholder="例：プログラミング基礎書を読む"
              maxLength={FIELD_LIMITS.TITLE_MAX}
              disabled={disabled}
            />
            <CharacterCounter
              current={getFieldLength('title')}
              max={FIELD_LIMITS.TITLE_MAX}
              showWarning
            />
          </div>
        </FormField>

        {/* アクション説明 */}
        <FormField
          label="アクション説明"
          required
          error={errors.description?.message}
          helpText="このアクションの詳細な内容について説明してください"
        >
          <div className="space-y-2">
            <TextArea
              name="description"
              register={register}
              placeholder="例：プログラミングの基礎概念について書かれた入門書を1冊読み通し、重要なポイントをノートにまとめる"
              rows={4}
              maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
              disabled={disabled}
            />
            <CharacterCounter
              current={getFieldLength('description')}
              max={FIELD_LIMITS.DESCRIPTION_MAX}
              showWarning
            />
          </div>
        </FormField>

        {/* 背景 */}
        <FormField
          label="背景"
          required
          error={errors.background?.message}
          helpText="このアクションを設定した理由や現在の状況について説明してください"
        >
          <div className="space-y-2">
            <TextArea
              name="background"
              register={register}
              placeholder="例：プログラミング未経験のため、まずは体系的に基礎知識を身につける必要がある"
              rows={3}
              maxLength={FIELD_LIMITS.BACKGROUND_MAX}
              disabled={disabled}
            />
            <CharacterCounter
              current={getFieldLength('background')}
              max={FIELD_LIMITS.BACKGROUND_MAX}
              showWarning
            />
          </div>
        </FormField>

        {/* 制約事項 */}
        <FormField
          label="制約事項"
          error={errors.constraints?.message}
          helpText="このアクション実行において制限となる要因があれば入力してください（任意）"
        >
          <div className="space-y-2">
            <TextArea
              name="constraints"
              register={register}
              placeholder="例：読書時間は通勤時間と就寝前の1時間のみ。技術書は高価なので図書館を活用"
              rows={3}
              maxLength={FIELD_LIMITS.CONSTRAINTS_MAX}
              disabled={disabled}
            />
            <CharacterCounter
              current={getFieldLength('constraints')}
              max={FIELD_LIMITS.CONSTRAINTS_MAX}
              showWarning
            />
          </div>
        </FormField>

        {/* アクション種別 */}
        <FormField
          label="アクション種別"
          required
          error={errors.type?.message}
          helpText="このアクションの性質を選択してください"
        >
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value={ActionType.EXECUTION}
                  {...register('type')}
                  onChange={() => handleActionTypeChange(ActionType.EXECUTION)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">実行アクション</span>
                  <p className="text-xs text-gray-500">一度実行すれば完了するアクション</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value={ActionType.HABIT}
                  {...register('type')}
                  onChange={() => handleActionTypeChange(ActionType.HABIT)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">習慣アクション</span>
                  <p className="text-xs text-gray-500">継続的に行う必要があるアクション</p>
                </div>
              </label>
            </div>

            {/* アクション種別の説明 */}
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-xs text-gray-600">
                {formWatchedValues.type === ActionType.EXECUTION ? (
                  <div>
                    <strong>実行アクション:</strong>{' '}
                    書籍を読む、資格を取得する、プロジェクトを完成させるなど、
                    一度実行すれば完了するアクションです。進捗は完了したタスクの割合で計算されます。
                  </div>
                ) : (
                  <div>
                    <strong>習慣アクション:</strong> 毎日の運動、定期的な学習、継続的な練習など、
                    継続して行う必要があるアクションです。目標期間の8割以上継続すれば達成とみなされます。
                  </div>
                )}
              </div>
            </div>
          </div>
        </FormField>

        {/* フォームアクション */}
        <div className={getButtonContainerClasses()}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 下書き保存ボタン */}
            {onDraftSave && (
              <DraftSaveButton
                onClick={handleDraftSave}
                disabled={!hasUnsavedChanges || isDraftSaving || disabled}
                isSaving={isDraftSaving}
                className={getButtonClasses('secondary')}
              />
            )}
          </div>

          {/* 更新ボタン */}
          <button type="submit" disabled={isSubmitDisabled} className={getButtonClasses('primary')}>
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                更新中...
              </>
            ) : (
              'アクションを更新'
            )}
          </button>
        </div>

        {/* 自動保存状態表示 */}
        {enableAutoSave && onDraftSave && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            {customFormState.isDraftSaving ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
                自動保存中...
              </>
            ) : hasUnsavedChanges ? (
              <>
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                未保存の変更があります（30秒後に自動保存）
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.53 10.53a.75.75 0 00-1.06 1.061l2.03 2.03a.75.75 0 001.137-.089l3.857-5.401z"
                    clipRule="evenodd"
                  />
                </svg>
                すべての変更が保存されました
              </>
            )}
          </div>
        )}
      </form>

      {/* アナウンス領域（スクリーンリーダー用） */}
      <AnnouncementRegion />
    </div>
  );
};

export default ActionForm;
