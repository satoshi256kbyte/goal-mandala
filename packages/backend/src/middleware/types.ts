/**
 * JWT認証ミドルウェア関連の型定義
 *
 * 要件4.2, 4.3に対応：
 * - 型安全な方法でユーザー情報にアクセス
 * - 必要な情報（sub、email、name等）が含まれていることを保証
 */

import { MiddlewareHandler, Context } from 'hono';

// Honoコンテキストの型拡張（要件4.2, 4.3）
declare module 'hono' {
  interface ContextVariableMap {
    userId?: string;
    isAdmin?: boolean;
    user?: AuthenticatedUser;
    isAuthenticated?: boolean;
    authContext?: AuthContext;
    requestId?: string;
    authMetadata?: AuthMetadata;
  }
}

// 認証メタデータ（要件4.2, 4.3）
export interface AuthMetadata {
  authMethod: 'jwt' | 'mock'; // 認証方式
  tokenType?: 'access' | 'id'; // トークン種別（JWT認証の場合）
  issuedAt?: Date; // トークン発行時刻
  expiresAt?: Date; // トークン有効期限
  authTime?: Date; // 認証時刻
  sessionId?: string; // セッションID
  ipAddress?: string; // IPアドレス
  userAgent?: string; // ユーザーエージェント
}

// Cognito JWT ペイロード（要件4.2, 4.3）
export interface CognitoJWTPayload {
  sub: string; // ユーザーID（必須）
  email: string; // メールアドレス（必須）
  name?: string; // 表示名（オプション）
  iss: string; // 発行者（Cognito User Pool）（必須）
  aud: string; // 対象者（Client ID）（必須）
  token_use: 'access' | 'id'; // トークン種別（必須）
  exp: number; // 有効期限（必須）
  iat: number; // 発行時刻（必須）
  auth_time?: number; // 認証時刻（オプション）
  'cognito:username'?: string; // Cognitoユーザー名（オプション）
  'cognito:groups'?: string[]; // Cognitoグループ（オプション）
  email_verified?: boolean; // メール認証済み（オプション）
  phone_number?: string; // 電話番号（オプション）
  phone_number_verified?: boolean; // 電話番号認証済み（オプション）
}

// 認証されたユーザー情報（要件4.2, 4.3）
export interface AuthenticatedUser {
  readonly id: string; // ユーザーID（sub）（必須）
  readonly email: string; // メールアドレス（必須）
  readonly name?: string; // 表示名（オプション）
  readonly cognitoSub: string; // CognitoサブジェクトID（必須）
  readonly cognitoUsername?: string; // Cognitoユーザー名（オプション）
  readonly groups?: readonly string[]; // 所属グループ（オプション）
  readonly emailVerified?: boolean; // メール認証済み（オプション）
  readonly phoneNumber?: string; // 電話番号（オプション）
  readonly phoneNumberVerified?: boolean; // 電話番号認証済み（オプション）
  readonly customAttributes?: Readonly<Record<string, unknown>>; // カスタム属性（オプション）
  readonly createdAt?: Date; // アカウント作成日時（オプション）
  readonly updatedAt?: Date; // 最終更新日時（オプション）
  readonly lastLoginAt?: Date; // 最終ログイン日時（オプション）
}

// 認証コンテキスト（要件4.2, 4.3）
export interface AuthContext {
  readonly user: AuthenticatedUser;
  readonly isAuthenticated: boolean;
  readonly metadata: AuthMetadata;
  readonly permissions?: readonly string[]; // ユーザー権限（オプション）
  readonly roles?: readonly string[]; // ユーザーロール（オプション）
  readonly scopes?: readonly string[]; // OAuth スコープ（オプション）
}

