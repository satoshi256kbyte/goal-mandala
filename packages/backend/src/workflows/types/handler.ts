/**
 * Lambda Handler Types
 *
 * Step Functions Lambda handlerの型定義を統一します。
 */

// Lambda handler の入力型（Step Functionsから渡される）
export type LambdaEvent = Record<string, unknown>;

// Lambda handler の出力型
export type LambdaResult = Record<string, unknown>;

// Lambda handler の型
export type LambdaHandler = (event: LambdaEvent) => Promise<LambdaResult>;

// Prisma の findMany 結果の型
export interface PrismaRecord {
  id: string;
  [key: string]: unknown;
}
