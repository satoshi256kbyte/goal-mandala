import React from 'react';
import { ProgressBar } from './ProgressBar';
import { ProgressTooltip } from './ProgressTooltip';

/**
 * ツールチップ機能のデモンストレーション用コンポーネント
 */
export const TooltipExample: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">進捗表示ツールチップのデモ</h1>

        {/* 基本的なプログレスバー */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            基本的なプログレスバー（シンプルなツールチップ）
          </h2>
          <div className="space-y-4">
            <ProgressBar
              value={25}
              showLabel={true}
              tooltip="基本的な進捗情報"
              className="w-full"
            />
            <ProgressBar
              value={65}
              showLabel={true}
              tooltip="中程度の進捗"
              colorScheme="warning"
              className="w-full"
            />
            <ProgressBar
              value={90}
              showLabel={true}
              tooltip="もうすぐ完了"
              colorScheme="success"
              className="w-full"
            />
          </div>
        </section>

        {/* 進捗専用ツールチップ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            進捗専用ツールチップ（詳細情報付き）
          </h2>
          <div className="space-y-4">
            <ProgressBar
              value={35}
              showLabel={true}
              progressTooltip={{
                previousValue: 20,
                completedTasks: 7,
                totalTasks: 20,
                progressType: 'task',
                lastUpdated: new Date('2024-01-15T10:30:00'),
                customMessage: '順調に進んでいます！',
              }}
              className="w-full"
            />

            <ProgressBar
              value={75}
              showLabel={true}
              progressTooltip={{
                previousValue: 60,
                targetValue: 100,
                completedTasks: 6,
                totalTasks: 8,
                progressType: 'action',
                lastUpdated: new Date('2024-01-20T14:15:00'),
                estimatedCompletion: new Date('2024-02-01'),
                customMessage: 'あと少しで完了です',
              }}
              colorScheme="warning"
              className="w-full"
            />

            <ProgressBar
              value={100}
              showLabel={true}
              progressTooltip={{
                previousValue: 95,
                completedTasks: 8,
                totalTasks: 8,
                progressType: 'goal',
                lastUpdated: new Date('2024-01-25T16:45:00'),
                customMessage: '目標達成おめでとうございます！',
              }}
              colorScheme="success"
              className="w-full"
            />
          </div>
        </section>

        {/* スタンドアロンの進捗ツールチップ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">スタンドアロンの進捗ツールチップ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProgressTooltip
              currentValue={45}
              previousValue={30}
              completedTasks={9}
              totalTasks={20}
              progressType="task"
              lastUpdated={new Date('2024-01-18T09:20:00')}
              position="top"
            >
              <div className="p-4 bg-blue-100 rounded-lg cursor-help">
                <h3 className="font-semibold text-blue-800">タスク進捗</h3>
                <p className="text-blue-600">ホバーして詳細を確認</p>
              </div>
            </ProgressTooltip>

            <ProgressTooltip
              currentValue={80}
              previousValue={70}
              completedTasks={4}
              totalTasks={5}
              progressType="action"
              lastUpdated={new Date('2024-01-22T11:30:00')}
              estimatedCompletion={new Date('2024-01-30')}
              position="top"
            >
              <div className="p-4 bg-yellow-100 rounded-lg cursor-help">
                <h3 className="font-semibold text-yellow-800">アクション進捗</h3>
                <p className="text-yellow-600">ホバーして詳細を確認</p>
              </div>
            </ProgressTooltip>

            <ProgressTooltip
              currentValue={100}
              previousValue={100}
              completedTasks={3}
              totalTasks={3}
              progressType="goal"
              lastUpdated={new Date('2024-01-25T17:00:00')}
              customMessage="完璧な達成です！"
              position="top"
            >
              <div className="p-4 bg-green-100 rounded-lg cursor-help">
                <h3 className="font-semibold text-green-800">目標進捗</h3>
                <p className="text-green-600">ホバーして詳細を確認</p>
              </div>
            </ProgressTooltip>
          </div>
        </section>

        {/* モバイル対応のデモ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">モバイル対応（タッチ操作）</h2>
          <p className="text-gray-600">
            モバイルデバイスでは、タップまたは長押しでツールチップが表示されます。
          </p>
          <div className="space-y-4">
            <ProgressTooltip
              currentValue={60}
              previousValue={40}
              completedTasks={12}
              totalTasks={20}
              progressType="task"
              lastUpdated={new Date('2024-01-20T13:45:00')}
              touchEnabled={true}
              position="bottom"
            >
              <button className="w-full p-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                タッチ対応ボタン（タップして詳細を表示）
              </button>
            </ProgressTooltip>
          </div>
        </section>

        {/* 使用方法の説明 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">使用方法</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-2">基本的な使用方法</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {`// シンプルなツールチップ
<ProgressBar
  value={75}
  tooltip="進捗: 75%"
/>

// 詳細な進捗ツールチップ
<ProgressBar
  value={75}
  progressTooltip={{
    previousValue: 50,
    completedTasks: 6,
    totalTasks: 8,
    progressType: 'action',
    lastUpdated: new Date(),
    customMessage: '順調に進んでいます'
  }}
/>

// スタンドアロンの進捗ツールチップ
<ProgressTooltip
  currentValue={75}
  progressType="goal"
  completedTasks={3}
  totalTasks={4}
>
  <div>ホバーして詳細を表示</div>
</ProgressTooltip>`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TooltipExample;
