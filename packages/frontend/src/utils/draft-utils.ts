/**
 * 下書きユーティリティ
 */

/**
 * 下書きデータの検証
 */
export const validateDraft = (data: unknown): boolean => {
  return data !== null && data !== undefined;
};

/**
 * 下書きデータのフォーマット
 */
export const formatDraft = (data: unknown): string => {
  return JSON.stringify(data);
};

/**
 * 下書きデータのパース
 */
export const parseDraft = (data: string): unknown => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * 下書きの概要を取得
 */
export const getDraftSummary = (data: unknown): string => {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  return obj.title ? String(obj.title) : '';
};

/**
 * 保存からの経過時間を取得
 */
export const getTimeSinceSave = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '1分未満';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  return `${hours}時間前`;
};

/**
 * 保存する価値があるかチェック
 */
export const isWorthSaving = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return Object.keys(obj).some(key => {
    const value = obj[key];
    return value !== null && value !== undefined && value !== '';
  });
};

/**
 * 下書きユーティリティのエクスポート
 */
export const draftUtils = {
  validate: validateDraft,
  format: formatDraft,
  parse: parseDraft,
  getDraftSummary,
  getTimeSinceSave,
  isWorthSaving,
};
