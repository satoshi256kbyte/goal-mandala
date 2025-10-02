import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from '../components/forms/FormField';

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'フィールドのラベル',
    },
    required: {
      control: 'boolean',
      description: '必須フィールドかどうか',
    },
    error: {
      control: 'text',
      description: 'エラーメッセージ',
    },
    helpText: {
      control: 'text',
      description: 'ヘルプテキスト',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'フィールドラベル',
    children: React.createElement('input', {
      type: 'text',
      className: 'w-full px-3 py-2 border border-gray-300 rounded-md',
      placeholder: '入力してください',
    }),
  },
};

export const Required: Story = {
  args: {
    label: '必須フィールド',
    required: true,
    children: React.createElement('input', {
      type: 'text',
      className: 'w-full px-3 py-2 border border-gray-300 rounded-md',
      placeholder: '必須項目です',
    }),
  },
};

export const WithError: Story = {
  args: {
    label: 'エラーのあるフィールド',
    required: true,
    error: 'この項目は必須です',
    children: React.createElement('input', {
      type: 'text',
      className: 'w-full px-3 py-2 border border-red-300 rounded-md',
      placeholder: 'エラー状態',
    }),
  },
};

export const WithHelpText: Story = {
  args: {
    label: 'ヘルプテキスト付きフィールド',
    helpText: '100文字以内で入力してください',
    children: React.createElement('input', {
      type: 'text',
      className: 'w-full px-3 py-2 border border-gray-300 rounded-md',
      placeholder: 'ヘルプテキスト付き',
    }),
  },
};

export const Complete: Story = {
  args: {
    label: '完全なフィールド例',
    required: true,
    helpText: 'すべての要素が含まれたフィールドの例です',
    children: React.createElement('textarea', {
      className: 'w-full px-3 py-2 border border-gray-300 rounded-md',
      rows: 3,
      placeholder: '完全な例',
    }),
  },
};
