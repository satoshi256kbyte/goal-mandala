import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './ProgressBar';
import { ProgressCalculationError } from '../../types/progress-errors';

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/Common/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '進捗値を視覚的に表示するプログレスバーコンポーネント。進捗値に応じた色分け、サイズバリエーション、ツールチップ機能を提供します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: '進捗値（0-100）',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'プログレスバーのサイズ',
    },
    showLabel: {
      control: { type: 'boolean' },
      description: '進捗値ラベルの表示・非表示',
    },
    animated: {
      control: { type: 'boolean' },
      description: 'アニメーション効果の有効・無効',
    },
    colorScheme: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger', 'custom', 'accessible'],
      description: 'カラースキーム',
    },
    tooltip: {
      control: { type: 'text' },
      description: 'ツールチップテキスト',
    },
    highContrast: {
      control: { type: 'boolean' },
      description: 'ハイコントラストモード',
    },
    colorBlindFriendly: {
      control: { type: 'boolean' },
      description: 'カラーブラインドネス対応モード',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'ローディング状態',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な使用例
export const Default: Story = {
  args: {
    value: 50,
    size: 'medium',
    showLabel: false,
    animated: true,
    colorScheme: 'default',
  },
};

// ラベル付き
export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true,
    tooltip: '現在の進捗状況',
  },
};

// サイズバリエーション
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <p className="text-sm text-gray-600 mb-2">Small</p>
        <ProgressBar value={30} size="small" showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Medium (Default)</p>
        <ProgressBar value={60} size="medium" showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Large</p>
        <ProgressBar value={90} size="large" showLabel={true} />
      </div>
    </div>
  ),
};

// 進捗値による色分け
export const ColorByProgress: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <p className="text-sm text-gray-600 mb-2">未開始 (0%)</p>
        <ProgressBar value={0} showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">低進捗 (25%)</p>
        <ProgressBar value={25} showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">中進捗 (65%)</p>
        <ProgressBar value={65} showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">高進捗 (90%)</p>
        <ProgressBar value={90} showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">完了 (100%)</p>
        <ProgressBar value={100} showLabel={true} />
      </div>
    </div>
  ),
};

// カラースキーム
export const ColorSchemes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <p className="text-sm text-gray-600 mb-2">Default</p>
        <ProgressBar value={75} colorScheme="default" showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Success</p>
        <ProgressBar value={75} colorScheme="success" showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Warning</p>
        <ProgressBar value={75} colorScheme="warning" showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Danger</p>
        <ProgressBar value={75} colorScheme="danger" showLabel={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Accessible</p>
        <ProgressBar value={75} colorScheme="accessible" showLabel={true} />
      </div>
    </div>
  ),
};

// カスタムカラー
export const CustomColors: Story = {
  args: {
    value: 75,
    colorScheme: 'custom',
    customColors: {
      background: '#f3f4f6',
      fill: '#8b5cf6',
      text: '#374151',
      progressColors: {
        zero: '#6b7280',
        low: '#3b82f6',
        medium: '#8b5cf6',
        high: '#10b981',
      },
    },
    showLabel: true,
  },
};

// アクセシビリティ対応
export const Accessibility: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <p className="text-sm text-gray-600 mb-2">ハイコントラストモード</p>
        <ProgressBar
          value={75}
          highContrast={true}
          showLabel={true}
          aria-label="プロジェクトの進捗"
        />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">カラーブラインドネス対応</p>
        <ProgressBar
          value={75}
          colorBlindFriendly={true}
          showLabel={true}
          aria-label="タスクの完了状況"
        />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">両方対応</p>
        <ProgressBar
          value={75}
          highContrast={true}
          colorBlindFriendly={true}
          showLabel={true}
          aria-label="目標達成率"
        />
      </div>
    </div>
  ),
};

// ツールチップ付き
export const WithTooltip: Story = {
  args: {
    value: 65,
    showLabel: true,
    tooltip: '現在の進捗: 13/20 タスク完了',
  },
};

