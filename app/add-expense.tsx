import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type Category,
  useExpenses,
} from "@/lib/expense-context";

const CATEGORIES: Category[] = [
  "food",
  "convenience",
  "transport",
  "hobby",
  "beauty",
  "subscription",
  "other",
];

export default function AddExpenseScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addExpense } = useExpenses();

  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setAmount(cleaned);
    if (error) setError("");
  };

  const handleAdd = () => {
    const num = parseInt(amount, 10);
    if (!amount || isNaN(num) || num <= 0) {
      setError("金額を入力してください");
      return;
    }
    if (!selectedCategory) {
      setError("カテゴリを選択してください");
      return;
    }

    addExpense({
      amount: num,
      category: selectedCategory,
      memo: memo.trim() || undefined,
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.back();
  };

  const displayAmount = amount ? parseInt(amount, 10).toLocaleString() : "0";

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="close" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>支出を追加</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>金額</Text>
          <View style={[styles.amountRow, { borderBottomColor: colors.primary }]}>
            <Text style={[styles.amountYen, { color: colors.foreground }]}>¥</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              autoFocus
            />
            {amount.length > 0 && (
              <Pressable
                onPress={() => setAmount("")}
                style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.6 }]}
              >
                <MaterialIcons name="cancel" size={22} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.categorySection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>カテゴリ</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const catColor = CATEGORY_COLORS[cat];
              const iconName = CATEGORY_ICONS[cat] as React.ComponentProps<typeof MaterialIcons>["name"];

              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: isSelected ? catColor + "22" : colors.surface,
                      borderColor: isSelected ? catColor : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    if (error) setError("");
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryIconBg,
                      { backgroundColor: isSelected ? catColor + "33" : catColor + "18" },
                    ]}
                  >
                    <MaterialIcons name={iconName} size={22} color={catColor} />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? catColor : colors.foreground },
                    ]}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Memo */}
        <View style={styles.memoSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>メモ（任意）</Text>
          <TextInput
            style={[
              styles.memoInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={memo}
            onChangeText={setMemo}
            placeholder="メモを入力..."
            placeholderTextColor={colors.muted}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />
        </View>

        {/* Error */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Button */}
      <View style={[styles.addButtonContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: selectedCategory && amount ? "#22C55E" : colors.border },
          ]}
          onPress={handleAdd}
          activeOpacity={0.85}
        >
          <Text style={[styles.addButtonText, { color: selectedCategory && amount ? "#FFFFFF" : colors.muted }]}>
            追加する
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  amountSection: {
    gap: 4,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    paddingBottom: 8,
  },
  amountYen: {
    fontSize: 32,
    fontWeight: "700",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 52,
  },
  clearButton: {
    padding: 4,
  },
  categorySection: {
    gap: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryItem: {
    width: "30%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  memoSection: {
    gap: 4,
  },
  memoInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  bottomSpacer: {
    height: 20,
  },
  addButtonContainer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 0.5,
  },
  addButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
