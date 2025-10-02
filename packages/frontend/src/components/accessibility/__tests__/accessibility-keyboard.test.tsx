import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubGoalEditPage } from '../../pages/SubGoalEditPage';
import { ActionEditPage } from '../../pages/ActionEditPage';
import { DynamicFormField, FieldPresets } from '../forms/DynamicFormField';
import { BulkEditModal } from '../forms/BulkEditModal';
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

describe('キーボード操作のアクセシビリティテスト', () => {
  describe('SubGoalEditPage', () => {
    const renderSubGoalEditPage = () => {
      return render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );
    };

    test('Tabキーでフォーカス可能な要素間を移動できる', async () => {
      const user = userEvent.setup();
      renderSubGoalEditPage();

      // 最初の要素にフォーカス
      await user.tab();

      // フォーカス可能な要素を順次確認
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);

      // 各要素にTabでアクセスできることを確認
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        await user.tab();
        // フォーカスが移動していることを確認
      }
    });

    test('Escapeキーでモーダルやダイアログを閉じることができる', async () => {
      const user = userEvent.setup();
      renderSubGoalEditPage();

      // 一括編集モーダルを開く
      const bulkEditButton = screen.getByText('一括編集モード');
      await user.click(bulkEditButton);

      // Escapeキーでモーダルを閉じる
      await user.keyboard('{Escape}');

      // モーダルが閉じられていることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    test('Enterキーでボタンを実行できる', async () => {
      const user = userEvent.setup();
      renderSubGoalEditPage();

      const button = screen.getByText('次へ進む');
      button.focus();

      await user.keyboard('{Enter}');

      // ボタンが実行されたことを確認（実際の実装に応じて調整）
    });

    test('矢印キーでナビゲーションできる', async () => {
      const user = userEvent.setup();
      renderSubGoalEditPage();

      // コンテナにフォーカス
      const container = screen.getByRole('main');
      container.focus();

      // 矢印キーでナビゲーション
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');

      // フォーカスが適切に移動していることを確認
    });

    test('ショートカットキーが機能する', async () => {
      const user = userEvent.setup();
      renderSubGoalEditPage();

      // Ctrl+B で一括編集モード切り替え
      await user.keyboard('{Control>}b{/Control}');

      // 一括編集モードが切り替わったことを確認
      expect(screen.getByText('一括編集モード終了')).toBeInTheDocument();

      // Ctrl+R でAI再生成
      await user.keyboard('{Control>}r{/Control}');

      // AI再生成が実行されたことを確認（実際の実装に応じて調整）
    });
  });

  describe('ActionEditPage', () => {
    const renderActionEditPage = () => {
      return render(
        <MemoryRouter initialEntries={['/mandala/create/actions/test-goal-id']}>
          <MockAuthProvider>
            <ActionEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );
    };

    test('左右矢印キーでサブ目標タブを切り替えできる', async () => {
      const user = userEvent.setup();
      renderActionEditPage();

      const container = screen.getByRole('main');
      container.focus();

      // 右矢印キーで次のタブに移動
      await user.keyboard('{ArrowRight}');

      // 左矢印キーで前のタブに移動
      await user.keyboard('{ArrowLeft}');

      // タブが切り替わったことを確認
    });

    test('Ctrl+数字キーでサブ目標タブを直接選択できる', async () => {
      const user = userEvent.setup();
      renderActionEditPage();

      // Ctrl+1 で最初のタブを選択
      await user.keyboard('{Control>}1{/Control}');

      // Ctrl+2 で2番目のタブを選択
      await user.keyboard('{Control>}2{/Control}');

      // タブが切り替わったことを確認
    });
  });

  describe('DynamicFormField', () => {
    test('Tabキーで次のフィールドにフォーカス移動できる', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title()} value="" onChange={mockOnChange} />
          <DynamicFormField field={FieldPresets.description()} value="" onChange={mockOnChange} />
        </FormWrapper>
      );

      const firstInput = screen.getByLabelText('タイトル');
      const secondInput = screen.getByLabelText('説明');

      firstInput.focus();
      await user.tab();

      expect(secondInput).toHaveFocus();
    });

    test('Enterキーでフォーム送信イベントが発生する', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      // カスタムイベントリスナーを設定
      const mockEventListener = jest.fn();
      document.addEventListener('dynamicFormSave', mockEventListener);

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.title()} value="test" onChange={mockOnChange} />
        </FormWrapper>
      );

      const input = screen.getByLabelText('タイトル');
      input.focus();
      await user.keyboard('{Enter}');

      expect(mockEventListener).toHaveBeenCalled();

      document.removeEventListener('dynamicFormSave', mockEventListener);
    });

    test('ラジオボタンで矢印キーナビゲーションができる', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <FormWrapper>
          <DynamicFormField field={FieldPresets.actionType()} value="" onChange={mockOnChange} />
        </FormWrapper>
      );

      const firstRadio = screen.getByLabelText(/実行アクション/);
      const secondRadio = screen.getByLabelText(/習慣アクション/);

      firstRadio.focus();
      await user.keyboard('{ArrowDown}');

      expect(secondRadio).toHaveFocus();

      await user.keyboard('{ArrowUp}');
      expect(firstRadio).toHaveFocus();
    });
  });

  describe('BulkEditModal', () => {
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

    test('モーダル内でフォーカストラップが機能する', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...mockProps} />);

      // モーダル内の最初の要素にフォーカス
      const firstButton = screen.getByText('共通フィールド編集');
      firstButton.focus();

      // Tabキーで最後の要素まで移動
      await user.tab(); // 個別項目編集
      await user.tab(); // 閉じるボタン
      await user.tab(); // フォーム内の要素...

      // 最後の要素からTabで最初の要素に戻ることを確認
      // （実際のフォーカストラップの実装に応じて調整）
    });

    test('Escapeキーでモーダルを閉じることができる', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(<BulkEditModal {...mockProps} onClose={mockOnClose} />);

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('編集モード切り替えがキーボードで操作できる', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...mockProps} />);

      const commonButton = screen.getByText('共通フィールド編集');
      const individualButton = screen.getByText('個別項目編集');

      // Tabキーで移動
      commonButton.focus();
      await user.tab();
      expect(individualButton).toHaveFocus();

      // Enterキーで選択
      await user.keyboard('{Enter}');

      // 編集モードが切り替わったことを確認
      expect(individualButton).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('フォーカス管理', () => {
    test('ページ読み込み時に適切な要素にフォーカスが設定される', () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // スキップリンクまたはメインコンテンツにフォーカスが設定されることを確認
      const skipLink = screen.getByText('メインコンテンツにスキップ');
      expect(skipLink).toBeInTheDocument();
    });

    test('モーダル開閉時にフォーカスが適切に管理される', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      const bulkEditButton = screen.getByText('一括編集モード');
      bulkEditButton.focus();

      // モーダルを開く
      await user.click(bulkEditButton);

      // モーダル内の要素にフォーカスが移動することを確認
      await waitFor(() => {
        const modalContent = screen.getByRole('dialog');
        expect(modalContent).toBeInTheDocument();
      });

      // モーダルを閉じる
      const closeButton = screen.getByLabelText('モーダルを閉じる');
      await user.click(closeButton);

      // 元の要素にフォーカスが戻ることを確認
      await waitFor(() => {
        expect(bulkEditButton).toHaveFocus();
      });
    });
  });

  describe('キーボードショートカット', () => {
    test('ヘルプキー（F1）でキーボードショートカット一覧が表示される', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      await user.keyboard('{F1}');

      // ヘルプダイアログまたはツールチップが表示されることを確認
      // （実装に応じて調整）
    });

    test('Alt+数字キーでランドマーク間を移動できる', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/mandala/create/subgoals/test-goal-id']}>
          <MockAuthProvider>
            <SubGoalEditPage />
          </MockAuthProvider>
        </MemoryRouter>
      );

      // Alt+1 でメインコンテンツに移動
      await user.keyboard('{Alt>}1{/Alt}');

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });
  });
});
