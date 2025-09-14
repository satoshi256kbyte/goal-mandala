/**
 * 型安全なコンテキストアクセサー
 *
 * 要件4.2, 4.3に対応：
 * - 型安全な方法でユーザー情報にアクセス
 * - 必要な情報（sub、email、name等）が含まれていることを保証
 */

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  AuthenticatedUser,
  AuthContext,
  AuthMetadata,
  TypedContextAccessor,
  isAuthenticatedUser,
  isAuthMetadata,
} from './types';

/**
 * 型安全なコンテキストアクセサーの実装
 */
export class ContextAccessorImpl implements TypedContextAccessor {
  /**
   * 認証されたユーザー情報を取得（要件4.2, 4.3）
   */
  getUser(c: Context): AuthenticatedUser {
    const user = c.get('user');
    const isAuthenticated = c.get('isAuthenticated');

    if (!isAuthenticated || !user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    if (!isAuthenticatedUser(user)) {
      throw new HTTPException(500, { message: 'Invalid user data in context' });
    }

    return user;
  }

  /**
   * オプショナルユーザー情報を取得（要件4.2, 4.3）
   */
  getUserOptional(c: Context): AuthenticatedUser | null {
    const isAuthenticated = c.get('isAuthenticated');
    if (!isAuthenticated) {
      return null;
    }

    const user = c.get('user');
    if (!user || !isAuthenticatedUser(user)) {
      return null;
    }

    return user;
  }

  /**
   * 認証コンテキストを取得（要件4.2, 4.3）
   */
  getAuthContext(c: Context): AuthContext {
    const user = this.getUser(c);
    const metadata = this.getAuthMetadata(c);

    if (!metadata) {
      throw new HTTPException(500, { message: 'Authentication metadata not found' });
    }

    return {
      user,
      isAuthenticated: true,
      metadata,
    };
  }

  /**
   * 認証メタデータを取得（要件4.2, 4.3）
   */
  getAuthMetadata(c: Context): AuthMetadata | null {
    const metadata = c.get('authMetadata');

    if (!metadata) {
      return null;
    }

    if (!isAuthMetadata(metadata)) {
      throw new HTTPException(500, { message: 'Invalid authentication metadata in context' });
    }

    return metadata;
  }

  /**
   * 認証状態を確認（要件4.2, 4.3）
   */
  isAuthenticated(c: Context): boolean {
    return c.get('isAuthenticated') === true;
  }

  /**
   * 権限チェック（要件4.2, 4.3）
   */
  hasPermission(c: Context, permission: string): boolean {
    const user = this.getUserOptional(c);
    if (!user) {
      return false;
    }

    // 将来的に権限システムと連携
    // 現在はグループベースの簡易実装
    return user.groups?.includes(permission) || false;
  }

  /**
   * ロールチェック（要件4.2, 4.3）
   */
  hasRole(c: Context, role: string): boolean {
    const user = this.getUserOptional(c);
    if (!user) {
      return false;
    }

    // 将来的にロールシステムと連携
    // 現在はグループベースの簡易実装
    return user.groups?.includes(`role:${role}`) || false;
  }

  /**
   * グループチェック（要件4.2, 4.3）
   */
  hasGroup(c: Context, group: string): boolean {
    const user = this.getUserOptional(c);
    if (!user) {
      return false;
    }

    return user.groups?.includes(group) || false;
  }
}

// シングルトンインスタンス
export const contextAccessor = new ContextAccessorImpl();

// 便利な関数エクスポート
export const {
  getUser,
  getUserOptional,
  getAuthContext,
  getAuthMetadata,
  isAuthenticated,
  hasPermission,
  hasRole,
  hasGroup,
} = contextAccessor;
