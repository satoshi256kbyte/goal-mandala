import React from 'react';

interface ProgressBarProps {
  progress: number;
  label: string;
  size?: 'small' | 'medium' | 'large';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, size = 'medium' }) => {
  const getColor = (progress: number) => {
    if (progress <= 33) return 'bg-red-500';
    if (progress <= 66) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4',
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className="w-full">
      <div className={`flex justify-between items-center mb-1 ${textSizeClasses[size]}`}>
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-600">{progress}%</span>
      </div>

      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${getColor(progress)}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};
