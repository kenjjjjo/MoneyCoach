import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { DonutChart } from "@/components/donut-chart";
import { useColors } from "@/hooks/use-colors";
import { type Category, useExpenses } from "@/lib/expense-context";

// V3.0: ステータス判定
type StatusLevel = "safe" | "caution" | "danger";

const STATUS_CONFIG = {
  safe: {
    emoji: "🟢",
    label: "安全",
    message: "予算内で順調です",
    color: "#22C55E",
    bg: "#052e16",
    border: "#166534",
    textColor: "#FFFFFF",
    subTextColor: "#86EFAC",
  },
  caution: {
    emoji: "🟡",
    label: "注意",
    message: "支出ペースに注意しましょう",
    color: "#F59E0B",
    bg: "#1c1400",
    border: "#92400e",
    textColor: "#FFFFFF",
    subTextColor: "#FCD34D",
  },
  danger: {
    emoji: "🔴",
    label: "危険",
    message: "予算超過のリスクがあります",
    color: "#EF4444",
    bg: "#1c0000",
    border: "#7f1d1d",
    textColor: "#FFFFFF",
    subTextColor: "#FCA5A5",
  },
};

function getStatus(usagePercent: number, projectedOverBudget: boolean): StatusLevel {
  if (projectedOverBudget || usagePercent >= 100) return "danger";
  if (usagePercent >= 70) return "caution";
  return "safe";
}

