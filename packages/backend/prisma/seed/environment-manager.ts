import { PrismaClient } from '@prisma/client';
import { SeedDataSet } from './types';
import { SeedManager } from './manager';
import { developmentDataSet } from './data/development';
import { testDataSet } from './data/test';

export class EnvironmentManager {
  private dataSets: Map<string, SeedDataSet> = new Map();
  private prismaClients: Map<string, PrismaClient> = new Map();

  constructor() {
    // デフォルトデータセットを登録
    this.registerDataSet('dev', developmentDataSet);
    this.registerDataSet('test', testDataSet);
  }

  registerDataSet(environment: string, dataSet: SeedDataSet): void {
    this.dataSets.set(environment, dataSet);
  }

  private getPrismaClient(environment: string): PrismaClient {
    if (!this.prismaClients.has(environment)) {
      // 環境別のデータベースURL設定（必要に応じて）
      const client = new PrismaClient({
        datasources: {
          db: {
            url: this.getDatabaseUrl(environment),
          },
        },
      });
      this.prismaClients.set(environment, client);
    }
    return this.prismaClients.get(environment)!;
  }

  private getDatabaseUrl(environment: string): string {
    // 環境別のデータベースURL取得
    const baseUrl =
      process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/goal_mandala';

    switch (environment) {
      case 'test':
        return (
          process.env.TEST_DATABASE_URL || baseUrl.replace('/goal_mandala', '/goal_mandala_test')
        );
      case 'demo':
        return (
          process.env.DEMO_DATABASE_URL || baseUrl.replace('/goal_mandala', '/goal_mandala_demo')
        );
      case 'performance':
        return (
          process.env.PERF_DATABASE_URL || baseUrl.replace('/goal_mandala', '/goal_mandala_perf')
        );
      default:
        return baseUrl;
    }
  }

  async deployToEnvironment(environment: string): Promise<void> {
    const dataSet = this.dataSets.get(environment);
    if (!dataSet) {
      throw new Error(`データセットが見つかりません: ${environment}`);
    }

    console.log(`環境 "${environment}" にデータセット "${dataSet.name}" をデプロイ中...`);

    const prismaClient = this.getPrismaClient(environment);
    const seedManager = new SeedManager(prismaClient);

    try {
      await seedManager.seedDatabase(dataSet);
      console.log(`環境 "${environment}" へのデプロイ完了`);
    } finally {
      await prismaClient.$disconnect();
    }
  }

  async listEnvironments(): Promise<string[]> {
    return Array.from(this.dataSets.keys());
  }

  async getDataSetInfo(environment: string): Promise<SeedDataSet | null> {
    return this.dataSets.get(environment) || null;
  }

  async cleanup(): Promise<void> {
    // 全てのPrismaクライアントを切断
    for (const client of this.prismaClients.values()) {
      await client.$disconnect();
    }
    this.prismaClients.clear();
  }
}
