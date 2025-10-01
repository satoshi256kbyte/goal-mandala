import React from 'react';
import { useSafeContent } from '../../hooks/useSafeContent';

interface SafeTextProps {
  children: string;
  className?: string;
  source?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * XSS対策が適用された安全なテキスト表示コンポーネント
 *
 * @param children - 表示するテキスト
 * @param className - CSSクラス
 * @param source - ログ記録用のソース識別子
 * @param as - 使用するHTML要素（デフォルト: span）
 */
export const SafeText: React.FC<SafeTextProps> = ({
  children,
  className,
  source = 'SafeText',
  as: Component = 'span',
}) => {
  const safeContent = useSafeContent(children, source);

  return <Component className={className}>{safeContent}</Component>;
};

interface SafeTextAreaProps {
  value: string;
  className?: string;
  source?: string;
  preserveLineBreaks?: boolean;
}

/**
 * 複数行テキストの安全な表示コンポーネント
 * 改行を保持しつつXSS対策を適用
 */
export const SafeTextArea: React.FC<SafeTextAreaProps> = ({
  value,
  className,
  source = 'SafeTextArea',
  preserveLineBreaks = true,
}) => {
  const safeContent = useSafeContent(value, source);

  if (preserveLineBreaks) {
    const lines = safeContent.split('\n');
    return (
      <div className={className}>
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return <div className={className}>{safeContent}</div>;
};
