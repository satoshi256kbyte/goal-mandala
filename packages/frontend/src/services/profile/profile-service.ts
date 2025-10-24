/**
 * プロフィール管理サービス
 */

import type { ProfileFormData, UpdateProfileResponse } from '../../types/profile';

/**
 * プロフィールサービスクラス
 */
export class ProfileService {
  /**
   * プロフィールを更新する
   * @param _data - プロフィールフォームデータ
   * @returns プロフィール更新レスポンス
   */
  static async updateProfile(_data: ProfileFormData): Promise<UpdateProfileResponse> {
    // TODO: 実装予定
    // API呼び出しロジックをここに実装
    throw new Error('Not implemented yet');
  }

  /**
   * プロフィールを取得する
   * @returns プロフィールデータ
   */
  static async getProfile(): Promise<UpdateProfileResponse['data'] | null> {
    // TODO: 実装予定
    // API呼び出しロジックをここに実装
    throw new Error('Not implemented yet');
  }

  /**
   * プロフィールが設定済みかチェックする
   * @returns 設定済みの場合true
   */
  static async isProfileSetup(): Promise<boolean> {
    // TODO: 実装予定
    // API呼び出しロジックをここに実装
    throw new Error('Not implemented yet');
  }
}
