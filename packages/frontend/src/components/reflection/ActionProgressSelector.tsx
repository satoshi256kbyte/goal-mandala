import { useActionProgress } from '../../hooks/useReflections';
import type { ActionProgress } from '../../types/reflection';

interface ActionProgressSelectorProps {
  goalId: string;
  onSelectAction: (
    action: ActionProgress,
    category: 'regretful' | 'slowProgress' | 'untouched'
  ) => void;
}

export const ActionProgressSelector: React.FC<ActionProgressSelectorProps> = ({
  goalId,
  onSelectAction,
}) => {
  const { data: actionProgress, isLoading, error } = useActionProgress(goalId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">アクション進捗を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">
          アクション進捗の取得に失敗しました。もう一度お試しください。
        </p>
      </div>
    );
  }

  if (!actionProgress) {
    return null;
  }

  const { regretful, slowProgress, untouched } = actionProgress;

  return (
    <div className="space-y-6">
      {/* 惜しかったアクション */}
      {regretful.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            惜しかったアクション（進捗80%以上）
          </h3>
          <div className="space-y-2">
            {regretful.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onSelect={() => onSelectAction(action, 'regretful')}
              />
            ))}
          </div>
        </div>
      )}

      {/* 進まなかったアクション */}
      {slowProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            思ったより進まなかったアクション（進捗20%以下）
          </h3>
          <div className="space-y-2">
            {slowProgress.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onSelect={() => onSelectAction(action, 'slowProgress')}
              />
            ))}
          </div>
        </div>
      )}

      {/* 未着手アクション */}
      {untouched.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            未着手となったアクション（進捗0%）
          </h3>
          <div className="space-y-2">
            {untouched.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onSelect={() => onSelectAction(action, 'untouched')}
              />
            ))}
          </div>
        </div>
      )}

      {regretful.length === 0 && slowProgress.length === 0 && untouched.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>該当するアクションがありません</p>
        </div>
      )}
    </div>
  );
};

interface ActionCardProps {
  action: ActionProgress;
  onSelect: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onSelect }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
        <p className="text-xs text-gray-500 mt-1">{action.subGoalTitle}</p>
        <div className="mt-2 flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${action.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 font-medium">{action.progress}%</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        選択
      </button>
    </div>
  );
};
