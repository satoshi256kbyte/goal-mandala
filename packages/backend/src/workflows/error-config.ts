/**
 * Error Handling Configuration
 *
 * This file defines error handling strategies for the Task Generation Workflow.
 */

/**
 * Error types in the workflow
 *
 * Requirements: 3.4, 3.5, 14.1, 14.2
 */
export enum ErrorType {
  /** Input validation errors - fail immediately, no retry */
  VALIDATION = 'ValidationError',
  /** Temporary failures - retry with exponential backoff */
  TRANSIENT = 'TransientError',
  /** Permanent failures - fail immediately, no retry */
  PERMANENT = 'PermanentError',
  /** Partial failures - some actions succeeded, some failed */
  PARTIAL = 'PartialError',
}

/**
 * Error classification configuration
 *
 * Defines how different errors should be handled
 */
export const ERROR_CLASSIFICATION = {
  [ErrorType.VALIDATION]: {
    description: 'Input data validation errors',
    shouldRetry: false,
    examples: [
      'Invalid goalId format',
      'Missing required fields',
      'Goal does not exist',
      'User does not have permission',
    ],
    handling: 'Fail immediately without retry',
  },
  [ErrorType.TRANSIENT]: {
    description: 'Temporary failures that may succeed on retry',
    shouldRetry: true,
    maxRetries: 3,
    backoffRate: 2.0,
    examples: [
      'AI API timeout',
      'Database connection error',
      'Network timeout',
      'Rate limit exceeded (temporary)',
    ],
    handling: 'Retry with exponential backoff (2s, 4s, 8s)',
  },
  [ErrorType.PERMANENT]: {
    description: 'Permanent failures that will not succeed on retry',
    shouldRetry: false,
    examples: [
      'AI API quota exceeded',
      'Permission denied',
      'Invalid API key',
      'Resource not found',
    ],
    handling: 'Fail immediately without retry',
  },
  [ErrorType.PARTIAL]: {
    description: 'Some actions succeeded, some failed',
    shouldRetry: false,
    examples: [
      'Some actions generated tasks successfully',
      'Some actions failed after all retries',
    ],
    handling: 'Save successful tasks, list failed actions',
  },
} as const;

/**
 * Error handling strategy for each state
 */
export const STATE_ERROR_HANDLING = {
  ValidateInput: {
    errorType: ErrorType.VALIDATION,
    catchAll: true,
    nextState: 'HandleValidationError',
    shouldRetry: false,
  },
  GetActions: {
    errorType: ErrorType.TRANSIENT,
    catchAll: true,
    nextState: 'HandleGetActionsError',
    shouldRetry: true,
    retryConfig: {
      intervalSeconds: 2,
      maxAttempts: 3,
      backoffRate: 2.0,
    },
  },
  GenerateTasks: {
    errorType: ErrorType.TRANSIENT,
    catchAll: true,
    nextState: 'MarkActionFailed',
    shouldRetry: true,
    retryConfig: {
      intervalSeconds: 2,
      maxAttempts: 3,
      backoffRate: 2.0,
    },
  },
  SaveTasks: {
    errorType: ErrorType.TRANSIENT,
    catchAll: true,
    nextState: 'MarkActionFailed',
    shouldRetry: true,
    retryConfig: {
      intervalSeconds: 1,
      maxAttempts: 3,
      backoffRate: 2.0,
    },
  },
} as const;

/**
 * Partial failure handling configuration
 *
 * Requirements: 14.1, 14.2, 14.3
 */
export const PARTIAL_FAILURE_CONFIG = {
  /** Save successfully generated tasks even if some actions fail */
  saveSuccessfulTasks: true,
  /** Mark workflow as "partially succeeded" */
  markAsPartialSuccess: true,
  /** Include failed actions in result */
  listFailedActions: true,
  /** Allow retry of only failed actions */
  allowPartialRetry: true,
} as const;

/**
 * Classify an error based on its characteristics
 *
 * @param error - Error object
 * @returns Error type classification
 *
 * @example
 * classifyError(new Error('Invalid goalId'))
 * // Returns ErrorType.VALIDATION
 *
 * classifyError(new Error('Connection timeout'))
 * // Returns ErrorType.TRANSIENT
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('missing') ||
    message.includes('required') ||
    message.includes('does not exist') ||
    message.includes('not found')
  ) {
    return ErrorType.VALIDATION;
  }

  // Permanent errors
  if (
    message.includes('quota exceeded') ||
    message.includes('permission denied') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return ErrorType.PERMANENT;
  }

  // Transient errors (default)
  return ErrorType.TRANSIENT;
}

/**
 * Determine if an error should be retried
 *
 * @param errorType - Type of error
 * @returns Whether the error should be retried
 */
