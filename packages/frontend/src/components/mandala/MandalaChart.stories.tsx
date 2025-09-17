import type { Meta, StoryObj } from '@storybook/react';
import MandalaChart from './MandalaChart';

const meta: Meta<typeof MandalaChart> = {
  title: 'Components/MandalaChart',
  component: MandalaChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    goalId: { control: 'text' },
    editable: { control: 'boolean' },
    className: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    goalId: 'sample-goal-1',
  },
};

export const Editable: Story = {
  args: {
    goalId: 'sample-goal-1',
    editable: true,
  },
};

export const WithCustomClass: Story = {
  args: {
    goalId: 'sample-goal-1',
    className: 'custom-mandala-style',
  },
};

export const WithCallbacks: Story = {
  args: {
    goalId: 'sample-goal-1',
    editable: true,
    onCellClick: cellData => {
      console.log('Cell clicked:', cellData);
    },
    onCellEdit: cellData => {
      console.log('Cell edit:', cellData);
    },
  },
};
