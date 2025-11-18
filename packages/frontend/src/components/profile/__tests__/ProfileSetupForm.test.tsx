import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileSetupForm } from '../ProfileSetupForm';
import type { ProfileFormData } from '../../../types/profile';
import * as useProfileFormModule from '../../../hooks/useProfileForm';

// useProfileFormフックをモック
vi.mock('../../../hooks/useProfileForm');

describe('ProfileSetupForm', () => {
  // デフォルトのモック関数
  const mockSetFieldValue = vi.fn();
  const mockSetFieldTouched = vi.fn();
  const mockHandleSubmit = vi.fn();
  const mockOnSubmit = vi.fn();

  // デフォルトのフォームデータ
  const defaultFormData: ProfileFormData = {
    industry: '',
    companySize: '',
    jobTitle: '',
    position: '',
  };

  // デフォルトのuseProfileFormの戻り値
  const defaultUseProfileFormReturn = {
    formData: defaultFormData,
    errors: {},
    touched: {},
    isLoading: false,
    isSubmitting: false,
    error: null,
    successMessage: null,
    setFieldValue: mockSetFieldValue,
    setFieldTouched: mockSetFieldTouched,
    validateField: vi.fn(),
    validateForm: vi.fn(),
    handleSubmit: mockHandleSubmit,
    resetForm: vi.fn(),
    clearError: vi.fn(),
    clearSuccess: vi.fn(),
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();

    // useProfileFormのデフォルトモック実装
    vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue(defaultUseProfileFormReturn);
  });

  describe('フォーム表示のテスト', () => {
    it('フォームが正しくレンダリングされる', () => {
      render(<ProfileSetupForm />);

      // フォーム要素の存在確認
      const form = screen.getByRole('form', { name: 'プロフィール設定フォーム' });
      expect(form).toBeInTheDocument();
    });

    it('所属組織情報セクションが表示される', () => {
      render(<ProfileSetupForm />);

      const organizationSection = screen.getByRole('region', {
        name: /所属組織の情報/i,
      });
      expect(organizationSection).toBeInTheDocument();

      const heading = screen.getByRole('heading', { name: '所属組織の情報' });
      expect(heading).toBeInTheDocument();
    });

    it('本人情報セクションが表示される', () => {
      render(<ProfileSetupForm />);

      const personalSection = screen.getByRole('region', { name: /本人の情報/i });
      expect(personalSection).toBeInTheDocument();

      const heading = screen.getByRole('heading', { name: '本人の情報' });
      expect(heading).toBeInTheDocument();
    });

    it('業種選択フィールドが表示される', () => {
      render(<ProfileSetupForm />);

      const industrySelect = screen.getByTestId('industry-select');
      expect(industrySelect).toBeInTheDocument();
    });

    it('組織規模選択フィールドが表示される', () => {
      render(<ProfileSetupForm />);

      const companySizeSelect = screen.getByTestId('company-size-select');
      expect(companySizeSelect).toBeInTheDocument();
    });

    it('職種入力フィールドが表示される', () => {
      render(<ProfileSetupForm />);

      const jobTitleInput = screen.getByTestId('job-title-input');
      expect(jobTitleInput).toBeInTheDocument();
    });

    it('役職入力フィールドが表示される', () => {
      render(<ProfileSetupForm />);

      const positionInput = screen.getByTestId('position-input');
      expect(positionInput).toBeInTheDocument();
    });

    it('送信ボタンが表示される', () => {
      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('カスタムクラス名が適用される', () => {
      const { container } = render(<ProfileSetupForm className="custom-class" />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('custom-class');
    });
  });

  describe('入力処理のテスト', () => {
    it('業種選択時にsetFieldValueが呼ばれる', () => {
      render(<ProfileSetupForm />);

      const industrySelect = screen.getByTestId('industry-select');
      fireEvent.change(industrySelect, { target: { value: 'it-communication' } });

      expect(mockSetFieldValue).toHaveBeenCalledWith('industry', 'it-communication');
    });

    it('組織規模選択時にsetFieldValueが呼ばれる', () => {
      render(<ProfileSetupForm />);

      const companySizeSelect = screen.getByTestId('company-size-select');
      fireEvent.change(companySizeSelect, { target: { value: '11-50' } });

      expect(mockSetFieldValue).toHaveBeenCalledWith('companySize', '11-50');
    });

    it('職種入力時にsetFieldValueが呼ばれる', () => {
      render(<ProfileSetupForm />);

      const jobTitleInput = screen.getByTestId('job-title-input');
      fireEvent.change(jobTitleInput, { target: { value: 'エンジニア' } });

      expect(mockSetFieldValue).toHaveBeenCalledWith('jobTitle', 'エンジニア');
    });

    it('役職入力時にsetFieldValueが呼ばれる', () => {
      render(<ProfileSetupForm />);

      const positionInput = screen.getByTestId('position-input');
      fireEvent.change(positionInput, { target: { value: 'マネージャー' } });

      expect(mockSetFieldValue).toHaveBeenCalledWith('position', 'マネージャー');
    });

    it('フィールドからフォーカスが離れた時にsetFieldTouchedが呼ばれる', () => {
      render(<ProfileSetupForm />);

      const industrySelect = screen.getByTestId('industry-select');
      fireEvent.blur(industrySelect);

      expect(mockSetFieldTouched).toHaveBeenCalledWith('industry', true);
    });

    it('複数のフィールドを入力できる', () => {
      render(<ProfileSetupForm />);

      const industrySelect = screen.getByTestId('industry-select');
      const companySizeSelect = screen.getByTestId('company-size-select');
      const jobTitleInput = screen.getByTestId('job-title-input');

      fireEvent.change(industrySelect, { target: { value: 'it-communication' } });
      fireEvent.change(companySizeSelect, { target: { value: '11-50' } });
      fireEvent.change(jobTitleInput, { target: { value: 'エンジニア' } });

      expect(mockSetFieldValue).toHaveBeenCalledTimes(3);
    });
  });

  describe('バリデーションのテスト', () => {
    it('エラーがある場合、エラーメッセージが表示される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        errors: {
          industry: '業種を選択してください',
        },
        touched: {
          industry: true,
        },
      });

      render(<ProfileSetupForm />);

      const errorMessage = screen.getByTestId('industry-select-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('業種を選択してください');
    });

    it('複数のエラーが表示される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        errors: {
          industry: '業種を選択してください',
          companySize: '組織規模を選択してください',
          jobTitle: '職種を入力してください',
        },
        touched: {
          industry: true,
          companySize: true,
          jobTitle: true,
        },
      });

      render(<ProfileSetupForm />);

      const industryError = screen.getByTestId('industry-select-error');
      const companySizeError = screen.getByTestId('company-size-select-error');
      const jobTitleError = screen.getByTestId('job-title-input-error');

      expect(industryError).toHaveTextContent('業種を選択してください');
      expect(companySizeError).toHaveTextContent('組織規模を選択してください');
      expect(jobTitleError).toHaveTextContent('職種を入力してください');
    });

    it('タッチされていないフィールドのエラーは表示されない', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        errors: {
          industry: '業種を選択してください',
        },
        touched: {
          industry: false,
        },
      });

      render(<ProfileSetupForm />);

      const errorMessage = screen.queryByTestId('industry-select-error');
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('必須フィールドが未入力の場合、送信ボタンが無効化される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: '',
          companySize: '',
          jobTitle: '',
          position: '',
        },
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toBeDisabled();
    });

    it('必須フィールドが全て入力されている場合、送信ボタンが有効化される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        errors: {},
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('エラーがある場合、送信ボタンが無効化される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        errors: {
          jobTitle: '職種は100文字以内で入力してください',
        },
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('送信処理のテスト', () => {
    it('フォーム送信時にhandleSubmitが呼ばれる', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
      });

      render(<ProfileSetupForm />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });

    it('送信ボタンクリック時にフォームが送信される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      fireEvent.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });

    it('送信中は送信ボタンが無効化される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        isSubmitting: true,
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /保存中/i });
      expect(submitButton).toBeDisabled();
    });

    it('送信中はローディングスピナーが表示される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        isSubmitting: true,
      });

      render(<ProfileSetupForm />);

      const loadingText = screen.getByText(/保存中/i);
      expect(loadingText).toBeInTheDocument();
    });

    it('送信中は入力フィールドが無効化される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        isSubmitting: true,
      });

      render(<ProfileSetupForm />);

      const industrySelect = screen.getByTestId('industry-select');
      const companySizeSelect = screen.getByTestId('company-size-select');
      const jobTitleInput = screen.getByTestId('job-title-input');
      const positionInput = screen.getByTestId('position-input');

      expect(industrySelect).toBeDisabled();
      expect(companySizeSelect).toBeDisabled();
      expect(jobTitleInput).toBeDisabled();
      expect(positionInput).toBeDisabled();
    });

    it('外部のisLoadingプロパティでもローディング状態になる', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        isSubmitting: true,
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /保存中/i });
      expect(submitButton).toBeDisabled();
    });

    it('onSuccessコールバックが提供されている場合、成功時に呼ばれる', async () => {
      const formData: ProfileFormData = {
        industry: 'it-communication',
        companySize: '11-50',
        jobTitle: 'エンジニア',
        position: 'マネージャー',
      };

      const mockOnSuccess = vi.fn();

      // useProfileFormのモックを設定して、onSuccessコールバックを実行
      vi.mocked(useProfileFormModule.useProfileForm).mockImplementation(options => {
        return {
          ...defaultUseProfileFormReturn,
          formData,
          handleSubmit: async () => {
            if (options?.onSuccess) {
              await options.onSuccess();
            }
          },
        };
      });

      render(<ProfileSetupForm onSuccess={mockOnSuccess} />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('外部エラーが表示される', () => {
      render(<ProfileSetupForm error="プロフィールの保存に失敗しました" />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('プロフィールの保存に失敗しました');
    });

    it('外部エラーがない場合、エラーメッセージが表示されない', () => {
      render(<ProfileSetupForm />);

      const errorMessage = screen.queryByRole('alert');
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティのテスト', () => {
    it('フォームにaria-labelが設定されている', () => {
      render(<ProfileSetupForm />);

      const form = screen.getByRole('form', { name: 'プロフィール設定フォーム' });
      expect(form).toHaveAttribute('aria-label', 'プロフィール設定フォーム');
    });

    it('送信ボタンにaria-busyが設定される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        isSubmitting: true,
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /保存中/i });
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });

    it('ローディング中のスクリーンリーダー用メッセージが表示される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
        isSubmitting: true,
      });

      render(<ProfileSetupForm />);

      const srMessage = screen.getByText('プロフィール情報を保存しています');
      expect(srMessage).toBeInTheDocument();
      expect(srMessage).toHaveClass('sr-only');
    });

    it('エラーメッセージにrole="alert"が設定される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        error: 'プロフィールの保存に失敗しました',
      });

      render(<ProfileSetupForm />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    it('セクションにaria-labelledbyが設定される', () => {
      render(<ProfileSetupForm />);

      const sections = screen.getAllByRole('region');
      expect(sections.length).toBeGreaterThanOrEqual(2);

      // 最初のセクション（所属組織情報）
      expect(sections[0]).toHaveAttribute('aria-labelledby', 'organization-section');

      // 2番目のセクション（本人情報）
      expect(sections[1]).toHaveAttribute('aria-labelledby', 'personal-section');
    });
  });

  describe('レスポンシブデザインのテスト', () => {
    it('基本的なレスポンシブクラスが適用される', () => {
      const { container } = render(<ProfileSetupForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('max-w-2xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });

    it('送信ボタンにレスポンシブクラスが適用される', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: 'it-communication',
          companySize: '11-50',
          jobTitle: 'エンジニア',
          position: '',
        },
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toHaveClass('w-full', 'sm:w-auto');
    });
  });

  describe('統合テスト', () => {
    it('完全なフォーム入力から送信までのフロー', async () => {
      const formData: ProfileFormData = {
        industry: 'it-communication',
        companySize: '11-50',
        jobTitle: 'ソフトウェアエンジニア',
        position: 'シニアエンジニア',
      };

      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData,
      });

      render(<ProfileSetupForm onSubmit={mockOnSubmit} />);

      // フィールドに入力
      const industrySelect = screen.getByTestId('industry-select');
      const companySizeSelect = screen.getByTestId('company-size-select');
      const jobTitleInput = screen.getByTestId('job-title-input');
      const positionInput = screen.getByTestId('position-input');

      fireEvent.change(industrySelect, { target: { value: 'it-communication' } });
      fireEvent.change(companySizeSelect, { target: { value: '11-50' } });
      fireEvent.change(jobTitleInput, { target: { value: 'ソフトウェアエンジニア' } });
      fireEvent.change(positionInput, { target: { value: 'シニアエンジニア' } });

      // 送信
      const submitButton = screen.getByRole('button', { name: /次へ/i });
      fireEvent.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('バリデーションエラーがある場合、送信できない', () => {
      vi.mocked(useProfileFormModule.useProfileForm).mockReturnValue({
        ...defaultUseProfileFormReturn,
        formData: {
          industry: '',
          companySize: '',
          jobTitle: '',
          position: '',
        },
        errors: {
          industry: '業種を選択してください',
          companySize: '組織規模を選択してください',
          jobTitle: '職種を入力してください',
        },
        touched: {
          industry: true,
          companySize: true,
          jobTitle: true,
        },
      });

      render(<ProfileSetupForm />);

      const submitButton = screen.getByRole('button', { name: /次へ/i });
      expect(submitButton).toBeDisabled();

      fireEvent.click(submitButton);
      expect(mockHandleSubmit).not.toHaveBeenCalled();
    });
  });
});
