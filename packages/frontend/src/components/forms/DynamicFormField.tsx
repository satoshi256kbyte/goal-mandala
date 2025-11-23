import React, { useMemo } from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';
import { FormField } from './FormField';
import { CharacterCounter } from './CharacterCounter';
import { CharacterLimitWarning } from './CharacterLimitWarning';
import { useCharacterCounter } from '../../hooks/useCharacterCounter';
import { useResponsive } from '../../hooks/useResponsive';
import { useLiveRegion } from '../../hooks/useAccessibility';
import { useStableCallback } from '../../utils/performance';
import {
  getFormFieldAria,
  generateScreenReaderText,
  SR_ONLY_CLASS,
} from '../../utils/screen-reader';

/**
 * バリデーションルールの型定義
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: string | number | RegExp;
  message: string;
  validator?: (value: unknown) => boolean;
}

/**
 * フォームフィールド設定の型定義
 */
export interface FormFieldConfig {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  maxLength?: number;
  minLength?: number;
  rows?: number; // textareaの場合
  options?: Array<{ value: string; label: string }>; // select/radioの場合
  validation?: ValidationRule[];
  helpText?: string;
  showCounter?: boolean;
  showWarning?: boolean;
  warningThreshold?: number;
}

/**
 * DynamicFormFieldのプロパティ
 */
export interface DynamicFormFieldProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  register: UseFormRegister<any>;
  watch?: UseFormWatch<any>;
  validationState?: ValidationState;
  className?: string;
  /** フィールドフォーカス時のコールバック */
  onFocus?: () => void;
  /** 文字数変更時のコールバック */
  onLengthChange?: (length: number, value: string) => void;
  /** 制限到達時のコールバック */
  onLimitReached?: (value: string) => void;
}

/**
 * 動的フォームフィールドコンポーネント
 *
 * 要件3の受入基準に対応:
 * - フォームフィールドにフォーカス時のハイライト表示
 * - 必須フィールドを空にした場合のリアルタイムエラーメッセージ表示
 * - 文字数制限を超過した場合の警告メッセージと残り文字数表示
 * - タブキーでの次フィールドへのフォーカス移動
 * - Enterキーでの保存処理実行
 *
 * パフォーマンス最適化:
 * - React.memo による不要な再レンダリング防止
 * - useStableCallback/useMemo による安定した参照
 * - useDeepMemo による深い比較でのメモ化
 */