// モックユーザー設定（要件6.1, 6.2, 6.3）
export interface MockUserConfig {
  id: string; // ユーザーID（必須）
  email: string; // メールアドレス（必須）
  name?: string; // 表示名（オプション）
  cognitoSub: string; // CognitoサブジェクトID（必須）
  cognitoUsername?: string; // Cognitoユーザー名（オプション）
  groups?: string[]; // 所属グループ（オプション）
  emailVerified?: boolean; // メール認証済み（オプション）
  phoneNumber?: string; // 電話番号（オプション）
  phoneNumberVerified?: boolean; // 電話番号認証済み（オプション）
  customAttributes?: Record<string, unknown>; // カスタム属性（オプション）
}

// ミドルウェアオプション（要件1.1, 1.2, 1.3, 6.1, 6.2, 6.3）
export interface AuthMiddlewareOptions {
  readonly userPoolId: string; // Cognito User Pool ID（必須）
  readonly clientId: string; // Cognito Client ID（必須）
  readonly region: string; // AWSリージョン（必須）
  readonly enableMockAuth?: boolean; // モック認証有効化（オプション、デフォルト: false）
  readonly mockUser?: MockUserConfig; // モックユーザー設定（オプション）
  readonly cacheTimeout?: number; // キャッシュタイムアウト秒数（オプション、デフォルト: 3600）
  readonly allowedTokenUse?: readonly ('access' | 'id')[]; // 許可するトークン種別（オプション、デフォルト: ['access', 'id']）
  readonly clockTolerance?: number; // 時刻ずれ許容秒数（オプション、デフォルト: 300）
  readonly enableSecurityAudit?: boolean; // セキュリティ監査ログ有効化（オプション）
  readonly requireEmailVerification?: boolean; // メール認証必須（オプション、デフォルト: false）
  readonly allowedGroups?: readonly string[]; // 許可するCognitoグループ（オプション）
  readonly requiredScopes?: readonly string[]; // 必須スコープ（オプション）
  readonly customClaimsValidator?: CustomClaimsValidator; // カスタムクレーム検証関数（オプション）
  readonly onAuthSuccess?: AuthSuccessCallback; // 認証成功時コールバック（オプション）
  readonly onAuthFailure?: AuthFailureCallback; // 認証失敗時コールバック（オプション）
}

// JWT認証ミドルウェアインターフェース（要件1.1, 1.5）
export interface JWTAuthMiddleware {
  // Honoミドルウェア関数
  authenticate(options?: Partial<AuthMiddlewareOptions>): MiddlewareHandler;

  // 設定可能なオプション
  configure(options: AuthMiddlewareOptions): void;

  // オプショナル認証（認証されていなくてもエラーにしない）
  authenticateOptional(options?: Partial<AuthMiddlewareOptions>): MiddlewareHandler;

  // 権限ベース認証
  requirePermissions(
    permissions: readonly string[],
    options?: Partial<AuthMiddlewareOptions>
  ): MiddlewareHandler;

  // ロールベース認証
  requireRoles(
    roles: readonly string[],
    options?: Partial<AuthMiddlewareOptions>
  ): MiddlewareHandler;

  // グループベース認証
  requireGroups(
    groups: readonly string[],
    options?: Partial<AuthMiddlewareOptions>
  ): MiddlewareHandler;
}

// JWT ヘッダー型定義（要件2.1）
export interface JWTHeader {
  alg: string; // アルゴリズム（RS256のみサポート）
  kid: string; // キーID（必須）
  typ: string; // トークンタイプ（JWT）
}

// JWT ペイロード型定義（基本）（要件2.2, 2.3, 2.4）
export interface JWTPayload {
  [key: string]: unknown;
  iss?: string; // 発行者
  sub?: string; // サブジェクト
  aud?: string | string[]; // オーディエンス
  exp?: number; // 有効期限
  nbf?: number; // 有効開始時刻
  iat?: number; // 発行時刻
  jti?: string; // JWT ID
}

// JWT検証インターフェース（要件2.1, 2.2, 2.3, 2.4）
export interface JWTValidator {
  // トークン検証メイン処理
  validateToken(token: string): Promise<CognitoJWTPayload>;

