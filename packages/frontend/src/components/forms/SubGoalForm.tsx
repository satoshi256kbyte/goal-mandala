import React, { useCallback, useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  subGoalFormSchema,
  SubGoalFormData,
  PartialSubGoalFormData,
  validatePartialSubGoalForm,
} from '../../schemas/subgoal-form';
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
// import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useSubGoalForm } from '../../hooks/useSubGoalForm';

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
 * SubGoalFormのプロパティ
 */
export interface SubGoalFormProps {
  /** サブ目標ID */
  subGoalId: string;
  /** 初期データ */
  initialData?: Partial<SubGoalFormData>;
  /** フォーム送信時のコールバック */
  onSubmit: (data: SubGoalFormData) => Promise<void>;
  /** 下書き保存時のコールバック */
  onDraftSave?: (data: PartialSubGoalFormData) => Promise<void>;
  /** AI再生成時のコールバック */
  onRegenerate?: () => Promise<void>;
  /** 送信中フラグ */
  isSubmitting?: boolean;
  /** 下書き保存中フラグ */
  isDraftSaving?: boolean;
  /** AI再生成中フラグ */
  isRegenerating?: boolean;
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
}

/**
 * サブ目標入力フォームコンポーネント
 *
 * 機能:
 * - サブ目標編集フォーム
 * - リアルタイムバリデーション
 * - 下書き保存機能
 * - AI再生成機能
 * - 文字数カウント
 * - アクセシビリティ対応
 *
 * 要件: 要件1, 要件6
 */
