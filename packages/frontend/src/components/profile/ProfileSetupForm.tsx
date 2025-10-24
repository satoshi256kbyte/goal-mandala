import React, { useCallback, useMemo, memo } from 'react';
import { IndustrySelect } from './IndustrySelect';
import { CompanySizeSelect } from './CompanySizeSelect';
import { JobTitleInput } from './JobTitleInput';
import { PositionInput } from './PositionInput';
import { useProfileForm } from '../../hooks/useProfileForm';
import type { ProfileFormData } from '../../types/profile';

/**
 * ProfileSetupFormコンポーネントのプロパティ
 */
export interface ProfileSetupFormProps {
  /** フォーム送信成功時のコールバック */
  onSuccess?: () => void;
  /** フォーム送信エラー時のコールバック */
  onError?: (error: string) => void;
  /** 追加のCSSクラス名 */
  className?: string;
}

/**
 * プロフィール設定フォームコンポーネント
 *
 * @description
 * 初回ログイン時のプロフィール入力フォーム。
 * 所属組織情報（業種、組織規模）と本人情報（職種、役職）を入力する。
 *
 * @example
 * ```tsx
 * <ProfileSetupForm
 *   onSubmit={handleSubmit}
 *   isLoading={isSubmitting}
 *   error={errorMessage}
 * />
 * ```
 *
 * 要件: 11.2 - コンポーネントのメモ化
 */
export const ProfileSetupForm = memo<ProfileSetupFormProps>(
  ({ onSuccess, onError, className = '' }) => {
    // useProfileFormフックを使用してフォーム状態を管理
    const {
      formData,
      errors,
      touched,
      isSubmitting,
      error: formError,
      setFieldValue,
      setFieldTouched,
      handleSubmit: internalHandleSubmit,
    } = useProfileForm({
      onSuccess: () => {
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: Error) => {
        if (onError) {
          onError(error.message);
        }
      },
    });

    // ローディング状態
    const isLoading = isSubmitting;

    /**
     * フィールド値変更ハンドラー
     */
    const handleFieldChange = useCallback(
      (field: keyof ProfileFormData, value: string) => {
        setFieldValue(field, value);
      },
      [setFieldValue]
    );

    /**
     * フィールドフォーカス離脱ハンドラー
     */
    const handleFieldBlur = useCallback(
      (field: keyof ProfileFormData) => {
        setFieldTouched(field, true);
      },
      [setFieldTouched]
    );

    /**
     * フォーム送信ハンドラー
     * 要件: 10.4 - Enterキーでのフォーム送信（ネイティブフォーム動作）
     */
    const handleFormSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        internalHandleSubmit();
      },
      [internalHandleSubmit]
    );

    // フォームが有効かどうかを判定
    // 要件: 11.2 - 値のメモ化
    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);
    const isFormValid = useMemo(
      () => !hasErrors && formData.industry && formData.companySize && formData.jobTitle,
      [hasErrors, formData.industry, formData.companySize, formData.jobTitle]
    );

    return (
      <form
        onSubmit={handleFormSubmit}
        className={`max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}
        noValidate
        aria-label="プロフィール設定フォーム"
        aria-busy={isLoading}
        aria-describedby={formError ? 'form-error' : undefined}
      >
        {/* 所属組織情報セクション - 要件: 10.1 */}
        <section
          className="mb-8 p-6 bg-white rounded-lg shadow-sm"
          aria-labelledby="organization-section"
          aria-describedby="organization-description"
        >
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 id="organization-section" className="text-lg font-semibold text-gray-900">
              所属組織の情報
            </h2>
            <p id="organization-description" className="mt-1 text-sm text-gray-600">
              あなたが所属する組織について教えてください
            </p>
          </div>

          <div className="space-y-6">
            <IndustrySelect
              value={formData.industry}
              onChange={value => handleFieldChange('industry', value)}
              onBlur={() => handleFieldBlur('industry')}
              error={touched.industry ? errors.industry : undefined}
              disabled={isLoading}
              required
            />

            <CompanySizeSelect
              value={formData.companySize}
              onChange={value => handleFieldChange('companySize', value)}
              onBlur={() => handleFieldBlur('companySize')}
              error={touched.companySize ? errors.companySize : undefined}
              disabled={isLoading}
              required
            />
          </div>
        </section>

        {/* 本人情報セクション - 要件: 10.1 */}
        <section
          className="mb-8 p-6 bg-white rounded-lg shadow-sm"
          aria-labelledby="personal-section"
          aria-describedby="personal-description"
        >
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 id="personal-section" className="text-lg font-semibold text-gray-900">
              本人の情報
            </h2>
            <p id="personal-description" className="mt-1 text-sm text-gray-600">
              あなたの職種や役職について教えてください
            </p>
          </div>

          <div className="space-y-6">
            <JobTitleInput
              value={formData.jobTitle}
              onChange={value => handleFieldChange('jobTitle', value)}
              onBlur={() => handleFieldBlur('jobTitle')}
              error={touched.jobTitle ? errors.jobTitle : undefined}
              disabled={isLoading}
              required
            />

            <PositionInput
              value={formData.position}
              onChange={value => handleFieldChange('position', value)}
              onBlur={() => handleFieldBlur('position')}
              error={touched.position ? errors.position : undefined}
              disabled={isLoading}
            />
          </div>
        </section>

        {/* エラーメッセージ表示 */}
        {formError && (
          <div
            id="form-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md"
          >
            <p className="text-sm text-red-600">{formError}</p>
          </div>
        )}

        {/* 送信ボタン */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`
            w-full sm:w-auto min-w-[200px] py-3 px-6 text-sm font-medium rounded-md
            transition-colors duration-200 keyboard-focusable
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${
              isFormValid && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-100 cursor-not-allowed'
            }
          `}
            aria-busy={isLoading}
            aria-describedby={isLoading ? 'submit-loading' : undefined}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                保存中...
              </span>
            ) : (
              '次へ'
            )}
          </button>
        </div>

        {/* スクリーンリーダー用のローディング状態通知 */}
        {isLoading && (
          <div id="submit-loading" className="sr-only" aria-live="polite" aria-atomic="true">
            プロフィール情報を保存しています
          </div>
        )}
      </form>
    );
  }
);

ProfileSetupForm.displayName = 'ProfileSetupForm';
