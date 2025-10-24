import { renderHook, act } from '@testing-library/react';
import {
  useDebounce,
  useThrottle,
  useMemoizedValidation,
  performanceMonitor,
} from '../performance';

describe('performance utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDebounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const { result } = renderHook(() => useDebounce(mockFn, 500));

      // Call multiple times quickly
      act(() => {
        result.current('arg1');
        result.current('arg2');
        result.current('arg3');
      });

      // Should not be called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should be called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should reset timer on new calls', () => {
      const mockFn = jest.fn();
      const { result } = renderHook(() => useDebounce(mockFn, 500));

      act(() => {
        result.current('arg1');
      });

      // Advance time partially
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Call again (should reset timer)
      act(() => {
        result.current('arg2');
      });

      // Advance time partially again
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not be called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Complete the delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should be called with last argument
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });
  });

  describe('useThrottle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const { result } = renderHook(() => useThrottle(mockFn, 500));

      // First call should execute immediately
      act(() => {
        result.current('arg1');
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      // Subsequent calls within delay should be ignored
      act(() => {
        result.current('arg2');
        result.current('arg3');
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // After delay, next call should execute
      act(() => {
        jest.advanceTimersByTime(500);
        result.current('arg4');
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('arg4');
    });
  });

  describe('useMemoizedValidation', () => {
    it('should memoize validation result', () => {
      const mockValidation = jest.fn(data => ({ isValid: data.length > 0 }));
      const { result, rerender } = renderHook(
        ({ data }) => useMemoizedValidation(data, mockValidation),
        { initialProps: { data: 'test' } }
      );

      // First render
      expect(result.current).toEqual({ isValid: true });
      expect(mockValidation).toHaveBeenCalledTimes(1);

      // Rerender with same data
      rerender({ data: 'test' });
      expect(mockValidation).toHaveBeenCalledTimes(1); // Should not call again

      // Rerender with different data
      rerender({ data: '' });
      expect(result.current).toEqual({ isValid: false });
      expect(mockValidation).toHaveBeenCalledTimes(2);
    });
  });

  describe('performanceMonitor', () => {
    describe('measureRenderTime', () => {
      it('should measure and log render time in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const endMeasurement = performanceMonitor.measureRenderTime('TestComponent');
        const renderTime = endMeasurement();

        expect(typeof renderTime).toBe('number');
        expect(renderTime).toBeGreaterThanOrEqual(0);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('TestComponent render time:')
        );

        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      });

      it('should not log in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const endMeasurement = performanceMonitor.measureRenderTime('TestComponent');
        endMeasurement();

        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('measureApiCall', () => {
      it('should measure successful API call time', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mockApiCall = jest.fn().mockResolvedValue('success');

        const result = await performanceMonitor.measureApiCall(mockApiCall, 'TestAPI');

        expect(result).toBe('success');
        expect(mockApiCall).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TestAPI API call time:'));

        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      });

      it('should measure failed API call time', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));

        await expect(performanceMonitor.measureApiCall(mockApiCall, 'TestAPI')).rejects.toThrow(
          'API Error'
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('TestAPI API call failed after:')
        );

        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      });
    });
  });
});
