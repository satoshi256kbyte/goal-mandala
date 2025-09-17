/**
 * XSS対策のためのテキストサニタイズ関数
 */
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * HTMLタグを除去する関数
 */
export const stripHtml = (html: string): string => {
  if (typeof html !== 'string') return '';

  return html.replace(/<[^>]*>/g, '');
};

/**
 * セルデータの検証
 */
export const validateCellData = (cellData: unknown): boolean => {
  if (!cellData || typeof cellData !== 'object') return false;

  const data = cellData as Record<string, unknown>;

  return (
    typeof data.id === 'string' &&
    ['goal', 'subgoal', 'action', 'empty'].includes(data.type as string) &&
    typeof data.title === 'string' &&
    typeof data.progress === 'number' &&
    data.progress >= 0 &&
    data.progress <= 100
  );
};

/**
 * 入力データの検証とサニタイズ
 */
export const sanitizeCellData = (cellData: unknown): Record<string, unknown> => {
  if (!validateCellData(cellData)) {
    throw new Error('Invalid cell data');
  }

  const data = cellData as Record<string, unknown>;

  return {
    ...data,
    title: sanitizeText(data.title as string),
    description: data.description ? sanitizeText(data.description as string) : undefined,
  };
};
