import type { Meta, StoryObj } from '@storybook/react';
import { GoalInputForm } from '../components/forms/GoalInputForm';
import type { GoalFormData } from '../types/goal';

const meta: Meta<typeof GoalInputForm> = {
  title: 'Forms/GoalInputForm',
  component: GoalInputForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'form submitted' },
    onDraftSave: { action: 'draft saved' },
    isSubmitting: {
      control: 'boolean',
      description: '送信中フラグ',
    },
    isDraftSaving: {
      control: 'boolean',
      description: '下書き保存中フラグ',
    },
    error: {
      control: 'text',
      description: 'エラーメッセージ',
    },
    successMessage: {
      control: 'text',
      description: '成功メッセージ',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
      // 送信処理のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
      // 保存処理のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

export const WithInitialData: Story = {
  args: {
    initialData: {
      title: 'プログラミングスキルの向上',
      description:
        'フルスタック開発者として必要なスキルを身につけ、より複雑なプロジェクトに取り組めるようになる',
      deadline: '2024-12-31',
      background:
        '現在のスキルレベルでは対応できないプロジェクトが増えてきており、キャリアアップのためにスキル向上が必要',
      constraints: '平日は仕事があるため、学習時間は限られている',
    },
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
};

export const DraftSaving: Story = {
  args: {
    isDraftSaving: true,
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
};

export const WithError: Story = {
  args: {
    error: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
};

export const WithSuccess: Story = {
  args: {
    successMessage: '下書きが正常に保存されました。',
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
};

export const Mobile: Story = {
  args: {
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const Tablet: Story = {
  args: {
    onSubmit: async (data: GoalFormData) => {
      console.log('フォーム送信:', data);
    },
    onDraftSave: async (data: Partial<GoalFormData>) => {
      console.log('下書き保存:', data);
    },
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
