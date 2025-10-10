/**
 * データベース設定
 * Prismaクライアントのシングルトンインスタンスを提供
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

// Prismaクライアントのシングルトンインスタンス
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// アプリケーション終了時にデータベース接続をクローズ
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
