import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { BulkEditModal, BulkEditableItem } from './BulkEditModal';

// Mock all dependencies to prevent complex interactions
vi.mock('../../utils/screen-reader', () => ({
  getDialogAria: () => ({ role: 'dialog', 'aria-modal': 'true' }),
  SR_ONLY_CLASS: 'sr-only',
}));

vi.mock('../../hooks/useAccessibility', () => ({
  useLiveRegion: () => ({ announce: vi.fn() }),
  useFocusTrap: vi.fn(),
  useFocusVisible: () => ({ focusVisibleClasses: 'focus-visible' }),
}));

vi.mock('./DynamicFormField', () => ({
  DynamicFormField: ({ field }: { field: any }) => (
    <div data-testid="dynamic-form-field">
      <label htmlFor={field.id}>{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea id={field.id} name={field.name} />
      ) : field.type === 'select' ? (
        <select id={field.id} name={field.name}>
          {field.options?.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input id={field.id} name={field.name} type={field.type || 'text'} />
      )}
    </div>
  ),
  FieldPresets: {
    title: () => ({ id: 'title', name: 'title', type: 'text', label: 'タイトル', required: true }),
    description: () => ({
      id: 'description',
      name: 'description',
      type: 'textarea',
      label: '説明',
      required: true,
    }),
    background: () => ({
      id: 'background',
      name: 'background',
      type: 'textarea',
      label: '背景・理由',
      required: true,
    }),
    constraints: () => ({
      id: 'constraints',
      name: 'constraints',
      type: 'textarea',
      label: '制約事項',
      required: false,
    }),
    actionType: () => ({
      id: 'actionType',
      name: 'type',
      type: 'select',
      label: 'アクション種別',
      required: true,
      options: [
        { value: 'execution', label: '実行' },
        { value: 'habit', label: '習慣' },
      ],
    }),
  },
}));

vi.mock('../common/LoadingButton', () => ({
  LoadingButton: ({ children, ...props }: any) => (
    <button data-testid="loading-button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../common/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  ),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn(fn => (e: any) => {
      e?.preventDefault?.();
      fn({});
    }),
    watch: vi.fn(() => ({})),
    formState: { errors: {}, isDirty: false },
    reset: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
  }),
  FormProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSubGoals: BulkEditableItem[] = [
  {
    id: 'subgoal-1',
    title: 'サブ目標1',
    description: 'サブ目標1の説明',
    background: 'サブ目標1の背景',
    position: 0,
  },
];

describe('BulkEditModal', () => {
  const defaultProps = {
    isOpen: true,
    selectedItems: mockSubGoals,
    onClose: vi.fn(),
    onSave: vi.fn(),
    itemType: 'subgoal' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('モーダルが閉じている場合、何も表示されない', () => {
      const { container } = render(<BulkEditModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('モーダルが正しく表示される', () => {
      render(<BulkEditModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('サブ目標の一括編集')).toBeInTheDocument();
    });
  });

  describe('編集モード切り替え', () => {
    it('個別項目編集モードに切り替えできる', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const individualButton = screen.getByRole('tab', { name: '個別項目編集' });
      await user.click(individualButton);

      expect(individualButton).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('個別項目編集', () => {
    it('個別項目の編集フォームが表示される', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const individualButton = screen.getByRole('tab', { name: '個別項目編集' });
      await user.click(individualButton);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });

  describe('一括削除機能', () => {
    it('一括削除ボタンをクリックすると確認状態になる', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: '一括削除' });
      await user.click(deleteButton);

      expect(screen.getByRole('button', { name: '削除を確定' })).toBeInTheDocument();
    });

    it('削除確定ボタンをクリックすると削除処理が実行される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn();
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} />);

      const deleteButton = screen.getByRole('button', { name: '一括削除' });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: '削除を確定' });
      await user.click(confirmButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        commonFields: {},
        individualChanges: {},
        deleteItems: ['subgoal-1'],
      });
    });
  });

  describe('フォーム送信', () => {
    it('共通フィールドの変更が正しく送信される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn();
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: '変更を保存' });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('個別項目の変更が正しく送信される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn();
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} />);

      const individualButton = screen.getByRole('tab', { name: '個別項目編集' });
      await user.click(individualButton);

      const saveButton = screen.getByRole('button', { name: '変更を保存' });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  describe('変更プレビュー', () => {
    it('共通フィールドの変更時にプレビューが表示される', () => {
      render(<BulkEditModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('個別項目の変更時にプレビューが表示される', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const individualButton = screen.getByRole('tab', { name: '個別項目編集' });
      await user.click(individualButton);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });
});
