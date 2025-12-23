import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reflectionFormSchema, type ReflectionFormData } from '../../schemas/reflection-form';
import type { Reflection } from '../../types/reflection';

interface ReflectionFormProps {
  initialData?: Reflection;
  onSubmit: (data: ReflectionFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReflectionForm: React.FC<ReflectionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
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
      {/* 総括 */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
          総括 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="summary"
          {...register('summary')}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="目標達成に向けた振り返りを記入してください"
          disabled={isSubmitting}
        />
        {errors.summary && <p className="mt-1 text-sm text-red-600">{errors.summary.message}</p>}
      </div>

      {/* 惜しかったアクション */}
      <div>
        <label htmlFor="regretfulActions" className="block text-sm font-medium text-gray-700 mb-2">
          惜しかったアクション（進捗80%以上）
        </label>
        <textarea
          id="regretfulActions"
          {...register('regretfulActions')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="あと少しで達成できそうだったアクションを記入してください"
          disabled={isSubmitting}
        />
        {errors.regretfulActions && (
          <p className="mt-1 text-sm text-red-600">{errors.regretfulActions.message}</p>
        )}
      </div>

      {/* 進まなかったアクション */}
      <div>
        <label
          htmlFor="slowProgressActions"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          思ったより進まなかったアクション（進捗20%以下）
        </label>
        <textarea
          id="slowProgressActions"
          {...register('slowProgressActions')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="予想より進捗が遅かったアクションを記入してください"
          disabled={isSubmitting}
        />
        {errors.slowProgressActions && (
          <p className="mt-1 text-sm text-red-600">{errors.slowProgressActions.message}</p>
        )}
      </div>

      {/* 未着手アクション */}
      <div>
        <label htmlFor="untouchedActions" className="block text-sm font-medium text-gray-700 mb-2">
          未着手となったアクション（進捗0%）
        </label>
        <textarea
          id="untouchedActions"
          {...register('untouchedActions')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="着手できなかったアクションを記入してください"
          disabled={isSubmitting}
        />
        {errors.untouchedActions && (
          <p className="mt-1 text-sm text-red-600">{errors.untouchedActions.message}</p>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
};
