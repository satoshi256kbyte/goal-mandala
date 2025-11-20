import { PrismaClient, Task, TaskStatus } from '../generated/prisma-client';
import { TaskFilters } from './task.service';

/**
 * 保存済みビュー
 */
export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filters: TaskFilters;
  searchQuery?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * フィルターサービスインターフェース
 */
export interface IFilterService {
  /**
   * タスクにフィルターを適用
   */
  applyFilters(tasks: Task[], filters: TaskFilters): Task[];

  /**
   * タスクを検索
   */
  searchTasks(tasks: Task[], query: string): Task[];

  /**
   * ビューを保存
   */
  saveView(userId: string, name: string, filters: TaskFilters, query?: string): Promise<SavedView>;

  /**
   * 保存済みビューを取得
   */
  getSavedViews(userId: string): Promise<SavedView[]>;

  /**
   * 保存済みビューを削除
   */
  deleteSavedView(viewId: string, userId: string): Promise<void>;

  /**
   * マッチしたキーワードをハイライト
   */
  highlightMatches(text: string, query: string): string;
}

/**
 * フィルターサービス実装
 */
export class FilterService implements IFilterService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * タスクにフィルターを適用
   */
  applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
    let filteredTasks = [...tasks];

    // 状態フィルター
    if (filters.statuses && filters.statuses.length > 0) {
      filteredTasks = filteredTasks.filter(task => filters.statuses!.includes(task.status));
    }

    // 期限フィルター
    if (filters.deadlineRange) {
      const now = new Date();

      switch (filters.deadlineRange) {
        case 'today': {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          filteredTasks = filteredTasks.filter(
            task => task.deadline && task.deadline >= startOfDay && task.deadline <= endOfDay
          );
          break;
        }
        case 'this_week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          filteredTasks = filteredTasks.filter(
            task => task.deadline && task.deadline >= startOfWeek && task.deadline <= endOfWeek
          );
          break;
        }
        case 'overdue': {
          filteredTasks = filteredTasks.filter(
            task => task.deadline && task.deadline < now && task.status !== TaskStatus.COMPLETED
          );
          break;
        }
        case 'custom': {
          if (filters.customDeadlineStart && filters.customDeadlineEnd) {
            filteredTasks = filteredTasks.filter(
              task =>
                task.deadline &&
                task.deadline >= filters.customDeadlineStart! &&
                task.deadline <= filters.customDeadlineEnd!
            );
          }
          break;
        }
      }
    }

    // アクションIDフィルター
    if (filters.actionIds && filters.actionIds.length > 0) {
      filteredTasks = filteredTasks.filter(task => filters.actionIds!.includes(task.actionId));
    }

    return filteredTasks;
  }

  /**
   * タスクを検索
   */
  searchTasks(tasks: Task[], query: string): Task[] {
    if (!query.trim()) {
      return tasks;
    }

    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(keyword => keyword.length > 0);

    return tasks.filter(task => {
      const searchText = `${task.title} ${task.description || ''}`.toLowerCase();

      // 全てのキーワードが含まれているかチェック
      return keywords.every(keyword => searchText.includes(keyword));
    });
  }

  /**
   * ビューを保存
   */
  async saveView(
    userId: string,
    name: string,
    filters: TaskFilters,
    query?: string
  ): Promise<SavedView> {
    const savedView = await this.prisma.savedView.create({
      data: {
        userId,
        name,
        filters: JSON.stringify(filters),
        searchQuery: query || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      ...savedView,
      filters: JSON.parse(savedView.filters),
    };
  }

  /**
   * 保存済みビューを取得
   */
  async getSavedViews(userId: string): Promise<SavedView[]> {
    const savedViews = await this.prisma.savedView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return savedViews.map(
      (view: {
        id: string;
        userId: string;
        name: string;
        filters: string;
        searchQuery?: string;
        createdAt: Date;
        updatedAt: Date;
      }) => ({
        ...view,
        filters: JSON.parse(view.filters),
      })
    );
  }

  /**
   * 保存済みビューを削除
   */
  async deleteSavedView(viewId: string, userId: string): Promise<void> {
    // ビューの所有者確認
    const existingView = await this.prisma.savedView.findUnique({
      where: { id: viewId },
    });

    if (!existingView) {
      throw new Error('Saved view not found');
    }

    if (existingView.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete saved view owned by other user');
    }

    await this.prisma.savedView.delete({
      where: { id: viewId },
    });
  }

  /**
   * マッチしたキーワードをハイライト
   */
  highlightMatches(text: string, query: string): string {
    if (!query.trim()) {
      return text;
    }

    const keywords = query
      .split(/\s+/)
      .filter(keyword => keyword.length > 0)
      .sort((a, b) => b.length - a.length); // 長いキーワードから処理

    let highlightedText = text;

    keywords.forEach(keyword => {
      // 正規表現の特殊文字をエスケープ
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  }
}
