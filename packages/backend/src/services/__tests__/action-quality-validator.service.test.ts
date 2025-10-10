/**
 * ActionQualityValidatorのテスト
 */

import { ActionQualityValidator } from '../action-quality-validator.service';
import { QualityError } from '../../errors/action-generation.errors';
import { ActionOutput, ActionType } from '../../types/action-generation.types';

describe('ActionQualityValidator', () => {
  let validator: ActionQualityValidator;

  beforeEach(() => {
    validator = new ActionQualityValidator();
  });

  describe('validateQuality', () => {
    it('8個の有効なアクションを検証できる', () => {
      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150), // 100-200文字の範囲内
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).not.toThrow();
    });

    it('7個のアクションでQualityErrorを投げる', () => {
      const actions: ActionOutput[] = Array.from({ length: 7 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).toThrow(QualityError);
      expect(() => validator.validateQuality(actions)).toThrow(
        'アクションは8個である必要があります（現在: 7個）'
      );
    });

    it('9個のアクションでQualityErrorを投げる', () => {
      const actions: ActionOutput[] = Array.from({ length: 9 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).toThrow(QualityError);
      expect(() => validator.validateQuality(actions)).toThrow(
        'アクションは8個である必要があります（現在: 9個）'
      );
    });

    it('タイトルが50文字を超える場合にQualityErrorを投げる', () => {
      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: i === 0 ? 'a'.repeat(51) : `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).toThrow(QualityError);
      expect(() => validator.validateQuality(actions)).toThrow(/タイトルが長すぎます/);
    });

    it('説明が100文字未満の場合にQualityErrorを投げる', () => {
      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: i === 0 ? 'a'.repeat(99) : 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).toThrow(QualityError);
      expect(() => validator.validateQuality(actions)).toThrow(/説明が短すぎます/);
    });

    it('説明が200文字を超える場合にQualityErrorを投げる', () => {
      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: i === 0 ? 'a'.repeat(201) : 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).toThrow(QualityError);
      expect(() => validator.validateQuality(actions)).toThrow(/説明が長すぎます/);
    });

    it('背景が100文字を超える場合にQualityErrorを投げる', () => {
      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: i === 0 ? 'a'.repeat(101) : '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      expect(() => validator.validateQuality(actions)).toThrow(QualityError);
      expect(() => validator.validateQuality(actions)).toThrow(/背景が長すぎます/);
    });

    it('重複するタイトルがある場合に警告ログを記録する', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: i < 2 ? '同じタイトル' : `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      validator.validateQuality(actions);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('警告: アクションのタイトルに重複があります')
      );

      consoleSpy.mockRestore();
    });

    it('類似度が高い説明がある場合に警告ログを記録する', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const similarDescription =
        'これは非常に似た説明文です。同じ単語を多く含んでいます。これは非常に似た説明文です。同じ単語を多く含んでいます。これは非常に似た説明文です。同じ単語を多く含んでいます。これは非常に似た説明文です。同じ。';

      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: i < 2 ? similarDescription : 'a'.repeat(150),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      validator.validateQuality(actions);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('警告: アクション1とアクション2の説明が類似しています')
      );

      consoleSpy.mockRestore();
    });

    it('類似度が閾値以下の場合は警告を出さない', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const actions: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: `これは異なる説明文${i}です。`.repeat(10) + 'a'.repeat(50),
        background: '背景説明',
        type: ActionType.EXECUTION,
        position: i,
      }));

      validator.validateQuality(actions);

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('類似しています'));

      consoleSpy.mockRestore();
    });
  });

  describe('calculateSimilarity', () => {
    it('完全に同じテキストの類似度は1.0', () => {
      const text = 'これはテストです';
      const similarity = validator.calculateSimilarity(text, text);
      expect(similarity).toBe(1.0);
    });

    it('完全に異なるテキストの類似度は0.0', () => {
      const text1 = 'これはテストです';
      const text2 = '全く違う内容';
      const similarity = validator.calculateSimilarity(text1, text2);
      expect(similarity).toBe(0.0);
    });

    it('部分的に重複するテキストの類似度を正しく計算する', () => {
      const text1 = 'これは テスト です';
      const text2 = 'これは サンプル です';
      const similarity = validator.calculateSimilarity(text1, text2);

      // 共通: これは, です (2個)
      // 全体: これは, テスト, です, サンプル (4個)
      // Jaccard係数 = 2/4 = 0.5
      expect(similarity).toBeCloseTo(0.5, 2);
    });

    it('空文字列の類似度は0.0', () => {
      const similarity = validator.calculateSimilarity('', '');
      expect(similarity).toBe(0.0);
    });

    it('一方が空文字列の場合の類似度は0.0', () => {
      const similarity = validator.calculateSimilarity('テスト', '');
      expect(similarity).toBe(0.0);
    });
  });
});
