import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { validateDeepLinkToken } from '../services/deepLinkApi';

/**
 * Deep Link処理ページ
 *
 * 機能:
 * - メール内のDeep Linkからのアクセスを処理
 * - トークンを検証してタスク詳細ページへナビゲート
 * - 有効期限切れの場合はログインページへリダイレクト
 *
 * Requirements: 3.2, 3.4, 3.5
 */
export const DeepLinkPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateAndNavigate = async () => {
      try {
        // URLパラメータからトークンを取得
        const token = searchParams.get('token');

        if (!token) {
          setError('トークンが見つかりません');
          setIsValidating(false);
          return;
        }

        // トークンを検証
        const result = await validateDeepLinkToken(token);

        if (result.valid && result.taskId) {
          // 有効なトークンの場合、タスク詳細ページへナビゲート
          navigate(`/tasks/${result.taskId}`, { replace: true });
        } else {
          // 無効なトークンの場合、エラーメッセージを表示
          setError(result.error || 'トークンが無効です');
          setIsValidating(false);
        }
      } catch (err) {
        console.error('Deep Link validation error:', err);
        setError('トークンの検証中にエラーが発生しました');
        setIsValidating(false);
      }
    };

    validateAndNavigate();
  }, [searchParams, navigate]);

  // 有効期限切れまたはエラーの場合、3秒後にログインページへリダイレクト
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: error },
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error, navigate]);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">リンクを確認しています...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">リンクが無効です</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">3秒後にログインページへ移動します...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DeepLinkPage;
