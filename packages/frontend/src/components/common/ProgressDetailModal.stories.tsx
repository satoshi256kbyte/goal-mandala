/**
 * ProgressDetailModal コンポーネントのStorybook
 * 要件: 5.3
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ProgressDetailModal } from './ProgressDetailModal';
import { ProgressHistoryEntry } from '../../services/progress-history-service';

const meta: Meta<typeof ProgressDetailModal> = {
  title: 'Components/Common/ProgressDetailModal',
  component: ProgressDetailModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '進捗履歴の特定日付の詳細情報を表示するモーダルコンポーネント',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'モーダルの表示状態',
    },
    selectedDate: {
      control: 'date',
      description: '選択された日付',
    },
    selectedProgress: {
      control: { type: 'number', min: 0, max: 100 },
      description: '選択された日付の進捗値',
    },
    progressHistory: {
      control: 'object',
      description: '進捗履歴データ',
    },
    significantChanges: {
      control: 'object',
      description: '重要な変化点データ',
    },
    onClose: {
      action: 'closed',
      description: 'モーダルを閉じる時のコールバック',
    },
    className: {
      control: 'text',
      description: '追加のCSSクラス',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ
const sampleProgressHistory: ProgressHistoryEntry[] = [
  {
    id: '1',
    entityId: 'goal-1',
    entityType: 'goal',
    progress: 20,
    timestamp: new Date('2024-01-13T10:00:00Z'),
  },
  {
    id: '2',
    entityId: 'goal-1',
    entityType: 'goal',
    progress: 45,
    timestamp: new Date('2024-01-14T10:00:00Z'),
  },
  {
    id: '3',
    entityId: 'goal-1',
    entityType: 'goal',
    progress: 75,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    changeReason: '重要なタスクの完了により大幅に進捗',
  },
];

const sampleSignificantChanges: SignificantChange[] = [
  {
    date: new Date('2024-01-15T10:30:00Z'),
    progress: 75,
    change: 30,
    reason: '重要なマイルストーン達成',
  },
];

/**
 * 基本的な使用例
 */
export const Default: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 75,
    progressHistory: sampleProgressHistory,
    significantChanges: sampleSignificantChanges,
  },
};

/**
 * 重要な変化がない場合
 */
export const WithoutSignificantChange: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-14T10:00:00Z'),
    selectedProgress: 45,
    progressHistory: sampleProgressHistory,
    significantChanges: [],
  },
};

/**
 * 進捗が減少した場合
 */
export const WithProgressDecrease: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 30,
    progressHistory: [
      {
        id: '1',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 60,
        timestamp: new Date('2024-01-14T10:00:00Z'),
      },
      {
        id: '2',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 30,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        changeReason: '一部タスクの見直しにより進捗調整',
      },
    ],
    significantChanges: [
      {
        date: new Date('2024-01-15T10:30:00Z'),
        progress: 30,
        change: -30,
        reason: 'タスクの見直しによる調整',
      },
    ],
  },
};

/**
 * 進捗0%の場合
 */
export const WithZeroProgress: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-01T10:00:00Z'),
    selectedProgress: 0,
    progressHistory: [
      {
        id: '1',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 0,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        changeReason: '目標設定完了',
      },
    ],
    significantChanges: [],
  },
};

/**
 * 進捗100%の場合
 */
export const WithCompleteProgress: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-31T15:00:00Z'),
    selectedProgress: 100,
    progressHistory: [
      {
        id: '1',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 95,
        timestamp: new Date('2024-01-30T10:00:00Z'),
      },
      {
        id: '2',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 100,
        timestamp: new Date('2024-01-31T15:00:00Z'),
        changeReason: '全タスク完了により目標達成',
      },
    ],
    significantChanges: [
      {
        date: new Date('2024-01-31T15:00:00Z'),
        progress: 100,
        change: 5,
        reason: '目標達成',
      },
    ],
  },
};

/**
 * 前日のデータがない場合
 */
export const WithoutPreviousDay: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-01T10:00:00Z'),
    selectedProgress: 25,
    progressHistory: [
      {
        id: '1',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 25,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        changeReason: '初回進捗記録',
      },
    ],
    significantChanges: [],
  },
};

/**
 * 変更理由がない場合
 */
export const WithoutChangeReason: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 50,
    progressHistory: [
      {
        id: '1',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 30,
        timestamp: new Date('2024-01-14T10:00:00Z'),
      },
      {
        id: '2',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        // changeReason なし
      },
    ],
    significantChanges: [
      {
        date: new Date('2024-01-15T10:30:00Z'),
        progress: 50,
        change: 20,
        // reason なし
      },
    ],
  },
};

/**
 * カスタムスタイル適用
 */
export const WithCustomStyle: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 75,
    progressHistory: sampleProgressHistory,
    significantChanges: sampleSignificantChanges,
    className: 'border-4 border-blue-500',
  },
};

/**
 * 閉じた状態（表示されない）
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 75,
    progressHistory: sampleProgressHistory,
    significantChanges: sampleSignificantChanges,
  },
  parameters: {
    docs: {
      description: {
        story: 'isOpen=falseの場合、モーダルは表示されません。',
      },
    },
  },
};

/**
 * インタラクションテスト用
 */
export const Interactive: Story = {
  args: {
    isOpen: true,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 75,
    progressHistory: sampleProgressHistory,
    significantChanges: sampleSignificantChanges,
  },
  parameters: {
    docs: {
      description: {
        story: '閉じるボタンや背景クリックでモーダルを閉じることができます。',
      },
    },
  },
};
