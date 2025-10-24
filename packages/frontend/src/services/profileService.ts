import { ProfileFormData } from '../types/profile';
import { apiClient } from './apiClient';

export interface ProfileUpdateRequest {
  industry: string;
  companySize: string;
  jobTitle: string;
  position?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
}

export const updateProfile = async (data: ProfileFormData): Promise<ProfileUpdateResponse> => {
  try {
    const request: ProfileUpdateRequest = {
      industry: data.industry,
      companySize: data.companySize,
      jobTitle: data.jobTitle,
      position: data.position || undefined,
    };

    const response = await apiClient.put<ProfileUpdateResponse>('/api/profile', request);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`プロフィールの更新に失敗しました: ${error.message}`);
    }
    throw new Error('プロフィールの更新に失敗しました');
  }
};

export const getProfile = async (): Promise<ProfileFormData> => {
  try {
    const response = await apiClient.get<ProfileFormData>('/api/profile');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
    }
    throw new Error('プロフィールの取得に失敗しました');
  }
};
