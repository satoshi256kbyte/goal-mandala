/**
 * React Query プロバイダー設定
 */

import React from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * クエリクライアントの設定
 */
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // デフォルトのクエリ設定
        staleTime: 5 * 60 * 1000, // 5分間はフレッシュとみなす
        gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
        refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動リフェッチを無効
        refetchOnMount: true, // マウント時にリフェッチ
        refetchOnReconnect: true, // 再接続時にリフェッチ
        retry: (failureCount, error) => {
          // エラーの種類に応じてリトライ戦略を調整
          if (error instanceof Error) {
            // 認証エラーの場合はリトライしない
            if (error.message.includes('401') || error.message.includes('403')) {
              return false;
            }
            // ネットワークエラーの場合は3回まで
            if (error.message.includes('Network')) {
              return failureCount < 3;
            }
          }
          // その他のエラーは1回まで
          return failureCount < 1;
        },
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
      },
      mutations: {
        // デフォルトのミューテーション設定
        retry: (failureCount, error) => {
          // ミューテーションは基本的にリトライしない
          if (error instanceof Error) {
            // ネットワークエラーの場合のみ1回リトライ
            if (error.message.includes('Network')) {
              return failureCount < 1;
            }
          }
          return false;
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // グローバルエラーハンドリング
        console.error('Query error:', error, 'Query key:', query.queryKey);

        // エラー通知（実装時に追加）
        // toast.error(`データの取得に失敗しました: ${error.message}`);
      },
      onSuccess: (data, query) => {
        // 成功時のログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('Query success:', query.queryKey, data);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables) => {
        // グローバルミューテーションエラーハンドリング
        console.error('Mutation error:', error, 'Variables:', variables);

        // エラー通知（実装時に追加）
        // toast.error(`操作に失敗しました: ${error.message}`);
      },
      onSuccess: (data, variables) => {
        // 成功時のログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('Mutation success:', variables, data);
        }

        // 成功通知（実装時に追加）
        // toast.success('操作が完了しました');
      },
    }),
  });
};

/**
 * QueryProviderのプロパティ
 */
export interface QueryProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

/**
 * React Query プロバイダーコンポーネント
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children, client }) => {
  // クライアントインスタンスを作成（テスト時は外部から注入可能）
  const queryClient = React.useMemo(() => client || createQueryClient(), [client]);

  // オンライン/オフライン状態の監視
  React.useEffect(() => {
    const handleOnline = () => {
      console.log('Network online - resuming queries');
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      console.log('Network offline - pausing queries');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // メモリ使用量の監視（開発環境のみ）
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();

        console.log('Query Cache Stats:', {
          totalQueries: queries.length,
          activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
          staleQueries: queries.filter(q => q.isStale()).length,
          errorQueries: queries.filter(q => q.state.status === 'error').length,
        });
      }, 30000); // 30秒ごと

      return () => clearInterval(interval);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 開発環境でのみReact Query Devtoolsを表示 */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

/**
 * クエリクライアントを取得するヘルパー関数
 */
export const getQueryClient = () => createQueryClient();

/**
 * テスト用のクエリクライアント作成関数
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * パフォーマンス監視用のクエリクライアント設定
 */
export const createPerformanceQueryClient = () => {
  const performanceMetrics = {
    queryCount: 0,
    mutationCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onSuccess: () => {
        performanceMetrics.queryCount++;
        performanceMetrics.cacheHits++;
      },
      onError: () => {
        performanceMetrics.queryCount++;
        performanceMetrics.cacheMisses++;
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: () => {
        performanceMetrics.mutationCount++;
      },
      onError: () => {
        performanceMetrics.mutationCount++;
      },
    }),
  });
};
