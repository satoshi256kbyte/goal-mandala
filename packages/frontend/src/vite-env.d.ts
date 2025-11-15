/// <reference types="vite/client" />

/**
 * Vite環境変数の型定義
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_USER_POOL_CLIENT_ID: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_ENABLE_MOCK_AUTH?: string;
  readonly VITE_ENABLE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
