import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { DynamicFormField, FormFieldConfig, FieldPresets } from './DynamicFormField';
import { LoadingButton } from '../common/LoadingButton';
import { ErrorMessage } from '../common/ErrorMessage';
import { useLiveRegion, useFocusTrap } from '../../hooks/useAccessibility';
import { getDialogAria, SR_ONLY_CLASS } from '../../utils/screen-reader';

/**
 * 一括編集の変更内容
 */
export interface BulkEditChanges {
  /** 共通フィールドの変更 */
  commonFields: Record<string, unknown>;
  /** 個別項目の変更 */
  individualChanges: Record<string, Record<string, unknown>>;
  /** 削除対象のアイテムID */
  deleteItems: string[];
  /** 更新対象のアイテム（後方互換性のため） */
  updates?: Array<{ id: string; changes: Record<string, unknown> }>;
}

/**
 * 一括編集可能なアイテム
 */
export interface BulkEditableItem {
  id: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type?: 'execution' | 'habit'; // アクションの場合
  position: number;
}

/**
 * BulkEditModalのプロパティ
 */
export interface BulkEditModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** 選択されたアイテム */
  selectedItems: BulkEditableItem[];
  /** モーダルを閉じる */
  onClose: () => void;
  /** 変更を保存する */
  onSave: (changes: BulkEditChanges) => void;
  /** アイテムのタイプ（サブ目標またはアクション） */
  itemType: 'subgoal' | 'action';
  /** 読み込み状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string;
}

/**
 * 編集モード
 */
type EditMode = 'common' | 'individual';

/**
 * 一括編集モーダルコンポーネント
 *
 * 要件5の受入基準に対応:
 * - 複数項目選択時の選択状態の視覚的表示
 * - 一括編集ボタンクリック時の一括編集モード切り替え
 * - 一括編集での共通項目変更の全項目への適用
 * - 一括削除実行時の確認ダイアログ表示
 * - 一括操作確定時の変更のデータベース保存
 */
