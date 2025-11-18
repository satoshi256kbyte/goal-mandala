import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { UserMenu, UserMenuWithAuth } from '../UserMenu';
import { AuthContext } from '../../../hooks/useAuth';

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('UserMenu', () => {
  const mockProps = {
    userName: '山田太郎',
    userEmail: 'yamada@example.com',
    onSettingsClick: vi.fn(),
    onLogoutClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('メニュー表示', () => {
    it('ユーザーメニューアイコンが表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      expect(button).toBeInTheDocument();
    });

    it('ユーザーのイニシャルが表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      // 日本語の名前の場合、スペースで分割すると「山田」と「太郎」になる
      expect(button).toHaveTextContent('山');
    });

    it('単一名の場合は最初の文字のみ表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} userName="太郎" />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      expect(button).toHaveTextContent('太');
    });

    it('メニューアイコンをクリックするとドロップダウンが表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });

    it('ドロップダウンにユーザー名が表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      expect(screen.getByText('山田太郎')).toBeInTheDocument();
    });

    it('ドロップダウンにメールアドレスが表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      expect(screen.getByText('yamada@example.com')).toBeInTheDocument();
    });

    it('設定メニュー項目が表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const settingsButton = screen.getByRole('menuitem', { name: /設定/ });
      expect(settingsButton).toBeInTheDocument();
    });

    it('ログアウトメニュー項目が表示される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const logoutButton = screen.getByRole('menuitem', { name: /ログアウト/ });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('設定遷移', () => {
    it('設定メニュー項目をクリックするとonSettingsClickが呼ばれる', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const settingsButton = screen.getByRole('menuitem', { name: /設定/ });
      fireEvent.click(settingsButton);

      expect(mockProps.onSettingsClick).toHaveBeenCalledTimes(1);
    });

    it('設定メニュー項目をクリックするとメニューが閉じる', async () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const settingsButton = screen.getByRole('menuitem', { name: /設定/ });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('ログアウト処理', () => {
    it('ログアウトメニュー項目をクリックするとonLogoutClickが呼ばれる', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const logoutButton = screen.getByRole('menuitem', { name: /ログアウト/ });
      fireEvent.click(logoutButton);

      expect(mockProps.onLogoutClick).toHaveBeenCalledTimes(1);
    });

    it('ログアウトメニュー項目をクリックするとメニューが閉じる', async () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const logoutButton = screen.getByRole('menuitem', { name: /ログアウト/ });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('メニューの開閉', () => {
    it('メニューアイコンを再度クリックするとメニューが閉じる', async () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });

      // メニューを開く
      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // メニューを閉じる
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('外部をクリックするとメニューが閉じる', async () => {
      render(
        <TestWrapper>
          <div data-testid="outside">
            <UserMenu {...mockProps} />
          </div>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();

      // 外部をクリック
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('Escapeキーを押すとメニューが閉じる', async () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Escapeキーを押す
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('メニューボタンにaria-expanded属性が設定される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });

      // 閉じている状態
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // 開いている状態
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('メニューボタンにaria-haspopup属性が設定される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('ドロップダウンメニューにrole="menu"が設定される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });

    it('メニュー項目にrole="menuitem"が設定される', () => {
      render(
        <TestWrapper>
          <UserMenu {...mockProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
      fireEvent.click(button);

      const settingsButton = screen.getByRole('menuitem', { name: /設定/ });
      const logoutButton = screen.getByRole('menuitem', { name: /ログアウト/ });

      expect(settingsButton).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('スタイリング', () => {
    it('カスタムクラスが適用される', () => {
      const { container } = render(
        <TestWrapper>
          <UserMenu {...mockProps} className="custom-class" />
        </TestWrapper>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});

describe('UserMenuWithAuth', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'テストユーザー',
    profileSetup: true,
  };

  const mockSignOut = vi.fn();

  const mockAuthContext = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signOut: mockSignOut,
    getTokenExpirationTime: () => null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('認証済みユーザーの情報が表示される', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <UserMenuWithAuth />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
    fireEvent.click(button);

    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('未認証の場合は何も表示されない', () => {
    const unauthContext = {
      ...mockAuthContext,
      user: null,
      isAuthenticated: false,
    };

    const { container } = render(
      <BrowserRouter>
        <AuthContext.Provider value={unauthContext}>
          <UserMenuWithAuth />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('ログアウトをクリックするとsignOutが呼ばれる', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <UserMenuWithAuth />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: 'ユーザーメニューを開く' });
    fireEvent.click(button);

    const logoutButton = screen.getByRole('menuitem', { name: /ログアウト/ });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
