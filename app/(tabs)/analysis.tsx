import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { DonutChart } from "@/components/donut-chart";
import { useColors } from "@/hooks/use-colors";
import { CATEGORY_COLORS, CATEGORY_LABELS, type Category, useExpenses } from "@/lib/expense-context";
import { trpc } from "@/lib/trpc";

type AnalysisResult = {
  summary: string;
  goodPoints: string[];
  warningPoints: string[];
  suggestions: string[];
  topCategory: string | null;
  topCategoryPercent: number;
};

export default function AnalysisScreen() {
  const colors = useColors();
  const { state, getMonthlyExpenses, getMonthlyTotal, getCurrentMonthKey } = useExpenses();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisDate, setAnalysisDate] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const isPC = layoutWidth >= 768;

  const analysisMutation = trpc.analysis.generate.useMutation();

  const currentMonth = getCurrentMonthKey();
  const monthlyTotal = getMonthlyTotal(currentMonth);
  const budget = state.monthlyBudget;
  const usagePercent = budget > 0 ? Math.round((monthlyTotal / budget) * 100) : 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const score = (() => {
    if (budget <= 0) return 50;
    const usageRate = monthlyTotal / budget;
    const expectedRate = daysPassed / daysInMonth;
    const diff = expectedRate - usageRate;
    const base = Math.round(50 + diff * 100);
    return Math.max(0, Math.min(100, base));
  })();

  const expenses = getMonthlyExpenses(currentMonth);
  const categoryTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([cat, total]) => ({
      category: cat,
      total: total as number,
      percent: monthlyTotal > 0 ? Math.round(((total as number) / monthlyTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const donutData = categoryBreakdown.map((c) => ({
    category: c.category as Category,
    value: c.total,
  }));

  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const handleAnalyze = async () => {
    setAnalysisError(null);
    try {
      const result = await analysisMutation.mutateAsync({
        currentMonth: monthLabel,
        monthlyTotal,
        budget,
        usagePercent,
        score,
        categoryBreakdown,
        recentExpenses: expenses.slice(0, 20).map((e) => ({
          category: e.category,
          amount: e.amount,
          memo: e.memo,
          date: e.createdAt.slice(0, 10),
        })),
      });
      setAnalysisResult(result);
      const d = new Date();
      setAnalysisDate(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`);
    } catch (err: unknown) {
      setAnalysisResult(null);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("OPENAI_API_KEY") || message.includes("API_KEY") || message.includes("forgeApiKey")) {
        setAnalysisError("AI分析を使うには .env に BUILT_IN_FORGE_API_KEY (Gemini APIキー) を設定してください。");
      } else if (message.includes("UNAUTHORIZED") || message.includes("Forbidden")) {
        setAnalysisError("ログインが必要です。設定を確認してください。");
      } else {
        setAnalysisError(`分析に失敗しました: ${message.slice(0, 100)}`);
      }
      console.error("[Analysis] Error:", err);
    }
  };

  const handleShare = async () => {
    if (!analysisResult) return;
    const text = [
      `【MoneyCoach AI分析 ${analysisDate}】`,
      `${monthLabel}の支出: ¥${monthlyTotal.toLocaleString()} / 予算¥${budget.toLocaleString()}`,
      ``,
      `■ 総評`,
      analysisResult.summary,
      ``,
      `■ 良い点`,
      ...analysisResult.goodPoints.map((p) => `・${p}`),
      ``,
      `■ 気をつけたい点`,
      ...analysisResult.warningPoints.map((p) => `・${p}`),
      ``,
      `■ 来月への提案`,
      ...analysisResult.suggestions.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    await Share.share({ message: text });
  };

  // UI Components to render
  const summaryCard = (
    <View style={[styles.summaryCard, { backgroundColor: "#1E293B" }]}>
      <Text style={styles.summaryCardMonth}>{monthLabel}</Text>
      <View style={styles.summaryCardRow}>
        <View style={styles.summaryCardLeft}>
          <Text style={styles.summaryCardLabel}>今月の支出合計</Text>
          <Text style={styles.summaryCardAmount}>¥{monthlyTotal.toLocaleString()}</Text>
          <Text style={styles.summaryCardSub}>
            予算の{usagePercent}%使用 / スコア{score}点
          </Text>
        </View>
        {donutData.length > 0 && (
          <DonutChart segments={donutData} size={80} strokeWidth={12} />
        )}
      </View>
    </View>
  );

  const breakdownCard = categoryBreakdown.length > 0 && (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>カテゴリ別内訳</Text>
      {categoryBreakdown.map((item) => (
        <View key={item.category} style={styles.catRow}>
          <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[item.category as Category] ?? "#9CA3AF" }]} />
          <Text style={[styles.catLabel, { color: colors.foreground }]}>
            {CATEGORY_LABELS[item.category as Category] ?? item.category}
          </Text>
          <View style={styles.catBarBg}>
            <View
              style={[
                styles.catBarFill,
                {
                  width: `${item.percent}%` as `${number}%`,
                  backgroundColor: CATEGORY_COLORS[item.category as Category] ?? "#9CA3AF",
                },
              ]}
            />
          </View>
          <Text style={[styles.catAmount, { color: colors.foreground }]}>
            ¥{item.total.toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );

  const analyzeButton = (
    <Pressable
      style={({ pressed }) => [
        styles.analyzeButton,
        { backgroundColor: analysisMutation.isPending ? colors.muted : colors.primary },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={handleAnalyze}
      disabled={analysisMutation.isPending || monthlyTotal === 0}
    >
      {analysisMutation.isPending ? (
        <View style={styles.analyzeButtonInner}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.analyzeButtonText}>AIが分析中...</Text>
        </View>
      ) : (
        <View style={styles.analyzeButtonInner}>
          <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
          <Text style={styles.analyzeButtonText}>
            {analysisResult ? "再分析する" : "今月の支出を分析する"}
          </Text>
        </View>
      )}
    </Pressable>
  );

  const errorCard = analysisError && (
    <View style={[styles.errorCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
      <MaterialIcons name="error-outline" size={18} color="#EF4444" />
      <Text style={styles.errorCardText}>{analysisError}</Text>
    </View>
  );

  const resultsContent = analysisResult ? (
    <>
      {/* 分析完了バナー */}
      <View style={[styles.resultBanner, { backgroundColor: colors.primary }]}>
        <MaterialIcons name="auto-awesome" size={28} color="#FFFFFF" />
        <View style={styles.resultBannerText}>
          <Text style={styles.resultBannerTitle}>今月の支出を分析しました！</Text>
          <Text style={styles.resultBannerDate}>分析日：{analysisDate}</Text>
        </View>
      </View>

      {/* 総評 */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <MaterialIcons name="auto-awesome" size={16} color="#F59E0B" />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>総評</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.foreground }]}>{analysisResult.summary}</Text>
      </View>

      {/* 良い点 */}
      {analysisResult.goodPoints.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitleEmoji}>👍</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>良い点</Text>
          </View>
          {analysisResult.goodPoints.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <MaterialIcons name="check" size={14} color="#22C55E" />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 気をつけたい点 */}
      {analysisResult.warningPoints.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitleEmoji}>⚠️</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>気をつけたい点</Text>
          </View>
          {analysisResult.warningPoints.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.warningDot} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 来月への提案 */}
      {analysisResult.suggestions.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitleEmoji}>💡</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>来月への提案</Text>
          </View>
          {analysisResult.suggestions.map((s, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.suggestionNum, { color: colors.primary }]}>{i + 1}</Text>
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* シェアボタン */}
      <Pressable
        style={({ pressed }) => [
          styles.shareFullBtn,
          { borderColor: colors.primary },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleShare}
      >
        <MaterialIcons name="share" size={18} color={colors.primary} />
        <Text style={[styles.shareFullBtnText, { color: colors.primary }]}>
          詳細な分析をシェア
        </Text>
      </Pressable>
    </>
  ) : isPC ? (
    <View style={[styles.pcPlaceholderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MaterialIcons name="auto-awesome" size={48} color={colors.muted} style={{ marginBottom: 12 }} />
      <Text style={[styles.pcPlaceholderTitle, { color: colors.foreground }]}>AIがあなたの家計を分析します</Text>
      <Text style={[styles.pcPlaceholderDesc, { color: colors.muted }]}>
        左側の「今月の支出を分析する」ボタンを押すと、AIが今月の支出の傾向や改善点を分析し、ここに結果が表示されます。
      </Text>
    </View>
  ) : null;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={{ flex: 1 }} onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}>
        <ScrollView contentContainerStyle={[styles.scrollContent, isPC && styles.scrollContentPC]} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>AI分析</Text>
            {analysisResult && (
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="share" size={20} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {isPC ? (
            <View style={styles.pcLayoutRow}>
              {/* Left Column: Input and breakdown */}
              <View style={styles.pcLeftCol}>
                {summaryCard}
                {breakdownCard}
                {analyzeButton}
                {monthlyTotal === 0 && (
                  <Text style={[styles.noDataHint, { color: colors.muted }]}>
                    支出データがないと分析できません。まず支出を追加してください。
                  </Text>
                )}
                {errorCard}
              </View>

              {/* Right Column: AI Analysis Results */}
              <View style={styles.pcRightCol}>
                {resultsContent}
              </View>
            </View>
          ) : (
            <>
              {summaryCard}
              {breakdownCard}
              {analyzeButton}
              {monthlyTotal === 0 && (
                <Text style={[styles.noDataHint, { color: colors.muted }]}>
                  支出データがないと分析できません。まず支出を追加してください。
                </Text>
              )}
              {errorCard}
              {resultsContent}
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  shareBtn: {
    padding: 8,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  summaryCardMonth: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  summaryCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryCardLeft: {
    flex: 1,
    gap: 4,
  },
  summaryCardLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  summaryCardAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  summaryCardSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardTitleEmoji: {
    fontSize: 16,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "500",
    width: 64,
  },
  catBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  catBarFill: {
    height: 6,
    borderRadius: 3,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: "600",
    width: 72,
    textAlign: "right",
  },
  analyzeButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  noDataHint: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  resultBanner: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultBannerText: {
    flex: 1,
    gap: 4,
  },
  resultBannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resultBannerDate: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  warningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginTop: 7,
  },
  suggestionNum: {
    fontSize: 14,
    fontWeight: "700",
    width: 18,
    textAlign: "center",
    marginTop: 1,
  },
  shareFullBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareFullBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 20,
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorCardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#B91C1C",
  },
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
    flex: 1.1,
    gap: 12,
  },
  pcRightCol: {
    flex: 1.5,
    gap: 12,
  },
  pcPlaceholderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  pcPlaceholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  pcPlaceholderDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
});
