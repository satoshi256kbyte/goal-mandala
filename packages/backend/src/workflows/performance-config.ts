/**
 * Performance Optimization Configuration
 *
 * This file defines performance optimization settings for the
 * Task Generation Workflow, including parallel processing tuning,
 * connection pooling, and caching strategies.
 *
 * Requirements: 12.1, 12.2, 12.3
 */

import { BATCH_CONFIG } from './batch-config';

/**
 * Parallel Processing Configuration
 *
 * Requirements: 12.1
 * - Use parallel processing for independent actions
 */
export const PARALLEL_PROCESSING_CONFIG = {
  /**
   * Maximum number of batches to process concurrently
   * Default: 3 (from BATCH_CONFIG)
   * Can be adjusted based on system load and Lambda concurrency limits
   */
  maxConcurrentBatches: BATCH_CONFIG.maxConcurrentBatches,

  /**
   * Maximum number of actions to process concurrently within a batch
   * Default: 8 (from BATCH_CONFIG)
   * Can be adjusted based on memory usage and throughput requirements
   */
  maxConcurrentActionsPerBatch: BATCH_CONFIG.maxConcurrentActionsPerBatch,

  /**
   * Maximum total concurrent Lambda invocations
   * Default: 24 (3 batches × 8 actions)
   * This prevents overwhelming the system while maintaining good performance
   */
  maxTotalConcurrentInvocations: BATCH_CONFIG.maxTotalConcurrentInvocations,

  /**
   * Enable dynamic concurrency adjustment based on system load
   * When enabled, the system will automatically adjust concurrency
   * based on Lambda throttling and error rates
   */
  enableDynamicConcurrency: false,

  /**
   * Minimum concurrency level (when dynamic adjustment is enabled)
   * Ensures at least this many concurrent invocations even under high load
   */
  minConcurrency: 1,

  /**
   * Maximum concurrency level (when dynamic adjustment is enabled)
   * Caps concurrent invocations to prevent overwhelming the system
   */
  maxConcurrency: 24,
} as const;

/**
 * Connection Pooling Configuration
 *
 * Requirements: 12.2
 * - Use connection pooling to reduce latency
 */
export const CONNECTION_POOL_CONFIG = {
  /**
   * Database connection pool configuration
   */
  database: {
    /**
     * Maximum number of connections in the pool
     * Default: 10
     * Balances connection reuse with resource consumption
     */
    maxConnections: 10,

    /**
     * Minimum number of connections to maintain in the pool
     * Default: 2
     * Ensures connections are available for immediate use
     */
    minConnections: 2,

    /**
     * Maximum time (in milliseconds) to wait for a connection
     * Default: 5000 (5 seconds)
     */
    acquireTimeout: 5000,

    /**
     * Maximum time (in milliseconds) a connection can be idle
     * Default: 30000 (30 seconds)
     * Idle connections are closed to free resources
     */
    idleTimeout: 30000,

    /**
     * Enable connection reuse across Lambda invocations
     * Default: true
     * Leverages Lambda execution environment reuse
     */
    enableConnectionReuse: true,
  },

  /**
   * HTTP client configuration for AI API calls
   */
  httpClient: {
    /**
     * Enable HTTP Keep-Alive
     * Default: true
     * Reuses TCP connections for multiple requests
     */
    enableKeepAlive: true,

    /**
     * Maximum number of sockets to keep alive
     * Default: 50
     */
    maxSockets: 50,

    /**
     * Maximum number of free sockets to keep alive
     * Default: 10
     */
    maxFreeSockets: 10,

    /**
     * Keep-Alive timeout (in milliseconds)
     * Default: 60000 (60 seconds)
     */
    keepAliveTimeout: 60000,

    /**
     * Enable connection pooling for HTTP requests
     * Default: true
     */
    enableConnectionPooling: true,
  },
} as const;

/**
 * Caching Configuration
 *
 * Requirements: 12.3
 * - Cache goal and action context to reduce database queries
 */
