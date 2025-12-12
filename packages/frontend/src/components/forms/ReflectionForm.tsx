import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reflectionFormSchema, ReflectionFormData } from '../../schemas/reflection-form';
import type { Reflection } from '../../types/reflection';

export interface ReflectionFormProps {
  initialData?: Reflection;
  goalId: string;
  onSubmit: (data: ReflectionFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReflectionForm: React.FC<ReflectionFormProps> = ({
  initialData,
  goalId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
  } = useForm<ReflectionFormData>({
    resolver: zodResolver(reflectionFormSchema),
    defaultValues: initialData
      ? {
          summary: initialData.summary,
          regretfulActions: initialData.regretfulActions || '',
          slowProgressActions: initialData.slowProgressActions || '',
          untouchedActions: initialData.untouchedActions || '',
        }
      : {
          summary: '',
          regretfulActions: '',
          slowProgressActions: '',
          untouchedActions: '',
        },
  });

  const handleFormSubmit = async (data: ReflectionFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('振り返りの保存に失敗しました:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 総括フィールド（必須） */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
          総括 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="summary"
          {...register('summary')}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="目標達成状況の総括を入力してください"
          disabled={isSubmitting}
        />
        {errors.summary && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.summary.message}
          </p>
        )}
      </div>

      {/* 惜しかったアクションフィールド（任意） */}
      <div>
        <label htmlFor="regretfulActions" className="block text-sm font-medium text-gray-700 mb-2">
          惜しかったアクション
        </label>
        <textarea
          id="regretfulActions"
          {...register('regretfulActions')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="進捗80%以上で達成できなかったアクションについて記録してください"
          disabled={isSubmitting}
        />
        {errors.regretfulActions && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.regretfulActions.message}
          </p>
        )}
      </div>

      {/* 進まなかったアクションフィールド（任意） */}
      <div>
        <label
          htmlFor="slowProgressActions"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          思ったより進まなかったアクション
        </label>
        <textarea
          id="slowProgressActions"
          {...register('slowProgressActions')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="進捗20%以下のアクションについて記録してください"
          disabled={isSubmitting}
        />
        {errors.slowProgressActions && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.slowProgressActions.message}
          </p>
        )}
      </div>

      {/* 未着手アクションフィールド（任意） */}
      <div>
        <label htmlFor="untouchedActions" className="block text-sm font-medium text-gray-700 mb-2">
          未着手となったアクション
        </label>
        <textarea
          id="untouchedActions"
          {...register('untouchedActions')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="進捗0%のアクションについて記録してください"
          disabled={isSubmitting}
        />
        {errors.untouchedActions && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.untouchedActions.message}
          </p>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
};
