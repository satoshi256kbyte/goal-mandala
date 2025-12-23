import React, { memo } from 'react';
import type { CompanySizeSelectProps } from '../../types/profile';
import { COMPANY_SIZE_OPTIONS, ARIA_LABELS, TEST_IDS } from '../../constants/profile';

/**
 * 組織規模選択コンポーネント
 *
 * @description
 * ドロップダウン形式で組織規模を選択するコンポーネント。
 * バリデーションエラーの表示、アクセシビリティ対応を含む。
 *
 * @example
 * ```tsx
 * <CompanySizeSelect
 *   value={formData.companySize}
 *   onChange={(value) => setFieldValue('companySize', value)}
 *   onBlur={() => setFieldTouched('companySize', true)}
 *   error={errors.companySize}
 *   required
 * />
 * ```
 */
export const CompanySizeSelect = memo<CompanySizeSelectProps>(
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
    const errorId = error ? 'company-size-error' : undefined;

    return (
      <div className="profile-form-field">
        <label htmlFor="company-size" className="profile-form-label">
          組織規模
          {required && <span className="profile-required-mark">*</span>}
        </label>
        <select
          id="company-size"
          name="companySize"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-label={ARIA_LABELS.COMPANY_SIZE_SELECT}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          data-testid={TEST_IDS.COMPANY_SIZE_SELECT}
          className={selectClassName}
        >
          {COMPANY_SIZE_OPTIONS.map(option => (
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
            data-testid={`${TEST_IDS.COMPANY_SIZE_SELECT}-error`}
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

CompanySizeSelect.displayName = 'CompanySizeSelect';
