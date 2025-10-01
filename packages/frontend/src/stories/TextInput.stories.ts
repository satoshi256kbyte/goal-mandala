import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { TextInput } from '../components/forms/TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'Forms/TextInput',
  component: TextInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    Story => {
      const { register } = useForm();
      return Story({ args: { register } });
    },
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'title',
    placeholder: '目標を入力してください',
  },
};

export const WithCounter: Story = {
  args: {
    name: 'title',
    placeholder: '目標を入力してください',
    maxLength: 100,
    showCounter: true,
  },
};

export const WithError: Story = {
  args: {
    name: 'title',
    placeholder: '目標を入力してください',
    maxLength: 100,
    showCounter: true,
    error: {
      type: 'required',
      message: 'この項目は必須です',
    },
  },
};

export const Disabled: Story = {
  args: {
    name: 'title',
    placeholder: '無効化された入力フィールド',
    disabled: true,
  },
};

export const LongText: Story = {
  args: {
    name: 'title',
    placeholder: '長いテキストの例',
    maxLength: 50,
    showCounter: true,
  },
};
