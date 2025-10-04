/**
 * 進捗セキュリティ管理サービスのテスト
 * 要件: 全要件 - セキュリティ対策
 */

import { ProgressSecurityManager } from '../progress-security-manager';
import { ProgressCalculationError } from '../../types/progress-errors';

describe('ProgressSecurityManager', () => {
  let securityManager: ProgressSecurityManager;

  beforeEach(() => {
    securityManager = new ProgressSecurityManager();
    securityManager.clearSecurityLogs();
  });

  describe('認証管理', () => {
    const validAuthInfo = {
      userId: 'user-123',
      token: 'jwt-token-123',
      expiresAt: new Date(Date.now() + 3600000), // 1時間後
      roles: ['user'],
      sessionId: 'session-123',
    };

    it('認証情報を正しく設定・取得できる', () => {
      securityManager.setAuthInfo(validAuthInfo);
      const authInfo = securityManager.getAuthInfo();
      expect(authInfo).toEqual(validAuthInfo);
    });

    it('有効な認証情報で認証状態を正しく判定する', () => {
      securityManager.setAuthInfo(validAuthInfo);
      expect(securityManager.isAuthenticated()).toBe(true);
    });

    it('認証情報がない場合に未認証と判定する', () => {
      expect(securityManager.isAuthenticated()).toBe(false);
    });

    it('期限切れの認証情報で未認証と判定する', () => {
      const expiredAuthInfo = {
        ...validAuthInfo,
        expiresAt: new Date(Date.now() - 1000), // 1秒前に期限切れ
      };
      securityManager.setAuthInfo(expiredAuthInfo);
      expect(securityManager.isAuthenticated()).toBe(false);
    });
  });

  describe('データアクセス制御', () => {
    const validAuthInfo = {
      userId: 'user-123',
      token: 'jwt-token-123',
      expiresAt: new Date(Date.now() + 3600000),
      roles: ['user'],
    };

    beforeEach(() => {
      securityManager.setAuthInfo(validAuthInfo);
    });

    it('所有者による読み取りアクセスを許可する', () => {
      const result = securityManager.checkDataAccess('goal', 'goal-123', 'user-123', 'read');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('所有者による書き込みアクセスを許可する', () => {
      const result = securityManager.checkDataAccess('task', 'task-123', 'user-123', 'write');
      expect(result.allowed).toBe(true);
    });

    it('他のユーザーのデータへのアクセスを拒否する', () => {
      const result = securityManager.checkDataAccess('goal', 'goal-123', 'other-user', 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Access denied');
      expect(result.errorCode).toBe(ProgressCalculationError.AUTHORIZATION_ERROR);
    });

    it('未認証ユーザーのアクセスを拒否する', () => {
      securityManager.setAuthInfo({
        ...validAuthInfo,
        expiresAt: new Date(Date.now() - 1000), // 期限切れ
      });

      const result = securityManager.checkDataAccess('goal', 'goal-123', 'user-123', 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not authenticated');
      expect(result.errorCode).toBe(ProgressCalculationError.AUTHENTICATION_ERROR);
    });

    it('削除操作を管理者以外に拒否する', () => {
      const result = securityManager.checkDataAccess('goal', 'goal-123', 'user-123', 'delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('admin role');
      expect(result.errorCode).toBe(ProgressCalculationError.AUTHORIZATION_ERROR);
    });

    it('管理者による削除操作を許可する', () => {
      securityManager.setAuthInfo({
        ...validAuthInfo,
        roles: ['admin'],
      });

      const result = securityManager.checkDataAccess('goal', 'goal-123', 'user-123', 'delete');
      expect(result.allowed).toBe(true);
    });
  });

  describe('データ整合性チェック', () => {
    const validData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Data',
      progress: 75,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('有効なデータの整合性チェックに成功する', () => {
      const result = securityManager.checkDataIntegrity(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効なデータ構造を検出する', () => {
      const result = securityManager.checkDataIntegrity(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid data structure');
    });

    it('必須フィールドの不足を検出する', () => {
      const invalidData = { ...validData };
      delete invalidData.id;

      const result = securityManager.checkDataIntegrity(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
      expect(result.suspiciousFields).toContain('id');
    });

    it('無効な日付フィールドを検出する', () => {
      const invalidData = {
        ...validData,
        createdAt: 'invalid-date',
      };

      const result = securityManager.checkDataIntegrity(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid createdAt date');
    });

    it('未来の日付を検出する', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const invalidData = {
        ...validData,
        createdAt: futureDate,
      };

      const result = securityManager.checkDataIntegrity(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('createdAt cannot be in the future');
    });

    it('進捗値の範囲外を検出する', () => {
      const invalidData = {
        ...validData,
        progress: 150,
      };

      const result = securityManager.checkDataIntegrity(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Progress value out of valid range');
    });

    it('無効なUUID形式を検出する', () => {
      const invalidData = {
        ...validData,
        id: 'invalid-uuid',
      };

      const result = securityManager.checkDataIntegrity(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid ID format');
    });

    it('チェックサムの不一致を検出する', () => {
      const checksum = securityManager.calculateChecksum(validData);
      const tamperedData = { ...validData, progress: 100 };

      const result = securityManager.checkDataIntegrity(tamperedData, checksum);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data checksum mismatch - possible tampering detected');
    });
  });

  describe('チェックサム計算', () => {
    it('同じデータに対して同じチェックサムを生成する', () => {
      const data = { id: '123', title: 'Test', progress: 50 };
      const checksum1 = securityManager.calculateChecksum(data);
      const checksum2 = securityManager.calculateChecksum(data);
      expect(checksum1).toBe(checksum2);
    });

    it('異なるデータに対して異なるチェックサムを生成する', () => {
      const data1 = { id: '123', title: 'Test', progress: 50 };
      const data2 = { id: '123', title: 'Test', progress: 75 };
      const checksum1 = securityManager.calculateChecksum(data1);
      const checksum2 = securityManager.calculateChecksum(data2);
      expect(checksum1).not.toBe(checksum2);
    });

    it('フィールドの順序に関係なく同じチェックサムを生成する', () => {
      const data1 = { id: '123', title: 'Test', progress: 50 };
      const data2 = { progress: 50, id: '123', title: 'Test' };
      const checksum1 = securityManager.calculateChecksum(data1);
      const checksum2 = securityManager.calculateChecksum(data2);
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('入力値のサニタイゼーション', () => {
    it('文字列のHTMLタグを除去する', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = securityManager.sanitizeInput(input, 'string');
      expect(sanitized).toBe('Hello World');
    });

    it('数値を正しく変換する', () => {
      expect(securityManager.sanitizeInput('123', 'number')).toBe(123);
      expect(securityManager.sanitizeInput('invalid', 'number')).toBe(0);
    });

    it('日付を正しく変換する', () => {
      const dateString = '2023-01-01';
      const sanitized = securityManager.sanitizeInput(dateString, 'date');
      expect(sanitized).toBeInstanceOf(Date);
      expect(sanitized.getFullYear()).toBe(2023);
    });

    it('ブール値を正しく変換する', () => {
      expect(securityManager.sanitizeInput('true', 'boolean')).toBe(true);
      expect(securityManager.sanitizeInput('false', 'boolean')).toBe(true); // 文字列なのでtrue
      expect(securityManager.sanitizeInput(0, 'boolean')).toBe(false);
    });
  });

  describe('セキュリティログ', () => {
    const validAuthInfo = {
      userId: 'user-123',
      token: 'jwt-token-123',
      expiresAt: new Date(Date.now() + 3600000),
      roles: ['user'],
    };

    beforeEach(() => {
      securityManager.setAuthInfo(validAuthInfo);
    });

    it('セキュリティイベントを正しくログに記録する', () => {
      securityManager.logSecurityEvent('test_action', 'test_resource', 'success');

      const logs = securityManager.getSecurityLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('test_action');
      expect(logs[0].resource).toBe('test_resource');
      expect(logs[0].result).toBe('success');
      expect(logs[0].userId).toBe('user-123');
    });

    it('失敗イベントをエラーメッセージ付きで記録する', () => {
      securityManager.logSecurityEvent('test_action', 'test_resource', 'failure', 'Test error');

      const logs = securityManager.getSecurityLogs();
      expect(logs[0].result).toBe('failure');
      expect(logs[0].errorMessage).toBe('Test error');
    });

    it('ログの上限を正しく管理する', () => {
      // 1001個のログを生成（上限は1000）
      for (let i = 0; i < 1001; i++) {
        securityManager.logSecurityEvent(`action_${i}`, 'resource', 'success');
      }

      const logs = securityManager.getSecurityLogs();
      expect(logs.length).toBeLessThanOrEqual(500); // 最新500件を保持
    });

    it('ログを制限数で取得できる', () => {
      for (let i = 0; i < 10; i++) {
        securityManager.logSecurityEvent(`action_${i}`, 'resource', 'success');
      }

      const logs = securityManager.getSecurityLogs(5);
      expect(logs).toHaveLength(5);
    });

    it('ログをクリアできる', () => {
      securityManager.logSecurityEvent('test_action', 'test_resource', 'success');
      expect(securityManager.getSecurityLogs()).toHaveLength(1);

      securityManager.clearSecurityLogs();
      expect(securityManager.getSecurityLogs()).toHaveLength(0);
    });
  });

  describe('不審なアクティビティの検出', () => {
    const validAuthInfo = {
      userId: 'user-123',
      token: 'jwt-token-123',
      expiresAt: new Date(Date.now() + 3600000),
      roles: ['user'],
    };

    beforeEach(() => {
      securityManager.setAuthInfo(validAuthInfo);
    });

    it('大量の失敗アクセスを検出する', () => {
      // 6回の失敗アクセスを記録
      for (let i = 0; i < 6; i++) {
        securityManager.logSecurityEvent('access_attempt', 'resource', 'failure');
      }

      const detection = securityManager.detectSuspiciousActivity();
      expect(detection.hasSuspiciousActivity).toBe(true);
      expect(detection.alerts.some(alert => alert.includes('High number of access failures'))).toBe(
        true
      );
    });

    it('異常なアクセスパターンを検出する', () => {
      // 21個の異なるリソースにアクセス
      for (let i = 0; i < 21; i++) {
        securityManager.logSecurityEvent('access', `resource_${i}`, 'success');
      }

      const detection = securityManager.detectSuspiciousActivity();
      expect(detection.hasSuspiciousActivity).toBe(true);
      expect(detection.alerts.some(alert => alert.includes('Unusual access pattern'))).toBe(true);
    });

    it('正常なアクティビティでは不審なアクティビティを検出しない', () => {
      // 少数の正常なアクセス
      for (let i = 0; i < 3; i++) {
        securityManager.logSecurityEvent('access', 'resource', 'success');
      }

      const detection = securityManager.detectSuspiciousActivity();
      expect(detection.hasSuspiciousActivity).toBe(false);
      expect(detection.alerts).toHaveLength(0);
    });
  });
});
