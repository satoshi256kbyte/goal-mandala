/**
 * テストデータ生成ユーティリティ
 * 一貫性のあるテストデータを生成するためのクラス
 */

import { Goal, SubGoal, Action, GoalStatus } from '../../types/mandala';
import { User } from '../../types/storage-sync';

export interface Task {
  id: string;
  actionId: string;
  title: string;
  description?: string;
  type: 'ACTION' | 'LEARNING' | 'RESEARCH' | 'MEETING' | 'REVIEW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  estimatedTime?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TestDataGenerator {
  private counter = 0;

  /**
   * ユニークなIDを生成
   */
  private generateId(): string {
    this.counter++;
    return `test-${Date.now()}-${this.counter}`;
  }

  /**
   * ユーザーデータを生成
   */
  generateUser(overrides?: Partial<User>): User {
    return {
      id: this.generateId(),
      email: `test-user-${this.counter}@example.com`,
      name: `Test User ${this.counter}`,
      profileComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 目標データを生成
   */
  generateGoal(userId: string, overrides?: Partial<Goal>): Goal {
    const now = new Date();
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 3); // 3ヶ月後

    return {
      id: this.generateId(),
      title: `Test Goal ${this.counter}`,
      description: `This is a test goal description for goal ${this.counter}`,
      deadline,
      progress: 0,
      status: GoalStatus.ACTIVE,
      background: `Background information for goal ${this.counter}`,
      constraints: `Constraints for goal ${this.counter}`,
      ...overrides,
    };
  }

  /**
   * サブ目標データを生成（8個）
   */
  generateSubGoals(goalId: string, count: number = 8): SubGoal[] {
    const subGoals: SubGoal[] = [];

    for (let i = 0; i < count; i++) {
      subGoals.push({
        id: this.generateId(),
        goal_id: goalId,
        title: `Test SubGoal ${i + 1}`,
        description: `This is a test subgoal description for subgoal ${i + 1}`,
        position: i,
        progress: 0,
        background: `Background information for subgoal ${i + 1}`,
        constraints: `Constraints for subgoal ${i + 1}`,
      });
    }

    return subGoals;
  }

  /**
   * アクションデータを生成（各サブ目標に8個、合計64個）
   */
  generateActions(subGoals: SubGoal[]): Action[] {
    const actions: Action[] = [];

    subGoals.forEach((subGoal, subGoalIndex) => {
      for (let i = 0; i < 8; i++) {
        actions.push({
          id: this.generateId(),
          sub_goal_id: subGoal.id,
          title: `Test Action ${subGoalIndex + 1}-${i + 1}`,
          description: `This is a test action description for action ${subGoalIndex + 1}-${i + 1}`,
          type: i % 2 === 0 ? ActionType.EXECUTION : ActionType.HABIT,
          position: i,
          progress: 0,
          background: `Background information for action ${subGoalIndex + 1}-${i + 1}`,
          constraints: `Constraints for action ${subGoalIndex + 1}-${i + 1}`,
        });
      }
    });

    return actions;
  }

  /**
   * タスクデータを生成
   */
  generateTasks(actionId: string, count: number = 3): Task[] {
    const tasks: Task[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      tasks.push({
        id: this.generateId(),
        actionId,
        title: `Test Task ${i + 1}`,
        description: `This is a test task description for task ${i + 1}`,
        type: 'ACTION',
        status: 'PENDING',
        estimatedTime: 30 + i * 15, // 30分、45分、60分
        createdAt: now,
        updatedAt: now,
      });
    }

    return tasks;
  }

  /**
   * 完全なマンダラチャートデータセットを生成
   */
  generateCompleteDataset(userId: string) {
    const goal = this.generateGoal(userId);
    const subGoals = this.generateSubGoals(goal.id);
    const actions = this.generateActions(subGoals);
    const tasks: Task[] = [];

    actions.forEach(action => {
      tasks.push(...this.generateTasks(action.id));
    });

    return {
      goal,
      subGoals,
      actions,
      tasks,
    };
  }

  /**
   * カウンターをリセット
   */
  reset(): void {
    this.counter = 0;
  }
}

// シングルトンインスタンスをエクスポート
export const testDataGenerator = new TestDataGenerator();
