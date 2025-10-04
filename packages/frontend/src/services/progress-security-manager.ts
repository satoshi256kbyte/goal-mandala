/**
 * 進捗データのセキュリティ管理サービス
 * 要件: 全要件 - セキュリティ対策
 */

import { ProgressCalculationError } from '../types/progress-errors';

/**
 * アクセス制御の結果
 */
export interface AccessControlResult {
  /** アクセスが許可されたかどうか */
  allowed: boolean;
  /** 拒否理由（アクセスが拒否された場合） */
  reason?: string;
  /** エラーコード */
  errorCode?: ProgressCalculationError;
}

/**
 * ユーザー認証情報
 */
export interface UserAuthInfo {
  /** ユーザーID */
  userId: string;
  /** JWTトークン */
  token: string;
  /** トークンの有効期限 */
  expiresAt: Date;
  /** ユーザーロール */
  roles: string[];
  /** セッションID */
  sessionId?: string;
}

/**
 * データアクセス権限
 */
export interface DataAccessPermission {
  /** リソースタイプ */
  resourceType: 'goal' | 'subgoal' | 'action' | 'task' | 'progress';
  /** リソースID */
  resourceId: string;
  /** 所有者ユーザーID */
  ownerId: string;
  /** アクセス権限 */
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

/**
 * データ改ざん検証の結果
 */
export interface IntegrityCheckResult {
  /** データが改ざんされていないかどうか */
  isValid: boolean;
  /** 検証エラーメッセージ */
  errors: string[];
  /** 検証されたフィールド */
  verifiedFields: string[];
  /** 改ざんが疑われるフィールド */
  suspiciousFields: string[];
}

/**
 * セキュリティログエントリ
 */
export interface SecurityLogEntry {
  /** ログID */
  id: string;
  /** ユーザーID */
  userId: string;
  /** アクション */
  action: string;
  /** リソース */
  resource: string;
  /** IPアドレス */
  ipAddress?: string;
  /** ユーザーエージェント */
  userAgent?: string;
  /** 結果（成功/失敗） */
  result: 'success' | 'failure';
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
  /** タイムスタンプ */
  timestamp: Date;
}

/**
 * 進捗データセキュリティ管理クラス
 */
export class ProgressSecurityManager {
  private authInfo: UserAuthInfo | null = null;
  private securityLogs: SecurityLogEntry[] = [];

  /**
   * ユーザー認証情報を設定する
   */
  setAuthInfo(authInfo: UserAuthInfo): void {
    this.authInfo = authInfo;
  }

  /**
   * 現在の認証情報を取得する
   */
  getAuthInfo(): UserAuthInfo | null {
    return this.authInfo;
  }

  /**
   * ユーザーが認証されているかチェックする
   */
  isAuthenticated(): boolean {
    if (!this.authInfo) {
      return false;
    }

    // トークンの有効期限をチェック
    if (new Date() > this.authInfo.expiresAt) {
      this.authInfo = null;
      return false;
    }

    return true;
  }

  /**
   * データアクセス権限をチェックする
   */
  checkDataAccess(
    resourceType: 'goal' | 'subgoal' | 'action' | 'task' | 'progress',
    resourceId: string,
    ownerId: string,
    action: 'read' | 'write' | 'delete'
  ): AccessControlResult {
    // 認証チェック
    if (!this.isAuthenticated()) {
      this.logSecurityEvent(
        'data_access_denied',
        `${resourceType}:${resourceId}`,
        'failure',
        'User not authenticated'
      );
      return {
        allowed: false,
        reason: 'User not authenticated',
        errorCode: ProgressCalculationError.AUTHENTICATION_ERROR,
      };
    }

    const currentUserId = this.authInfo.userId;

    // 所有者チェック（ユーザーは自分のデータのみアクセス可能）
    if (currentUserId !== ownerId) {
      this.logSecurityEvent(
        'data_access_denied',
        `${resourceType}:${resourceId}`,
        'failure',
        `Access denied: user ${currentUserId} attempted to access data owned by ${ownerId}`
      );
      return {
        allowed: false,
        reason: 'Access denied: insufficient permissions',
        errorCode: ProgressCalculationError.AUTHORIZATION_ERROR,
      };
    }

    // 管理者ロールのチェック（将来の拡張用）
    const hasAdminRole = this.authInfo.roles.includes('admin');
    if (action === 'delete' && !hasAdminRole) {
      // 削除操作は管理者のみ許可（現在は使用しないが、将来の拡張用）
      this.logSecurityEvent(
        'data_delete_denied',
        `${resourceType}:${resourceId}`,
        'failure',
        'Delete operation requires admin role'
      );
      return {
        allowed: false,
        reason: 'Delete operation requires admin role',
        errorCode: ProgressCalculationError.AUTHORIZATION_ERROR,
      };
    }

    // アクセス許可
    this.logSecurityEvent('data_access_granted', `${resourceType}:${resourceId}`, 'success');

    return {
      allowed: true,
    };
  }

