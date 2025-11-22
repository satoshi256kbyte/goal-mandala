import React, { memo } from 'react';
import type { IndustrySelectProps } from '../../types/profile';
import { INDUSTRY_OPTIONS, ARIA_LABELS } from '../../constants/profile';

/**
 * 業種選択コンポーネント
 *
 * @description
 * ドロップダウン形式で業種を選択するコンポーネント。
 * バリデーションエラーの表示、アクセシビリティ対応を含む。
 *
 * @example
 * ```tsx
 * <IndustrySelect
 *   value={formData.industry}
 *   onChange={(value) => setFieldValue('industry', value)}
 *   onBlur={() => setFieldTouched('industry', true)}
 *   error={errors.industry}
 *   required
 * />
 * ```
 */
export const IndustrySelect = memo<IndustrySelectProps>(
  ({ value, onChange, onBlur, error, disabled = false, required = false }) => {
    /**
     * 選択変更ハンドラー
     */
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value);
    };

    /**
     * フォーカス離脱ハンドラー
     */
    const handleBlur = () => {
      onBlur();
    };

    // エラー状態のクラス名（レスポンシブ対応）
    // 要件: 10.5 - フォーカスインジケーターの表示
    const selectClassName = `
      profile-form-select keyboard-focusable
      ${error ? 'profile-form-select-error' : ''}
    `.trim();

    // エラーメッセージのID
    const errorId = error ? 'industry-error' : undefined;

    return (
      <div className="profile-form-field">
        <label htmlFor="industry" className="profile-form-label">
          業種
          {required && <span className="profile-required-mark">*</span>}
        </label>
        <select
          id="industry"
          name="industry"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-label={ARIA_LABELS.INDUSTRY_SELECT}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          data-testid={TEST_IDS.INDUSTRY_SELECT}
          className={selectClassName}
        >
          {INDUSTRY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            className="profile-form-error"
            data-testid={`${TEST_IDS.INDUSTRY_SELECT}-error`}
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

IndustrySelect.displayName = 'IndustrySelect';
