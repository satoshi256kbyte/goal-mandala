/**
 * Retry Policy Configuration
 *
 * This file defines the retry policies for the Task Generation Workflow.
 * All retry configurations follow exponential backoff strategy.
 */

/**
 * Retry policy for AI service calls (GenerateTasks)
 *
 * Requirements: 3.1, 3.2, 3.3
 * - Retry up to 3 times with exponential backoff
 * - First retry: 2 seconds
 * - Second retry: 4 seconds (2 * 2^1)
 * - Third retry: 8 seconds (2 * 2^2)
 */
export const AI_SERVICE_RETRY_POLICY = {
  /** Errors to retry */
  errorEquals: ['States.TaskFailed'],
  /** Initial interval in seconds */
  intervalSeconds: 2,
  /** Maximum number of retry attempts */
  maxAttempts: 3,
  /** Backoff rate (exponential) */
  backoffRate: 2.0,
} as const;

/**
 * Retry policy for database operations (SaveTasks)
 *
 * Requirements: 5.4
 * - Retry database operations up to 3 times
 * - Faster retry for database operations
 * - First retry: 1 second
 * - Second retry: 2 seconds (1 * 2^1)
 * - Third retry: 4 seconds (1 * 2^2)
 */
export const DATABASE_RETRY_POLICY = {
  /** Errors to retry */
  errorEquals: ['States.TaskFailed'],
  /** Initial interval in seconds */
  intervalSeconds: 1,
  /** Maximum number of retry attempts */
  maxAttempts: 3,
  /** Backoff rate (exponential) */
  backoffRate: 2.0,
} as const;

/**
 * Retry policy for data retrieval (GetActions)
 *
 * Requirements: 3.1, 3.2, 3.3
 * - Same as AI service retry policy
 * - First retry: 2 seconds
 * - Second retry: 4 seconds
 * - Third retry: 8 seconds
 */
export const DATA_RETRIEVAL_RETRY_POLICY = {
  /** Errors to retry */
  errorEquals: ['States.TaskFailed'],
  /** Initial interval in seconds */
  intervalSeconds: 2,
  /** Maximum number of retry attempts */
  maxAttempts: 3,
  /** Backoff rate (exponential) */
  backoffRate: 2.0,
} as const;

/**
 * Calculate retry intervals for a given retry policy
 *
 * @param policy - Retry policy configuration
 * @returns Array of retry intervals in seconds
 *
 * @example
 * calculateRetryIntervals(AI_SERVICE_RETRY_POLICY)
 * // Returns [2, 4, 8]
 *
 * calculateRetryIntervals(DATABASE_RETRY_POLICY)
 * // Returns [1, 2, 4]
 */
export function calculateRetryIntervals(policy: {
  intervalSeconds: number;
  maxAttempts: number;
  backoffRate: number;
}): number[] {
  const intervals: number[] = [];

  for (let i = 0; i < policy.maxAttempts; i++) {
    const interval = policy.intervalSeconds * Math.pow(policy.backoffRate, i);
    intervals.push(interval);
  }

  return intervals;
}

/**
 * Calculate total retry time for a given retry policy
 *
 * @param policy - Retry policy configuration
 * @returns Total time spent on retries in seconds
 *
 * @example
 * calculateTotalRetryTime(AI_SERVICE_RETRY_POLICY)
 * // Returns 14 (2 + 4 + 8)
 *
 * calculateTotalRetryTime(DATABASE_RETRY_POLICY)
 * // Returns 7 (1 + 2 + 4)
 */
export function calculateTotalRetryTime(policy: {
  intervalSeconds: number;
  maxAttempts: number;
  backoffRate: number;
}): number {
  const intervals = calculateRetryIntervals(policy);
  return intervals.reduce((sum, interval) => sum + interval, 0);
}

/**
 * Validate retry policy configuration
 *
 * Ensures that retry policies meet the requirements and are within
 * acceptable ranges.
 *
 * @param policy - Retry policy to validate
 * @param policyName - Name of the policy for error messages
 * @throws Error if policy is invalid
 */