export const SubGoalForm: React.FC<SubGoalFormProps> = ({
  subGoalId,
  initialData,
  onSubmit,
  onDraftSave,
  onRegenerate,
  isSubmitting = false,
  isDraftSaving = false,
  isRegenerating = false,
  enableAutoSave = true,
  autoSaveInterval = 30000,
  className = '',
  disabled = false,
  showErrorSummary = true,
  enableRealtimeValidation = true,
}) => {
  // レスポンシブレイアウト管理
  const { getResponsiveClasses } = useResponsiveLayout();

  // キーボードナビゲーション管理
  const { containerRef } = useKeyboardNavigation();

  // アナウンス機能
  const { announce, AnnouncementRegion } = useAnnouncement();

  // カスタムフック使用
  const { formState: customFormState, handleError } = useSubGoalForm({
    subGoalId,
    initialData,
    enableRealtimeValidation,
    enableAutoSave,
    autoSaveInterval,
  });

  // React Hook Formの初期化
  const {
    register,
    handleSubmit,
    watch,
    // setValue,
    getValues,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<SubGoalFormData>({
    resolver: zodResolver(subGoalFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
    },
    mode: 'onBlur',
  });

  // 内部状態
  const [lastSavedData, setLastSavedData] = useState<PartialSubGoalFormData | null>(null);
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
        currentData[key as keyof SubGoalFormData] !==
        lastSavedData[key as keyof PartialSubGoalFormData]
    );
    setHasUnsavedChanges(hasChanges);
  }, [formWatchedValues, lastSavedData, isDirty, getValues]);

  // フォーム送信ハンドラー
  const handleFormSubmit: SubmitHandler<SubGoalFormData> = async data => {
    try {
      await onSubmit(data);
      setLastSavedData(data);
      setHasUnsavedChanges(false);
      announce('サブ目標が正常に更新されました');
    } catch (error) {
      console.error('サブ目標更新エラー:', error);
      announce('サブ目標の更新中にエラーが発生しました', 'assertive');
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
      const validationResult = validatePartialSubGoalForm(currentData);

      if (validationResult.isValid) {
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
  }, [onDraftSave, getValues, announce, handleError]);

  // AI再生成ハンドラー
  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate) {
      return;
    }

    try {
      await onRegenerate();
      announce('サブ目標が再生成されました');
    } catch (error) {
      console.error('AI再生成エラー:', error);
      announce('AI再生成中にエラーが発生しました', 'assertive');
      handleError(error as Error);
    }
  }, [onRegenerate, announce, handleError]);

  // フィールドの文字数を取得
  const getFieldLength = (fieldName: keyof SubGoalFormData): number => {
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

  const getButtonClasses = (variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
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
      danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
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
        aria-label="サブ目標編集フォーム"
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

        {/* サブ目標タイトル */}
        <FormField
          label="サブ目標タイトル"
          required
          error={errors.title?.message}
          helpText="このサブ目標の名前を簡潔に入力してください"
        >
          <TextInput
            name="title"
            register={register}
            placeholder="例：基礎知識の習得"
            maxLength={FIELD_LIMITS.TITLE_MAX}
            disabled={disabled}
          />
        </FormField>

        {/* タイトル文字数カウンター */}
        <div className="mt-2">
          <CharacterCounter
            current={getFieldLength('title')}
            max={FIELD_LIMITS.TITLE_MAX}
            showWarning
          />
        </div>

        {/* サブ目標説明 */}
        <FormField
          label="サブ目標説明"
          required
          error={errors.description?.message}
          helpText="このサブ目標の詳細な内容について説明してください"
        >
          <TextArea
            name="description"
            register={register}
            placeholder="例：プログラミングの基礎概念、データ構造、アルゴリズムについて理解し、基本的なコードが書けるようになる"
            rows={4}
            maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
            disabled={disabled}
          />
        </FormField>

        {/* 説明文字数カウンター */}
        <div className="mt-2">
          <CharacterCounter
            current={getFieldLength('description')}
            max={FIELD_LIMITS.DESCRIPTION_MAX}
            showWarning
          />
        </div>

        {/* 背景 */}
        <FormField
          label="背景"
          required
          error={errors.background?.message}
          helpText="このサブ目標を設定した理由や現在の状況について説明してください"
        >
          <TextArea
            name="background"
            register={register}
            placeholder="例：プログラミング未経験だが、基礎をしっかり身につけることで後の学習がスムーズになると考えている"
            rows={3}
            maxLength={FIELD_LIMITS.BACKGROUND_MAX}
            disabled={disabled}
          />
        </FormField>

        {/* 背景文字数カウンター */}
        <div className="mt-2">
          <CharacterCounter
            current={getFieldLength('background')}
            max={FIELD_LIMITS.BACKGROUND_MAX}
            showWarning
          />
        </div>

        {/* 制約事項 */}
        <FormField
          label="制約事項"
          error={errors.constraints?.message}
          helpText="このサブ目標達成において制限となる要因があれば入力してください（任意）"
        >
          <TextArea
            name="constraints"
            register={register}
            placeholder="例：学習時間は平日夜と週末のみ。数学の知識が不足している"
            rows={3}
            maxLength={FIELD_LIMITS.CONSTRAINTS_MAX}
            disabled={disabled}
          />
        </FormField>

        {/* 制約事項文字数カウンター */}
        <div className="mt-2">
          <CharacterCounter
            current={getFieldLength('constraints')}
            max={FIELD_LIMITS.CONSTRAINTS_MAX}
            showWarning
          />
        </div>

        {/* フォームアクション */}
        <div className={getButtonContainerClasses()}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 下書き保存ボタン */}
            {onDraftSave && (
              <DraftSaveButton
                onClick={handleDraftSave}
                disabled={!hasUnsavedChanges || isDraftSaving || disabled}
                isLoading={isDraftSaving}
                className={getButtonClasses('secondary')}
              />
            )}

            {/* AI再生成ボタン */}
            {onRegenerate && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating || disabled}
                className={getButtonClasses('danger')}
              >
                {isRegenerating ? (
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
                    AI再生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    AI再生成
                  </>
                )}
              </button>
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
              'サブ目標を更新'
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

export default SubGoalForm;
