import type { Meta, StoryObj } from '@storybook/react';
import ProgressHistoryChart from './ProgressHistoryChart';
import { ProgressHistoryEntry } from '../../services/progress-history-service';

const meta: Meta<typeof ProgressHistoryChart> = {
  title: 'Components/Common/ProgressHistoryChart',
  component: ProgressHistoryChart,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '進捗履歴をグラフで表示するコンポーネント。Rechartsを使用した線グラフで過去の進捗変化を可視化し、重要な変化点をハイライト表示します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: '進捗履歴データの配列',
    },
    significantChanges: {
      description: '重要な変化点データの配列',
    },
    width: {
      control: { type: 'number' },
      description: 'チャートの幅',
    },
    height: {
      control: { type: 'number' },
      description: 'チャートの高さ',
    },
    showGrid: {
      control: { type: 'boolean' },
      description: 'グリッド表示の有無',
    },
    showTooltip: {
      control: { type: 'boolean' },
      description: 'ツールチップ表示の有無',
    },
    highlightSignificantChanges: {
      control: { type: 'boolean' },
      description: '重要な変化点のハイライト表示',
    },
    dateFormat: {
      control: { type: 'text' },
      description: '日付フォーマット',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'ローディング状態',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ生成関数
const generateProgressHistory = (
  days: number,
  startProgress: number = 0
): ProgressHistoryEntry[] => {
  const data: ProgressHistoryEntry[] = [];
  let currentProgress = startProgress;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // ランダムな進捗変化（-5% から +10% の範囲）
    const change = Math.random() * 15 - 5;
    currentProgress = Math.max(0, Math.min(100, currentProgress + change));

    data.push({
      id: `entry-${i}`,
      entityId: 'goal-1',
      entityType: 'goal',
      progress: Math.round(currentProgress * 10) / 10,
      timestamp: date,
      changeReason: i % 7 === 0 ? 'タスク完了' : undefined,
    });
  }

  return data;
};

// 重要な変化点のサンプルデータ
const generateSignificantChanges = (historyData: ProgressHistoryEntry[]): SignificantChange[] => {
  const changes: SignificantChange[] = [];

  for (let i = 1; i < historyData.length; i++) {
    const current = historyData[i];
    const previous = historyData[i - 1];
    const change = current.progress - previous.progress;

    // 10%以上の変化を重要な変化とする
    if (Math.abs(change) >= 10) {
      changes.push({
        id: `change-${i}`,
        entityId: current.entityId,
        date: current.timestamp,
        change: Math.round(change * 10) / 10,
        reason: change > 0 ? '大幅な進捗' : '進捗の後退',
        previousProgress: previous.progress,
        newProgress: current.progress,
      });
    }
  }

  return changes;
};

// 基本的な使用例
export const Default: Story = {
  args: {
    data: generateProgressHistory(30, 20),
    height: 300,
    showGrid: true,
    showTooltip: true,
    highlightSignificantChanges: true,
  },
};

// 重要な変化点付き
export const WithSignificantChanges: Story = {
  render: () => {
    const historyData = generateProgressHistory(30, 10);
    const significantChanges = generateSignificantChanges(historyData);

    return (
      <ProgressHistoryChart
        data={historyData}
        significantChanges={significantChanges}
        height={350}
        showGrid={true}
        showTooltip={true}
        highlightSignificantChanges={true}
        onDateClick={(date, progress) => {
          console.log(`Clicked: ${date.toLocaleDateString()} - ${progress}%`);
        }}
      />
    );
  },
};

// カスタムカラー
export const CustomColors: Story = {
  args: {
    data: generateProgressHistory(20, 30),
    height: 300,
    colors: {
      line: '#8b5cf6',
      grid: '#e5e7eb',
      significant: '#f59e0b',
    },
    showGrid: true,
    showTooltip: true,
    highlightSignificantChanges: true,
  },
};

// 短期間のデータ（1週間）
export const WeeklyData: Story = {
  args: {
    data: generateProgressHistory(7, 50),
    height: 250,
    dateFormat: 'MM/dd (E)',
    showGrid: true,
    showTooltip: true,
  },
};