  /**
   * 進捗データの改ざんをチェックする
   */
  checkDataIntegrity(data: any, expectedChecksum?: string): IntegrityCheckResult {
    const errors: string[] = [];
    const verifiedFields: string[] = [];
    const suspiciousFields: string[] = [];

    try {
      // 基本的なデータ構造の検証
      if (!data || typeof data !== 'object') {
        errors.push('Invalid data structure');
        return {
          isValid: false,
          errors,
          verifiedFields,
          suspiciousFields,
        };
      }

      // 必須フィールドの存在チェック
      const requiredFields = ['id', 'createdAt', 'updatedAt'];
      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null) {
          errors.push(`Missing required field: ${field}`);
          suspiciousFields.push(field);
        } else {
          verifiedFields.push(field);
        }
      }

      // 日付フィールドの妥当性チェック
      if (data.createdAt && data.updatedAt) {
        const createdAt = new Date(data.createdAt);
        const updatedAt = new Date(data.updatedAt);

        if (isNaN(createdAt.getTime())) {
          errors.push('Invalid createdAt date');
          suspiciousFields.push('createdAt');
        }

        if (isNaN(updatedAt.getTime())) {
          errors.push('Invalid updatedAt date');
          suspiciousFields.push('updatedAt');
        }

        if (createdAt > updatedAt) {
          errors.push('createdAt cannot be after updatedAt');
          suspiciousFields.push('createdAt', 'updatedAt');
        }

        // 未来の日付チェック
        const now = new Date();
        if (createdAt > now) {
          errors.push('createdAt cannot be in the future');
          suspiciousFields.push('createdAt');
        }

        if (updatedAt > now) {
          errors.push('updatedAt cannot be in the future');
          suspiciousFields.push('updatedAt');
        }
      }

      // 進捗値の妥当性チェック
      if (data.progress !== undefined) {
        if (typeof data.progress !== 'number') {
          errors.push('Progress must be a number');
          suspiciousFields.push('progress');
        } else if (data.progress < -2 || data.progress > 100) {
          errors.push('Progress value out of valid range');
          suspiciousFields.push('progress');
        } else {
          verifiedFields.push('progress');
        }
      }

      // IDフィールドの形式チェック
      if (data.id && typeof data.id === 'string') {
        // UUIDの基本的な形式チェック
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(data.id)) {
          errors.push('Invalid ID format');
          suspiciousFields.push('id');
        } else {
          verifiedFields.push('id');
        }
      }

