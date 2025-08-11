// バックエンドAPIのエントリーポイント
import { User, Goal } from '../shared/src';

export * from './handlers';
export * from './services';
export * from './middleware';
export * from './utils';

// 型参照のテスト
export type { User, Goal };
