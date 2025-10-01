import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { TextArea } from '../components/forms/TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'Forms/TextArea',
  component: TextArea,
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
    name: 'description',
    placeholder: '目標の詳細を入力してください',
    rows: 4,
  },
};

export const WithCounter: Story = {
  args: {
    name: 'description',
    placeholder: '目標の詳細を入力してください',
    rows: 4,
    maxLength: 1000,
    showCounter: true,
  },
};

export const WithError: Story = {
  args: {
    name: 'description',
    placeholder: '目標の詳細を入力してください',
    rows: 4,
    maxLength: 1000,
    showCounter: true,
    error: {
      type: 'maxLength',
      message: '1000文字以内で入力してください',
    },
  },
};

export const SmallSize: Story = {
  args: {
    name: 'constraints',
    placeholder: '制約事項があれば入力してください',
    rows: 2,
    maxLength: 500,
    showCounter: true,
  },
};

export const Disabled: Story = {
  args: {
    name: 'description',
    placeholder: '無効化されたテキストエリア',
    rows: 4,
    disabled: true,
  },
};
