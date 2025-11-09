import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';

/**
 * UserMenuコンポーネントのプロパティ
 */
export interface UserMenuProps {
  userName: string;
  userEmail: string;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
  className?: string;
}

/**
 * UserMenuコンポーネント
 *
 * 機能:
 * - ユーザーメニューアイコンの表示
 * - ドロップダウンメニューの表示
 * - ユーザー名・メールアドレスの表示
 * - 設定・ログアウトメニュー項目
 *
 * 要件: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */
export const UserMenu: React.FC<UserMenuProps> = ({
  userName,
  userEmail,
  onSettingsClick,
  onLogoutClick,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // メニューの開閉
  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  // メニューを閉じる
  const closeMenu = () => {
    setIsOpen(false);
  };

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escapeキーでメニューを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // 設定クリックハンドラー
  const handleSettingsClick = () => {
    closeMenu();
    onSettingsClick();
  };

  // ログアウトクリックハンドラー
  const handleLogoutClick = () => {
    closeMenu();
    onLogoutClick();
  };

  // ユーザーのイニシャルを取得
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className={`relative ${className}`}>
      {/* ユーザーメニューアイコン */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-label="ユーザーメニューを開く"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 touch-manipulation"
      >
        {getInitials(userName)}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
        >
          {/* ユーザー情報 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>

          {/* メニュー項目 */}
          <div className="py-1">
            {/* 設定 */}
            <button
              type="button"
              onClick={handleSettingsClick}
              className="w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors duration-150 min-h-[44px] touch-manipulation"
              role="menuitem"
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                設定
              </div>
            </button>

            {/* ログアウト */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors duration-150 min-h-[44px] touch-manipulation"
              role="menuitem"
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                ログアウト
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * UserMenuWithAuthコンポーネント
 *
 * 認証コンテキストと統合されたUserMenuコンポーネント
 * 自動的にユーザー情報を取得し、ログアウト処理を実行します
 */
export const UserMenuWithAuth: React.FC<{ className?: string }> = ({ className }) => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleLogoutClick = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <UserMenu
      userName={user.name}
      userEmail={user.email}
      onSettingsClick={handleSettingsClick}
      onLogoutClick={handleLogoutClick}
      className={className}
    />
  );
};

export default UserMenu;