export function shouldRetryError(errorType: ErrorType): boolean {
  return ERROR_CLASSIFICATION[errorType].shouldRetry;
}

/**
 * Get error handling strategy for an error type
 *
 * @param errorType - Type of error
 * @returns Error handling strategy
 */
export function getErrorHandlingStrategy(errorType: ErrorType): {
  shouldRetry: boolean;
  maxRetries?: number;
  backoffRate?: number;
  handling: string;
} {
  const classification = ERROR_CLASSIFICATION[errorType];

  return {
    shouldRetry: classification.shouldRetry,
    maxRetries: 'maxRetries' in classification ? classification.maxRetries : undefined,
    backoffRate: 'backoffRate' in classification ? classification.backoffRate : undefined,
    handling: classification.handling,
  };
}

/**
 * Error logging configuration
 *
 * Requirements: 3.5, 7.4
 */
export const ERROR_LOGGING_CONFIG = {
  /** Whether to log errors */
  enabled: true,
  /** Log level for errors */
  logLevel: 'ERROR' as const,
  /** Include stack trace in logs */
  includeStackTrace: true,
  /** Include execution context in logs */
  includeExecutionContext: true,
  /** Log fields to include */
  logFields: [
    'timestamp',
    'executionArn',
    'goalId',
    'userId',
    'errorType',
    'errorMessage',
    'errorCode',
    'retryCount',
    'actionId',
  ] as const,
} as const;

/**
 * Error notification configuration
 *
 * Requirements: 8.1, 8.3, 8.4
 */
export const ERROR_NOTIFICATION_CONFIG = {
  /** Whether to send notifications for errors */
  enabled: true,
  /** SNS topic for error notifications */
  snsTopicArn: '${WorkflowNotificationTopicArn}',
  /** Notification settings by error type */
  notificationSettings: {
    [ErrorType.VALIDATION]: {
      enabled: false,
      priority: 'LOW' as const,
    },
    [ErrorType.TRANSIENT]: {
      enabled: false,
      priority: 'LOW' as const,
    },
    [ErrorType.PERMANENT]: {
      enabled: true,
      priority: 'HIGH' as const,
    },
    [ErrorType.PARTIAL]: {
      enabled: true,
      priority: 'MEDIUM' as const,
    },
  },
} as const;

/**
 * Create error notification message
 *
 * @param errorType - Type of error
 * @param error - Error details
 * @param context - Execution context
 * @returns Notification message
 */
export function createErrorNotificationMessage(
  errorType: ErrorType,
  error: {
    message: string;
    code?: string;
  },
  context: {
    executionArn: string;
    goalId: string;
    userId?: string;
  }
): string {
  const lines = [
    `Error Type: ${errorType}`,
    `Error Message: ${error.message}`,
    error.code ? `Error Code: ${error.code}` : null,
    `Execution ARN: ${context.executionArn}`,
    `Goal ID: ${context.goalId}`,
    context.userId ? `User ID: ${context.userId}` : null,
    `Timestamp: ${new Date().toISOString()}`,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Validate error handling configuration
 *
 * @throws Error if configuration is invalid
 */
export function validateErrorConfig(): void {
  // Validate that all error types have classification
  const errorTypes = Object.values(ErrorType);
  for (const errorType of errorTypes) {
    if (!ERROR_CLASSIFICATION[errorType]) {
      throw new Error(`Missing classification for error type: ${errorType}`);
    }
  }

  // Validate partial failure configuration
  if (!PARTIAL_FAILURE_CONFIG.saveSuccessfulTasks) {
    throw new Error('saveSuccessfulTasks must be true (Requirement 14.1)');
  }

  if (!PARTIAL_FAILURE_CONFIG.markAsPartialSuccess) {
    throw new Error('markAsPartialSuccess must be true (Requirement 14.2)');
  }

  if (!PARTIAL_FAILURE_CONFIG.listFailedActions) {
    throw new Error('listFailedActions must be true (Requirement 14.3)');
  }
}

/**
 * Error handling summary for documentation
 */
export const ERROR_HANDLING_SUMMARY = {
  errorTypes: Object.keys(ErrorType).length,
  classifications: Object.keys(ERROR_CLASSIFICATION).map(key => ({
    type: key,
    ...ERROR_CLASSIFICATION[key as ErrorType],
  })),
  partialFailureHandling: PARTIAL_FAILURE_CONFIG,
  loggingEnabled: ERROR_LOGGING_CONFIG.enabled,
  notificationEnabled: ERROR_NOTIFICATION_CONFIG.enabled,
} as const;

// Validate configuration on module load
validateErrorConfig();
