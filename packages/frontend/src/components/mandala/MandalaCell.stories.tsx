import type { Meta, StoryObj } from '@storybook/react';
import MandalaCell from './MandalaCell';
import { CellData, Position } from '../../types';

const meta: Meta<typeof MandalaCell> = {
  title: 'Components/Mandala/MandalaCell',
  component: MandalaCell,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'マンダラチャートのセルコンポーネント。進捗に応じた色分け表示、アニメーション効果、アクセシビリティ対応を提供します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    cellData: {
      description: 'セルのデータ（タイトル、進捗、タイプなど）',
    },
    position: {
      description: 'セルの位置（行・列）',
    },
    editable: {
      control: { type: 'boolean' },
      description: '編集可能かどうか',
    },
    colorBlindFriendly: {
      control: { type: 'boolean' },
      description: 'カラーブラインドネス対応モード',
    },
    highContrast: {
      control: { type: 'boolean' },
      description: 'ハイコントラストモード',
    },
    darkMode: {
      control: { type: 'boolean' },
      description: 'ダークモード',
    },
    disableAnimation: {
      control: { type: 'boolean' },
      description: 'アニメーション無効化',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なセルデータ
const createCellData = (
  type: 'goal' | 'subgoal' | 'action' | 'empty',
  title: string,
  progress: number,
  status?: 'execution' | 'habit'
): CellData => ({
  id: `${type}-${Math.random()}`,
  type,
  title,
  progress,
  status,
});

const defaultPosition: Position = { row: 1, col: 1 };

// 基本的な目標セル
export const GoalCell: Story = {
  args: {
    cellData: createCellData('goal', '英語をマスターする', 75),
    position: defaultPosition,
    editable: false,
    onClick: cellData => console.log('Goal clicked:', cellData),
    onEdit: cellData => console.log('Goal edit:', cellData),
  },
};

// サブ目標セル
export const SubGoalCell: Story = {
  args: {
    cellData: createCellData('subgoal', 'TOEIC 800点取得', 60),
    position: defaultPosition,
    editable: false,
    onClick: cellData => console.log('SubGoal clicked:', cellData),
    onEdit: cellData => console.log('SubGoal edit:', cellData),
  },
};

// アクションセル（実行タイプ）
export const ExecutionActionCell: Story = {
  args: {
    cellData: createCellData('action', '単語帳を完了する', 45, 'execution'),
    position: defaultPosition,
    editable: false,
    onClick: cellData => console.log('Action clicked:', cellData),
    onEdit: cellData => console.log('Action edit:', cellData),
  },
};

// アクションセル（習慣タイプ）
export const HabitActionCell: Story = {
  args: {
    cellData: createCellData('action', '毎日30分英語学習', 80, 'habit'),
    position: defaultPosition,
    editable: false,
    onClick: cellData => console.log('Habit clicked:', cellData),
    onEdit: cellData => console.log('Habit edit:', cellData),
  },
};

// 空のセル
export const EmptyCell: Story = {
  args: {
    cellData: createCellData('empty', '', 0),
    position: defaultPosition,
    editable: true,
    onClick: cellData => console.log('Empty cell clicked:', cellData),
    onEdit: cellData => console.log('Empty cell edit:', cellData),
  },
};

// 進捗による色分け表示
export const ProgressColorVariations: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-4 p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">未開始 (0%)</p>
        <MandalaCell
          cellData={createCellData('action', '未開始タスク', 0)}
          position={defaultPosition}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">低進捗 (25%)</p>
        <MandalaCell
          cellData={createCellData('action', '開始したばかり', 25)}
          position={defaultPosition}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">中進捗 (65%)</p>
        <MandalaCell
          cellData={createCellData('action', '順調に進行中', 65)}
          position={defaultPosition}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">高進捗 (90%)</p>
        <MandalaCell
          cellData={createCellData('action', 'もうすぐ完了', 90)}
          position={defaultPosition}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">完了 (100%)</p>
        <MandalaCell
          cellData={createCellData('action', '完了済み', 100)}
          position={defaultPosition}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
    </div>
  ),
};

// アクセシビリティ対応
export const AccessibilityFeatures: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6 p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">通常モード</p>
        <MandalaCell
          cellData={createCellData('subgoal', '通常表示', 75)}
          position={defaultPosition}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">ハイコントラスト</p>
        <MandalaCell
          cellData={createCellData('subgoal', 'ハイコントラスト', 75)}
          position={defaultPosition}
          editable={false}
          highContrast={true}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">カラーブラインドネス対応</p>
        <MandalaCell
          cellData={createCellData('subgoal', 'カラーブラインドネス対応', 75)}
          position={defaultPosition}
          editable={false}
          colorBlindFriendly={true}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
    </div>
  ),
};

// ダークモード
export const DarkMode: Story = {
  render: () => (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2">目標</p>
          <MandalaCell
            cellData={createCellData('goal', 'ダークモード目標', 85)}
            position={defaultPosition}
            editable={false}
            darkMode={true}
            onClick={() => {}}
            onEdit={() => {}}
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2">サブ目標</p>
          <MandalaCell
            cellData={createCellData('subgoal', 'ダークモードサブ目標', 60)}
            position={defaultPosition}
            editable={false}
            darkMode={true}
            onClick={() => {}}
            onEdit={() => {}}
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2">アクション</p>
          <MandalaCell
            cellData={createCellData('action', 'ダークモードアクション', 40)}
            position={defaultPosition}
            editable={false}
            darkMode={true}
            onClick={() => {}}
            onEdit={() => {}}
          />
        </div>
      </div>
    </div>
  ),
};

