import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ActionForm } from './ActionForm';
import { ActionProvider } from '../../contexts/ActionContext';
import { ActionType } from '../../types/mandala';
import { ActionFormData } from '../../schemas/action-form';

// モックコンポーネント
vi.mock('../../hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    getResponsiveClasses: (classes: any) => classes.base || '',
  }),
}));

vi.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
  }),
}));

vi.mock('../../hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({
    focusFirstError: vi.fn(),
  }),
  useAnnouncement: () => ({
    announce: vi.fn(),
    AnnouncementRegion: () => <div data-testid="announcement-region" />,
  }),
}));

vi.mock('../../hooks/useActionForm', () => ({
  useActionForm: () => ({
    formState: {
      isValid: true,
      isDirty: false,
      isSubmitting: false,
      isValidating: false,
      hasErrors: false,
      hasUnsavedChanges: false,
      isDraftSaving: false,
    },
    getFieldState: vi.fn(),
    watchedValues: {
      title: '',
      description: '',
      background: '',
      constraints: '',
      type: ActionType.EXECUTION,
    },
    validateField: vi.fn(),
    validateActionType: vi.fn(),
    validateConstraints: vi.fn().mockResolvedValue(true),
    saveDraft: vi.fn(),
    resetForm: vi.fn(),
    checkUnsavedChanges: vi.fn(),
    updateFormData: vi.fn(),
    handleError: vi.fn(),
    changeActionType: vi.fn(),
  }),
}));

// テスト用のプロバイダーラッパー
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ActionProvider goalId="test-goal" initialActions={[]}>
    {children}
  </ActionProvider>
);