export const CACHE_CONFIG = {
  /**
   * Goal context cache configuration
   */
  goalContext: {
    /**
     * Enable goal context caching
     * Default: true
     * Caches goal information in Lambda execution environment
     */
    enabled: true,

    /**
     * Cache TTL (Time To Live) in milliseconds
     * Default: 300000 (5 minutes)
     * Cached data expires after this duration
     */
    ttl: 300000,

    /**
     * Maximum number of goal contexts to cache
     * Default: 100
     * Prevents excessive memory usage
     */
    maxSize: 100,

    /**
     * Enable cache warming
     * Default: false
     * Pre-loads frequently accessed goals into cache
     */
    enableCacheWarming: false,
  },

  /**
   * Action context cache configuration
   */
  actionContext: {
    /**
     * Enable action context caching
     * Default: true
     * Caches action information in memory during batch processing
     */
    enabled: true,

    /**
     * Cache TTL (Time To Live) in milliseconds
     * Default: 300000 (5 minutes)
     * Cached data expires after this duration
     */
    ttl: 300000,

    /**
     * Maximum number of action contexts to cache
     * Default: 500
     * Allows caching multiple batches of actions
     */
    maxSize: 500,

    /**
     * Enable batch prefetching
     * Default: true
     * Fetches all actions in a batch at once to populate cache
     */
    enableBatchPrefetch: true,
  },

  /**
   * Cache invalidation strategy
   */
  invalidation: {
    /**
     * Invalidate cache on goal update
     * Default: true
     * Ensures cache consistency when goals are modified
     */
    invalidateOnGoalUpdate: true,

    /**
     * Invalidate cache on action update
     * Default: true
     * Ensures cache consistency when actions are modified
     */
    invalidateOnActionUpdate: true,

    /**
     * Enable automatic cache cleanup
     * Default: true
     * Removes expired entries periodically
     */
    enableAutomaticCleanup: true,

    /**
     * Cache cleanup interval (in milliseconds)
     * Default: 60000 (1 minute)
     */
    cleanupInterval: 60000,
  },
} as const;

/**
 * Performance Monitoring Configuration
 *
 * Requirements: 12.4, 12.5
 * - Log execution time and performance metrics
 * - Detect performance degradation
 */
export const PERFORMANCE_MONITORING_CONFIG = {
  /**
   * Enable performance monitoring
   * Default: true
   */
  enabled: true,

  /**
   * Metrics to collect
   */
  metrics: {
    /**
     * Track workflow execution time
     * Default: true
     */
    trackExecutionTime: true,

    /**
     * Track action processing time
     * Default: true
     */
    trackActionProcessingTime: true,

    /**
     * Track database query time
     * Default: true
     */
    trackDatabaseQueryTime: true,

    /**
     * Track AI API latency
     * Default: true
     */
    trackAIAPILatency: true,

    /**
     * Track Lambda cold start time
     * Default: true
     */
    trackColdStartTime: true,

    /**
     * Track memory usage
     * Default: true
     */
    trackMemoryUsage: true,
  },

  /**
   * Performance thresholds for warnings
   */
  thresholds: {
    /**
     * Workflow execution time threshold (in milliseconds)
     * Default: 600000 (10 minutes)
     * Warn if workflow takes longer than this
     */
    workflowExecutionTime: 600000,

    /**
     * Action processing time threshold (in milliseconds)
     * Default: 120000 (2 minutes)
     * Warn if action processing takes longer than this
     */
    actionProcessingTime: 120000,

    /**
     * Database query time threshold (in milliseconds)
     * Default: 1000 (1 second)
     * Warn if database queries take longer than this
     */
    databaseQueryTime: 1000,

    /**
     * AI API latency threshold (in milliseconds)
     * Default: 5000 (5 seconds)
     * Warn if AI API calls take longer than this
     */
    aiAPILatency: 5000,

    /**
     * Lambda cold start time threshold (in milliseconds)
     * Default: 3000 (3 seconds)
     * Warn if cold starts take longer than this
     */
    coldStartTime: 3000,

    /**
     * Memory usage threshold (percentage)
     * Default: 80
     * Warn if memory usage exceeds this percentage
     */
    memoryUsagePercentage: 80,
  },

  /**
   * Performance optimization suggestions
   */
  suggestions: {
    /**
     * Enable automatic optimization suggestions
     * Default: true
     * Logs suggestions when performance degrades
     */
    enabled: true,

    /**
     * Suggestion types to enable
     */
    types: {
      /**
       * Suggest increasing concurrency
       * Default: true
       */
      increaseConcurrency: true,

      /**
       * Suggest enabling caching
       * Default: true
       */
      enableCaching: true,

      /**
       * Suggest connection pooling optimization
       * Default: true
       */
      optimizeConnectionPooling: true,

      /**
       * Suggest Lambda memory increase
       * Default: true
       */
      increaseLambdaMemory: true,

      /**
       * Suggest batch size adjustment
       * Default: true
       */
      adjustBatchSize: true,
    },
  },
} as const;

