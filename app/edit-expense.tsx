import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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
  type Expense,
  useExpenses,
} from "@/lib/expense-context";

export default function EditExpenseScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { state, deleteExpense, updateExpense, getAllCategories } = useExpenses();

  // 対象の支出を検索
  const expense = state.expenses.find((e) => e.id === params.id) as Expense | undefined;

  const [amount, setAmount] = useState(expense ? expense.amount.toString() : "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    expense ? expense.category : null
  );
  const [memo, setMemo] = useState(expense ? expense.memo ?? "" : "");
  const [dateStr, setDateStr] = useState(
    expense ? expense.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState("");

  const categories = getAllCategories();

  useEffect(() => {
    if (!expense) {
      // 支出が見つからない場合は戻る
      router.back();
    }
  }, [expense, router]);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setAmount(cleaned);
    if (error) setError("");
  };

  const handleSave = () => {
    const num = parseInt(amount, 10);
    if (!amount || isNaN(num) || num <= 0) {
      setError("金額を入力してください");
      return;
    }
    if (num > 9999999) {
      setError("金額は9,999,999円以下で入力してください");
      return;
    }
    if (!selectedCategory) {
      setError("カテゴリを選択してください");
      return;
    }

    if (!expense) return;

    // 日付バリデーション
    const dateParts = dateStr.split("-");
    if (dateParts.length !== 3) {
      setError("日付を YYYY-MM-DD 形式で入力してください");
      return;
    }
    const y = parseInt(dateParts[0], 10);
    const m = parseInt(dateParts[1], 10) - 1;
    const d = parseInt(dateParts[2], 10);
    const origTime = new Date(expense.createdAt);
    const newDate = new Date(y, m, d, origTime.getHours(), origTime.getMinutes(), origTime.getSeconds());
    if (isNaN(newDate.getTime())) {
      setError("正しい日付を入力してください");
      return;
    }

    updateExpense({
      ...expense,
      amount: num,
      category: selectedCategory,
      memo: memo.trim() || undefined,
      createdAt: newDate.toISOString(),
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.back();
  };

  const handleDelete = () => {
    Alert.alert("削除確認", "この支出を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除する",
        style: "destructive",
        onPress: () => {
          if (!expense) return;
          deleteExpense(expense.id);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          router.back();
        },
      },
    ]);
  };

  if (!expense) return null;

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>支出を編集</Text>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteIconButton, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date Input */}
        <View style={styles.dateSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>日付 (YYYY-MM-DD)</Text>
          <View style={[styles.dateInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="event" size={20} color={colors.muted} />
            <TextInput
              style={[styles.dateInput, { color: colors.foreground }]}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

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
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const catColor = cat.color;
              const iconName = cat.icon as React.ComponentProps<
                typeof MaterialIcons
              >["name"];

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: isSelected ? catColor + "22" : colors.surface,
                      borderColor: isSelected ? catColor : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
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
                    numberOfLines={1}
                  >
                    {cat.name}
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
            maxLength={100}
          />
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View
        style={[
          styles.saveButtonContainer,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: selectedCategory && amount ? "#22C55E" : colors.border },
          ]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.saveButtonText,
              { color: selectedCategory && amount ? "#FFFFFF" : colors.muted },
            ]}
          >
            変更を保存する
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
  deleteIconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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
  dateSection: {
    gap: 4,
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
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
  saveButtonContainer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 0.5,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
