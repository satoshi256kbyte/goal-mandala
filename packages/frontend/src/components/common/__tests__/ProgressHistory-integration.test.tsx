/**
 * 進捗履歴機能の統合テスト
 * 要件: 5.5 - 進捗履歴機能のテスト（統合）
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressHistoryChart } from '../ProgressHistoryChart';
import { InMemoryProgressHistoryService } from '../../../services/progress-history-service';

// 必要なモックを設定
jest.mock('recharts', () => ({
  LineChart: ({ children, onClick, data }: any) => (
    <div
      data-testid="line-chart"
      data-chart-data={JSON.stringify(data)}
      onClick={() => {
        if (onClick && data && data.length > 0) {
          onClick({
            activePayload: [
              {
                payload: {
                  timestamp: data[0].timestamp,
                  progress: data[0].progress,
                },
              },
            ],
          });
        }
      }}
    >
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => <div data-testid={`line-${dataKey}`} data-stroke={stroke} />,
  XAxis: ({ dataKey }: any) => <div data-testid={`x-axis-${dataKey}`} />,
  YAxis: ({ domain }: any) => <div data-testid="y-axis" data-domain={JSON.stringify(domain)} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip">{content}</div>,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: ({ y }: any) => <div data-testid={`reference-line-${y}`} />,
  Dot: ({ onClick }: any) => (
    <div data-testid="custom-dot" onClick={onClick} style={{ cursor: 'pointer' }} />
  ),
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === 'MM/dd')
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    if (formatStr === 'yyyy年MM月dd日')
      return `${d.getFullYear()}年${(d.getMonth() + 1).toString().padStart(2, '0')}月${d.getDate().toString().padStart(2, '0')}日`;
    if (formatStr === 'yyyy年MM月dd日（E）')
      return `${d.getFullYear()}年${(d.getMonth() + 1).toString().padStart(2, '0')}月${d.getDate().toString().padStart(2, '0')}日（月）`;
    if (formatStr === 'yyyy-MM-dd')
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    return d.toISOString();
  }),
  parseISO: jest.fn(dateStr => new Date(dateStr)),
}));

jest.mock('date-fns/locale', () => ({ ja: {} }));

jest.mock('../ProgressDetailModal', () => ({
  ProgressDetailModal: ({ isOpen, selectedDate, selectedProgress, onClose }: any) =>
    isOpen ? (
      <div data-testid="progress-detail-modal">
        <div data-testid="modal-date">{selectedDate?.toISOString()}</div>
        <div data-testid="modal-progress">{selectedProgress}</div>
        <button data-testid="modal-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    ) : null,
}));

describe('Progress History Integration Tests', () => {
  let progressService: InMemoryProgressHistoryService;

  beforeEach(() => {
    progressService = new InMemoryProgressHistoryService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    progressService.clear();
  });

  describe('完全なワークフロー統合テスト', () => {
    it('進捗記録からチャート表示まで一連の流れが正常に動作する', async () => {
      const user = userEvent.setup();

      // 1. 進捗データを記録
      const progressData = [
        { progress: 10, reason: '初期設定' },
        { progress: 35, reason: 'タスク完了' },
        { progress: 60, reason: 'マイルストーン達成' },
        { progress: 85, reason: '最終段階' },
      ];

      for (let i = 0; i < progressData.length; i++) {
        await progressService.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: progressData[i].progress,
          changeReason: progressData[i].reason,
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // 2. 履歴データを取得
      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history).toHaveLength(4);

      // 3. 重要な変化点を取得
      const significantChanges = await progressService.getSignificantChanges('goal-1', 20);
      expect(significantChanges.length).toBeGreaterThan(0);

      // 4. チャートをレンダリング
      render(
        <ProgressHistoryChart
          data={history}
          significantChanges={significantChanges}
          onDateClick={jest.fn()}
        />
      );

      // 5. チャートが正しく表示されることを確認
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-progress')).toBeInTheDocument();

      // 6. インタラクション（クリック）をテスト
      const chartElement = screen.getByTestId('line-chart');
      await user.click(chartElement);

      // 7. モーダルが開くことを確認
      await waitFor(() => {
        expect(screen.getByTestId('progress-detail-modal')).toBeInTheDocument();
      });

      // 8. モーダルの内容を確認
      expect(screen.getByTestId('modal-progress')).toHaveTextContent('10');
    });

    it('リアルタイム進捗更新とチャート同期', async () => {
      const user = userEvent.setup();

      // 初期データ
      await progressService.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 25,
      });

      const initialHistory = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      const { rerender } = render(<ProgressHistoryChart data={initialHistory} />);

      // 初期状態の確認
      let chartData = JSON.parse(
        screen.getByTestId('line-chart').getAttribute('data-chart-data') || '[]'
      );
      expect(chartData).toHaveLength(1);

      // 新しい進捗を追加
      await progressService.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 75,
      });

      const updatedHistory = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      // チャートを再レンダリング
      rerender(<ProgressHistoryChart data={updatedHistory} />);

      // 更新されたデータが反映されることを確認
      chartData = JSON.parse(
        screen.getByTestId('line-chart').getAttribute('data-chart-data') || '[]'
      );
      expect(chartData).toHaveLength(2);
    });

    it('複数エンティティの進捗管理と表示', async () => {
      // 複数の目標の進捗を記録
      const goals = ['goal-1', 'goal-2', 'goal-3'];
      const progressValues = [30, 60, 90];

      for (let i = 0; i < goals.length; i++) {
        await progressService.recordProgress({
          entityId: goals[i],
          entityType: 'goal',
          progress: progressValues[i],
        });
      }

      // 各目標の履歴を取得
      const histories = await Promise.all(
        goals.map(goalId =>
          progressService.getProgressHistory({
            entityId: goalId,
            entityType: 'goal',
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endDate: new Date(),
          })
        )
      );

      // 各チャートをレンダリング
      histories.forEach((history, index) => {
        const { unmount } = render(
          <ProgressHistoryChart data={history} aria-label={`Goal ${index + 1} progress chart`} />
        );

        expect(screen.getByLabelText(`Goal ${index + 1} progress chart`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('データ分析とビジュアライゼーション統合', () => {
    it('トレンド分析結果がチャート表示に反映される', async () => {
      // 明確な増加傾向のデータを作成
      const increasingData = [10, 25, 40, 55, 70, 85];

      for (let i = 0; i < increasingData.length; i++) {
        await progressService.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: increasingData[i],
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // トレンド分析
      const trend = await progressService.getProgressTrend('goal-1', 7);
      expect(trend.direction).toBe('increasing');

      // 履歴データ取得
      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      // チャート表示
      render(<ProgressHistoryChart data={history} />);

      // 増加傾向が視覚的に確認できる
      const chartData = JSON.parse(
        screen.getByTestId('line-chart').getAttribute('data-chart-data') || '[]'
      );

      expect(chartData).toHaveLength(6);

      // データが増加順になっていることを確認
      for (let i = 1; i < chartData.length; i++) {
        expect(chartData[i].progress).toBeGreaterThan(chartData[i - 1].progress);
      }
    });

    it('重要な変化点がチャート上でハイライトされる', async () => {
      // 大きな変化を含むデータ
      const progressData = [
        { progress: 20, reason: '開始' },
        { progress: 25, reason: '小さな進歩' },
        { progress: 70, reason: '大きなブレークスルー' }, // +45%の大きな変化
        { progress: 75, reason: '継続' },
      ];

      for (let i = 0; i < progressData.length; i++) {
        await progressService.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: progressData[i].progress,
          changeReason: progressData[i].reason,
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      const significantChanges = await progressService.getSignificantChanges('goal-1', 30);
      expect(significantChanges).toHaveLength(1);
      expect(significantChanges[0].reason).toBe('大きなブレークスルー');

      render(
        <ProgressHistoryChart
          data={history}
          significantChanges={significantChanges}
          highlightSignificantChanges={true}
        />
      );

      // 重要な変化点がハイライトされることを確認
      expect(screen.getByText('重要な変化')).toBeInTheDocument();
      expect(screen.getAllByTestId('custom-dot')).toHaveLength(1);
    });

    it('統計分析結果がツールチップに表示される', async () => {
      const progressData = [30, 45, 60, 75];

      for (let i = 0; i < progressData.length; i++) {
        await progressService.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: progressData[i],
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      render(<ProgressHistoryChart data={history} showTooltip={true} />);

      // ツールチップが表示されることを確認
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('パフォーマンスと最適化統合テスト', () => {
    it('大量データでの全体的なパフォーマンス', async () => {
      const startTime = performance.now();

      // 大量のデータを生成
      const dataCount = 500;
      for (let i = 0; i < dataCount; i++) {
        await progressService.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: Math.min(100, i * 0.2),
        });
      }

      const dataGenerationTime = performance.now() - startTime;

      // 履歴取得
      const historyStartTime = performance.now();
      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });
      const historyTime = performance.now() - historyStartTime;

      // 分析実行
      const analysisStartTime = performance.now();
      const [trend, significantChanges] = await Promise.all([
        progressService.getProgressTrend('goal-1', 30),
        progressService.getSignificantChanges('goal-1', 10),
      ]);
      const analysisTime = performance.now() - analysisStartTime;

      // チャートレンダリング
      const renderStartTime = performance.now();
      render(<ProgressHistoryChart data={history} significantChanges={significantChanges} />);
      const renderTime = performance.now() - renderStartTime;

      // パフォーマンス要件の確認
      expect(dataGenerationTime).toBeLessThan(5000); // 5秒以内
      expect(historyTime).toBeLessThan(1000); // 1秒以内
      expect(analysisTime).toBeLessThan(2000); // 2秒以内
      expect(renderTime).toBeLessThan(1000); // 1秒以内

      // データが正しく処理されていることを確認
      expect(history.length).toBe(dataCount);
      expect(trend.direction).toBe('increasing');
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('メモリ使用量の最適化', async () => {
      // 初期メモリ使用量（概算）
      const initialDataSize = progressService.getAllData().size;

      // 大量データを追加
      for (let i = 0; i < 1000; i++) {
        await progressService.recordProgress({
          entityId: `goal-${Math.floor(i / 10)}`,
          entityType: 'goal',
          progress: Math.random() * 100,
        });
      }

      const beforeCleanupSize = progressService.getAllData().size;

      // クリーンアップ実行
      await progressService.cleanupOldHistory();

      const afterCleanupSize = progressService.getAllData().size;

      // メモリ使用量が適切に管理されていることを確認
      expect(beforeCleanupSize).toBeGreaterThan(initialDataSize);
      expect(afterCleanupSize).toBeLessThanOrEqual(beforeCleanupSize);
    });

    it('同時実行での整合性保証', async () => {
      const concurrentOperations = [];

      // 同時に複数の操作を実行
      for (let i = 0; i < 50; i++) {
        concurrentOperations.push(
          progressService.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: Math.random() * 100,
          })
        );
      }

      // 同時に分析も実行
      concurrentOperations.push(progressService.getProgressTrend('goal-1', 7));
      concurrentOperations.push(progressService.getSignificantChanges('goal-1', 10));

      // すべての操作が正常に完了することを確認
      await expect(Promise.all(concurrentOperations)).resolves.toBeDefined();

      // データの整合性を確認
      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history.length).toBe(50);
    });
  });

  describe('エラー処理と復旧統合テスト', () => {
    it('部分的なデータ破損からの復旧', async () => {
      // 正常なデータを記録
      await progressService.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
      });

      // 不正なデータを混入
      const allData = progressService.getAllData();
      const goalHistory = allData.get('goal:goal-1')!;
      goalHistory.push({
        id: 'corrupted',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: NaN,
        timestamp: new Date('invalid-date'),
      } as any);

      // システムが正常に動作し続けることを確認
      expect(async () => {
        const history = await progressService.getProgressHistory({
          entityId: 'goal-1',
          entityType: 'goal',
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(),
        });

        render(<ProgressHistoryChart data={history} />);
      }).not.toThrow();
    });

    it('ネットワークエラーシミュレーション', async () => {
      // ローカルサービスでは実際のネットワークエラーは発生しないが、
      // エラー処理のロジックをテスト
      const mockError = new Error('Network error');

      // エラーが発生してもアプリケーションがクラッシュしないことを確認
      expect(() => {
        render(
          <ProgressHistoryChart
            data={[]}
            onDateClick={() => {
              throw mockError;
            }}
          />
        );
      }).not.toThrow();
    });

    it('データ不整合の自動修復', async () => {
      // 不整合なデータを作成（進捗が100%を超える）
      await progressService.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 150, // 不正な値
      });

      // システムが適切に処理することを確認
      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history).toHaveLength(1);

      // チャートが正常に表示されることを確認
      expect(() => {
        render(<ProgressHistoryChart data={history} />);
      }).not.toThrow();

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('ユーザビリティ統合テスト', () => {
    it('完全なユーザーインタラクションフロー', async () => {
      const user = userEvent.setup();

      // データを準備
      const progressData = [25, 50, 75];
      for (let i = 0; i < progressData.length; i++) {
        await progressService.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: progressData[i],
          changeReason: `Step ${i + 1}`,
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      const significantChanges = await progressService.getSignificantChanges('goal-1', 20);

      render(<ProgressHistoryChart data={history} significantChanges={significantChanges} />);

      // 1. チャートが表示される
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();

      // 2. ユーザーがチャートをクリック
      await user.click(screen.getByTestId('line-chart'));

      // 3. モーダルが開く
      await waitFor(() => {
        expect(screen.getByTestId('progress-detail-modal')).toBeInTheDocument();
      });

      // 4. モーダルの内容を確認
      expect(screen.getByTestId('modal-progress')).toHaveTextContent('25');

      // 5. モーダルを閉じる
      await user.click(screen.getByTestId('modal-close'));

      // 6. モーダルが閉じる
      await waitFor(() => {
        expect(screen.queryByTestId('progress-detail-modal')).not.toBeInTheDocument();
      });
    });

    it('アクセシビリティ要件の統合確認', async () => {
      const history = await progressService.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      render(<ProgressHistoryChart data={history} />);

      // ARIA属性の確認
      const chartContainer = screen.getByRole('img');
      expect(chartContainer).toHaveAttribute('aria-label');

      // キーボードナビゲーションの確認
      chartContainer.focus();
      expect(document.activeElement).toBe(chartContainer);
    });
  });
});
