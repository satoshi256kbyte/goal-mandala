import { Amplify } from 'aws-amplify';
import {
  signIn,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

/**
 * 認証エラーの型定義
 */
export interface AuthError {
  code: string;
  message: string;
}

/**
 * サインアップ時のユーザー属性
 */
export interface SignUpAttributes {
  email: string;
  name: string;
}

/**
 * 認証サービスクラス
 */
export class AuthService {
  /**
   * Amplifyの初期化
   */
  static configure(config: Record<string, unknown>) {
    Amplify.configure(config);
  }

  /**
   * ログイン
   */
  static async signIn(email: string, password: string): Promise<void> {
    try {
      await signIn({ username: email, password });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * サインアップ
   */
  static async signUp(email: string, password: string, name: string): Promise<void> {
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * サインアップの確認
   */
  static async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * パスワードリセット
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await resetPassword({ username: email });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * パスワードリセットの確認
   */
  static async confirmResetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * ログアウト
   */
  static async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * 現在のユーザー情報を取得
   */
  static async getCurrentUser(): Promise<unknown> {
    try {
      return await getCurrentUser();
    } catch (error) {
      return null;
    }
  }

  /**
   * 現在のセッション情報を取得
   */
  static async getCurrentSession(): Promise<unknown> {
    try {
      return await fetchAuthSession();
    } catch (error) {
      return null;
    }
  }

  /**
   * 現在のセッション情報を取得（型安全版）
   */
  static async getCurrentSessionTyped(): Promise<{
    tokens?: {
      idToken?: { toString(): string };
      accessToken?: { toString(): string };
      refreshToken?: { toString(): string };
    };
  } | null> {
    try {
      const session = await fetchAuthSession();
      return session as {
        tokens?: {
          idToken?: { toString(): string };
          accessToken?: { toString(): string };
          refreshToken?: { toString(): string };
        };
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * JWTトークンを取得
   */
  static async getJwtToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 認証状態をチェック
   */
  static async checkAuthState(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cognitoエラーをユーザーフレンドリーなメッセージに変換
   */
  static handleAuthError(error: unknown): AuthError {
    const errorMap: Record<string, string> = {
      // 認証関連エラー
      UserNotFoundException: 'メールアドレスまたはパスワードが正しくありません',
      NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません',
      UserNotConfirmedException: 'メールアドレスの確認が必要です。確認メールをご確認ください',
      PasswordResetRequiredException: 'パスワードのリセットが必要です',
      UserLambdaValidationException: '入力内容に問題があります',

      // パスワード関連エラー
      InvalidPasswordException: 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります',

      // ユーザー登録関連エラー
      UsernameExistsException: 'このメールアドレスは既に登録されています',

      // 確認コード関連エラー
      CodeMismatchException: '確認コードが正しくありません',
      ExpiredCodeException: '確認コードの有効期限が切れています。新しいコードを取得してください',

      // レート制限エラー
      TooManyRequestsException: 'リクエストが多すぎます。しばらく待ってから再試行してください',
      LimitExceededException: '制限を超えました。しばらく待ってから再試行してください',
      TooManyFailedAttemptsException:
        'ログイン試行回数が上限に達しました。しばらく待ってから再試行してください',

      // アカウント状態エラー（上記で定義済み）

      // ネットワーク・サーバーエラー
      NetworkError: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
      TimeoutError: 'リクエストがタイムアウトしました。再試行してください',
      ServiceUnavailable: 'サービスが一時的に利用できません。しばらく待ってから再試行してください',

      // パラメータエラー
      InvalidParameterException: '入力パラメータが正しくありません',
      MissingRequiredParameter: '必須項目が入力されていません',

      // その他のエラー
      InternalErrorException:
        'システム内部エラーが発生しました。しばらく待ってから再試行してください',
    };

    let code = 'UnknownError';
    let message = 'エラーが発生しました。しばらく待ってから再試行してください';

    // エラーオブジェクトの解析
    if (error && typeof error === 'object') {
      // Amplify/Cognitoエラーの場合
      if ('code' in error) {
        code = (error as { code: string }).code;
      } else if ('name' in error) {
        code = (error as { name: string }).name;
      }

      // ネットワークエラーの検出
      if ('message' in error) {
        const errorMessage = (error as { message: string }).message.toLowerCase();
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('cors')
        ) {
          code = 'NetworkError';
        }
      }

      // TypeError (ネットワーク関連) の検出
      if (error instanceof TypeError) {
        code = 'NetworkError';
      }
    }

    // エラーメッセージの取得
    message = errorMap[code] || message;

    return {
      code,
      message,
    };
  }

  /**
   * ネットワーク接続をテスト
   */
  static async testNetworkConnection(): Promise<boolean> {
    try {
      // 軽量なリクエストでネットワーク接続をテスト
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5秒でタイムアウト
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * エラーが再試行可能かどうかを判定
   */
  static isRetryableError(error: AuthError): boolean {
    const retryableCodes = [
      'NetworkError',
      'TimeoutError',
      'ServiceUnavailable',
      'TooManyRequestsException',
      'LimitExceededException',
      'InternalErrorException',
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * エラーがネットワーク関連かどうかを判定
   */
  static isNetworkError(error: AuthError): boolean {
    const networkErrorCodes = ['NetworkError', 'TimeoutError', 'ServiceUnavailable'];

    return networkErrorCodes.includes(error.code);
  }
}

// 後方互換性のため
export const authService = AuthService;