// 高度なツールチップ
export const AdvancedTooltip: Story = {
  args: {
    value: 80,
    showLabel: true,
    tooltipConfig: {
      position: 'top',
      delay: 300,
      touchEnabled: true,
      content: (
        <div>
          <h4 className="font-medium text-white">詳細な進捗情報</h4>
          <p className="text-sm text-gray-200 mt-1">完了: 16/20 タスク</p>
          <p className="text-sm text-gray-200">残り: 4 タスク</p>
          <p className="text-sm text-gray-200">予定完了: 2024年12月31日</p>
        </div>
      ),
    },
  },
};

// 進捗専用ツールチップ
export const ProgressTooltip: Story = {
  args: {
    value: 75,
    showLabel: true,
    progressTooltip: {
      previousValue: 60,
      targetValue: 100,
      completedTasks: 15,
      totalTasks: 20,
      lastUpdated: new Date(),
      estimatedCompletion: new Date('2024-12-31'),
      progressType: 'goal',
      showDetails: true,
    },
  },
};

// ローディング状態
export const Loading: Story = {
  args: {
    value: 0,
    loading: true,
    showLabel: true,
  },
};

// エラー状態
export const ErrorState: Story = {
  args: {
    value: -2,
    showLabel: true,
    error: {
      hasError: true,
      errorType: ProgressCalculationError.CALCULATION_TIMEOUT,
      errorMessage: '進捗の計算がタイムアウトしました',
      showRetry: true,
      onRetry: () => {
        console.log('再試行が実行されました');
      },
    },
  },
};

// 計算中状態
export const Calculating: Story = {
  args: {
    value: -1,
    showLabel: true,
  },
};

// アニメーション無効
export const NoAnimation: Story = {
  args: {
    value: 75,
    animated: false,
    showLabel: true,
  },
};

// インタラクティブな例
const InteractiveComponent = () => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 1;
        return next > 100 ? 0 : next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-80">
      <p className="text-sm text-gray-600 mb-2">自動進行するプログレスバー</p>
      <ProgressBar
        value={progress}
        showLabel={true}
        onAchievement={() => {
          console.log('100%達成！');
        }}
        onProgressChange={(newValue, previousValue) => {
          console.log(`進捗変化: ${previousValue}% → ${newValue}%`);
        }}
      />
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveComponent />,
};

// 複数のプログレスバー
export const Multiple: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div>
        <h3 className="text-lg font-medium mb-4">プロジェクト進捗</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>フロントエンド開発</span>
              <span>85%</span>
            </div>
            <ProgressBar value={85} />
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>バックエンド開発</span>
              <span>70%</span>
            </div>
            <ProgressBar value={70} />
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>テスト実装</span>
              <span>45%</span>
            </div>
            <ProgressBar value={45} />
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>ドキュメント作成</span>
              <span>20%</span>
            </div>
            <ProgressBar value={20} />
          </div>
        </div>
      </div>
    </div>
  ),
};

// 実用的な使用例
export const RealWorldExample: Story = {
  render: () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">目標達成状況</h2>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">英語学習マスター</h3>
          <ProgressBar
            value={78}
            size="large"
            showLabel={true}
            progressTooltip={{
              completedTasks: 39,
              totalTasks: 50,
              lastUpdated: new Date(),
              progressType: 'goal',
              showDetails: true,
            }}
          />
          <p className="text-sm text-gray-600 mt-2">残り11タスク • 予定完了: 2024年12月</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded">
            <h4 className="text-sm font-medium mb-2">単語学習</h4>
            <ProgressBar value={90} colorScheme="success" />
          </div>
          <div className="p-3 bg-yellow-50 rounded">
            <h4 className="text-sm font-medium mb-2">文法練習</h4>
            <ProgressBar value={65} colorScheme="warning" />
          </div>
        </div>
      </div>
    </div>
  ),
};