// 長期間のデータ（3ヶ月）
export const QuarterlyData: Story = {
  args: {
    data: generateProgressHistory(90, 0),
    height: 400,
    dateFormat: 'MM/dd',
    showGrid: true,
    showTooltip: true,
    highlightSignificantChanges: true,
  },
};

// グリッド非表示
export const NoGrid: Story = {
  args: {
    data: generateProgressHistory(30, 25),
    height: 300,
    showGrid: false,
    showTooltip: true,
  },
};

// ツールチップ非表示
export const NoTooltip: Story = {
  args: {
    data: generateProgressHistory(30, 40),
    height: 300,
    showGrid: true,
    showTooltip: false,
  },
};

// 小さいサイズ
export const SmallSize: Story = {
  args: {
    data: generateProgressHistory(14, 60),
    height: 200,
    showGrid: false,
    dateFormat: 'M/d',
  },
};

// 大きいサイズ
export const LargeSize: Story = {
  args: {
    data: generateProgressHistory(60, 15),
    height: 500,
    showGrid: true,
    showTooltip: true,
    highlightSignificantChanges: true,
  },
};

// ローディング状態
export const Loading: Story = {
  args: {
    data: [],
    loading: true,
    height: 300,
  },
};

// エラー状態
export const ErrorState: Story = {
  args: {
    data: [],
    height: 300,
    error: {
      hasError: true,
      errorMessage: '進捗履歴の取得に失敗しました',
      onRetry: () => {
        console.log('Retry clicked');
      },
    },
  },
};

// データなし
export const NoData: Story = {
  args: {
    data: [],
    height: 300,
    showGrid: true,
    showTooltip: true,
  },
};

// 完全な進捗（0%から100%）
export const CompleteProgress: Story = {
  render: () => {
    const data: ProgressHistoryEntry[] = [];
    const days = 50;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));

      // 0%から100%まで線形に増加
      const progress = (i / (days - 1)) * 100;

      data.push({
        id: `entry-${i}`,
        entityId: 'goal-complete',
        entityType: 'goal',
        progress: Math.round(progress * 10) / 10,
        timestamp: date,
        changeReason: i === days - 1 ? '目標達成！' : undefined,
      });
    }

    const significantChanges: SignificantChange[] = [
      {
        id: 'milestone-25',
        entityId: 'goal-complete',
        date: data[Math.floor(days * 0.25)].timestamp,
        change: 25,
        reason: '第1マイルストーン達成',
        previousProgress: 0,
        newProgress: 25,
      },
      {
        id: 'milestone-50',
        entityId: 'goal-complete',
        date: data[Math.floor(days * 0.5)].timestamp,
        change: 25,
        reason: '中間目標達成',
        previousProgress: 25,
        newProgress: 50,
      },
      {
        id: 'milestone-75',
        entityId: 'goal-complete',
        date: data[Math.floor(days * 0.75)].timestamp,
        change: 25,
        reason: '第3マイルストーン達成',
        previousProgress: 50,
        newProgress: 75,
      },
      {
        id: 'completion',
        entityId: 'goal-complete',
        date: data[days - 1].timestamp,
        change: 25,
        reason: '目標完全達成！',
        previousProgress: 75,
        newProgress: 100,
      },
    ];

    return (
      <ProgressHistoryChart
        data={data}
        significantChanges={significantChanges}
        height={400}
        showGrid={true}
        showTooltip={true}
        highlightSignificantChanges={true}
        colors={{
          line: '#10b981',
          significant: '#f59e0b',
        }}
      />
    );
  },
};