  // 署名検証
  verifySignature(token: string, kid: string): Promise<JWTPayload>;

  // クレーム検証
  validateClaims(payload: JWTPayload): CognitoJWTPayload;

  // トークン形式・構造検証
  validateTokenStructure(token: string): { header: JWTHeader; payload: JWTPayload };
}

// Cognito公開鍵管理インターフェース（要件5.1, 5.2, 5.3, 5.4）
export interface CognitoKeyManager {
  // 公開鍵取得（キャッシュ機能付き）
  getPublicKey(kid: string): Promise<string>;

  // キャッシュクリア
  clearCache(): void;

  // キャッシュ状態確認
  isCacheValid(): boolean;

  // 検証失敗時のキャッシュクリア・再取得
  handleVerificationFailure(kid: string): Promise<string>;
}

// 公開鍵キャッシュ（要件5.1, 5.2, 5.3）
export interface PublicKeyCache {
  keys: Map<string, string>; // kid -> PEM形式公開鍵のマップ
  timestamp: number; // キャッシュ作成時刻（ミリ秒）
  ttl: number; // キャッシュ有効期限（ミリ秒）
}

// Cognito JWKS レスポンス型（要件5.1）
export interface JWKSResponse {
  keys: Array<{
    alg: string; // アルゴリズム
    e: string; // RSA公開指数
    kid: string; // キーID
    kty: string; // キータイプ
    n: string; // RSAモジュラス
    use: string; // 用途
  }>;
}

// エラー種別（要件3.1, 3.2, 3.3, 3.4）
export enum AuthErrorType {
  TOKEN_MISSING = 'TOKEN_MISSING', // Authorizationヘッダーなし
  TOKEN_INVALID = 'TOKEN_INVALID', // トークン形式不正
  TOKEN_EXPIRED = 'TOKEN_EXPIRED', // トークン有効期限切れ
  SIGNATURE_INVALID = 'SIGNATURE_INVALID', // 署名検証失敗
  CLAIMS_INVALID = 'CLAIMS_INVALID', // クレーム検証失敗
  INTERNAL_ERROR = 'INTERNAL_ERROR', // サーバー内部エラー
}

// エラーレスポンス（要件3.1）
export interface AuthErrorResponse {
  error: string; // エラータイプ
  message: string; // エラーメッセージ
  statusCode: number; // HTTPステータスコード
  timestamp: string; // エラー発生時刻（ISO 8601形式）
}

// 認証エラーコンテキスト（要件3.4）
export interface AuthErrorContext {
  requestId: string; // リクエストID
  ipAddress: string; // IPアドレス
  userAgent: string; // ユーザーエージェント
  userId?: string; // ユーザーID（認証済みの場合）
  endpoint?: string; // エンドポイント
  method?: string; // HTTPメソッド
}

// 型付きエラー（要件3.1）
export interface TypedAuthError extends Error {
  type: AuthErrorType;
}

// セキュリティ監査ログ（要件3.4）
export interface SecurityAuditLog {
  timestamp: string; // ログ時刻（ISO 8601形式）
  event: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'TOKEN_REFRESH' | 'CACHE_CLEAR' | 'KEY_ROTATION'; // イベント種別
  userId?: string; // ユーザーID（認証済みの場合）
  ipAddress: string; // IPアドレス
  userAgent: string; // ユーザーエージェント
  requestId: string; // リクエストID
  details?: Record<string, unknown>; // 追加詳細情報
}

// エラーログ（要件3.4）
export interface AuthErrorLog {
  timestamp: string; // ログ時刻（ISO 8601形式）
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'; // ログレベル
  errorType: AuthErrorType; // エラータイプ
  message: string; // エラーメッセージ
  userId?: string; // ユーザーID（認証済みの場合）
  requestId: string; // リクエストID
  userAgent?: string; // ユーザーエージェント
  ipAddress?: string; // IPアドレス
  stackTrace?: string; // スタックトレース（開発環境のみ）
}

