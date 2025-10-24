import React, { memo } from 'react';
import type { JobTitleInputProps } from '../../types/profile';
import { PLACEHOLDERS, MAX_LENGTH, ARIA_LABELS, TEST_IDS } from '../../constants/profile';

/**
 * 職種入力コンポーネント
 *
 * @description
 * テキスト入力形式で職種を入力するコンポーネント。
 * 文字数制限、バリデーションエラーの表示、アクセシビリティ対応を含む。
 *
 * @example
 * ```tsx
 * <JobTitleInput
 *   value={formData.jobTitle}
 *   onChange={(value) => setFieldValue('jobTitle', value)}
 *   onBlur={() => setFieldTouched('jobTitle', true)}
 *   error={errors.jobTitle}
 *   required
 * />
 * ```
 */
export const JobTitleInput = memo<JobTitleInputProps>(
  ({
    value,
    onChange,
    onBlur,
    error,
    disabled = false,
    required = false,
    maxLength = MAX_LENGTH.JOB_TITLE,
  }) => {
    /**
     * 入力変更ハンドラー
     */
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      // 最大文字数を超えないようにする
      if (newValue.length <= maxLength) {
        onChange(newValue);
      }
    };

    /**
     * フォーカス離脱ハンドラー
     */
    const handleBlur = () => {
      onBlur();
    };

    // エラー状態のクラス名（レスポンシブ対応）
    // 要件: 10.5 - フォーカスインジケーターの表示
    const inputClassName = `
      profile-form-input keyboard-focusable
      ${error ? 'profile-form-input-error' : ''}
    `.trim();

    // エラーメッセージのID
    const errorId = error ? 'job-title-error' : undefined;

    // 文字数カウント表示
    const characterCount = `${value.length}/${maxLength}`;
    const isNearLimit = value.length > maxLength * 0.8;

    return (
      <div className="profile-form-field">
        <label htmlFor="job-title" className="profile-form-label">
          職種
          {required && <span className="profile-required-mark">*</span>}
        </label>
        <input
          type="text"
          id="job-title"
          name="jobTitle"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={PLACEHOLDERS.JOB_TITLE}
          maxLength={maxLength}
          aria-label={ARIA_LABELS.JOB_TITLE_INPUT}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          data-testid={TEST_IDS.JOB_TITLE_INPUT}
          className={inputClassName}
        />
        <div className="mt-1 flex justify-between items-center">
          {error ? (
            <div
              id={errorId}
              role="alert"
              aria-live="polite"
              aria-atomic="true"
              className="profile-form-error"
              data-testid={`${TEST_IDS.JOB_TITLE_INPUT}-error`}
            >
              {error}
            </div>
          ) : (
            <div />
          )}
          <div
            className={`profile-character-count ${isNearLimit ? 'profile-character-count-warning' : ''}`}
            aria-label={`文字数: ${characterCount}`}
          >
            {characterCount}
          </div>
        </div>
      </div>
    );
  }
);

JobTitleInput.displayName = 'JobTitleInput';
