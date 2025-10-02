import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubGoalEditPage } from '../../pages/SubGoalEditPage';
import { ActionEditPage } from '../../pages/ActionEditPage';
import { DynamicFormField, FieldPresets } from '../forms/DynamicFormField';
import { BulkEditModal } from '../forms/BulkEditModal';
import { VisualAccessibilityProvider } from '../accessibility/VisualAccessibilityProvider';
import { MemoryRouter } from 'react-router-dom';
import { useForm } from 'react-hook-form';

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

describe('スクリーンリーダー対応のアクセシビリティテスト', () => {
  describe('ARIA属性の検証', () => {
    test('フォーム要素に適切なARIAラベルが設定されている', () => {
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title(true)} value="" onChange={mockOnChange} />
        </FormWrapper>
      );

      const input = screen.getByLabelText('タイトル');

      // 必須フィールドのaria-required属性
      expect(input).toHaveAttribute('aria-required', 'true');

      // ラベルとの関連付け
      expect(input).toHaveAttribute('aria-labelledby');

      // 説明文との関連付け
      expect(input).toHaveAttribute('aria-describedby');
    });

    test('エラー状態のフィールドに適切なARIA属性が設定されている', () => {
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

      const input = screen.getByLabelText('タイトル');

      // エラー状態のaria-invalid属性
      expect(input).toHaveAttribute('aria-invalid', 'true');

      // エラーメッセージとの関連付け
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('error');
    });

    test('プログレスバーに適切なARIA属性が設定されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // プログレスバーを探す
      const progressBars = screen.getAllByRole('progressbar');

      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin');
        expect(progressBar).toHaveAttribute('aria-valuemax');
        expect(progressBar).toHaveAttribute('aria-valuetext');
      });
    });

    test('タブリストに適切なARIA属性が設定されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/actions/test-goal-id']}>
          <MockAuthProvider>
            <ActionEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('id');
      });
    });

    test('モーダルダイアログに適切なARIA属性が設定されている', () => {
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
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('ライブリージョンの検証', () => {
    test('フォーム送信時にライブリージョンでステータスが通知される', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField
            field={FieldPresets.title()}
            value="test title"
            onChange={mockOnChange}
          />
        </FormWrapper>
      );

      const input = screen.getByLabelText('タイトル');

      // Enterキーでフォーム送信
      input.focus();
      await user.keyboard('{Enter}');

      // ライブリージョンでステータスが通知されることを確認
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    test('文字数制限到達時にライブリージョンで警告が通知される', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField
            field={{
              ...FieldPresets.title(),
              maxLength: 10,
              showWarning: true,
            }}
            value=""
            onChange={mockOnChange}
          />
        </FormWrapper>
      );

      const input = screen.getByLabelText('タイトル');

      // 制限に近い文字数を入力
      await user.type(input, '123456789');

      // 警告がライブリージョンで通知されることを確認
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    test('エラー発生時にライブリージョンでエラーが通知される', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // エラーを発生させる操作（実装に応じて調整）
      const regenerateButton = screen.getByText('AI再生成');
      await user.click(regenerateButton);

      // エラーがライブリージョンで通知されることを確認
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('セマンティックHTML構造の検証', () => {
    test('適切なランドマーク要素が使用されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // メインランドマーク
      expect(screen.getByRole('main')).toBeInTheDocument();

      // バナーランドマーク
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // ナビゲーションランドマーク
      const navigation = screen.queryByRole('navigation');
      if (navigation) {
        expect(navigation).toHaveAttribute('aria-label');
      }
    });

    test('見出し階層が適切に構成されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const headings = screen.getAllByRole('heading');

      // h1が存在することを確認
      const h1Elements = headings.filter(h => h.tagName === 'H1');
      expect(h1Elements.length).toBeGreaterThan(0);

      // 見出しレベルが論理的に構成されていることを確認
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);
      });
    });

    test('リスト構造が適切に使用されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const lists = screen.getAllByRole('list');

      lists.forEach(list => {
        // リストアイテムが存在することを確認
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });

    test('フォーム構造が適切に使用されている', () => {
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

      // フォーム要素が存在することを確認
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // フィールドセットが適切に使用されていることを確認
      const fieldsets = screen.getAllByRole('group');
      fieldsets.forEach(fieldset => {
        // レジェンドが存在することを確認（スクリーンリーダー専用でも可）
        expect(fieldset).toBeInTheDocument();
      });
    });
  });

  describe('スクリーンリーダー専用コンテンツの検証', () => {
    test('スクリーンリーダー専用の説明テキストが提供されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // sr-onlyクラスの要素を確認
      const srOnlyElements = document.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);

      // 重要な操作に対する説明が提供されていることを確認
      srOnlyElements.forEach(element => {
        expect(element.textContent).toBeTruthy();
      });
    });

    test('スキップリンクが提供されている', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const skipLink = screen.getByText('メインコンテンツにスキップ');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    test('フォーカス時に表示されるヘルプテキストが提供されている', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const bulkEditButton = screen.getByText('一括編集モード');

      // ボタンにフォーカス
      bulkEditButton.focus();

      // title属性またはaria-describedbyでヘルプテキストが提供されていることを確認
      expect(bulkEditButton).toHaveAttribute('title');
    });
  });

  describe('動的コンテンツの通知', () => {
    test('コンテンツ変更時にスクリーンリーダーに適切に通知される', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/mandala/create/actions/test-goal-id']}>
          <MockAuthProvider>
            <ActionEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // タブ切り替え
      const tabs = screen.getAllByRole('tab');
      if (tabs.length > 1) {
        await user.click(tabs[1]);

        // タブ切り替えがライブリージョンで通知されることを確認
        await waitFor(() => {
          const liveRegions = screen.getAllByRole('status');
          expect(liveRegions.length).toBeGreaterThan(0);
        });
      }
    });

    test('フォーム検証結果がスクリーンリーダーに通知される', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title(true)} value="" onChange={mockOnChange} />
        </FormWrapper>
      );

      const input = screen.getByLabelText('タイトル');

      // 必須フィールドを空のままフォーカスアウト
      input.focus();
      await user.tab();

      // バリデーションエラーがライブリージョンで通知されることを確認
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('色覚対応の検証', () => {
    test('色以外の手段で情報が伝達されている', () => {
      render(
        <VisualAccessibilityProvider initialSettings={{ colorBlindSafe: true }}>
          <FormWrapper>
            <DynamicFormField
              field={FieldPresets.title(true)}
              value=""
              onChange={jest.fn()}
              error="エラーメッセージ"
            />
          </FormWrapper>
        </VisualAccessibilityProvider>
      );

      // エラー状態がアイコンやパターンでも表現されていることを確認
      const errorElements = screen.getAllByText(/✗/);
      expect(errorElements.length).toBeGreaterThan(0);
    });

    test('成功状態が色以外の手段でも表現されている', () => {
      render(
        <VisualAccessibilityProvider initialSettings={{ colorBlindSafe: true }}>
          <div className="status-success">成功メッセージ</div>
        </VisualAccessibilityProvider>
      );

      // 成功状態がアイコンでも表現されていることを確認
      const successElements = screen.getAllByText(/✓/);
      expect(successElements.length).toBeGreaterThan(0);
    });
  });

  describe('フォーカス管理の検証', () => {
    test('フォーカスが視覚的に明確に表示される', async () => {
      const user = userEvent.setup();

      render(
        <VisualAccessibilityProvider initialSettings={{ enhancedFocus: true }}>
          <button>テストボタン</button>
        </VisualAccessibilityProvider>
      );

      const button = screen.getByText('テストボタン');

      // フォーカス
      button.focus();

      // フォーカス表示が強化されていることを確認
      expect(button).toHaveClass('enhanced-focus');
    });

    test('フォーカス順序が論理的である', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>ボタン1</button>
          <input placeholder="入力1" />
          <button>ボタン2</button>
          <input placeholder="入力2" />
        </div>
      );

      const button1 = screen.getByText('ボタン1');
      const input1 = screen.getByPlaceholderText('入力1');
      const button2 = screen.getByText('ボタン2');
      const input2 = screen.getByPlaceholderText('入力2');

      // フォーカス順序を確認
      button1.focus();
      await user.tab();
      expect(input1).toHaveFocus();

      await user.tab();
      expect(button2).toHaveFocus();

      await user.tab();
      expect(input2).toHaveFocus();
    });
  });
});