// 停滞期間のある進捗
export const ProgressWithPlateau: Story = {
  render: () => {
    const data: ProgressHistoryEntry[] = [];
    const totalDays = 40;

    for (let i = 0; i < totalDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (totalDays - 1 - i));

      let progress: number;
      if (i < 10) {
        // 最初の10日は順調に進捗
        progress = (i / 10) * 40;
      } else if (i < 25) {
        // 15日間停滞
        progress = 40 + Math.random() * 5 - 2.5; // 40%前後で停滞
      } else {
        // 残りの期間で急激に進捗
        progress = 40 + ((i - 25) / (totalDays - 25)) * 60;
      }

      data.push({
        id: `entry-${i}`,
        entityId: 'goal-plateau',
        entityType: 'goal',
        progress: Math.max(0, Math.min(100, Math.round(progress * 10) / 10)),
        timestamp: date,
        changeReason: i === 10 ? '停滞期開始' : i === 25 ? '再加速' : undefined,
      });
    }

    const significantChanges: SignificantChange[] = [
      {
        id: 'plateau-start',
        entityId: 'goal-plateau',
        date: data[10].timestamp,
        change: -5,
        reason: '停滞期に入る',
        previousProgress: 40,
        newProgress: 35,
      },
      {
        id: 'acceleration',
        entityId: 'goal-plateau',
        date: data[25].timestamp,
        change: 15,
        reason: '再加速開始',
        previousProgress: 40,
        newProgress: 55,
      },
    ];

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">停滞期間のある進捗パターン</h3>
          <p className="text-sm text-gray-600">初期の順調な進捗 → 停滞期 → 再加速</p>
        </div>
        <ProgressHistoryChart
          data={data}
          significantChanges={significantChanges}
          height={350}
          showGrid={true}
          showTooltip={true}
          highlightSignificantChanges={true}
        />
      </div>
    );
  },
};

// 複数の進捗パターン比較
export const MultiplePatterns: Story = {
  render: () => {
    const steadyData = generateProgressHistory(30, 0).map(entry => ({
      ...entry,
      progress: Math.min(100, entry.progress * 0.5 + (entry.progress / 30) * 100),
    }));

    const volatileData = generateProgressHistory(30, 20);

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium mb-2">安定した進捗パターン</h3>
          <ProgressHistoryChart
            data={steadyData}
            height={250}
            colors={{ line: '#10b981' }}
            showGrid={true}
            showTooltip={true}
          />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">変動の激しい進捗パターン</h3>
          <ProgressHistoryChart
            data={volatileData}
            significantChanges={generateSignificantChanges(volatileData)}
            height={250}
            colors={{ line: '#ef4444', significant: '#f59e0b' }}
            showGrid={true}
            showTooltip={true}
            highlightSignificantChanges={true}
          />
        </div>
      </div>
    );
  },
};

// インタラクティブな例
const InteractiveComponent = () => {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedProgress, setSelectedProgress] = React.useState<number | null>(null);

  const historyData = generateProgressHistory(21, 30);
  const significantChanges = generateSignificantChanges(historyData);

  const handleDateClick = (date: Date, progress: number) => {
    setSelectedDate(date);
    setSelectedProgress(progress);
  };

  return (
    <div className="space-y-4">
      <ProgressHistoryChart
        data={historyData}
        significantChanges={significantChanges}
        height={300}
        showGrid={true}
        showTooltip={true}
        highlightSignificantChanges={true}
        onDateClick={handleDateClick}
      />

      {selectedDate && selectedProgress !== null && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900">選択された日付の詳細</h4>
          <p className="text-sm text-blue-700 mt-1">
            日付: {selectedDate.toLocaleDateString('ja-JP')}
          </p>
          <p className="text-sm text-blue-700">進捗: {selectedProgress}%</p>
        </div>
      )}
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveComponent />,
};

// レスポンシブ対応
export const Responsive: Story = {
  render: () => {
    const data = generateProgressHistory(30, 25);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">デスクトップサイズ</h3>
          <div className="w-full max-w-4xl">
            <ProgressHistoryChart
              data={data}
              height={350}
              showGrid={true}
              showTooltip={true}
              dateFormat="MM/dd"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">タブレットサイズ</h3>
          <div className="w-full max-w-2xl">
            <ProgressHistoryChart
              data={data}
              height={300}
              showGrid={true}
              showTooltip={true}
              dateFormat="M/d"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">モバイルサイズ</h3>
          <div className="w-full max-w-sm">
            <ProgressHistoryChart
              data={data}
              height={250}
              showGrid={false}
              showTooltip={true}
              dateFormat="M/d"
            />
          </div>
        </div>
      </div>
    );
  },
};

