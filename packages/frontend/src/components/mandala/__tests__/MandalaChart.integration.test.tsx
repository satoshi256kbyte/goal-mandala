import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import MandalaChart from '../MandalaChart';

vi.mock('../MandalaChart.css', () => ({}));

describe('MandalaChart Integration Tests', () => {
  it('コンポーネント間連携が正常に動作する', async () => {
    const onCellClick = vi.fn();
    const onCellEdit = vi.fn();

    render(
      <MandalaChart
        goalId="test-goal"
        onCellClick={onCellClick}
        onCellEdit={onCellEdit}
        editable={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('年収1000万円達成')).toBeInTheDocument();
    });

    // セルクリックのテスト
    const goalCell = screen.getByLabelText(/目標: 年収1000万円達成/);
    fireEvent.click(goalCell);
    expect(onCellClick).toHaveBeenCalled();

    // ダブルクリックでの編集テスト
    fireEvent.doubleClick(goalCell);
    expect(onCellEdit).toHaveBeenCalled();
  });

  it('データフロー全体が正常に動作する', async () => {
    render(<MandalaChart goalId="test-goal" />);

    await waitFor(() => {
      // 目標が中央に表示される
      expect(screen.getByText('年収1000万円達成')).toBeInTheDocument();

      // サブ目標が表示される
      expect(screen.getByText('スキルアップ')).toBeInTheDocument();
      expect(screen.getByText('副業開始')).toBeInTheDocument();

      // アクションが表示される
      expect(screen.getByText('React学習')).toBeInTheDocument();
      expect(screen.getByText('AWS資格勉強')).toBeInTheDocument();
    });

    // 進捗表示の確認
    expect(screen.getByText('全体進捗: 45%')).toBeInTheDocument();
  });

  it('エラーハンドリングが正常に動作する', () => {
    render(<MandalaChart goalId="" />);

    // エラー状態でも正常にレンダリングされる
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });
});
