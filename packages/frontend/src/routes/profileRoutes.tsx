import React, { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Lazy load ProfileSetupPage for code splitting
const ProfileSetupPage = lazy(() =>
  import('../pages/ProfileSetupPage').then(module => ({
    default: module.ProfileSetupPage,
  }))
);

export const profileRoutes: RouteObject[] = [
  {
    path: '/profile/setup',
    element: (
      <ProtectedRoute requireAuth={true} requireProfileSetup={false}>
        <ProfileSetupPage />
      </ProtectedRoute>
    ),
  },
];

export default profileRoutes;
