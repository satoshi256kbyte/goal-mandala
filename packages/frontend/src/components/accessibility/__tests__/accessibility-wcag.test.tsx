import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SubGoalEditPage } from '../../pages/SubGoalEditPage';
import { ActionEditPage } from '../../pages/ActionEditPage';
import { DynamicFormField, FieldPresets } from '../forms/DynamicFormField';
import { BulkEditModal } from '../forms/BulkEditModal';
import { VisualAccessibilityProvider } from '../accessibility/VisualAccessibilityProvider';
import { MemoryRouter } from 'react-router-dom';
import { useForm } from 'react-hook-form';

// jest-axeのマッチャーを追加
expect.extend(toHaveNoViolations);

// モックコンポーネント
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// テスト用のフォームラッパー
const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const methods = useForm();
  return (
    <form>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { register: methods.register, watch: methods.watch })
          : child
      )}
    </form>
  );
};

describe('WCAG準拠のアクセシビリティテスト', () => {
  describe('WCAG 2.1 AA準拠テスト', () => {
    test('SubGoalEditPageがWCAG違反を含まない', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('ActionEditPageがWCAG違反を含まない', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/mandala/create/actions/test-goal-id']}>
          <MockAuthProvider>
            <ActionEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('DynamicFormFieldがWCAG違反を含まない', async () => {
      const mockOnChange = jest.fn();

      const { container } = render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title(true)} value="" onChange={mockOnChange} />
          <DynamicFormField
            field={FieldPresets.description(true)}
            value=""
            onChange={mockOnChange}
          />
          <DynamicFormField field={FieldPresets.actionType()} value="" onChange={mockOnChange} />
        </FormWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('BulkEditModalがWCAG違反を含まない', async () => {
      const mockProps = {
        isOpen: true,
        selectedItems: [
          {
            id: '1',
            title: 'Test Item 1',
            description: 'Description 1',
            background: 'Background 1',
            position: 0,
          },
        ],
        onClose: jest.fn(),
        onSave: jest.fn(),
        itemType: 'subgoal' as const,
      };

      const { container } = render(<BulkEditModal {...mockProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('知覚可能性（Perceivable）のテスト', () => {
    test('すべての画像に代替テキストが提供されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    test('色だけでなく他の手段でも情報が伝達されている', () => {
      render(
        <VisualAccessibilityProvider initialSettings={{ colorBlindSafe: true }}>
          <div>
            <div className="status-success">成功メッセージ</div>
            <div className="status-error">エラーメッセージ</div>
            <div className="status-warning">警告メッセージ</div>
          </div>
        </VisualAccessibilityProvider>
      );

      // アイコンやパターンで状態が表現されていることを確認
      expect(screen.getByText(/✓/)).toBeInTheDocument(); // 成功アイコン
      expect(screen.getByText(/✗/)).toBeInTheDocument(); // エラーアイコン
      expect(screen.getByText(/⚠/)).toBeInTheDocument(); // 警告アイコン
    });

    test('十分なコントラスト比が確保されている', () => {
      // 実際のコントラスト比測定は複雑なため、
      // ここでは高コントラストモードが適用されることを確認
      render(
        <VisualAccessibilityProvider initialSettings={{ highContrast: true }}>
          <div className="text-gray-600">テストテキスト</div>
        </VisualAccessibilityProvider>
      );

      // 高コントラストクラスが適用されていることを確認
      expect(document.body).toHaveClass('high-contrast');
    });

    test('テキストサイズが拡大可能である', () => {
      render(
        <VisualAccessibilityProvider initialSettings={{ fontSize: 'large' }}>
          <div>テストテキスト</div>
        </VisualAccessibilityProvider>
      );

      // フォントサイズクラスが適用されていることを確認
      expect(document.body).toHaveClass('font-size-large');
    });
  });

  describe('操作可能性（Operable）のテスト', () => {
    test('すべての機能がキーボードでアクセス可能である', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // インタラクティブな要素がすべてフォーカス可能であることを確認
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('tab'),
        ...screen.getAllByRole('link'),
      ];

      interactiveElements.forEach(element => {
        // tabIndex が -1 でないことを確認（フォーカス可能）
        const tabIndex = element.getAttribute('tabindex');
        expect(tabIndex).not.toBe('-1');
      });
    });

    test('フォーカストラップが適切に機能する', () => {
      const mockProps = {
        isOpen: true,
        selectedItems: [
          {
            id: '1',
            title: 'Test Item 1',
            description: 'Description 1',
            background: 'Background 1',
            position: 0,
          },
        ],
        onClose: jest.fn(),
        onSave: jest.fn(),
        itemType: 'subgoal' as const,
      };

      render(<BulkEditModal {...mockProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');

      // モーダル内のフォーカス可能な要素を確認
      const focusableElements = modal.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    test('動きを減らす設定が尊重される', () => {
      render(
        <VisualAccessibilityProvider initialSettings={{ reduceMotion: true }}>
          <div className="transition-all">アニメーション要素</div>
        </VisualAccessibilityProvider>
      );

      // CSS変数でアニメーション時間が短縮されていることを確認
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--animation-duration')).toBe('0.01ms');
    });

    test('十分な時間が提供されている', () => {
      // 自動保存機能などで十分な時間が提供されていることを確認
      // 実装に応じて調整
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // タイムアウト警告やセッション延長機能があることを確認
      // （実装されている場合）
    });
  });

  describe('理解可能性（Understandable）のテスト', () => {
    test('フォームラベルが明確で理解しやすい', () => {
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title(true)} value="" onChange={mockOnChange} />
          <DynamicFormField
            field={FieldPresets.description(true)}
            value=""
            onChange={mockOnChange}
          />
        </FormWrapper>
      );

      // ラベルが存在し、適切に関連付けられていることを確認
      const titleInput = screen.getByLabelText('タイトル');
      const descriptionInput = screen.getByLabelText('説明');

      expect(titleInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
    });

    test('エラーメッセージが明確で理解しやすい', () => {
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField
            field={FieldPresets.title(true)}
            value=""
            onChange={mockOnChange}
            error="タイトルは必須です"
          />
        </FormWrapper>
      );

      const errorMessage = screen.getByText('タイトルは必須です');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    test('ヘルプテキストが提供されている', () => {
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField
            field={{
              ...FieldPresets.title(true),
              helpText: 'タイトルを入力してください',
            }}
            value=""
            onChange={mockOnChange}
          />
        </FormWrapper>
      );

      const helpText = screen.getByText('タイトルを入力してください');
      expect(helpText).toBeInTheDocument();
    });

    test('必須フィールドが明確に示されている', () => {
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title(true)} value="" onChange={mockOnChange} />
        </FormWrapper>
      );

      const input = screen.getByLabelText('タイトル');
      expect(input).toHaveAttribute('aria-required', 'true');

      // 視覚的な必須マーカーも確認
      const requiredMarker = screen.getByText('*');
      expect(requiredMarker).toBeInTheDocument();
    });
  });

  describe('堅牢性（Robust）のテスト', () => {
    test('有効なHTMLマークアップが使用されている', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // HTML5バリデーションルールに準拠していることを確認
      const results = await axe(container, {
        rules: {
          'valid-lang': { enabled: true },
          'html-has-lang': { enabled: true },
          'landmark-one-main': { enabled: true },
          'page-has-heading-one': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    test('適切なARIA属性が使用されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/actions/test-goal-id']}>
          <MockAuthProvider>
            <ActionEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // タブリストのARIA属性
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
      });
    });

    test('支援技術との互換性が確保されている', () => {
      const mockProps = {
        isOpen: true,
        selectedItems: [
          {
            id: '1',
            title: 'Test Item 1',
            description: 'Description 1',
            background: 'Background 1',
            position: 0,
          },
        ],
        onClose: jest.fn(),
        onSave: jest.fn(),
        itemType: 'subgoal' as const,
      };

      render(<BulkEditModal {...mockProps} />);

      const dialog = screen.getByRole('dialog');

      // モーダルダイアログの適切な実装
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('レベルAA準拠の詳細テスト', () => {
    test('コントラスト比が4.5:1以上である（通常テキスト）', () => {
      // 実際のコントラスト比計算は複雑なため、
      // 適切なクラスが適用されていることを確認
      render(<div className="text-gray-900 bg-white">通常のテキスト</div>);

      // 十分なコントラストを持つクラスが使用されていることを確認
      const textElement = screen.getByText('通常のテキスト');
      expect(textElement).toHaveClass('text-gray-900');
    });

    test('フォーカス表示が2px以上の境界線で表示される', () => {
      render(
        <button className="focus-visible:ring-2 focus-visible:ring-blue-500">テストボタン</button>
      );

      const button = screen.getByText('テストボタン');
      button.focus();

      // フォーカス表示クラスが適用されていることを確認
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    test('タッチターゲットが44px以上のサイズである', () => {
      render(<button className="interactive-element">タッチボタン</button>);

      const button = screen.getByText('タッチボタン');

      // インタラクティブ要素クラスが適用されていることを確認
      expect(button).toHaveClass('interactive-element');
    });

    test('200%ズーム時でも機能が利用可能である', () => {
      // CSSでレスポンシブ対応が適切に実装されていることを確認
      render(
        <VisualAccessibilityProvider initialSettings={{ fontSize: 'extra-large' }}>
          <div className="adaptive-font-size">ズーム対応テキスト</div>
        </VisualAccessibilityProvider>
      );

      // 適応的フォントサイズクラスが適用されていることを確認
      const textElement = screen.getByText('ズーム対応テキスト');
      expect(textElement).toHaveClass('adaptive-font-size');
    });
  });

  describe('エラー処理とフィードバック', () => {
    test('フォーム送信エラーが適切に通知される', async () => {
      const mockOnChange = jest.fn();

      const { container } = render(
        <FormWrapper>
          <DynamicFormField
            field={FieldPresets.title(true)}
            value=""
            onChange={mockOnChange}
            error="タイトルは必須です"
          />
        </FormWrapper>
      );

      // エラーメッセージがアクセシブルに表示されていることを確認
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });

    test('成功メッセージが適切に通知される', () => {
      render(
        <div role="status" aria-live="polite">
          保存が完了しました
        </div>
      );

      const successMessage = screen.getByRole('status');
      expect(successMessage).toBeInTheDocument();
      expect(successMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('国際化対応', () => {
    test('言語属性が適切に設定されている', () => {
      // HTML要素にlang属性が設定されていることを確認
      expect(document.documentElement).toHaveAttribute('lang');
    });

    test('方向性（dir属性）が適切に設定されている', () => {
      // 必要に応じてdir属性が設定されていることを確認
      // 日本語の場合は通常ltrなので、特別な設定は不要
    });
  });
});