function getMascotComment(status: StatusLevel, dailyBudget: number): string {
  if (status === "safe") return `今日は¥${dailyBudget.toLocaleString()}まで使えるよ！`;
  if (status === "caution") return `今日は¥${dailyBudget.toLocaleString()}以内に抑えよう！`;
  return "支出を見直してみよう！";
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    state,
    getMonthlyExpenses,
    getMonthlyTotal,
    getCurrentMonthKey,
    calculateScore,
    getInsights,
    getCategoryLabel,
    getCategoryColor,
  } = useExpenses();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const isPC = layoutWidth >= 768;

  // 定期支出（有効なもの）の月額合計
  const recurringMonthlyTotal = state.recurringExpenses
    .filter((r) => r.isActive)
    .reduce((sum, r) => sum + r.amount, 0);

  const currentMonth = getCurrentMonthKey();
  const monthlyTotal = getMonthlyTotal(currentMonth);
  const budget = state.monthlyBudget;
  const remaining = Math.max(0, budget - monthlyTotal);
  const usagePercent = budget > 0 ? Math.round((monthlyTotal / budget) * 100) : 0;

  // 今日あと使える金額
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
  const dailyBudget = Math.floor(remaining / remainingDays);

  // 月末予測（定期支出を含む）
  const daysPassed = now.getDate();
  const baseProjected = daysPassed > 0 ? Math.round((monthlyTotal / daysPassed) * daysInMonth) : monthlyTotal;
  // 定期支出のうち、まだ今月の通常支出に計上されていないものを加算
  const alreadyChargedRecurring = state.expenses.filter(
    (e) => e.id.startsWith("recurring_") && e.createdAt.startsWith(currentMonth)
  ).length;
  const unchargedRecurringTotal = alreadyChargedRecurring === 0 ? recurringMonthlyTotal : 0;
  const predictedSpend = baseProjected + unchargedRecurringTotal;
  const predictedOverBudget = predictedSpend > budget;
  const predictedDiff = Math.abs(predictedSpend - budget);

  // ステータス
  const status = getStatus(usagePercent, predictedOverBudget);
  const statusConfig = STATUS_CONFIG[status];
  const mascotComment = getMascotComment(status, dailyBudget);

  // 支出ランキング TOP3
  const expenses = getMonthlyExpenses(currentMonth);
  const categoryTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const ranking = Object.entries(categoryTotals)
    .map(([cat, total]) => ({ category: cat as Category, total: total as number }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // 今月の日付表示
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  // 各コンテンツ要素を定義（PC/SPの両方のレイアウトで再利用）
  const mascotStatusBanner = (
    <View style={[styles.statusBanner, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
      <View style={styles.mascotRow}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.mascotImage}
          contentFit="contain"
        />
        <View style={styles.mascotTextBox}>
          <View style={styles.statusLabelRow}>
            <Text style={styles.statusEmoji}>{statusConfig.emoji}</Text>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={[styles.mascotComment, { color: statusConfig.textColor }]}>{mascotComment}</Text>
        </View>
      </View>
    </View>
  );

  const monthlyExpenseCard = (
    <View style={[styles.mainCard, { backgroundColor: colors.primary }]}>
      <View style={styles.mainCardHeader}>
        <Text style={styles.mainCardLabel}>{monthLabel}の支出</Text>
        <MaterialIcons name="show-chart" size={20} color="rgba(255,255,255,0.8)" />
      </View>
      <Text style={styles.mainCardAmount}>¥{monthlyTotal.toLocaleString()}</Text>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, usagePercent)}%` as `${number}%`,
              backgroundColor: usagePercent >= 100 ? "#FCA5A5" : "rgba(255,255,255,0.9)",
            },
          ]}
        />
      </View>
      <Text style={styles.mainCardSub}>予算の{usagePercent}%を使っています</Text>

      {/* 予算・残り */}
      <View style={styles.budgetRow}>
        <View style={styles.budgetItem}>
          <MaterialIcons name="account-balance-wallet" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.budgetItemLabel}>今月の予算</Text>
          <Text style={styles.budgetItemValue}>¥{budget.toLocaleString()}</Text>
        </View>
        <View style={styles.budgetDivider} />
        <View style={styles.budgetItem}>
          <MaterialIcons name="savings" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.budgetItemLabel}>残り予算</Text>
          <Text style={styles.budgetItemValue}>¥{remaining.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  const dailyAndForecastCards = (
    <View style={styles.infoRow}>
      {/* 今日あと使える */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoCardIconRow}>
          <MaterialIcons name="today" size={16} color={colors.primary} />
          <Text style={[styles.infoCardLabel, { color: colors.muted }]}>今日あと使える</Text>
        </View>
        <Text style={[styles.infoCardAmount, { color: dailyBudget <= 0 ? "#EF4444" : colors.foreground }]}>
          ¥{Math.max(0, dailyBudget).toLocaleString()}
        </Text>
        <Text style={[styles.infoCardSub, { color: colors.muted }]}>残り{remainingDays}日</Text>
      </View>

      {/* 月末予測 */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoCardIconRow}>
          <MaterialIcons name="trending-up" size={16} color={predictedOverBudget ? "#EF4444" : colors.primary} />
          <Text style={[styles.infoCardLabel, { color: colors.muted }]}>月末予測</Text>
        </View>
        <Text style={[styles.infoCardAmount, { color: predictedOverBudget ? "#EF4444" : colors.foreground }]}>
          ¥{predictedSpend.toLocaleString()}
        </Text>
        <Text style={[styles.infoCardSub, { color: predictedOverBudget ? "#EF4444" : "#22C55E" }]}>
          {monthlyTotal === 0
            ? "データなし"
            : predictedOverBudget
            ? `¥${predictedDiff.toLocaleString()}超過予測`
            : `¥${predictedDiff.toLocaleString()}節約見込み`}
        </Text>
      </View>
    </View>
  );

  const expenseRankingCard = ranking.length > 0 && (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="emoji-events" size={18} color="#F59E0B" />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>支出ランキング TOP3</Text>
      </View>
      {ranking.map((item, index) => {
        const percent = monthlyTotal > 0 ? Math.round((item.total / monthlyTotal) * 100) : 0;
        const color = getCategoryColor(item.category);
        const label = getCategoryLabel(item.category);
        return (
          <View key={item.category} style={styles.rankingRow}>
            <Text style={[styles.rankingNum, { color: index === 0 ? "#F59E0B" : index === 1 ? "#9CA3AF" : "#CD7F32" }]}>
              {index + 1}
            </Text>
            <View style={[styles.rankingDot, { backgroundColor: color }]} />
            <Text style={[styles.rankingLabel, { color: colors.foreground }]}>
              {label}
            </Text>
            <View style={styles.rankingBarBg}>
              <View
                style={[
                  styles.rankingBarFill,
                  { width: `${percent}%` as `${number}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={[styles.rankingAmount, { color: colors.foreground }]}>
              ¥{item.total.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // 円グラフ + カテゴリ内訳ミニカード（ホーム用）
  const donutData = Object.entries(categoryTotals)
    .map(([cat, total]) => ({ category: cat, value: total as number }))
    .sort((a, b) => b.value - a.value);

  const categoryBreakdownMiniCard = donutData.length > 0 && (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="pie-chart" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>カテゴリ別内訳</Text>
      </View>
      <View style={styles.donutRow}>
        <DonutChart segments={donutData} size={90} strokeWidth={14} />
        <View style={styles.donutLegend}>
          {donutData.slice(0, 4).map((item) => {
            const pct = monthlyTotal > 0 ? Math.round((item.value / monthlyTotal) * 100) : 0;
            return (
              <View key={item.category} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: getCategoryColor(item.category) }]} />
                <Text style={[styles.legendLabel, { color: colors.foreground }]}>
                  {getCategoryLabel(item.category)}
                </Text>
                <Text style={[styles.legendPct, { color: colors.muted }]}>{pct}%</Text>
                <Text style={[styles.legendAmt, { color: colors.foreground }]}>¥{item.value.toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const recurringSummaryCard = recurringMonthlyTotal > 0 && (
    <Pressable
      style={({ pressed }) => [
        styles.recurringCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => router.push("/(tabs)/settings")}
    >
      <View style={styles.recurringCardLeft}>
        <View style={[styles.recurringCardIcon, { backgroundColor: "#8B5CF622" }]}>
          <MaterialIcons name="repeat" size={20} color="#8B5CF6" />
        </View>
        <View>
          <Text style={[styles.recurringCardTitle, { color: colors.foreground }]}>定期支出</Text>
          <Text style={[styles.recurringCardSub, { color: colors.muted }]}>
            {state.recurringExpenses.filter((r) => r.isActive).length}件登録中
          </Text>
        </View>
      </View>
      <View style={styles.recurringCardRight}>
        <Text style={[styles.recurringCardAmount, { color: "#8B5CF6" }]}>
          ¥{recurringMonthlyTotal.toLocaleString()}/月
        </Text>
        <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );

  const quickActionCard = (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>クイックアクション</Text>
      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/add-expense")}
        >
          <View style={[styles.quickBtnIcon, { backgroundColor: "#22C55E" }]}>
            <MaterialIcons name="add" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.quickBtnLabel, { color: colors.foreground }]}>支出を追加</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/(tabs)/history")}
        >
          <View style={[styles.quickBtnIcon, { backgroundColor: "#8B5CF6" }]}>
            <MaterialIcons name="history" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.quickBtnLabel, { color: colors.foreground }]}>履歴を見る</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/(tabs)/analysis")}
        >
          <View style={[styles.quickBtnIcon, { backgroundColor: "#F59E0B" }]}>
            <MaterialIcons name="auto-awesome" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.quickBtnLabel, { color: colors.foreground }]}>AI分析</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      <View 
        style={{ flex: 1 }} 
        onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isPC && styles.scrollContentPC]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>MoneyCoach</Text>
            <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
          </View>

          {isPC ? (
            <View style={styles.pcLayoutRow}>
              {/* 左側カラム */}
              <View style={styles.pcLeftCol}>
                {mascotStatusBanner}
                {monthlyExpenseCard}
                {dailyAndForecastCards}
                {categoryBreakdownMiniCard}
              </View>

              {/* 右側カラム */}
              <View style={styles.pcRightCol}>
                {expenseRankingCard}
                {recurringSummaryCard}
                {quickActionCard}
              </View>
            </View>
          ) : (
            <>
              {mascotStatusBanner}
              {monthlyExpenseCard}
              {dailyAndForecastCards}
              {categoryBreakdownMiniCard}
              {expenseRankingCard}
              {recurringSummaryCard}
              {quickActionCard}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  // ステータスバナー
  statusBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  mascotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mascotImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  mascotTextBox: {
    flex: 1,
    gap: 4,
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusEmoji: {
    fontSize: 16,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  mascotComment: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  // メインカード
  mainCard: {
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  mainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainCardLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  mainCardAmount: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  mainCardSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  budgetRow: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
  },
  budgetItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  budgetDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  budgetItemLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  budgetItemValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // 情報カード（今日・月末予測）
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  infoCardIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  infoCardAmount: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  infoCardSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  // セクションカード
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  // ランキング
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankingNum: {
    fontSize: 15,
    fontWeight: "800",
    width: 18,
    textAlign: "center",
  },
  rankingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rankingLabel: {
    fontSize: 13,
    fontWeight: "500",
    width: 60,
  },
  rankingBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  rankingBarFill: {
    height: 6,
    borderRadius: 3,
  },
  rankingAmount: {
    fontSize: 13,
    fontWeight: "600",
    width: 72,
    textAlign: "right",
  },
  // DonutChart + Legend
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutLegend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  legendPct: {
    fontSize: 11,
    width: 30,
    textAlign: "right",
  },
  legendAmt: {
    fontSize: 12,
    fontWeight: "600",
    width: 68,
    textAlign: "right",
  },
  // クイックアクション
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickBtn: {
    alignItems: "center",
    gap: 6,
  },
  quickBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  bottomSpacer: { height: 32 },
  // Recurring card
  recurringCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  recurringCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  recurringCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recurringCardTitle: { fontSize: 15, fontWeight: "600" },
  recurringCardSub: { fontSize: 12, marginTop: 2 },
  recurringCardRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  recurringCardAmount: { fontSize: 16, fontWeight: "700" },
  scrollContentPC: {
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  pcLayoutRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  pcLeftCol: {
    flex: 1.2,
    gap: 12,
  },
  pcRightCol: {
    flex: 1,
    gap: 12,
  },
});