/**
 * Get current performance configuration summary
 *
 * @returns Performance configuration summary
 */
export function getPerformanceConfigSummary(): {
  parallelProcessing: typeof PARALLEL_PROCESSING_CONFIG;
  connectionPooling: typeof CONNECTION_POOL_CONFIG;
  caching: typeof CACHE_CONFIG;
  monitoring: typeof PERFORMANCE_MONITORING_CONFIG;
} {
  return {
    parallelProcessing: PARALLEL_PROCESSING_CONFIG,
    connectionPooling: CONNECTION_POOL_CONFIG,
    caching: CACHE_CONFIG,
    monitoring: PERFORMANCE_MONITORING_CONFIG,
  };
}

/**
 * Validate performance configuration
 *
 * Ensures that configuration values are within acceptable ranges
 *
 * @throws Error if configuration is invalid
 */
export function validatePerformanceConfig(): void {
  // Validate parallel processing config
  if (PARALLEL_PROCESSING_CONFIG.maxConcurrentBatches <= 0) {
    throw new Error('maxConcurrentBatches must be greater than 0');
  }

  if (PARALLEL_PROCESSING_CONFIG.maxConcurrentActionsPerBatch <= 0) {
    throw new Error('maxConcurrentActionsPerBatch must be greater than 0');
  }

  if (PARALLEL_PROCESSING_CONFIG.minConcurrency < 1) {
    throw new Error('minConcurrency must be at least 1');
  }

  if (PARALLEL_PROCESSING_CONFIG.maxConcurrency < PARALLEL_PROCESSING_CONFIG.minConcurrency) {
    throw new Error('maxConcurrency must be greater than or equal to minConcurrency');
  }

  // Validate connection pool config
  if (CONNECTION_POOL_CONFIG.database.maxConnections <= 0) {
    throw new Error('database.maxConnections must be greater than 0');
  }

  if (CONNECTION_POOL_CONFIG.database.minConnections < 0) {
    throw new Error('database.minConnections must be non-negative');
  }

  if (
    CONNECTION_POOL_CONFIG.database.minConnections > CONNECTION_POOL_CONFIG.database.maxConnections
  ) {
    throw new Error('database.minConnections must not exceed database.maxConnections');
  }

  if (CONNECTION_POOL_CONFIG.httpClient.maxSockets <= 0) {
    throw new Error('httpClient.maxSockets must be greater than 0');
  }

  if (CONNECTION_POOL_CONFIG.httpClient.maxFreeSockets < 0) {
    throw new Error('httpClient.maxFreeSockets must be non-negative');
  }

  // Validate cache config
  if (CACHE_CONFIG.goalContext.ttl <= 0) {
    throw new Error('goalContext.ttl must be greater than 0');
  }

  if (CACHE_CONFIG.goalContext.maxSize <= 0) {
    throw new Error('goalContext.maxSize must be greater than 0');
  }

  if (CACHE_CONFIG.actionContext.ttl <= 0) {
    throw new Error('actionContext.ttl must be greater than 0');
  }

  if (CACHE_CONFIG.actionContext.maxSize <= 0) {
    throw new Error('actionContext.maxSize must be greater than 0');
  }

  // Validate performance monitoring config
  if (PERFORMANCE_MONITORING_CONFIG.thresholds.workflowExecutionTime <= 0) {
    throw new Error('workflowExecutionTime threshold must be greater than 0');
  }

  if (PERFORMANCE_MONITORING_CONFIG.thresholds.actionProcessingTime <= 0) {
    throw new Error('actionProcessingTime threshold must be greater than 0');
  }

  if (
    PERFORMANCE_MONITORING_CONFIG.thresholds.memoryUsagePercentage <= 0 ||
    PERFORMANCE_MONITORING_CONFIG.thresholds.memoryUsagePercentage > 100
  ) {
    throw new Error('memoryUsagePercentage threshold must be between 0 and 100');
  }
}

// Validate configuration on module load
validatePerformanceConfig();
