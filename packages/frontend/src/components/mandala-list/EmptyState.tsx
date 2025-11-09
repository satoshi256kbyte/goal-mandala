import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="w-16 h-16 text-gray-400 mb-4" aria-hidden="true">
          {icon}
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>

      <p className="text-gray-600 mb-6 text-center max-w-md">{description}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
