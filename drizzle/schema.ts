import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── MoneyCoach V3.0 Tables ───────────────────────────────────────────────

/**
 * 支出テーブル
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  memo: text("memo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * 月予算テーブル
 */
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  monthKey: varchar("monthKey", { length: 7 }).notNull(), // "YYYY-MM"
  budgetAmount: int("budgetAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

/**
 * 週次レポートテーブル
 */
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(), // "YYYY-WNN"
  totalSpend: int("totalSpend").notNull().default(0),
  prevWeekTotal: int("prevWeekTotal").notNull().default(0),
  topCategory: varchar("topCategory", { length: 64 }),
  summary: text("summary"),
  goodPoints: text("goodPoints"),    // JSON array string
  warningPoints: text("warningPoints"), // JSON array string
  suggestions: text("suggestions"),  // JSON array string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReports.$inferInsert;

/**
 * 月次レポートテーブル
 */
export const monthlyReports = mysqlTable("monthly_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  monthKey: varchar("monthKey", { length: 7 }).notNull(), // "YYYY-MM"
  totalSpend: int("totalSpend").notNull().default(0),
  budgetAmount: int("budgetAmount").notNull().default(0),
  score: int("score").notNull().default(0), // 0-100
  grade: varchar("grade", { length: 1 }).notNull().default("C"), // A-E
  topCategory: varchar("topCategory", { length: 64 }),
  summary: text("summary"),
  goodPoints: text("goodPoints"),    // JSON array string
  warningPoints: text("warningPoints"), // JSON array string
  suggestions: text("suggestions"),  // JSON array string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type InsertMonthlyReport = typeof monthlyReports.$inferInsert;

/**
 * AIコーチ会話履歴テーブル
 */
export const coachMessages = mysqlTable("coach_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CoachMessage = typeof coachMessages.$inferSelect;
export type InsertCoachMessage = typeof coachMessages.$inferInsert;

/**
 * 通知設定テーブル
 */
export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  budgetAlert: boolean("budgetAlert").notNull().default(true),
  budgetAlertThreshold: int("budgetAlertThreshold").notNull().default(80),
  weeklyReport: boolean("weeklyReport").notNull().default(true),
  monthlyReport: boolean("monthlyReport").notNull().default(true),
  dailyReminder: boolean("dailyReminder").notNull().default(false),
  notificationTime: varchar("notificationTime", { length: 5 }).notNull().default("21:00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;