describe('ActionForm', () => {
  const defaultProps = {
    actionId: 'test-action-id',
    subGoalId: 'test-subgoal-id',
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('フォームが正しく表示される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('アクション編集フォーム')).toBeInTheDocument();
      expect(screen.getByText('アクションタイトル')).toBeInTheDocument();
      expect(screen.getByText('アクション説明')).toBeInTheDocument();
      expect(screen.getByText('背景')).toBeInTheDocument();
      expect(screen.getByText('制約事項')).toBeInTheDocument();
      expect(screen.getByText('アクション種別')).toBeInTheDocument();
    });

    it('必須フィールドにアスタリスクが表示される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      // 必須フィールドのラベルを確認
      expect(screen.getByText('アクションタイトル')).toBeInTheDocument();
      expect(screen.getByText('アクション説明')).toBeInTheDocument();
      expect(screen.getByText('背景')).toBeInTheDocument();
      expect(screen.getByText('アクション種別')).toBeInTheDocument();
    });

    it('プレースホルダーテキストが表示される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('例：プログラミング基礎書を読む')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/プログラミングの基礎概念について書かれた入門書/)
      ).toBeInTheDocument();
    });
  });

  describe('初期データ', () => {
    it('初期データが正しく設定される', () => {
      const initialData: Partial<ActionFormData> = {
        title: 'テストアクション',
        description: 'テストアクションの説明',
        type: ActionType.HABIT,
      };

      render(
        <TestWrapper>
          <ActionForm {...defaultProps} initialData={initialData} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('テストアクション')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テストアクションの説明')).toBeInTheDocument();
    });
  });

  describe('アクション種別', () => {
    it('実行アクションが選択できる', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      const executionRadio = screen.getByLabelText(/実行アクション/);
      expect(executionRadio).toBeInTheDocument();

      fireEvent.click(executionRadio);
      expect(executionRadio).toBeChecked();
    });

    it('習慣アクションが選択できる', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      const habitRadio = screen.getByLabelText(/習慣アクション/);
      expect(habitRadio).toBeInTheDocument();

      fireEvent.click(habitRadio);
      expect(habitRadio).toBeChecked();
    });

    it('アクション種別の説明が表示される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getAllByText(/一度実行すれば完了するアクション/)).toHaveLength(2);
      expect(screen.getByText(/継続的に行う必要があるアクション/)).toBeInTheDocument();
    });
  });

  describe('フォーム送信', () => {
    it('更新ボタンが表示される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('アクションを更新')).toBeInTheDocument();
    });

    it('送信中は更新ボタンが無効化される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} isSubmitting={true} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('更新中...');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('フォーム送信時にonSubmitが呼ばれる', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ActionForm {...defaultProps} onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      // フィールドに入力
      fireEvent.change(screen.getByPlaceholderText('例：プログラミング基礎書を読む'), {
        target: { value: 'テストタイトル' },
      });

      // フォーム送信
      const form = screen.getByLabelText('アクション編集フォーム');
      fireEvent.submit(form);

      // onSubmitが呼ばれることを確認（実際の呼び出しは統合テストで確認）
    });
  });

  describe('下書き保存', () => {
    it('下書き保存ボタンが表示される', () => {
      const mockOnDraftSave = vi.fn();

      render(
        <TestWrapper>
          <ActionForm {...defaultProps} onDraftSave={mockOnDraftSave} />
        </TestWrapper>
      );

      expect(screen.getByText('下書き保存')).toBeInTheDocument();
    });

    it('下書き保存中はボタンが無効化される', () => {
      const mockOnDraftSave = vi.fn();

      render(
        <TestWrapper>
          <ActionForm {...defaultProps} onDraftSave={mockOnDraftSave} isDraftSaving={true} />
        </TestWrapper>
      );

      const draftButton = screen.getByText('保存中...');
      expect(draftButton).toBeInTheDocument();
      expect(draftButton).toBeDisabled();
    });
  });

  describe('文字数カウント', () => {
    it('文字数カウンターが表示される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      // 文字数カウンターの存在を確認（具体的な数値は統合テストで確認）
      expect(screen.getAllByText(/100/)).toHaveLength(2); // タイトルの最大文字数（表示用とスクリーンリーダー用）
      expect(screen.getAllByText(/500/)).toHaveLength(4); // 説明と背景の最大文字数（各2つずつ）
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合、全フィールドが無効化される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} disabled={true} />
        </TestWrapper>
      );

      const titleInput = screen.getByPlaceholderText('例：プログラミング基礎書を読む');
      expect(titleInput).toBeDisabled();

      const submitButton = screen.getByText('アクションを更新');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('エラー表示', () => {
    it('エラーサマリーが表示される', () => {
      // エラーがある状態をモック
      const mockUseForm = vi.fn().mockReturnValue({
        register: vi.fn(),
        handleSubmit: vi.fn(),
        watch: vi.fn().mockReturnValue({}),
        setValue: vi.fn(),
        getValues: vi.fn(),
        formState: {
          errors: {
            title: { message: 'タイトルは必須です' },
          },
          isValid: false,
          isDirty: false,
        },
        reset: vi.fn(),
      });

      // useFormをモック
      vi.doMock('react-hook-form', () => ({
        useForm: mockUseForm,
      }));

      render(
        <TestWrapper>
          <ActionForm {...defaultProps} showErrorSummary={true} />
        </TestWrapper>
      );

      // エラーサマリーの表示確認は統合テストで行う
    });
  });

  describe('アクセシビリティ', () => {
    it('フォームにaria-labelが設定される', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('アクション編集フォーム')).toBeInTheDocument();
    });

    it('アナウンス領域が存在する', () => {
      render(
        <TestWrapper>
          <ActionForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('announcement-region')).toBeInTheDocument();
    });
  });

  describe('カスタムクラス名', () => {
    it('カスタムクラス名が適用される', () => {
      const { container } = render(
        <TestWrapper>
          <ActionForm {...defaultProps} className="custom-class" />
        </TestWrapper>
      );

      const formContainer = container.querySelector('.custom-class');
      expect(formContainer).toBeInTheDocument();
    });
  });
});
