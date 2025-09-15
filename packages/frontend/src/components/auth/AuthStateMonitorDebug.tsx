/**
 * 認証状態監視デバッグコンポーネント
 *
 * 機能:
 * - 認証状態監視の状況を可視化
 * - 監視統計の表示
 * - エラー履歴の表示
 * - 手動操作による監視制御
 *
 * 開発・デバッグ用途
 */

import React, { useState } from 'react';
import { useAuthStateMonitorContext } from './AuthStateMonitorProvider';
import type { AuthError } from '../../services/auth-state-monitor';

/**
 * 認証状態監視デバッグコンポーネントのプロパティ
 */
export interface AuthStateMonitorDebugProps {
  /** 表示するかどうか */
  visible?: boolean;
  /** 位置 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 最小化可能かどうか */
  collapsible?: boolean;
}

/**
 * 認証状態監視デバッグコンポーネント
 *
 * 使用例:
 * ```tsx
 * <AuthStateMonitorDebug
 *   visible={process.env.NODE_ENV === 'development'}
 *   position="bottom-right"
 *   collapsible={true}
 * />
 * ```
 */
export const AuthStateMonitorDebug: React.FC<AuthStateMonitorDebugProps> = ({
  visible = true,
  position = 'bottom-right',
  collapsible = true,
}) => {
  const {
    currentState,
    isMonitoring,
    listenerCount,
    lastError,
    lastStateChangeTime,
    errorHistory,
    monitoringStats,
    startMonitoring,
    stopMonitoring,
    checkAuthState,
    clearError,
    clearErrorHistory,
  } = useAuthStateMonitorContext();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  if (!visible) {
    return null;
  }

  const positionStyles = {
    'top-left': { top: '10px', left: '10px' },
    'top-right': { top: '10px', right: '10px' },
    'bottom-left': { bottom: '10px', left: '10px' },
    'bottom-right': { bottom: '10px', right: '10px' },
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'なし';
    return date.toLocaleTimeString('ja-JP');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  const getStatusColor = () => {
    if (!isMonitoring) return '#6b7280'; // gray
    if (lastError) return '#ef4444'; // red
    if (currentState?.isAuthenticated) return '#10b981'; // green
    return '#f59e0b'; // yellow
  };

  const handleManualCheck = async () => {
    try {
      await checkAuthState();
    } catch (error) {
      console.error('手動認証状態チェックに失敗しました:', error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        backgroundColor: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '400px',
        minWidth: '300px',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #d1d5db',
          borderRadius: '7px 7px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
            }}
          />
          <span style={{ fontWeight: 'bold' }}>認証状態監視</span>
        </div>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        )}
      </div>

      {/* コンテンツ */}
      {!isCollapsed && (
        <div style={{ padding: '12px' }}>
          {/* 基本情報 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>基本情報</div>
            <div>監視状態: {isMonitoring ? '有効' : '無効'}</div>
            <div>リスナー数: {listenerCount}</div>
            <div>稼働時間: {formatDuration(monitoringStats.uptime)}</div>
            <div>最終状態変更: {formatTime(lastStateChangeTime)}</div>
          </div>

          {/* 認証状態 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>認証状態</div>
            <div>認証済み: {currentState?.isAuthenticated ? 'はい' : 'いいえ'}</div>
            <div>ローディング: {currentState?.isLoading ? 'はい' : 'いいえ'}</div>
            <div>ユーザー: {currentState?.user?.email || 'なし'}</div>
            <div>エラー: {currentState?.error || 'なし'}</div>
          </div>

          {/* 統計情報 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>統計情報</div>
            <div>状態変更回数: {monitoringStats.totalStateChanges}</div>
            <div>エラー回数: {monitoringStats.totalErrors}</div>
            <div>エラー履歴: {errorHistory.length}件</div>
          </div>

          {/* エラー情報 */}
          {(lastError || errorHistory.length > 0) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                エラー情報
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '10px',
                  }}
                >
                  {showErrorDetails ? '隠す' : '詳細'}
                </button>
              </div>
              {lastError && (
                <div style={{ color: '#ef4444', marginBottom: '4px' }}>
                  最新: {lastError.code} - {lastError.message}
                </div>
              )}
              {showErrorDetails && errorHistory.length > 0 && (
                <div
                  style={{
                    maxHeight: '100px',
                    overflowY: 'auto',
                    backgroundColor: '#fef2f2',
                    padding: '4px',
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}
                >
                  {errorHistory.slice(-5).map((error: AuthError, index: number) => (
                    <div key={index} style={{ marginBottom: '2px' }}>
                      {formatTime(error.timestamp)} - {error.code}: {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 操作ボタン */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: isMonitoring ? '#fef2f2' : '#f0fdf4',
                cursor: 'pointer',
              }}
            >
              {isMonitoring ? '停止' : '開始'}
            </button>
            <button
              onClick={handleManualCheck}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              チェック
            </button>
            {lastError && (
              <button
                onClick={clearError}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: '#fef2f2',
                  cursor: 'pointer',
                }}
              >
                エラークリア
              </button>
            )}
            {errorHistory.length > 0 && (
              <button
                onClick={clearErrorHistory}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: '#fef2f2',
                  cursor: 'pointer',
                }}
              >
                履歴クリア
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 認証状態監視ステータスバー（軽量版）
 */
export const AuthStateMonitorStatusBar: React.FC<{
  position?: 'top' | 'bottom';
}> = ({ position = 'bottom' }) => {
  const { isMonitoring, currentState, lastError, monitoringStats } = useAuthStateMonitorContext();

  const getStatusText = () => {
    if (!isMonitoring) return '監視停止中';
    if (lastError) return `エラー: ${lastError.code}`;
    if (currentState?.isAuthenticated) return '認証済み';
    return '未認証';
  };

  const getStatusColor = () => {
    if (!isMonitoring) return '#6b7280';
    if (lastError) return '#ef4444';
    if (currentState?.isAuthenticated) return '#10b981';
    return '#f59e0b';
  };

  return (
    <div
      style={{
        position: 'fixed',
        [position]: 0,
        left: 0,
        right: 0,
        height: '24px',
        backgroundColor: getStatusColor(),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9998,
      }}
    >
      {getStatusText()} | 変更: {monitoringStats.totalStateChanges} | エラー:{' '}
      {monitoringStats.totalErrors}
    </div>
  );
};

export default AuthStateMonitorDebug;
