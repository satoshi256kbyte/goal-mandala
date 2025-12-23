/**
 * Batch Processing Configuration
 *
 * This file defines the configuration for batch processing in the
 * Task Generation Workflow.
 */

/**
 * Maximum number of actions per batch
 *
 * Requirements: 2.1
 * - Actions are divided into batches of maximum 8 actions
 */
export const MAX_ACTIONS_PER_BATCH = 8;

/**
 * Maximum number of batches to process concurrently
 *
 * Requirements: 2.2
 * - Maximum 3 batches can be processed in parallel
 *
 * This balances memory usage and throughput:
 * - 3 batches × 8 actions = 24 concurrent Lambda invocations max
 * - Prevents overwhelming the system while maintaining good performance
 */
export const MAX_CONCURRENT_BATCHES = 3;

/**
 * Maximum number of actions to process concurrently within a batch
 *
 * Requirements: 2.2
 * - Each action in a batch is processed in parallel
 * - Maximum 8 actions per batch
 *
 * This allows for efficient parallel processing while respecting
 * Lambda concurrency limits.
 */
export const MAX_CONCURRENT_ACTIONS_PER_BATCH = 8;

/**
 * Batch processing configuration summary
 */
export const BATCH_CONFIG = {
  /** Maximum actions per batch */
  maxActionsPerBatch: MAX_ACTIONS_PER_BATCH,
  /** Maximum concurrent batches */
  maxConcurrentBatches: MAX_CONCURRENT_BATCHES,
  /** Maximum concurrent actions per batch */
  maxConcurrentActionsPerBatch: MAX_CONCURRENT_ACTIONS_PER_BATCH,
  /** Maximum total concurrent Lambda invocations */
  maxTotalConcurrentInvocations: MAX_CONCURRENT_BATCHES * MAX_CONCURRENT_ACTIONS_PER_BATCH,
} as const;

/**
 * Calculate the number of batches needed for a given number of actions
 *
 * @param actionCount - Total number of actions to process
 * @returns Number of batches needed
 *
 * @example
 * calculateBatchCount(5)  // Returns 1
 * calculateBatchCount(8)  // Returns 1
 * calculateBatchCount(9)  // Returns 2
 * calculateBatchCount(16) // Returns 2
 * calculateBatchCount(17) // Returns 3
 */
export function calculateBatchCount(actionCount: number): number {
  if (actionCount <= 0) {
    return 0;
  }
  return Math.ceil(actionCount / MAX_ACTIONS_PER_BATCH);
}

/**
 * Calculate the size of a specific batch
 *
 * @param actionCount - Total number of actions
 * @param batchIndex - Index of the batch (0-based)
 * @returns Number of actions in the specified batch
 *
 * @example
 * calculateBatchSize(10, 0) // Returns 8 (first batch)
 * calculateBatchSize(10, 1) // Returns 2 (second batch)
 * calculateBatchSize(16, 0) // Returns 8 (first batch)
 * calculateBatchSize(16, 1) // Returns 8 (second batch)
 */
export function calculateBatchSize(actionCount: number, batchIndex: number): number {
  const totalBatches = calculateBatchCount(actionCount);

  if (batchIndex < 0 || batchIndex >= totalBatches) {
    return 0;
  }

  const startIndex = batchIndex * MAX_ACTIONS_PER_BATCH;
  const remainingActions = actionCount - startIndex;

  return Math.min(remainingActions, MAX_ACTIONS_PER_BATCH);
}

/**
 * Validate batch processing configuration
 *
 * Ensures that the configuration values are within acceptable ranges
 * and meet the requirements.
 *
 * @throws Error if configuration is invalid
 */
export function validateBatchConfig(): void {
  if (MAX_ACTIONS_PER_BATCH <= 0) {
    throw new Error('MAX_ACTIONS_PER_BATCH must be greater than 0');
  }

  if (MAX_ACTIONS_PER_BATCH > 8) {
    throw new Error('MAX_ACTIONS_PER_BATCH must not exceed 8 (Requirement 2.1)');
  }

  if (MAX_CONCURRENT_BATCHES <= 0) {
    throw new Error('MAX_CONCURRENT_BATCHES must be greater than 0');
  }

  if (MAX_CONCURRENT_BATCHES > 3) {
    throw new Error('MAX_CONCURRENT_BATCHES must not exceed 3 (Requirement 2.2)');
  }

  if (MAX_CONCURRENT_ACTIONS_PER_BATCH <= 0) {
    throw new Error('MAX_CONCURRENT_ACTIONS_PER_BATCH must be greater than 0');
  }

  if (MAX_CONCURRENT_ACTIONS_PER_BATCH > 8) {
    throw new Error('MAX_CONCURRENT_ACTIONS_PER_BATCH must not exceed 8 (Requirement 2.2)');
  }
}

/**
 * Get batch processing statistics for a given number of actions
 *
 * @param actionCount - Total number of actions
 * @returns Statistics about batch processing
 *
 * @example
 * getBatchStats(20)
 * // Returns:
 * // {
 * //   totalActions: 20,
 * //   totalBatches: 3,
 * //   maxConcurrentBatches: 3,
 * //   maxConcurrentActions: 8,
 * //   maxTotalConcurrentInvocations: 24,
 * //   batchSizes: [8, 8, 4]
 * // }
 */
export function getBatchStats(actionCount: number): {
  totalActions: number;
  totalBatches: number;
  maxConcurrentBatches: number;
  maxConcurrentActions: number;
  maxTotalConcurrentInvocations: number;
  batchSizes: number[];
} {
  const totalBatches = calculateBatchCount(actionCount);
  const batchSizes: number[] = [];

  for (let i = 0; i < totalBatches; i++) {
    batchSizes.push(calculateBatchSize(actionCount, i));
  }

  return {
    totalActions: actionCount,
    totalBatches,
    maxConcurrentBatches: MAX_CONCURRENT_BATCHES,
    maxConcurrentActions: MAX_CONCURRENT_ACTIONS_PER_BATCH,
    maxTotalConcurrentInvocations: BATCH_CONFIG.maxTotalConcurrentInvocations,
    batchSizes,
  };
}

/**
 * Batch processing order configuration
 *
 * Requirements: 2.4
 * - Batches are processed in order
 * - Actions within a batch maintain their order
 */
export const BATCH_ORDER_CONFIG = {
  /** Whether to maintain batch order (sequential batch processing) */
  maintainBatchOrder: true,
  /** Whether to maintain action order within batches */
  maintainActionOrder: true,
} as const;

// Validate configuration on module load
validateBatchConfig();
