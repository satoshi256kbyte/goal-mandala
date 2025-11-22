import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../TaskCard';
import { generateMockTask } from '@goal-mandala/shared';

describe('TaskCard', () => {
  it('should render task information correctly', () => {
    const task = generateMockTask({
      title: 'Test Task',
      description: 'Test Description',
      status: 'not_started',
      estimatedMinutes: 30,
    });

    render(<TaskCard task={task} onStatusChange={() => {}} onSelect={() => {}} selected={false} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('30分')).toBeInTheDocument();
  });

  it('should call onStatusChange when status is changed', () => {
    const task = generateMockTask({ status: 'not_started' });
    const onStatusChange = jest.fn();

    render(
      <TaskCard task={task} onStatusChange={onStatusChange} onSelect={() => {}} selected={false} />
    );

    const statusButton = screen.getByRole('button', { name: /状態を変更/ });
    fireEvent.click(statusButton);

    expect(onStatusChange).toHaveBeenCalledWith('in_progress');
  });

  it('should call onSelect when checkbox is clicked', () => {
    const task = generateMockTask();
    const onSelect = jest.fn();

    render(<TaskCard task={task} onStatusChange={() => {}} onSelect={onSelect} selected={false} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('should show selected state correctly', () => {
    const task = generateMockTask();

    render(<TaskCard task={task} onStatusChange={() => {}} onSelect={() => {}} selected={true} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should display deadline warning for overdue tasks', () => {
    const task = generateMockTask({
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨日
      status: 'not_started',
    });

    render(<TaskCard task={task} onStatusChange={() => {}} onSelect={() => {}} selected={false} />);

    expect(screen.getByText(/期限超過/)).toBeInTheDocument();
  });
});
