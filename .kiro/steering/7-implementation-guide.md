# 実装ガイド

## Git 運用ガイド

### Conventional Commits

このプロジェクトでは、[Conventional Commits v1.0.0](https://www.conventionalcommits.org/ja/v1.0.0/)に従ってコミットメッセージを記述してください。  

### ブランチ戦略

Git Flowを採用します。  

## リポジトリ構造

以下の構造でモノレポとして管理します：  

```bash
goal-mandala/
├── packages/
│   ├── frontend/           # React + TypeScript フロントエンド
│   ├── backend/            # Hono + Lambda バックエンド
│   ├── infrastructure/     # AWS CDK インフラ定義
│   └── shared/             # 共通型定義・ユーティリティ
├── tools/
│   ├── docker/             # Docker Compose設定
│   └── scripts/            # 開発用スクリプト
├── docs/                   # ドキュメント
├── .github/                # GitHub Actions設定
├── package.json            # モノレポルート設定
├── pnpm-workspace.yaml     # pnpm ワークスペース設定
├── .tool-versions          # asdfバージョン管理
├── .gitignore
├── .env.example
└── README.md
```

## 開発ツール管理方法

各種ツールは`asdf`を使用してインストール・管理します。  

## レスポンシブ対応

### ブレークポイント

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### 画面別対応

#### マンダラチャート画面

- **Mobile**: 縦スクロール、タップで詳細表示
- **Tablet**: 横スクロール対応、サイドパネル
- **Desktop**: 全体表示、ホバー効果

#### タスクリスト

- **Mobile**: カード形式、スワイプ操作
- **Tablet**: リスト形式、フィルター常時表示
- **Desktop**: テーブル形式、ソート機能

## アクセシビリティ対応

### 基本要件

- **キーボード操作**: 全機能をキーボードで操作可能
- **スクリーンリーダー**: 適切なARIAラベル設定
- **色覚対応**: 色以外の情報でも判別可能
- **フォントサイズ**: 拡大表示対応

### 具体的対応

- `alt`属性の設定
- `aria-label`、`aria-describedby`の適切な使用
- フォーカス表示の明確化
- 十分なコントラスト比の確保

## パフォーマンス要件

### ページロード時間

- **初回ロード**: < 3秒
- **画面遷移**: < 1秒
- **AI処理**: < 30秒（進捗表示付き）

### 最適化手法

- **Code Splitting**: ページ単位での分割
- **Lazy Loading**: 画像・コンポーネントの遅延読み込み
- **Caching**: APIレスポンスのキャッシュ
- **Compression**: 静的ファイルの圧縮

## エラーハンドリング

### エラー画面

- **404 Not Found**: ページが見つからない
- **500 Server Error**: サーバーエラー
- **Network Error**: ネットワークエラー
- **AI Processing Error**: AI処理エラー

### エラー表示方針

- **Toast通知**: 軽微なエラー
- **モーダル**: 重要なエラー
- **インライン**: フォーム入力エラー
- **専用ページ**: システムエラー

## セキュリティ考慮事項

### 認証・認可

- **JWT Token**: 有効期限付きトークン
- **CSRF Protection**: CSRFトークンの実装
- **XSS Prevention**: 入力値のサニタイズ

### データ保護

- **HTTPS**: 全通信の暗号化
- **Input Validation**: 入力値検証
- **SQL Injection Prevention**: パラメータ化クエリ

## パフォーマンス最適化

### フロントエンド最適化

- **React最適化**: memo、useMemo、useCallbackの適切な使用
- **バンドル最適化**: Code Splitting、Tree Shaking
- **キャッシュ戦略**: React Queryによるデータキャッシュ
- **画像最適化**: WebP形式、遅延読み込み

### バックエンド最適化

- **データベース最適化**: 適切なインデックス設計
- **Lambda最適化**: コールドスタート対策
- **キャッシュ戦略**: CloudFrontによる静的コンテンツキャッシュ
- **接続プール**: Prismaの接続プール設定

### 監視・ログ

- **アプリケーションログ**: CloudWatch Logs
- **パフォーマンス監視**: CloudWatch Metrics
- **エラー追跡**: X-Ray トレーシング
- **アラート設定**: 異常検知とSlack通知

### 入力検証

- **フロントエンド**: React Hook Formによる検証
- **バックエンド**: Zodによるスキーマ検証
- **SQLインジェクション対策**: Prismaによるパラメータ化クエリ
