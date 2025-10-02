/**
 * 差分検出ユーティリティ
 */

/**
 * 差分の種類
 */
export enum DiffType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
  UNCHANGED = 'unchanged',
}

/**
 * 差分情報
 */
export interface DiffInfo {
  type: DiffType;
  path: string;
  oldValue?: any;
  newValue?: any;
}

/**
 * 差分検出結果
 */
export interface DiffResult {
  hasChanges: boolean;
  changes: DiffInfo[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * 高速な浅い比較
 */
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

/**
 * 深い比較（最適化版）
 */
export const deepEqual = (obj1: any, obj2: any, maxDepth = 10, currentDepth = 0): boolean => {
  // 最大深度チェック
  if (currentDepth > maxDepth) {
    console.warn('Maximum depth reached in deepEqual comparison');
    return obj1 === obj2;
  }

  // 同一参照チェック
  if (obj1 === obj2) return true;

  // null/undefined チェック
  if (obj1 == null || obj2 == null) return obj1 === obj2;

  // 型チェック
  if (typeof obj1 !== typeof obj2) return false;

  // プリミティブ型の場合
  if (typeof obj1 !== 'object') return obj1 === obj2;

  // 配列チェック
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  // 配列の場合
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;

    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i], maxDepth, currentDepth + 1)) {
        return false;
      }
    }

    return true;
  }

  // オブジェクトの場合
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key], maxDepth, currentDepth + 1)) {
      return false;
    }
  }

  return true;
};

/**
 * 詳細な差分検出
 */
export const detectDetailedDiff = (
  oldObj: any,
  newObj: any,
  path = '',
  maxDepth = 10,
  currentDepth = 0
): DiffInfo[] => {
  const diffs: DiffInfo[] = [];

  // 最大深度チェック
  if (currentDepth > maxDepth) {
    return diffs;
  }

  // 同一参照の場合
  if (oldObj === newObj) {
    return diffs;
  }

  // null/undefined の場合
  if (oldObj == null && newObj == null) {
    return diffs;
  }

  if (oldObj == null) {
    diffs.push({
      type: DiffType.ADDED,
      path,
      newValue: newObj,
    });
    return diffs;
  }

  if (newObj == null) {
    diffs.push({
      type: DiffType.REMOVED,
      path,
      oldValue: oldObj,
    });
    return diffs;
  }

  // 型が異なる場合
  if (typeof oldObj !== typeof newObj) {
    diffs.push({
      type: DiffType.MODIFIED,
      path,
      oldValue: oldObj,
      newValue: newObj,
    });
    return diffs;
  }

  // プリミティブ型の場合
  if (typeof oldObj !== 'object') {
    if (oldObj !== newObj) {
      diffs.push({
        type: DiffType.MODIFIED,
        path,
        oldValue: oldObj,
        newValue: newObj,
      });
    }
    return diffs;
  }

  // 配列の場合
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    const maxLength = Math.max(oldObj.length, newObj.length);

    for (let i = 0; i < maxLength; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;

      if (i >= oldObj.length) {
        diffs.push({
          type: DiffType.ADDED,
          path: itemPath,
          newValue: newObj[i],
        });
      } else if (i >= newObj.length) {
        diffs.push({
          type: DiffType.REMOVED,
          path: itemPath,
          oldValue: oldObj[i],
        });
      } else {
        const itemDiffs = detectDetailedDiff(
          oldObj[i],
          newObj[i],
          itemPath,
          maxDepth,
          currentDepth + 1
        );
        diffs.push(...itemDiffs);
      }
    }

    return diffs;
  }

  // オブジェクトの場合
  if (Array.isArray(oldObj) !== Array.isArray(newObj)) {
    diffs.push({
      type: DiffType.MODIFIED,
      path,
      oldValue: oldObj,
      newValue: newObj,
    });
    return diffs;
  }

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;

    if (!(key in oldObj)) {
      diffs.push({
        type: DiffType.ADDED,
        path: keyPath,
        newValue: newObj[key],
      });
    } else if (!(key in newObj)) {
      diffs.push({
        type: DiffType.REMOVED,
        path: keyPath,
        oldValue: oldObj[key],
      });
    } else {
      const keyDiffs = detectDetailedDiff(
        oldObj[key],
        newObj[key],
        keyPath,
        maxDepth,
        currentDepth + 1
      );
      diffs.push(...keyDiffs);
    }
  }

  return diffs;
};

/**
 * 差分検出（結果付き）
 */
