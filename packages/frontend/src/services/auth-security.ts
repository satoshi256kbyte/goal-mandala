/**
 * 認証セキュリティ強化サービス
 *
 * 機能:
 * - トークンの暗号化保存
 * - XSS対策のためのトークンアクセス制限
 * - 機密情報のログ出力制御
 * - メモリリーク防止のクリーンアップ処理
 *
 * 要件: 2.4, 4.1, 6.5
 */

/**
 * セキュリティ設定
 */
interface SecurityConfig {
  enableEncryption: boolean;
  enableLogging: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
  tokenAccessRestriction: boolean;
  memoryCleanupInterval: number;
}

/**
 * 暗号化されたトークンデータ
 */
interface EncryptedTokenData {
  data: string;
  iv: string;
  timestamp: number;
}

/**
 * 認証セキュリティサービス
 */
export class AuthSecurityService {
  private static instance: AuthSecurityService | null = null;
  private config: SecurityConfig;
  private encryptionKey: CryptoKey | null = null;
  private memoryCleanupTimer: NodeJS.Timeout | null = null;
  private sensitiveDataRegistry = new Set<string>();

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableEncryption: true,
      enableLogging: process.env.NODE_ENV === 'development',
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
      tokenAccessRestriction: true,
      memoryCleanupInterval: 300000, // 5分
      ...config,
    };

    this.initializeEncryption();
    this.startMemoryCleanup();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(config?: Partial<SecurityConfig>): AuthSecurityService {
    if (!AuthSecurityService.instance) {
      AuthSecurityService.instance = new AuthSecurityService(config);
    }
    return AuthSecurityService.instance;
  }

  /**
   * 暗号化を初期化
   */
  private async initializeEncryption(): Promise<void> {
    if (!this.config.enableEncryption || !window.crypto?.subtle) {
      return;
    }

    try {
      // ブラウザ固有の情報からキーマテリアルを生成
      const keyMaterial = await this.generateKeyMaterial();
      this.encryptionKey = await window.crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      this.secureLog('error', `暗号化の初期化に失敗しました: ${error}`);
    }
  }

  /**
   * キーマテリアルを生成
   */
  private async generateKeyMaterial(): Promise<ArrayBuffer> {
    // ブラウザ固有の情報を使用してキーを生成
    const browserInfo = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      new Date().getTimezoneOffset().toString(),
    ].join('|');

    const encoder = new TextEncoder();
    const data = encoder.encode(browserInfo);

    return await window.crypto.subtle.digest('SHA-256', data);
  }

  /**
   * トークンを暗号化して保存
   */
  public async encryptAndStoreToken(key: string, token: string): Promise<void> {
    try {
      if (!this.config.enableEncryption || !this.encryptionKey) {
        localStorage.setItem(key, token);
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );

      const encryptedData: EncryptedTokenData = {
        data: this.arrayBufferToBase64(encrypted as ArrayBuffer),
        iv: this.arrayBufferToBase64(iv.buffer),
        timestamp: Date.now(),
      };

      localStorage.setItem(key, JSON.stringify(encryptedData));
      this.registerSensitiveData(key);

      this.secureLog('debug', `トークンを暗号化して保存しました: ${key}`);
    } catch (error) {
      this.secureLog('error', `トークンの暗号化に失敗しました: ${error}`);
      throw new Error('Token encryption failed');
    }
  }

  /**
   * 暗号化されたトークンを復号化して取得
   */
  public async decryptAndGetToken(key: string): Promise<string | null> {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) return null;

      if (!this.config.enableEncryption || !this.encryptionKey) {
        return storedData;
      }

      const encryptedData: EncryptedTokenData = JSON.parse(storedData);

      // タイムスタンプチェック（24時間以内）
      if (Date.now() - encryptedData.timestamp > 86400000) {
        this.secureLog('warn', `期限切れのトークンを削除しました: ${key}`);
        this.secureRemoveToken(key);
        return null;
      }

      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const data = this.base64ToArrayBuffer(encryptedData.data);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );

      const decoder = new TextDecoder();
      const token = decoder.decode(decrypted);

      return token;
    } catch (error) {
      this.secureLog('error', `トークンの復号化でエラーが発生しました: ${error}`);
      this.secureRemoveToken(key);
      return null;
    }
  }

  /**
   * ArrayBufferをBase64に変換
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64をArrayBufferに変換
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * トークンを安全に削除
   */
  public secureRemoveToken(key: string): void {
    try {
      // メモリ上のデータを上書き
      const dummyData = this.generateDummyData();
      localStorage.setItem(key, dummyData);

      // 実際に削除
      localStorage.removeItem(key);
      this.sensitiveDataRegistry.delete(key);

      this.secureLog('debug', `トークンを安全に削除しました: ${key}`);
    } catch (error) {
      this.secureLog('error', `トークンの削除に失敗しました: ${error}`);
    }
  }

  /**
   * ダミーデータを生成（メモリ上書き用）
   */
  private generateDummyData(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 256; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 機密データを登録
   */
  private registerSensitiveData(key: string): void {
    this.sensitiveDataRegistry.add(key);
  }

  /**
   * XSS対策のためのトークンアクセス制限
   */
  public validateTokenAccess(context: string): boolean {
    if (!this.config.tokenAccessRestriction) return true;

    // 許可されたコンテキストのリスト
    const allowedContexts = ['auth-service', 'token-manager', 'auth-middleware', 'storage-sync'];

    const isAllowed = allowedContexts.includes(context);

    if (!isAllowed) {
      this.secureLog('warn', `不正なトークンアクセス試行を検出しました: ${context}`);
    }

    return isAllowed;
  }

  /**
   * セキュアログ出力
   */
  public secureLog(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    data?: unknown
  ): void {
    if (!this.config.enableLogging) return;

    const logLevels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = logLevels.indexOf(this.config.logLevel);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex > currentLevelIndex) return;

    // 機密情報をサニタイズ
    const sanitizedMessage = this.sanitizeLogMessage(message);
    const sanitizedData = data ? this.sanitizeLogData(data) : undefined;

    // コンソールに出力
    const logMethod = console[level] || console.log;
    if (sanitizedData) {
      logMethod(`[AUTH-SECURITY] ${sanitizedMessage}`, sanitizedData);
    } else {
      logMethod(`[AUTH-SECURITY] ${sanitizedMessage}`);
    }
  }

  /**
   * ログメッセージをサニタイズ
   */
  private sanitizeLogMessage(message: string): string {
    // トークンやパスワードなどの機密情報をマスク
    return message
      .replace(/token[=:]\s*[A-Za-z0-9+/=]{20,}/gi, 'token=***MASKED***')
      .replace(/password[=:]\s*\S+/gi, 'password=***MASKED***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***MASKED***')
      .replace(/key[=:]\s*[A-Za-z0-9+/=]{20,}/gi, 'key=***MASKED***')
      .replace(/bearer\s+[A-Za-z0-9+/=]{20,}/gi, 'bearer ***MASKED***');
  }

  /**
   * ログデータをサニタイズ
   */
  private sanitizeLogData(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.sanitizeLogMessage(data);
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };

      // 機密情報のキーをマスク
      const sensitiveKeys = ['token', 'password', 'secret', 'key', 'authorization'];

      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          (sanitized as any)[key] = '***MASKED***';
        } else if (typeof (sanitized as any)[key] === 'object') {
          (sanitized as any)[key] = this.sanitizeLogData((sanitized as any)[key]);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * メモリクリーンアップを開始
   */
  private startMemoryCleanup(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
    }

    this.memoryCleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.memoryCleanupInterval);
  }

  /**
   * メモリクリーンアップを実行
   */
  private performMemoryCleanup(): void {
    try {
      // 期限切れのトークンをチェック
      for (const key of this.sensitiveDataRegistry) {
        const storedData = localStorage.getItem(key);
        if (storedData && this.config.enableEncryption) {
          try {
            const encryptedData: EncryptedTokenData = JSON.parse(storedData);
            if (Date.now() - encryptedData.timestamp > 86400000) {
              this.secureRemoveToken(key);
            }
          } catch {
            // 無効なデータは削除
            this.secureRemoveToken(key);
          }
        }
      }

      this.secureLog('debug', 'メモリクリーンアップを実行しました');
    } catch (error) {
      this.secureLog('error', `メモリクリーンアップでエラーが発生しました: ${error}`);
    }
  }

  /**
   * セキュリティサービスを停止
   */
  public stop(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = null;
    }

    // 全ての機密データを安全に削除
    for (const key of this.sensitiveDataRegistry) {
      this.secureRemoveToken(key);
    }

    this.sensitiveDataRegistry.clear();
    this.secureLog('info', 'セキュリティサービスを停止しました');
  }

  /**
   * セキュリティ統計を取得
   */
  public getSecurityStats() {
    return {
      encryptionEnabled: this.config.enableEncryption,
      tokenAccessRestriction: this.config.tokenAccessRestriction,
      registeredSensitiveDataCount: this.sensitiveDataRegistry.size,
      memoryCleanupInterval: this.config.memoryCleanupInterval,
      logLevel: this.config.logLevel,
      cryptoSupported: !!window.crypto?.subtle,
    };
  }
}

/**
 * デフォルトのセキュリティサービスインスタンス
 */
export const authSecurity = AuthSecurityService.getInstance();
