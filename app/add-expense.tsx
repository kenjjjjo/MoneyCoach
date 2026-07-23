import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Modal,
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
import { useExpenses } from "@/lib/expense-context";

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
];

const PRESET_ICONS = [
  "medical-services",
  "pets",
  "flight",
  "directions-car",
  "child-friendly",
  "school",
  "fitness-center",
  "card-giftcard",
  "home",
  "shopping-cart",
  "receipt-long",
  "sports-soccer",
  "fastfood",
  "local-cafe",
  "movie",
  "build",
];

export default function AddExpenseScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addExpense, getAllCategories, addCustomCategory } = useExpenses();

  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  // 日付状態
  const [dateOption, setDateOption] = useState<"today" | "yesterday" | "custom">("today");
  const [customDateStr, setCustomDateStr] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  // カテゴリ追加モーダル状態
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState(PRESET_ICONS[0]);
  const [modalError, setModalError] = useState("");

  const categories = getAllCategories();

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setAmount(cleaned);
    if (error) setError("");
  };

  const getTargetDateISO = (): string | null => {
    const now = new Date();
    if (dateOption === "today") {
      return now.toISOString();
    } else if (dateOption === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday.toISOString();
    } else {
      // custom YYYY-MM-DD
      const dateParts = customDateStr.split("-");
      if (dateParts.length !== 3) return null;
      const y = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10) - 1;
      const d = parseInt(dateParts[2], 10);
      if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
      const customDate = new Date(y, m, d, now.getHours(), now.getMinutes(), now.getSeconds());
      if (isNaN(customDate.getTime())) return null;
      return customDate.toISOString();
    }
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

    const dateISO = getTargetDateISO();
    if (!dateISO) {
      setError("正しい日付 (YYYY-MM-DD) を入力してください");
      return;
    }

    addExpense({
      amount: num,
      category: selectedCategory,
      memo: memo.trim() || undefined,
      createdAt: dateISO,
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.back();
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
      setModalError("カテゴリ名を入力してください");
      return;
    }
    addCustomCategory({
      name: newCatName.trim(),
      color: newCatColor,
      icon: newCatIcon,
    });

    // 直後に作成されたカスタムカテゴリを選択
    const createdId = `custom_${Date.now()}`; // 直近追加分を想定
    // または全カテゴリ再取得から最後のものを選択
    setTimeout(() => {
      const updatedCats = getAllCategories();
      const lastCat = updatedCats[updatedCats.length - 1];
      if (lastCat) {
        setSelectedCategory(lastCat.id);
      }
    }, 50);

    setNewCatName("");
    setModalError("");
    setIsCategoryModalOpen(false);
  };

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
        {/* Date Selection */}
        <View style={styles.dateSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>日付</Text>
          <View style={styles.dateTabRow}>
            <TouchableOpacity
              style={[
                styles.dateTab,
                {
                  backgroundColor: dateOption === "today" ? colors.primary + "22" : colors.surface,
                  borderColor: dateOption === "today" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setDateOption("today")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateTabText,
                  { color: dateOption === "today" ? colors.primary : colors.foreground },
                ]}
              >
                今日
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateTab,
                {
                  backgroundColor: dateOption === "yesterday" ? colors.primary + "22" : colors.surface,
                  borderColor: dateOption === "yesterday" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setDateOption("yesterday")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateTabText,
                  { color: dateOption === "yesterday" ? colors.primary : colors.foreground },
                ]}
              >
                昨日
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateTab,
                {
                  backgroundColor: dateOption === "custom" ? colors.primary + "22" : colors.surface,
                  borderColor: dateOption === "custom" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setDateOption("custom")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateTabText,
                  { color: dateOption === "custom" ? colors.primary : colors.foreground },
                ]}
              >
                指定日
              </Text>
            </TouchableOpacity>
          </View>

          {dateOption === "custom" && (
            <View style={styles.customDateInputContainer}>
              <MaterialIcons name="event" size={20} color={colors.muted} />
              <TextInput
                style={[styles.customDateInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={customDateStr}
                onChangeText={setCustomDateStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          )}
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
              const iconName = cat.icon as React.ComponentProps<typeof MaterialIcons>["name"];

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

            {/* カテゴリ追加ボタン */}
            <TouchableOpacity
              style={[
                styles.categoryItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                },
              ]}
              onPress={() => setIsCategoryModalOpen(true)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.categoryIconBg,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <MaterialIcons name="add" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.categoryLabel, { color: colors.primary }]}>追加</Text>
            </TouchableOpacity>
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
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

      {/* カテゴリ追加モーダル */}
      <Modal visible={isCategoryModalOpen} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsCategoryModalOpen(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>新しいカテゴリを追加</Text>
              <Pressable onPress={() => setIsCategoryModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>カテゴリ名</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="例: 医療費、ペットなど"
                placeholderTextColor={colors.muted}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>カラー選択</Text>
              <View style={styles.colorPalette}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      newCatColor === c && styles.selectedColorDot,
                    ]}
                    onPress={() => setNewCatColor(c)}
                  />
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.muted }]}>アイコン選択</Text>
              <View style={styles.iconGrid}>
                {PRESET_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconChoice,
                      {
                        backgroundColor: newCatIcon === ic ? newCatColor + "22" : colors.surface,
                        borderColor: newCatIcon === ic ? newCatColor : colors.border,
                      },
                    ]}
                    onPress={() => setNewCatIcon(ic)}
                  >
                    <MaterialIcons name={ic as any} size={20} color={newCatIcon === ic ? newCatColor : colors.muted} />
                  </TouchableOpacity>
                ))}
              </View>

              {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}

              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateCategory}
              >
                <Text style={styles.modalSaveButtonText}>カテゴリを保存</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  dateSection: {
    gap: 8,
  },
  dateTabRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  dateTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  customDateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  customDateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedColorDot: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  modalSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
