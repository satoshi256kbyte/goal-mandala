/**
 * 目標入力フォーム用のテストユーティリティ
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalFormData } from '../schemas/goal-form';

/**
 * テスト用のモックデータ
 */
export const mockGoalFormData: GoalFormData = {
  title: 'テスト目標',
  description: 'これはテスト用の目標説明です。',
  deadline: '2025-12-31',
  background: 'テスト用の背景情報です。',
  constraints: 'テスト用の制約事項です。',
};

/**
 * 部分的なモックデータ（下書き用）
 */
export const mockPartialGoalFormData: Partial<GoalFormData> = {
  title: '部分的なテスト目標',
  description: '部分的な説明',
};

/**
 * 無効なデータのテストケース
 */
export const invalidGoalFormData = {
  emptyTitle: {
    ...mockGoalFormData,
    title: '',
  },
  longTitle: {
    ...mockGoalFormData,
    title: 'a'.repeat(101), // 100文字を超える
  },
  emptyDescription: {
    ...mockGoalFormData,
    description: '',
  },
  longDescription: {
    ...mockGoalFormData,
    description: 'a'.repeat(1001), // 1000文字を超える
  },
  pastDeadline: {
    ...mockGoalFormData,
    deadline: '2020-01-01', // 過去の日付
  },
  farFutureDeadline: {
    ...mockGoalFormData,
    deadline: '2030-01-01', // 1年以上先
  },
  emptyBackground: {
    ...mockGoalFormData,
    background: '',
  },
  longBackground: {
    ...mockGoalFormData,
    background: 'a'.repeat(501), // 500文字を超える
  },
  longConstraints: {
    ...mockGoalFormData,
    constraints: 'a'.repeat(501), // 500文字を超える
  },
};

/**
 * フォーム入力のヘルパー関数
 */
export const formHelpers = {
  /**
   * タイトルフィールドに入力
   */
  fillTitle: async (value: string) => {
    const user = userEvent.setup();
    const titleInput = screen.getByLabelText(/目標タイトル/i);
    await user.clear(titleInput);
    await user.type(titleInput, value);
    return titleInput;
  },

  /**
   * 説明フィールドに入力
   */
  fillDescription: async (value: string) => {
    const user = userEvent.setup();
    const descriptionInput = screen.getByLabelText(/目標説明/i);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, value);
    return descriptionInput;
  },

  /**
   * 期限フィールドに入力
   */
  fillDeadline: async (value: string) => {
    const user = userEvent.setup();
    const deadlineInput = screen.getByLabelText(/達成期限/i);
    await user.clear(deadlineInput);
    await user.type(deadlineInput, value);
    return deadlineInput;
  },

  /**
   * 背景フィールドに入力
   */
  fillBackground: async (value: string) => {
    const user = userEvent.setup();
    const backgroundInput = screen.getByLabelText(/背景/i);
    await user.clear(backgroundInput);
    await user.type(backgroundInput, value);
    return backgroundInput;
  },

  /**
   * 制約事項フィールドに入力
   */
  fillConstraints: async (value: string) => {
    const user = userEvent.setup();
    const constraintsInput = screen.getByLabelText(/制約事項/i);
    await user.clear(constraintsInput);
    await user.type(constraintsInput, value);
    return constraintsInput;
  },

  /**
   * 全フィールドに入力
   */
  fillAllFields: async (data: GoalFormData) => {
    await formHelpers.fillTitle(data.title);
    await formHelpers.fillDescription(data.description);
    await formHelpers.fillDeadline(data.deadline);
    await formHelpers.fillBackground(data.background);
    if (data.constraints) {
      await formHelpers.fillConstraints(data.constraints);
    }
  },

  /**
   * フォーム送信
   */
  submitForm: async () => {
    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: /AI生成開始/i });
    await user.click(submitButton);
  },

  /**
   * 下書き保存
   */
  saveDraft: async () => {
    const user = userEvent.setup();
    const draftButton = screen.getByRole('button', { name: /下書き保存/i });
    await user.click(draftButton);
  },
};

/**
 * アサーション用のヘルパー関数
 */
export const assertions = {
  /**
   * エラーメッセージが表示されているかチェック
   */
  expectErrorMessage: (message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  },

  /**
   * エラーメッセージが表示されていないかチェック
   */
  expectNoErrorMessage: (message: string) => {
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  },

  /**
   * 文字数カウンターの値をチェック
   */
  expectCharacterCount: (current: number, max: number) => {
    expect(screen.getByText(`${current}/${max}`)).toBeInTheDocument();
  },

  /**
   * ボタンが有効/無効かチェック
   */
  expectButtonEnabled: (buttonName: string, enabled: boolean = true) => {
    const button = screen.getByRole('button', { name: new RegExp(buttonName, 'i') });
    if (enabled) {
      expect(button).toBeEnabled();
    } else {
      expect(button).toBeDisabled();
    }
  },

  /**
   * フィールドの値をチェック
   */
  expectFieldValue: (labelText: string, value: string) => {
    const field = screen.getByLabelText(new RegExp(labelText, 'i'));
    expect(field).toHaveValue(value);
  },
};

/**
 * モック関数のファクトリー
 */
export const createMockHandlers = () => {
  return {
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onDraftSave: jest.fn().mockResolvedValue(undefined),
  };
};

/**
 * 日付関連のテストユーティリティ
 */
export const dateTestUtils = {
  /**
   * 今日の日付を YYYY-MM-DD 形式で取得
   */
  getTodayString: (): string => {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * 指定日数後の日付を YYYY-MM-DD 形式で取得
   */
  getDateAfterDays: (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  },

  /**
   * 指定日数前の日付を YYYY-MM-DD 形式で取得
   */
  getDateBeforeDays: (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  },

  /**
   * 1年後の日付を YYYY-MM-DD 形式で取得
   */
  getOneYearLaterString: (): string => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  },
};

/**
 * 文字数テスト用のユーティリティ
 */
export const characterTestUtils = {
  /**
   * 指定文字数の文字列を生成
   */
  generateString: (length: number, char: string = 'a'): string => {
    return char.repeat(length);
  },

  /**
   * 各フィールドの制限文字数
   */
  limits: {
    title: 100,
    description: 1000,
    background: 500,
    constraints: 500,
  },

  /**
   * 警告しきい値（80%）
   */
  warningThresholds: {
    title: 80,
    description: 800,
    background: 400,
    constraints: 400,
  },
};
