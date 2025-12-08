import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { TaskFilter } from '../TaskFilter';
import { TaskFilters, TaskStatus } from '@goal-mandala/shared';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('TaskFilter', () => {
  const mockActions = [
    { id: 'action-1', title: 'Action 1' },
    { id: 'action-2', title: 'Action 2' },
  ];

  it('should render all filter options', () => {
    const filters: TaskFilters = {};

    render(<TaskFilter filters={filters} onChange={() => {}} actions={mockActions} />);

    expect(screen.getByText('状態')).toBeInTheDocument();
    expect(screen.getByText('期限')).toBeInTheDocument();
    expect(screen.getByText('アクション')).toBeInTheDocument();
  });

  it('should call onChange when status filter is changed', () => {
    const onChange = vi.fn();
    const filters: TaskFilters = {};

    render(<TaskFilter filters={filters} onChange={onChange} actions={mockActions} />);

    const completedCheckbox = screen.getByLabelText('完了');
    fireEvent.click(completedCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      statuses: [TaskStatus.COMPLETED],
    });
  });

  it('should call onChange when deadline filter is changed', () => {
    const onChange = vi.fn();
    const filters: TaskFilters = {};

    render(<TaskFilter filters={filters} onChange={onChange} actions={mockActions} />);

    const deadlineSelect = screen.getByLabelText('期限フィルター');
    fireEvent.change(deadlineSelect, { target: { value: 'today' } });

    expect(onChange).toHaveBeenCalledWith({
      deadlineRange: 'today',
    });
  });

  it('should call onChange when action filter is changed', () => {
    const onChange = vi.fn();
    const filters: TaskFilters = {};

    render(<TaskFilter filters={filters} onChange={onChange} actions={mockActions} />);

    const action1Checkbox = screen.getByLabelText('Action 1');
    fireEvent.click(action1Checkbox);

    expect(onChange).toHaveBeenCalledWith({
      actionIds: ['action-1'],
    });
  });

  it('should display current filter values', () => {
    const filters: TaskFilters = {
      statuses: [TaskStatus.COMPLETED],
      deadlineRange: 'today',
      actionIds: ['action-1'],
    };

    render(<TaskFilter filters={filters} onChange={() => {}} actions={mockActions} />);

    expect(screen.getByLabelText('完了')).toBeChecked();
    expect(screen.getByLabelText('期限フィルター')).toHaveValue('today');
    expect(screen.getByLabelText('Action 1')).toBeChecked();
  });

  it('should handle multiple status selections', () => {
    const onChange = vi.fn();
    const filters: TaskFilters = { statuses: [TaskStatus.COMPLETED] };

    render(<TaskFilter filters={filters} onChange={onChange} actions={mockActions} />);

    const inProgressCheckbox = screen.getByLabelText('進行中');
    fireEvent.click(inProgressCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      statuses: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
    });
  });
});
