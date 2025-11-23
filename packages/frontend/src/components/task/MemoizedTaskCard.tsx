import React, { memo, useMemo, useCallback } from 'react';
import { Task, TaskStatus } from '@goal-mandala/shared';
import { TaskCard } from './TaskCard';

interface MemoizedTaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onSelect: (selected: boolean) => void;
  selected: boolean;
}

/**
 * メモ化されたTaskCard
 * 不必要な再レンダリングを防ぐ
 */
export const MemoizedTaskCard = memo<MemoizedTaskCardProps>(
  ({ task, onStatusChange, onSelect, selected }) => {
    // タスクの表示用データをメモ化
    const taskDisplayData = useMemo(
      () => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        type: task.type,
        estimatedMinutes: task.estimatedMinutes,
        deadline: task.deadline,
        completedAt: task.completedAt,
        actionId: task.actionId,
      }),
      [
        task.id,
        task.title,
        task.description,
        task.status,
        task.type,
        task.estimatedMinutes,
        task.deadline,
        task.completedAt,
        task.actionId,
      ]
    );

    // 期限が近いかどうかをメモ化
    const isDeadlineApproaching = useMemo(() => {
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      const now = new Date();
      const timeDiff = deadline.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return hoursDiff <= 24 && hoursDiff > 0;
    }, [task.deadline]);

    // 期限超過かどうかをメモ化
    const isOverdue = useMemo(() => {
      if (!task.deadline || task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      const now = new Date();
      return deadline.getTime() < now.getTime();
    }, [task.deadline, task.status]);

    // コールバック関数をメモ化
    const handleStatusChange = useCallback(
      (status: TaskStatus) => {
        onStatusChange(status);
      },
      [onStatusChange]
    );

    const handleSelect = useCallback(
      (selected: boolean) => {
        onSelect(selected);
      },
      [onSelect]
    );

    return (
      <TaskCard
        task={taskDisplayData as Task}
        onStatusChange={handleStatusChange}
        onSelect={handleSelect}
        selected={selected}
        isDeadlineApproaching={isDeadlineApproaching}
        isOverdue={isOverdue}
      />
    );
  },
  (prevProps, nextProps) => {
    // カスタム比較関数で不必要な再レンダリングを防ぐ
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.deadline === nextProps.task.deadline &&
      prevProps.selected === nextProps.selected &&
      prevProps.task.actionId === nextProps.task.actionId
    );
  }
);

MemoizedTaskCard.displayName = 'MemoizedTaskCard';