// キャッシュ統計情報（要件5.1, 5.2, 5.3）
export interface CacheStats {
  keyCount: number; // キャッシュされたキー数
  cacheAge: number; // キャッシュ経過時間（ミリ秒）
  isValid: boolean; // キャッシュ有効性
  ttl: number; // キャッシュ有効期限（ミリ秒）
  hitCount?: number; // キャッシュヒット数
  missCount?: number; // キャッシュミス数
}

// コールバック関数の型定義（要件4.2, 4.3）
export type AuthSuccessCallback = (context: AuthSuccessContext) => Promise<void> | void;
export type AuthFailureCallback = (context: AuthFailureContext) => Promise<void> | void;
export type CustomClaimsValidator = (payload: CognitoJWTPayload) => Promise<boolean> | boolean;

// 認証成功コンテキスト
export interface AuthSuccessContext {
  readonly user: AuthenticatedUser;
  readonly metadata: AuthMetadata;
  readonly request: {
    readonly method: string;
    readonly path: string;
    readonly headers: Record<string, string>;
    readonly ip: string;
    readonly userAgent: string;
  };
}

// 認証失敗コンテキスト
export interface AuthFailureContext {
  readonly error: TypedAuthError;
  readonly request: {
    readonly method: string;
    readonly path: string;
    readonly headers: Record<string, string>;
    readonly ip: string;
    readonly userAgent: string;
  };
  readonly token?: string; // 部分的なトークン情報（セキュリティ上、完全なトークンは含めない）
}

// ユーザー情報取得関数の型定義（要件4.2, 4.3）
export type GetCurrentUserFunction = (c: Context) => AuthenticatedUser;
export type GetCurrentUserOptionalFunction = (c: Context) => AuthenticatedUser | null;
export type GetAuthContextFunction = (c: Context) => AuthContext;
export type GetAuthMetadataFunction = (c: Context) => AuthMetadata | null;

// トークン抽出関数の型定義
export type ExtractBearerTokenFunction = (authHeader: string) => string | null;

// ユーザー作成関数の型定義
export type CreateAuthenticatedUserFunction = (payload: CognitoJWTPayload) => AuthenticatedUser;
export type CreateMockUserFunction = (
  mockUserConfig?: MockUserConfig,
  config?: AuthEnvironmentConfig
) => AuthenticatedUser;

// エラー作成関数の型定義
export type CreateAuthErrorFunction = (type: AuthErrorType, message: string) => TypedAuthError;

// 検証関数の型定義
export type ValidateStringClaimFunction = (value: unknown, claimName: string) => string;
export type ValidateNumberClaimFunction = (value: unknown, claimName: string) => number;
export type ValidateTokenUseClaimFunction = (value: unknown) => 'access' | 'id';

// 環境設定型定義（要件6.1, 6.2, 6.3）
export interface AuthEnvironmentConfig {
  NODE_ENV: string; // 実行環境
  COGNITO_USER_POOL_ID: string; // Cognito User Pool ID
  COGNITO_CLIENT_ID: string; // Cognito Client ID
  AWS_REGION: string; // AWSリージョン
  ENABLE_MOCK_AUTH: boolean; // モック認証有効化
  MOCK_USER_ID: string; // モックユーザーID
  MOCK_USER_EMAIL: string; // モックユーザーメール
  MOCK_USER_NAME: string; // モックユーザー名
  JWT_CACHE_TTL: number; // JWTキャッシュTTL
  ENABLE_SECURITY_AUDIT: boolean; // セキュリティ監査ログ有効化
}

// 型ガード関数（要件4.2, 4.3）
export function isAuthenticatedUser(user: unknown): user is AuthenticatedUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof (user as AuthenticatedUser).id === 'string' &&
    typeof (user as AuthenticatedUser).email === 'string' &&
    typeof (user as AuthenticatedUser).cognitoSub === 'string'
  );
}

