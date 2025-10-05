/**
 * ResponseParserのテスト
 */

import { ResponseParser } from '../response-parser.js';

describe('ResponseParser', () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  describe('parseSubGoals', () => {
    it('正常なサブ目標レスポンスを解析する', () => {
      const response = JSON.stringify({
        subGoals: Array.from({ length: 8 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          description: `説明${i + 1}`,
          background: `背景${i + 1}`,
          position: i,
        })),
      });

      const result = parser.parseSubGoals(response);

      expect(result).toHaveLength(8);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('background');
      expect(result[0]).toHaveProperty('position');
    });

    it('マークダウンコードブロックを含むレスポンスを解析する', () => {
      const response = `\`\`\`json
{
  "subGoals": ${JSON.stringify(
    Array.from({ length: 8 }, (_, i) => ({
      title: `サブ目標${i + 1}`,
      description: `説明${i + 1}`,
      background: `背景${i + 1}`,
      position: i,
    }))
  )}
}
\`\`\``;

      const result = parser.parseSubGoals(response);

      expect(result).toHaveLength(8);
    });

    it('サブ目標が8個でない場合はエラーをスローする', () => {
      const response = JSON.stringify({
        subGoals: Array.from({ length: 5 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          description: `説明${i + 1}`,
          background: `背景${i + 1}`,
          position: i,
        })),
      });

      expect(() => parser.parseSubGoals(response)).toThrow('8個である必要があります');
    });

    it('不正なJSONの場合はエラーをスローする', () => {
      const response = 'Invalid JSON';

      expect(() => parser.parseSubGoals(response)).toThrow('JSON解析に失敗しました');
    });

    it('必須フィールドが欠けている場合はエラーをスローする', () => {
      const response = JSON.stringify({
        subGoals: Array.from({ length: 8 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          // descriptionが欠けている
          background: `背景${i + 1}`,
          position: i,
        })),
      });

      expect(() => parser.parseSubGoals(response)).toThrow();
    });
  });

  describe('parseActions', () => {
    it('正常なアクションレスポンスを解析する', () => {
      const response = JSON.stringify({
        actions: Array.from({ length: 8 }, (_, i) => ({
          title: `アクション${i + 1}`,
          description: `説明${i + 1}`,
          type: i % 2 === 0 ? 'execution' : 'habit',
          background: `背景${i + 1}`,
          position: i,
        })),
      });

      const result = parser.parseActions(response);

      expect(result).toHaveLength(8);
      expect(result[0]).toHaveProperty('type');
      expect(['execution', 'habit']).toContain(result[0].type);
    });

    it('アクションが8個でない場合はエラーをスローする', () => {
      const response = JSON.stringify({
        actions: Array.from({ length: 6 }, (_, i) => ({
          title: `アクション${i + 1}`,
          description: `説明${i + 1}`,
          type: 'execution',
          background: `背景${i + 1}`,
          position: i,
        })),
      });

      expect(() => parser.parseActions(response)).toThrow('8個である必要があります');
    });

    it('不正なtypeの場合はエラーをスローする', () => {
      const response = JSON.stringify({
        actions: Array.from({ length: 8 }, (_, i) => ({
          title: `アクション${i + 1}`,
          description: `説明${i + 1}`,
          type: 'invalid',
          background: `背景${i + 1}`,
          position: i,
        })),
      });

      expect(() => parser.parseActions(response)).toThrow();
    });
  });

  describe('parseTasks', () => {
    it('正常なタスクレスポンスを解析する', () => {
      const response = JSON.stringify({
        tasks: Array.from({ length: 5 }, (_, i) => ({
          title: `タスク${i + 1}`,
          description: `説明${i + 1}`,
          type: 'execution',
          estimatedMinutes: 30,
        })),
      });

      const result = parser.parseTasks(response);

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('estimatedMinutes');
      expect(result[0].estimatedMinutes).toBe(30);
    });

    it('タスク数に制限がない', () => {
      const response = JSON.stringify({
        tasks: Array.from({ length: 10 }, (_, i) => ({
          title: `タスク${i + 1}`,
          description: `説明${i + 1}`,
          type: 'execution',
          estimatedMinutes: 30,
        })),
      });

      const result = parser.parseTasks(response);

      expect(result).toHaveLength(10);
    });

    it('estimatedMinutesが数値でない場合はエラーをスローする', () => {
      const response = JSON.stringify({
        tasks: [
          {
            title: 'タスク1',
            description: '説明1',
            type: 'execution',
            estimatedMinutes: 'invalid',
          },
        ],
      });

      expect(() => parser.parseTasks(response)).toThrow();
    });
  });

  describe('extractJSON', () => {
    it('通常のJSON文字列を解析する', () => {
      const response = JSON.stringify({ test: 'value' });
      const result = (parser as any).extractJSON(response);

      expect(result).toEqual({ test: 'value' });
    });

    it('マークダウンコードブロック（json指定）を解析する', () => {
      const response = '```json\n{"test": "value"}\n```';
      const result = (parser as any).extractJSON(response);

      expect(result).toEqual({ test: 'value' });
    });

    it('マークダウンコードブロック（言語指定なし）を解析する', () => {
      const response = '```\n{"test": "value"}\n```';
      const result = (parser as any).extractJSON(response);

      expect(result).toEqual({ test: 'value' });
    });

    it('前後に空白があっても解析できる', () => {
      const response = '  \n  {"test": "value"}  \n  ';
      const result = (parser as any).extractJSON(response);

      expect(result).toEqual({ test: 'value' });
    });
  });
});
