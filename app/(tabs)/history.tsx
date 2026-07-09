import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { DonutChart } from "@/components/donut-chart";
import { useColors } from "@/hooks/use-colors";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type Category,
  type Expense,
  useExpenses,
} from "@/lib/expense-context";

type ViewMode = "list" | "calendar" | "weekly" | "monthly";

// Group expenses by date
function groupByDate(expenses: Expense[]): { date: string; items: Expense[] }[] {
  const map = new Map<string, Expense[]>();
  expenses.forEach((e) => {
    const d = e.createdAt.slice(0, 10);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Swipeable expense row
function ExpenseRow({ item, onDelete, onEdit, colors }: { item: Expense; onDelete: (id: string) => void; onEdit: (id: string) => void; colors: ReturnType<typeof useColors> }) {
  const translateX = useMemo(() => new Animated.Value(0), []);
  const [swiped, setSwiped] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    if (swiped) {
      // already open, do delete
      onDelete(item.id);
      return;
    }
    Animated.timing(translateX, {
      toValue: -80,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSwiped(true));
  }, [swiped, translateX, onDelete, item.id]);

  const handleClose = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSwiped(false));
  }, [translateX]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert("削除確認", "この支出を削除しますか？", [
      { text: "キャンセル", style: "cancel", onPress: handleClose },
      { text: "削除", style: "destructive", onPress: () => onDelete(item.id) },
    ]);
  }, [onDelete, item.id, handleClose]);

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <View style={styles.deleteBackground}>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <MaterialIcons name="delete" size={22} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>削除</Text>
        </Pressable>
      </View>

      {/* Row content */}
      <Animated.View
        style={[
          styles.expenseRowOuter,
          { backgroundColor: colors.surface, transform: [{ translateX }] },
        ]}
      >
        <Pressable
          style={[styles.expenseRow]}
          onPress={swiped ? handleClose : () => onEdit(item.id)}
          onLongPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            handleDelete();
          }}
        >
          <View
            style={[
              styles.categoryIconWrap,
              { backgroundColor: CATEGORY_COLORS[item.category] + "22" },
            ]}
          >
            <MaterialIcons
              name={CATEGORY_ICONS[item.category] as never}
              size={20}
              color={CATEGORY_COLORS[item.category]}
            />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={[styles.expenseCategoryLabel, { color: colors.foreground }]}>
              {CATEGORY_LABELS[item.category]}
            </Text>
            {item.memo ? (
              <Text style={[styles.expenseMemo, { color: colors.muted }]} numberOfLines={1}>
                {item.memo}
              </Text>
            ) : null}
          </View>
          <View style={styles.expenseRight}>
            <Text style={[styles.expenseAmount, { color: colors.foreground }]}>
              ¥{item.amount.toLocaleString()}
            </Text>
            <Text style={[styles.expenseTime, { color: colors.muted }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Calendar view component
function CalendarView({
  year,
  month,
  expenses,
  colors,
}: {
  year: number;
  month: number;
  expenses: Expense[];
  colors: ReturnType<typeof useColors>;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Build day → total map
  const dayTotals = useMemo(() => {
    const map: Record<number, number> = {};
    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + e.amount;
      }
    });
    return map;
  }, [expenses, year, month]);

  const selectedExpenses = useMemo(() => {
    if (!selectedDay) return [];
    return expenses.filter((e) => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
    });
  }, [expenses, year, month, selectedDay]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <View style={styles.calendarContainer}>
      {/* Day headers */}
      <View style={styles.calendarHeader}>
        {dayLabels.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.calendarDayLabel,
              { color: i === 0 ? "#EF4444" : i === 6 ? "#3B82F6" : colors.muted },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={styles.calendarCell} />;
          const hasExpense = !!dayTotals[day];
          const isToday = isCurrentMonth && day === today.getDate();
          const isSelected = day === selectedDay;
          const dayOfWeek = (firstDay + day - 1) % 7;

          return (
            <Pressable
              key={day}
              style={({ pressed }) => [
                styles.calendarCell,
                isSelected && { backgroundColor: colors.primary + "22", borderRadius: 10 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setSelectedDay(isSelected ? null : day)}
            >
              <View
                style={[
                  styles.calendarDayCircle,
                  isToday && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    {
                      color: isToday
                        ? "#FFFFFF"
                        : dayOfWeek === 0
                        ? "#EF4444"
                        : dayOfWeek === 6
                        ? "#3B82F6"
                        : colors.foreground,
                    },
                  ]}
                >
                  {day}
                </Text>
              </View>
              {hasExpense && (
                <View style={[styles.expenseDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected day expenses */}
      {selectedDay && selectedExpenses.length > 0 && (
        <View style={[styles.selectedDayPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.selectedDayTitle, { color: colors.foreground }]}>
            {month + 1}月{selectedDay}日の支出
          </Text>
          {selectedExpenses.map((e) => (
            <View key={e.id} style={styles.selectedDayItem}>
              <View style={[styles.selectedDayDot, { backgroundColor: CATEGORY_COLORS[e.category] }]} />
              <Text style={[styles.selectedDayCategory, { color: colors.foreground }]}>
                {CATEGORY_LABELS[e.category]}
              </Text>
              {e.memo ? (
                <Text style={[styles.selectedDayMemo, { color: colors.muted }]} numberOfLines={1}>
                  {e.memo}
                </Text>
              ) : null}
              <Text style={[styles.selectedDayAmount, { color: colors.foreground }]}>
                ¥{e.amount.toLocaleString()}
              </Text>
            </View>
          ))}
          <View style={[styles.selectedDayTotal, { borderTopColor: colors.border }]}>
            <Text style={[styles.selectedDayTotalLabel, { color: colors.muted }]}>合計</Text>
            <Text style={[styles.selectedDayTotalValue, { color: colors.primary }]}>
              ¥{selectedExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// V2.1: 週別集計ビュー
function WeeklySummaryView({
  year,
  month,
  expenses,
  colors,
}: {
  year: number;
  month: number;
  expenses: Expense[];
  colors: ReturnType<typeof useColors>;
}) {
  // Build weeks for the month
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const result: { label: string; start: Date; end: Date; total: number; items: Expense[] }[] = [];

    let weekStart = new Date(firstDay);
    let weekNum = 1;
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

      const weekExpenses = expenses.filter((e) => {
        const d = new Date(e.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
      const total = weekExpenses.reduce((s, e) => s + e.amount, 0);

      result.push({
        label: `第${weekNum}週 (${weekStart.getMonth() + 1}/${weekStart.getDate()}〜${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`,
        start: new Date(weekStart),
        end: new Date(weekEnd),
        total,
        items: weekExpenses,
      });

      weekStart.setDate(weekStart.getDate() + 7);
      weekNum++;
    }
    return result;
  }, [year, month, expenses]);

  const maxWeekTotal = Math.max(...weeks.map((w) => w.total), 1);

  return (
    <View style={styles.summaryContainer}>
      {weeks.map((week, i) => (
        <View key={i} style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRowHeader}>
            <Text style={[styles.summaryRowLabel, { color: colors.foreground }]}>{week.label}</Text>
            <Text style={[styles.summaryRowTotal, { color: colors.primary }]}>¥{week.total.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.summaryBarFill,
                { width: `${Math.round((week.total / maxWeekTotal) * 100)}%` as any, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.summaryRowCount, { color: colors.muted }]}>{week.items.length}件</Text>
        </View>
      ))}
      {weeks.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>この月の支出はまだありません</Text>
        </View>
      )}
    </View>
  );
}

// V2.1: 月別集計ビュー
function MonthlySummaryView({
  expenses,
  currentMonth,
  colors,
}: {
  expenses: Expense[];
  currentMonth: string;
  colors: ReturnType<typeof useColors>;
}) {
  // Build last 6 months
  const months = useMemo(() => {
    const result: { key: string; label: string; total: number }[] = [];
    const [cy, cm] = currentMonth.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      let y = cy;
      let m = cm - 1 - i;
      while (m < 0) { m += 12; y--; }
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const total = expenses
        .filter((e) => e.createdAt.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      result.push({ key, label: `${y < new Date().getFullYear() ? y + "/" : ""}${m + 1}月`, total });
    }
    return result;
  }, [expenses, currentMonth]);

  const maxTotal = Math.max(...months.map((m) => m.total), 1);

  return (
    <View style={styles.summaryContainer}>
      <Text style={[styles.summaryTitle, { color: colors.foreground }]}>過去6ヶ月の推移</Text>
      {months.map((m) => (
        <View key={m.key} style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRowHeader}>
            <Text style={[styles.summaryRowLabel, { color: m.key === currentMonth ? colors.primary : colors.foreground }]}>
              {m.label}{m.key === currentMonth ? " (今月)" : ""}
            </Text>
            <Text style={[styles.summaryRowTotal, { color: m.key === currentMonth ? colors.primary : colors.foreground }]}>
              ¥{m.total.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.summaryBarFill,
                {
                  width: `${Math.round((m.total / maxTotal) * 100)}%` as any,
                  backgroundColor: m.key === currentMonth ? colors.primary : colors.muted,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, deleteExpense, getMonthlyExpenses, getCurrentMonthKey } = useExpenses();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [layoutWidth, setLayoutWidth] = useState(0);
  const isPC = layoutWidth >= 768;

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const expenses = getMonthlyExpenses(monthKey);
  const monthlyTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const grouped = useMemo(() => groupByDate(expenses), [expenses]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextDate = new Date(nextYear, nextMonth, 1);
    if (nextDate > now) return;
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  }, [viewMonth, viewYear, now]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteExpense(id);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [deleteExpense]
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push({ pathname: "/edit-expense", params: { id } } as never);
    },
    [router]
  );

  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // Donut chart data
  const categoryTotals = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([cat, val]) => ({
      category: cat as Category,
      value: val as number,
    })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const categoryBreakdownLeft = (
    <View style={[styles.pcLeftCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.pcBreakdownTitle, { color: colors.foreground }]}>カテゴリ別内訳</Text>
      {categoryTotals.length > 0 ? (
        <View style={styles.pcChartWrapper}>
          <View style={styles.donutCenter}>
            <DonutChart segments={categoryTotals} size={120} strokeWidth={16} />
          </View>
          <View style={styles.pcBreakdownList}>
            {categoryTotals.map((item) => {
              const percent = monthlyTotal > 0 ? Math.round((item.value / monthlyTotal) * 100) : 0;
              return (
                <View key={item.category} style={styles.pcCatRow}>
                  <View style={[styles.pcCatDot, { backgroundColor: CATEGORY_COLORS[item.category] }]} />
                  <Text style={[styles.pcCatLabel, { color: colors.foreground }]} numberOfLines={1}>
                    {CATEGORY_LABELS[item.category]}
                  </Text>
                  <Text style={[styles.pcCatPercent, { color: colors.muted }]}>{percent}%</Text>
                  <Text style={[styles.pcCatAmount, { color: colors.foreground }]}>
                    ¥{item.value.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.pcNoData}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>支出データがありません</Text>
        </View>
      )}
    </View>
  );

  const transactionsList = (
    <>
      {grouped.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            この月の支出はまだありません
          </Text>
        </View>
      ) : (
        grouped.map((group) => (
          <View key={group.date} style={isPC && styles.pcDateGroupCard}>
            <View style={[styles.dateHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.dateHeaderText, { color: colors.muted }]}>
                {formatDateLabel(group.date)}
              </Text>
              <Text style={[styles.dateTotalText, { color: colors.muted }]}>
                ¥{group.items.reduce((s, e) => s + e.amount, 0).toLocaleString()}
              </Text>
            </View>
            {group.items.map((item) => (
              <ExpenseRow
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onEdit={handleEdit}
                colors={colors}
              />
            ))}
          </View>
        ))
      )}
    </>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>履歴</Text>
        <View style={styles.viewToggle}>
          <Pressable
            style={({ pressed }) => [
              styles.viewToggleBtn,
              viewMode === "list" && { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setViewMode("list")}
          >
            <MaterialIcons name="list" size={18} color={viewMode === "list" ? "#FFFFFF" : colors.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.viewToggleBtn,
              viewMode === "calendar" && { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setViewMode("calendar")}
          >
            <MaterialIcons name="calendar-today" size={18} color={viewMode === "calendar" ? "#FFFFFF" : colors.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.viewToggleBtn,
              viewMode === "weekly" && { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setViewMode("weekly")}
          >
            <MaterialIcons name="view-week" size={18} color={viewMode === "weekly" ? "#FFFFFF" : colors.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.viewToggleBtn,
              viewMode === "monthly" && { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setViewMode("monthly")}
          >
            <MaterialIcons name="bar-chart" size={18} color={viewMode === "monthly" ? "#FFFFFF" : colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, isPC && styles.scrollContentPC]}
          showsVerticalScrollIndicator={false}
        >
          {/* Month Navigator */}
          <View style={[styles.monthNav, { backgroundColor: colors.primary }]}>
            <Pressable
              style={({ pressed }) => [styles.monthNavBtn, pressed && { opacity: 0.6 }]}
              onPress={handlePrevMonth}
            >
              <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.monthNavText}>
              {viewYear}年{viewMonth + 1}月
            </Text>
            <Pressable
              style={({ pressed }) => [styles.monthNavBtn, pressed && { opacity: 0.6 }, isCurrentMonth && { opacity: 0.3 }]}
              onPress={handleNextMonth}
              disabled={isCurrentMonth}
            >
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Monthly Total */}
          <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.muted }]}>今月の支出合計</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              ¥{monthlyTotal.toLocaleString()}
            </Text>
          </View>

          {/* Calendar or List or Weekly or Monthly view */}
          {viewMode === "calendar" ? (
            <View style={styles.calendarWrapper}>
              <CalendarView
                year={viewYear}
                month={viewMonth}
                expenses={state.expenses}
                colors={colors}
              />
            </View>
          ) : viewMode === "weekly" ? (
            <WeeklySummaryView
              year={viewYear}
              month={viewMonth}
              expenses={expenses}
              colors={colors}
            />
          ) : viewMode === "monthly" ? (
            <MonthlySummaryView
              expenses={state.expenses}
              currentMonth={monthKey}
              colors={colors}
            />
          ) : isPC ? (
            <View style={styles.pcLayoutRow}>
              {/* Left Column: Category breakdown */}
              <View style={styles.pcLeftCol}>
                {categoryBreakdownLeft}
              </View>

              {/* Right Column: Detailed transaction list */}
              <View style={styles.pcRightCol}>
                {transactionsList}
              </View>
            </View>
          ) : (
            transactionsList
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    gap: 2,
  },
  viewToggleBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthNavText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  totalCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "800",
  },
  calendarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  calendarContainer: {
    gap: 8,
  },
  calendarHeader: {
    flexDirection: "row",
  },
  calendarDayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 4,
    gap: 2,
  },
  calendarDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  expenseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  selectedDayPanel: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedDayItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedDayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedDayCategory: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 60,
  },
  selectedDayMemo: {
    flex: 1,
    fontSize: 13,
  },
  selectedDayAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  selectedDayTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  selectedDayTotalLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  selectedDayTotalValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dateTotalText: {
    fontSize: 13,
    fontWeight: "500",
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
  },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  expenseRowOuter: {
    backgroundColor: "#FFFFFF",
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseInfo: {
    flex: 1,
    gap: 2,
  },
  expenseCategoryLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  expenseMemo: {
    fontSize: 12,
    lineHeight: 16,
  },
  expenseRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  expenseTime: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "400",
  },
  bottomSpacer: {
    height: 32,
  },
  // V2.1: 週別・月別集計ビュー
  summaryContainer: {
    padding: 16,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryRow: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  summaryRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryRowTotal: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  summaryRowCount: {
    fontSize: 11,
    fontWeight: "400",
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
    paddingHorizontal: 16,
  },
  pcLeftCol: {
    flex: 1.1,
    gap: 12,
  },
  pcRightCol: {
    flex: 1.5,
    gap: 12,
  },
  pcLeftCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  pcBreakdownTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  pcChartWrapper: {
    alignItems: "center",
    gap: 16,
  },
  donutCenter: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pcBreakdownList: {
    width: "100%",
    gap: 10,
  },
  pcCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pcCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pcCatLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  pcCatPercent: {
    fontSize: 11,
    width: 32,
    textAlign: "right",
  },
  pcCatAmount: {
    fontSize: 13,
    fontWeight: "600",
    width: 72,
    textAlign: "right",
  },
  pcNoData: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  pcDateGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
});
