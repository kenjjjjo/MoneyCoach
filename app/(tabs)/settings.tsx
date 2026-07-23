import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  useExpenses,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/expense-context";

export default function SettingsScreen() {
  const colors = useColors();
  const {
    state,
    setBudget,
    updateNotificationSettings,
    deleteRecurring,
    getCategoryLabel,
    getCategoryColor,
    getCategoryIcon,
    addCustomCategory,
    deleteCustomCategory,
  } = useExpenses();
  const [budgetInput, setBudgetInput] = useState(state.monthlyBudget.toString());
  const [isEditing, setIsEditing] = useState(false);

  // 通知設定のローカル状態
  const notif = state.notificationSettings;

  const handleSaveBudget = () => {
    const amount = parseInt(budgetInput.replace(/,/g, ""), 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("入力エラー", "正しい金額を入力してください");
      return;
    }
    if (amount > 10000000) {
      Alert.alert("入力エラー", "予算は1,000万円以下で設定してください");
      return;
    }
    setBudget(amount);
    setIsEditing(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("保存しました", `月予算を¥${amount.toLocaleString()}に設定しました`);
  };

  const handleCancelEdit = () => {
    setBudgetInput(state.monthlyBudget.toString());
    setIsEditing(false);
  };

  const toggleNotif = (key: keyof typeof notif) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateNotificationSettings({ [key]: !notif[key] });
  };

  const handleThresholdChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      updateNotificationSettings({ budgetAlertThreshold: num });
    }
  };

  const [layoutWidth, setLayoutWidth] = useState(0);
  const isPC = layoutWidth >= 768;

  // 各セクションのコンポーネント定義
  const budgetSection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>予算設定</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIconWrap, { backgroundColor: "#22C55E22" }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#22C55E" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>月予算</Text>
              <Text style={[styles.settingDesc, { color: colors.muted }]}>
                毎月の支出上限を設定します
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.budgetEditArea, { borderTopColor: colors.border }]}>
          {isEditing ? (
            <View style={styles.budgetEditRow}>
              <Text style={[styles.yenSign, { color: colors.foreground }]}>¥</Text>
              <TextInput
                style={[
                  styles.budgetInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.primary,
                    backgroundColor: colors.background,
                  },
                ]}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveBudget}
              />
              <View style={styles.budgetEditActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.editActionBtn,
                    { backgroundColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.editActionText, { color: colors.muted }]}>キャンセル</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.editActionBtn,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleSaveBudget}
                >
                  <Text style={[styles.editActionText, { color: "#FFFFFF" }]}>保存</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.budgetDisplayRow}>
              <Text style={[styles.budgetDisplayValue, { color: colors.foreground }]}>
                ¥{state.monthlyBudget.toLocaleString()}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editBtn,
                  { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setBudgetInput(state.monthlyBudget.toString());
                  setIsEditing(true);
                }}
              >
                <MaterialIcons name="edit" size={16} color={colors.primary} />
                <Text style={[styles.editBtnText, { color: colors.primary }]}>変更</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const notificationSection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>通知設定</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* 予算超過アラート */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIconWrap, { backgroundColor: "#EF444422" }]}>
              <MaterialIcons name="notifications-active" size={20} color="#EF4444" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>予算超過アラート</Text>
              <Text style={[styles.settingDesc, { color: colors.muted }]}>
                予算の{notif.budgetAlertThreshold}%を超えたら通知
              </Text>
            </View>
          </View>
          <Switch
            value={notif.budgetAlert}
            onValueChange={() => toggleNotif("budgetAlert")}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={notif.budgetAlert ? colors.primary : colors.muted}
          />
        </View>

        {/* 予算アラート閾値 */}
        {notif.budgetAlert && (
          <View style={[styles.thresholdRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.thresholdLabel, { color: colors.muted }]}>アラート閾値</Text>
            <View style={styles.thresholdButtons}>
              {[50, 70, 80, 90].map((v) => (
                <Pressable
                  key={v}
                  style={({ pressed }) => [
                    styles.thresholdBtn,
                    {
                      backgroundColor:
                        notif.budgetAlertThreshold === v ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleThresholdChange(v.toString())}
                >
                  <Text
                    style={[
                      styles.thresholdBtnText,
                      { color: notif.budgetAlertThreshold === v ? "#FFFFFF" : colors.muted },
                    ]}
                  >
                    {v}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

        {/* 週次レポート通知 */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIconWrap, { backgroundColor: "#3B82F622" }]}>
              <MaterialIcons name="view-week" size={20} color="#3B82F6" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>週次レポート通知</Text>
              <Text style={[styles.settingDesc, { color: colors.muted }]}>
                毎週日曜日に週次レポートを通知
              </Text>
            </View>
          </View>
          <Switch
            value={notif.weeklyReport}
            onValueChange={() => toggleNotif("weeklyReport")}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={notif.weeklyReport ? colors.primary : colors.muted}
          />
        </View>

        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

        {/* 月次レポート通知 */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIconWrap, { backgroundColor: "#8B5CF622" }]}>
              <MaterialIcons name="bar-chart" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>月次レポート通知</Text>
              <Text style={[styles.settingDesc, { color: colors.muted }]}>
                毎月末日に月次レポートを通知
              </Text>
            </View>
          </View>
          <Switch
            value={notif.monthlyReport}
            onValueChange={() => toggleNotif("monthlyReport")}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={notif.monthlyReport ? colors.primary : colors.muted}
          />
        </View>

        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

        {/* 毎日リマインダー */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIconWrap, { backgroundColor: "#F59E0B22" }]}>
              <MaterialIcons name="alarm" size={20} color="#F59E0B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>毎日リマインダー</Text>
              <Text style={[styles.settingDesc, { color: colors.muted }]}>
                支出入力を毎日夜21時に通知
              </Text>
            </View>
          </View>
          <Switch
            value={notif.dailyReminder}
            onValueChange={() => toggleNotif("dailyReminder")}
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={notif.dailyReminder ? colors.primary : colors.muted}
          />
        </View>
      </View>
    </View>
  );

  const webPushSection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>Web Push 通知</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable 
          style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
          onPress={async () => {
            const { registerWebPush } = await import('../../lib/push-notifications');
            const sub = await registerWebPush();
            if (sub) {
              alert("通知が有効になりました！");
            } else {
              alert("通知の有効化に失敗したか、ブラウザがサポートしていません。");
            }
          }}
        >
          <Text style={[styles.settingTitle, { color: colors.foreground }]}>ブラウザ通知を有効にする</Text>
          <MaterialIcons name="notifications-active" size={24} color={colors.primary} />
        </Pressable>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.settingDesc, { padding: 16, color: colors.muted }]}>
          ※ブラウザの通知設定を許可する必要があります。プッシュ通知を受信するにはService Workerが登録されます。
        </Text>
      </View>
    </View>
  );

  const recurringSection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>定期支出・固定費</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {state.recurringExpenses.length === 0 ? (
          <View style={styles.emptyRecurring}>
            <MaterialIcons name="repeat" size={32} color={colors.muted} />
            <Text style={[styles.emptyRecurringText, { color: colors.muted }]}>
              定期支出がまだ登録されていません
            </Text>
            <Text style={[styles.emptyRecurringSubText, { color: colors.muted }]}>
              サブスクや家賃などを登録すると毎月自動で計上されます
            </Text>
          </View>
        ) : (
          state.recurringExpenses.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.recurringRow}>
                <View
                  style={[
                    styles.recurringIconWrap,
                    { backgroundColor: getCategoryColor(item.category) + "22" },
                  ]}
                >
                  <MaterialIcons
                    name={(getCategoryIcon(item.category) || "category") as never}
                    size={20}
                    color={getCategoryColor(item.category)}
                  />
                </View>
                <View style={styles.recurringInfo}>
                  <Text style={[styles.recurringName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.recurringMeta, { color: colors.muted }]}>
                    {getCategoryLabel(item.category)} · 毎月{item.billingDay}日 · ¥{item.amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.recurringActions}>
                  {!item.isActive && (
                    <View style={[styles.pausedBadge, { backgroundColor: colors.border }]}>
                      <Text style={[styles.pausedText, { color: colors.muted }]}>停止中</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => router.push({ pathname: "/add-recurring-expense", params: { editId: item.id } } as never)}
                    style={({ pressed }) => [styles.recurringEditBtn, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialIcons name="edit" size={18} color={colors.muted} />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "削除の確認",
                        `「${item.name}」を削除しますか？`,
                        [
                          { text: "キャンセル", style: "cancel" },
                          {
                            text: "削除",
                            style: "destructive",
                            onPress: () => deleteRecurring(item.id),
                          },
                        ]
                      )
                    }
                    style={({ pressed }) => [styles.recurringDeleteBtn, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              {idx < state.recurringExpenses.length - 1 && (
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))
        )}
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={() => router.push("/add-recurring-expense" as never)}
          style={({ pressed }) => [styles.addRecurringBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons name="add" size={20} color="#22C55E" />
          <Text style={styles.addRecurringBtnText}>定期支出を追加する</Text>
        </Pressable>
      </View>
      {state.recurringExpenses.length > 0 && (
        <View style={[styles.recurringTotalRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.recurringTotalLabel, { color: colors.muted }]}>月額合計（有効）</Text>
          <Text style={[styles.recurringTotalValue, { color: "#22C55E" }]}>
            ¥{state.recurringExpenses.filter((r) => r.isActive).reduce((s, r) => s + r.amount, 0).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  const customCategorySection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>カスタムカテゴリ</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {state.customCategories.length === 0 ? (
          <View style={styles.emptyRecurring}>
            <MaterialIcons name="category" size={32} color={colors.muted} />
            <Text style={[styles.emptyRecurringText, { color: colors.muted }]}>
              カスタムカテゴリはありません
            </Text>
            <Text style={[styles.emptyRecurringSubText, { color: colors.muted }]}>
              支出登録画面の「+追加」からオリジナルのカテゴリを作成できます
            </Text>
          </View>
        ) : (
          state.customCategories.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.recurringRow}>
                <View
                  style={[
                    styles.recurringIconWrap,
                    { backgroundColor: item.color + "22" },
                  ]}
                >
                  <MaterialIcons
                    name={(item.icon || "category") as never}
                    size={20}
                    color={item.color}
                  />
                </View>
                <View style={styles.recurringInfo}>
                  <Text style={[styles.recurringName, { color: colors.foreground }]}>{item.name}</Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      "削除の確認",
                      `「${item.name}」カテゴリを削除しますか？`,
                      [
                        { text: "キャンセル", style: "cancel" },
                        {
                          text: "削除",
                          style: "destructive",
                          onPress: () => deleteCustomCategory(item.id),
                        },
                      ]
                    )
                  }
                  style={({ pressed }) => [styles.recurringDeleteBtn, pressed && { opacity: 0.6 }]}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
              {idx < state.customCategories.length - 1 && (
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );

  const futureSection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>将来対応予定</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { icon: "dark-mode", label: "ダークモード", desc: "v3.0で対応予定" },
          { icon: "download", label: "データエクスポート（CSV）", desc: "v3.0で対応予定" },
          { icon: "sync", label: "クラウド同期", desc: "v3.0で対応予定" },
        ].map((item, idx, arr) => (
          <View key={item.label}>
            <View style={[styles.settingRow, styles.disabledRow]}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.border }]}>
                  <MaterialIcons name={item.icon as never} size={20} color={colors.muted} />
                </View>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, { color: colors.muted }]}>{item.label}</Text>
                  <Text style={[styles.settingDesc, { color: colors.muted }]}>{item.desc}</Text>
                </View>
              </View>
              <View style={[styles.comingSoonBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.comingSoonText, { color: colors.muted }]}>準備中</Text>
              </View>
            </View>
            {idx < arr.length - 1 && (
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const appInfoSection = (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>アプリ情報</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { label: "バージョン", value: "2.1.0" },
          { label: "ビルド", value: "MVP" },
          { label: "データ保存", value: "ローカル (IndexedDB/AsyncStorage)" },
        ].map((item, idx, arr) => (
          <View key={item.label}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
            </View>
            {idx < arr.length - 1 && (
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const aiInfoSection = (
    <View style={styles.section}>
      <View style={[styles.aiInfoCard, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
        <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
        <View style={styles.aiInfoText}>
          <Text style={[styles.aiInfoTitle, { color: colors.foreground }]}>AI機能について</Text>
          <Text style={[styles.aiInfoDesc, { color: colors.muted }]}>
            AIコーチはあなたの支出データのみを参照します。医療・法律・投資に関するアドバイスは行いません。
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>設定</Text>
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}>
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, isPC && styles.scrollContentPC]} 
            showsVerticalScrollIndicator={false}
          >
            {isPC ? (
              <View style={styles.pcLayoutRow}>
                {/* Left Column: Core configurations */}
                <View style={styles.pcLeftCol}>
                  {budgetSection}
                  {notificationSection}
                  {customCategorySection}
                  {webPushSection}
                  {futureSection}
                </View>

                {/* Right Column: Recurring expenses & info */}
                <View style={styles.pcRightCol}>
                  {recurringSection}
                  {appInfoSection}
                  {aiInfoSection}
                </View>
              </View>
            ) : (
              <>
                {budgetSection}
                {notificationSection}
                {customCategorySection}
                {webPushSection}
                {recurringSection}
                {futureSection}
                {appInfoSection}
                {aiInfoSection}
              </>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  disabledRow: { opacity: 0.6 },
  settingInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextWrap: { flex: 1, gap: 2 },
  settingTitle: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 12, lineHeight: 16 },
  comingSoonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  comingSoonText: { fontSize: 11, fontWeight: "600" },
  // Budget
  budgetEditArea: { borderTopWidth: 0.5, padding: 16 },
  budgetDisplayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  budgetDisplayValue: { fontSize: 28, fontWeight: "800" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontWeight: "600" },
  budgetEditRow: { gap: 12 },
  yenSign: { fontSize: 16, fontWeight: "600" },
  budgetInput: {
    fontSize: 28,
    fontWeight: "800",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  budgetEditActions: { flexDirection: "row", gap: 10 },
  editActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  editActionText: { fontSize: 15, fontWeight: "600" },
  // Notification threshold
  thresholdRow: {
    borderTopWidth: 0.5,
    padding: 16,
    gap: 10,
  },
  thresholdLabel: { fontSize: 12, fontWeight: "500" },
  thresholdButtons: { flexDirection: "row", gap: 8 },
  thresholdBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  thresholdBtnText: { fontSize: 13, fontWeight: "700" },
  // Notification note
  notifNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notifNoteText: { fontSize: 12, lineHeight: 17, flex: 1 },
  // Divider
  rowDivider: { height: 0.5, marginHorizontal: 16 },
  // Info
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  infoLabel: { fontSize: 14, fontWeight: "400" },
  infoValue: { fontSize: 14, fontWeight: "500" },
  // AI info
  aiInfoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  aiInfoText: { flex: 1, gap: 4 },
  aiInfoTitle: { fontSize: 14, fontWeight: "600" },
  aiInfoDesc: { fontSize: 13, lineHeight: 19 },
  bottomSpacer: { height: 32 },
  // Recurring expenses
  emptyRecurring: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyRecurringText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  emptyRecurringSubText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  recurringIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recurringInfo: { flex: 1, gap: 3 },
  recurringName: { fontSize: 15, fontWeight: "600" },
  recurringMeta: { fontSize: 12, lineHeight: 16 },
  recurringActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  recurringEditBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  recurringDeleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  pausedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  pausedText: { fontSize: 11, fontWeight: "600" },
  addRecurringBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 16,
  },
  addRecurringBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#22C55E",
  },
  recurringTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  recurringTotalLabel: { fontSize: 14, fontWeight: "500" },
  recurringTotalValue: { fontSize: 18, fontWeight: "800" },
  scrollContent: {
    padding: 16,
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
    flex: 1.2,
    gap: 12,
  },
});
