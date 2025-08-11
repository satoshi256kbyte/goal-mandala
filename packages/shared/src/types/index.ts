// 共通型定義
export interface User {
    id: string;
    email: string;
    name: string;
    industry?: string;
    companySize?: string;
    jobTitle?: string;
    position?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Goal {
    id: string;
    userId: string;
    title: string;
    description: string;
    deadline: Date;
    background: string;
    constraints?: string;
    status: GoalStatus;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
}

export enum GoalStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    PAUSED = 'paused'
}

export interface SubGoal {
    id: string;
    goalId: string;
    title: string;
    description: string;
    background: string;
    constraints?: string;
    position: number; // 0-7
    progress: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Action {
    id: string;
    subGoalId: string;
    title: string;
    description: string;
    background: string;
    constraints?: string;
    type: ActionType;
    position: number; // 0-7
    progress: number;
    createdAt: Date;
    updatedAt: Date;
}

export enum ActionType {
    EXECUTION = 'execution', // 実行アクション
    HABIT = 'habit' // 習慣アクション
}

export interface Task {
    id: string;
    actionId: string;
    title: string;
    description: string;
    type: TaskType;
    status: TaskStatus;
    estimatedMinutes: number;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export enum TaskType {
    EXECUTION = 'execution',
    HABIT = 'habit'
}

export enum TaskStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    SKIPPED = 'skipped'
}
