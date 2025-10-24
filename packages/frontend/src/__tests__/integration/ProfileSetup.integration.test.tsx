import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProfileSetupPage from '../../pages/ProfileSetupPage';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../services/profileService';

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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProfileSetup Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', profileSetup: false },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('正常系フロー', () => {
    it('should complete full profile setup flow', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithRouter(<ProfileSetupPage />);

      // Check page is rendered
      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();

      // Fill in all required fields
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Software Engineer');

      // Fill in optional field
      await user.type(screen.getByLabelText('役職'), 'Senior Engineer');

      // Submit form
      const submitButton = screen.getByRole('button', { name: '保存して次へ' });
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText('保存中...')).toBeInTheDocument();

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('プロフィールが正常に保存されました')).toBeInTheDocument();
      });

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

    it('should handle minimum required fields only', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithRouter(<ProfileSetupPage />);

      // Fill in only required fields
      await user.selectOptions(screen.getByLabelText('業種'), 'healthcare');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'large');
      await user.type(screen.getByLabelText('職種'), 'Doctor');

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          industry: 'healthcare',
          companySize: 'large',
          jobTitle: 'Doctor',
          position: '',
        });
      });
    });
  });

  describe('異常系フロー', () => {
    it('should show validation errors for empty form', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: '保存して次へ' });
      expect(submitButton).toBeDisabled();

      // Focus and blur fields to trigger validation
      await user.click(screen.getByLabelText('業種'));
      await user.tab();
      await user.click(screen.getByLabelText('組織規模'));
      await user.tab();
      await user.click(screen.getByLabelText('職種'));
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

      renderWithRouter(<ProfileSetupPage />);

      // Fill in form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      // Check error message
      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should not redirect
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Network Error'));

      renderWithRouter(<ProfileSetupPage />);

      // Fill in form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      // Check error message
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    it('should clear error message after timeout', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockUpdateProfile.mockRejectedValueOnce(new Error('Test Error'));

      renderWithRouter(<ProfileSetupPage />);

      // Fill in form and submit to trigger error
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Test Error')).toBeInTheDocument();
      });

      // Fast-forward time to clear error
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText('Test Error')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
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

    it('should show loading while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });
  });

  describe('フォームバリデーション', () => {
    it('should validate field length limits', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      // Test job title length limit
      const longJobTitle = 'a'.repeat(51);
      await user.type(screen.getByLabelText('職種'), longJobTitle);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('職種は50文字以内で入力してください')).toBeInTheDocument();
      });

      // Test position length limit
      const longPosition = 'b'.repeat(51);
      await user.type(screen.getByLabelText('役職'), longPosition);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('役職は50文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user corrects input', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      // Trigger validation error
      await user.click(screen.getByLabelText('職種'));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('職種を入力してください')).toBeInTheDocument();
      });

      // Correct the input
      await user.type(screen.getByLabelText('職種'), 'Engineer');

      await waitFor(() => {
        expect(screen.queryByText('職種を入力してください')).not.toBeInTheDocument();
      });
    });

    it('should validate all required fields before enabling submit', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      const submitButton = screen.getByRole('button', { name: '保存して次へ' });
      expect(submitButton).toBeDisabled();

      // Fill industry only
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      expect(submitButton).toBeDisabled();

      // Fill company size
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      expect(submitButton).toBeDisabled();

      // Fill job title - now all required fields are filled
      await user.type(screen.getByLabelText('職種'), 'Engineer');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should show multiple validation errors simultaneously', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      // Try to submit without filling anything
      await user.click(screen.getByLabelText('業種'));
      await user.tab();
      await user.click(screen.getByLabelText('組織規模'));
      await user.tab();
      await user.click(screen.getByLabelText('職種'));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('業種を選択してください')).toBeInTheDocument();
        expect(screen.getByText('組織規模を選択してください')).toBeInTheDocument();
        expect(screen.getByText('職種を入力してください')).toBeInTheDocument();
      });
    });
  });

  describe('エラーメッセージの自動非表示', () => {
    it('should auto-dismiss error message after 5 seconds', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockUpdateProfile.mockRejectedValueOnce(new Error('API Error'));

      renderWithRouter(<ProfileSetupPage />);

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText('API Error')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should allow manual dismissal of error message', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Test Error'));

      renderWithRouter(<ProfileSetupPage />);

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Test Error')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Test Error')).not.toBeInTheDocument();
      });
    });
  });

  describe('成功メッセージとリダイレクト', () => {
    it('should show success message and redirect after 1 second', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithRouter(<ProfileSetupPage />);

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();
      });

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });

      vi.useRealTimers();
    });
  });

  describe('レスポンシブ動作', () => {
    it('should render properly on mobile viewport', () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
      expect(screen.getByLabelText('業種')).toBeInTheDocument();
      expect(screen.getByLabelText('組織規模')).toBeInTheDocument();
      expect(screen.getByLabelText('職種')).toBeInTheDocument();
    });

    it('should render properly on tablet viewport', () => {
      // Set tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
      expect(screen.getByLabelText('業種')).toBeInTheDocument();
    });

    it('should render properly on desktop viewport', () => {
      // Set desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
      expect(screen.getByLabelText('業種')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      renderWithRouter(<ProfileSetupPage />);

      // Check required fields have aria-required
      const industrySelect = screen.getByLabelText('業種');
      expect(industrySelect).toHaveAttribute('aria-required', 'true');

      const companySizeSelect = screen.getByLabelText('組織規模');
      expect(companySizeSelect).toHaveAttribute('aria-required', 'true');

      const jobTitleInput = screen.getByLabelText('職種');
      expect(jobTitleInput).toHaveAttribute('aria-required', 'true');
    });

    it('should announce loading state to screen readers', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      renderWithRouter(<ProfileSetupPage />);

      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Test Error'));

      renderWithRouter(<ProfileSetupPage />);

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
        expect(errorAlert).toHaveTextContent('Test Error');
      });
    });

    it('should announce success to screen readers', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithRouter(<ProfileSetupPage />);

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        const successAlert = screen.getByRole('alert');
        expect(successAlert).toHaveAttribute('aria-live', 'polite');
        expect(successAlert).toHaveTextContent('プロフィールを保存しました');
      });
    });
  });

  describe('キーボードナビゲーション', () => {
    it('should allow form submission with Enter key', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithRouter(<ProfileSetupPage />);

      // Fill form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');

      // Press Enter to submit
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });

    it('should navigate through fields with Tab key', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      const industrySelect = screen.getByLabelText('業種');
      const companySizeSelect = screen.getByLabelText('組織規模');
      const jobTitleInput = screen.getByLabelText('職種');
      const positionInput = screen.getByLabelText('役職');

      // Start from industry
      industrySelect.focus();
      expect(document.activeElement).toBe(industrySelect);

      // Tab to company size
      await user.tab();
      expect(document.activeElement).toBe(companySizeSelect);

      // Tab to job title
      await user.tab();
      expect(document.activeElement).toBe(jobTitleInput);

      // Tab to position
      await user.tab();
      expect(document.activeElement).toBe(positionInput);
    });
  });

  describe('複数エラーシナリオ', () => {
    it('should handle timeout error', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Request timeout'));

      renderWithRouter(<ProfileSetupPage />);

      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        expect(screen.getByText('Request timeout')).toBeInTheDocument();
      });
    });

    it('should handle server error (500)', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Internal Server Error'));

      renderWithRouter(<ProfileSetupPage />);

      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
      });
    });

    it('should handle unauthorized error', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Unauthorized'));

      renderWithRouter(<ProfileSetupPage />);

      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      });
    });
  });

  describe('フォーム状態管理', () => {
    it('should maintain form state during validation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      // Fill form
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.type(screen.getByLabelText('役職'), 'Senior');

      // Trigger validation by tabbing away
      await user.tab();

      // Check values are maintained
      expect(screen.getByLabelText('業種')).toHaveValue('technology');
      expect(screen.getByLabelText('組織規模')).toHaveValue('medium');
      expect(screen.getByLabelText('職種')).toHaveValue('Engineer');
      expect(screen.getByLabelText('役職')).toHaveValue('Senior');
    });

    it('should clear form errors after successful submission', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValueOnce({ success: true, message: 'Success' });

      renderWithRouter(<ProfileSetupPage />);

      // Fill form with invalid data first
      await user.type(screen.getByLabelText('職種'), 'a'.repeat(51));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('職種は50文字以内で入力してください')).toBeInTheDocument();
      });

      // Clear and enter valid data
      await user.clear(screen.getByLabelText('職種'));
      await user.type(screen.getByLabelText('職種'), 'Engineer');
      await user.selectOptions(screen.getByLabelText('業種'), 'technology');
      await user.selectOptions(screen.getByLabelText('組織規模'), 'medium');

      // Submit
      await user.click(screen.getByRole('button', { name: '保存して次へ' }));

      await waitFor(() => {
        expect(screen.queryByText('職種は50文字以内で入力してください')).not.toBeInTheDocument();
        expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();
      });
    });
  });
});
