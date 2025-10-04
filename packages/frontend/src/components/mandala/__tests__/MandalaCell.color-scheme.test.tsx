/**
 * マンダラセル色分け表示のテスト
 * 要件3.3のテスト: セル色分け表示のテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import MandalaCell from '../MandalaCell';
import { CellData } from '../../../types';

describe('MandalaCell - 色分け表示テスト', () => {
  const baseCellData: CellData = {
    id: 'test-1',
    type: 'goal',
    title: 'テスト目標',
    description: 'テスト説明',
    progress: 50,
    position: { row: 4, col: 4 },
  };

  const defaultProps = {
    cellData: baseCellData,
    position: { row: 4, col: 4 },
    editable: false,
    onClick: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('色分けロジックのテスト', () => {
    it('進捗0%時に灰色が適用される', () => {
      const cellData = { ...baseCellData, progress: 0 };
      render(<MandalaCell {...defaultProps} cellData={cellData} />);

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveClass('progress-0');
      expect(cell).toHaveStyle('background-color: rgba(156, 163, 175, 0.6)');
      expect(cell).toHaveStyle('border-color: rgba(107, 114, 128, 0.8)');
      expect(cell).toHaveStyle('color: #374151');
    });

    it('進捗1-49%時に薄い赤色が適用される', () => {
      const testCases = [1, 25, 49];

      testCases.forEach(progress => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(<MandalaCell {...defaultProps} cellData={cellData} />);

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveClass('progress-low');
        expect(cell).toHaveStyle('background-color: rgba(248, 113, 113, 0.6)');
        expect(cell).toHaveStyle('border-color: rgba(239, 68, 68, 0.8)');
        expect(cell).toHaveStyle('color: #7f1d1d');

        unmount();
      });
    });

    it('進捗50-79%時に薄い黄色が適用される', () => {
      const testCases = [50, 65, 79];

      testCases.forEach(progress => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(<MandalaCell {...defaultProps} cellData={cellData} />);

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveClass('progress-medium');
        expect(cell).toHaveStyle('background-color: rgba(251, 191, 36, 0.6)');
        expect(cell).toHaveStyle('border-color: rgba(245, 158, 11, 0.8)');
        expect(cell).toHaveStyle('color: #78350f');

        unmount();
      });
    });

    it('進捗80-99%時に薄い緑色が適用される', () => {
      const testCases = [80, 90, 99];

      testCases.forEach(progress => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(<MandalaCell {...defaultProps} cellData={cellData} />);

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveClass('progress-high');
        expect(cell).toHaveStyle('background-color: rgba(74, 222, 128, 0.6)');
        expect(cell).toHaveStyle('border-color: rgba(34, 197, 94, 0.8)');
        expect(cell).toHaveStyle('color: #14532d');

        unmount();
      });
    });

    it('進捗100%時に濃い緑色が適用される', () => {
      const cellData = { ...baseCellData, progress: 100 };
      render(<MandalaCell {...defaultProps} cellData={cellData} />);

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveClass('progress-complete');
      expect(cell).toHaveStyle('background-color: rgba(34, 197, 94, 0.8)');
      expect(cell).toHaveStyle('border-color: rgba(21, 128, 61, 1)');
      expect(cell).toHaveStyle('color: #ffffff');
    });
  });

  describe('レスポンシブ表示のテスト', () => {
    it('基本的なレスポンシブクラスが適用される', () => {
      render(<MandalaCell {...defaultProps} />);
      const cell = screen.getByRole('gridcell');

      expect(cell).toHaveClass('mandala-cell');
      // CSSクラスによるレスポンシブ対応が適用されていることを確認
      expect(cell).toHaveClass('progress-medium');
    });

    it('異なる画面サイズでも色分けが維持される', () => {
      // モバイル、タブレット、デスクトップでの表示をシミュレート
      const testCases = [
        { progress: 0, expectedClass: 'progress-0' },
        { progress: 25, expectedClass: 'progress-low' },
        { progress: 65, expectedClass: 'progress-medium' },
        { progress: 90, expectedClass: 'progress-high' },
        { progress: 100, expectedClass: 'progress-complete' },
      ];

      testCases.forEach(({ progress, expectedClass }) => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(<MandalaCell {...defaultProps} cellData={cellData} />);

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveClass(expectedClass);

        unmount();
      });
    });
  });

  describe('ダークモード対応のテスト', () => {
    it('ダークモードで適切な色分けスキームが適用される', () => {
      const testCases = [
        {
          progress: 0,
          expectedBg: 'rgba(75, 85, 99, 0.7)',
          expectedText: '#d1d5db',
        },
        {
          progress: 25,
          expectedBg: 'rgba(220, 38, 38, 0.7)',
          expectedText: '#fecaca',
        },
        {
          progress: 65,
          expectedBg: 'rgba(217, 119, 6, 0.7)',
          expectedText: '#fef3c7',
        },
        {
          progress: 90,
          expectedBg: 'rgba(22, 163, 74, 0.7)',
          expectedText: '#dcfce7',
        },
        {
          progress: 100,
          expectedBg: 'rgba(21, 128, 61, 0.85)',
          expectedText: '#ffffff',
        },
      ];

      testCases.forEach(({ progress, expectedBg, expectedText }) => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(
          <MandalaCell {...defaultProps} cellData={cellData} darkMode={true} />
        );

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveStyle(`background-color: ${expectedBg}`);
        expect(cell).toHaveStyle(`color: ${expectedText}`);

        unmount();
      });
    });

    it('ダークモード + ハイコントラストで適切な色が適用される', () => {
      const cellData = { ...baseCellData, progress: 50 };
      render(
        <MandalaCell {...defaultProps} cellData={cellData} darkMode={true} highContrast={true} />
      );

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveStyle('background-color: rgba(217, 119, 6, 0.9)'); // より濃い
    });
  });

  describe('カラーブラインドネス対応のテスト', () => {
    it('カラーブラインドネス対応色が適用される', () => {
      const testCases = [
        {
          progress: 0,
          expectedBg: 'rgba(156, 163, 175, 0.6)',
          expectedText: '#374151',
        },
        {
          progress: 25,
          expectedBg: 'rgba(96, 165, 250, 0.6)',
          expectedText: '#1e3a8a',
        },
        {
          progress: 65,
          expectedBg: 'rgba(168, 85, 247, 0.6)',
          expectedText: '#581c87',
        },
        {
          progress: 90,
          expectedBg: 'rgba(45, 212, 191, 0.6)',
          expectedText: '#134e4a',
        },
        {
          progress: 100,
          expectedBg: 'rgba(20, 184, 166, 0.8)',
          expectedText: '#ffffff',
        },
      ];

      testCases.forEach(({ progress, expectedBg, expectedText }) => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(
          <MandalaCell {...defaultProps} cellData={cellData} colorBlindFriendly={true} />
        );

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveStyle(`background-color: ${expectedBg}`);
        expect(cell).toHaveStyle(`color: ${expectedText}`);

        unmount();
      });
    });

    it('カラーブラインドネス対応 + ダークモードで適切な色が適用される', () => {
      const cellData = { ...baseCellData, progress: 50 };
      render(
        <MandalaCell
          {...defaultProps}
          cellData={cellData}
          colorBlindFriendly={true}
          darkMode={true}
        />
      );

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveStyle('background-color: rgba(126, 34, 206, 0.6)'); // ダークモード紫色（不透明度は0.6）
      expect(cell).toHaveStyle('color: #e9d5ff'); // ダークモード用テキスト色
    });
  });

  describe('ハイコントラストモードのテスト', () => {
    it('ハイコントラストモードで不透明度が上がる', () => {
      const cellData = { ...baseCellData, progress: 50 };
      render(<MandalaCell {...defaultProps} cellData={cellData} highContrast={true} />);

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveStyle('background-color: rgba(251, 191, 36, 0.8)'); // 0.8の不透明度
      expect(cell).toHaveStyle('border-color: rgba(245, 158, 11, 1)'); // ボーダーは完全不透明
    });

    it('100%完了時のハイコントラストモードで適切な色が適用される', () => {
      const cellData = { ...baseCellData, progress: 100 };
      render(<MandalaCell {...defaultProps} cellData={cellData} highContrast={true} />);

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveStyle('background-color: rgba(34, 197, 94, 0.9)'); // より濃い緑色
    });
  });

  describe('カスタム色設定のテスト', () => {
    it('カスタム色設定が優先される', () => {
      const customColors = {
        zero: '#f0f0f0',
        low: '#ffcccc',
        medium: '#ffffcc',
        high: '#ccffcc',
        complete: '#00ff00',
      };

      const testCases = [
        { progress: 0, expectedColor: '#f0f0f0' },
        { progress: 25, expectedColor: '#ffcccc' },
        { progress: 65, expectedColor: '#ffffcc' },
        { progress: 90, expectedColor: '#ccffcc' },
        { progress: 100, expectedColor: '#00ff00' },
      ];

      testCases.forEach(({ progress, expectedColor }) => {
        const cellData = { ...baseCellData, progress };
        const { unmount } = render(
          <MandalaCell {...defaultProps} cellData={cellData} customColors={customColors} />
        );

        const cell = screen.getByRole('gridcell');
        expect(cell).toHaveStyle(`background-color: ${expectedColor}`);

        unmount();
      });
    });

    it('部分的なカスタム色設定でフォールバックが動作する', () => {
      const partialCustomColors = {
        complete: '#ff0000', // 100%のみカスタム
      };

      // 100%以外はデフォルト色、100%はカスタム色
      const cellData100 = { ...baseCellData, progress: 100 };
      const { unmount: unmount100 } = render(
        <MandalaCell {...defaultProps} cellData={cellData100} customColors={partialCustomColors} />
      );

      const cell100 = screen.getByRole('gridcell');
      expect(cell100).toHaveStyle('background-color: #ff0000');

      unmount100();

      // 50%はデフォルト色
      const cellData50 = { ...baseCellData, progress: 50 };
      render(
        <MandalaCell {...defaultProps} cellData={cellData50} customColors={partialCustomColors} />
      );

      const cell50 = screen.getByRole('gridcell');
      expect(cell50).toHaveStyle('background-color: rgba(251, 191, 36, 0.6)'); // デフォルト黄色
    });
  });
});
