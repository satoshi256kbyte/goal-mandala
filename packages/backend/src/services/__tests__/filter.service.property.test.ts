import * as fc from 'fast-check';
import { FilterService } from '../filter.service';
import { PrismaClient, TaskStatus } from '../../generated/prisma-client';
import { taskArbitrary, taskFiltersArbitrary } from '../../__tests__/utils/task-arbitraries';

// Prismaクライアントのモック
const mockPrisma = {
  savedView: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

describe('Filter Service Property-Based Tests', () => {
  let filterService: FilterService;

  beforeEach(() => {
    jest.clearAllMocks();
    filterService = new FilterService(mockPrisma);
  });

  /**
   * Feature: task-management, Property 12: 検索の正確性
   * Validates: Requirements 7.1
   *
   * For any キーワードとタスクセット、検索結果には、
   * titleまたはdescriptionにキーワードを含むタスクのみが含まれる
   */
  describe('Property 12: 検索の正確性', () => {
    it('should return only tasks containing the keyword in title or description', async () => {
      await fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (tasks, keyword) => {
            // Execute: 検索を実行
            const result = filterService.searchTasks(tasks, keyword);

            // Verify: 全ての結果がキーワードを含む
            result.forEach(task => {
              const titleMatch = task.title.toLowerCase().includes(keyword.toLowerCase());
              const descriptionMatch =
                task.description?.toLowerCase().includes(keyword.toLowerCase()) || false;
              expect(titleMatch || descriptionMatch).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 13: 複数キーワード検索の正確性
   * Validates: Requirements 7.2
   *
   * For any 複数のキーワードとタスクセット、検索結果には、
   * 全てのキーワードをtitleまたはdescriptionに含むタスクのみが含まれる
   */
  describe('Property 13: 複数キーワード検索の正確性', () => {
    it('should return only tasks containing all keywords', async () => {
      await fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
          (tasks, keywords) => {
            // Execute: 複数キーワードで検索（スペース区切り）
            const searchQuery = keywords.join(' ');
            const result = filterService.searchTasks(tasks, searchQuery);

            // Verify: 全ての結果が全てのキーワードを含む
            result.forEach(task => {
              keywords.forEach(keyword => {
                const titleMatch = task.title.toLowerCase().includes(keyword.toLowerCase());
                const descriptionMatch =
                  task.description?.toLowerCase().includes(keyword.toLowerCase()) || false;
                expect(titleMatch || descriptionMatch).toBe(true);
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 14: 検索クリアの完全性
   * Validates: Requirements 7.3
   *
   * For any タスクセット、検索クエリをクリアした場合、
   * フィルター前の全タスクが表示される
   */
  describe('Property 14: 検索クリアの完全性', () => {
    it('should return all tasks when search query is cleared', async () => {
      await fc.assert(
        fc.property(fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }), tasks => {
          // Execute: 空の検索クエリで検索
          const result = filterService.searchTasks(tasks, '');

          // Verify: 全てのタスクが返される
          expect(result.length).toBe(tasks.length);
          expect(result).toEqual(tasks);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 15: キーワードハイライトの正確性
   * Validates: Requirements 7.4
   *
   * For any キーワードとテキスト、ハイライト処理後のテキストには、
   * キーワードに一致する全ての部分がハイライトマークアップで囲まれている
   */
  describe('Property 15: キーワードハイライトの正確性', () => {
    it('should highlight all keyword matches in text', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 5 }),
          (text, keyword) => {
            // Execute: ハイライト処理
            const result = filterService.highlightMatches(text, keyword);

            // Verify: キーワードが含まれる場合、ハイライトマークアップが存在する
            const lowerText = text.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();

            if (lowerText.includes(lowerKeyword)) {
              // ハイライトマークアップが存在することを確認
              expect(result).toContain('<mark>');
              expect(result).toContain('</mark>');

              // マークアップを除去したテキストが元のテキストと一致することを確認
              const withoutMarkup = result.replace(/<\/?mark>/g, '');
              expect(withoutMarkup).toBe(text);
            } else {
              // キーワードが含まれない場合、元のテキストがそのまま返される
              expect(result).toBe(text);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: task-management, Property 16: 保存済みビューのラウンドトリップ
   * Validates: Requirements 8.1-8.5
   *
   * For any ユーザー、ビュー名、フィルター、検索クエリ、
   * ビューを保存してから読み込んだ場合、
   * 読み込まれたフィルターと検索クエリは保存時と同じである
   */
  describe('Property 16: 保存済みビューのラウンドトリップ', () => {
    it('should preserve filters and search query in saved view round trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 255 }),
          taskFiltersArbitrary,
          fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
          async (userId, viewName, filters, searchQuery) => {
            // Setup: ビュー保存と取得をモック
            const savedView = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId,
              name: viewName,
              filters: JSON.stringify(filters),
              searchQuery,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockPrisma.savedView.create = jest.fn().mockResolvedValue(savedView);
            mockPrisma.savedView.findMany = jest.fn().mockResolvedValue([savedView]);

            // Execute: ビューを保存
            const createdView = await filterService.saveView(
              userId,
              viewName,
              filters,
              searchQuery
            );

            // Execute: ビューを取得
            const retrievedViews = await filterService.getSavedViews(userId);

            // Verify: 保存されたビューが取得できる
            expect(retrievedViews.length).toBeGreaterThan(0);

            const retrievedView = retrievedViews[0];

            // Verify: フィルターが保存時と同じ
            expect(JSON.parse(retrievedView.filters as string)).toEqual(filters);

            // Verify: 検索クエリが保存時と同じ
            expect(retrievedView.searchQuery).toBe(searchQuery);

            // Verify: ビュー名が保存時と同じ
            expect(retrievedView.name).toBe(viewName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
