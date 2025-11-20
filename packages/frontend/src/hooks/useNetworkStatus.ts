import { useState } from 'react';

/**
 * ネットワーク状態フックの戻り値の型
 */
export interface UseNetworkStatusReturn {
  /** オンライン状態 */
  isOnline: boolean;
  /** オフラインから復帰したかどうか */
  wasOffline: boolean;
}

/**
 * ネットワーク状態監視フック
 *
 * ブラウザのネットワーク状態を監視し、オンライン/オフライン状態を提供します。
 * オフラインから復帰した際の検出も行います。
 */
export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      // 3秒後にwasOfflineをリセット
      setTimeout(() => {
        setWasOffline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    // イベントリスナーを追加
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // クリーンアップ
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
  };
};

export default useNetworkStatus;
