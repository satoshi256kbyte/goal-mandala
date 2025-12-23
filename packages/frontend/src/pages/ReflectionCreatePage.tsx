import { useNavigate, useParams } from 'react-router-dom';
import { ReflectionForm } from '../components/reflection/ReflectionForm';
import { useCreateReflection } from '../hooks/useReflections';
import type { ReflectionFormData } from '../schemas/reflection-form';

const ReflectionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const createReflection = useCreateReflection();

  if (!goalId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">目標IDが指定されていません。</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: ReflectionFormData) => {
    try {
      await createReflection.mutateAsync({
        goalId,
        ...data,
      });
      // 成功したら一覧画面へ遷移
      navigate(`/mandala/${goalId}/reflections`);
    } catch (error) {
      console.error('振り返りの作成に失敗しました:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate(`/mandala/${goalId}/reflections`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">振り返りを作成</h1>
        <p className="mt-2 text-sm text-gray-600">目標達成に向けた振り返りを記録しましょう。</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <ReflectionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createReflection.isPending}
        />
      </div>

      {createReflection.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            振り返りの作成に失敗しました。もう一度お試しください。
          </p>
        </div>
      )}
    </div>
  );
};

export default ReflectionCreatePage;
