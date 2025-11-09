import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../components/auth/AuthProvider';
import { AuthStateMonitorProvider } from '../components/auth/AuthStateMonitorProvider';
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
  LazyProfileSetupPage,
  LazyMandalaListPage,
  LazyGoalInputPage,
  LazySubGoalEditPage,
  LazyActionEditPage,
  LazyProcessingPage,
  LazyNotFoundPage,
} from '../pages/LazyPages';

/**
 * アプリケーションルーター
 *
 * 機能:
 * - React Routerによるルーティング設定
 * - 認証状態に基づくアクセス制御
 * - 認証状態監視の自動開始
 * - 遅延ローディング（Code Splitting）
 * - 認証成功後のナビゲーション処理
 *
 * 要件: 1.2, 2.2, 3.5, 5.1, 5.4, 5.5
 */
export const AppRouter: React.FC = () => {
  // 環境別の監視設定
  const monitorConfig = {
    checkInterval: process.env.NODE_ENV === 'development' ? 30000 : 60000, // 開発環境: 30秒、本番環境: 60秒
    tokenRefreshBuffer: 300000, // 5分前にリフレッシュ
    inactivityTimeout: process.env.NODE_ENV === 'development' ? 3600000 : 1800000, // 開発環境: 60分、本番環境: 30分
    maxRetryAttempts: 3,
    retryDelay: 1000,
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthStateMonitorProvider
          autoStart={true}
          config={monitorConfig}
          debug={process.env.NODE_ENV === 'development'}
        >
          <Routes>
            {/* パブリックルート（認証不要） */}
            <Route
              path="/login"
              element={
                <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
                  <LazyLoader>
                    <LazyLoginPage />
                  </LazyLoader>
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
                  <LazyLoader>
                    <LazySignupPage />
                  </LazyLoader>
                </PublicRoute>
              }
            />
            <Route
              path="/password-reset"
              element={
                <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
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
                    <LazyMandalaListPage />
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
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <LazyLoader>
                    <LazyProfileSetupPage />
                  </LazyLoader>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mandala/create/goal"
              element={
                <ProtectedRoute>
                  <LazyLoader>
                    <LazyGoalInputPage />
                  </LazyLoader>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mandala/create/processing"
              element={
                <ProtectedRoute>
                  <LazyLoader>
                    <LazyProcessingPage />
                  </LazyLoader>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mandala/create/subgoals"
              element={
                <ProtectedRoute>
                  <LazyLoader>
                    <LazySubGoalEditPage />
                  </LazyLoader>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mandala/create/actions"
              element={
                <ProtectedRoute>
                  <LazyLoader>
                    <LazyActionEditPage />
                  </LazyLoader>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subgoals/edit/:goalId"
              element={
                <ProtectedRoute>
                  <LazyLoader>
                    <LazySubGoalEditPage />
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
        </AuthStateMonitorProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
