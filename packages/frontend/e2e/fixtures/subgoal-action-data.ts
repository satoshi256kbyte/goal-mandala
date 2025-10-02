export const validSubGoalData = {
  complete: {
    title: 'プログラミング基礎スキル習得',
    description:
      'HTML、CSS、JavaScriptの基礎を理解し、簡単なWebサイトを作成できるレベルまで到達する',
    background:
      'フルスタック開発者になるための第一歩として、フロントエンド技術の基礎を固める必要がある',
    constraints: '平日は2時間、休日は4時間程度の学習時間に限られる',
  },
  minimal: {
    title: 'データベース設計スキル',
    description: 'リレーショナルデータベースの設計原則を理解し、正規化されたスキーマを作成できる',
    background: 'バックエンド開発において、適切なデータベース設計は必須のスキル',
  },
  withoutConstraints: {
    title: 'API開発スキル',
    description: 'RESTful APIの設計・実装ができ、適切なHTTPステータスコードを使い分けられる',
    background: 'モダンなWebアプリケーション開発において、API設計は重要な要素',
  },
};

export const validActionData = {
  execution: {
    title: 'React基礎チュートリアル完了',
    description: '公式のReactチュートリアルを完了し、コンポーネントの基本概念を理解する',
    background: 'モダンなフロントエンド開発において、Reactは必須の技術',
    type: 'execution' as const,
    constraints: '1週間以内に完了する',
  },
  habit: {
    title: '毎日1時間のコーディング練習',
    description: 'LeetCodeやAtCoderなどのプラットフォームでアルゴリズム問題を解く',
    background: 'プログラミングスキルの向上には継続的な練習が必要',
    type: 'habit' as const,
    constraints: '平日のみ実施、休日は休む',
  },
  withoutConstraints: {
    title: 'TypeScript学習',
    description: 'TypeScriptの型システムを理解し、型安全なコードを書けるようになる',
    background: '大規模なアプリケーション開発において、TypeScriptは重要',
    type: 'execution' as const,
  },
};

export const invalidSubGoalData = {
  emptyTitle: {
    title: '',
    description: 'サブ目標説明',
    background: '背景',
  },
  emptyDescription: {
    title: 'サブ目標タイトル',
    description: '',
    background: '背景',
  },
  emptyBackground: {
    title: 'サブ目標タイトル',
    description: 'サブ目標説明',
    background: '',
  },
  longTitle: {
    title: 'a'.repeat(101), // 100文字制限を超える
    description: 'サブ目標説明',
    background: '背景',
  },
  longDescription: {
    title: 'サブ目標タイトル',
    description: 'a'.repeat(501), // 500文字制限を超える
    background: '背景',
  },
  longBackground: {
    title: 'サブ目標タイトル',
    description: 'サブ目標説明',
    background: 'a'.repeat(501), // 500文字制限を超える
  },
  longConstraints: {
    title: 'サブ目標タイトル',
    description: 'サブ目標説明',
    background: '背景',
    constraints: 'a'.repeat(301), // 300文字制限を超える
  },
};

export const invalidActionData = {
  emptyTitle: {
    title: '',
    description: 'アクション説明',
    background: '背景',
    type: 'execution' as const,
  },
  emptyDescription: {
    title: 'アクションタイトル',
    description: '',
    background: '背景',
    type: 'execution' as const,
  },
  emptyBackground: {
    title: 'アクションタイトル',
    description: 'アクション説明',
    background: '',
    type: 'execution' as const,
  },
  longTitle: {
    title: 'a'.repeat(101), // 100文字制限を超える
    description: 'アクション説明',
    background: '背景',
    type: 'execution' as const,
  },
  longDescription: {
    title: 'アクションタイトル',
    description: 'a'.repeat(501), // 500文字制限を超える
    background: '背景',
    type: 'execution' as const,
  },
  longBackground: {
    title: 'アクションタイトル',
    description: 'アクション説明',
    background: 'a'.repeat(501), // 500文字制限を超える
    type: 'execution' as const,
  },
  longConstraints: {
    title: 'アクションタイトル',
    description: 'アクション説明',
    background: '背景',
    type: 'execution' as const,
    constraints: 'a'.repeat(301), // 300文字制限を超える
  },
};

