/**
 * Timeout Configuration
 *
 * This file defines timeout settings for the Task Generation Workflow.
 */

/**
 * Workflow-level timeout
 *
 * Requirements: 4.1, 4.4
 * - Maximum execution time: 15 minutes (900 seconds)
 * - Workflow aborts if this timeout is exceeded
 */
export const WORKFLOW_TIMEOUT_SECONDS = 900;

/**
 * AI service call timeout (GenerateTasks)
 *
 * Requirements: 4.2
 * - Single AI service call timeout: 2 minutes (120 seconds)
 * - If exceeded, the call is retried
 */
export const AI_SERVICE_TIMEOUT_SECONDS = 120;

/**
 * Batch processing timeout
 *
 * Requirements: 4.3
 * - Batch processing timeout: 5 minutes (300 seconds)
 * - If exceeded, the batch fails
 */
export const BATCH_TIMEOUT_SECONDS = 300;

/**
 * Default task timeout
 *
 * Used for tasks that don't have a specific timeout configured
 */
export const DEFAULT_TASK_TIMEOUT_SECONDS = 60;

/**
 * Timeout configuration summary
 */
export const TIMEOUT_CONFIG = {
  /** Workflow-level timeout in seconds */
  workflow: WORKFLOW_TIMEOUT_SECONDS,
  /** AI service call timeout in seconds */
  aiService: AI_SERVICE_TIMEOUT_SECONDS,
  /** Batch processing timeout in seconds */
  batch: BATCH_TIMEOUT_SECONDS,
  /** Default task timeout in seconds */
  defaultTask: DEFAULT_TASK_TIMEOUT_SECONDS,
} as const;

/**
 * Convert seconds to minutes for display
 *
 * @param seconds - Time in seconds
 * @returns Time in minutes
 */
export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

/**
 * Validate timeout configuration
 *
 * Ensures that timeout values meet the requirements and are within
 * acceptable ranges.
 *
 * @throws Error if configuration is invalid
 */
export function validateTimeoutConfig(): void {
  if (WORKFLOW_TIMEOUT_SECONDS <= 0) {
    throw new Error('WORKFLOW_TIMEOUT_SECONDS must be greater than 0');
  }

  if (WORKFLOW_TIMEOUT_SECONDS !== 900) {
    throw new Error('WORKFLOW_TIMEOUT_SECONDS must be 900 seconds (15 minutes) (Requirement 4.1)');
  }

  if (AI_SERVICE_TIMEOUT_SECONDS <= 0) {
    throw new Error('AI_SERVICE_TIMEOUT_SECONDS must be greater than 0');
  }

  if (AI_SERVICE_TIMEOUT_SECONDS !== 120) {
    throw new Error('AI_SERVICE_TIMEOUT_SECONDS must be 120 seconds (2 minutes) (Requirement 4.2)');
  }

  if (BATCH_TIMEOUT_SECONDS <= 0) {
    throw new Error('BATCH_TIMEOUT_SECONDS must be greater than 0');
  }

  if (BATCH_TIMEOUT_SECONDS !== 300) {
    throw new Error('BATCH_TIMEOUT_SECONDS must be 300 seconds (5 minutes) (Requirement 4.3)');
  }

  if (AI_SERVICE_TIMEOUT_SECONDS > BATCH_TIMEOUT_SECONDS) {
    throw new Error('AI_SERVICE_TIMEOUT_SECONDS must not exceed BATCH_TIMEOUT_SECONDS');
  }

  if (BATCH_TIMEOUT_SECONDS > WORKFLOW_TIMEOUT_SECONDS) {
    throw new Error('BATCH_TIMEOUT_SECONDS must not exceed WORKFLOW_TIMEOUT_SECONDS');
  }
}

/**
 * Calculate maximum possible execution time
 *
 * Calculates the theoretical maximum execution time considering
 * retries and timeouts.
 *
 * @param actionCount - Number of actions to process
 * @param includeRetries - Whether to include retry time
 * @returns Maximum execution time in seconds
 *
 * @example
 * // For 8 actions with retries:
 * // - Each action: 120s timeout + (2s + 4s + 8s) retry delays = 134s
 * // - 8 actions in parallel: 134s
 * // - Plus overhead: ~150s
 * calculateMaxExecutionTime(8, true) // Returns ~150
 */
export function calculateMaxExecutionTime(
  actionCount: number,
  includeRetries: boolean = true
): number {
  if (actionCount <= 0) {
    return 0;
  }

  // Base time: AI service timeout
  let maxTime = AI_SERVICE_TIMEOUT_SECONDS;

  // Add retry delays if requested
  if (includeRetries) {
    // Exponential backoff: 2s + 4s + 8s = 14s
    const retryDelay = 2 + 4 + 8;
    maxTime += retryDelay;
  }

  // Add overhead for other operations (validation, batching, aggregation)
  const overhead = 30; // seconds
  maxTime += overhead;

  return maxTime;
}

/**
 * Check if execution time is within limits
 *
 * @param executionTimeSeconds - Actual execution time in seconds
 * @returns Whether execution time is within acceptable limits
 */
export function isWithinTimeoutLimits(executionTimeSeconds: number): boolean {
  return executionTimeSeconds <= WORKFLOW_TIMEOUT_SECONDS;
}

/**
 * Get timeout configuration summary for documentation
 */
export const TIMEOUT_SUMMARY = {
  workflow: {
    description: 'Maximum workflow execution time',
    seconds: WORKFLOW_TIMEOUT_SECONDS,
    minutes: secondsToMinutes(WORKFLOW_TIMEOUT_SECONDS),
    requirement: '4.1, 4.4',
  },
  aiService: {
    description: 'Single AI service call timeout',
    seconds: AI_SERVICE_TIMEOUT_SECONDS,
    minutes: secondsToMinutes(AI_SERVICE_TIMEOUT_SECONDS),
    requirement: '4.2',
  },
  batch: {
    description: 'Batch processing timeout',
    seconds: BATCH_TIMEOUT_SECONDS,
    minutes: secondsToMinutes(BATCH_TIMEOUT_SECONDS),
    requirement: '4.3',
  },
  defaultTask: {
    description: 'Default task timeout',
    seconds: DEFAULT_TASK_TIMEOUT_SECONDS,
    minutes: secondsToMinutes(DEFAULT_TASK_TIMEOUT_SECONDS),
    requirement: 'N/A',
  },
} as const;

/**
 * Timeout event logging configuration
 *
 * Requirements: 4.5
 * - Log timeout events with execution details
 */
export const TIMEOUT_LOGGING_CONFIG = {
  /** Whether to log timeout events */
  enabled: true,
  /** Log level for timeout events */
  logLevel: 'ERROR' as const,
  /** Include execution details in logs */
  includeExecutionDetails: true,
  /** Include stack trace in logs */
  includeStackTrace: true,
} as const;

// Validate configuration on module load
validateTimeoutConfig();
