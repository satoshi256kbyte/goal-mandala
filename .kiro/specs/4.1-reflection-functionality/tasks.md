# 振り返り機能 実装タスクリスト

## 実装方針

このタスクリストは、振り返り機能を段階的に実装するための詳細な手順を定義します。各タスクは独立して実装・テスト可能で、前のタスクの成果物を基に次のタスクを進めます。

## タスク一覧

### Phase 1: データベース実装1日）

- [ ] 1. Priマ拡張
  - [ ] 1.1 Re定義
    - id、goalId、userId、summary、regretfulActionctions

    - リレーション設定（Goal、U）
    - インデックス設定（goalId、userId、crdAt）
    - _Requi
    - _実装ファイル:_
  
  - [ ] 1.2 ン作成
    - Reflecル作成
    - インデックス作成
  制約設定
    - _Requirements: FR-2_
    - _実装ファイル: _
  
  - [ ] 1.3 シードデータ作成
5件）
    - 異なる目標に紐づくデータ
    - _Requirements: NFR-4_
    - _実装ファイル: pac

### Phase 2: ド実装（2日）

- キーマ実装
  - [ ] 2.1 型定義作成
    - Reflection型
    - ReflectionCreateInput型
    - Reflectionput型
    - ReflectionQuery型
  ctions型
    - _Requirements: FR-1, FR-2_
    - _実装ファイル: pacts_
  
  - [ ] 2.2 Zキーマ作成
    - reflectionCreateSchema
  ma
    - reflectionQuerySchema
    - バリデーションルール実装
    - _Requirements: FR-1, 2_
    - _実装ファイル

- 
  - [ ] 3.1 ReflectionRepository作成
    - create(): 振り
    - findById(): ID検索
    - findByGション対応）
    - update(): 振り返り更新
削除
    - _Requirements: FR-2_
    - _実装ファイル: packages/ba.ts_
  
  - [ ] 3.2 リト作成
    - 各メソッド
    - エラーケースのテスト
   NFR-4_
    - _実装ファイル: packages/ba

- [ ] 4. サービ
  - [ ] 4.1 Reflecti
    - createReflection(): 振り返り作成（目標存在確認、所有者確認）
  ネーション）
    - getReflectionById(): 振り返り詳細取認）
    - updateRef）
    - dele）
    - _Requirements: FR-1, FR-2, FR-3, FR-4, FR-
ce.ts_
  
  - [ ] 4.2 サービステスト作成
    - 各メソッドのユニットテスト
    - 認可エラーのテスト
    - バリデート
    - _Requirements: NFR-4_
  

- [ ] 5. Lambddler実装
  - [ ] 5.1 Reer作成
    - POST /ap振り返り作成
    - GET /api/reflections: 振り返り一覧取得
  返り詳細取得
    - PUT /api/reflections/:id: 更新
    - DELETE /除
    - JWT認証ミドルウェア統合
    - エラーハンドリン
    - _Requirements: FR-1, FR-2, FR-3, FR-4, FR-_
  ts_
  
  - [ ] 5.2 Ha成
    - 各エンドポイ
    - 認証エラーのテスト
    - バリデーションエラーのテスト

    - _実装ファイル: package.test.ts_

### Phase 3: フ）

- [ ] 6. API クライアント実装
  API作成
    - createReflection():ions
    - getRefleections
    - getRefl
    - updateReflection(): PUT /id
  
    - リトライロジック実装
    - エラーハンド
    - _Require
    - _実装ファイル: packages/fronten
  
  - [ ] 6.2 API クライアントテスト作成
    - 各メソッドのスト
    - リトライロジック
    - エラーハンドリングのテスト
  4_
    - _実装ファイル: packages/fronten

- [ ] 7. React
  - [ ] 7.1 useReflectionフック作成
