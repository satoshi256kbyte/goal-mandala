import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import {
  useAchievementAnimation,
  useMultipleAchievementAnimation,
} from '../useAchievementAnimation';
import { AnimationSettingsProvider } from '../../contexts/AnimationSettingsContext';
import { globalAchievementManager } from '../../utils/achievement-manager';

// Web Animations API のモック
const mockAnimate = jest.fn();
const mockAnimation = {
  addEventListener: jest.fn(),
  cancel: jest.fn(),
  finish: jest.fn(),
};

Object.defineProperty(HTMLElement.prototype, 'animate', {
  value: mockAnimate.mockReturnValue(mockAnimation),
  writable: true,
});

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

// テスト用コンポーネント
const TestComponent: React.FC<{
  type: 'task' | 'action' | 'subgoal' | 'goal';
  id: string;
  progress: number;
  onAchievement?: (event: any) => void;
  disabled?: boolean;
}> = ({ type, id, progress, onAchievement, disabled }) => {
  const { elementRef, triggerAchievement, cancelAchievement, isAnimating } =
    useAchievementAnimation({
      type,
      id,
      progress,
      onAchievement,
      disabled,
    });

  return (
    <div>
      <div ref={elementRef} data-testid="animated-element">
        Test Element
      </div>
      <button onClick={triggerAchievement} data-testid="trigger-button">
        Trigger Achievement
      </button>
      <button onClick={cancelAchievement} data-testid="cancel-button">
        Cancel Achievement
      </button>
      <div data-testid="animation-status">{isAnimating ? 'animating' : 'idle'}</div>
    </div>
  );
};

const MultipleTestComponent: React.FC<{
  elements: Array<{ type: 'task' | 'action' | 'subgoal' | 'goal'; id: string; progress: number }>;
  onAchievement?: (events: any[]) => void;
  disabled?: boolean;
}> = ({ elements, onAchievement, disabled }) => {
  const { registerElement, triggerMultipleAchievements } = useMultipleAchievementAnimation({
    elements,
    onAchievement,
    disabled,
  });

  return (
    <div>
      {elements.map((element, index) => (
        <div
          key={element.id}
          ref={el => registerElement(element.id, el)}
          data-testid={`element-${element.id}`}
        >
          Element {index + 1}
        </div>
      ))}
      <button
        onClick={() => triggerMultipleAchievements(elements)}
        data-testid="trigger-multiple-button"
      >
        Trigger Multiple
      </button>
    </div>
  );
};

describe('useAchievementAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalAchievementManager.clearPendingAchievements();
  });

  const renderWithProvider = (children: React.ReactNode, settings = {}) => {
    return render(
      <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>
    );
  };

  describe('基本機能', () => {
    it('要素のrefを正しく設定する', () => {
      renderWithProvider(<TestComponent type="task" id="test-1" progress={50} />);

      const element = screen.getByTestId('animated-element');
      expect(element).toBeInTheDocument();
    });

    it('進捗が100%に達した時に自動的にアチーブメントをトリガーする', async () => {
      const onAchievement = jest.fn();

      const { rerender } = renderWithProvider(
        <TestComponent type="task" id="test-1" progress={50} onAchievement={onAchievement} />
      );

      // 進捗を100%に更新
      rerender(
        <AnimationSettingsProvider>
          <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalled();
      });
    });

    it('手動でアチーブメントをトリガーできる', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="task" id="test-1" progress={50} onAchievement={onAchievement} />
      );

      const triggerButton = screen.getByTestId('trigger-button');
      act(() => {
        triggerButton.click();
      });

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalled();
      });
    });

    it('アチーブメントをキャンセルできる', () => {
      const spy = jest.spyOn(globalAchievementManager, 'cancelAchievement');

      renderWithProvider(<TestComponent type="task" id="test-1" progress={50} />);

      const cancelButton = screen.getByTestId('cancel-button');
      act(() => {
        cancelButton.click();
      });

      expect(spy).toHaveBeenCalledWith('test-1');

      spy.mockRestore();
    });

    it('アニメーション無効時はアチーブメントをトリガーしない', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />,
        { enabled: false }
      );

      // 少し待ってもコールバックが呼ばれないことを確認
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });

    it('達成アニメーション無効時はアチーブメントをトリガーしない', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />,
        { achievementEnabled: false }
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });

    it('disabled=trueの場合はアチーブメントをトリガーしない', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent
          type="task"
          id="test-1"
          progress={100}
          onAchievement={onAchievement}
          disabled={true}
        />
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });
  });

  describe('アニメーションタイプ', () => {
    it('taskタイプのアチーブメントを正しく処理する', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'task',
            id: 'test-1',
            progress: 100,
          })
        );
      });
    });

    it('actionタイプのアチーブメントを正しく処理する', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="action" id="test-1" progress={100} onAchievement={onAchievement} />
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'action',
            id: 'test-1',
            progress: 100,
          })
        );
      });
    });

    it('subgoalタイプのアチーブメントを正しく処理する', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="subgoal" id="test-1" progress={100} onAchievement={onAchievement} />
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'subgoal',
            id: 'test-1',
            progress: 100,
          })
        );
      });
    });

    it('goalタイプのアチーブメントを正しく処理する', async () => {
      const onAchievement = jest.fn();

      renderWithProvider(
        <TestComponent type="goal" id="test-1" progress={100} onAchievement={onAchievement} />
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'goal',
            id: 'test-1',
            progress: 100,
          })
        );
      });
    });
  });

  describe('進捗変化の検出', () => {
    it('進捗が99%から100%に変化した時のみトリガーする', async () => {
      const onAchievement = jest.fn();

      const { rerender } = renderWithProvider(
        <TestComponent type="task" id="test-1" progress={99} onAchievement={onAchievement} />
      );

      // 100%に変更
      rerender(
        <AnimationSettingsProvider>
          <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledTimes(1);
      });

      // 再度100%に設定（変化なし）
      rerender(
        <AnimationSettingsProvider>
          <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      // 追加でコールバックが呼ばれないことを確認
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).toHaveBeenCalledTimes(1);
    });

    it('進捗が100%から99%に下がった場合はトリガーしない', async () => {
      const onAchievement = jest.fn();

      const { rerender } = renderWithProvider(
        <TestComponent type="task" id="test-1" progress={100} onAchievement={onAchievement} />
      );

      // 99%に変更
      rerender(
        <AnimationSettingsProvider>
          <TestComponent type="task" id="test-1" progress={99} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });
  });

  describe('クリーンアップ', () => {
    it('コンポーネントアンマウント時にアチーブメントをキャンセルする', () => {
      const spy = jest.spyOn(globalAchievementManager, 'cancelAchievement');

      const { unmount } = renderWithProvider(
        <TestComponent type="task" id="test-1" progress={50} />
      );

      unmount();

      expect(spy).toHaveBeenCalledWith('test-1');

      spy.mockRestore();
    });
  });
});