export const characterLimitData = {
  subGoal: {
    title: {
      warning: 'a'.repeat(80), // 80文字（80%）
      limit: 'a'.repeat(100), // 100文字（制限値）
      over: 'a'.repeat(101), // 101文字（制限超過）
    },
    description: {
      warning: 'a'.repeat(400), // 400文字（80%）
      limit: 'a'.repeat(500), // 500文字（制限値）
      over: 'a'.repeat(501), // 501文字（制限超過）
    },
    background: {
      warning: 'a'.repeat(400), // 400文字（80%）
      limit: 'a'.repeat(500), // 500文字（制限値）
      over: 'a'.repeat(501), // 501文字（制限超過）
    },
    constraints: {
      warning: 'a'.repeat(240), // 240文字（80%）
      limit: 'a'.repeat(300), // 300文字（制限値）
      over: 'a'.repeat(301), // 301文字（制限超過）
    },
  },
  action: {
    title: {
      warning: 'a'.repeat(80), // 80文字（80%）
      limit: 'a'.repeat(100), // 100文字（制限値）
      over: 'a'.repeat(101), // 101文字（制限超過）
    },
    description: {
      warning: 'a'.repeat(400), // 400文字（80%）
      limit: 'a'.repeat(500), // 500文字（制限値）
      over: 'a'.repeat(501), // 501文字（制限超過）
    },
    background: {
      warning: 'a'.repeat(400), // 400文字（80%）
      limit: 'a'.repeat(500), // 500文字（制限値）
      over: 'a'.repeat(501), // 501文字（制限超過）
    },
    constraints: {
      warning: 'a'.repeat(240), // 240文字（80%）
      limit: 'a'.repeat(300), // 300文字（制限値）
      over: 'a'.repeat(301), // 301文字（制限超過）
    },
  },
};

export const draftData = {
  subGoal: {
    partial: {
      title: '下書きサブ目標',
      description: '下書きサブ目標説明',
    },
    complete: {
      title: '完全な下書きサブ目標',
      description: '完全な下書きサブ目標説明',
      background: '下書きサブ目標背景',
      constraints: '下書きサブ目標制約事項',
    },
  },
  action: {
    partial: {
      title: '下書きアクション',
      description: '下書きアクション説明',
      type: 'execution' as const,
    },
    complete: {
      title: '完全な下書きアクション',
      description: '完全な下書きアクション説明',
      background: '下書きアクション背景',
      type: 'habit' as const,
      constraints: '下書きアクション制約事項',
    },
  },
};

export const bulkEditData = {
  commonFields: {
    background: '一括編集で設定された共通背景',
    constraints: '一括編集で設定された共通制約事項',
  },
  multipleSubGoals: [
    {
      title: '一括編集対象サブ目標1',
      description: '一括編集対象サブ目標1の説明',
      background: '個別背景1',
    },
    {
      title: '一括編集対象サブ目標2',
      description: '一括編集対象サブ目標2の説明',
      background: '個別背景2',
    },
    {
      title: '一括編集対象サブ目標3',
      description: '一括編集対象サブ目標3の説明',
      background: '個別背景3',
    },
  ],
  multipleActions: [
    {
      title: '一括編集対象アクション1',
      description: '一括編集対象アクション1の説明',
      background: '個別背景1',
      type: 'execution' as const,
    },
    {
      title: '一括編集対象アクション2',
      description: '一括編集対象アクション2の説明',
      background: '個別背景2',
      type: 'habit' as const,
    },
    {
      title: '一括編集対象アクション3',
      description: '一括編集対象アクション3の説明',
      background: '個別背景3',
      type: 'execution' as const,
    },
  ],
};

