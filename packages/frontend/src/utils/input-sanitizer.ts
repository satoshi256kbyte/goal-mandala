import DOMPurify from 'dompurify';

/**
 * 目標入力フォーム用の入力値サニタイゼーション機能
 */

/**
 * 基本的なテキストサニタイゼーション
 * HTMLタグを除去し、危険な文字をエスケープ
 */
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') return '';

  // まず基本的なHTMLエスケープ
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // DOMPurifyでHTMLタグを除去（エスケープ済みなので安全）
  const cleaned = DOMPurify.sanitize(escaped, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return cleaned.trim();
};

/**
 * 目標タイトル用サニタイゼーション
 * 改行文字を除去し、長さを制限
 */
export const sanitizeGoalTitle = (title: string): string => {
  if (typeof title !== 'string') return '';

  return sanitizeText(title)
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 100)
    .trim();
};

/**
 * 説明文用サニタイゼーション
 * 改行は保持し、長さを制限
 */
export const sanitizeDescription = (description: string): string => {
  if (typeof description !== 'string') return '';

  return sanitizeText(description)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .substring(0, 1000)
    .trim();
};

/**
 * 背景情報用サニタイゼーション
 */
export const sanitizeBackground = (background: string): string => {
  if (typeof background !== 'string') return '';

  return sanitizeText(background)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .substring(0, 500)
    .trim();
};

/**
 * 制約事項用サニタイゼーション
 */
export const sanitizeConstraints = (constraints: string): string => {
  if (typeof constraints !== 'string') return '';

  return sanitizeText(constraints)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .substring(0, 500)
    .trim();
};

/**
 * 日付文字列のサニタイゼーション
 * ISO 8601形式の日付のみ許可
 */
export const sanitizeDate = (dateString: string): string => {
  if (typeof dateString !== 'string') return '';

  // ISO 8601形式の日付パターン（YYYY-MM-DD）
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(dateString)) {
    return '';
  }

  // 日付の妥当性チェック
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return '';
  }

  // 入力された日付と実際の日付が一致するかチェック
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const expectedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  if (dateString !== expectedDate) {
    return '';
  }

  return dateString;
};

/**
 * 目標フォームデータ全体のサニタイゼーション
 */
export interface GoalFormData {
  title: string;
  description: string;
  deadline: string;
  background: string;
  constraints?: string;
}

export const sanitizeGoalFormData = (data: Partial<GoalFormData>): GoalFormData => {
  return {
    title: sanitizeGoalTitle(data.title || ''),
    description: sanitizeDescription(data.description || ''),
    deadline: sanitizeDate(data.deadline || ''),
    background: sanitizeBackground(data.background || ''),
    constraints: data.constraints ? sanitizeConstraints(data.constraints) : '',
  };
};

/**
 * SQLインジェクション対策用のエスケープ
 * フロントエンドでの追加保護として実装
 */
export const escapeSqlChars = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/'/g, "''")
    .replace(/;/g, '\\;')
    .replace(/--/g, '\\--')
    .replace(/\/\*/g, '\\/\\*')
    .replace(/\*\//g, '\\*\\/')
    .replace(/xp_/gi, 'x_p_')
    .replace(/sp_/gi, 's_p_');
};

/**
 * 危険なスクリプトパターンの検出と除去
 */
export const removeScriptPatterns = (input: string): string => {
  if (typeof input !== 'string') return '';

  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onfocus\s*=/gi,
    /onblur\s*=/gi,
    /onchange\s*=/gi,
    /onsubmit\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
  ];

  let cleaned = input;
  dangerousPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  return cleaned;
};

/**
 * 包括的なサニタイゼーション
 * 全ての対策を組み合わせた最終的なサニタイゼーション
 */
export const comprehensiveSanitize = (input: string): string => {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // 1. 危険なスクリプトパターンを除去
  sanitized = removeScriptPatterns(sanitized);

  // 2. DOMPurifyでHTMLを除去
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // 3. 基本的なHTMLエスケープ
  sanitized = sanitizeText(sanitized);

  // 4. SQLインジェクション対策
  sanitized = escapeSqlChars(sanitized);

  return sanitized.trim();
};