describe('useMultipleAchievementAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalAchievementManager.clearPendingAchievements();
  });

  const renderWithProvider = (children: React.ReactNode, settings = {}) => {
    return render(
      <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>
    );
  };

  describe('基本機能', () => {
    it('複数の要素を正しく登録する', () => {
      const elements = [
        { type: 'task' as const, id: 'task-1', progress: 50 },
        { type: 'task' as const, id: 'task-2', progress: 75 },
      ];

      renderWithProvider(<MultipleTestComponent elements={elements} />);

      expect(screen.getByTestId('element-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('element-task-2')).toBeInTheDocument();
    });

    it('複数のアチーブメントを同時にトリガーできる', async () => {
      const onAchievement = jest.fn();
      const elements = [
        { type: 'task' as const, id: 'task-1', progress: 100 },
        { type: 'task' as const, id: 'task-2', progress: 100 },
      ];

      renderWithProvider(
        <MultipleTestComponent elements={elements} onAchievement={onAchievement} />
      );

      const triggerButton = screen.getByTestId('trigger-multiple-button');
      act(() => {
        triggerButton.click();
      });

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'task-1', type: 'task' }),
            expect.objectContaining({ id: 'task-2', type: 'task' }),
          ])
        );
      });
    });

    it('進捗が100%に達した要素のみをトリガーする', async () => {
      const onAchievement = jest.fn();
      const elements = [
        { type: 'task' as const, id: 'task-1', progress: 50 },
        { type: 'task' as const, id: 'task-2', progress: 100 },
      ];

      const { rerender } = renderWithProvider(
        <MultipleTestComponent elements={elements} onAchievement={onAchievement} />
      );

      // task-1の進捗を100%に更新
      const updatedElements = [
        { type: 'task' as const, id: 'task-1', progress: 100 },
        { type: 'task' as const, id: 'task-2', progress: 100 },
      ];

      rerender(
        <AnimationSettingsProvider>
          <MultipleTestComponent elements={updatedElements} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ id: 'task-1', progress: 100 })])
        );
      });

      // task-2は既に100%だったので含まれない
      const call = onAchievement.mock.calls[0][0];
      expect(call).toHaveLength(1);
      expect(call[0].id).toBe('task-1');
    });

    it('アニメーション無効時は何もしない', async () => {
      const onAchievement = jest.fn();
      const elements = [{ type: 'task' as const, id: 'task-1', progress: 100 }];

      renderWithProvider(
        <MultipleTestComponent elements={elements} onAchievement={onAchievement} />,
        { enabled: false }
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });

    it('disabled=trueの場合は何もしない', async () => {
      const onAchievement = jest.fn();
      const elements = [{ type: 'task' as const, id: 'task-1', progress: 100 }];

      renderWithProvider(
        <MultipleTestComponent elements={elements} onAchievement={onAchievement} disabled={true} />
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });
  });

  describe('要素の登録・解除', () => {
    it('要素が存在しない場合はエラーをスローする', () => {
      const elements = [{ type: 'task' as const, id: 'nonexistent', progress: 100 }];

      renderWithProvider(<MultipleTestComponent elements={elements} />);

      const triggerButton = screen.getByTestId('trigger-multiple-button');

      expect(() => {
        act(() => {
          triggerButton.click();
        });
      }).toThrow('Element with id nonexistent not found');
    });
  });
});
