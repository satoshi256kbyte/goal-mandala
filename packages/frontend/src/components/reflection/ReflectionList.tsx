import { useReflectionsByGoal } from '../../hooks/useReflections';
import type { Reflection } from '../../types/reflection';

interface ReflectionListProps {
  goalId: string;
  onSelectReflection: (reflectionId: string) => void;
}

export const ReflectionList: React.FC<ReflectionListProps> = ({ goalId, onSelectReflection }) => {
  const { data: reflections, isLoading, error } = useReflectionsByGoal(goalId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">振り返りを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">
          振り返りの取得に失敗しました。もう一度お試しください。
        </p>
      </div>
    );
  }

  if (!reflections || reflections.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">振り返りがありません</h3>
        <p className="mt-1 text-sm text-gray-500">
          最初の振り返りを作成して、目標達成の進捗を記録しましょう。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reflections.map(reflection => (
        <ReflectionCard
          key={reflection.id}
          reflection={reflection}
          onClick={() => onSelectReflection(reflection.id)}
        />
      ))}
    </div>
  );
};

interface ReflectionCardProps {
  reflection: Reflection;
  onClick: () => void;
}

const ReflectionCard: React.FC<ReflectionCardProps> = ({ reflection, onClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const truncateSummary = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-2">{formatDate(reflection.createdAt)}</p>
          <p className="text-base text-gray-900 leading-relaxed">
            {truncateSummary(reflection.summary)}
          </p>
        </div>
        <svg
          className="ml-4 h-5 w-5 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {(reflection.regretfulActions ||
        reflection.slowProgressActions ||
        reflection.untouchedActions) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {reflection.regretfulActions && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              惜しかったアクション
            </span>
          )}
          {reflection.slowProgressActions && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              進まなかったアクション
            </span>
          )}
          {reflection.untouchedActions && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              未着手アクション
            </span>
          )}
        </div>
      )}
    </div>
  );
};
