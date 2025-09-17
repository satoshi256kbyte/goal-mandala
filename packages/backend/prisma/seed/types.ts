import { GoalStatus, ActionType, TaskType, TaskStatus } from '@prisma/client';

export interface SeedDataSet {
  name: string;
  description: string;
  environment: 'dev' | 'test' | 'demo' | 'performance';
  users: SeedUser[];
  goals: SeedGoal[];
  metadata: SeedMetadata;
}

export interface SeedMetadata {
  version: string;
  createdAt: Date;
  author: string;
  tags: string[];
  estimatedRecords: number;
}

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
  profile: UserProfile;
}

export interface UserProfile {
  persona: 'individual' | 'corporate' | 'student' | 'freelancer';
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  goal_types: string[];
}

export interface SeedGoal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  deadline: Date;
  background: string;
  constraints?: string;
  status: GoalStatus;
  progress: number;
  sub_goals: SeedSubGoal[];
  reflections: SeedReflection[];
}

export interface SeedSubGoal {
  id: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  position: number;
  progress: number;
  actions: SeedAction[];
}

export interface SeedAction {
  id: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: ActionType;
  position: number;
  progress: number;
  tasks: SeedTask[];
}

export interface SeedTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  estimated_minutes: number;
  completed_at?: Date;
  reminders: SeedTaskReminder[];
}

export interface SeedTaskReminder {
  id: string;
  reminder_date: Date;
  sent: boolean;
  sent_at?: Date;
}

export interface SeedReflection {
  id: string;
  summary: string;
  regretful_actions?: string;
  slow_progress_actions?: string;
  untouched_actions?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
