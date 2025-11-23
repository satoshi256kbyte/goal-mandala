import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Task, TaskStatus } from '@goal-mandala/shared';
import { TaskCard } from './TaskCard';

interface VirtualTaskListProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskSelect: (taskId: string, selected: boolean) => void;
  selectedTasks: string[];
  height: number;
}

interface TaskItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    tasks: Task[];
    onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
    onTaskSelect: (taskId: string, selected: boolean) => void;
    selectedTasks: string[];
  };
}

const TaskItem: React.FC<TaskItemProps> = ({ index, style, data }) => {
  const { tasks, onTaskStatusChange, onTaskSelect, selectedTasks } = data;
  const task = tasks[index];

  return (
    <div style={style} className="px-4 py-2">
      <TaskCard
        task={task}
        onStatusChange={status => onTaskStatusChange(task.id, status)}
        onSelect={selected => onTaskSelect(task.id, selected)}
        selected={selectedTasks.includes(task.id)}
      />
    </div>
  );
};

export const VirtualTaskList: React.FC<VirtualTaskListProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskSelect,
  selectedTasks,
  height,
}) => {
  const itemData = {
    tasks,
    onTaskStatusChange,
    onTaskSelect,
    selectedTasks,
  };

  return (
    <List
      height={height}
      itemCount={tasks.length}
      itemSize={120} // Approximate height of TaskCard
      itemData={itemData}
      overscanCount={5}
    >
      {TaskItem}
    </List>
  );
};
