import { PrismaClient } from '../generated/prisma-client';
import { logger } from '../utils/logger';

/**
 * 変更内容を表す型
 */
export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * 2つのオブジェクト間の差分を計算する
 * @param oldData 古いデータ
 * @param newData 新しいデータ
 * @param ignoreFields 無視するフィールド名の配列
 * @returns 変更内容の配列
 */
export function calculateChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  ignoreFields: string[] = [
    'id',
    'userId',
    'goalId',
    'subGoalId',
    'actionId',
    'createdAt',
    'updatedAt',
    'progress',
    'status',
  ]
): Change[] {
  const changes: Change[] = [];

  // 新しいデータの全フィールドをチェック
  for (const key in newData) {
    // 無視するフィールドはスキップ
    if (ignoreFields.includes(key)) {
      continue;
    }

    const oldValue = oldData[key];
    const newValue = newData[key];

    // 値が変更されているかチェック
    if (!isEqual(oldValue, newValue)) {
      changes.push({
        field: key,
        oldValue: serializeValue(oldValue),
        newValue: serializeValue(newValue),
      });
    }
  }

  return changes;
}

/**
 * 2つの値が等しいかチェック
 */
function isEqual(a: any, b: any): boolean {
  // 両方nullまたはundefinedの場合
  if (a == null && b == null) {
    return true;
  }

  // 片方だけnullまたはundefinedの場合
  if (a == null || b == null) {
    return false;
  }

  // Date型の場合
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // プリミティブ型の場合
  if (typeof a !== 'object' && typeof b !== 'object') {
    return a === b;
  }

  // オブジェクトの場合は文字列化して比較
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 値をシリアライズ（JSON保存用）
 */
function serializeValue(value: any): any {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === undefined) {
    return null;
  }
  return value;
}

/**
 * 変更履歴をデータベースに記録する
 * @param prisma Prismaクライアント
 * @param entityType エンティティタイプ ('goal' | 'subgoal' | 'action')
 * @param entityId エンティティID
 * @param userId ユーザーID
 * @param changes 変更内容の配列
 * @returns 作成された変更履歴レコード
 */
export async function recordChangeHistory(
  prisma: PrismaClient,
  entityType: 'goal' | 'subgoal' | 'action',
  entityId: string,
  userId: string,
  changes: Change[]
) {
  // 変更がない場合は記録しない
  if (changes.length === 0) {
    logger.info('No changes to record', { entityType, entityId, userId });
    return null;
  }

  try {
    const changeHistory = await prisma.changeHistory.create({
      data: {
        entityType,
        entityId,
        userId,
        changes: changes as any, // Prisma JsonValue型にキャスト
      },
    });

    logger.info('Change history recorded', {
      historyId: changeHistory.id,
      entityType,
      entityId,
      userId,
      changesCount: changes.length,
    });

    return changeHistory;
  } catch (error) {
    logger.error('Failed to record change history', {
      error: error instanceof Error ? error.message : String(error),
      entityType,
      entityId,
      userId,
    });
    throw error;
  }
}

/**
 * 変更履歴を記録するヘルパー関数（目標用）
 */
export async function recordGoalChange(
  prisma: PrismaClient,
  goalId: string,
  userId: string,
  oldData: any,
  newData: any
) {
  const changes = calculateChanges(oldData, newData);
  return recordChangeHistory(prisma, 'goal', goalId, userId, changes);
}

/**
 * 変更履歴を記録するヘルパー関数（サブ目標用）
 */
export async function recordSubGoalChange(
  prisma: PrismaClient,
  subGoalId: string,
  userId: string,
  oldData: any,
  newData: any
) {
  const changes = calculateChanges(oldData, newData);
  return recordChangeHistory(prisma, 'subgoal', subGoalId, userId, changes);
}

/**
 * 変更履歴を記録するヘルパー関数（アクション用）
 */
export async function recordActionChange(
  prisma: PrismaClient,
  actionId: string,
  userId: string,
  oldData: any,
  newData: any
) {
  const changes = calculateChanges(oldData, newData);
  return recordChangeHistory(prisma, 'action', actionId, userId, changes);
}
