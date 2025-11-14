import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProfileSetupPage from '../../pages/ProfileSetupPage';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../services/profileService';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderWithProviders,
  waitForLoadingToFinish,
  waitForSuccessMessage,
  waitForErrorMessage,
} from '../../test/utils/integration-test-utils';
import { testDataGenerator } from '../../test/utils/TestDataGenerator';
import { mockManager } from '../../test/utils/MockManager';

// Mock dependencies
vi.mock('../../hooks/useAuth');
vi.mock('../../services/profileService');

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUpdateProfile = updateProfile as ReturnType<typeof vi.fn>;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProfileSetup Integration Tests', () => {
  let testData: Awaited<ReturnType<typeof setupIntegrationTest>>;

  beforeEach(async () => {
    // テストデータのセットアップ
    testData = await setupIntegrationTest();

    // モックのセットアップ
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({
      user: {
        id: testData.user.id,
        email: testData.user.email,
        name: testData.user.name,
        profileSetup: false,
      },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    await cleanupIntegrationTest();
  });

  describe('プロフィール設定フロー', () => {
    it('should complete full profile setup flow', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithProviders(<ProfileSetupPage />);

      // ページが表示されるまで待機
      await waitForLoadingToFinish();

      // Check page is rendered
      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();

      // Fill in all required fields
      const industrySelect = await screen.findByLabelText('業種');
      await user.selectOptions(industrySelect, 'technology');

      const companySizeSelect = await screen.findByLabelText('組織規模');
      await user.selectOptions(companySizeSelect, 'medium');

      const jobTitleInput = await screen.findByLabelText('職種');
      await user.type(jobTitleInput, 'Software Engineer');

      // Fill in optional field
      const positionInput = await screen.findByLabelText('役職');
      await user.type(positionInput, 'Senior Engineer');

      // Submit form
      const submitButton = await screen.findByRole('button', { name: '保存して次へ' });
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('保存中...')).toBeInTheDocument();
      });

      // Wait for success
      await waitForSuccessMessage('プロフィールが正常に保存されました');

      // Check API was called with correct data
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        industry: 'technology',
        companySize: 'medium',
        jobTitle: 'Software Engineer',
        position: 'Senior Engineer',
      });

      // Check redirect to home page
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        },
        { timeout: 2000 }
      );
    });

    it('should show validation errors for empty form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProfileSetupPage />);

      // ページが表示されるまで待機
      await waitForLoadingToFinish();

      // Try to submit empty form
      const submitButton = await screen.findByRole('button', { name: '保存して次へ' });
      expect(submitButton).toBeDisabled();

      // Focus and blur fields to trigger validation
      const industrySelect = await screen.findByLabelText('業種');
      await user.click(industrySelect);
      await user.tab();

      const companySizeSelect = await screen.findByLabelText('組織規模');
      await user.click(companySizeSelect);
      await user.tab();

      const jobTitleInput = await screen.findByLabelText('職種');
      await user.click(jobTitleInput);
      await user.tab();

      // Check validation errors
      await waitFor(() => {
        expect(screen.getByText('業種を選択してください')).toBeInTheDocument();
        expect(screen.getByText('組織規模を選択してください')).toBeInTheDocument();
        expect(screen.getByText('職種を入力してください')).toBeInTheDocument();
      });

      // Submit button should still be disabled
      expect(submitButton).toBeDisabled();
    });

    it('should handle API error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'サーバーエラーが発生しました';
      mockUpdateProfile.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<ProfileSetupPage />);

      // ページが表示されるまで待機
      await waitForLoadingToFinish();

      // Fill in form
      const industrySelect = await screen.findByLabelText('業種');
      await user.selectOptions(industrySelect, 'technology');

      const companySizeSelect = await screen.findByLabelText('組織規模');
      await user.selectOptions(companySizeSelect, 'medium');

      const jobTitleInput = await screen.findByLabelText('職種');
      await user.type(jobTitleInput, 'Engineer');

      // Submit form
      const submitButton = await screen.findByRole('button', { name: '保存して次へ' });
      await user.click(submitButton);

      // Check error message
      await waitForErrorMessage('エラーが発生しました');
      await waitForErrorMessage(errorMessage);

      // Should not redirect
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('認証・リダイレクト処理', () => {
    it('should redirect to login if not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithRouter(<ProfileSetupPage />);

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    it('should redirect to home if profile already set up', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
      });

      renderWithRouter(<ProfileSetupPage />);

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
