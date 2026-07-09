import { storage } from "./storage";
import React, { createContext, useCallback, useContext, useEffect, useReducer } from "react";

export type Category =
  | "food"
  | "convenience"
  | "transport"
  | "hobby"
  | "beauty"
  | "subscription"
  | "other";

export type Expense = {
  id: string;
  amount: number;
  category: Category;
  memo?: string;
  createdAt: string; // ISO date string
};

// 定期支出（サブスク・固定費）
export type RecurringExpense = {
  id: string;
  name: string; // 「Netflix」「家賃」など
  amount: number;
  category: Category;
  billingDay: number; // 引き落とし日（1〜28）
  isActive: boolean;
  createdAt: string;
};

export type MonthlyBudget = {
  amount: number;
  month: string; // YYYY-MM
};

// V2.1: 通知設定
export type NotificationSettings = {
  weeklyReport: boolean;
  monthlyReport: boolean;
  budgetAlert: boolean;
  budgetAlertThreshold: number; // アラートを発火する予算使用率（%）
  dailyReminder: boolean; // 毎日リマインダー
  notificationTime: string; // "HH:MM" format, default "21:00"
};

// V2.1: 週次レポート
export type WeeklyReport = {
  id: string;
  weekKey: string; // "YYYY-WNN" format
  totalSpend: number;
  prevWeekTotal: number;
  categoryRanking: { category: Category; total: number }[];
  goodPoints: string[];
  warningPoints: string[];
  suggestions: string[];
  summary: string;
  createdAt: string;
};

// V2.1: 月次レポート
export type MonthlyReport = {
  id: string;
  monthKey: string; // "YYYY-MM" format
  totalSpend: number;
  budget: number;
  score: number; // 0-100
  grade: string; // A-E
  categoryRanking: { category: Category; total: number }[];
  prevMonthTotal: number;
  goodPoints: string[];
  warningPoints: string[];
  suggestions: string[];
  summary: string;
  createdAt: string;
};

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "食費",
  convenience: "コンビニ",
  transport: "交通費",
  hobby: "趣味",
  beauty: "美容",
  subscription: "サブスク",
  other: "その他",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  food: "#22C55E",
  convenience: "#F59E0B",
  transport: "#3B82F6",
  hobby: "#8B5CF6",
  beauty: "#EC4899",
  subscription: "#06B6D4",
  other: "#94A3B8",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  food: "restaurant",
  convenience: "store",
  transport: "train",
  hobby: "sports-esports",
  beauty: "favorite",
  subscription: "credit-card",
  other: "more-horiz",
};

type State = {
  expenses: Expense[];
  monthlyBudget: number;
  notificationSettings: NotificationSettings;
  weeklyReports: WeeklyReport[];
  monthlyReports: MonthlyReport[];
  recurringExpenses: RecurringExpense[];
  autoChargedMonths: string[]; // 自動計上済みの月キー一覧
};

type Action =
  | { type: "ADD_EXPENSE"; expense: Expense }
  | { type: "UPDATE_EXPENSE"; expense: Expense }
  | { type: "DELETE_EXPENSE"; id: string }
  | { type: "SET_BUDGET"; amount: number }
  | { type: "SET_NOTIFICATION_SETTINGS"; settings: Partial<NotificationSettings> }
  | { type: "ADD_WEEKLY_REPORT"; report: WeeklyReport }
  | { type: "ADD_MONTHLY_REPORT"; report: MonthlyReport }
  | { type: "LOAD_STATE"; state: State }
  | { type: "ADD_RECURRING"; recurring: RecurringExpense }
  | { type: "UPDATE_RECURRING"; recurring: RecurringExpense }
  | { type: "DELETE_RECURRING"; id: string }
  | { type: "MARK_AUTO_CHARGED"; monthKey: string };

