import type { Meta, StoryObj } from '@storybook/react';
import { SubmitButton } from '../components/forms/SubmitButton';

const meta: Meta<typeof SubmitButton> = {
  title: 'Forms/SubmitButton',
  component: SubmitButton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'ボタンテキスト',
    },
    isSubmitting: {
      control: 'boolean',
      description: '送信中フラグ',
    },
    disabled: {
      control: 'boolean',
      description: '無効化フラグ',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'AI生成開始',
  },
};

export const Submitting: Story = {
  args: {
    children: 'AI生成開始',
    isSubmitting: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'AI生成開始',
    disabled: true,
  },
};

export const CustomText: Story = {
  args: {
    children: '保存する',
  },
};

export const LongText: Story = {
  args: {
    children: 'マンダラチャートの生成を開始する',
  },
};