export function isCognitoJWTPayload(payload: unknown): payload is CognitoJWTPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as CognitoJWTPayload).sub === 'string' &&
    typeof (payload as CognitoJWTPayload).email === 'string' &&
    typeof (payload as CognitoJWTPayload).iss === 'string' &&
    typeof (payload as CognitoJWTPayload).aud === 'string' &&
    ((payload as CognitoJWTPayload).token_use === 'access' ||
      (payload as CognitoJWTPayload).token_use === 'id') &&
    typeof (payload as CognitoJWTPayload).exp === 'number' &&
    typeof (payload as CognitoJWTPayload).iat === 'number'
  );
}

export function isTypedAuthError(error: unknown): error is TypedAuthError {
  return (
    error instanceof Error &&
    'type' in error &&
    Object.values(AuthErrorType).includes((error as TypedAuthError).type)
  );
}

export function isAuthContext(context: unknown): context is AuthContext {
  return (
    typeof context === 'object' &&
    context !== null &&
    isAuthenticatedUser((context as AuthContext).user) &&
    typeof (context as AuthContext).isAuthenticated === 'boolean' &&
    typeof (context as AuthContext).metadata === 'object'
  );
}

export function isAuthMetadata(metadata: unknown): metadata is AuthMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    typeof (metadata as AuthMetadata).authMethod === 'string' &&
    ((metadata as AuthMetadata).authMethod === 'jwt' ||
      (metadata as AuthMetadata).authMethod === 'mock')
  );
}

export function isJWTHeader(header: unknown): header is JWTHeader {
  return (
    typeof header === 'object' &&
    header !== null &&
    typeof (header as JWTHeader).alg === 'string' &&
    typeof (header as JWTHeader).kid === 'string' &&
    typeof (header as JWTHeader).typ === 'string'
  );
}

export function isJWKSResponse(response: unknown): response is JWKSResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    Array.isArray((response as JWKSResponse).keys) &&
    (response as JWKSResponse).keys.every(
      key =>
        typeof key === 'object' &&
        key !== null &&
        typeof key.kid === 'string' &&
        typeof key.kty === 'string' &&
        typeof key.alg === 'string'
    )
  );
}
// ユーティリティ型（要件4.2, 4.3）
export type RequiredAuthUser = Required<Pick<AuthenticatedUser, 'id' | 'email' | 'cognitoSub'>>;
export type OptionalAuthUser = Partial<AuthenticatedUser>;
export type AuthUserUpdate = Partial<Omit<AuthenticatedUser, 'id' | 'cognitoSub'>>;

// 認証状態の型定義
export type AuthenticationState = 'authenticated' | 'unauthenticated' | 'pending' | 'error';

// 権限チェック関数の型定義
export type PermissionChecker = (user: AuthenticatedUser, permission: string) => boolean;
export type RoleChecker = (user: AuthenticatedUser, role: string) => boolean;
export type GroupChecker = (user: AuthenticatedUser, group: string) => boolean;

// ミドルウェア設定の型定義
export interface MiddlewareConfig {
  readonly auth: AuthMiddlewareOptions;
  readonly security: SecurityConfig;
  readonly logging: LoggingConfig;
  readonly cache: CacheConfig;
}

export interface SecurityConfig {
  readonly enableRateLimiting?: boolean;
  readonly maxRequestsPerMinute?: number;
  readonly enableIpWhitelist?: boolean;
  readonly allowedIps?: readonly string[];
  readonly enableUserAgentValidation?: boolean;
  readonly blockedUserAgents?: readonly string[];
}

export interface LoggingConfig {
  readonly enableAccessLog?: boolean;
  readonly enableSecurityLog?: boolean;
  readonly enablePerformanceLog?: boolean;
  readonly logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  readonly sensitiveFields?: readonly string[];
}

