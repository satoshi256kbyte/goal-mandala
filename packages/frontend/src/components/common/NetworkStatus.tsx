import React from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * ネットワーク状態表示コンポーネントのProps
 */
export interface NetworkStatusProps {
  /** 追加のCSSクラス */
  className?: string;
  /** オフライン時のメッセージ */
  offlineMessage?: string;
  /** オンライン復帰時のメッセージ */
  onlineMessage?: string;
}

/**
 * ネットワーク状態表示コンポーネント
 *
 * ネットワークの接続状態を監視し、オフライン時やオンライン復帰時に
 * 適切なメッセージを表示します。
 */
export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  className = '',
  offlineMessage = 'インターネット接続がありません',
  onlineMessage = 'インターネット接続が復旧しました',
}) => {
  const { isOnline, wasOffline } = useNetworkStatus();

  // オフライン時の表示
  if (!isOnline) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 text-center text-sm font-medium ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center justify-center">
          <svg
            className="h-4 w-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"
            />
          </svg>
          {offlineMessage}
        </div>
      </div>
    );
  }

  // オンライン復帰時の表示（3秒間）
  if (wasOffline) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${className}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-center">
          <svg
            className="h-4 w-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {onlineMessage}
        </div>
      </div>
    );
  }

  return null;
};

export default NetworkStatus;
