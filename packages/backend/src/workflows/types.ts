/**
 * Step Functions Workflow Type Definitions
 *
 * This file contains TypeScript interfaces for the Task Generation Workflow
 * state machine inputs, outputs, and intermediate states.
 */

/**
 * Input to the Task Generation Workflow
 */
export interface WorkflowInput {
  /** Unique identifier for the goal */
  goalId: string;
  /** User ID who owns the goal */
  userId: string;
  /** List of action IDs to process */
  actionIds: string[];
  /** Execution ARN (set by Step Functions) */
  executionArn?: string;
}

/**
 * Output from the Task Generation Workflow
 */
export interface WorkflowOutput {
  /** Goal ID that was processed */
  goalId: string;
  /** Execution ARN */
  executionArn: string;
  /** Final workflow status */
  status: 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
  /** Number of successfully processed actions */
  successCount: number;
  /** Number of failed actions */
  failedCount: number;
  /** List of failed action IDs */
  failedActions: string[];
  /** Total execution time in milliseconds */
  duration: number;
  /** Error message if workflow failed */
  error?: string;
}

/**
 * Action context retrieved from database
 */
export interface ActionContext {
  /** Action ID */
  actionId: string;
  /** Action title */
  title: string;
  /** Action description */
  description: string;
  /** Action type */
  type: 'execution' | 'habit';
  /** Background information */
  background: string;
  /** Constraints */
  constraints?: string;
  /** Parent sub-goal context */
  subGoal: {
    title: string;
    description: string;
  };
  /** Parent goal context */
  goal: {
    title: string;
    description: string;
    deadline: string;
  };
}

/**
 * Batch of actions to process
 */
export interface ActionBatch {
  /** Batch number (0-indexed) */
  batchNumber: number;
  /** Actions in this batch (max 8) */
  actions: ActionContext[];
}

/**
 * Result of processing a single action
 */
export interface ActionResult {
  /** Action ID */
  actionId: string;
  /** Processing status */
  status: 'success' | 'failed';
  /** Generated tasks (if successful) */
  tasks?: Array<{
    title: string;
    description: string;
    type: 'execution' | 'habit';
    estimatedMinutes: number;
  }>;
  /** Error details (if failed) */
  error?: {
    message: string;
    code: string;
    retryCount: number;
  };
}

/**
 * Result of processing a batch
 */
export interface BatchResult {
  /** Batch number */
  batchNumber: number;
  /** Results for each action in the batch */
  actionResults: ActionResult[];
  /** Number of successful actions in this batch */
  successCount: number;
  /** Number of failed actions in this batch */
  failedCount: number;
}

/**
 * Aggregated results from all batches
 */
export interface AggregatedResults {
  /** Total number of actions processed */
  totalActions: number;
  /** Number of successful actions */
  successCount: number;
  /** Number of failed actions */
  failedCount: number;
  /** List of failed action IDs */
  failedActions: string[];
  /** Whether all actions succeeded */
  allSuccess: boolean;
  /** Whether some actions succeeded */
  partialSuccess: boolean;
  /** Notification message for SNS */
  notificationMessage: string;
}

/**
 * Progress update information
 */
export interface ProgressUpdate {
  /** Execution ARN */
  executionArn: string;
  /** Number of processed actions */
  processedActions: number;
  /** Total number of actions */
  totalActions: number;
  /** Current batch number */
  currentBatch: number;
  /** Total number of batches */
  totalBatches: number;
  /** Progress percentage (0-100) */
  progressPercentage: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;
}

/**
 * Error handling parameters
 */
export interface ErrorHandlingParams {
  /** Type of error */
  errorType: 'ValidationError' | 'GetActionsError' | 'TransientError' | 'PermanentError';
  /** Error details */
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
  /** Goal ID (if available) */
  goalId?: string;
  /** Execution ARN (if available) */
  executionArn?: string;
}

/**
 * Workflow state at any point in execution
 */
export interface WorkflowState {
  /** Input parameters */
  goalId: string;
  userId: string;
  actionIds: string[];
  /** Validation result */
  validationResult?: {
    valid: boolean;
    errors?: string[];
  };
  /** Retrieved actions */
  actions?: ActionContext[];
  /** Created batches */
  batches?: ActionBatch[];
  /** Batch processing results */
  batchResults?: BatchResult[];
  /** Aggregated results */
  aggregatedResults?: AggregatedResults;
  /** Progress updates */
  progressUpdate?: ProgressUpdate;
  /** Status update result */
  statusUpdate?: {
    goalId: string;
    status: string;
    updatedAt: string;
  };
  /** Notification result */
  notification?: {
    messageId: string;
  };
  /** Error information */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  /** Error handling result */
  errorHandling?: {
    logged: boolean;
    notified: boolean;
  };
}

/**
 * Timeout configuration (in seconds)
 */
export const TIMEOUT_CONFIG = {
  WORKFLOW: 900, // 15 minutes
  TASK_GENERATION: 120, // 2 minutes
  SAVE_TASKS: 30, // 30 seconds
  UPDATE_PROGRESS: 30, // 30 seconds
  BATCH_PROCESSING: 300, // 5 minutes
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_INTERVAL: 2, // seconds
  BACKOFF_RATE: 2.0,
} as const;

/**
 * Batch processing configuration
 */
export const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 8,
  MAX_CONCURRENT_BATCHES: 3,
  MAX_CONCURRENT_ACTIONS: 8,
} as const;
