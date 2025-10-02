import { Goal, SubGoal, Action, GridData, CellData, Position } from '../types';
import { ValidationResult } from '../types/validation';

export const generateGridData = (goal: Goal, subGoals: SubGoal[], actions: Action[]): GridData => {
  const cells: CellData[][] = Array(9)
    .fill(null)
    .map(() =>
      Array(9)
        .fill(null)
        .map(() => ({
          id: '',
          type: 'empty' as const,
          title: '',
          progress: 0,
          position: { row: 0, col: 0 },
        }))
    );

  // 中央に目標を配置
  cells[4][4] = {
    id: goal.id,
    type: 'goal',
    title: goal.title,
    description: goal.description,
    progress: goal.progress,
    deadline: goal.deadline,
    position: { row: 4, col: 4 },
  };

  // サブ目標を配置
  const subGoalPositions: Position[] = [
    { row: 1, col: 4 }, // 上
    { row: 1, col: 7 }, // 右上
    { row: 4, col: 7 }, // 右
    { row: 7, col: 7 }, // 右下
    { row: 7, col: 4 }, // 下
    { row: 7, col: 1 }, // 左下
    { row: 4, col: 1 }, // 左
    { row: 1, col: 1 }, // 左上
  ];

  subGoals.forEach((subGoal, index) => {
    if (index < 8) {
      const pos = subGoalPositions[index];
      cells[pos.row][pos.col] = {
        id: subGoal.id,
        type: 'subgoal',
        title: subGoal.title,
        description: subGoal.description,
        progress: subGoal.progress,
        position: pos,
      };
    }
  });

  // アクションを配置
  subGoals.forEach((subGoal, subGoalIndex) => {
    const subGoalActions = actions.filter(action => action.sub_goal_id === subGoal.id);
    const blockPositions = getBlockPositions(subGoalIndex);

    subGoalActions.forEach((action, actionIndex) => {
      if (actionIndex < 8) {
        const pos = blockPositions[actionIndex];
        cells[pos.row][pos.col] = {
          id: action.id,
          type: 'action',
          title: action.title,
          description: action.description,
          progress: action.progress,
          status: action.type,
          position: pos,
        };
      }
    });
  });

  return { goal, cells };
};

const getBlockPositions = (blockIndex: number): Position[] => {
  const blockConfigs: Position[][] = [
    // 上ブロック (0-2, 3-5)
    [
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 0, col: 5 },
      { row: 1, col: 3 },
      { row: 1, col: 5 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ],
    // 右上ブロック (0-2, 6-8)
    [
      { row: 0, col: 6 },
      { row: 0, col: 7 },
      { row: 0, col: 8 },
      { row: 1, col: 6 },
      { row: 1, col: 8 },
      { row: 2, col: 6 },
      { row: 2, col: 7 },
      { row: 2, col: 8 },
    ],
    // 右ブロック (3-5, 6-8)
    [
      { row: 3, col: 6 },
      { row: 3, col: 7 },
      { row: 3, col: 8 },
      { row: 4, col: 6 },
      { row: 4, col: 8 },
      { row: 5, col: 6 },
      { row: 5, col: 7 },
      { row: 5, col: 8 },
    ],
    // 右下ブロック (6-8, 6-8)
    [
      { row: 6, col: 6 },
      { row: 6, col: 7 },
      { row: 6, col: 8 },
      { row: 7, col: 6 },
      { row: 7, col: 8 },
      { row: 8, col: 6 },
      { row: 8, col: 7 },
      { row: 8, col: 8 },
    ],
    // 下ブロック (6-8, 3-5)
    [
      { row: 6, col: 3 },
      { row: 6, col: 4 },
      { row: 6, col: 5 },
      { row: 7, col: 3 },
      { row: 7, col: 5 },
      { row: 8, col: 3 },
      { row: 8, col: 4 },
      { row: 8, col: 5 },
    ],
    // 左下ブロック (6-8, 0-2)
    [
      { row: 6, col: 0 },
      { row: 6, col: 1 },
      { row: 6, col: 2 },
      { row: 7, col: 0 },
      { row: 7, col: 2 },
      { row: 8, col: 0 },
      { row: 8, col: 1 },
      { row: 8, col: 2 },
    ],
    // 左ブロック (3-5, 0-2)
    [
      { row: 3, col: 0 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 4, col: 0 },
      { row: 4, col: 2 },
      { row: 5, col: 0 },
      { row: 5, col: 1 },
      { row: 5, col: 2 },
    ],
    // 左上ブロック (0-2, 0-2)
    [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  ];

  return blockConfigs[blockIndex] || [];
};

export const validateGridData = (gridData: GridData): ValidationResult => {
  const errors: string[] = [];

  // 目標の存在確認
  if (!gridData.goal) {
    errors.push('目標データが存在しません');
  }

  // セルデータの整合性確認
  const { cells } = gridData;
  if (!cells || cells.length !== 9 || cells.some(row => row.length !== 9)) {
    errors.push('グリッドデータの構造が不正です');
  }

  // 中央セルの確認
  if (!cells[4][4] || cells[4][4].type !== 'goal') {
    errors.push('中央セルに目標が配置されていません');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
