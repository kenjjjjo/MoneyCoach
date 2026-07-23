import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { CATEGORY_COLORS, CATEGORY_LABELS, type Category, useExpenses } from "@/lib/expense-context";
import { trpc } from "@/lib/trpc";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TabMode = "chat" | "weekly" | "monthly";

const QUICK_PROMPTS = [
  "今月やばい？",
  "何を減らせばいい？",
  "このままだと来月どうなる？",
  "旅行行ける？",
];

// ---- 週次レポートコンポーネント ----
function WeeklyReportView({
  colors,
}: {
  colors: ReturnType<typeof useColors>;
}) {
  const { state, getMonthlyExpenses, getCurrentMonthKey, calculateScore, getCategoryLabel, getCategoryColor } = useExpenses();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const currentMonth = getCurrentMonthKey();
  const expenses = getMonthlyExpenses(currentMonth);
  const budget = state.monthlyBudget;
  const monthlyTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const score = calculateScore(currentMonth);

  // 今週の支出
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekExpenses = expenses.filter((e) => new Date(e.createdAt) >= startOfWeek);
  const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);

  // カテゴリ別集計
  const catTotals: Partial<Record<Category, number>> = {};
  weekExpenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const catBreakdown = Object.entries(catTotals)
    .map(([cat, total]) => ({ category: cat as Category, total: total as number }))
    .sort((a, b) => b.total - a.total);

  const weeklyReportMutation = trpc.coach.weeklyReport.useMutation();

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const now2 = new Date();
      const startOfPrevWeek = new Date(now2);
      startOfPrevWeek.setDate(now2.getDate() - 14);
      const endOfPrevWeek = new Date(now2);
      endOfPrevWeek.setDate(now2.getDate() - 7);
      const prevWeekTotal = state.expenses
        .filter((e) => {
          const d = new Date(e.createdAt);
          return d >= startOfPrevWeek && d < endOfPrevWeek;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      const result = await weeklyReportMutation.mutateAsync({
        weekTotal,
        prevWeekTotal,
        monthlyTotal,
        budget,
        score,
        weekExpenses: weekExpenses.slice(0, 20).map((e) => ({
          category: e.category,
          amount: e.amount,
          memo: e.memo,
          date: e.createdAt.slice(0, 10),
        })),
        categoryBreakdown: catBreakdown.map((c) => ({
          category: c.category,
          total: c.total,
          percent: weekTotal > 0 ? Math.round((c.total / weekTotal) * 100) : 0,
        })),
      });
      setReport(result.report);
    } catch {
      setReport("レポートの生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }, [weeklyReportMutation, weekTotal, monthlyTotal, budget, score, weekExpenses, catBreakdown]);

  return (
    <ScrollView contentContainerStyle={styles.reportScrollContent} showsVerticalScrollIndicator={false}>
      {/* 今週サマリー */}
      <View style={[styles.reportSummaryCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.reportSummaryLabel}>今週の支出</Text>
        <Text style={styles.reportSummaryAmount}>¥{weekTotal.toLocaleString()}</Text>
        <Text style={styles.reportSummaryDate}>
          {startOfWeek.getMonth() + 1}/{startOfWeek.getDate()} 〜 {now.getMonth() + 1}/{now.getDate()}
        </Text>
      </View>

      {/* カテゴリ別 */}
      {catBreakdown.length > 0 && (
        <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>カテゴリ別支出</Text>
          {catBreakdown.map((item) => (
            <View key={item.category} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: getCategoryColor(item.category) }]} />
              <Text style={[styles.catLabel, { color: colors.foreground }]}>
                {getCategoryLabel(item.category)}
              </Text>
              <View style={[styles.catBarWrap, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.catBarFill,
                    {
                      width: `${weekTotal > 0 ? Math.round((item.total / weekTotal) * 100) : 0}%` as any,
                      backgroundColor: getCategoryColor(item.category),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.catAmount, { color: colors.foreground }]}>¥{item.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* AIレポート生成 */}
      <Pressable
        style={({ pressed }) => [
          styles.generateButton,
          { backgroundColor: isLoading ? colors.muted : colors.primary },
          pressed && { opacity: 0.8 },
        ]}
        onPress={generateReport}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>AIが週次レポートを生成</Text>
          </>
        )}
      </Pressable>

      {report && (
        <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.reportCardHeader}>
            <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
            <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>AI週次レポート</Text>
          </View>
          <Text style={[styles.reportText, { color: colors.foreground }]}>{report}</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---- 月次レポートコンポーネント ----
function MonthlyReportView({
  colors,
}: {
  colors: ReturnType<typeof useColors>;
}) {
  const { state, getMonthlyExpenses, getCurrentMonthKey, calculateScore, getCategoryLabel, getCategoryColor } = useExpenses();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const currentMonth = getCurrentMonthKey();
  const expenses = getMonthlyExpenses(currentMonth);
  const budget = state.monthlyBudget;
  const monthlyTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const score = calculateScore(currentMonth);
  const usagePercent = budget > 0 ? Math.round((monthlyTotal / budget) * 100) : 0;

  // カテゴリ別集計
  const catTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const catBreakdown = Object.entries(catTotals)
    .map(([cat, total]) => ({ category: cat as Category, total: total as number }))
    .sort((a, b) => b.total - a.total);

  const monthlyReportMutation = trpc.coach.monthlyReport.useMutation();

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await monthlyReportMutation.mutateAsync({
        currentMonth,
        monthlyTotal,
        budget,
        usagePercent,
        score,
        categoryBreakdown: catBreakdown.map((c) => ({
          category: c.category,
          total: c.total,
          percent: monthlyTotal > 0 ? Math.round((c.total / monthlyTotal) * 100) : 0,
        })),
        recentExpenses: expenses.slice(0, 20).map((e) => ({
          category: e.category,
          amount: e.amount,
          memo: e.memo,
          date: e.createdAt.slice(0, 10),
        })),
      });
      setReport(result.report);
    } catch {
      setReport("レポートの生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }, [monthlyReportMutation, currentMonth, monthlyTotal, budget, usagePercent, score, catBreakdown, expenses]);

  const [cy, cm] = currentMonth.split("-").map(Number);

  return (
    <ScrollView contentContainerStyle={styles.reportScrollContent} showsVerticalScrollIndicator={false}>
      {/* 今月サマリー */}
      <View style={[styles.reportSummaryCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.reportSummaryLabel}>{cy}年{cm}月の支出</Text>
        <Text style={styles.reportSummaryAmount}>¥{monthlyTotal.toLocaleString()}</Text>
        <Text style={styles.reportSummaryDate}>
          予算 ¥{budget.toLocaleString()} / 使用率 {usagePercent}%
        </Text>
      </View>

      {/* スコア */}
      <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>今月の支出スコア</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color: score >= 60 ? colors.primary : "#EF4444" }]}>{score}</Text>
          <Text style={[styles.scoreMax, { color: colors.muted }]}>/ 100点</Text>
        </View>
        <View style={[styles.scoreBarFull, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.scoreBarFillFull,
              {
                width: `${score}%` as any,
                backgroundColor: score >= 80 ? "#22C55E" : score >= 60 ? "#3B82F6" : score >= 40 ? "#F59E0B" : "#EF4444",
              },
            ]}
          />
        </View>
      </View>

      {/* カテゴリ別 */}
      {catBreakdown.length > 0 && (
        <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>カテゴリ別支出</Text>
          {catBreakdown.map((item) => (
            <View key={item.category} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: getCategoryColor(item.category) }]} />
              <Text style={[styles.catLabel, { color: colors.foreground }]}>
                {getCategoryLabel(item.category)}
              </Text>
              <View style={[styles.catBarWrap, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.catBarFill,
                    {
                      width: `${monthlyTotal > 0 ? Math.round((item.total / monthlyTotal) * 100) : 0}%` as any,
                      backgroundColor: getCategoryColor(item.category),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.catAmount, { color: colors.foreground }]}>¥{item.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* AIレポート生成 */}
      <Pressable
        style={({ pressed }) => [
          styles.generateButton,
          { backgroundColor: isLoading ? colors.muted : colors.primary },
          pressed && { opacity: 0.8 },
        ]}
        onPress={generateReport}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>AIが月次レポートを生成</Text>
          </>
        )}
      </Pressable>

      {report && (
        <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.reportCardHeader}>
            <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
            <Text style={[styles.reportCardTitle, { color: colors.foreground }]}>AI月次レポート</Text>
          </View>
          <Text style={[styles.reportText, { color: colors.foreground }]}>{report}</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---- メイン画面 ----
export default function CoachScreen() {
  const colors = useColors();
  // Web環境でキーボード回避ビューが入力欄を画面外へ追いやるバグを防ぐため、Web時は通常のViewを使用
  const ChatContainer = Platform.OS === "web" ? View : KeyboardAvoidingView;
  const { state, getMonthlyExpenses, getMonthlyTotal, getCurrentMonthKey, getCategoryLabel, getCategoryColor } = useExpenses();
  const [tabMode, setTabMode] = useState<TabMode>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "こんにちは！MoneyCoachです。家計のことなら何でも相談してください。今月の支出状況や節約アドバイスをお伝えします。",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const currentMonth = getCurrentMonthKey();
  const monthlyTotal = getMonthlyTotal(currentMonth);
  const budget = state.monthlyBudget;
  const remainingBudget = Math.max(0, budget - monthlyTotal);
  const usagePercent = budget > 0 ? Math.round((monthlyTotal / budget) * 100) : 0;

  // V3.0 追加計算
  const todayForCoach = new Date();
  const lastDayOfMonth = new Date(todayForCoach.getFullYear(), todayForCoach.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, lastDayOfMonth - todayForCoach.getDate() + 1);
  const todayBudget = Math.floor(remainingBudget / remainingDays);
  const daysElapsed = todayForCoach.getDate();
  const projectedTotal = daysElapsed > 0 ? Math.round((monthlyTotal / daysElapsed) * lastDayOfMonth) : 0;

  const expenses = getMonthlyExpenses(currentMonth);
  const categoryTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const categoryBreakdown = Object.entries(categoryTotals).map(([cat, total]) => ({
    category: cat,
    total: total as number,
    percent: monthlyTotal > 0 ? Math.round(((total as number) / monthlyTotal) * 100) : 0,
  }));

  const recentExpenses = expenses.slice(0, 10).map((e) => ({
    category: e.category,
    amount: e.amount,
    memo: e.memo,
    date: e.createdAt.slice(0, 10),
  }));

  // 初期ウェルカムメッセージを支出状況に応じて動的に生成
  useEffect(() => {
    if (state.expenses.length === 0) return; // データなしの場合はデフォルト文のまま
    const statusLine = projectedTotal > budget
      ? `このペースだと月末に¥${(projectedTotal - budget).toLocaleString()}超過する見込みです。支出を見直してみましょう。`
      : projectedTotal > budget * 0.9
      ? `このままのペースだと予算オーバーの可能性があります。今日は¥${todayBudget.toLocaleString()}以内に抑えましょう。`
      : `このままのペースなら予算内で終了する見込みです。`;

    const welcomeMsg = `こんにちは！MoneyCoachです。\n\n今月の支出は¥${monthlyTotal.toLocaleString()}、予算の${usagePercent}%を使用中です。今日はあと¥${todayBudget.toLocaleString()}使えます。\n\n${statusLine}\n\n「今月やばい？」「何を減らせばいい？」などなんでも聞いてください。`;

    setMessages((prev) => {
      // 最初のウェルカムメッセージのみ更新（ユーザーがチャットし始めた後は更新しない）
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [{ id: "welcome", role: "assistant", content: welcomeMsg }];
      }
      return prev;
    });
  // 初回マウント時のみ実行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.expenses.length]);

  const chatMutation = trpc.coach.chat.useMutation();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || chatMutation.isPending) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText("");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const result = await chatMutation.mutateAsync({
          message: text.trim(),
          monthlyTotal,
          budget,
          remainingBudget,
          remainingDays,
          todayBudget,
          projectedTotal,
          usagePercent,
          currentMonth,
          categoryBreakdown,
          recentExpenses,
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: typeof result.reply === "string" ? result.reply : JSON.stringify(result.reply),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "申し訳ありません。通信エラーが発生しました。もう一度お試しください。",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [chatMutation, messages, monthlyTotal, budget, remainingBudget, usagePercent, currentMonth, categoryBreakdown, recentExpenses]
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.avatarImage}
            contentFit="contain"
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : colors.foreground },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AIコーチ</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.primary + "22" }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.primary }]}>オンライン</Text>
        </View>
      </View>

      {/* Tab selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["chat", "weekly", "monthly"] as TabMode[]).map((tab) => {
          const labels: Record<TabMode, string> = { chat: "チャット", weekly: "週次レポート", monthly: "月次レポート" };
          const icons: Record<TabMode, string> = { chat: "chat", weekly: "view-week", monthly: "bar-chart" };
          const isActive = tabMode === tab;
          return (
            <Pressable
              key={tab}
              style={({ pressed }) => [
                styles.tabItem,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setTabMode(tab)}
            >
              <MaterialIcons
                name={icons[tab] as never}
                size={16}
                color={isActive ? colors.primary : colors.muted}
              />
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.muted }]}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {tabMode === "weekly" ? (
        <WeeklyReportView colors={colors} />
      ) : tabMode === "monthly" ? (
        <MonthlyReportView colors={colors} />
      ) : (
        <ChatContainer
          style={styles.flex}
          {...(Platform.OS !== "web"
            ? {
                behavior: Platform.OS === "ios" ? "padding" : "height",
                keyboardVerticalOffset: Platform.OS === "ios" ? 90 : 0,
              }
            : {})}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={
              chatMutation.isPending ? (
                <View style={styles.typingIndicator}>
                  <Image
                    source={require("@/assets/images/icon.png")}
                    style={styles.avatarImage}
                    contentFit="contain"
                  />
                  <View style={[styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              ) : null
            }
          />

          {messages.length <= 1 && (
            <View style={styles.quickPromptsContainer}>
              <Text style={[styles.quickPromptsLabel, { color: colors.muted }]}>よく使う質問</Text>
              <View style={styles.quickPromptsRow}>
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    style={({ pressed }) => [
                      styles.quickPromptChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => sendMessage(prompt)}
                  >
                    <Text style={[styles.quickPromptText, { color: colors.foreground }]}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.inputArea, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="メッセージを入力..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(inputText)}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: inputText.trim() ? colors.primary : colors.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || chatMutation.isPending}
            >
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </ChatContainer>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 12, fontWeight: "600" },
  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  tabLabel: { fontSize: 12, fontWeight: "600" },
  // Chat
  messageList: { padding: 16, gap: 12, paddingBottom: 8 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  messageRowUser: { flexDirection: "row-reverse" },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  messageBubble: { maxWidth: "75%", borderRadius: 18, padding: 12 },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  typingIndicator: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 4, paddingVertical: 4 },
  quickPromptsContainer: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  quickPromptsLabel: { fontSize: 12, fontWeight: "500" },
  quickPromptsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickPromptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickPromptText: { fontSize: 13, fontWeight: "500" },
  inputArea: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 0.5, paddingBottom: 20 },
  textInput: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, lineHeight: 20, maxHeight: 100, borderWidth: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  // Report views
  reportScrollContent: { padding: 16, gap: 16 },
  reportSummaryCard: { borderRadius: 20, padding: 20, alignItems: "center", gap: 4 },
  reportSummaryLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "500" },
  reportSummaryAmount: { color: "#FFFFFF", fontSize: 40, fontWeight: "800", letterSpacing: -1, lineHeight: 48 },
  reportSummaryDate: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  reportCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  reportCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  reportCardTitle: { fontSize: 14, fontWeight: "700" },
  reportText: { fontSize: 14, lineHeight: 22 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { fontSize: 12, fontWeight: "500", width: 56 },
  catBarWrap: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 4 },
  catAmount: { fontSize: 12, fontWeight: "700", width: 72, textAlign: "right" },
  generateButton: { borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  generateButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  // Score
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  scoreNumber: { fontSize: 48, fontWeight: "800", letterSpacing: -1 },
  scoreMax: { fontSize: 14, fontWeight: "400" },
  scoreBarFull: { height: 10, borderRadius: 5, overflow: "hidden" },
  scoreBarFillFull: { height: "100%", borderRadius: 5 },
  bottomSpacer: { height: 32 },
});
