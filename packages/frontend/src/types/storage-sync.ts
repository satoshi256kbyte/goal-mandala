/**
 * StorageSync関連の型定義
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  profileComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  sessionId: string;
  lastActivity: Date;
}

export interface StorageSyncOptions {
  storageKey?: string;
  syncInterval?: number;
  maxRetries?: number;
}

export interface SyncMessage {
  timestamp: number;
  sessionId: string;
  authState: AuthState | null;
  action: 'login' | 'logout';
}

export type StorageChangeCallback = (event: StorageEvent) => void;
export type AuthStateChangeCallback = (state: AuthState | null) => void;

export interface StorageSyncInterface {
  startSync(): void;
  stopSync(): void;
  broadcastAuthStateChange(state: AuthState | null): void;
  onStorageChange(callback: StorageChangeCallback): void;
  removeStorageListener(callback: StorageChangeCallback): void;
  onAuthStateChange(callback: AuthStateChangeCallback): void;
  removeAuthStateListener(callback: AuthStateChangeCallback): void;
  destroy(): void;
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  SESSION_ID: 'auth_session_id',
  LAST_ACTIVITY: 'auth_last_activity',
  AUTH_STATE: 'auth_state',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
