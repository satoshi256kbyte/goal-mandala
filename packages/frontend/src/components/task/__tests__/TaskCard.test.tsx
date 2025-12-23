import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../TaskCard';
import { generateMockTask, TaskStatus } from '@goal-mandala/shared';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('TaskCard', () => {
  it('should render task information correctly', () => {
    const task = generateMockTask({
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.NOT_STARTED,
      estimatedMinutes: 30,
    });

    render(<TaskCard task={task} onStatusChange={() => {}} onSelect={() => {}} selected={false} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('30分')).toBeInTheDocument();
  });

  it('should call onStatusChange when status is changed', () => {
    const task = generateMockTask({ status: TaskStatus.NOT_STARTED });
    const onStatusChange = vi.fn();

    render(
      <TaskCard task={task} onStatusChange={onStatusChange} onSelect={() => {}} selected={false} />
    );

    const statusSelect = screen.getByRole('combobox', { name: /状態を変更/ });
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });

    expect(onStatusChange).toHaveBeenCalledWith('in_progress');
  });

  it('should call onSelect when checkbox is clicked', () => {
    const task = generateMockTask();
    const onSelect = vi.fn();

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
      status: TaskStatus.NOT_STARTED,
    });

    render(<TaskCard task={task} onStatusChange={() => {}} onSelect={() => {}} selected={false} />);

    expect(screen.getByText(/期限超過/)).toBeInTheDocument();
  });
});
