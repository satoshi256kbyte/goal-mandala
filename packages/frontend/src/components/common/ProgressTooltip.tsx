import React from 'react';
import { Tooltip, TooltipProps } from './Tooltip';

export interface ProgressTooltipProps extends Omit<TooltipProps, 'content' | 'progressInfo'> {
  /** 現在の進捗値 */
  currentValue: number;
  /** 前回の進捗値 */
  previousValue?: number;
  /** 目標値 */
  targetValue?: number;
  /** 完了タスク数 */
  completedTasks?: number;
  /** 総タスク数 */
  totalTasks?: number;
  /** 最終更新日時 */
  lastUpdated?: Date;
  /** 完了予定日 */
  estimatedCompletion?: Date;
  /** カスタムメッセージ */
  customMessage?: string;
  /** 進捗の種類 */
  progressType?: 'task' | 'action' | 'subgoal' | 'goal';
  /** 詳細情報の表示・非表示 */
  showDetails?: boolean;
}

/**
 * 進捗専用ツールチップコンポーネント
 *
 * 進捗情報の表示に特化したツールチップ。
 * 進捗値、変化量、詳細情報を分かりやすく表示する。
 */
export const ProgressTooltip: React.FC<ProgressTooltipProps> = ({
  currentValue,
  previousValue,
  targetValue = 100,
  completedTasks,
  totalTasks,
  lastUpdated,
  estimatedCompletion,
  customMessage,
  progressType = 'task',
  showDetails = true,
  children,
  ...tooltipProps
}) => {
  // 進捗タイプに応じたラベルを取得
  const getProgressTypeLabel = (type: string): string => {
    const labels = {
      task: 'タスク',
      action: 'アクション',
      subgoal: 'サブ目標',
      goal: '目標',
    };
    return labels[type as keyof typeof labels] || 'タスク';
  };

  // 進捗状況のステータステキストを取得
  const getProgressStatus = (value: number): { text: string; color: string } => {
    if (value === 0) {
      return { text: '未開始', color: 'text-gray-400' };
    } else if (value < 25) {
      return { text: '開始済み', color: 'text-blue-400' };
    } else if (value < 50) {
      return { text: '進行中', color: 'text-yellow-400' };
    } else if (value < 80) {
      return { text: '順調', color: 'text-orange-400' };
    } else if (value < 100) {
      return { text: 'もうすぐ完了', color: 'text-green-400' };
    } else {
      return { text: '完了', color: 'text-green-500' };
    }
  };

  const progressStatus = getProgressStatus(currentValue);
  const change = previousValue !== undefined ? currentValue - previousValue : 0;
  const changeText =
    change > 0 ? `+${change.toFixed(1)}%` : change < 0 ? `${change.toFixed(1)}%` : '変更なし';
  const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';

  // ツールチップの内容を生成
  const tooltipContent = (
    <div className="space-y-2 min-w-48">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-600 pb-2">
        <span className="text-sm font-medium text-gray-300">
          {getProgressTypeLabel(progressType)}進捗
        </span>
        <span className={`text-xs px-2 py-1 rounded-full bg-gray-700 ${progressStatus.color}`}>
          {progressStatus.text}
        </span>
      </div>

      {/* メイン進捗情報 */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">進捗状況</span>
        <span className="text-lg font-bold text-white">{currentValue.toFixed(1)}%</span>
      </div>

      {/* 前回からの変化 */}
      {previousValue !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">前回から</span>
          <span className={changeColor}>{changeText}</span>
        </div>
      )}

      {/* 目標までの残り */}
      {targetValue !== undefined && currentValue < targetValue && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">目標まで</span>
          <span className="text-gray-100">{(targetValue - currentValue).toFixed(1)}%</span>
        </div>
      )}

      {/* 詳細情報 */}
      {showDetails &&
        (completedTasks !== undefined ||
          totalTasks !== undefined ||
          lastUpdated ||
          (estimatedCompletion && currentValue < 100)) && (
          <div className="border-t border-gray-600 pt-2 space-y-1 text-sm">
            {/* タスク情報 */}
            {completedTasks !== undefined && totalTasks !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-300">完了タスク</span>
                <span className="text-gray-100">
                  {completedTasks}/{totalTasks}
                  {totalTasks > 0 && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({((completedTasks / totalTasks) * 100).toFixed(0)}%)
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* 最終更新日時 */}
            {lastUpdated && (
              <div className="flex justify-between">
                <span className="text-gray-300">最終更新</span>
                <span className="text-gray-100">
                  {lastUpdated.getMonth() + 1}月{lastUpdated.getDate()}日{' '}
                  {lastUpdated.getHours().toString().padStart(2, '0')}:
                  {lastUpdated.getMinutes().toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* 完了予定日 */}
            {estimatedCompletion && currentValue < 100 && (
              <div className="flex justify-between">
                <span className="text-gray-300">完了予定</span>
                <span className="text-gray-100">
                  {estimatedCompletion.getMonth() + 1}月{estimatedCompletion.getDate()}日
                </span>
              </div>
            )}
          </div>
        )}

      {/* カスタムメッセージ */}
      {customMessage && (
        <div className="border-t border-gray-600 pt-2 text-sm text-gray-300">{customMessage}</div>
      )}
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      theme="dark"
      animation={{ duration: 200, easing: 'ease-out', scale: true, fade: true }}
      touchConfig={{
        touchDelay: 50,
        hideDelay: 3000,
        longPressThreshold: 300,
        touchAreaExpansion: 8,
      }}
      progressInfo={{
        currentValue,
        previousValue,
        targetValue,
        details: {
          completedTasks,
          totalTasks,
          lastUpdated,
          estimatedCompletion,
        },
      }}
      {...tooltipProps}
    >
      {children}
    </Tooltip>
  );
};

export default ProgressTooltip;