export const dragDropData = {
  subGoals: [
    { index: 0, title: 'サブ目標1', position: 0 },
    { index: 1, title: 'サブ目標2', position: 1 },
    { index: 2, title: 'サブ目標3', position: 2 },
    { index: 3, title: 'サブ目標4', position: 3 },
    { index: 4, title: 'サブ目標5', position: 4 },
    { index: 5, title: 'サブ目標6', position: 5 },
    { index: 6, title: 'サブ目標7', position: 6 },
    { index: 7, title: 'サブ目標8', position: 7 },
  ],
  actions: [
    { subGoalIndex: 0, actionIndex: 0, title: 'アクション1-1', position: 0 },
    { subGoalIndex: 0, actionIndex: 1, title: 'アクション1-2', position: 1 },
    { subGoalIndex: 0, actionIndex: 2, title: 'アクション1-3', position: 2 },
    { subGoalIndex: 0, actionIndex: 3, title: 'アクション1-4', position: 3 },
    { subGoalIndex: 0, actionIndex: 4, title: 'アクション1-5', position: 4 },
    { subGoalIndex: 0, actionIndex: 5, title: 'アクション1-6', position: 5 },
    { subGoalIndex: 0, actionIndex: 6, title: 'アクション1-7', position: 6 },
    { subGoalIndex: 0, actionIndex: 7, title: 'アクション1-8', position: 7 },
  ],
};

export const errorMessages = {
  subGoal: {
    requiredTitle: 'サブ目標タイトルは必須です',
    requiredDescription: 'サブ目標説明は必須です',
    requiredBackground: 'サブ目標背景は必須です',
    titleTooLong: 'サブ目標タイトルは100文字以内で入力してください',
    descriptionTooLong: 'サブ目標説明は500文字以内で入力してください',
    backgroundTooLong: 'サブ目標背景は500文字以内で入力してください',
    constraintsTooLong: 'サブ目標制約事項は300文字以内で入力してください',
  },
  action: {
    requiredTitle: 'アクションタイトルは必須です',
    requiredDescription: 'アクション説明は必須です',
    requiredBackground: 'アクション背景は必須です',
    requiredType: 'アクション種別は必須です',
    titleTooLong: 'アクションタイトルは100文字以内で入力してください',
    descriptionTooLong: 'アクション説明は500文字以内で入力してください',
    backgroundTooLong: 'アクション背景は500文字以内で入力してください',
    constraintsTooLong: 'アクション制約事項は300文字以内で入力してください',
  },
  general: {
    networkError: 'ネットワークエラーが発生しました',
    serverError: 'サーバーエラーが発生しました',
    unsavedChanges: '未保存の変更があります。ページを離れますか？',
    deleteConfirmation: '選択した項目を削除しますか？この操作は取り消せません。',
  },
};

export const successMessages = {
  subGoal: {
    saved: 'サブ目標を保存しました',
    regenerated: 'サブ目標を再生成しました',
    bulkEdited: 'サブ目標を一括編集しました',
    deleted: 'サブ目標を削除しました',
  },
  action: {
    saved: 'アクションを保存しました',
    bulkEdited: 'アクションを一括編集しました',
    deleted: 'アクションを削除しました',
  },
  general: {
    draftSaved: '下書きを保存しました',
    draftRestored: '下書きが復元されました',
    autoSaved: '自動保存しました',
    dragDropCompleted: '並び替えを保存しました',
  },
};

export const responsiveBreakpoints = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  largeDesktop: { width: 1440, height: 900 },
};

export const mockApiData = {
  subGoals: Array.from({ length: 8 }, (_, index) => ({
    id: `subgoal-${index + 1}`,
    title: `サブ目標${index + 1}`,
    description: `サブ目標${index + 1}の説明`,
    background: `サブ目標${index + 1}の背景`,
    constraints: index % 2 === 0 ? `サブ目標${index + 1}の制約事項` : undefined,
    position: index,
    progress: Math.floor(Math.random() * 100),
  })),
  actions: Array.from({ length: 64 }, (_, index) => {
    const subGoalIndex = Math.floor(index / 8);
    const actionIndex = index % 8;
    return {
      id: `action-${subGoalIndex}-${actionIndex}`,
      subGoalId: `subgoal-${subGoalIndex + 1}`,
      title: `アクション${subGoalIndex + 1}-${actionIndex + 1}`,
      description: `アクション${subGoalIndex + 1}-${actionIndex + 1}の説明`,
      background: `アクション${subGoalIndex + 1}-${actionIndex + 1}の背景`,
      constraints:
        index % 3 === 0 ? `アクション${subGoalIndex + 1}-${actionIndex + 1}の制約事項` : undefined,
      type: index % 2 === 0 ? 'execution' : 'habit',
      position: actionIndex,
      progress: Math.floor(Math.random() * 100),
    };
  }),
};