const STORAGE_KEY = "money_coach_data_v30";
const DEFAULT_BUDGET = 50000;

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  weeklyReport: true,
  monthlyReport: true,
  budgetAlert: true,
  budgetAlertThreshold: 80,
  dailyReminder: false,
  notificationTime: "21:00",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_EXPENSE":
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.expense.id ? action.expense : e
        ),
      };
    case "DELETE_EXPENSE":
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) };
    case "SET_BUDGET":
      return { ...state, monthlyBudget: action.amount };
    case "SET_NOTIFICATION_SETTINGS":
      return {
        ...state,
        notificationSettings: { ...state.notificationSettings, ...action.settings },
      };
    case "ADD_WEEKLY_REPORT":
      return {
        ...state,
        weeklyReports: [
          action.report,
          ...state.weeklyReports.filter((r) => r.weekKey !== action.report.weekKey),
        ],
      };
    case "ADD_MONTHLY_REPORT":
      return {
        ...state,
        monthlyReports: [
          action.report,
          ...state.monthlyReports.filter((r) => r.monthKey !== action.report.monthKey),
        ],
      };
    case "LOAD_STATE":
      return action.state;
    case "ADD_RECURRING":
      return { ...state, recurringExpenses: [action.recurring, ...state.recurringExpenses] };
    case "UPDATE_RECURRING":
      return {
        ...state,
        recurringExpenses: state.recurringExpenses.map((r) =>
          r.id === action.recurring.id ? action.recurring : r
        ),
      };
    case "DELETE_RECURRING":
      return { ...state, recurringExpenses: state.recurringExpenses.filter((r) => r.id !== action.id) };
    case "MARK_AUTO_CHARGED":
      return {
        ...state,
        autoChargedMonths: [...state.autoChargedMonths.filter((m) => m !== action.monthKey), action.monthKey],
      };
    default:
      return state;
  }
}

type ExpenseContextType = {
  addRecurring: (recurring: Omit<RecurringExpense, "id" | "createdAt">) => void;
  updateRecurring: (recurring: RecurringExpense) => void;
  deleteRecurring: (id: string) => void;
  getRecurringTotal: () => number;
  state: State;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  setBudget: (amount: number) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  addWeeklyReport: (report: WeeklyReport) => void;
  addMonthlyReport: (report: MonthlyReport) => void;
  getMonthlyExpenses: (month: string) => Expense[];
  getMonthlyTotal: (month: string) => number;
  getWeeklyExpenses: (weekStart: Date) => Expense[];
  getWeeklyTotal: (weekStart: Date) => number;
  getCurrentMonthKey: () => string;
  getCurrentWeekKey: () => string;
  getLatestWeeklyReport: () => WeeklyReport | null;
  getLatestMonthlyReport: () => MonthlyReport | null;
  calculateScore: (month: string) => number;
  getInsights: (month: string) => string[];
};

const ExpenseContext = createContext<ExpenseContextType | null>(null);

