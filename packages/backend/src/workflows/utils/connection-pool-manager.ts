/**
 * Connection Pool Manager
 *
 * Manages database and HTTP connection pools for optimal performance
 *
 * Requirements: 12.2
 * - Use connection pooling to reduce latency
 */

import { CONNECTION_POOL_CONFIG } from '../performance-config';
import http from 'http';
import https from 'https';

/**
 * Database Connection Pool Manager
 *
 * Manages Prisma database connections with pooling
 */
export class DatabaseConnectionPoolManager {
  private static instance: DatabaseConnectionPoolManager;
  private connectionCount: number = 0;
  private lastConnectionTime: number = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseConnectionPoolManager {
    if (!DatabaseConnectionPoolManager.instance) {
      DatabaseConnectionPoolManager.instance = new DatabaseConnectionPoolManager();
    }
    return DatabaseConnectionPoolManager.instance;
  }

  /**
   * Get connection pool configuration for Prisma
   *
   * @returns Prisma connection pool configuration
   */
  public getPoolConfig(): {
    connection_limit: number;
    pool_timeout: number;
  } {
    const config = CONNECTION_POOL_CONFIG.database;

    return {
      connection_limit: config.maxConnections,
      pool_timeout: Math.floor(config.acquireTimeout / 1000), // Convert to seconds
    };
  }

  /**
   * Track connection acquisition
   */
  public trackConnection(): void {
    this.connectionCount++;
    this.lastConnectionTime = Date.now();
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    lastConnectionTime: number;
    timeSinceLastConnection: number;
  } {
    return {
      totalConnections: this.connectionCount,
      lastConnectionTime: this.lastConnectionTime,
      timeSinceLastConnection: Date.now() - this.lastConnectionTime,
    };
  }

  /**
   * Check if connection pool is healthy
   *
   * @returns true if pool is healthy, false otherwise
   */
  public isHealthy(): boolean {
    const stats = this.getStats();
    const config = CONNECTION_POOL_CONFIG.database;

    // Check if connections are being acquired regularly
    if (stats.totalConnections > 0 && stats.timeSinceLastConnection > config.idleTimeout) {
      return false;
    }

    return true;
  }

  /**
   * Reset connection statistics
   */
  public reset(): void {
    this.connectionCount = 0;
    this.lastConnectionTime = 0;
  }
}

/**
 * HTTP Connection Pool Manager
 *
 * Manages HTTP/HTTPS connection pools for AI API calls
 */
export class HTTPConnectionPoolManager {
  private static instance: HTTPConnectionPoolManager;
  private httpAgent: http.Agent | null = null;
  private httpsAgent: https.Agent | null = null;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  private constructor() {
    this.initializeAgents();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): HTTPConnectionPoolManager {
    if (!HTTPConnectionPoolManager.instance) {
      HTTPConnectionPoolManager.instance = new HTTPConnectionPoolManager();
    }
    return HTTPConnectionPoolManager.instance;
  }

  /**
   * Initialize HTTP agents with connection pooling
   */
  private initializeAgents(): void {
    const config = CONNECTION_POOL_CONFIG.httpClient;

    if (!config.enableConnectionPooling) {
      return;
    }

    const agentOptions: http.AgentOptions = {
      keepAlive: config.enableKeepAlive,
      maxSockets: config.maxSockets,
      maxFreeSockets: config.maxFreeSockets,
      timeout: config.keepAliveTimeout,
    };

    this.httpAgent = new http.Agent(agentOptions);
    this.httpsAgent = new https.Agent(agentOptions);
  }

  /**
   * Get HTTP agent for connection pooling
   *
   * @returns HTTP agent or undefined if pooling is disabled
   */
  public getHTTPAgent(): http.Agent | undefined {
    return this.httpAgent || undefined;
  }

  /**
   * Get HTTPS agent for connection pooling
   *
   * @returns HTTPS agent or undefined if pooling is disabled
   */
  public getHTTPSAgent(): https.Agent | undefined {
    return this.httpsAgent || undefined;
  }

  /**
   * Track HTTP request
   */
  public trackRequest(): void {
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalRequests: number;
    lastRequestTime: number;
    timeSinceLastRequest: number;
    httpAgentSockets: number;
    httpsAgentSockets: number;
  } {
    return {
      totalRequests: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime,
      httpAgentSockets: this.httpAgent ? Object.keys(this.httpAgent.sockets).length : 0,
      httpsAgentSockets: this.httpsAgent ? Object.keys(this.httpsAgent.sockets).length : 0,
    };
  }

  /**
   * Check if connection pool is healthy
   *
   * @returns true if pool is healthy, false otherwise
   */
  public isHealthy(): boolean {
    const stats = this.getStats();
    const config = CONNECTION_POOL_CONFIG.httpClient;

    // Check if requests are being made regularly
    if (stats.totalRequests > 0 && stats.timeSinceLastRequest > config.keepAliveTimeout) {
      return false;
    }

    // Check if socket count is within limits
    if (stats.httpAgentSockets > config.maxSockets || stats.httpsAgentSockets > config.maxSockets) {
      return false;
    }

    return true;
  }

  /**
   * Destroy all agents and reset statistics
   */
  public destroy(): void {
    if (this.httpAgent) {
      this.httpAgent.destroy();
      this.httpAgent = null;
    }

    if (this.httpsAgent) {
      this.httpsAgent.destroy();
      this.httpsAgent = null;
    }

    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Reset connection statistics
   */
  public reset(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

/**
 * Get database connection pool manager instance
 *
 * @returns Database connection pool manager
 */
export function getDatabaseConnectionPool(): DatabaseConnectionPoolManager {
  return DatabaseConnectionPoolManager.getInstance();
}

/**
 * Get HTTP connection pool manager instance
 *
 * @returns HTTP connection pool manager
 */
export function getHTTPConnectionPool(): HTTPConnectionPoolManager {
  return HTTPConnectionPoolManager.getInstance();
}

/**
 * Get connection pool health status
 *
 * @returns Health status of all connection pools
 */
export function getConnectionPoolHealth(): {
  database: boolean;
  http: boolean;
  overall: boolean;
} {
  const dbPool = getDatabaseConnectionPool();
  const httpPool = getHTTPConnectionPool();

  const dbHealthy = dbPool.isHealthy();
  const httpHealthy = httpPool.isHealthy();

  return {
    database: dbHealthy,
    http: httpHealthy,
    overall: dbHealthy && httpHealthy,
  };
}

/**
 * Get connection pool statistics
 *
 * @returns Statistics for all connection pools
 */
export function getConnectionPoolStats(): {
  database: ReturnType<DatabaseConnectionPoolManager['getStats']>;
  http: ReturnType<HTTPConnectionPoolManager['getStats']>;
} {
  const dbPool = getDatabaseConnectionPool();
  const httpPool = getHTTPConnectionPool();

  return {
    database: dbPool.getStats(),
    http: httpPool.getStats(),
  };
}
