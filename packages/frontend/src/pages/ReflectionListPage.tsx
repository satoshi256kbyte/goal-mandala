import { useNavigate, useParams } from 'react-router-dom';
import { ReflectionList } from '../components/reflection/ReflectionList';

const ReflectionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();

  if (!goalId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">目標IDが指定されていません。</p>
        </div>
      </div>
    );
  }

  const handleSelectReflection = (reflectionId: string) => {
    navigate(`/mandala/${goalId}/reflections/${reflectionId}`);
  };

  const handleCreateNew = () => {
    navigate(`/mandala/${goalId}/reflections/new`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">振り返り履歴</h1>
          <p className="mt-2 text-sm text-gray-600">これまでの振り返りを確認できます。</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          新規作成
        </button>
      </div>

      <ReflectionList goalId={goalId} onSelectReflection={handleSelectReflection} />
    </div>
  );
};

export default ReflectionListPage;
