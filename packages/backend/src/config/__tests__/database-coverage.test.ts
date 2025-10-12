/**
 * database設定のカバレッジ改善テスト
 * 注意: 現在のdatabase.tsはシンプルなPrismaクライアントのエクスポートのみを行っているため、
 * 特別なテストは不要です。実際のデータベース接続テストは統合テストで行います。
 */

import { prisma } from '../database';

describe('Database Coverage Tests', () => {
  it('prisma - Prismaクライアントが正しくエクスポートされている', () => {
    expect(prisma).toBeDefined();
    expect(prisma.$connect).toBeDefined();
    expect(prisma.$disconnect).toBeDefined();
  });
});