export function validateRetryPolicy(
  policy: {
    intervalSeconds: number;
    maxAttempts: number;
    backoffRate: number;
  },
  policyName: string
): void {
  if (policy.intervalSeconds <= 0) {
    throw new Error(`${policyName}: intervalSeconds must be greater than 0`);
  }

  if (policy.maxAttempts <= 0) {
    throw new Error(`${policyName}: maxAttempts must be greater than 0`);
  }

  if (policy.maxAttempts > 3) {
    throw new Error(`${policyName}: maxAttempts must not exceed 3 (Requirement 3.1)`);
  }

  if (policy.backoffRate < 1) {
    throw new Error(`${policyName}: backoffRate must be at least 1`);
  }

  if (policy.backoffRate !== 2.0) {
    throw new Error(
      `${policyName}: backoffRate must be 2.0 for exponential backoff (Requirement 3.1)`
    );
  }
}

/**
 * Validate AI service retry policy
 *
 * Requirements: 3.1, 3.2, 3.3
 * - First retry: 2 seconds
 * - Second retry: 4 seconds
 * - Third retry: 8 seconds
 */
export function validateAIServiceRetryPolicy(): void {
  validateRetryPolicy(AI_SERVICE_RETRY_POLICY, 'AI_SERVICE_RETRY_POLICY');

  const intervals = calculateRetryIntervals(AI_SERVICE_RETRY_POLICY);

  if (intervals[0] !== 2) {
    throw new Error('AI service first retry must be 2 seconds (Requirement 3.2)');
  }

  if (intervals[1] !== 4) {
    throw new Error('AI service second retry must be 4 seconds (Requirement 3.3)');
  }

  if (intervals[2] !== 8) {
    throw new Error('AI service third retry must be 8 seconds');
  }
}

/**
 * Get retry policy statistics
 *
 * @param policy - Retry policy configuration
 * @returns Statistics about the retry policy
 *
 * @example
 * getRetryStats(AI_SERVICE_RETRY_POLICY)
 * // Returns:
 * // {
 * //   maxAttempts: 3,
 * //   intervals: [2, 4, 8],
 * //   totalRetryTime: 14,
 * //   backoffRate: 2.0
 * // }
 */
export function getRetryStats(policy: {
  intervalSeconds: number;
  maxAttempts: number;
  backoffRate: number;
}): {
  maxAttempts: number;
  intervals: number[];
  totalRetryTime: number;
  backoffRate: number;
} {
  return {
    maxAttempts: policy.maxAttempts,
    intervals: calculateRetryIntervals(policy),
    totalRetryTime: calculateTotalRetryTime(policy),
    backoffRate: policy.backoffRate,
  };
}

/**
 * All retry policies used in the workflow
 */
export const RETRY_POLICIES = {
  aiService: AI_SERVICE_RETRY_POLICY,
  database: DATABASE_RETRY_POLICY,
  dataRetrieval: DATA_RETRIEVAL_RETRY_POLICY,
} as const;

/**
 * Retry policy summary for documentation
 */
export const RETRY_POLICY_SUMMARY = {
  aiService: {
    description: 'AI service calls (GenerateTasks)',
    ...getRetryStats(AI_SERVICE_RETRY_POLICY),
  },
  database: {
    description: 'Database operations (SaveTasks)',
    ...getRetryStats(DATABASE_RETRY_POLICY),
  },
  dataRetrieval: {
    description: 'Data retrieval (GetActions)',
    ...getRetryStats(DATA_RETRIEVAL_RETRY_POLICY),
  },
} as const;

// Validate all retry policies on module load
validateAIServiceRetryPolicy();
validateRetryPolicy(DATABASE_RETRY_POLICY, 'DATABASE_RETRY_POLICY');
validateRetryPolicy(DATA_RETRIEVAL_RETRY_POLICY, 'DATA_RETRIEVAL_RETRY_POLICY');
