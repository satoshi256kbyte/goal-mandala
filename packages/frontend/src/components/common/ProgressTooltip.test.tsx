import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressTooltip } from './ProgressTooltip';

describe('ProgressTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('基本的な進捗表示', () => {
    it('進捗値が正しく表示される', async () => {
      render(
        <ProgressTooltip currentValue={75.5} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('75.5%')).toBeInTheDocument();
        expect(screen.getByText('進捗状況')).toBeInTheDocument();
      });
    });

    it('進捗タイプに応じたラベルが表示される', async () => {
      const { rerender } = render(
        <ProgressTooltip currentValue={50} progressType="action" delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('アクション進捗')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(trigger);
      await waitFor(() => {
        expect(screen.queryByText('アクション進捗')).not.toBeInTheDocument();
      });

      rerender(
        <ProgressTooltip currentValue={50} progressType="goal" delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('目標進捗')).toBeInTheDocument();
      });
    });
  });

  describe('進捗ステータス表示', () => {
    it('進捗値に応じた適切なステータスが表示される', async () => {
      const testCases = [
        { value: 0, expectedStatus: '未開始' },
        { value: 15, expectedStatus: '開始済み' },
        { value: 35, expectedStatus: '進行中' },
        { value: 65, expectedStatus: '順調' },
        { value: 85, expectedStatus: 'もうすぐ完了' },
        { value: 100, expectedStatus: '完了' },
      ];

      for (const [index, testCase] of testCases.entries()) {
        const { unmount } = render(
          <ProgressTooltip currentValue={testCase.value} delay={0}>
            <button>ホバーしてください{index}</button>
          </ProgressTooltip>
        );

        const trigger = screen.getByText(`ホバーしてください${index}`);
        fireEvent.mouseEnter(trigger);

        await waitFor(() => {
          expect(screen.getByText(testCase.expectedStatus)).toBeInTheDocument();
        });

        fireEvent.mouseLeave(trigger);
        await waitFor(() => {
          expect(screen.queryByText(testCase.expectedStatus)).not.toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('前回からの変化表示', () => {
    it('進捗増加時に正しい表示がされる', async () => {
      render(
        <ProgressTooltip currentValue={75} previousValue={50} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('前回から')).toBeInTheDocument();
        const changeElement = screen.getByText('+25.0%');
        expect(changeElement).toBeInTheDocument();
        expect(changeElement).toHaveClass('text-green-400');
      });
    });

    it('進捗減少時に正しい表示がされる', async () => {
      render(
        <ProgressTooltip currentValue={30} previousValue={60} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const changeElement = screen.getByText('-30.0%');
        expect(changeElement).toBeInTheDocument();
        expect(changeElement).toHaveClass('text-red-400');
      });
    });

    it('変化がない場合の表示', async () => {
      render(
        <ProgressTooltip currentValue={50} previousValue={50} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const changeElement = screen.getByText('変更なし');
        expect(changeElement).toBeInTheDocument();
        expect(changeElement).toHaveClass('text-gray-400');
      });
    });
  });

  describe('目標までの残り表示', () => {
    it('目標値が設定されている場合、残り進捗が表示される', async () => {
      render(
        <ProgressTooltip currentValue={75} targetValue={100} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('目標まで')).toBeInTheDocument();
        expect(screen.getByText('25.0%')).toBeInTheDocument();
      });
    });

    it('目標達成時は残り進捗が表示されない', async () => {
      render(
        <ProgressTooltip currentValue={100} targetValue={100} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.queryByText('目標まで')).not.toBeInTheDocument();
      });
    });
  });

  describe('タスク情報表示', () => {
    it('完了タスク数と総タスク数が表示される', async () => {
      render(
        <ProgressTooltip currentValue={75} completedTasks={3} totalTasks={4} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('完了タスク')).toBeInTheDocument();
        expect(screen.getByText('3/4')).toBeInTheDocument();
        expect(screen.getByText('(75%)')).toBeInTheDocument();
      });
    });

    it('タスク数が0の場合も正しく表示される', async () => {
      render(
        <ProgressTooltip currentValue={0} completedTasks={0} totalTasks={5} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('0/5')).toBeInTheDocument();
        expect(screen.getByText('(0%)')).toBeInTheDocument();
      });
    });
  });

  describe('日時情報表示', () => {
    it('最終更新日時が表示される', async () => {
      const lastUpdated = new Date('2024-01-15T10:30:00');

      render(
        <ProgressTooltip currentValue={50} lastUpdated={lastUpdated} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('最終更新')).toBeInTheDocument();
        expect(screen.getByText('1月15日 10:30')).toBeInTheDocument();
      });
    });

    it('完了予定日が表示される（未完了時のみ）', async () => {
      const estimatedCompletion = new Date('2024-02-01');

      render(
        <ProgressTooltip currentValue={75} estimatedCompletion={estimatedCompletion} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('完了予定')).toBeInTheDocument();
        expect(screen.getByText('2月1日')).toBeInTheDocument();
      });
    });

    it('完了時は完了予定日が表示されない', async () => {
      const estimatedCompletion = new Date('2024-02-01');

      render(
        <ProgressTooltip currentValue={100} estimatedCompletion={estimatedCompletion} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.queryByText('完了予定')).not.toBeInTheDocument();
      });
    });
  });

  describe('カスタムメッセージ', () => {
    it('カスタムメッセージが表示される', async () => {
      render(
        <ProgressTooltip currentValue={50} customMessage="順調に進んでいます！" delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('順調に進んでいます！')).toBeInTheDocument();
      });
    });
  });

  describe('詳細情報の表示制御', () => {
    it('showDetails=falseの場合、詳細情報が表示されない', async () => {
      render(
        <ProgressTooltip
          currentValue={75}
          completedTasks={3}
          totalTasks={4}
          lastUpdated={new Date()}
          showDetails={false}
          delay={0}
        >
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('75.0%')).toBeInTheDocument();
        expect(screen.queryByText('完了タスク')).not.toBeInTheDocument();
        expect(screen.queryByText('最終更新')).not.toBeInTheDocument();
      });
    });

    it('showDetails=trueの場合、詳細情報が表示される（デフォルト）', async () => {
      render(
        <ProgressTooltip currentValue={75} completedTasks={3} totalTasks={4} delay={0}>
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('完了タスク')).toBeInTheDocument();
      });
    });
  });

  describe('複合的な情報表示', () => {
    it('すべての情報が同時に表示される', async () => {
      const lastUpdated = new Date('2024-01-15T10:30:00');
      const estimatedCompletion = new Date('2024-02-01');

      render(
        <ProgressTooltip
          currentValue={75}
          previousValue={50}
          targetValue={100}
          completedTasks={3}
          totalTasks={4}
          lastUpdated={lastUpdated}
          estimatedCompletion={estimatedCompletion}
          customMessage="順調に進んでいます"
          progressType="action"
          delay={0}
        >
          <button>ホバーしてください</button>
        </ProgressTooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        // 基本情報
        expect(screen.getByText('アクション進捗')).toBeInTheDocument();
        expect(screen.getByText('75.0%')).toBeInTheDocument();

        // 変化情報
        expect(screen.getByText('+25.0%')).toBeInTheDocument();

        // 目標情報
        expect(screen.getByText('25.0%')).toBeInTheDocument();

        // タスク情報
        expect(screen.getByText('3/4')).toBeInTheDocument();

        // 日時情報
        expect(screen.getByText('1月15日 10:30')).toBeInTheDocument();
        expect(screen.getByText('2月1日')).toBeInTheDocument();

        // カスタムメッセージ
        expect(screen.getByText('順調に進んでいます')).toBeInTheDocument();
      });
    });
  });
});
