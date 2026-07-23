import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import {
  useExpenses,
  Category,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  RecurringExpense,
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

const BILLING_DAYS = [1, 5, 10, 15, 20, 25, 28];

export default function AddRecurringExpenseScreen() {
  const { addRecurring, updateRecurring, state, getAllCategories } = useExpenses();
  const params = useLocalSearchParams<{ editId?: string }>();
  const categories = getAllCategories();

  // 編集モードの場合、既存データを取得
  const editTarget = params.editId
    ? state.recurringExpenses.find((r) => r.id === params.editId)
    : null;

  const [name, setName] = useState(editTarget?.name ?? "");
  const [amountText, setAmountText] = useState(
    editTarget ? String(editTarget.amount) : ""
  );
  const [category, setCategory] = useState<string>(
    editTarget?.category ?? "subscription"
  );
  const [billingDay, setBillingDay] = useState(editTarget?.billingDay ?? 1);
  const [isActive, setIsActive] = useState(editTarget?.isActive ?? true);
  const [error, setError] = useState("");

  const isEditMode = !!editTarget;

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("サービス名を入力してください");
      return;
    }
    const amount = parseInt(amountText.replace(/,/g, ""), 10);
    if (!amount || amount <= 0) {
      setError("正しい金額を入力してください");
      return;
    }

    if (isEditMode && editTarget) {
      updateRecurring({
        ...editTarget,
        name: trimmedName,
        amount,
        category,
        billingDay,
        isActive,
      });
    } else {
      addRecurring({
        name: trimmedName,
        amount,
        category,
        billingDay,
        isActive,
      });
    }
    router.back();
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "");
    setAmountText(digits);
    setError("");
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="close" size={24} color="#374151" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditMode ? "定期支出を編集" : "定期支出を追加"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* サービス名 */}
          <Text style={styles.label}>サービス名</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={(t) => { setName(t); setError(""); }}
            placeholder="例: Netflix、家賃、ジム会費"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            maxLength={30}
          />

          {/* 金額 */}
          <Text style={styles.label}>月額</Text>
          <View style={styles.amountRow}>
            <Text style={styles.yen}>¥</Text>
            <TextInput
              style={styles.amountInput}
              value={amountText ? Number(amountText).toLocaleString() : ""}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor="#D1D5DB"
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>
          <View style={styles.amountUnderline} />

          {/* カテゴリ */}
          <Text style={styles.label}>カテゴリ</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const selected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={({ pressed }) => [
                    styles.categoryItem,
                    selected && { borderColor: cat.color, backgroundColor: cat.color + "11" },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryIconBg,
                      { backgroundColor: selected ? cat.color + "33" : "#F3F4F6" },
                    ]}
                  >
                    <MaterialIcons
                      name={cat.icon as any}
                      size={22}
                      color={selected ? cat.color : "#6B7280"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selected && { color: cat.color, fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 引き落とし日 */}
          <Text style={styles.label}>引き落とし日</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.billingDayRow}
          >
            {BILLING_DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => setBillingDay(day)}
                style={({ pressed }) => [
                  styles.dayChip,
                  billingDay === day && styles.dayChipSelected,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    billingDay === day && styles.dayChipTextSelected,
                  ]}
                >
                  {day}日
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* 有効/無効 */}
          <View style={styles.activeRow}>
            <View>
              <Text style={styles.activeLabel}>自動計上を有効にする</Text>
              <Text style={styles.activeSubLabel}>毎月引き落とし日に自動で支出を記録します</Text>
            </View>
            <Pressable
              onPress={() => setIsActive(!isActive)}
              style={[styles.toggle, isActive && styles.toggleOn]}
            >
              <View style={[styles.toggleThumb, isActive && styles.toggleThumbOn]} />
            </Pressable>
          </View>

          {/* エラー */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* 保存ボタン */}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.saveBtnText}>
              {isEditMode ? "変更を保存する" : "追加する"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
    marginTop: 20,
  },
  nameInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },
  yen: {
    fontSize: 28,
    fontWeight: "700",
    color: "#374151",
    marginRight: 4,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    padding: 0,
  },
  amountUnderline: {
    height: 2,
    backgroundColor: "#22C55E",
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryItem: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  billingDayRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  dayChipSelected: {
    backgroundColor: "#22C55E22",
    borderColor: "#22C55E",
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  dayChipTextSelected: {
    color: "#16A34A",
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  activeSubLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    maxWidth: 220,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: "#22C55E",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 32,
  },
  saveBtnText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
});
