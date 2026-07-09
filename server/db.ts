import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  budgets,
  coachMessages,
  expenses,
  monthlyReports,
  notificationSettings,
  users,
  weeklyReports,
  type InsertBudget,
  type InsertCoachMessage,
  type InsertExpense,
  type InsertMonthlyReport,
  type InsertNotificationSetting,
  type InsertUser,
  type InsertWeeklyReport,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users (required by _core/sdk.ts) ────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Expenses ─────────────────────────────────────────────────────────────

export async function getUserExpenses(userId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.createdAt))
    .limit(limit);
}

export async function getExpensesByMonth(userId: number, monthKey: string) {
  const db = await getDb();
  if (!db) return [];
  const start = new Date(`${monthKey}-01T00:00:00Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.createdAt, start),
        lte(expenses.createdAt, end)
      )
    )
    .orderBy(desc(expenses.createdAt));
}

export async function getExpensesByDateRange(userId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.createdAt, from),
        lte(expenses.createdAt, to)
      )
    )
    .orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data);
  return result[0].insertId;
}

export async function deleteExpense(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

// ─── Budgets ──────────────────────────────────────────────────────────────

export async function getBudgetForMonth(userId: number, monthKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.monthKey, monthKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getBudgetForMonth(data.userId, data.monthKey);
  if (existing) {
    await db
      .update(budgets)
      .set({ budgetAmount: data.budgetAmount })
      .where(eq(budgets.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(budgets).values(data);
  return result[0].insertId;
}

// ─── Weekly Reports ───────────────────────────────────────────────────────

export async function getWeeklyReports(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.userId, userId))
    .orderBy(desc(weeklyReports.createdAt))
    .limit(limit);
}

export async function getWeeklyReportByKey(userId: number, weekKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(weeklyReports)
    .where(and(eq(weeklyReports.userId, userId), eq(weeklyReports.weekKey, weekKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertWeeklyReport(data: InsertWeeklyReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getWeeklyReportByKey(data.userId, data.weekKey);
  if (existing) {
    await db.update(weeklyReports).set(data).where(eq(weeklyReports.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(weeklyReports).values(data);
  return result[0].insertId;
}

// ─── Monthly Reports ──────────────────────────────────────────────────────

export async function getMonthlyReports(userId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(monthlyReports)
    .where(eq(monthlyReports.userId, userId))
    .orderBy(desc(monthlyReports.createdAt))
    .limit(limit);
}

export async function getMonthlyReportByKey(userId: number, monthKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(monthlyReports)
    .where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.monthKey, monthKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertMonthlyReport(data: InsertMonthlyReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMonthlyReportByKey(data.userId, data.monthKey);
  if (existing) {
    await db.update(monthlyReports).set(data).where(eq(monthlyReports.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(monthlyReports).values(data);
  return result[0].insertId;
}

// ─── Coach Messages ───────────────────────────────────────────────────────

export async function getCoachMessages(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.userId, userId))
    .orderBy(desc(coachMessages.createdAt))
    .limit(limit);
  // Return in ascending order for display
  return rows.reverse();
}

export async function createCoachMessage(data: InsertCoachMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(coachMessages).values(data);
  return result[0].insertId;
}

export async function clearCoachMessages(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(coachMessages).where(eq(coachMessages.userId, userId));
}

// ─── Notification Settings ────────────────────────────────────────────────

export async function getNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertNotificationSettings(data: InsertNotificationSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getNotificationSettings(data.userId);
  if (existing) {
    await db
      .update(notificationSettings)
      .set(data)
      .where(eq(notificationSettings.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(notificationSettings).values(data);
  return result[0].insertId;
}
