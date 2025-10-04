# 進捗履歴表示機能 設定ガイド

## 概要

進捗履歴表示機能は、過去の進捗変化をグラフで表示し、ユーザーが目標達成の軌跡を視覚的に確認できる機能です。このガイドでは、機能の設定方法と使用方法について説明します。

## 主要コンポーネント

### 1. ProgressHistoryService

進捗履歴データの管理を行うサービス

### 2. ProgressHistoryChart

Rechartsを使用した進捗履歴グラフコンポーネント

### 3. ProgressDetailModal

特定日付の詳細情報を表示するモーダル

## 基本セットアップ

### 1. 依存関係のインストール

```bash
npm install recharts date-fns
```

### 2. 基本的な実装

```tsx
import React, { useEffect, useState } from 'react';
import { ProgressHistoryChart } from '../components/common/ProgressHistoryChart';
import { progressHistoryService } from '../services/progress-history-service';

function ProgressHistoryView({ entityId, entityType }) {
  const [historyData, setHistoryData] = useState([]);
  const [significantChanges, setSignificantChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProgressHistory();
  }, [entityId, entityType]);

  const loadProgressHistory = async () => {
    try {
      setLoading(true);

      // 過去30日間の履歴を取得
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const history = await progressHistoryService.getProgressHistory({
        entityId,
        entityType,
        startDate,
        endDate,
        granularity: 'day',
      });

      // 重要な変化点を取得
      const changes = await progressHistoryService.getSignificantChanges(
        entityId,
        10 // 10%以上の変化を重要とする
      );

      setHistoryData(history);
      setSignificantChanges(changes);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProgressHistoryChart
      data={historyData}
      significantChanges={significantChanges}
      loading={loading}
      error={
        error
          ? {
              hasError: true,
              errorMessage: error.message,
              onRetry: loadProgressHistory,
            }
          : undefined
      }
      onDateClick={(date, progress) => {
        console.log(`${date}: ${progress}%`);
      }}
    />
  );
}
```

## 詳細設定

### 1. データ取得の設定

#### 履歴データの取得期間設定

```tsx
// 過去7日間
const getWeeklyHistory = async (entityId, entityType) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  return await progressHistoryService.getProgressHistory({
    entityId,
    entityType,
    startDate,
    endDate,
    granularity: 'day',
  });
};

// 過去3ヶ月間（週単位）
const getQuarterlyHistory = async (entityId, entityType) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  return await progressHistoryService.getProgressHistory({
    entityId,
    entityType,
    startDate,
    endDate,
    granularity: 'week',
  });
};
```

#### 重要な変化点の閾値設定

```tsx
// 5%以上の変化を重要とする
const minorChanges = await progressHistoryService.getSignificantChanges(
  entityId,
  5
);

// 20%以上の変化を重要とする
const majorChanges = await progressHistoryService.getSignificantChanges(
  entityId,
  20
);
```

### 2. チャートの外観設定

#### 基本的なカスタマイズ

```tsx
<ProgressHistoryChart
  data={historyData}
  height={400}
  showGrid={true}
  showTooltip={true}
  highlightSignificantChanges={true}
  colors={{
    line: '#3b82f6', // 青色のライン
    grid: '#e5e7eb', // グレーのグリッド
    significant: '#f59e0b', // オレンジの重要ポイント
  }}
  dateFormat="MM/dd"
/>
```

#### レスポンシブ対応

```tsx
function ResponsiveProgressHistory({ data }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ProgressHistoryChart
      data={data}
      height={windowWidth < 768 ? 250 : 400}
      dateFormat={windowWidth < 768 ? 'M/d' : 'MM/dd'}
      showGrid={windowWidth >= 768}
    />
  );
}
```

### 3. インタラクション機能の設定

#### 日付クリック時の詳細表示

```tsx
function InteractiveProgressHistory({ data }) {
  const [selectedEntry, setSelectedEntry] = useState(null);

  const handleDateClick = (date, progress) => {
    // 選択された日付のデータを取得
    const entry = data.find(
      item => item.timestamp.toDateString() === date.toDateString()
    );
    setSelectedEntry(entry);
  };

  return (
    <>
      <ProgressHistoryChart data={data} onDateClick={handleDateClick} />

      {selectedEntry && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium">
            {selectedEntry.timestamp.toLocaleDateString()}の詳細
          </h3>
          <p>進捗: {selectedEntry.progress}%</p>
          {selectedEntry.changeReason && (
            <p>変更理由: {selectedEntry.changeReason}</p>
          )}
        </div>
      )}
    </>
  );
}
```

### 4. データ分析機能の設定

#### 進捗トレンド分析

```tsx
function ProgressTrendAnalysis({ entityId }) {
  const [trendData, setTrendData] = useState(null);

  useEffect(() => {
    const analyzeTrend = async () => {
      const trend = await progressHistoryService.getProgressTrend(
        entityId,
        30 // 過去30日間
      );
      setTrendData(trend);
    };

    analyzeTrend();
  }, [entityId]);

  const getTrendMessage = trend => {
    if (!trend) return '';

    switch (trend.direction) {
      case 'increasing':
        return `順調に進捗しています（${trend.rate.toFixed(1)}%/日）`;
      case 'decreasing':
        return `進捗が停滞しています（${trend.rate.toFixed(1)}%/日）`;
      case 'stable':
        return '進捗は安定しています';
      default:
        return '';
    }
  };

  return (
    <div>
      {trendData && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            トレンド分析: {getTrendMessage(trendData)}
          </p>
          <p className="text-xs text-gray-500">
            信頼度: {(trendData.confidence * 100).toFixed(0)}%
          </p>
        </div>
      )}

      <ProgressHistoryChart data={historyData} />
    </div>
  );
}
```

