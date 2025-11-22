import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * requestAnimationFrameモックのユニットテスト
 * 要件: 1.1, 1.2, 1.3, 1.4
 */
describe('requestAnimationFrame モック', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('requestAnimationFrame', () => {
    it('コールバックが約16ms後に実行される', () => {
      const callback = vi.fn();

      requestAnimationFrame(callback);

      // 16ms経過前は実行されない
      vi.advanceTimersByTime(15);
      expect(callback).not.toHaveBeenCalled();

      // 16ms経過後に実行される
      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('コールバックにタイムスタンプが渡される', () => {
      const callback = vi.fn();

      requestAnimationFrame(callback);
      vi.advanceTimersByTime(16);

      expect(callback).toHaveBeenCalledWith(expect.any(Number));
      const timestamp = callback.mock.calls[0][0];
      expect(timestamp).toBeGreaterThan(0);
    });

    it('複数のrequestAnimationFrameが順番に実行される', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      requestAnimationFrame(callback1);
      requestAnimationFrame(callback2);
      requestAnimationFrame(callback3);

      vi.advanceTimersByTime(16);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('数値のIDを返す', () => {
      const id = requestAnimationFrame(() => {});

      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('異なるIDを返す', () => {
      const id1 = requestAnimationFrame(() => {});
      const id2 = requestAnimationFrame(() => {});
      const id3 = requestAnimationFrame(() => {});

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('cancelAnimationFrame', () => {
    it('requestAnimationFrameをキャンセルできる', () => {
      const callback = vi.fn();

      const id = requestAnimationFrame(callback);
      cancelAnimationFrame(id);

      vi.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });

    it('複数のrequestAnimationFrameのうち特定のものだけキャンセルできる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      const id1 = requestAnimationFrame(callback1);
      const id2 = requestAnimationFrame(callback2);
      const id3 = requestAnimationFrame(callback3);

      // id2だけキャンセル
      cancelAnimationFrame(id2);

      vi.advanceTimersByTime(16);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('存在しないIDをキャンセルしてもエラーにならない', () => {
      expect(() => {
        cancelAnimationFrame(99999);
      }).not.toThrow();
    });

    it('同じIDを複数回キャンセルしてもエラーにならない', () => {
      const id = requestAnimationFrame(() => {});

      expect(() => {
        cancelAnimationFrame(id);
        cancelAnimationFrame(id);
        cancelAnimationFrame(id);
      }).not.toThrow();
    });
  });

  describe('クリーンアップ', () => {
    it('実行後にタイマーが自動的にクリーンアップされる', () => {
      const callback = vi.fn();

      requestAnimationFrame(callback);
      vi.advanceTimersByTime(16);

      expect(callback).toHaveBeenCalledTimes(1);

      // タイマーが実行された後、再度時間を進めても実行されない
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('キャンセル後にタイマーがクリーンアップされる', () => {
      const callback = vi.fn();

      const id = requestAnimationFrame(callback);
      cancelAnimationFrame(id);

      // キャンセル後、時間を進めても実行されない
      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('ネストしたrequestAnimationFrame', () => {
    it('ネストしたrequestAnimationFrameが正しく動作する', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      requestAnimationFrame(() => {
        callback1();
        requestAnimationFrame(() => {
          callback2();
        });
      });

      // 最初のrequestAnimationFrameが実行される
      vi.advanceTimersByTime(16);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      // ネストしたrequestAnimationFrameが実行される
      vi.advanceTimersByTime(16);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('ネストしたrequestAnimationFrameをキャンセルできる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      let id2: number;

      requestAnimationFrame(() => {
        callback1();
        id2 = requestAnimationFrame(() => {
          callback2();
        });
      });

      // 最初のrequestAnimationFrameが実行される
      vi.advanceTimersByTime(16);
      expect(callback1).toHaveBeenCalledTimes(1);

      // ネストしたrequestAnimationFrameをキャンセル
      cancelAnimationFrame(id2!);

      vi.advanceTimersByTime(16);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のrequestAnimationFrameを処理できる', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());

      callbacks.forEach(callback => {
        requestAnimationFrame(callback);
      });

      vi.advanceTimersByTime(16);

      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    it('大量のキャンセルを処理できる', () => {
      const ids = Array.from({ length: 100 }, () => {
        return requestAnimationFrame(() => {});
      });

      expect(() => {
        ids.forEach(id => cancelAnimationFrame(id));
      }).not.toThrow();
    });
  });
});