覧取得
    - useReflection(返り詳細取得
    - useCreateReflection(): 振り返り作成
    - useUpdateReflection()り更新
    - useDelete削除
    - キャッシュ無効化設定
  
    - _実装ファイル: packages/frontend/src/hoo
  
  - [ ] 7.2 usック作成
    - React Hook Form統合
  リデーション設定
    - 下書き保存機能
    - _Requirements: FR-1, FR-
    - _実装ファイル: m.ts_
  
  成
    - 各フックのテスト
    - キャッシュ無効化のテスト
    - _Requirem
    - _実装ファイル: packages/frontend/src/

- [ ] 8. コンポーネント実装
  - [ ] 8.1 ReflectionForm作成
    - 総括入力フィールド文字）
    - 惜しかったアクション入力フィールド（任意、最大500文字）
文字）
    - 未着手となったアクション入力フィ
    - バリデーションエラー表示
    - 保存ボタン
    - _Requirements: FR-1, US-1_
  
  
  - [ ] 8.2 Reflecti
    - 振り返りカード表示
  時表示
    - 総括（最初の100文字）表示
    - クリックで詳細画面へ遷
    - _Requirements: FR-3, US-2_
  sx_
  
  - [ ] 8.3 ReflionList作成
    - 振り返りカードリスト表示
  
    - ローディング状態表示
    - エラー状態表示
    - _Requirements: FR-3, US-2_
  
  
  - [ ] 8.4 コンポーネントテスト作成
    - 各コンポーネントのレンダリングテスト
  ト
    - _Requirements: NFR-4_
    - _実装ファイル: packages/fronest.tsx_

- 
  - [ ] 9.1 ReflectionInputPage作成
    - ReflectionForm統合
    - 保存成功時の処理（履歴画面へ遷移）
  ラーハンドリング
    - _Requirements: US-1_
    - _実装ファイル: packsx_
  
  tPage作成
    - ReflectionList統合
    - 新規作成ボタン
    - ページネーション
-2_
    - _実装ファイル: ptsx_
  
  - [ ] 9.3 成
    - 振り返り詳細表示
    - 編集ボタン
  確認ダイアログ付き）
    - _Requirements: US-3, U-4, US-5_
    - _実装ファイル:sx_
  
  - [ ] 9.4 ページテスト作成
  テスト
    - ナビゲーションテスト
    - _Requi
    - _実装ファイsx_

##日）

- [ ] 10. プロパテ
  - [ ] 10.成の冪等性テスト
    - 同じ入力で複数回作成しても異なるIDが生成される
R-4_
    - _実装ファイル: pacs_
  
  - [ ] 10の完全性テスト
    - すべての振り返りが正確る
    - ページネーショしく動作する
    - _R
    - _実装ファイル: packages/backend
  
  - [ ] 10.3 振り返り更新の原子性テスト
    - 更新が原される
    - 部分的な更新が発生しな
    - _RequirementR-4_
    - _実装ファイル: packages/backend
  
  - [ ] 10.4 振り返り削除の安全性ト
    - 削除後にが取得できない
    - 関連データが適切に削除される
    - _Requireme-4_
    - _実装ファイルest.ts_
  
  - [ ] 10.5 バリデーションの正確性テスト
  る
    - 必須項目のチェックが正しく機能する
    - _Req-4_
    - _実装ファイル: pa

- [ ] 11. 統合テスト
  - [ ] 11.1 振り返りCRUDフローテスト
フロー
    - _Requirement4_
    - _実装ファイル: packt.ts_
  
  - [ ] 11.2 ページネーシ
    - 大量データでのペ認
    - _Requirements: NFR-4_
  st.ts_
  
  - [ ] 11.3認可テスト
    - 他ユーザ
    - _Requiremen4_
    - _実装ファイル: packages/backend_

- [ ] 12. E2Eテスト
  - [ ] 12.1 振り返
    - ユーザ
    - _Requiremen
    - _実装ファイル: packages/frontend/e2e/
  
  - [ ] 12.2 振歴表示フローテスト
    - ユーザーが振り返り履歴を確きる
    - _Requiremen: US-2_
    - _実装ファspec.ts_
  
  - [ ] 12.3 振り返り編集フローテスト
  できる
    - _Requirements:_
    - _実装ファイc.ts_
  
  - [ ] 12.4 振り返テスト
    - ユーザーが振り返りを削除できる
  アログが表示される
    - _Requirements: US
    - _実装ファイル: ppec.ts_

### Phase 5: C装（0.5日）

- 
  - [ ] 13.1 Lambda関数定義
    - Refle成
    - 環境変数設定（DATAT）
    - タイムアウト
    - メモリサイズ設定（512MB）

    - _実装ファイル: packages/infrastructure/s
  
  - [ ] 13.2 API 
I作成
    - CORS設定
    - エンドポイント設定（POST、GET、PUTE）
    - Lambda統合
    - _Requirements: 1_
s_
  

    - エラー率アラーム（10%超過）
超過）
    - SNS通知設定
R-3_
    - _実装ファイル: packages/i.ts_
  
  - [ ] 13.4 CDKテスト作成
テスト
    - リソース存在確認テスト
_
    - _実装ファイル: packages/

### Phase 6: ドキュメント作成（日）

- [ ] 14. API仕様書作成

  - リクエスト/レスポンス形式
ド一覧
  - 認証方法
_
  - _実装ファイル: packages/bmd_

- [ ] 15. 運用ガイド作成
監視方法
  - トラブルシューティング

  - _Requirements: _
  - _実装ファイル: packages/bmd_

- [ ] 16. ユーザーマニュアル作成
)
ion-guide.md-implementat/7/steering.kiro./../(./../.
- [実装ガイド]ide.md)/9-test-guingo/steerkir/../../../.](.
- [テストガイドation/)grs-inteunction./3.3-step-f3.3）](./.nctions統合（[Step Fuy/)
- unctionalit-fer/3.2-remind.2）](./..[リマインド機能（3- ment/)
-manageskta1.1-/3.）](./..管理機能（3.1

- [タスク
## 参考資料する
）を更新/4-wbs.mdsteeringS（.kiro/じて）
- WBに応レポートを作成する（必要する
- 実装- 完了日を記録ボックスをマークする
各タスク完了時にチェック- 
## 進捗管理
md_

ON_REPORT./COMPLETIctionality-fun1-reflectioniro/specs/4.ファイル: .k改善点
  - _実装結果
  - 今後のパフォーマンス測定- ト結果
    - テス容のサマリー
  - 実装内完了レポート作成
21. 
- [ ] 
ts: NFR-2_iremen _Requ
    -認を確ン攻撃が防げることェクションジ  - SQLイ認
  を確SS攻撃が防げること
    - Xンテスト入力サニタイゼーショ0.3  [ ] 2
  
  -NFR-2_ements:    - _Requirことを確認
 できないザーの振り返りにアクセス
    - 他ユー.2 認可テスト  - [ ] 20

  nts: NFR-2_iremeRequ
    - _セスできないことを確認認証ユーザーがアク   - 未.1 認証テスト
 [ ] 20
  - ィテストリテ [ ] 20. セキュ_

-FR-1irements: N
    - _Requエラー率: < 1%ー
    - : 100ユーザ 同時接続数テスト
    -2 負荷  - [ ] 19.  
FR-1_
s: NRequirement- _: < 3秒
      - 振り返り保存
  1秒返り詳細取得: < 秒
    - 振りり返り一覧取得: < 2- 振答時間測定
     API応19.1] 
  - [ ーマンステスト9. パフォ
- [ ] 1_
ts: NFR-4iremenRequ実行
    - _k` type-checpm run
    - `n認ック確8.3 型チェ 
  - [ ] 1NFR-4_
 nts: _Requireme
    - ラー0件、警告0件）実行（エn lint`   - `npm ru8.2 リント確認
 - [ ] 1  
  4_
FR-irements: N- _Requt`実行
    run forma
    - `npm ォーマット確認- [ ] 18.1 フコード品質確認
  - [ ] 18. 

R-4_irements: NF  - _Requ  
  - E2Eテスト
  テスト  - コンポーネントト
    - ユニットテステスト実行
  2 フロントエンド - [ ] 17.FR-4_
  
 uirements: N    - _Req   - 統合テスト
ティベーステスト
  プロパ  -ニットテスト
  
    - ユンドテスト実行 ] 17.1 バックエ- [行
  ト実] 17. 全テス

- [ 証（0.5日）終検 7: 最hase_

### Pr-manual.mdon-use/reflecticsackend/do: packages/b実装ファイル- _4_
  s: NFR-irement- _Requューティング
  ブルシ
  - トラ
  - FAQ- 振り返り機能の使い方  
