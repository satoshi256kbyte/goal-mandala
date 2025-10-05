import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import './InlineEditor.css';

export interface InlineEditorProps {
  value: string;
  maxLength: number;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  multiline?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

const InlineEditorComponent: React.FC<InlineEditorProps> = ({
  value: initialValue,
  maxLength,
  onSave,
  onCancel,
  placeholder = '',
  multiline = false,
}) => {
  const [value, setValue] = useState(initialValue);
  const [originalValue, setOriginalValue] = useState(initialValue);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errorMessage: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // errorIdをuseMemoで生成（再レンダリング時に変わらないようにする）
  const errorId = useMemo(
    () => `inline-editor-error-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  // propsのvalueが変わったら内部stateを更新
  useEffect(() => {
    setValue(initialValue);
    setOriginalValue(initialValue);
  }, [initialValue]);

  // バリデーション関数
  const validate = useCallback(
    (inputValue: string): ValidationResult => {
      if (!inputValue || inputValue.trim().length === 0) {
        return {
          isValid: false,
          errorMessage: '入力は必須です',
        };
      }

      if (inputValue.length > maxLength) {
        return {
          isValid: false,
          errorMessage: `${maxLength}文字以内で入力してください`,
        };
      }

      return {
        isValid: true,
        errorMessage: null,
      };
    },
    [maxLength]
  );

  // デバウンスされたバリデーション（300ms）
  const debouncedValidate = useDebouncedCallback((inputValue: string) => {
    const result = validate(inputValue);
    setValidation(result);
  }, 300);

  // リアルタイムバリデーション（デバウンス付き）
  useEffect(() => {
    debouncedValidate(value);
  }, [value, debouncedValidate]);

  // 初期フォーカス
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // テキストを全選択
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      } else if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
      }
    }
  }, []);

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!validation.isValid || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(value);
    } catch (error) {
      // 保存失敗時は元の値に戻す
      setValue(originalValue);
      setSaveError(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [value, validation.isValid, isSaving, onSave, originalValue]);

  // キャンセル処理
  const handleCancel = useCallback(() => {
    setValue(originalValue);
    onCancel();
  }, [originalValue, onCancel]);

  // キーボードイベントハンドラ
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }

      if (multiline) {
        // multilineの場合、Ctrl+Enterで保存
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSave();
        }
      } else {
        // 通常の場合、Enterで保存
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        }
      }
    },
    [multiline, handleSave, handleCancel]
  );

  // 外側クリックで保存
  const handleBlur = useCallback(() => {
    // バリデーションが通っている場合のみ保存
    if (validation.isValid && !isSaving) {
      handleSave();
    }
  }, [validation.isValid, isSaving, handleSave]);

  // 入力変更ハンドラ
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(e.target.value);
    },
    []
  );

  // commonPropsをuseMemoでメモ化
  const commonProps = useMemo(
    () => ({
      ref: inputRef,
      value,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      placeholder,
      maxLength: maxLength + 1, // バリデーションで制御するため、+1しておく
      disabled: isSaving,
      'aria-label': '編集中',
      'aria-invalid': !validation.isValid,
      'aria-describedby': validation.errorMessage ? errorId : undefined,
      className: `inline-editor-input ${!validation.isValid ? 'inline-editor-input--error' : ''} ${
        isSaving ? 'inline-editor-input--saving' : ''
      }`,
    }),
    [
      value,
      handleChange,
      handleKeyDown,
      handleBlur,
      placeholder,
      maxLength,
      isSaving,
      validation.isValid,
      validation.errorMessage,
      errorId,
    ]
  );

  return (
    <div className="inline-editor">
      {multiline ? (
        <textarea
          {...commonProps}
          rows={3}
          className={`${commonProps.className} inline-editor-textarea`}
        />
      ) : (
        <input {...commonProps} type="text" />
      )}

      {validation.errorMessage && (
        <div id={errorId} role="alert" className="inline-editor-error" aria-live="polite">
          {validation.errorMessage}
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="inline-editor-error inline-editor-error--save"
          aria-live="assertive"
        >
          {saveError}
        </div>
      )}

      {isSaving && (
        <div className="inline-editor-saving" aria-live="polite">
          保存中...
        </div>
      )}
    </div>
  );
};

// React.memoでコンポーネント全体をメモ化
// 注: valueが変わった場合は再レンダリングが必要なので、valueの比較は逆にする
export const InlineEditor = memo(InlineEditorComponent, (prevProps, nextProps) => {
  // propsが変わっていない場合は再レンダリングをスキップ（trueを返す）
  // propsが変わった場合は再レンダリングする（falseを返す）
  return (
    prevProps.value === nextProps.value &&
    prevProps.maxLength === nextProps.maxLength &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onCancel === nextProps.onCancel &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.multiline === nextProps.multiline
  );
});