// カスタムカラー
export const CustomColors: Story = {
  args: {
    cellData: createCellData('action', 'カスタムカラー', 75),
    position: defaultPosition,
    editable: false,
    customColors: {
      zero: '#6b7280',
      low: '#8b5cf6',
      medium: '#06b6d4',
      high: '#10b981',
      complete: '#059669',
    },
    onClick: cellData => console.log('Custom color clicked:', cellData),
    onEdit: cellData => console.log('Custom color edit:', cellData),
  },
};

// 編集可能なセル
export const EditableCell: Story = {
  args: {
    cellData: createCellData('action', '編集可能なアクション', 50),
    position: defaultPosition,
    editable: true,
    onClick: cellData => console.log('Editable clicked:', cellData),
    onEdit: cellData => console.log('Edit triggered:', cellData),
    onDragStart: position => console.log('Drag start:', position),
    onDragEnd: position => console.log('Drag end:', position),
  },
};

// アニメーション無効
export const NoAnimation: Story = {
  args: {
    cellData: createCellData('action', 'アニメーション無効', 75),
    position: defaultPosition,
    editable: false,
    disableAnimation: true,
    onClick: cellData => console.log('No animation clicked:', cellData),
    onEdit: cellData => console.log('No animation edit:', cellData),
  },
};

// 達成アニメーション
const AchievementComponent = () => {
  const [progress, setProgress] = React.useState(95);

  const handleAchievement = (cellData: CellData) => {
    console.log('Achievement unlocked!', cellData);
  };

  const triggerAchievement = () => {
    setProgress(100);
  };

  return (
    <div className="text-center p-4">
      <p className="text-sm text-gray-600 mb-4">ボタンをクリックして100%達成アニメーションを見る</p>
      <MandalaCell
        cellData={createCellData('goal', '達成アニメーション', progress)}
        position={defaultPosition}
        editable={false}
        onAchievement={handleAchievement}
        onClick={() => {}}
        onEdit={() => {}}
      />
      <button
        onClick={triggerAchievement}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        100%達成
      </button>
    </div>
  );
};

export const AchievementAnimation: Story = {
  render: () => <AchievementComponent />,
};

// セルタイプ別の表示
export const CellTypes: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 p-4">
      <div>
        <h3 className="text-lg font-medium mb-4">実行アクション</h3>
        <div className="space-y-2">
          <MandalaCell
            cellData={createCellData('action', 'プレゼン資料作成', 30, 'execution')}
            position={defaultPosition}
            editable={false}
            onClick={() => {}}
            onEdit={() => {}}
          />
          <MandalaCell
            cellData={createCellData('action', 'システム設計書作成', 80, 'execution')}
            position={defaultPosition}
            editable={false}
            onClick={() => {}}
            onEdit={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-medium mb-4">習慣アクション</h3>
        <div className="space-y-2">
          <MandalaCell
            cellData={createCellData('action', '毎日読書30分', 65, 'habit')}
            position={defaultPosition}
            editable={false}
            onClick={() => {}}
            onEdit={() => {}}
          />
          <MandalaCell
            cellData={createCellData('action', '週3回ジョギング', 90, 'habit')}
            position={defaultPosition}
            editable={false}
            onClick={() => {}}
            onEdit={() => {}}
          />
        </div>
      </div>
    </div>
  ),
};

// 実用的なマンダラチャート例
export const RealWorldExample: Story = {
  render: () => (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-center">英語学習マンダラチャート</h2>
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {/* 上段 */}
        <MandalaCell
          cellData={createCellData('action', '文法書完読', 70, 'execution')}
          position={{ row: 0, col: 0 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
        <MandalaCell
          cellData={createCellData('subgoal', '基礎文法習得', 65)}
          position={{ row: 0, col: 1 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
        <MandalaCell
          cellData={createCellData('action', '練習問題解答', 60, 'execution')}
          position={{ row: 0, col: 2 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />

        {/* 中段 */}
        <MandalaCell
          cellData={createCellData('subgoal', '語彙力向上', 80)}
          position={{ row: 1, col: 0 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
        <MandalaCell
          cellData={createCellData('goal', '英語マスター', 75)}
          position={{ row: 1, col: 1 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
        <MandalaCell
          cellData={createCellData('subgoal', 'リスニング強化', 55)}
          position={{ row: 1, col: 2 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />

        {/* 下段 */}
        <MandalaCell
          cellData={createCellData('action', '毎日単語学習', 85, 'habit')}
          position={{ row: 2, col: 0 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
        <MandalaCell
          cellData={createCellData('subgoal', 'スピーキング練習', 40)}
          position={{ row: 2, col: 1 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
        <MandalaCell
          cellData={createCellData('action', 'ポッドキャスト視聴', 50, 'habit')}
          position={{ row: 2, col: 2 }}
          editable={false}
          onClick={() => {}}
          onEdit={() => {}}
        />
      </div>
    </div>
  ),
};

// インタラクティブな例
const InteractiveComponent = () => {
  const [cellData, setCellData] = React.useState(
    createCellData('action', 'クリックして進捗を変更', 0)
  );

  const handleClick = () => {
    setCellData(prev => ({
      ...prev,
      progress: Math.min(prev.progress + 25, 100),
    }));
  };

  const reset = () => {
    setCellData(prev => ({
      ...prev,
      progress: 0,
    }));
  };

  return (
    <div className="text-center p-4">
      <p className="text-sm text-gray-600 mb-4">セルをクリックして進捗を25%ずつ増加</p>
      <MandalaCell
        cellData={cellData}
        position={defaultPosition}
        editable={false}
        onClick={handleClick}
        onEdit={() => {}}
        onAchievement={data => {
          console.log('Achievement!', data);
          alert('100%達成おめでとうございます！');
        }}
      />
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
      >
        リセット
      </button>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveComponent />,
};