export const detectDiff = (oldObj: any, newObj: any, maxDepth = 10): DiffResult => {
  const changes = detectDetailedDiff(oldObj, newObj, '', maxDepth);

  const summary = {
    added: changes.filter(c => c.type === DiffType.ADDED).length,
    removed: changes.filter(c => c.type === DiffType.REMOVED).length,
    modified: changes.filter(c => c.type === DiffType.MODIFIED).length,
  };

  return {
    hasChanges: changes.length > 0,
    changes,
    summary,
  };
};

/**
 * 特定のフィールドのみの差分検出
 */
export const detectFieldDiff = (oldObj: any, newObj: any, fields: string[]): DiffResult => {
  const filteredOld: any = {};
  const filteredNew: any = {};

  for (const field of fields) {
    if (field in oldObj) {
      filteredOld[field] = oldObj[field];
    }
    if (field in newObj) {
      filteredNew[field] = newObj[field];
    }
  }

  return detectDiff(filteredOld, filteredNew);
};

/**
 * 配列の差分検出（順序を考慮）
 */
export const detectArrayDiff = <T>(
  oldArray: T[],
  newArray: T[],
  keyExtractor: (item: T) => string
): DiffResult => {
  const changes: DiffInfo[] = [];

  // キーベースのマップを作成
  const oldMap = new Map(oldArray.map(item => [keyExtractor(item), item]));
  const newMap = new Map(newArray.map(item => [keyExtractor(item), item]));

  // 削除されたアイテム
  for (const [key, item] of oldMap) {
    if (!newMap.has(key)) {
      changes.push({
        type: DiffType.REMOVED,
        path: `[${key}]`,
        oldValue: item,
      });
    }
  }

  // 追加されたアイテム
  for (const [key, item] of newMap) {
    if (!oldMap.has(key)) {
      changes.push({
        type: DiffType.ADDED,
        path: `[${key}]`,
        newValue: item,
      });
    }
  }

  // 変更されたアイテム
  for (const [key, newItem] of newMap) {
    const oldItem = oldMap.get(key);
    if (oldItem && !deepEqual(oldItem, newItem)) {
      changes.push({
        type: DiffType.MODIFIED,
        path: `[${key}]`,
        oldValue: oldItem,
        newValue: newItem,
      });
    }
  }

  const summary = {
    added: changes.filter(c => c.type === DiffType.ADDED).length,
    removed: changes.filter(c => c.type === DiffType.REMOVED).length,
    modified: changes.filter(c => c.type === DiffType.MODIFIED).length,
  };

  return {
    hasChanges: changes.length > 0,
    changes,
    summary,
  };
};

/**
 * 差分のマージ
 */
export const mergeDiffs = (...diffResults: DiffResult[]): DiffResult => {
  const allChanges: DiffInfo[] = [];
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalModified = 0;

  for (const result of diffResults) {
    allChanges.push(...result.changes);
    totalAdded += result.summary.added;
    totalRemoved += result.summary.removed;
    totalModified += result.summary.modified;
  }

  return {
    hasChanges: allChanges.length > 0,
    changes: allChanges,
    summary: {
      added: totalAdded,
      removed: totalRemoved,
      modified: totalModified,
    },
  };
};

/**
 * 差分の適用
 */
export const applyDiff = (baseObj: any, diffs: DiffInfo[]): any => {
  const result = JSON.parse(JSON.stringify(baseObj)); // ディープコピー

  for (const diff of diffs) {
    const pathParts = diff.path.split(/[.\\[\\]]/).filter(Boolean);

    if (pathParts.length === 0) continue;

    let current = result;

    // パスの最後の要素まで辿る
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];

      if (!(part in current)) {
        current[part] = {};
      }

      current = current[part];
    }

    const lastPart = pathParts[pathParts.length - 1];

    switch (diff.type) {
      case DiffType.ADDED:
      case DiffType.MODIFIED:
        current[lastPart] = diff.newValue;
        break;
      case DiffType.REMOVED:
        delete current[lastPart];
        break;
    }
  }

  return result;
};

/**
 * 差分のサイズ計算（バイト数）
 */
export const calculateDiffSize = (diff: DiffResult): number => {
  const jsonString = JSON.stringify(diff);
  return new Blob([jsonString]).size;
};

/**
 * 差分の圧縮率計算
 */
export const calculateCompressionRatio = (original: any, diff: DiffResult): number => {
  const originalSize = new Blob([JSON.stringify(original)]).size;
  const diffSize = calculateDiffSize(diff);

  return diffSize / originalSize;
};
