/**
 * モック認証機能の使用例
 *
 * このファイルは開発用モック認証機能の使用方法を示すサンプルです。
 * 要件6.1, 6.2, 6.3に対応した実装例を提供します。
 */

import { Hono } from 'hono';
import { jwtAuthMiddleware, optionalAuthMiddleware, getCurrentUser } from './auth';
import { MockUserConfig } from './types';

const app = new Hono();

// ===== 基本的なモック認証の使用例 =====

// 1. 環境変数による自動設定（要件6.1）
// ENABLE_MOCK_AUTH=true の場合、自動的にモック認証が有効になります
app.use('/api/protected/*', jwtAuthMiddleware());

// 2. カスタムモックユーザーの設定（要件6.2）
const customMockUser: MockUserConfig = {
  id: 'test-user-123',
  email: 'test.user@company.com',
  name: 'Test User',
  cognitoSub: 'test-cognito-sub-123',
  customAttributes: {
    department: 'Engineering',
    role: 'Developer',
  },
};

app.use(
  '/api/custom-mock/*',
  jwtAuthMiddleware({
    enableMockAuth: true,
    mockUser: customMockUser,
  })
);

// 3. 本番環境での実Cognito検証の確保（要件6.3）
app.use(
  '/api/production/*',
  jwtAuthMiddleware({
    enableMockAuth: false, // 明示的にモック認証を無効化
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    region: process.env.AWS_REGION!,
  })
);

// ===== 環境別設定の例 =====

// 開発環境用設定
const developmentAuthMiddleware = jwtAuthMiddleware({
  enableMockAuth: true,
  mockUser: {
    id: 'dev-user-001',
    email: 'developer@localhost',
    name: 'Local Developer',
    cognitoSub: 'dev-cognito-sub',
  },
});

// ステージング環境用設定（実Cognito使用）
const stagingAuthMiddleware = jwtAuthMiddleware({
  enableMockAuth: false,
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  region: process.env.AWS_REGION!,
});

// 本番環境用設定（実Cognito使用、モック認証完全無効）
const productionAuthMiddleware = jwtAuthMiddleware({
  enableMockAuth: false,
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  region: process.env.AWS_REGION!,
});

// ===== 環境に応じた認証ミドルウェアの選択 =====

function getAuthMiddleware() {
  switch (process.env.NODE_ENV) {
    case 'development':
      return developmentAuthMiddleware;
    case 'staging':
      return stagingAuthMiddleware;
    case 'production':
      return productionAuthMiddleware;
    default:
      return developmentAuthMiddleware;
  }
}

// 環境に応じた認証ミドルウェアを適用
app.use('/api/auto/*', getAuthMiddleware());

// ===== API エンドポイントの例 =====

// 保護されたエンドポイント
app.get('/api/protected/profile', c => {
  const user = getCurrentUser(c);
  return c.json({
    message: 'Protected endpoint accessed successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      authMode: process.env.ENABLE_MOCK_AUTH === 'true' ? 'mock' : 'cognito',
    },
  });
});

// カスタムモックユーザーを使用するエンドポイント
app.get('/api/custom-mock/profile', c => {
  const user = getCurrentUser(c);
  return c.json({
    message: 'Custom mock user endpoint',
    user,
    customAttributes: customMockUser.customAttributes,
  });
});

// オプショナル認証エンドポイント
app.use('/api/optional/*', optionalAuthMiddleware());
app.get('/api/optional/public', c => {
  const user = c.get('user');
  const isAuthenticated = c.get('isAuthenticated');

  return c.json({
    message: 'Optional auth endpoint',
    authenticated: isAuthenticated,
    user: user || null,
  });
});

// ===== 環境変数設定の例 =====

/*
開発環境 (.env.development):
ENABLE_MOCK_AUTH=true
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@localhost
MOCK_USER_NAME=Local Developer

ステージング環境 (.env.staging):
ENABLE_MOCK_AUTH=false
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX

本番環境 (.env.production):
ENABLE_MOCK_AUTH=false
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
*/

export default app;
