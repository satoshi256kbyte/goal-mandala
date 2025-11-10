import React, { useCallback, useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  goalFormSchema,
  partialGoalFormSchema,
  GoalFormData,
  PartialGoalFormData,
  FIELD_LIMITS,
  dateUtils,
} from '../../schemas/goal-form';
import { FormField, TextInput, TextArea, DatePicker, ErrorDisplay } from './index';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { /* useFocusManagement, */ useAnnouncement } from '../../hooks/useFocusManagement';

/**
 * GoalInputFormのプロパティ
 */
export interface GoalInputFormProps {
  /** 初期データ（編集時や下書き復元時） */
  initialData?: Partial<GoalFormData>;
  /** フォーム送信時のコールバック */
  onSubmit: (data: GoalFormData) => Promise<void>;
  /** 下書き保存時のコールバック */
  onDraftSave?: (data: PartialGoalFormData) => Promise<void>;
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
}

/**
 * 目標入力フォームコンポーネント
 */
export const GoalInputForm: React.FC<GoalInputFormProps> = ({
  initialData,
  onSubmit,
  onDraftSave,
  isSubmitting = false,
  isDraftSaving = false,
  enableAutoSave = true,
  autoSaveInterval = 30000, // 30秒
  className = '',
  disabled = false,
  showErrorSummary = true,
}) => {
  // レスポンシブレイアウト管理
  const { getResponsiveClasses } = useResponsiveLayout();

  // キーボードナビゲーション管理
  const { containerRef } = useKeyboardNavigation();

  // フォーカス管理（将来使用予定）
  // const { focusFirstError } = useFocusManagement();

  // アナウンス機能
  const { announce, AnnouncementRegion } = useAnnouncement();
  // フォーム状態管理
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      deadline: initialData?.deadline || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
    },
    mode: 'onBlur', // ブラー時にバリデーション
  });

  // 内部状態
  const [lastSavedData, setLastSavedData] = useState<PartialGoalFormData | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // フォームの値を監視
  const watchedValues = watch();

  // 初期データが変更された場合にフォームをリセット
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        deadline: initialData.deadline || '',
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
        currentData[key as keyof GoalFormData] !== lastSavedData[key as keyof PartialGoalFormData]
    );
    setHasUnsavedChanges(hasChanges);
  }, [watchedValues, lastSavedData, isDirty, getValues]);

  // 自動保存の実装
  const performAutoSave = useCallback(async () => {
    if (!onDraftSave || !hasUnsavedChanges || isDraftSaving) {
      return;
    }

    try {
      const currentData = getValues();
      const validationResult = partialGoalFormSchema.safeParse(currentData);

      if (validationResult.success) {
        await onDraftSave(validationResult.data);
        setLastSavedData(validationResult.data);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.warn('自動保存に失敗しました:', error);
    }
  }, [onDraftSave, hasUnsavedChanges, isDraftSaving, getValues]);

  // 自動保存タイマーの設定
  useEffect(() => {
    if (!enableAutoSave || !onDraftSave) {
      return;
    }

    // 既存のタイマーをクリア
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // 変更がある場合のみ新しいタイマーを設定
    if (hasUnsavedChanges) {
      const timer = setTimeout(performAutoSave, autoSaveInterval);
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [
    hasUnsavedChanges,
    enableAutoSave,
    onDraftSave,
    autoSaveInterval,
    performAutoSave,
    autoSaveTimer,
  ]);

  // フォーム送信ハンドラー
  const handleFormSubmit: SubmitHandler<GoalFormData> = async data => {
    try {
      await onSubmit(data);
      setLastSavedData(data);
      setHasUnsavedChanges(false);
      announce('フォームが正常に送信されました');
    } catch (error) {
      console.error('フォーム送信エラー:', error);
      announce('フォームの送信中にエラーが発生しました', 'assertive');
      // エラーハンドリングは親コンポーネントで行う
    }
  };

  // フォームエラー時の処理（現在は未使用）
  // const _handleFormError = useCallback(() => {
  //   const hasErrors = Object.keys(errors).length > 0;
  //   if (hasErrors) {
  //     // 最初のエラー要素にフォーカス
  //     setTimeout(() => {
  //       const focused = focusFirstError();
  //       if (focused) {
  //         announce('入力内容にエラーがあります。修正してください。', 'assertive');
  //       }
  //     }, 100);
  //   }
  // }, [errors, focusFirstError, announce]);

  // 手動下書き保存ハンドラー
  const handleDraftSave = async () => {
    if (!onDraftSave) {
      return;
    }

    try {
      const currentData = getValues();
      const validationResult = partialGoalFormSchema.safeParse(currentData);

      if (validationResult.success) {
        await onDraftSave(validationResult.data);
        setLastSavedData(validationResult.data);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('下書き保存エラー:', error);
    }
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

  const getDraftButtonClasses = () => {
    return getResponsiveClasses({
      base: `
        px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
      `,
      mobile: '',
      tablet: 'md:flex-1 md:max-w-[200px]',
      desktop: 'lg:w-auto lg:min-w-[120px] lg:flex-none',
    });
  };

  const getSubmitButtonClasses = () => {
    return getResponsiveClasses({
      base: `
        flex-1 px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md
        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
      `,
      mobile: '',
      tablet: 'md:flex-1 md:max-w-[200px]',
      desktop: 'lg:w-auto lg:min-w-[160px] lg:flex-none',
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
        aria-label="目標入力フォーム"
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

        {/* 目標タイトル */}
        <FormField
          label="目標タイトル"
          required
          error={errors.title?.message}
          helpText="達成したい目標を簡潔に入力してください"
        >
          <TextInput
            name="title"
            register={register}
            placeholder="例：プログラミングスキルを向上させる"
            maxLength={FIELD_LIMITS.TITLE_MAX}
            disabled={disabled}
            showCounter
          />
        </FormField>

        {/* 目標説明 */}
        <FormField
          label="目標説明"
          required
          error={errors.description?.message}
          helpText="目標の詳細な内容や具体的な成果物について説明してください"
        >
          <TextArea
            name="description"
            register={register}
            placeholder="例：Webアプリケーション開発に必要なフロントエンド技術（React、TypeScript）とバックエンド技術（Node.js、データベース）を習得し、個人プロジェクトを完成させる"
            rows={4}
            maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
            disabled={disabled}
            showCounter
          />
        </FormField>

        {/* 達成期限 */}
        <FormField
          label="達成期限"
          required
          error={errors.deadline?.message}
          helpText="目標を達成したい日付を選択してください（今日から1年以内）"
        >
          <DatePicker
            name="deadline"
            register={register}
            minDate={new Date(dateUtils.getMinDate())}
            maxDate={new Date(dateUtils.getMaxDate())}
            disabled={disabled}
            setValue={setValue}
          />
        </FormField>

        {/* 背景 */}
        <FormField
          label="背景"
          required
          error={errors.background?.message}
          helpText="この目標を設定した理由や現在の状況について説明してください"
        >
          <TextArea
            name="background"
            register={register}
            placeholder="例：現在の職場でWebアプリケーション開発の需要が高まっており、キャリアアップのために技術力を向上させたい。基本的なHTML/CSSは理解しているが、モダンな開発手法については学習が必要"
            rows={3}
            maxLength={FIELD_LIMITS.BACKGROUND_MAX}
            disabled={disabled}
            showCounter
          />
        </FormField>

        {/* 制約事項 */}
        <FormField
          label="制約事項"
          error={errors.constraints?.message}
          helpText="目標達成において制限となる要因があれば入力してください（任意）"
        >
          <TextArea
            name="constraints"
            register={register}
            placeholder="例：平日は仕事があるため学習時間は限られる。予算の制約により有料の学習サービスは月1万円まで"
            rows={3}
            maxLength={FIELD_LIMITS.CONSTRAINTS_MAX}
            disabled={disabled}
            showCounter
          />
        </FormField>

        {/* フォームアクション */}
        <div className={getButtonContainerClasses()}>
          {/* 下書き保存ボタン */}
          {onDraftSave && (
            <button
              type="button"
              onClick={handleDraftSave}
              disabled={!hasUnsavedChanges || isDraftSaving || disabled}
              className={getDraftButtonClasses()}
            >
              {isDraftSaving ? (
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
                  保存中...
                </>
              ) : (
                '下書き保存'
              )}
            </button>
          )}

          {/* 送信ボタン */}
          <button type="submit" disabled={isSubmitDisabled} className={getSubmitButtonClasses()}>
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
                AI生成開始中...
              </>
            ) : (
              'AI生成開始'
            )}
          </button>
        </div>

        {/* 自動保存状態表示 */}
        {enableAutoSave && onDraftSave && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            {isDraftSaving ? (
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
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.53 10.53a.75.75 0 00-1.06 1.061l2.03 2.03a.75.75 0 001.137-.089l3.857-5.401z"
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
