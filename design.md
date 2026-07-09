# MoneyCoach Design Plan

## App Concept
「AIお金コーチ」体験アプリ。家計簿ではなく、今の状況を3秒で把握し、AIが改善点を提案するアプリ。

## Color Palette
- **Primary (Main)**: #22C55E (Green)
- **Background**: #F8FAFC / #FFFFFF
- **Accent Purple**: #8B5CF6
- **Accent Amber**: #F59E0B
- **Accent Blue**: #3B82F6
- **Text Primary**: #11181C
- **Text Muted**: #687076
- **Surface**: #FFFFFF
- **Card Background**: #F8FAFC

## Typography
- App Name / Large Numbers: Bold, large
- Section Headers: Semibold, 16-18px
- Body Text: Regular, 14px
- Muted Text: Regular, 12-13px

## Screen List

### 1. Home Screen (index)
**Purpose**: 今月の状況を3秒で把握

**Content**:
- Header: "MoneyCoach" + AI sparkle icon
- AI Character: 緑のキャラクター + コメント（例: "いいペースだよ！この調子でいこう！"）
- 今月の支出カード（グリーン背景）: ¥23,400 / 予算の47%を使用中
- 今月の予算: ¥50,000 / 残り予算: ¥26,600
- AI評価セクション: グレードB + 評価コメント + 詳細を見るリンク
- クイックアクション: 支出を追加 / 履歴を見る / AI分析する

### 2. Add Expense Screen (modal)
**Purpose**: 5秒以内で支出登録

**Content**:
- Header: × ボタン + "支出を追加"
- 金額入力: 大きなフォント ¥1,200
- カテゴリ選択グリッド: 食費・コンビニ・交通費・趣味・美容・サブスク・その他
- メモ入力（任意）
- 追加するボタン（固定表示、グリーン）

### 3. History Screen (history)
**Purpose**: 支出履歴確認

**Content**:
- Header: "履歴" + フィルターアイコン
- 月切り替えナビ: < 2025年6月 >（グリーン背景）
- サマリー: 今月の支出合計 ¥23,400 + 円グラフ
- 日付別支出一覧（FlatList）: カテゴリアイコン・名前・金額・時刻
- 長押しで削除

### 4. AI Analysis Screen (analysis)
**Purpose**: 支出データをAI分析

**Content**:
- Header: "AI分析" + 履歴アイコン
- 分析結果カード（グリーン背景）: 今月の支出を分析しました！ + 分析日
- 総評セクション: AIテキスト
- 良い点セクション: チェックリスト
- 気をつけたい点セクション: 警告リスト
- 来月への提案セクション: 番号付きリスト
- 詳細な分析をシェアボタン

## Navigation Structure
Bottom Tab Bar (5 items):
1. Home (house icon) - index
2. 履歴 (clock icon) - history
3. + (center, green circle, large) - add expense modal
4. 分析 (chart icon) - analysis
5. 設定 (gear icon) - settings (placeholder)

## Key User Flows

### Flow 1: 支出登録
Home → + ボタン → 金額入力 → カテゴリ選択 → 追加する → Home（更新）

### Flow 2: 履歴確認
Home → 履歴を見る / Tab履歴 → 月切り替え → 支出一覧表示

### Flow 3: AI分析
Home → AI分析する / Tab分析 → 分析結果表示 → シェア

## Component Architecture
- `ExpenseContext`: 支出データの状態管理（AsyncStorage永続化）
- `CategoryIcon`: カテゴリ別アイコン・色コンポーネント
- `ExpenseCard`: 支出一覧アイテム
- `DonutChart`: SVGによる円グラフ（react-native-svg使用）
- `AIGradeCard`: AI評価グレード表示
- `QuickActionButton`: クイックアクションボタン

## Data Model
```typescript
type Category = 'food' | 'convenience' | 'transport' | 'hobby' | 'beauty' | 'subscription' | 'other';

type Expense = {
  id: string;
  amount: number;
  category: Category;
  memo?: string;
  createdAt: string; // ISO date string
};

type MonthlyBudget = {
  amount: number;
  month: string; // YYYY-MM
};
```
