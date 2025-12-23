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
  PAUSED = 'paused',
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
  HABIT = 'habit', // 習慣アクション
}

export interface Task {
  id: string;
  actionId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  estimatedMinutes: number;
  deadline?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskType {
  EXECUTION = 'execution',
  HABIT = 'habit',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

// 進捗計算関連の型定義
export interface TaskProgress {
  id: string;
  progress: number;
  status: TaskStatus;
}

export interface ActionProgress {
  id: string;
  progress: number;
  type: ActionType;
  taskCount: number;
  completedTaskCount: number;
}

export interface SubGoalProgress {
  id: string;
  progress: number;
  actionProgresses: ActionProgress[];
}

export interface GoalProgress {
  id: string;
  progress: number;
  subGoalProgresses: SubGoalProgress[];
}

export interface ProgressHierarchy {
  task: TaskProgress;
  action: ActionProgress;
  subGoal: SubGoalProgress;
  goal: GoalProgress;
}

// タスク管理機能の型定義
export interface TaskNote {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  changedAt: Date;
}

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filters: TaskFilters;
  searchQuery?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DeadlineRange = 'today' | 'this_week' | 'overdue' | 'custom';

export interface CustomDeadlineRange {
  start: Date;
  end: Date;
}

export interface TaskFilters {
  statuses?: TaskStatus[];
  deadlineRange?: DeadlineRange;
  customDeadlineRange?: CustomDeadlineRange;
  actionIds?: string[];
}

// リマインド機能の型定義
export enum EmailStatus {
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export enum MoodPreference {
  STAY_ON_TRACK = 'stay_on_track',
  CHANGE_PACE = 'change_pace',
}

export interface ReminderLog {
  id: string;
  userId: string;
  sentAt: Date;
  taskIds: string[];
  emailStatus: EmailStatus;
  messageId?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReminderPreference {
  userId: string;
  enabled: boolean;
  moodPreference: MoodPreference | null;
  lastReminderSentAt: Date | null;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitTaskReminderTracking {
  id: string;
  taskId: string;
  lastRemindedAt: Date;
  reminderCount: number;
  weekNumber: number; // ISO week number
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export interface DeepLinkPayload {
  userId: string;
  taskId: string;
  expiresAt: Date;
}
