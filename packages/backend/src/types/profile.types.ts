/**
 * ユーザープロフィール型定義
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  industry?: string | null;
  company_size?: string | null;
  job_title?: string | null;
  position?: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * プロフィール更新リクエスト
 */
export interface UpdateProfileRequest {
  name?: string;
  industry?: string;
  company_size?: string;
  job_title?: string;
  position?: string;
}

/**
 * プロフィールAPIレスポンス
 */
export interface ProfileResponse {
  success: true;
  data: UserProfile;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp?: string;
  };
}
