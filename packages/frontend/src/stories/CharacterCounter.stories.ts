import type { Meta, StoryObj } from '@storybook/react';
import { CharacterCounter } from '../components/forms/CharacterCounter';

const meta: Meta<typeof CharacterCounter> = {
  title: 'Forms/CharacterCounter',
  component: CharacterCounter,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    current: {
      control: { type: 'number', min: 0, max: 200 },
      description: '現在の文字数',
    },
    max: {
      control: { type: 'number', min: 50, max: 1000 },
      description: '最大文字数',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    current: 25,
    max: 100,
  },
};

export const Warning: Story = {
  args: {
    current: 85,
    max: 100,
  },
};

export const Exceeded: Story = {
  args: {
    current: 120,
    max: 100,
  },
};

export const Empty: Story = {
  args: {
    current: 0,
    max: 100,
  },
};

export const LongText: Story = {
  args: {
    current: 750,
    max: 1000,
  },
};

export const NearLimit: Story = {
  args: {
    current: 98,
    max: 100,
  },
};
