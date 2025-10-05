/**
 * AI入力のセキュリティユーティリティ
 * プロンプトインジェクション対策と入力サニタイゼーション
 */

// デフォルトの最大文字数
const DEFAULT_MAX_LENGTH = 5000;

// プロンプトインジェクション検出パターン
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /forget\s+(?:all\s+)?(?:previous\s+)?(?:instructions|everything)/i,
  /disregard\s+(?:all\s+)?(?:previous\s+)?(?:instructions|commands)/i,
  /override\s+(?:your\s+)?instructions/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /\[system\]/i,
  /\[assistant\]/i,
];

/**
 * AI入力をサニタイズする
 * - 特殊文字のエスケープ
 * - 文字数制限の適用
 * - 前後の空白の削除
 *
 * @param input - サニタイズする入力文字列
 * @param maxLength - 最大文字数（デフォルト: 5000）
 * @returns サニタイズされた文字列
 */
export function sanitizeAIInput(input: unknown, maxLength: number = DEFAULT_MAX_LENGTH): string {
  // null, undefinedの場合は空文字列を返す
  if (input === null || input === undefined) {
    return '';
  }

  // 文字列に変換
  let sanitized = String(input);

  // 前後の空白を削除
  sanitized = sanitized.trim();

  // 特殊文字のエスケープ
  // 波括弧を削除（プロンプトテンプレートの変数展開を防ぐ）
  sanitized = sanitized.replace(/[{}]/g, '');

  // 山括弧を削除（HTMLタグやXML構造を防ぐ）
  sanitized = sanitized.replace(/[<>]/g, '');

  // バックスラッシュを削除（エスケープシーケンスを防ぐ）
  sanitized = sanitized.replace(/\\/g, '');

  // 引用符を削除（文字列リテラルの終端を防ぐ）
  sanitized = sanitized.replace(/["'`]/g, '');

  // 文字数制限を適用
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * プロンプトインジェクション攻撃を検出する
 *
 * @param input - 検査する入力文字列
 * @returns プロンプトインジェクションが検出された場合はtrue
 */
export function detectPromptInjection(input: unknown): boolean {
  // null, undefinedの場合は安全とみなす
  if (input === null || input === undefined) {
    return false;
  }

  // 文字列に変換
  const str = String(input);

  // 空文字列は安全とみなす
  if (str.trim() === '') {
    return false;
  }

  // 各パターンをチェック
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(str)) {
      return true;
    }
  }

  return false;
}

/**
 * AI入力の総合的なバリデーション
 * サニタイズとインジェクション検出を組み合わせる
 *
 * @param input - 検証する入力文字列
 * @param maxLength - 最大文字数（デフォルト: 5000）
 * @returns バリデーション結果
 */
export function validateAIInput(
  input: unknown,
  maxLength: number = DEFAULT_MAX_LENGTH
): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  // サニタイズ
  const sanitized = sanitizeAIInput(input, maxLength);

  // 空文字列チェック
  if (sanitized === '') {
    return {
      isValid: false,
      sanitized,
      error: '入力が空です',
    };
  }

  // プロンプトインジェクション検出
  if (detectPromptInjection(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: '不正な入力が検出されました',
    };
  }

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * ログ出力用に機密情報をマスクする
 * メールアドレス、電話番号、APIキー、トークンなどを検出してマスク
 *
 * @param input - マスクする入力文字列
 * @returns マスクされた文字列
 */
export function sanitizeForLog(input: unknown): string {
  // null, undefinedの場合は空文字列を返す
  if (input === null || input === undefined) {
    return '';
  }

  // 文字列に変換
  let sanitized = String(input);

  // メールアドレスをマスク
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // 電話番号をマスク（日本の電話番号形式）
  sanitized = sanitized.replace(/0\d{1,4}-?\d{1,4}-?\d{4}/g, '[PHONE]');

  // クレジットカード番号をマスク（ハイフンまたはスペース区切りの16桁）
  sanitized = sanitized.replace(/\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g, '[CREDIT_CARD]');

  // APIキーをマスク（sk-で始まる6文字以上の英数字）
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{6,}/g, '[API_KEY]');

  // JWTトークンをマスク
  sanitized = sanitized.replace(
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    '[JWT_TOKEN]'
  );

  // パスワードをマスク（password: の後の値）
  sanitized = sanitized.replace(/password:\s*[^\s,}]+/gi, 'password: [PASSWORD]');

  // データベース接続文字列の認証情報をマスク
  sanitized = sanitized.replace(
    /([a-zA-Z0-9_-]+):([a-zA-Z0-9_!@#$%^&*()-]+)@/g,
    '[REDACTED]:[REDACTED]@'
  );

  return sanitized;
}

/**
 * エラーメッセージから機密情報を削除する
 * スタックトレースも含めて安全な形式に変換
 *
 * @param error - エラーオブジェクトまたはメッセージ
 * @returns サニタイズされたエラーメッセージ
 */
export function sanitizeErrorMessage(error: unknown): string {
  // null, undefinedの場合は安全なメッセージを返す
  if (error === null || error === undefined) {
    return 'Unknown error';
  }

  let message: string;

  // Errorオブジェクトの場合
  if (error instanceof Error) {
    message = error.message;
    // スタックトレースは含めない（機密情報が含まれる可能性があるため）
  } else {
    // 文字列に変換
    message = String(error);
  }

  // 機密情報をマスク
  return sanitizeForLog(message);
}