// 実用的な使用例
export const RealWorldExample: Story = {
  render: () => {
    // 英語学習の進捗データ（3ヶ月間）
    const data: ProgressHistoryEntry[] = [
      {
        id: '1',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 0,
        timestamp: new Date('2024-01-01'),
        changeReason: '学習開始',
      },
      {
        id: '2',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 5,
        timestamp: new Date('2024-01-07'),
      },
      {
        id: '3',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 12,
        timestamp: new Date('2024-01-14'),
      },
      {
        id: '4',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 18,
        timestamp: new Date('2024-01-21'),
      },
      {
        id: '5',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 25,
        timestamp: new Date('2024-01-28'),
        changeReason: '第1マイルストーン達成',
      },
      {
        id: '6',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 30,
        timestamp: new Date('2024-02-04'),
      },
      {
        id: '7',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 28,
        timestamp: new Date('2024-02-11'),
        changeReason: '体調不良で一時停滞',
      },
      {
        id: '8',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 35,
        timestamp: new Date('2024-02-18'),
      },
      {
        id: '9',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 42,
        timestamp: new Date('2024-02-25'),
      },
      {
        id: '10',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 50,
        timestamp: new Date('2024-03-04'),
        changeReason: '中間目標達成',
      },
      {
        id: '11',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 58,
        timestamp: new Date('2024-03-11'),
      },
      {
        id: '12',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 65,
        timestamp: new Date('2024-03-18'),
      },
      {
        id: '13',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 72,
        timestamp: new Date('2024-03-25'),
      },
      {
        id: '14',
        entityId: 'english-goal',
        entityType: 'goal',
        progress: 80,
        timestamp: new Date('2024-04-01'),
        changeReason: 'TOEIC模試で高得点',
      },
    ];

    const significantChanges: SignificantChange[] = [
      {
        id: 'milestone-1',
        entityId: 'english-goal',
        date: new Date('2024-01-28'),
        change: 25,
        reason: '基礎文法完了',
        previousProgress: 0,
        newProgress: 25,
      },
      {
        id: 'setback',
        entityId: 'english-goal',
        date: new Date('2024-02-11'),
        change: -2,
        reason: '体調不良による学習停滞',
        previousProgress: 30,
        newProgress: 28,
      },
      {
        id: 'milestone-2',
        entityId: 'english-goal',
        date: new Date('2024-03-04'),
        change: 15,
        reason: '語彙力大幅向上',
        previousProgress: 35,
        newProgress: 50,
      },
      {
        id: 'breakthrough',
        entityId: 'english-goal',
        date: new Date('2024-04-01'),
        change: 15,
        reason: 'TOEIC模試で目標スコア達成',
        previousProgress: 65,
        newProgress: 80,
      },
    ];

    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">英語学習の進捗履歴</h2>
          <p className="text-gray-600">2024年1月〜4月の学習記録</p>
        </div>

        <ProgressHistoryChart
          data={data}
          significantChanges={significantChanges}
          height={400}
          showGrid={true}
          showTooltip={true}
          highlightSignificantChanges={true}
          colors={{
            line: '#3b82f6',
            significant: '#f59e0b',
            grid: '#e5e7eb',
          }}
          onDateClick={(date, progress) => {
            console.log(`詳細表示: ${date.toLocaleDateString()} - ${progress}%`);
          }}
        />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">現在の進捗</h3>
            <p className="text-2xl font-bold text-blue-600">80%</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">重要な変化</h3>
            <p className="text-2xl font-bold text-green-600">{significantChanges.length}回</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">学習期間</h3>
            <p className="text-2xl font-bold text-purple-600">3ヶ月</p>
          </div>
        </div>
      </div>
    );
  },
};
