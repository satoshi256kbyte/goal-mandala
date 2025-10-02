import '@testing-library/jest-dom';
import { expect, beforeEach, afterEach, vi } from 'vitest';

// Vitestのグローバル関数をグローバルスコープに追加
Object.assign(globalThis, { expect, beforeEach, afterEach, vi, jest: vi });
