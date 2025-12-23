import { useState } from 'react';
import { useReflection, useDeleteReflection } from '../../hooks/useReflections';

interface ReflectionDetailProps {
  reflectionId: string;
  onEdit: () => void;
  onBack: () => void;
  onDeleted: () => void;
}

export const ReflectionDetail: React.FC<ReflectionDetailProps> = ({
  reflectionId,
  onEdit,
  onBack,
  onDeleted,
}) => {
  const { data: reflection, isLoading, error } = useReflection(reflectionId);
  const deleteReflection = useDeleteReflection();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteReflection.mutateAsync(reflectionId);
      setShowDeleteDialog(false);
      onDeleted();
    } catch (error) {
      console.error('振り返りの削除に失敗しました:', error);
    }
  };

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

  if (!reflection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">振り返りが見つかりませんでした。</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            戻る
          </button>
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              編集
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              削除
            </button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="px-6 py-6 space-y-6">
        {/* 日時情報 */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>作成日時: {formatDate(reflection.createdAt)}</p>
          {reflection.updatedAt !== reflection.createdAt && (
            <p>更新日時: {formatDate(reflection.updatedAt)}</p>
          )}
        </div>

        {/* 総括 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">総括</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{reflection.summary}</p>
        </div>

        {/* 惜しかったアクション */}
        {reflection.regretfulActions && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              惜しかったアクション（進捗80%以上）
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {reflection.regretfulActions}
            </p>
          </div>
        )}

        {/* 進まなかったアクション */}
        {reflection.slowProgressActions && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              思ったより進まなかったアクション（進捗20%以下）
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {reflection.slowProgressActions}
            </p>
          </div>
        )}

        {/* 未着手アクション */}
        {reflection.untouchedActions && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              未着手となったアクション（進捗0%）
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {reflection.untouchedActions}
            </p>
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={deleteReflection.isPending}
        />
      )}
    </div>
  );
};

interface DeleteConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">振り返りを削除</h3>
          <p className="text-sm text-gray-500">
            この振り返りを削除してもよろしいですか？この操作は取り消せません。
          </p>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
};