// V2.1: 支出スコア計算（0〜100点）
function calcScore(expenses: Expense[], budget: number, monthlyTotal: number): number {
  if (expenses.length === 0) return 100;

  // 予算達成率 (40点満点)
  const budgetRate = budget > 0 ? Math.min(1, monthlyTotal / budget) : 1;
  const budgetScore = Math.round((1 - budgetRate) * 40);

  // 支出分散スコア (30点満点) - カテゴリが多いほど分散している
  const categories = new Set(expenses.map((e) => e.category)).size;
  const diversityScore = Math.min(30, categories * 5);

  // 急激な支出増加ペナルティ (20点満点)
  const now = new Date();
  const daysPassed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedTotal = daysPassed > 0 ? (monthlyTotal / daysPassed) * daysInMonth : 0;
  const overProjection = projectedTotal > budget ? (projectedTotal - budget) / budget : 0;
  const spikeScore = Math.max(0, 20 - Math.round(overProjection * 20));

  // 無駄遣い比率ペナルティ (10点満点) - コンビニ+趣味の比率
  const wasteCategories: Category[] = ["convenience", "hobby"];
  const wasteTotal = expenses
    .filter((e) => wasteCategories.includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const wasteRatio = monthlyTotal > 0 ? wasteTotal / monthlyTotal : 0;
  const wasteScore = Math.max(0, 10 - Math.round(wasteRatio * 10));

  return Math.min(100, Math.max(0, budgetScore + diversityScore + spikeScore + wasteScore));
}

// V2.1: マネーインサイト生成（計算ベース）
function generateInsights(expenses: Expense[], budget: number, monthlyTotal: number): string[] {
  const insights: string[] = [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (expenses.length === 0) return insights;

  // 先週比較
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);

  const thisWeekTotal = expenses
    .filter((e) => new Date(e.createdAt) >= thisWeekStart)
    .reduce((s, e) => s + e.amount, 0);
  const lastWeekTotal = expenses
    .filter((e) => {
      const d = new Date(e.createdAt);
      return d >= lastWeekStart && d < lastWeekEnd;
    })
    .reduce((s, e) => s + e.amount, 0);

  if (lastWeekTotal > 0 && thisWeekTotal > 0) {
    const diff = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
    if (diff > 0) {
      insights.push(`今週の支出は先週より${diff}%増加しています`);
    } else if (diff < 0) {
      insights.push(`今週の支出は先週より${Math.abs(diff)}%減少しています`);
    }
  }

  // カテゴリ比率
  const categoryTotals: Partial<Record<Category, number>> = {};
  expenses
    .filter((e) => e.createdAt.startsWith(currentMonth))
    .forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => (b as number) - (a as number))[0];
  if (topCategory && monthlyTotal > 0) {
    const ratio = Math.round(((topCategory[1] as number) / monthlyTotal) * 100);
    if (ratio >= 30) {
      insights.push(`${CATEGORY_LABELS[topCategory[0] as Category]}が支出の${ratio}%を占めています`);
    }
  }

  // 最大支出日
  const dayTotals: Record<string, number> = {};
  expenses
    .filter((e) => e.createdAt.startsWith(currentMonth))
    .forEach((e) => {
      const day = e.createdAt.slice(0, 10);
      dayTotals[day] = (dayTotals[day] || 0) + e.amount;
    });
  const maxDay = Object.entries(dayTotals).sort(([, a], [, b]) => b - a)[0];
  if (maxDay) {
    const d = new Date(maxDay[0] + "T00:00:00");
    insights.push(`今月最もお金を使った日は${d.getMonth() + 1}月${d.getDate()}日です`);
  }

  return insights.slice(0, 3);
}

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    expenses: [],
    monthlyBudget: DEFAULT_BUDGET,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    weeklyReports: [],
    monthlyReports: [],
    recurringExpenses: [],
    autoChargedMonths: [],
  });

  // Load from storage (or IndexedDB on Web) on mount
  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as State;
          // Merge with defaults to handle missing fields from older versions
          dispatch({
            type: "LOAD_STATE",
            state: {
              expenses: parsed.expenses || [],
              monthlyBudget: parsed.monthlyBudget || DEFAULT_BUDGET,
              notificationSettings: {
                ...DEFAULT_NOTIFICATION_SETTINGS,
                ...(parsed.notificationSettings || {}),
              },
              weeklyReports: parsed.weeklyReports || [],
              monthlyReports: parsed.monthlyReports || [],
              recurringExpenses: parsed.recurringExpenses || [],
              autoChargedMonths: parsed.autoChargedMonths || [],
            },
          });
        } catch {
          // ignore parse errors
        }
      }
    });
    // Also try to migrate from old data
    storage.getItem("money_coach_data").then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as { expenses?: Expense[]; monthlyBudget?: number };
          if (parsed.expenses && parsed.expenses.length > 0) {
            dispatch({
              type: "LOAD_STATE",
              state: {
                expenses: parsed.expenses,
                monthlyBudget: parsed.monthlyBudget || DEFAULT_BUDGET,
                notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
                weeklyReports: [],
                monthlyReports: [],
                recurringExpenses: [],
                autoChargedMonths: [],
              },
            });
          }
        } catch {
          // ignore
        }
      }
    });
  }, []);

  // Save to storage (or IndexedDB) on state change
  useEffect(() => {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addExpense = useCallback((expense: Omit<Expense, "id" | "createdAt">) => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_EXPENSE", expense: newExpense });
  }, []);

  const updateExpense = useCallback((expense: Expense) => {
    dispatch({ type: "UPDATE_EXPENSE", expense });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    dispatch({ type: "DELETE_EXPENSE", id });
  }, []);

  const setBudget = useCallback((amount: number) => {
    dispatch({ type: "SET_BUDGET", amount });
  }, []);

  const setNotificationSettings = useCallback((settings: Partial<NotificationSettings>) => {
    dispatch({ type: "SET_NOTIFICATION_SETTINGS", settings });
  }, []);

  const addWeeklyReport = useCallback((report: WeeklyReport) => {
    dispatch({ type: "ADD_WEEKLY_REPORT", report });
  }, []);

  const addMonthlyReport = useCallback((report: MonthlyReport) => {
    dispatch({ type: "ADD_MONTHLY_REPORT", report });
  }, []);

  const getCurrentMonthKey = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const getCurrentWeekKey = useCallback(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }, []);

  const getMonthlyExpenses = useCallback(
    (month: string) => {
      return state.expenses.filter((e) => e.createdAt.startsWith(month));
    },
    [state.expenses]
  );

  const getMonthlyTotal = useCallback(
    (month: string) => {
      return state.expenses
        .filter((e) => e.createdAt.startsWith(month))
        .reduce((sum, e) => sum + e.amount, 0);
    },
    [state.expenses]
  );

  const getWeeklyExpenses = useCallback(
    (weekStart: Date) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return state.expenses.filter((e) => {
        const d = new Date(e.createdAt);
        return d >= weekStart && d < weekEnd;
      });
    },
    [state.expenses]
  );

  const getWeeklyTotal = useCallback(
    (weekStart: Date) => {
      return getWeeklyExpenses(weekStart).reduce((sum, e) => sum + e.amount, 0);
    },
    [getWeeklyExpenses]
  );

  const getLatestWeeklyReport = useCallback(() => {
    return state.weeklyReports[0] || null;
  }, [state.weeklyReports]);

  const getLatestMonthlyReport = useCallback(() => {
    return state.monthlyReports[0] || null;
  }, [state.monthlyReports]);

  const calculateScore = useCallback(
    (month: string) => {
      const expenses = state.expenses.filter((e) => e.createdAt.startsWith(month));
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      return calcScore(expenses, state.monthlyBudget, total);
    },
    [state.expenses, state.monthlyBudget]
  );

  // 定期支出CRUD
  const addRecurring = useCallback((recurring: Omit<RecurringExpense, "id" | "createdAt">) => {
    const newRecurring: RecurringExpense = {
      ...recurring,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_RECURRING", recurring: newRecurring });
  }, []);

  const updateRecurring = useCallback((recurring: RecurringExpense) => {
    dispatch({ type: "UPDATE_RECURRING", recurring });
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    dispatch({ type: "DELETE_RECURRING", id });
  }, []);

  // 定期支出の合計（アクティブなもの）
  const getRecurringTotal = useCallback(() => {
    return state.recurringExpenses
      .filter((r) => r.isActive)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [state.recurringExpenses]);

  // 自動計上：アプリ起動時に当月分の定期支出を計上
  useEffect(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (state.autoChargedMonths.includes(currentMonthKey)) return;
    if (state.recurringExpenses.length === 0) return;

    const activeRecurring = state.recurringExpenses.filter((r) => r.isActive);
    if (activeRecurring.length === 0) return;

    // 当月の引き落とし日を過ぎているものを計上
    activeRecurring.forEach((r) => {
      const billingDate = new Date(now.getFullYear(), now.getMonth(), r.billingDay);
      if (now >= billingDate) {
        const newExpense: Expense = {
          id: `recurring_${r.id}_${currentMonthKey}`,
          amount: r.amount,
          category: r.category,
          memo: `[定期] ${r.name}`,
          createdAt: billingDate.toISOString(),
        };
        // 既に計上済みでないか確認
        const alreadyCharged = state.expenses.some((e) => e.id === newExpense.id);
        if (!alreadyCharged) {
          dispatch({ type: "ADD_EXPENSE", expense: newExpense });
        }
      }
    });
    dispatch({ type: "MARK_AUTO_CHARGED", monthKey: currentMonthKey });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recurringExpenses, state.autoChargedMonths]);

  const getInsights = useCallback(
    (month: string) => {
      const expenses = state.expenses.filter((e) => e.createdAt.startsWith(month));
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      return generateInsights(state.expenses, state.monthlyBudget, total);
    },
    [state.expenses, state.monthlyBudget]
  );

  return (
    <ExpenseContext.Provider
      value={{
        state,
        addExpense,
        updateExpense,
        deleteExpense,
        setBudget,
        setNotificationSettings,
        updateNotificationSettings: setNotificationSettings,
        addWeeklyReport,
        addMonthlyReport,
        getMonthlyExpenses,
        getMonthlyTotal,
        getWeeklyExpenses,
        getWeeklyTotal,
        getCurrentMonthKey,
        getCurrentWeekKey,
        getLatestWeeklyReport,
        getLatestMonthlyReport,
        calculateScore,
        getInsights,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        getRecurringTotal,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpenseProvider");
  return ctx;
}
