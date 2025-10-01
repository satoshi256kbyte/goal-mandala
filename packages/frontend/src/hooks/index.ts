// カスタムフックのエクスポート
export { default as useAuth } from './useAuth';
export { default as useGoal } from './useGoal';
export { useErrorHandler } from './useErrorHandler';
export { useNetworkStatus } from './useNetworkStatus';
export { useAuthForm } from './useAuthForm';
export { useAuthStateMonitor, useSimpleAuthStateMonitor } from './useAuthStateMonitor';

// フォーム関連フック
export { useCharacterCounter } from './useCharacterCounter';
export type { UseCharacterCounterOptions, UseCharacterCounterReturn } from './useCharacterCounter';

export { useFormActions } from './useFormActions';
export type {
  FormActionState,
  UseFormActionsOptions,
  UseFormActionsReturn,
} from './useFormActions';

// アクセシビリティ関連フック
export {
  useFocusManagement,
  useKeyboardNavigation,
  useLiveRegion,
  useColorAccessibility,
  useFocusVisible,
} from './useAccessibility';

// レスポンシブレイアウト関連フック
export { useResponsiveLayout, useResponsiveLayoutConfig } from './useResponsiveLayout';
export type { DeviceType, ResponsiveLayoutConfig } from './useResponsiveLayout';