export interface CacheConfig {
  readonly enableKeyCache?: boolean;
  readonly keyTtl?: number;
  readonly maxCacheSize?: number;
  readonly enableMetrics?: boolean;
}

// 認証結果の型定義
export interface AuthenticationResult {
  readonly success: boolean;
  readonly user?: AuthenticatedUser;
  readonly error?: TypedAuthError;
  readonly metadata?: AuthMetadata;
  readonly timestamp: Date;
  readonly duration: number; // 認証処理時間（ミリ秒）
}

// トークン情報の型定義（セキュリティ考慮）
export interface TokenInfo {
  readonly type: 'access' | 'id';
  readonly issuer: string;
  readonly audience: string;
  readonly subject: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly notBefore?: Date;
  readonly jwtId?: string;
}

// 認証イベントの型定義
export interface AuthEvent {
  readonly type: 'login' | 'logout' | 'token_refresh' | 'permission_check' | 'auth_failure';
  readonly userId?: string;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
  readonly source: 'middleware' | 'manual' | 'system';
}

// エクスポート用の統合型
export type AuthTypes = {
  User: AuthenticatedUser;
  Context: AuthContext;
  Options: AuthMiddlewareOptions;
  Payload: CognitoJWTPayload;
  Error: TypedAuthError;
  Metadata: AuthMetadata;
  Result: AuthenticationResult;
  Event: AuthEvent;
};

// 高階型とコンディショナル型
export type AuthenticatedContext<T extends boolean = true> = T extends true
  ? Context & { get(key: 'user'): AuthenticatedUser; get(key: 'isAuthenticated'): true }
  : Context & {
      get(key: 'user'): AuthenticatedUser | undefined;
      get(key: 'isAuthenticated'): boolean;
    };

export type OptionalAuthContext = AuthenticatedContext<false>;
export type RequiredAuthContext = AuthenticatedContext<true>;

// ミドルウェアファクトリー型
export type AuthMiddlewareFactory<T extends AuthMiddlewareOptions = AuthMiddlewareOptions> = (
  options?: Partial<T>
) => MiddlewareHandler;

// 認証デコレーター型
export type AuthDecorator = <T extends (...args: unknown[]) => unknown>(
  target: T,
  context: ClassMethodDecoratorContext
) => T;

// 型安全なコンテキストアクセサー
export interface TypedContextAccessor {
  getUser(c: Context): AuthenticatedUser;
  getUserOptional(c: Context): AuthenticatedUser | null;
  getAuthContext(c: Context): AuthContext;
  getAuthMetadata(c: Context): AuthMetadata | null;
  isAuthenticated(c: Context): boolean;
  hasPermission(c: Context, permission: string): boolean;
  hasRole(c: Context, role: string): boolean;
  hasGroup(c: Context, group: string): boolean;
}

// 認証プロバイダーインターフェース
export interface AuthProvider {
  readonly name: string;
  readonly version: string;
  authenticate(token: string, options?: AuthMiddlewareOptions): Promise<AuthenticationResult>;
  validateUser(user: AuthenticatedUser): Promise<boolean>;
  refreshToken?(token: string): Promise<string>;
  revokeToken?(token: string): Promise<void>;
}

// 認証ストラテジーインターフェース
export interface AuthStrategy {
  readonly name: string;
  readonly priority: number;
  canHandle(request: unknown): boolean;
  authenticate(request: unknown, options?: AuthMiddlewareOptions): Promise<AuthenticationResult>;
}

// 認証キャッシュインターフェース
export interface AuthCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
}

// 認証メトリクスインターフェース
export interface AuthMetrics {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  recordTimer<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T>;
}

// 認証設定バリデーター
export interface AuthConfigValidator {
  validate(config: AuthMiddlewareOptions): ValidationResult;
  validateUser(user: AuthenticatedUser): ValidationResult;
  validateToken(token: string): ValidationResult;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}