const DynamicFormFieldComponent: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  autoFocus = false,
  register,
  watch: _watch,
  validationState,
  className = '',
  onFocus,
  onLengthChange,
  onLimitReached,
}) => {
  const fieldId = React.useId();
  const labelId = `${fieldId}-label`;
  const helpTextId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const counterId = `${fieldId}-counter`;
  const statusId = `${fieldId}-status`;

  const [isFocused, setIsFocused] = React.useState(false);
  const { isMobile, isTablet, isTouch } = useResponsive();
  const { announce } = useLiveRegion();

  // 文字数カウンター機能
  const { currentLength, updateLength, isWarning } = useCharacterCounter({
    maxLength: field.maxLength,
    initialValue: String(value || ''),
    onChange: onLengthChange,
    onLimitReached,
    warningThreshold: field.warningThreshold || 80,
  });

  // バリデーション実行（最適化版）
  const validateField = useStableCallback((inputValue: unknown): string | undefined => {
    if (!field.validation) return undefined;

    for (const rule of field.validation) {
      switch (rule.type) {
        case 'required':
          if (!inputValue || (typeof inputValue === 'string' && inputValue.trim() === '')) {
            return rule.message;
          }
          break;

        case 'minLength':
          if (
            typeof inputValue === 'string' &&
            typeof rule.value === 'number' &&
            inputValue.length < rule.value
          ) {
            return rule.message;
          }
          break;

        case 'maxLength':
          if (
            typeof inputValue === 'string' &&
            typeof rule.value === 'number' &&
            inputValue.length > rule.value
          ) {
            return rule.message;
          }
          break;

        case 'pattern':
          if (
            typeof inputValue === 'string' &&
            (typeof rule.value === 'string' || rule.value instanceof RegExp)
          ) {
            const regex = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value);
            if (!regex.test(inputValue)) {
              return rule.message;
            }
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(inputValue)) {
            return rule.message;
          }
          break;
      }
    }

    return undefined;
  });

  // リアルタイムバリデーション（最適化版）
  const realtimeError = useMemo(() => {
    if (!value) return undefined;
    return validateField(value);
  }, [value, validateField]);

  // 表示するエラーメッセージ（最適化版）
  const displayError = useMemo(() => error || realtimeError, [error, realtimeError]);

  // フォーカスイベントハンドラー（最適化版）
  const handleFocus = useStableCallback(() => {
    setIsFocused(true);
    onFocus?.();
  });

  const handleBlur = useStableCallback(() => {
    setIsFocused(false);
    onBlur?.();
  });

  // 入力変更ハンドラー（最適化版）
  const handleChange = useStableCallback((newValue: unknown) => {
    // 文字数制限チェック
    if (field.maxLength && typeof newValue === 'string' && newValue.length > field.maxLength) {
      const truncatedValue = newValue.slice(0, field.maxLength);
      onChange(truncatedValue);
      updateLength(truncatedValue);

      // 文字数制限に達したことをスクリーンリーダーに通知
      announce(`文字数制限に達しました。最大${field.maxLength}文字です。`, 'assertive');
    } else {
      onChange(newValue);
      updateLength(String(newValue));

      // 文字数の変化をスクリーンリーダーに通知（警告レベルの場合のみ）
      if (field.maxLength && typeof newValue === 'string' && isWarning) {
        const remaining = field.maxLength - newValue.length;
        if (remaining <= 10 && remaining > 0) {
          announce(`残り${remaining}文字です`, 'polite');
        }
      }
    }
  });

  // キーボードイベントハンドラー（最適化版）
  const handleKeyDown = useStableCallback((event: React.KeyboardEvent) => {
    // Enterキーで保存処理（textareaの場合は除く）
    if (event.key === 'Enter' && field.type !== 'textarea') {
      event.preventDefault();
      // 親コンポーネントに保存イベントを通知
      const saveEvent = new CustomEvent('dynamicFormSave', {
        detail: { fieldName: field.name, value },
      });
      document.dispatchEvent(saveEvent);
    }

    // Tabキーでフォーカス移動（デフォルト動作を維持）
    if (event.key === 'Tab') {
      // デフォルトのTab動作を維持
    }
  });

  // ARIA属性を生成（最適化版）
  const ariaAttributes = useMemo(() => {
    const describedBy = [];

    if (field.helpText) {
      describedBy.push(helpTextId);
    }

    if (displayError) {
      describedBy.push(errorId);
    }

    if (field.showCounter && field.maxLength) {
      describedBy.push(counterId);
    }

    describedBy.push(statusId);

    return getFormFieldAria({
      id: fieldId,
      labelId,
      describedBy,
      isRequired: field.required,
      isInvalid: !!displayError,
      isDisabled: disabled,
    });
  }, [
    fieldId,
    labelId,
    helpTextId,
    errorId,
    counterId,
    statusId,
    field.helpText,
    field.required,
    field.showCounter,
    field.maxLength,
    displayError,
    disabled,
  ]);

  // スクリーンリーダー用のステータステキスト（最適化版）
  const screenReaderStatus = useMemo(() => {
    return generateScreenReaderText.fieldStatus({
      fieldName: field.label,
      isRequired: field.required,
      isInvalid: !!displayError,
      errorMessage: displayError,
      helpText: field.helpText,
    });
  }, [field.label, field.required, field.helpText, displayError]);

  // レスポンシブ対応のスタイルクラス
  const getResponsiveClasses = () => {
    const baseClasses = `
      transition-all duration-200
      ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-50 border-blue-500' : ''}
      ${displayError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      ${isWarning ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' : ''}
    `;

    if (isMobile) {
      return `${baseClasses} text-base px-4 py-3 min-h-touch rounded-lg`;
    } else if (isTablet) {
      return `${baseClasses} text-base px-4 py-3 min-h-[48px] rounded-md`;
    } else {
      return `${baseClasses} text-sm px-3 py-2 min-h-[40px] rounded-md`;
    }
  };

  // フィールドタイプに応じた入力コンポーネントを生成
  const renderInputComponent = () => {
    const commonProps = {
      name: field.name,
      placeholder: field.placeholder,
      disabled,
      autoFocus,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className: getResponsiveClasses(),
      ...ariaAttributes,
    };

    switch (field.type) {
      case 'text':
        return (
          <div className="relative">
            <TextInput
              {...commonProps}
              register={register}
              error={
                displayError
                  ? ({ type: 'validation', message: displayError } as FieldError)
                  : undefined
              }
              maxLength={field.maxLength}
              showCounter={field.showCounter}
              showWarning={field.showWarning}
              warningThreshold={field.warningThreshold}
              onLengthChange={onLengthChange}
              onLimitReached={onLimitReached}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="relative">
            <TextArea
              {...commonProps}
              register={register}
              error={
                displayError
                  ? ({ type: 'validation', message: displayError } as FieldError)
                  : undefined
              }
              rows={field.rows || 4}
              maxLength={field.maxLength}
              showCounter={field.showCounter}
              showWarning={field.showWarning}
              warningThreshold={field.warningThreshold}
              onLengthChange={onLengthChange}
              onLimitReached={onLimitReached}
            />
          </div>
        );

      case 'select':
        return (
          <select
            {...register(field.name, {
              onChange: e => handleChange(e.target.value),
            })}
            {...commonProps}
            className={`
              block w-full border shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${isTouch ? 'touch-target' : ''}
              ${commonProps.className}
            `}
            aria-label={field.label}
          >
            <option value="">{field.placeholder || '選択してください'}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <fieldset
            className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}
            aria-labelledby={labelId}
            aria-describedby={ariaAttributes['aria-describedby']}
          >
            <legend className={SR_ONLY_CLASS}>{field.label}</legend>
            {field.options?.map((option, index) => (
              <label
                key={option.value}
                className={`
                  flex items-center cursor-pointer
                  ${isMobile ? 'space-x-3 py-2 touch-target' : 'space-x-2'}
                  ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'}
                  rounded-md px-2 transition-colors
                `}
              >
                <input
                  type="radio"
                  {...register(field.name, {
                    onChange: e => handleChange(e.target.value),
                  })}
                  value={option.value}
                  disabled={disabled}
                  className={`
                    text-blue-600 border-gray-300 focus:ring-blue-500
                    ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}
                  `}
                  aria-describedby={`${fieldId}-option-${index}-desc`}
                />
                <span
                  className={`
                    text-gray-700
                    ${isMobile ? 'text-base' : 'text-sm'}
                  `}
                  id={`${fieldId}-option-${index}-desc`}
                >
                  {option.label}
                </span>
              </label>
            ))}
          </fieldset>
        );

      default:
        return (
          <div className="text-red-500 text-sm p-2 border border-red-300 rounded">
            サポートされていないフィールドタイプ: {field.type}
          </div>
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <FormField
        label={field.label}
        required={field.required}
        error={displayError}
        helpText={field.helpText}
        fieldName={field.name}
        validationState={validationState}
        onFocus={handleFocus}
        onBlur={handleBlur}
        labelId={labelId}
        helpTextId={helpTextId}
        errorId={errorId}
      >
        {renderInputComponent()}
      </FormField>

      {/* スクリーンリーダー用のステータス情報 */}
      <div id={statusId} className={SR_ONLY_CLASS} aria-live="polite" aria-atomic="true">
        {screenReaderStatus}
      </div>

      {/* 文字数カウンター（text/textareaの場合） */}
      {(field.type === 'text' || field.type === 'textarea') &&
        field.showCounter &&
        field.maxLength && (
          <div className="flex justify-end">
            <CharacterCounter
              currentLength={currentLength}
              maxLength={field.maxLength}
              position="bottom-right"
              warningThreshold={field.warningThreshold || 80}
              id={counterId}
              aria-live="polite"
            />
          </div>
        )}

      {/* 警告メッセージ（text/textareaの場合） */}
      {(field.type === 'text' || field.type === 'textarea') &&
        field.showWarning &&
        field.maxLength && (
          <CharacterLimitWarning
            currentLength={currentLength}
            maxLength={field.maxLength}
            warningThreshold={field.warningThreshold || 80}
            aria-live="assertive"
          />
        )}

      {/* バリデーション状態のライブリージョン */}
      {displayError && (
        <div
          id={errorId}
          className="text-red-600 text-sm mt-1"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {displayError}
        </div>
      )}
    </div>
  );
};

