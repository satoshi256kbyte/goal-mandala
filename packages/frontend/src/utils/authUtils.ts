/**
 * 認証関連のユーティリティ関数
 */

/**
 * パスワード強度を検証する
 */
export const validatePasswordStrength = (password: string): boolean => {
  if (password.length < 8) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
};

/**
 * パスワード強度スコアを計算する (0-4)
 */
export const getPasswordStrengthScore = (password: string): number => {
  if (!password) return 0;

  let score = 0;

  // 長さチェック
  if (password.length >= 8) score++;

  // 大文字チェック
  if (/[A-Z]/.test(password)) score++;

  // 小文字チェック
  if (/[a-z]/.test(password)) score++;

  // 数字チェック
  if (/\d/.test(password)) score++;

  // 特殊文字チェック
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  return Math.min(score, 4);
};

/**
 * パスワード強度スコアをテキストに変換する
 */
export const getPasswordStrengthText = (score: number): string => {
  switch (score) {
    case 0:
      return '';
    case 1:
      return '弱い';
    case 2:
      return '普通';
    case 3:
      return '強い';
    case 4:
      return '非常に強い';
    default:
      return '';
  }
};

/**
 * 認証エラーをユーザーフレンドリーなメッセージにフォーマットする
 */
export const formatAuthError = (error: unknown): string => {
  // ネットワークエラーの検出
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください';
  }

  // エラーオブジェクトの型ガード
  const isErrorWithMessage = (err: unknown): err is { message: string } => {
    return typeof err === 'object' && err !== null && 'message' in err;
  };

  const isErrorWithCode = (err: unknown): err is { code: string } => {
    return typeof err === 'object' && err !== null && 'code' in err;
  };

  if (
    isErrorWithMessage(error) &&
    (error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection'))
  ) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください';
  }

  // Cognitoエラーコードのマッピング
  const errorMap: Record<string, string> = {
    NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません',
    UserNotFoundException: 'メールアドレスまたはパスワードが正しくありません',
    UsernameExistsException: 'このメールアドレスは既に登録されています',
    InvalidPasswordException: 'パスワードが要件を満たしていません',
    CodeMismatchException: '確認コードが正しくありません',
    ExpiredCodeException: '確認コードの有効期限が切れています',
    TooManyRequestsException: 'リクエストが多すぎます。しばらく待ってから再試行してください',
    UserNotConfirmedException: 'メールアドレスの確認が必要です',
    PasswordResetRequiredException: 'パスワードのリセットが必要です',
    UserLambdaValidationException: '入力内容に問題があります',
    InternalErrorException: 'サーバーエラーが発生しました。しばらく待ってから再試行してください',
  };

  return (
    (isErrorWithCode(error) && errorMap[error.code]) ||
    'エラーが発生しました。しばらく待ってから再試行してください'
  );
};

/**
 * メールアドレスの形式を検証する
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * ユーザー入力をサニタイズする
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    .replace(/[\r\n]/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * 認証エラーの種類を判定する
 */
export const isAuthenticationError = (error: unknown): boolean => {
  const isErrorWithCode = (err: unknown): err is { code: string } => {
    return typeof err === 'object' && err !== null && 'code' in err;
  };

  const authErrorCodes = [
    'NotAuthorizedException',
    'UserNotFoundException',
    'InvalidPasswordException',
  ];
  return isErrorWithCode(error) && authErrorCodes.includes(error.code);
};

/**
 * 再試行可能なエラーかどうかを判定する
 */
export const isRetryableError = (error: unknown): boolean => {
  const isErrorWithCode = (err: unknown): err is { code: string } => {
    return typeof err === 'object' && err !== null && 'code' in err;
  };

  const isErrorWithMessage = (err: unknown): err is { message: string } => {
    return typeof err === 'object' && err !== null && 'message' in err;
  };

  const retryableErrorCodes = [
    'TooManyRequestsException',
    'InternalErrorException',
    'ServiceUnavailable',
    'TimeoutError',
    'NetworkError',
  ];

  return (
    (isErrorWithCode(error) && retryableErrorCodes.includes(error.code)) ||
    (isErrorWithMessage(error) && error.message.includes('network'))
  );
};

/**
 * パスワード要件をチェックする個別関数
 */
export const passwordRequirements = {
  minLength: (password: string) => password.length >= 8,
  hasUppercase: (password: string) => /[A-Z]/.test(password),
  hasLowercase: (password: string) => /[a-z]/.test(password),
  hasNumber: (password: string) => /\d/.test(password),
  hasSpecialChar: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
};

/**
 * パスワード要件の説明テキストを取得する
 */
export const getPasswordRequirementsText = (): string[] => {
  return ['8文字以上', '大文字を含む', '小文字を含む', '数字を含む'];
};

/**
 * 認証状態の有効性をチェックする
 */
export const isValidAuthState = (authState: unknown): boolean => {
  const isAuthStateObject = (
    state: unknown
  ): state is { user: unknown; isAuthenticated: boolean } => {
    return (
      typeof state === 'object' &&
      state !== null &&
      'user' in state &&
      'isAuthenticated' in state &&
      typeof (state as { isAuthenticated: unknown }).isAuthenticated === 'boolean'
    );
  };

  return (
    isAuthStateObject(authState) && Boolean(authState.user) && authState.isAuthenticated === true
  );
};

/**
 * JWTトークンの有効期限をチェックする
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

/**
 * セキュアなランダム文字列を生成する
 */
export const generateSecureRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};
