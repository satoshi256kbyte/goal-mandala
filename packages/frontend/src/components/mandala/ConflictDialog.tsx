import React, { useEffect, useRef } from 'react';
import { Goal, SubGoal } from '../../types/mandala';
import './ConflictDialog.css';

export interface ConflictDialogProps {
  isOpen: boolean;
  currentData: Goal | SubGoal | Action;
  latestData: Goal | SubGoal | Action;
  onReload: () => void;
  onDiscard: () => void;
}

interface DiffField {
  field: string;
  label: string;
  currentValue: string;
  latestValue: string;
  hasChanged: boolean;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  currentData,
  latestData,
  onReload,
  onDiscard,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reloadButtonRef = useRef<HTMLButtonElement>(null);

  // フォーカス管理
  useEffect(() => {
    if (isOpen && reloadButtonRef.current) {
      reloadButtonRef.current.focus();
    }
  }, [isOpen]);

  // Escキーハンドリング
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onDiscard();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDiscard]);

  if (!isOpen) {
    return null;
  }

  // 差分を計算
  const diffs = calculateDiffs(currentData, latestData);
  const hasChanges = diffs.some(diff => diff.hasChanged);

  return (
    <div
      className="conflict-dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        className="conflict-dialog bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* ヘッダー */}
        <div className="conflict-dialog-header px-6 py-4 border-b border-gray-200">
          <h2 id="conflict-dialog-title" className="conflict-dialog-title">
            編集競合が発生しました
          </h2>
          <p className="conflict-dialog-description">
            データが他のユーザーによって更新されています。最新のデータを確認して、どちらの変更を採用するか選択してください。
          </p>
        </div>

        {/* コンテンツ */}
        <div className="conflict-dialog-content flex-1 overflow-y-auto px-6 py-4">
          {!hasChanges ? (
            <div className="conflict-dialog-empty">変更なし</div>
          ) : (
            <div className="conflict-diff-list">
              {diffs.map(diff => (
                <DiffRow key={diff.field} diff={diff} />
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="conflict-dialog-footer">
          <button
            type="button"
            onClick={onDiscard}
            className="conflict-button conflict-button-secondary"
          >
            変更を破棄
          </button>
          <button
            ref={reloadButtonRef}
            type="button"
            onClick={onReload}
            className="conflict-button conflict-button-primary"
          >
            最新データを取得して再編集
          </button>
        </div>
      </div>
    </div>
  );
};

interface DiffRowProps {
  diff: DiffField;
}

const DiffRow: React.FC<DiffRowProps> = ({ diff }) => {
  return (
    <div className={`conflict-diff-item ${diff.hasChanged ? '' : 'conflict-diff-item-unchanged'}`}>
      <div className="conflict-field-name">{diff.label}</div>
      <div className="conflict-diff-grid">
        <div className="conflict-diff-column">
          <div className="conflict-diff-label conflict-diff-label-current">あなたの変更</div>
          <div
            className={`conflict-diff-value conflict-diff-value-current ${
              diff.hasChanged ? 'conflict-highlight' : ''
            } ${!diff.currentValue ? 'conflict-diff-value-empty' : ''}`}
          >
            {diff.currentValue || '（未設定）'}
          </div>
        </div>
        <div className="conflict-diff-column">
          <div className="conflict-diff-label conflict-diff-label-latest">最新のデータ</div>
          <div
            className={`conflict-diff-value conflict-diff-value-latest ${
              diff.hasChanged ? 'conflict-highlight' : ''
            } ${!diff.latestValue ? 'conflict-diff-value-empty' : ''}`}
          >
            {diff.latestValue || '（未設定）'}
          </div>
        </div>
      </div>
    </div>
  );
};

function calculateDiffs(
  currentData: Goal | SubGoal | Action,
  latestData: Goal | SubGoal | Action
): DiffField[] {
  const diffs: DiffField[] = [];

  // 共通フィールド
  diffs.push({
    field: 'title',
    label: 'タイトル',
    currentValue: currentData.title,
    latestValue: latestData.title,
    hasChanged: currentData.title !== latestData.title,
  });

  diffs.push({
    field: 'description',
    label: '説明',
    currentValue: currentData.description,
    latestValue: latestData.description,
    hasChanged: currentData.description !== latestData.description,
  });

  // 背景
  if ('background' in currentData && 'background' in latestData) {
    diffs.push({
      field: 'background',
      label: '背景',
      currentValue: currentData.background || '',
      latestValue: latestData.background || '',
      hasChanged: currentData.background !== latestData.background,
    });
  }

  // 制約事項
  if ('constraints' in currentData && 'constraints' in latestData) {
    diffs.push({
      field: 'constraints',
      label: '制約事項',
      currentValue: currentData.constraints || '',
      latestValue: latestData.constraints || '',
      hasChanged: currentData.constraints !== latestData.constraints,
    });
  }

  // 目標固有のフィールド
  if ('deadline' in currentData && 'deadline' in latestData) {
    const currentDeadline = currentData.deadline
      ? new Date(currentData.deadline).toLocaleDateString('ja-JP')
      : '';
    const latestDeadline = latestData.deadline
      ? new Date(latestData.deadline).toLocaleDateString('ja-JP')
      : '';

    diffs.push({
      field: 'deadline',
      label: '達成期限',
      currentValue: currentDeadline,
      latestValue: latestDeadline,
      hasChanged: currentDeadline !== latestDeadline,
    });
  }

  // アクション固有のフィールド
  if ('type' in currentData && 'type' in latestData) {
    const typeLabels: Record<string, string> = {
      execution: '実行',
      habit: '習慣',
    };

    diffs.push({
      field: 'type',
      label: '種別',
      currentValue: typeLabels[currentData.type] || currentData.type,
      latestValue: typeLabels[latestData.type] || latestData.type,
      hasChanged: currentData.type !== latestData.type,
    });
  }

  return diffs;
}
