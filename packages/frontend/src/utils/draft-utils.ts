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
 * 下書きユーティリティのエクスポート
 */
export const draftUtils = {
  validate: validateDraft,
  format: formatDraft,
  parse: parseDraft,
};
