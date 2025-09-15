import React from 'react';

/**
 * 成功メッセージコンポーネントのProps
 */
export interface SuccessMessageProps {
  /** 成功メッセージ */
  message?: string | null;
  /** 追加のCSSクラス */
  className?: string;
  /** メッセージのID（アクセシビリティ用） */
  id?: string;
  /** 自動で閉じるまでの時間（ミリ秒）。0の場合は自動で閉じない */
  autoCloseDelay?: number;
  /** メッセージを閉じるハンドラー */
  onClose?: () => void;
  /** アイコンを表示するかどうか */
  showIcon?: boolean;
}

/**
 * 成功メッセージコンポーネント
 *
 * 操作の成功を示すメッセージを表示します。
 * アクセシビリティを考慮し、適切なARIA属性を設定しています。
 */
export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  className = '',
  id,
  autoCloseDelay = 0,
  onClose,
  showIcon = true,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // 自動クローズ機能
  React.useEffect(() => {
    if (autoCloseDelay > 0 && message) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [message, autoCloseDelay, onClose]);

  // メッセージが変更されたら表示状態をリセット
  React.useEffect(() => {
    if (message) {
      setIsVisible(true);
    }
  }, [message]);

  if (!message || !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div
      id={id}
      role="status"
      className={`bg-green-50 border border-green-200 rounded-md p-4 ${className}`}
      aria-live="polite"
    >
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        <div className={`${showIcon ? 'ml-3' : ''} flex-1`}>
          <p className="text-sm font-medium text-green-800">{message}</p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                aria-label="成功メッセージを閉じる"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessMessage;
