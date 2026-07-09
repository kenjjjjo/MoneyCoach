# MoneyCoach TODO

- [x] アプリロゴ生成・ブランディング設定
- [x] テーマカラー設定（#22C55E グリーン）
- [x] アイコンマッピング追加（icon-symbol.tsx）
- [x] 支出データContext作成（AsyncStorage永続化）
- [x] Bottom Tab ナビゲーション設定（5タブ + 中央+ボタン）
- [x] Home画面実装（AIキャラ・支出カード・AI評価・クイックアクション）
- [x] Add Expense画面実装（金額入力・カテゴリ選択・メモ・追加ボタン）
- [x] History画面実装（月切り替え・円グラフ・支出一覧・長押し削除）
- [x] AI Analysis画面実装（分析結果・総評・良い点・気をつけたい点・提案）
- [x] DonutChartコンポーネント実装
- [x] CategoryIconコンポーネント実装
- [x] AI評価ロジック実装（予算使用率に基づくグレード計算）
- [x] AI分析テキスト生成（ローカルロジックによる分析）
- [x] 動作確認・チェックポイント作成

## V2 アップグレード

- [x] Home: 今日あと使える金額（最優先表示）
- [x] Home: 月末予測支出・予算超過予測
- [x] Home: 支出ランキング TOP3
- [x] Home: AI評価改善提案テキスト
- [x] History: カレンダービュー（支出日を可視化）
- [x] History: スワイプ削除（左スワイプ）
- [x] Coach画面: 新規タブ追加（会話型AIコーチ）
- [x] Coach: サーバーLLM連携（支出データを参照したチャット）
- [x] Settings画面: 月予算変更機能
- [x] Settings: アプリ情報表示
- [x] ナビゲーション: Analysis→Coachタブに変更

## V2.1 アップグレード

### P0（必須）
- [x] データモデル拡張: 通知設定・週次レポート・月次レポートの型定義
- [x] Context拡張: 通知設定・レポートデータのAsyncStorage永続化
- [x] Home: マネーインサイト（計算ベースのインサイト表示）
- [x] Home: 支出スコア（0〜100点）表示
- [x] History: 週別集計ビュー追加
- [x] History: 月別集計ビュー追加
- [x] Coach: 週次レポート表示機能
- [x] Coach: 月次レポート表示機能
- [x] Settings: 通知設定（週次・月次・予算超過のON/OFF）
- [x] Settings: 通知時間設定
- [x] サーバー: 週次レポート生成API（LLM連携）
- [x] サーバー: 月次レポート生成API（LLM連携）
- [x] 予算超過アラート設定（閾値選択式）

### P1
- [ ] 支出スコア詳細（予算達成率・支出分散・急激な増加・無駄遣い比率）
- [ ] マネーインサイト強化（週比・カテゴリ比率・最大支出日）

### P2
- [ ] AI分析履歴保存・閲覧機能
- [ ] 通知時間カスタマイズ

## V3.0 アップグレード

### P0（必須）
- [ ] DBスキーマ定義（expenses・budgets・weekly_reports・monthly_reports・coach_messages）
- [ ] サーバーAPIをPostgreSQLバックエンドに移行
- [ ] Home: ステータス表示（🟢安全/🟡注意/🔴危険）
- [ ] Home: シンプルUI（残り予算・今日使える金額・月末予測・AIインサイトを最優先）
- [ ] AI Analysis: 分析ボタン型レポート生成フロー
- [ ] AI Analysis: カテゴリ割合表示（90%計算 + 10%LLM文章）
- [ ] AI Coach: 数字付き回答強化（LLMプロンプト改善）
- [ ] AI Coach: チャット履歴をDBに保存

## 定期支出（サブスク・固定費）管理機能

- [ ] RecurringExpense型定義（id・name・amount・category・billingDay・isActive・createdAt）
- [ ] expense-contextにrecurringExpenses状態・CRUD操作・自動計上ロジックを追加
- [ ] add-recurring-expense.tsx モーダル画面（登録・編集）
- [ ] Settings画面に定期支出一覧セクションを追加（ON/OFF・編集・削除）
- [ ] Home画面に今月の定期支出合計を表示
- [ ] 定期支出を毎月の支出として自動計上（アプリ起動時に当月分を確認）
