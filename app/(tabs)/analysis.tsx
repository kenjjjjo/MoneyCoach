import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { CATEGORY_LABELS, type Category, useExpenses } from "@/lib/expense-context";
import { trpc } from "@/lib/trpc";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  isTyping?: boolean;
};

type AnalysisResult = {
  summary: string;
  goodPoints: string[];
  warningPoints: string[];
  suggestions: string[];
  topCategory: string | null;
  topCategoryPercent: number;
};

const BOT_AVATAR = require("../../assets/images/icon.png");

const QUICK_PROMPTS = [
  "食費を減らすには？",
  "来月の予算は？",
  "何が一番ムダ？",
  "節約のコツ教えて",
];

function formatAnalysisToMessage(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`✨ 今月の総評\n${result.summary}`);

  if (result.goodPoints.length > 0) {
    lines.push(`\n👍 良い点`);
    result.goodPoints.forEach((p) => lines.push(`• ${p}`));
  }

  if (result.warningPoints.length > 0) {
    lines.push(`\n⚠️ 気をつけたい点`);
    result.warningPoints.forEach((p) => lines.push(`• ${p}`));
  }

  if (result.suggestions.length > 0) {
    lines.push(`\n💡 来月への提案`);
    result.suggestions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }

  return lines.join("\n");
}

// ---- チャットバブル ----
function BotBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.botRow}>
      <Image source={BOT_AVATAR} style={styles.botAvatar} contentFit="cover" />
      <View style={[styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {message.isTyping ? (
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { backgroundColor: colors.muted }]} />
            <View style={[styles.typingDot, { backgroundColor: colors.muted, marginHorizontal: 3 }]} />
            <View style={[styles.typingDot, { backgroundColor: colors.muted }]} />
          </View>
        ) : (
          <Text style={[styles.bubbleText, { color: colors.foreground }]}>{message.content}</Text>
        )}
      </View>
    </View>
  );
}

function UserBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
        <Text style={styles.userBubbleText}>{message.content}</Text>
      </View>
    </View>
  );
}

// ---- メイン画面 ----
export default function AnalysisScreen() {
  const colors = useColors();
  const { state, getMonthlyExpenses, getMonthlyTotal, getCurrentMonthKey } = useExpenses();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [analysisReady, setAnalysisReady] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const ChatContainer = Platform.OS === "web" ? View : KeyboardAvoidingView;

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

  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const remainingBudget = budget - monthlyTotal;
  const remainingDays = Math.max(1, daysInMonth - daysPassed + 1);
  const todayBudget = Math.floor(Math.max(0, remainingBudget) / remainingDays);
  const projectedTotal = daysPassed > 0 ? Math.round((monthlyTotal / daysPassed) * daysInMonth) : monthlyTotal;

  const analysisMutation = trpc.analysis.generate.useMutation();
  const chatMutation = trpc.coach.chat.useMutation();

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    const id = `${Date.now()}_${Math.random()}`;
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const replaceMessage = useCallback((id: string, newContent: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: newContent, isTyping: false } : m)));
  }, []);

  // 初回マウント時に分析を自動実行
  useEffect(() => {
    if (analysisReady) return;
    runInitialAnalysis();
  }, []);

  const runInitialAnalysis = async () => {
    setAnalysisReady(false);

    // 挨拶メッセージ
    addMessage({
      role: "bot",
      content: `こんにちは！MoneyCoachです 👋\n${monthLabel}の家計を分析しています…`,
    });

    // タイピング表示
    const typingId = addMessage({ role: "bot", content: "", isTyping: true });

    try {
      if (monthlyTotal === 0) {
        replaceMessage(typingId, "まだ今月の支出データがないですね。支出を追加してからもう一度来てください 😊");
        setAnalysisReady(true);
        return;
      }

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

      replaceMessage(typingId, formatAnalysisToMessage(result));
    } catch (err) {
      replaceMessage(typingId, "分析中にエラーが発生しました。少し待ってから再試行してください。");
    }

    // フォローアップ
    setTimeout(() => {
      addMessage({
        role: "bot",
        content: "何か気になることや質問はありますか？なんでも聞いてください😊",
      });
      setAnalysisReady(true);
    }, 600);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isChatLoading) return;

    setInputText("");
    setIsChatLoading(true);

    addMessage({ role: "user", content: text });

    const typingId = addMessage({ role: "bot", content: "", isTyping: true });

    try {
      const result = await chatMutation.mutateAsync({
        message: text,
        monthlyTotal,
        budget,
        remainingBudget,
        remainingDays,
        todayBudget,
        projectedTotal,
        usagePercent,
        currentMonth: monthLabel,
        categoryBreakdown,
        recentExpenses: expenses.slice(0, 10).map((e) => ({
          category: e.category,
          amount: e.amount,
          memo: e.memo,
          date: e.createdAt.slice(0, 10),
        })),
      });
      replaceMessage(typingId, result.reply);
    } catch {
      replaceMessage(typingId, "すみません、うまく答えられませんでした。もう一度お試しください。");
    }

    setIsChatLoading(false);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages]);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <Image source={BOT_AVATAR} style={styles.headerAvatar} contentFit="cover" />
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>MoneyCoach AI</Text>
            <Text style={[styles.headerSub, { color: "#22C55E" }]}>
              {analysisReady ? "オンライン" : "分析中…"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={runInitialAnalysis}
          style={({ pressed }) => [styles.reanalyzeBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ChatContainer
        style={styles.flex}
        {...(Platform.OS !== "web"
          ? {
              behavior: Platform.OS === "ios" ? "padding" : "height",
              keyboardVerticalOffset: Platform.OS === "ios" ? 90 : 0,
            }
          : {})}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item.role === "bot" ? (
              <BotBubble message={item} colors={colors} />
            ) : (
              <UserBubble message={item} colors={colors} />
            )
          }
        />

        {/* Quick prompts */}
        {analysisReady && monthlyTotal > 0 && (
          <View style={styles.quickPromptsRow}>
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => handleQuickPrompt(prompt)}
                style={({ pressed }) => [
                  styles.quickChip,
                  { borderColor: colors.primary, backgroundColor: pressed ? colors.primary + "22" : "transparent" },
                ]}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージを入力…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={analysisReady && !isChatLoading}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isChatLoading || !analysisReady}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  !inputText.trim() || isChatLoading || !analysisReady ? colors.muted : colors.primary,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {isChatLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </ChatContainer>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  reanalyzeBtn: {
    padding: 8,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  // Bot bubble
  botRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
    maxWidth: "85%",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
  },
  botBubble: {
    flex: 1,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    padding: 12,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.6,
  },
  // User bubble
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  userBubble: {
    maxWidth: "75%",
    borderRadius: 18,
    borderTopRightRadius: 4,
    padding: 12,
  },
  userBubbleText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  // Quick prompts
  quickPromptsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  quickChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
