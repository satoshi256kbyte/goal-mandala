import { useNavigate, useParams } from 'react-router-dom';
import { ReflectionDetail } from '../components/reflection/ReflectionDetail';

const ReflectionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { goalId, reflectionId } = useParams<{ goalId: string; reflectionId: string }>();

  if (!goalId || !reflectionId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">必要なパラメータが指定されていません。</p>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/mandala/${goalId}/reflections/${reflectionId}/edit`);
  };

  const handleBack = () => {
    navigate(`/mandala/${goalId}/reflections`);
  };

  const handleDeleted = () => {
    navigate(`/mandala/${goalId}/reflections`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ReflectionDetail
        reflectionId={reflectionId}
        onEdit={handleEdit}
        onBack={handleBack}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default ReflectionDetailPage;
