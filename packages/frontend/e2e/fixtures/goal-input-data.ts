export const validGoalData = {
  complete: {
    title: 'プログラミングスキルの向上',
    description:
      'フルスタック開発者として必要なスキルを身につけ、実際のプロジェクトで活用できるレベルまで到達する',
    deadline: '2024-12-31',
    background:
      '現在のスキルレベルでは複雑なプロジェクトに対応できないため、体系的にスキルアップを図りたい',
    constraints: '平日は仕事があるため、学習時間は平日2時間、休日4時間程度に限られる',
  },
  minimal: {
    title: 'ダイエット成功',
    description: '健康的な体重まで減量し、理想的な体型を手に入れる',
    deadline: '2024-06-30',
    background: '最近体重が増加傾向にあり、健康面での不安を感じている',
  },
  withoutConstraints: {
    title: '英語力向上',
    description: 'TOEIC800点以上を取得し、ビジネスレベルの英語力を身につける',
    deadline: '2024-09-30',
    background: 'グローバルな環境で働くために英語力が必要',
  },
};

export const invalidGoalData = {
  emptyTitle: {
    title: '',
    description: '目標説明',
    deadline: '2024-12-31',
    background: '背景',
  },
  emptyDescription: {
    title: '目標タイトル',
    description: '',
    deadline: '2024-12-31',
    background: '背景',
  },
  emptyDeadline: {
    title: '目標タイトル',
    description: '目標説明',
    deadline: '',
    background: '背景',
  },
  emptyBackground: {
    title: '目標タイトル',
    description: '目標説明',
    deadline: '2024-12-31',
    background: '',
  },
  pastDeadline: {
    title: '目標タイトル',
    description: '目標説明',
    deadline: '2020-01-01',
    background: '背景',
  },
  farFutureDeadline: {
    title: '目標タイトル',
    description: '目標説明',
    deadline: '2030-01-01',
    background: '背景',
  },
  longTitle: {
    title: 'a'.repeat(101), // 100文字制限を超える
    description: '目標説明',
    deadline: '2024-12-31',
    background: '背景',
  },
  longDescription: {
    title: '目標タイトル',
    description: 'a'.repeat(1001), // 1000文字制限を超える
    deadline: '2024-12-31',
    background: '背景',
  },
  longBackground: {
    title: '目標タイトル',
    description: '目標説明',
    deadline: '2024-12-31',
    background: 'a'.repeat(501), // 500文字制限を超える
  },
  longConstraints: {
    title: '目標タイトル',
    description: '目標説明',
    deadline: '2024-12-31',
    background: '背景',
    constraints: 'a'.repeat(501), // 500文字制限を超える
  },
};

export const characterLimitData = {
  title: {
    warning: 'a'.repeat(80), // 80文字（80%）
    limit: 'a'.repeat(100), // 100文字（制限値）
    over: 'a'.repeat(101), // 101文字（制限超過）
  },
  description: {
    warning: 'a'.repeat(800), // 800文字（80%）
    limit: 'a'.repeat(1000), // 1000文字（制限値）
    over: 'a'.repeat(1001), // 1001文字（制限超過）
  },
  background: {
    warning: 'a'.repeat(400), // 400文字（80%）
    limit: 'a'.repeat(500), // 500文字（制限値）
    over: 'a'.repeat(501), // 501文字（制限超過）
  },
  constraints: {
    warning: 'a'.repeat(400), // 400文字（80%）
    limit: 'a'.repeat(500), // 500文字（制限値）
    over: 'a'.repeat(501), // 501文字（制限超過）
  },
};

export const draftData = {
  partial: {
    title: '下書きタイトル',
    description: '下書き説明',
  },
  complete: {
    title: '完全な下書きタイトル',
    description: '完全な下書き説明',
    deadline: '2024-12-31',
    background: '下書き背景',
    constraints: '下書き制約事項',
  },
};

export const errorMessages = {
  requiredTitle: '目標タイトルは必須です',
  requiredDescription: '目標説明は必須です',
  requiredDeadline: '達成期限は必須です',
  requiredBackground: '背景は必須です',
  titleTooLong: '目標タイトルは100文字以内で入力してください',
  descriptionTooLong: '目標説明は1000文字以内で入力してください',
  backgroundTooLong: '背景は500文字以内で入力してください',
  constraintsTooLong: '制約事項は500文字以内で入力してください',
  pastDeadline: '達成期限は今日以降の日付を選択してください',
  farFutureDeadline: '達成期限は1年以内の日付を選択してください',
  invalidDate: '有効な日付を入力してください',
  networkError: 'ネットワークエラーが発生しました',
  serverError: 'サーバーエラーが発生しました',
};

export const successMessages = {
  draftSaved: '下書きを保存しました',
  draftRestored: '下書きが復元されました',
  goalSubmitted: '目標を送信しました',
  aiProcessingStarted: 'AI処理を開始しました',
};

export const dateFormats = {
  valid: ['2024-12-31', '2024-06-15', '2024-01-01'],
  invalid: [
    '2024-13-01', // 無効な月
    '2024-02-30', // 無効な日
    '2024/12/31', // 無効な形式
    'invalid-date',
  ],
};

export const responsiveBreakpoints = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  largeDesktop: { width: 1440, height: 900 },
};
