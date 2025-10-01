/**
 * スクリーンリーダー対応のためのユーティリティ
 */

/**
 * スクリーンリーダー専用テキストのクラス名
 */
export const SR_ONLY_CLASS = 'sr-only';

/**
 * フォーカス時に表示されるスクリーンリーダー専用テキストのクラス名
 */
export const SR_ONLY_FOCUSABLE_CLASS =
  'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50';

/**
 * ARIA属性のヘルパー関数
 */
export const ariaHelpers = {
  /**
   * 要素が展開されているかどうかを示すaria-expanded属性
   */
  expanded: (isExpanded: boolean) => ({
    'aria-expanded': isExpanded.toString(),
  }),

  /**
   * 要素が選択されているかどうかを示すaria-selected属性
   */
  selected: (isSelected: boolean) => ({
    'aria-selected': isSelected.toString(),
  }),

  /**
   * 要素が無効かどうかを示すaria-disabled属性
   */
  disabled: (isDisabled: boolean) => ({
    'aria-disabled': isDisabled.toString(),
  }),

  /**
   * 要素が必須かどうかを示すaria-required属性
   */
  required: (isRequired: boolean) => ({
    'aria-required': isRequired.toString(),
  }),

  /**
   * 要素が無効な入力かどうかを示すaria-invalid属性
   */
  invalid: (isInvalid: boolean) => ({
    'aria-invalid': isInvalid.toString(),
  }),

  /**
   * 要素が読み取り専用かどうかを示すaria-readonly属性
   */
  readonly: (isReadonly: boolean) => ({
    'aria-readonly': isReadonly.toString(),
  }),

  /**
   * 要素が隠されているかどうかを示すaria-hidden属性
   */
  hidden: (isHidden: boolean) => ({
    'aria-hidden': isHidden.toString(),
  }),

  /**
   * 要素の現在の値を示すaria-valuenow属性
   */
  valueNow: (value: number) => ({
    'aria-valuenow': value.toString(),
  }),

  /**
   * 要素の最小値を示すaria-valuemin属性
   */
  valueMin: (min: number) => ({
    'aria-valuemin': min.toString(),
  }),

  /**
   * 要素の最大値を示すaria-valuemax属性
   */
  valueMax: (max: number) => ({
    'aria-valuemax': max.toString(),
  }),

  /**
   * 要素の現在の値をテキストで示すaria-valuetext属性
   */
  valueText: (text: string) => ({
    'aria-valuetext': text,
  }),

  /**
   * 要素のレベルを示すaria-level属性
   */
  level: (level: number) => ({
    'aria-level': level.toString(),
  }),

  /**
   * 要素の位置を示すaria-posinset属性
   */
  posInSet: (position: number) => ({
    'aria-posinset': position.toString(),
  }),

  /**
   * セット内の要素数を示すaria-setsize属性
   */
  setSize: (size: number) => ({
    'aria-setsize': size.toString(),
  }),
};

/**
 * フォーム要素のARIA属性を生成
 */
export const getFormFieldAria = (options: {
  id: string;
  labelId?: string;
  describedBy?: string[];
  isRequired?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
}) => {
  const { id, labelId, describedBy, isRequired, isInvalid, isDisabled } = options;

  const attributes: Record<string, string> = {
    id,
  };

  if (labelId) {
    attributes['aria-labelledby'] = labelId;
  }

  if (describedBy && describedBy.length > 0) {
    attributes['aria-describedby'] = describedBy.join(' ');
  }

  if (isRequired) {
    attributes['aria-required'] = 'true';
  }

  if (isInvalid) {
    attributes['aria-invalid'] = 'true';
  }

  if (isDisabled) {
    attributes['aria-disabled'] = 'true';
  }

  return attributes;
};

/**
 * プログレスバーのARIA属性を生成
 */
export const getProgressAria = (options: {
  current: number;
  max: number;
  min?: number;
  label?: string;
}) => {
  const { current, max, min = 0, label } = options;

  const attributes: Record<string, string> = {
    role: 'progressbar',
    'aria-valuenow': current.toString(),
    'aria-valuemin': min.toString(),
    'aria-valuemax': max.toString(),
  };

  if (label) {
    attributes['aria-label'] = label;
  }

  // パーセンテージでの表示
  const percentage = Math.round((current / max) * 100);
  attributes['aria-valuetext'] = `${percentage}%`;

  return attributes;
};

/**
 * リストのARIA属性を生成
 */