export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  selectedItems,
  onClose,
  onSave,
  itemType,
  isLoading = false,
  error,
}) => {
  const [editMode, setEditMode] = useState<EditMode>('common');
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<BulkEditChanges | null>(null);

  // アクセシビリティ
  const { announce } = useLiveRegion();
  const modalRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef);

  const titleId = React.useId();
  const descriptionId = React.useId();

  // フォーム管理
  const methods = useForm({
    defaultValues: {
      commonFields: {},
      individualChanges: {},
    },
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { isDirty },
  } = methods;

  // モーダルが開かれた時にフォームをリセット
  useEffect(() => {
    if (isOpen) {
      reset({
        commonFields: {},
        individualChanges: {},
      });
      setEditMode('common');
      setDeleteConfirmation(false);
      setPreviewChanges(null);

      // モーダルが開いたことをスクリーンリーダーに通知
      announce(
        `${itemType === 'subgoal' ? 'サブ目標' : 'アクション'}の一括編集モーダルが開きました。${selectedItems.length}個の項目が選択されています。`,
        'polite'
      );
    }
  }, [isOpen, reset, itemType, selectedItems.length, announce]);

  // フィールド設定を取得
  const fieldConfigs = useMemo((): FormFieldConfig[] => {
    const baseFields = [
      FieldPresets.title(false),
      FieldPresets.description(false),
      FieldPresets.background(false),
      FieldPresets.constraints(false),
    ];

    // アクションの場合はタイプフィールドを追加
    if (itemType === 'action') {
      baseFields.push(FieldPresets.actionType());
    }

    return baseFields;
  }, [itemType]);

  // 共通値を計算
  const commonValues = useMemo(() => {
    if (selectedItems.length === 0) return {};

    const result: Record<string, any> = {};

    fieldConfigs.forEach(field => {
      const values = selectedItems.map(item => (item as any)[field.name]);
      const uniqueValues = [...new Set(values.filter(v => v !== undefined && v !== ''))];

      // 全て同じ値の場合は共通値として設定
      if (uniqueValues.length === 1) {
        result[field.name] = uniqueValues[0];
      }
    });

    return result;
  }, [selectedItems, fieldConfigs]);

  // 変更プレビューを生成
  const generatePreview = useCallback(
    (formData: Record<string, unknown>): BulkEditChanges => {
      const changes: BulkEditChanges = {
        commonFields: {},
        individualChanges: {},
        deleteItems: [],
      };

      // 共通フィールドの変更
      if (editMode === 'common') {
        Object.entries(formData.commonFields || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== commonValues[key]) {
            changes.commonFields[key] = value;
          }
        });
      }

      // 個別変更
      if (editMode === 'individual') {
        Object.entries(formData.individualChanges || {}).forEach(([itemId, itemChanges]) => {
          const filteredChanges: Record<string, any> = {};
          Object.entries(itemChanges as Record<string, any>).forEach(([key, value]) => {
            const originalItem = selectedItems.find(item => item.id === itemId);
            if (value !== undefined && value !== '' && value !== (originalItem as any)?.[key]) {
              filteredChanges[key] = value;
            }
          });

          if (Object.keys(filteredChanges).length > 0) {
            changes.individualChanges[itemId] = filteredChanges;
          }
        });
      }

      return changes;
    },
    [editMode, commonValues, selectedItems]
  );

  // フォーム送信
  const onSubmit = useCallback(
    (formData: Record<string, unknown>) => {
      const changes = generatePreview(formData);
      onSave(changes);
    },
    [generatePreview, onSave]
  );

  // 一括削除
  const handleBulkDelete = useCallback(() => {
    if (!deleteConfirmation) {
      setDeleteConfirmation(true);
      announce(
        `${selectedItems.length}個の項目を削除しようとしています。もう一度クリックして確定してください。`,
        'assertive'
      );
      return;
    }

    const changes: BulkEditChanges = {
      commonFields: {},
      individualChanges: {},
      deleteItems: selectedItems.map(item => item.id),
    };

    announce('項目を削除しています...', 'polite');
    onSave(changes);
  }, [deleteConfirmation, selectedItems, onSave, announce]);

  // プレビュー更新
  const watchedValues = watch();
  useEffect(() => {
    if (isDirty) {
      const preview = generatePreview(watchedValues);
      setPreviewChanges(preview);
    } else {
      setPreviewChanges(null);
    }
  }, [watchedValues, isDirty, generatePreview]);

  // ARIA属性を生成
  const dialogAria = getDialogAria({
    titleId,
    descriptionId,
    isModal: true,
  });

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        {...dialogAria}
      >
        {/* ヘッダー */}
        <header className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">
              {itemType === 'subgoal' ? 'サブ目標' : 'アクション'}の一括編集
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
              aria-label="モーダルを閉じる"
              title="Escape キーでも閉じることができます"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 選択項目数の表示 */}
          <p id={descriptionId} className="mt-2 text-sm text-gray-600">
            {selectedItems.length}個の項目が選択されています
          </p>
        </header>

        {/* エラー表示 */}
        {error && (
          <div className="px-6 py-4 border-b border-gray-200">
            <ErrorMessage message={error} />
          </div>
        )}

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* 編集モード切り替え */}
            <div className="px-6 py-4 border-b border-gray-200">
              <fieldset>
                <legend className={SR_ONLY_CLASS}>編集モードを選択</legend>
                <div className="flex space-x-4" role="tablist" aria-label="編集モード">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode('common');
                      announce('共通フィールド編集モードに切り替えました', 'polite');
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      editMode === 'common'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                    role="tab"
                    aria-selected={editMode === 'common'}
                    aria-controls="edit-panel"
                  >
                    共通フィールド編集
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode('individual');
                      announce('個別項目編集モードに切り替えました', 'polite');
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      editMode === 'individual'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                    role="tab"
                    aria-selected={editMode === 'individual'}
                    aria-controls="edit-panel"
                  >
                    個別項目編集
                  </button>
                </div>
              </fieldset>
            </div>

            {/* 編集フォーム */}
            <div
              id="edit-panel"
              className="flex-1 overflow-y-auto px-6 py-4"
              role="tabpanel"
              aria-labelledby={editMode === 'common' ? 'common-tab' : 'individual-tab'}
            >
              {editMode === 'common' ? (
                <CommonFieldsEditor fieldConfigs={fieldConfigs} commonValues={commonValues} />
              ) : (
                <IndividualItemsEditor selectedItems={selectedItems} fieldConfigs={fieldConfigs} />
              )}
            </div>

            {/* 変更プレビュー */}
            {previewChanges && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <ChangePreview changes={previewChanges} selectedItems={selectedItems} />
              </div>
            )}

            {/* フッター */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      deleteConfirmation
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                    }`}
                  >
                    {deleteConfirmation ? '削除を確定' : '一括削除'}
                  </button>
                  {deleteConfirmation && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmation(false)}
                      className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                    >
                      キャンセル
                    </button>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isLoading}
                    disabled={!isDirty || isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    変更を保存
                  </LoadingButton>
                </div>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

/**
 * 共通フィールド編集コンポーネント
 */
interface CommonFieldsEditorProps {
  fieldConfigs: FormFieldConfig[];
  commonValues: Record<string, any>;
}

const CommonFieldsEditor: React.FC<CommonFieldsEditorProps> = ({ fieldConfigs, commonValues }) => {
  const { register, watch } = useForm();

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        <p>共通フィールドで入力した値は、選択された全ての項目に適用されます。</p>
        <p>空欄のフィールドは変更されません。</p>
      </div>

      {fieldConfigs.map(field => (
        <div key={field.name} className="space-y-2">
          <DynamicFormField
            field={{
              ...field,
              required: false, // 一括編集では必須ではない
              placeholder: commonValues[field.name]
                ? `現在の共通値: ${commonValues[field.name]}`
                : '複数の値があります（変更する場合のみ入力）',
            }}
            value={watch(`commonFields.${field.name}`)}
            onChange={() => {}} // react-hook-formが管理
            register={register}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * 個別項目編集コンポーネント
 */
interface IndividualItemsEditorProps {
  selectedItems: BulkEditableItem[];
  fieldConfigs: FormFieldConfig[];
}

const IndividualItemsEditor: React.FC<IndividualItemsEditorProps> = ({
  selectedItems,
  fieldConfigs,
}) => {
  const { register, watch } = useForm();

  return (
    <div className="space-y-8">
      <div className="text-sm text-gray-600 mb-4">
        <p>各項目を個別に編集できます。変更したいフィールドのみ入力してください。</p>
      </div>

      {selectedItems.map(item => (
        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">{item.title}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldConfigs.map(field => (
              <DynamicFormField
                key={field.name}
                field={{
                  ...field,
                  required: false,
                  placeholder: `現在の値: ${(item as any)[field.name] || '未設定'}`,
                }}
                value={watch(`individualChanges.${item.id}.${field.name}`)}
                onChange={() => {}} // react-hook-formが管理
                register={register}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 変更プレビューコンポーネント
 */
interface ChangePreviewProps {
  changes: BulkEditChanges;
  selectedItems: BulkEditableItem[];
}

const ChangePreview: React.FC<ChangePreviewProps> = ({ changes, selectedItems }) => {
  const hasChanges =
    Object.keys(changes.commonFields).length > 0 ||
    Object.keys(changes.individualChanges).length > 0 ||
    changes.deleteItems.length > 0;

  if (!hasChanges) return null;

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">変更プレビュー</h4>

      {/* 共通フィールドの変更 */}
      {Object.keys(changes.commonFields).length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">共通フィールドの変更</h5>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800 mb-2">
              以下の変更が{selectedItems.length}個の項目に適用されます:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              {Object.entries(changes.commonFields).map(([field, value]) => (
                <li key={field}>
                  • {field}: {String(value)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 個別変更 */}
      {Object.keys(changes.individualChanges).length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">個別項目の変更</h5>
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800 mb-2">
              {Object.keys(changes.individualChanges).length}個の項目に個別の変更があります
            </p>
          </div>
        </div>
      )}

      {/* 削除項目 */}
      {changes.deleteItems.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">削除項目</h5>
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">
              {changes.deleteItems.length}個の項目が削除されます
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
