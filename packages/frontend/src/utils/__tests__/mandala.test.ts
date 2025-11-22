import { generateGridData } from '../mandala';
import { Goal, SubGoal, Action, GoalStatus } from '../../types';

describe('mandala utilities', () => {
  const mockGoal: Goal = {
    id: 'goal-1',
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: new Date('2024-12-31'),
    progress: 50,
    status: GoalStatus.ACTIVE,
  };

  const mockSubGoals: SubGoal[] = [
    {
      id: 'sub-1',
      goal_id: 'goal-1',
      title: 'サブ目標1',
      description: '',
      position: 0,
      progress: 60,
    },
    {
      id: 'sub-2',
      goal_id: 'goal-1',
      title: 'サブ目標2',
      description: '',
      position: 1,
      progress: 40,
    },
    {
      id: 'sub-3',
      goal_id: 'goal-1',
      title: 'サブ目標3',
      description: '',
      position: 2,
      progress: 30,
    },
    {
      id: 'sub-4',
      goal_id: 'goal-1',
      title: 'サブ目標4',
      description: '',
      position: 3,
      progress: 70,
    },
    {
      id: 'sub-5',
      goal_id: 'goal-1',
      title: 'サブ目標5',
      description: '',
      position: 4,
      progress: 20,
    },
    {
      id: 'sub-6',
      goal_id: 'goal-1',
      title: 'サブ目標6',
      description: '',
      position: 5,
      progress: 80,
    },
    {
      id: 'sub-7',
      goal_id: 'goal-1',
      title: 'サブ目標7',
      description: '',
      position: 6,
      progress: 90,
    },
    {
      id: 'sub-8',
      goal_id: 'goal-1',
      title: 'サブ目標8',
      description: '',
      position: 7,
      progress: 10,
    },
  ];

  const mockActions: Action[] = [
    {
      id: 'action-1',
      sub_goal_id: 'sub-1',
      title: 'アクション1',
      description: '',
      type: ActionType.EXECUTION,
      position: 0,
      progress: 50,
    },
    {
      id: 'action-2',
      sub_goal_id: 'sub-1',
      title: 'アクション2',
      description: '',
      type: ActionType.HABIT,
      position: 1,
      progress: 75,
    },
  ];

  describe('generateGridData', () => {
    it('正しい9×9グリッドを生成する', () => {
      const gridData = generateGridData(mockGoal, mockSubGoals, mockActions);

      expect(gridData.cells).toHaveLength(9);
      expect(gridData.cells[0]).toHaveLength(9);
      expect(gridData.goal).toEqual(mockGoal);
    });

    it('中央セルに目標が配置される', () => {
      const gridData = generateGridData(mockGoal, mockSubGoals, mockActions);
      const centerCell = gridData.cells[4][4];

      expect(centerCell.type).toBe('goal');
      expect(centerCell.title).toBe('テスト目標');
      expect(centerCell.id).toBe('goal-1');
    });

    it('サブ目標が正しい位置に配置される', () => {
      const gridData = generateGridData(mockGoal, mockSubGoals, mockActions);

      // 上の位置 (1,4)
      const topCell = gridData.cells[1][4];
      expect(topCell.type).toBe('subgoal');
      expect(topCell.title).toBe('サブ目標1');

      // 右上の位置 (1,7)
      const topRightCell = gridData.cells[1][7];
      expect(topRightCell.type).toBe('subgoal');
      expect(topRightCell.title).toBe('サブ目標2');
    });

    it('アクションが適切なブロックに配置される', () => {
      const gridData = generateGridData(mockGoal, mockSubGoals, mockActions);

      // 最初のサブ目標のアクションを確認
      let actionCount = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 3; col < 6; col++) {
          if (row === 1 && col === 4) continue; // サブ目標の位置をスキップ
          const cell = gridData.cells[row][col];
          if (cell.type === 'action') {
            actionCount++;
          }
        }
      }

      expect(actionCount).toBeGreaterThan(0);
    });

    it('空のセルが適切に処理される', () => {
      const gridData = generateGridData(mockGoal, [], []);

      // 中央以外のセルは空になるはず
      let emptyCellCount = 0;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (row === 4 && col === 4) continue; // 中央セルをスキップ
          const cell = gridData.cells[row][col];
          if (cell.type === 'empty') {
            emptyCellCount++;
          }
        }
      }

      expect(emptyCellCount).toBe(80); // 81 - 1 (中央セル)
    });
  });

  describe('validateGridData', () => {
    it('有効なグリッドデータを正しく検証する', () => {
      const gridData = generateGridData(mockGoal, mockSubGoals, mockActions);
      const result = validateGridData(gridData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('目標が存在しない場合にエラーを返す', () => {
      const invalidGridData = {
        goal: null as any,
        cells: Array(9)
          .fill(null)
          .map(() => Array(9).fill(null)),
      };

      const result = validateGridData(invalidGridData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('目標データが存在しません');
    });

    it('グリッド構造が不正な場合にエラーを返す', () => {
      const invalidGridData = {
        goal: mockGoal,
        cells: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)), // 8×8の不正なグリッド
      };

      const result = validateGridData(invalidGridData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('グリッドデータの構造が不正です');
    });

    it('中央セルに目標が配置されていない場合にエラーを返す', () => {
      const gridData = generateGridData(mockGoal, mockSubGoals, mockActions);
      // 中央セルを空にする
      gridData.cells[4][4] = {
        id: '',
        type: 'empty',
        title: '',
        progress: 0,
        position: { row: 4, col: 4 },
      };

      const result = validateGridData(gridData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('中央セルに目標が配置されていません');
    });
  });
});