## 高度な設定

### 1. カスタムツールチップ

```tsx
function CustomProgressHistory({ data }) {
  const customTooltipContent = entry => (
    <div className="bg-white p-3 border rounded shadow-lg">
      <h4 className="font-medium">{entry.timestamp.toLocaleDateString()}</h4>
      <p>進捗: {entry.progress}%</p>
      <p>変更: +{entry.dailyChange}%</p>
      {entry.milestone && (
        <p className="text-green-600">🎯 {entry.milestone}</p>
      )}
    </div>
  );

  return (
    <ProgressHistoryChart
      data={data}
      tooltipConfig={{
        content: customTooltipContent,
      }}
    />
  );
}
```

### 2. 複数エンティティの比較表示

```tsx
function MultiEntityComparison({ entities }) {
  const [allHistoryData, setAllHistoryData] = useState({});

  useEffect(() => {
    const loadAllHistory = async () => {
      const historyPromises = entities.map(async entity => {
        const history = await progressHistoryService.getProgressHistory({
          entityId: entity.id,
          entityType: entity.type,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          granularity: 'day',
        });
        return { [entity.id]: history };
      });

      const results = await Promise.all(historyPromises);
      const combined = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setAllHistoryData(combined);
    };

    loadAllHistory();
  }, [entities]);

  return (
    <div className="space-y-6">
      {entities.map(entity => (
        <div key={entity.id} className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">{entity.name}</h3>
          <ProgressHistoryChart
            data={allHistoryData[entity.id] || []}
            height={200}
            colors={{
              line: entity.color,
              significant: entity.accentColor,
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

### 3. エクスポート機能

```tsx
function ExportableProgressHistory({ data, entityName }) {
  const exportToCSV = () => {
    const csvContent = [
      ['日付', '進捗率', '変更理由'],
      ...data.map(entry => [
        entry.timestamp.toISOString().split('T')[0],
        entry.progress,
        entry.changeReason || '',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}_progress_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">進捗履歴</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          CSVエクスポート
        </button>
      </div>

      <ProgressHistoryChart data={data} />
    </div>
  );
}
```

## パフォーマンス最適化

### 1. データの遅延読み込み

```tsx
function LazyProgressHistory({ entityId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadMoreData = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newData = await progressHistoryService.getProgressHistory({
        entityId,
        entityType: 'goal',
        startDate: new Date(Date.now() - (page + 1) * 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - page * 30 * 24 * 60 * 60 * 1000),
        granularity: 'day',
      });

      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
        setPage(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ProgressHistoryChart data={data} />

      {hasMore && (
        <button
          onClick={loadMoreData}
          disabled={loading}
          className="mt-4 px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? '読み込み中...' : 'さらに読み込む'}
        </button>
      )}
    </div>
  );
}
```

### 2. メモ化による最適化

```tsx
import React, { memo, useMemo } from 'react';

const OptimizedProgressHistory = memo(({ data, ...props }) => {
  const processedData = useMemo(() => {
    return data.map(entry => ({
      ...entry,
      formattedDate: entry.timestamp.toLocaleDateString(),
      dailyChange: calculateDailyChange(entry, data),
    }));
  }, [data]);

  return <ProgressHistoryChart data={processedData} {...props} />;
});
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. データが表示されない

```tsx
// データの形式を確認
console.log('History data:', data);

// 必要なフィールドがあるか確認
const isValidData = data.every(
  entry => entry.timestamp instanceof Date && typeof entry.progress === 'number'
);
```

#### 2. チャートが正しく描画されない

```tsx
// Rechartsの依存関係を確認
import { LineChart } from 'recharts';

// データが空でないか確認
if (data.length === 0) {
  return <div>データがありません</div>;
}
```

#### 3. パフォーマンスが遅い

```tsx
// データ量を制限
const limitedData = data.slice(-100); // 最新100件のみ

// 不要な再レンダリングを防ぐ
const MemoizedChart = memo(ProgressHistoryChart);
```

## ベストプラクティス

### 1. データ管理

- 適切な期間でデータを取得する
- 不要なデータは定期的にクリーンアップする
- キャッシュを活用してパフォーマンスを向上させる

### 2. ユーザーエクスペリエンス

- ローディング状態を明確に表示する
- エラー時の再試行機能を提供する
- レスポンシブデザインを実装する

### 3. アクセシビリティ

- 適切なARIAラベルを設定する
- キーボードナビゲーションをサポートする
- カラーブラインドネス対応を考慮する

## 更新履歴

- v1.0.0: 基本機能実装
- v1.1.0: 重要な変化点のハイライト機能追加
- v1.2.0: インタラクション機能強化
- v1.3.0: エクスポート機能追加
- v1.4.0: パフォーマンス最適化