export const getListAria = (options: {
  totalItems: number;
  currentIndex?: number;
  label?: string;
}) => {
  const { totalItems, currentIndex, label } = options;

  const attributes: Record<string, string> = {
    role: 'list',
  };

  if (label) {
    attributes['aria-label'] = label;
  }

  if (currentIndex !== undefined) {
    attributes['aria-activedescendant'] = `item-${currentIndex}`;
  }

  return {
    listAttributes: attributes,
    getItemAttributes: (index: number) => ({
      role: 'listitem',
      id: `item-${index}`,
      'aria-posinset': (index + 1).toString(),
      'aria-setsize': totalItems.toString(),
    }),
  };
};

/**
 * ダイアログのARIA属性を生成
 */
export const getDialogAria = (options: {
  titleId?: string;
  descriptionId?: string;
  isModal?: boolean;
}) => {
  const { titleId, descriptionId, isModal = true } = options;

  const attributes: Record<string, string> = {
    role: isModal ? 'dialog' : 'alertdialog',
    'aria-modal': isModal.toString(),
  };

  if (titleId) {
    attributes['aria-labelledby'] = titleId;
  }

  if (descriptionId) {
    attributes['aria-describedby'] = descriptionId;
  }

  return attributes;
};

/**
 * ライブリージョンのARIA属性を生成
 */
export const getLiveRegionAria = (options: {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: string[];
}) => {
  const { politeness = 'polite', atomic = true, relevant } = options;

  const attributes: Record<string, string> = {
    'aria-live': politeness,
    'aria-atomic': atomic.toString(),
  };

  if (relevant && relevant.length > 0) {
    attributes['aria-relevant'] = relevant.join(' ');
  }

  return attributes;
};

/**
 * スクリーンリーダー用のテキストを生成
 */
export const generateScreenReaderText = {
  /**
   * フィールドの状態を説明するテキスト
   */
  fieldStatus: (options: {
    fieldName: string;
    isRequired?: boolean;
    isInvalid?: boolean;
    errorMessage?: string;
    helpText?: string;
  }) => {
    const { fieldName, isRequired, isInvalid, errorMessage, helpText } = options;

    let text = fieldName;

    if (isRequired) {
      text += '（必須）';
    }

    if (helpText) {
      text += `。${helpText}`;
    }

    if (isInvalid && errorMessage) {
      text += `。エラー：${errorMessage}`;
    }

    return text;
  },

  /**
   * 文字数カウンターのテキスト
   */
  characterCount: (current: number, max: number) => {
    const remaining = max - current;
    if (remaining < 0) {
      return `文字数が${Math.abs(remaining)}文字超過しています。最大${max}文字です。`;
    } else if (remaining <= 10) {
      return `残り${remaining}文字です。`;
    } else {
      return `${current}文字入力済み。最大${max}文字です。`;
    }
  },

  /**
   * フォームの送信状態を説明するテキスト
   */
  formStatus: (status: 'idle' | 'submitting' | 'success' | 'error', errorMessage?: string) => {
    switch (status) {
      case 'submitting':
        return 'フォームを送信中です。しばらくお待ちください。';
      case 'success':
        return 'フォームが正常に送信されました。';
      case 'error':
        return `フォームの送信中にエラーが発生しました。${errorMessage || ''}`;
      default:
        return '';
    }
  },

  /**
   * バリデーション状態を説明するテキスト
   */
  validationStatus: (isValid: boolean, isValidating: boolean) => {
    if (isValidating) {
      return '入力内容を確認中です。';
    } else if (isValid) {
      return '入力内容は正常です。';
    } else {
      return '入力内容にエラーがあります。';
    }
  },
};

/**
 * キーボードショートカットの説明テキスト
 */
export const keyboardShortcuts = {
  navigation: [
    'Tab: 次の要素に移動',
    'Shift + Tab: 前の要素に移動',
    'Enter: ボタンを実行またはフォームを送信',
    'Space: チェックボックスやボタンを実行',
    'Escape: ダイアログを閉じる',
  ],
  form: ['Ctrl + Enter: フォームを送信', 'Ctrl + S: 下書きを保存', 'F6: フォーカス領域を切り替え'],
};

/**
 * スクリーンリーダー用のランドマーク
 */
export const landmarks = {
  main: { role: 'main', 'aria-label': 'メインコンテンツ' },
  navigation: { role: 'navigation', 'aria-label': 'ナビゲーション' },
  banner: { role: 'banner', 'aria-label': 'ヘッダー' },
  contentinfo: { role: 'contentinfo', 'aria-label': 'フッター' },
  search: { role: 'search', 'aria-label': '検索' },
  form: { role: 'form', 'aria-label': 'フォーム' },
};
