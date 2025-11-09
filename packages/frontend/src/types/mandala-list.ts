// Mandala List component types

import { GoalStatus } from './mandala';

// 再エクスポート
export { GoalStatus } from './mandala';

/**
 * マンダラチャート一覧画面で使用する型定義
 */

/**
 * マンダラチャートサマリー
 * 一覧画面で表示するマンダラチャートの概要情報
 */
export interface MandalaChartSummary {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  status: GoalStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ソートオプション
 */
export type SortOption =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'deadline_asc'
  | 'deadline_desc'
  | 'progress_desc'
  | 'progress_asc';

/**
 * マンダラチャート一覧取得パラメータ
 */
export interface GoalsListParams {
  search?: string;
  status?: GoalStatus;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

/**
 * マンダラチャート一覧取得レスポンス
 */
export interface GoalsListResponse {
  success: boolean;
  data: MandalaChartSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
