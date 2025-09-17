import React, { useState, useEffect, useCallback } from 'react';
import {
  Goal,
  SubGoal,
  Action,
  CellData,
  GridData,
  Position,
  GoalStatus,
  ActionType,
} from '../../types';
import { generateGridData, validateGridData } from '../../utils/mandala';
import MandalaGrid from './MandalaGrid';
import './MandalaChart.css';

interface MandalaChartProps {
  goalId: string;
  editable?: boolean;
  onCellClick?: (cellData: CellData) => void;
  onCellEdit?: (cellData: CellData) => void;
  className?: string;
}

interface MandalaChartState {
  goal: Goal | null;
  subGoals: SubGoal[];
  actions: Action[];
  loading: boolean;
  error: string | null;
}

const MandalaChart: React.FC<MandalaChartProps> = ({
  goalId,
  editable = false,
  onCellClick,
  onCellEdit,
  className,
}) => {
  const [state, setState] = useState<MandalaChartState>({
    goal: null,
    subGoals: [],
    actions: [],
    loading: true,
    error: null,
  });

  const [gridData, setGridData] = useState<GridData | null>(null);

  // Mock data for development - replace with actual API calls
  useEffect(() => {
    const loadMockData = () => {
      try {
        const mockGoal: Goal = {
          id: goalId,
          title: '年収1000万円達成',
          description: '2024年末までに年収1000万円を達成する',
          deadline: new Date('2024-12-31'),
          progress: 45,
          status: GoalStatus.ACTIVE,
        };

        const mockSubGoals: SubGoal[] = [
          {
            id: '1',
            goal_id: goalId,
            title: 'スキルアップ',
            description: '技術力向上',
            position: 0,
            progress: 60,
          },
          {
            id: '2',
            goal_id: goalId,
            title: '副業開始',
            description: '収入源の多様化',
            position: 1,
            progress: 30,
          },
          {
            id: '3',
            goal_id: goalId,
            title: '転職活動',
            description: '高収入企業への転職',
            position: 2,
            progress: 20,
          },
          {
            id: '4',
            goal_id: goalId,
            title: '資格取得',
            description: '専門資格の取得',
            position: 3,
            progress: 80,
          },
          {
            id: '5',
            goal_id: goalId,
            title: 'ネットワーク構築',
            description: '人脈の拡大',
            position: 4,
            progress: 40,
          },
          {
            id: '6',
            goal_id: goalId,
            title: '投資学習',
            description: '資産運用の知識習得',
            position: 5,
            progress: 25,
          },
          {
            id: '7',
            goal_id: goalId,
            title: '健康管理',
            description: '体調管理の徹底',
            position: 6,
            progress: 70,
          },
          {
            id: '8',
            goal_id: goalId,
            title: '時間管理',
            description: '効率的な時間活用',
            position: 7,
            progress: 55,
          },
        ];

        const mockActions: Action[] = [
          // スキルアップのアクション
          {
            id: 'a1',
            sub_goal_id: '1',
            title: 'React学習',
            description: '',
            type: ActionType.EXECUTION,
            position: 0,
            progress: 80,
          },
          {
            id: 'a2',
            sub_goal_id: '1',
            title: 'AWS資格勉強',
            description: '',
            type: ActionType.EXECUTION,
            position: 1,
            progress: 60,
          },
          {
            id: 'a3',
            sub_goal_id: '1',
            title: '毎日コーディング',
            description: '',
            type: ActionType.HABIT,
            position: 2,
            progress: 90,
          },
          {
            id: 'a4',
            sub_goal_id: '1',
            title: 'OSS貢献',
            description: '',
            type: ActionType.EXECUTION,
            position: 3,
            progress: 30,
          },
          {
            id: 'a5',
            sub_goal_id: '1',
            title: '技術書読書',
            description: '',
            type: ActionType.HABIT,
            position: 4,
            progress: 70,
          },
          {
            id: 'a6',
            sub_goal_id: '1',
            title: '勉強会参加',
            description: '',
            type: ActionType.EXECUTION,
            position: 5,
            progress: 40,
          },
          {
            id: 'a7',
            sub_goal_id: '1',
            title: 'ブログ執筆',
            description: '',
            type: ActionType.HABIT,
            position: 6,
            progress: 50,
          },
          {
            id: 'a8',
            sub_goal_id: '1',
            title: 'ポートフォリオ作成',
            description: '',
            type: ActionType.EXECUTION,
            position: 7,
            progress: 20,
          },
        ];

        setState({
          goal: mockGoal,
          subGoals: mockSubGoals,
          actions: mockActions,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : '不明なエラーが発生しました',
        }));
      }
    };

    loadMockData();
  }, [goalId]);

  useEffect(() => {
    if (state.goal && state.subGoals.length > 0) {
      const data = generateGridData(state.goal, state.subGoals, state.actions);
      const validation = validateGridData(data);

      if (validation.isValid) {
        setGridData(data);
      } else {
        setState(prev => ({
          ...prev,
          error: validation.errors.join(', '),
        }));
      }
    }
  }, [state.goal, state.subGoals, state.actions]);

  const handleCellClick = useCallback(
    (cellData: CellData) => {
      onCellClick?.(cellData);
    },
    [onCellClick]
  );

  const handleCellEdit = useCallback(
    (cellData: CellData) => {
      onCellEdit?.(cellData);
    },
    [onCellEdit]
  );

  const handleCellDrag = useCallback((from: Position, to: Position) => {
    // TODO: Implement drag and drop logic
    console.log('Drag from', from, 'to', to);
  }, []);

  if (state.loading) {
    return (
      <div className={`mandala-chart loading ${className || ''}`}>
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`mandala-chart error ${className || ''}`}>
        <div className="error-message">
          <h3>エラーが発生しました</h3>
          <p>{state.error}</p>
        </div>
      </div>
    );
  }

  if (!gridData) {
    return (
      <div className={`mandala-chart empty ${className || ''}`}>
        <div className="empty-message">マンダラチャートデータがありません</div>
      </div>
    );
  }

  return (
    <div className={`mandala-chart ${className || ''}`}>
      <div className="mandala-header">
        <h2>{state.goal?.title}</h2>
        <div className="mandala-progress">全体進捗: {state.goal?.progress}%</div>
      </div>
      <MandalaGrid
        gridData={gridData}
        editable={editable}
        onCellClick={handleCellClick}
        onCellEdit={handleCellEdit}
        onCellDrag={handleCellDrag}
      />
    </div>
  );
};

export default MandalaChart;