/**
 * バリデーションルールのプリセット
 */
export const ValidationRules = {
  required: (message = 'この項目は必須です'): ValidationRule => ({
    type: 'required',
    message,
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    type: 'minLength',
    value: length,
    message: message || `${length}文字以上で入力してください`,
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    type: 'maxLength',
    value: length,
    message: message || `${length}文字以内で入力してください`,
  }),

  pattern: (pattern: RegExp, message: string): ValidationRule => ({
    type: 'pattern',
    value: pattern,
    message,
  }),

  custom: (validator: (value: unknown) => boolean, message: string): ValidationRule => ({
    type: 'custom',
    validator,
    message,
  }),
};

/**
 * フィールド設定のプリセット
 */
export const FieldPresets = {
  title: (required = true): FormFieldConfig => ({
    name: 'title',
    type: 'text',
    label: 'タイトル',
    placeholder: 'タイトルを入力してください',
    required,
    maxLength: 100,
    showCounter: true,
    showWarning: true,
    validation: [...(required ? [ValidationRules.required()] : []), ValidationRules.maxLength(100)],
  }),

  description: (required = true): FormFieldConfig => ({
    name: 'description',
    type: 'textarea',
    label: '説明',
    placeholder: '説明を入力してください',
    required,
    maxLength: 500,
    rows: 4,
    showCounter: true,
    showWarning: true,
    validation: [
      ...(required ? [ValidationRules.required()] : []),
      ValidationRules.minLength(10, '説明は10文字以上で入力してください'),
      ValidationRules.maxLength(500),
    ],
  }),

  background: (required = true): FormFieldConfig => ({
    name: 'background',
    type: 'textarea',
    label: '背景・理由',
    placeholder: '背景や理由を入力してください',
    required,
    maxLength: 500,
    rows: 4,
    showCounter: true,
    showWarning: true,
    validation: [
      ...(required ? [ValidationRules.required()] : []),
      ValidationRules.minLength(10, '背景は10文字以上で入力してください'),
      ValidationRules.maxLength(500),
    ],
  }),

  constraints: (required = false): FormFieldConfig => ({
    name: 'constraints',
    type: 'textarea',
    label: '制約事項',
    placeholder: '制約事項があれば入力してください（任意）',
    required,
    maxLength: 300,
    rows: 3,
    showCounter: true,
    showWarning: true,
    validation: [...(required ? [ValidationRules.required()] : []), ValidationRules.maxLength(300)],
  }),

  actionType: (): FormFieldConfig => ({
    name: 'type',
    type: 'radio',
    label: 'アクション種別',
    required: true,
    options: [
      { value: 'execution', label: '実行アクション（一度実施すれば完了）' },
      { value: 'habit', label: '習慣アクション（継続的に実施が必要）' },
    ],
    validation: [ValidationRules.required('アクション種別を選択してください')],
  }),
};

/**
 * メモ化されたDynamicFormFieldコンポーネント
 *
 * プロパティの変更がない限り再レンダリングを防ぐ
 */
export const DynamicFormField = React.memo(DynamicFormFieldComponent, (prevProps, nextProps) => {
  // カスタム比較関数でパフォーマンスを最適化
  return (
    prevProps.field === nextProps.field &&
    prevProps.value === nextProps.value &&
    prevProps.error === nextProps.error &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.autoFocus === nextProps.autoFocus &&
    prevProps.validationState === nextProps.validationState &&
    prevProps.className === nextProps.className
  );
});
