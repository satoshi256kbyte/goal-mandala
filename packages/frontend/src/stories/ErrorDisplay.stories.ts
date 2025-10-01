import type { Meta, StoryObj } from '@storybook/react';
import { ErrorDisplay } from '../components/forms/ErrorDisplay';

const meta: Meta<typeof ErrorDisplay> = {
  title: 'Forms/ErrorDisplay',
  component: ErrorDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    error: {
      control: 'text',
      description: 'エラーメッセージ',
    },
    onRetry: { action: 'retry clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NetworkError: Story = {
  args: {
    error: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    onRetry: () => console.log('再試行クリック'),
  },
};

export const ValidationError: Story = {
  args: {
    error: '入力内容に問題があります。必須項目をすべて入力してください。',
  },
};

export const ServerError: Story = {
  args: {
    error: 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。',
    onRetry: () => console.log('再試行クリック'),
  },
};

export const LongError: Story = {
  args: {
    error:
      'これは非常に長いエラーメッセージの例です。複数行にわたって表示される場合があり、ユーザーにとって読みやすい形で表示される必要があります。エラーの詳細な説明が含まれている場合もあります。',
    onRetry: () => console.log('再試行クリック'),
  },
};

export const NoError: Story = {
  args: {
    error: null,
  },
};
