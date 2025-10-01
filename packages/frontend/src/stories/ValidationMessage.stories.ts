import type { Meta, StoryObj } from '@storybook/react';
import { ValidationMessage } from '../components/forms/ValidationMessage';

const meta: Meta<typeof ValidationMessage> = {
  title: 'Forms/ValidationMessage',
  component: ValidationMessage,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'メッセージ内容',
    },
    type: {
      control: { type: 'select' },
      options: ['error', 'warning', 'info'],
      description: 'メッセージタイプ',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    message: 'この項目は必須です',
    type: 'error',
  },
};

export const Warning: Story = {
  args: {
    message: '文字数制限に近づいています',
    type: 'warning',
  },
};

export const Info: Story = {
  args: {
    message: '100文字以内で入力してください',
    type: 'info',
  },
};

export const LongMessage: Story = {
  args: {
    message:
      'これは非常に長いエラーメッセージの例です。複数行にわたって表示される場合の見た目を確認するためのものです。',
    type: 'error',
  },
};

export const NoMessage: Story = {
  args: {
    message: undefined,
  },
};
