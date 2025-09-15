import { Amplify } from 'aws-amplify';

/**
 * Amplify設定
 *
 * 機能:
 * - AWS Cognitoの設定
 * - 環境変数からの設定読み込み
 * - 開発環境とプロダクション環境の切り替え
 *
 * 要件: 1.2, 2.2, 3.5
 */

// 環境変数から設定を取得
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-northeast-1_XXXXXXXXX',
      userPoolClientId:
        import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
        username: false,
      },
    },
  },
};

/**
 * Amplifyを設定
 */
export const configureAmplify = () => {
  try {
    Amplify.configure(amplifyConfig);
    if (process.env.NODE_ENV === 'development') {
      console.log('Amplify configured successfully');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to configure Amplify:', error);
    }
  }
};

export default amplifyConfig;
