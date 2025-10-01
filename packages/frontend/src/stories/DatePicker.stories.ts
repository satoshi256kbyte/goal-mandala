import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { DatePicker } from '../components/forms/DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    Story => {
      const { register, setValue } = useForm();
      return Story({ args: { register, setValue } });
    },
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'deadline',
  },
};

export const WithMinMaxDate: Story = {
  args: {
    name: 'deadline',
    minDate: new Date(),
    maxDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
  },
};

export const WithError: Story = {
  args: {
    name: 'deadline',
    minDate: new Date(),
    maxDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    error: {
      type: 'required',
      message: '達成期限は必須です',
    },
  },
};

export const Disabled: Story = {
  args: {
    name: 'deadline',
    disabled: true,
  },
};

export const RestrictedRange: Story = {
  args: {
    name: 'deadline',
    minDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
    maxDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3ヶ月後
  },
};
