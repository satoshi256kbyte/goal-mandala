import type { Meta, StoryObj } from '@storybook/react';
import { DraftSaveButton } from '../components/forms/DraftSaveButton';

const meta: Meta<typeof DraftSaveButton> = {
  title: 'Forms/DraftSaveButton',
  component: DraftSaveButton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
    isSaving: {
      control: 'boolean',
      description: '保存中フラグ',
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
    onClick: () => console.log('下書き保存クリック'),
  },
};

export const Saving: Story = {
  args: {
    onClick: () => console.log('下書き保存クリック'),
    isSaving: true,
  },
};

export const Disabled: Story = {
  args: {
    onClick: () => console.log('下書き保存クリック'),
    disabled: true,
  },
};
