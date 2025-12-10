/**
 * Cache Manager
 *
 * Manages in-memory caching for goal and action contexts
 *
 * Requirements: 12.3
 * - Cache goal and action context to reduce database queries
 */

import { CACHE_CONFIG } from '../performance-config';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Generic LRU Cache with TTL
 */
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttl: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxSize: number, ttl: number, enableAutomaticCleanup: boolean = true) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;

    if (enableAutomaticCleanup) {
      this.startAutomaticCleanup();
    }
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  public get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  public set(key: string, value: T): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + this.ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   *
   * @param key - Cache key
   * @returns true if key exists and is not expired
   */
  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete entry from cache
   *
   * @param key - Cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   *
   * @returns Number of entries in cache
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    utilizationPercentage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      utilizationPercentage: (this.cache.size / this.maxSize) * 100,
    };
  }

  /**
   * Clean up expired entries
   */
  public cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutomaticCleanup(): void {
    const cleanupInterval = CACHE_CONFIG.invalidation.cleanupInterval;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);

    // Prevent timer from keeping process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup timer
   */
  public stopAutomaticCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  public destroy(): void {
    this.stopAutomaticCleanup();
    this.clear();
  }
}

/**
 * Goal Context Cache Manager
 */
export class GoalContextCacheManager {
  private static instance: GoalContextCacheManager;
  private cache: LRUCache<any> | null = null;
  private hitCount: number = 0;
  private missCount: number = 0;

  private constructor() {
    this.initializeCache();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GoalContextCacheManager {
    if (!GoalContextCacheManager.instance) {
      GoalContextCacheManager.instance = new GoalContextCacheManager();
    }
    return GoalContextCacheManager.instance;
  }

  /**
   * Initialize cache
   */
  private initializeCache(): void {
    const config = CACHE_CONFIG.goalContext;

    if (!config.enabled) {
      return;
    }

    this.cache = new LRUCache(
      config.maxSize,
      config.ttl,
      CACHE_CONFIG.invalidation.enableAutomaticCleanup
    );
  }

  /**
   * Get goal context from cache
   *
   * @param goalId - Goal ID
   * @returns Cached goal context or undefined
   */
  public get(goalId: string): any | undefined {
    if (!this.cache) {
      return undefined;
    }

    const value = this.cache.get(goalId);

    if (value !== undefined) {
      this.hitCount++;
    } else {
      this.missCount++;
    }

    return value;
  }

  /**
   * Set goal context in cache
   *
   * @param goalId - Goal ID
   * @param context - Goal context
   */
  public set(goalId: string, context: any): void {
    if (!this.cache) {
      return;
    }

    this.cache.set(goalId, context);
  }

  /**
   * Invalidate goal context
   *
   * @param goalId - Goal ID
   */
  public invalidate(goalId: string): void {
    if (!this.cache) {
      return;
    }

    this.cache.delete(goalId);
  }

  /**
   * Clear all cached goal contexts
   */
  public clear(): void {
    if (!this.cache) {
      return;
    }

    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    enabled: boolean;
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    utilizationPercentage: number;
  } {
    if (!this.cache) {
      return {
        enabled: false,
        size: 0,
        maxSize: 0,
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        utilizationPercentage: 0,
      };
    }

    const cacheStats = this.cache.getStats();
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      enabled: true,
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      utilizationPercentage: cacheStats.utilizationPercentage,
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  public destroy(): void {
    if (this.cache) {
      this.cache.destroy();
      this.cache = null;
    }
    this.hitCount = 0;
    this.missCount = 0;
  }
}

/**
 * Action Context Cache Manager
 */
export class ActionContextCacheManager {
  private static instance: ActionContextCacheManager;
  private cache: LRUCache<any> | null = null;
  private hitCount: number = 0;
  private missCount: number = 0;

  private constructor() {
    this.initializeCache();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ActionContextCacheManager {
    if (!ActionContextCacheManager.instance) {
      ActionContextCacheManager.instance = new ActionContextCacheManager();
    }
    return ActionContextCacheManager.instance;
  }

  /**
   * Initialize cache
   */
  private initializeCache(): void {
    const config = CACHE_CONFIG.actionContext;

    if (!config.enabled) {
      return;
    }

    this.cache = new LRUCache(
      config.maxSize,
      config.ttl,
      CACHE_CONFIG.invalidation.enableAutomaticCleanup
    );
  }

  /**
   * Get action context from cache
   *
   * @param actionId - Action ID
   * @returns Cached action context or undefined
   */
  public get(actionId: string): any | undefined {
    if (!this.cache) {
      return undefined;
    }

    const value = this.cache.get(actionId);

    if (value !== undefined) {
      this.hitCount++;
    } else {
      this.missCount++;
    }

    return value;
  }

  /**
   * Set action context in cache
   *
   * @param actionId - Action ID
   * @param context - Action context
   */
  public set(actionId: string, context: any): void {
    if (!this.cache) {
      return;
    }

    this.cache.set(actionId, context);
  }

  /**
   * Set multiple action contexts in cache (batch prefetch)
   *
   * @param contexts - Map of action ID to context
   */
  public setMany(contexts: Map<string, any>): void {
    if (!this.cache) {
      return;
    }

    for (const [actionId, context] of contexts.entries()) {
      this.cache.set(actionId, context);
    }
  }

  /**
   * Invalidate action context
   *
   * @param actionId - Action ID
   */
  public invalidate(actionId: string): void {
    if (!this.cache) {
      return;
    }

    this.cache.delete(actionId);
  }

  /**
   * Clear all cached action contexts
   */
  public clear(): void {
    if (!this.cache) {
      return;
    }

    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    enabled: boolean;
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    utilizationPercentage: number;
  } {
    if (!this.cache) {
      return {
        enabled: false,
        size: 0,
        maxSize: 0,
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        utilizationPercentage: 0,
      };
    }

    const cacheStats = this.cache.getStats();
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      enabled: true,
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      utilizationPercentage: cacheStats.utilizationPercentage,
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  public destroy(): void {
    if (this.cache) {
      this.cache.destroy();
      this.cache = null;
    }
    this.hitCount = 0;
    this.missCount = 0;
  }
}

/**
 * Get goal context cache manager instance
 *
 * @returns Goal context cache manager
 */
export function getGoalContextCache(): GoalContextCacheManager {
  return GoalContextCacheManager.getInstance();
}

/**
 * Get action context cache manager instance
 *
 * @returns Action context cache manager
 */
export function getActionContextCache(): ActionContextCacheManager {
  return ActionContextCacheManager.getInstance();
}

/**
 * Get cache statistics for all caches
 *
 * @returns Statistics for all caches
 */
export function getAllCacheStats(): {
  goalContext: ReturnType<GoalContextCacheManager['getStats']>;
  actionContext: ReturnType<ActionContextCacheManager['getStats']>;
} {
  const goalCache = getGoalContextCache();
  const actionCache = getActionContextCache();

  return {
    goalContext: goalCache.getStats(),
    actionContext: actionCache.getStats(),
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  const goalCache = getGoalContextCache();
  const actionCache = getActionContextCache();

  goalCache.clear();
  actionCache.clear();
}

/**
 * Destroy all caches and cleanup resources
 */
export function destroyAllCaches(): void {
  const goalCache = getGoalContextCache();
  const actionCache = getActionContextCache();

  goalCache.destroy();
  actionCache.destroy();
}
