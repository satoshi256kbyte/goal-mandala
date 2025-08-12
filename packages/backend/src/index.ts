// バックエンドAPIのエントリーポイント
import { User, Goal } from '@goal-mandala/shared';

export * from './handlers';
export * from './services';
export * from './middleware';
export * from './utils';

// 型参照のテスト
export type { User, Goal };
