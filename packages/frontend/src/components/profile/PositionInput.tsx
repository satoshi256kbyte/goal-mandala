import React, { memo } from 'react';
import type { PositionInputProps } from '../../types/profile';
import { PLACEHOLDERS, MAX_LENGTH, ARIA_LABELS, TEST_IDS } from '../../constants/profile';

/**
 * 役職入力コンポーネント
 *
 * @description
 * テキスト入力形式で役職を入力するコンポーネント（任意項目）。
 * 文字数制限、バリデーションエラーの表示、アクセシビリティ対応を含む。
 *
 * @example
 * ```tsx
 * <PositionInput
 *   value={formData.position}
 *   onChange={(value) => setFieldValue('position', value)}
 *   onBlur={() => setFieldTouched('position', true)}
 *   error={errors.position}
 * />
 * ```
 */
export const PositionInput = memo<PositionInputProps>(
  ({
    value,
    onChange,
    onBlur,
    error,
    disabled = false,
    required = false,
    maxLength = MAX_LENGTH.POSITION,
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
    const errorId = error ? 'position-error' : undefined;

    // 文字数カウント表示
    const characterCount = `${value.length}/${maxLength}`;
    const isNearLimit = value.length > maxLength * 0.8;

    return (
      <div className="profile-form-field">
        <label htmlFor="position" className="profile-form-label">
          役職
          {required && <span className="profile-required-mark">*</span>}
          {!required && <span className="profile-optional-mark">(任意)</span>}
        </label>
        <input
          type="text"
          id="position"
          name="position"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={PLACEHOLDERS.POSITION}
          maxLength={maxLength}
          aria-label={ARIA_LABELS.POSITION_INPUT}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          data-testid={TEST_IDS.POSITION_INPUT}
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
              data-testid={`${TEST_IDS.POSITION_INPUT}-error`}
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

PositionInput.displayName = 'PositionInput';
