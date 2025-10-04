import React from 'react';

interface AccessibleListProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * アクセシブルなリストコンポーネント
 * role="listitem"を持つ子要素を適切にラップします
 */
export const AccessibleList: React.FC<AccessibleListProps> = ({
  children,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}) => {
  return (
    <div role="list" className={className} aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
      {children}
    </div>
  );
};
