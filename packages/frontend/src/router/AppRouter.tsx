import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../components/auth/AuthProvider';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { PublicRoute } from '../components/auth/PublicRoute';
import { LazyLoader } from '../components/common/LazyLoader';
import {
  LazyLoginPage,
  LazySignupPage,
  LazyPasswordResetPage,
  LazyDashboardPage,
  LazyMandalaPage,
  LazyProfilePage,
  LazyNotFoundPage,
} from '../pages/LazyPages';

/**
 * アプリケーションルーター
 *
 * 機能:
 * - React Routerによるルーティング設定
 * - 認証状態に基づくアクセス制御
 * - 遅延ローディング（Code Splitting）
 * - 認証成功後のナビゲーション処理
 *
 * 要件: 1.2, 2.2, 3.5
 */
export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* パブリックルート（認証不要） */}
          <Route
            path="/login"
            element={
              <PublicRoute requiresGuest>
                <LazyLoader>
                  <LazyLoginPage />
                </LazyLoader>
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute requiresGuest>
                <LazyLoader>
                  <LazySignupPage />
                </LazyLoader>
              </PublicRoute>
            }
          />
          <Route
            path="/password-reset"
            element={
              <PublicRoute requiresGuest>
                <LazyLoader>
                  <LazyPasswordResetPage />
                </LazyLoader>
              </PublicRoute>
            }
          />

          {/* 保護されたルート（認証必要） */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LazyLoader>
                  <LazyDashboardPage />
                </LazyLoader>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <LazyLoader>
                  <LazyDashboardPage />
                </LazyLoader>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mandala/:id?"
            element={
              <ProtectedRoute>
                <LazyLoader>
                  <LazyMandalaPage />
                </LazyLoader>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <LazyLoader>
                  <LazyProfilePage />
                </LazyLoader>
              </ProtectedRoute>
            }
          />

          {/* リダイレクト */}
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* 404ページ */}
          <Route
            path="*"
            element={
              <LazyLoader>
                <LazyNotFoundPage />
              </LazyLoader>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
