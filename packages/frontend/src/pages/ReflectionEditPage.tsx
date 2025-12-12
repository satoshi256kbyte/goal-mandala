import { useNavigate, useParams } from 'react-router-dom';
import { ReflectionForm } from '../components/reflection/ReflectionForm';
import { useReflection, useUpdateReflection } from '../hooks/useReflections';
import type { ReflectionFormData } from '../schemas/reflection-form';

const ReflectionEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { goalId, reflectionId } = useParams<{ goalId: string; reflectionId: string }>();
  const { data: reflection, isLoading, error } = useReflection(reflectionId || '');
  const updateReflection = useUpdateReflection();

  if (!goalId || !reflectionId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">必要なパラメータが指定されていません。</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: ReflectionFormData) => {
    try {
      await updateReflection.mutateAsync({
        reflectionId,
        input: data,
      });
      // 成功したら詳細画面へ遷移
      navigate(`/mandala/${goalId}/reflections/${reflectionId}`);
    } catch (error) {
      console.error('振り返りの更新に失敗しました:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate(`/mandala/${goalId}/reflections/${reflectionId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">振り返りを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error || !reflection) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            振り返りの取得に失敗しました。もう一度お試しください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">振り返りを編集</h1>
        <p className="mt-2 text-sm text-gray-600">振り返りの内容を編集できます。</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <ReflectionForm
          initialData={reflection}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateReflection.isPending}
        />
      </div>

      {updateReflection.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            振り返りの更新に失敗しました。もう一度お試しください。
          </p>
        </div>
      )}
    </div>
  );
};

export default ReflectionEditPage;