      // チェックサムの検証（提供されている場合）
      if (expectedChecksum) {
        const calculatedChecksum = this.calculateChecksum(data);
        if (calculatedChecksum !== expectedChecksum) {
          errors.push('Data checksum mismatch - possible tampering detected');
          suspiciousFields.push('_checksum');
        } else {
          verifiedFields.push('_checksum');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        verifiedFields,
        suspiciousFields,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        verifiedFields,
        suspiciousFields,
      };
    }
  }

  /**
   * データのチェックサムを計算する
   */
  calculateChecksum(data: any): string {
    try {
      // チェックサム計算用にデータを正規化
      const normalizedData = this.normalizeDataForChecksum(data);
      const dataString = JSON.stringify(normalizedData);

      // 簡単なハッシュ関数（実際の実装ではより強力なハッシュ関数を使用）
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 32bit整数に変換
      }

      return Math.abs(hash).toString(16);
    } catch (error) {
      return '';
    }
  }

  /**
   * 入力値のサニタイゼーション
   */
  sanitizeInput(input: any, fieldType: 'string' | 'number' | 'date' | 'boolean'): any {
    if (input === null || input === undefined) {
      return input;
    }

    switch (fieldType) {
      case 'string':
        if (typeof input !== 'string') {
          return String(input);
        }
        // HTMLタグの除去（より厳密な正規表現）
        return input
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();

      case 'number': {
        const num = Number(input);
        return isNaN(num) ? 0 : num;
      }

      case 'date': {
        if (input instanceof Date) {
          return input;
        }
        const date = new Date(input);
        return isNaN(date.getTime()) ? new Date() : date;
      }

      case 'boolean':
        return Boolean(input);

      default:
        return input;
    }
  }

  /**
   * セキュリティイベントをログに記録する
   */
  logSecurityEvent(
    action: string,
    resource: string,
    result: 'success' | 'failure',
    errorMessage?: string
  ): void {
    const logEntry: SecurityLogEntry = {
      id: this.generateLogId(),
      userId: this.authInfo?.userId || 'anonymous',
      action,
      resource,
      result,
      errorMessage,
      timestamp: new Date(),
    };

    this.securityLogs.push(logEntry);

    // ログの上限を設定（メモリ使用量制限）
    if (this.securityLogs.length > 1000) {
      this.securityLogs = this.securityLogs.slice(-500); // 最新500件を保持
    }

    // 重要なセキュリティイベントはコンソールにも出力
    if (result === 'failure') {
      console.warn(
        `[Security] ${action} failed for ${resource}: ${errorMessage || 'Unknown error'}`
      );
    }
  }

  /**
   * セキュリティログを取得する
   */
  getSecurityLogs(limit?: number): SecurityLogEntry[] {
    const logs = [...this.securityLogs].reverse(); // 最新順
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * セキュリティログをクリアする
   */
  clearSecurityLogs(): void {
    this.securityLogs = [];
  }

  /**
   * 不審なアクティビティを検出する
   */
  detectSuspiciousActivity(): {
    hasSuspiciousActivity: boolean;
    alerts: string[];
  } {
    const alerts: string[] = [];
    const recentLogs = this.securityLogs.filter(
      log => new Date().getTime() - log.timestamp.getTime() < 60000 // 過去1分間
    );

    // 短時間での大量の失敗アクセス
    const failureCount = recentLogs.filter(log => log.result === 'failure').length;
    if (failureCount > 5) {
      alerts.push(`High number of access failures: ${failureCount} in the last minute`);
    }

    // 異常なアクセスパターン
    const uniqueResources = new Set(recentLogs.map(log => log.resource));
    if (uniqueResources.size > 20) {
      alerts.push(
        `Unusual access pattern: ${uniqueResources.size} different resources accessed in the last minute`
      );
    }

    return {
      hasSuspiciousActivity: alerts.length > 0,
      alerts,
    };
  }

  /**
   * チェックサム計算用にデータを正規化する
   */
  private normalizeDataForChecksum(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeDataForChecksum(item));
    }

    // オブジェクトのキーをソートして正規化
    const normalized: any = {};
    const keys = Object.keys(data).sort();

    for (const key of keys) {
      // チェックサム計算に含めないフィールドをスキップ
      if (key.startsWith('_') || key === 'updatedAt') {
        continue;
      }
      normalized[key] = this.normalizeDataForChecksum(data[key]);
    }

    return normalized;
  }

  /**
   * ログIDを生成する
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// シングルトンインスタンスをエクスポート
export const progressSecurityManager = new ProgressSecurityManager();
