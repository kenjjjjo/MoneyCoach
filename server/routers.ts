import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateTemplateResponse } from "../lib/ai/templateEngine";
import * as db from "./db";

const CATEGORY_LABELS: Record<string, string> = {
  food: "食費",
  convenience: "コンビニ",
  transport: "交通費",
  hobby: "趣味",
  beauty: "美容",
  subscription: "サブスク",
  other: "その他",
};

const categoryBreakdownSchema = z.array(
  z.object({
    category: z.string(),
    total: z.number(),
    percent: z.number(),
  })
);

const expenseItemSchema = z.array(
  z.object({
    category: z.string(),
    amount: z.number(),
    memo: z.string().optional(),
    date: z.string(),
  })
);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Expenses API ──────────────────────────────────────────────────────
  expenses: router({
    list: protectedProcedure
      .input(z.object({ monthKey: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.monthKey) {
          return db.getExpensesByMonth(ctx.user.id, input.monthKey);
        }
        return db.getUserExpenses(ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          amount: z.number().int().positive(),
          category: z.string().min(1).max(64),
          memo: z.string().max(500).optional(),
          createdAt: z.string().optional(), // ISO string
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createExpense({
          userId: ctx.user.id,
          amount: input.amount,
          category: input.category,
          memo: input.memo ?? null,
          createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
        });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteExpense(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Budgets API ───────────────────────────────────────────────────────
  budgets: router({
    get: protectedProcedure
      .input(z.object({ monthKey: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getBudgetForMonth(ctx.user.id, input.monthKey);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          monthKey: z.string(),
          budgetAmount: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.upsertBudget({
          userId: ctx.user.id,
          monthKey: input.monthKey,
          budgetAmount: input.budgetAmount,
        });
        return { id };
      }),
  }),

  // ─── Coach API ─────────────────────────────────────────────────────────────────────
  coach: router({
    // チャット履歴取得
    getHistory: publicProcedure.query(async () => {
      return [];
    }),

    // チャット履歴クリア
    clearHistory: publicProcedure.mutation(async () => {
      return { success: true };
    }),

    // チャット（数字付き回答強化）
    chat: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(500),
          monthlyTotal: z.number(),
          budget: z.number(),
          remainingBudget: z.number(),
          remainingDays: z.number(),
          todayBudget: z.number(),
          projectedTotal: z.number(),
          usagePercent: z.number(),
          currentMonth: z.string(),
          categoryBreakdown: categoryBreakdownSchema,
          recentExpenses: expenseItemSchema,
        })
      )
      .mutation(async ({ input }) => {
        const {
          message,
          monthlyTotal,
          budget,
          remainingBudget,
          remainingDays,
          todayBudget,
          projectedTotal,
          usagePercent,
          currentMonth,
          categoryBreakdown,
          recentExpenses,
        } = input;

        const reply = generateTemplateResponse({
          monthlyTotal,
          budget,
          remainingDays,
          usagePercent,
          categoryBreakdown,
          userMessage: message
        });

        // テンプレートからの返答であることを明示する
        return { reply: `[AIコーチ] ${reply}` };
      }),

    // 週次レポート生成
    weeklyReport: publicProcedure
      .input(
        z.object({
          weekTotal: z.number(),
          prevWeekTotal: z.number(),
          monthlyTotal: z.number(),
          budget: z.number(),
          score: z.number(),
          weekExpenses: expenseItemSchema,
          categoryBreakdown: categoryBreakdownSchema,
        })
      )
      .mutation(async ({ input }) => {
        const { weekTotal, prevWeekTotal, monthlyTotal, budget, score, weekExpenses, categoryBreakdown } = input;

        const changePercent =
          prevWeekTotal > 0 ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100) : 0;
        const changeText =
          changePercent > 0 ? `先週比+${changePercent}%` : changePercent < 0 ? `先週比${changePercent}%` : "先週と同額";

        const topCategory = categoryBreakdown.sort((a, b) => b.total - a.total)[0];

        const categoryText = categoryBreakdown
          .map((c) => `- ${CATEGORY_LABELS[c.category] || c.category}: ¥${c.total.toLocaleString()} (${c.percent}%)`)
          .join("\n");

        const expenseText = weekExpenses
          .slice(0, 10)
          .map((e) => `- ${e.date}: ${CATEGORY_LABELS[e.category] || e.category} ¥${e.amount.toLocaleString()}${e.memo ? ` (${e.memo})` : ""}`)
          .join("\n");

        const systemPrompt = `あなたはMoneyCoachのAIアナリストです。今週の支出データを分析し、週次レポートを作成してください。

【今週の支出データ】
- 今週の合計: ¥${weekTotal.toLocaleString()}（${changeText}）
- 先週の合計: ¥${prevWeekTotal.toLocaleString()}
- 今月の累計: ¥${monthlyTotal.toLocaleString()}
- 月予算: ¥${budget.toLocaleString()}
- 支出スコア: ${score}点/100点
- 支出トップ: ${topCategory ? (CATEGORY_LABELS[topCategory.category] || topCategory.category) + "（¥" + topCategory.total.toLocaleString() + "）" : "なし"}

【今週のカテゴリ別内訳】
${categoryText || "支出データがありません"}

【今週の支出明細】
${expenseText || "支出データがありません"}

【レポート形式】
以下の構成で300文字以内で作成してください。必ず具体的な金額・割合を含めること：
1. 今週の総評（1〜2文、金額を含む）
2. 良かった点（1点、具体的な金額で）
3. 来週の提案（1文、「○○を○回減らすと¥○○節約できます」形式）

絵文字は使わず、日本語で書いてください。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "今週の支出レポートを作成してください。" },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const report = typeof rawContent === "string" ? rawContent : "レポートの生成に失敗しました。";

        return {
          report,
          weekTotal,
          prevWeekTotal,
          changePercent,
          topCategory: topCategory?.category ?? null,
        };
      }),

    // 月次レポート生成
    monthlyReport: publicProcedure
      .input(
        z.object({
          currentMonth: z.string(),
          monthlyTotal: z.number(),
          budget: z.number(),
          usagePercent: z.number(),
          score: z.number(),
          categoryBreakdown: categoryBreakdownSchema,
          recentExpenses: expenseItemSchema,
        })
      )
      .mutation(async ({ input }) => {
        const { currentMonth, monthlyTotal, budget, usagePercent, score, categoryBreakdown, recentExpenses } = input;

        const savedAmount = budget - monthlyTotal;
        const topCategories = [...categoryBreakdown].sort((a, b) => b.total - a.total).slice(0, 3);

        const categoryText = categoryBreakdown
          .map((c) => `- ${CATEGORY_LABELS[c.category] || c.category}: ¥${c.total.toLocaleString()} (${c.percent}%)`)
          .join("\n");

        const expenseText = recentExpenses
          .slice(0, 10)
          .map((e) => `- ${e.date}: ${CATEGORY_LABELS[e.category] || e.category} ¥${e.amount.toLocaleString()}${e.memo ? ` (${e.memo})` : ""}`)
          .join("\n");

        const systemPrompt = `あなたはMoneyCoachのAIアナリストです。${currentMonth}の支出データを分析し、月次レポートを作成してください。

【${currentMonth}の支出データ】
- 今月の支出合計: ¥${monthlyTotal.toLocaleString()}
- 月予算: ¥${budget.toLocaleString()}
- ${savedAmount >= 0 ? `節約額: ¥${savedAmount.toLocaleString()}` : `超過額: ¥${Math.abs(savedAmount).toLocaleString()}`}
- 予算使用率: ${usagePercent}%
- 支出スコア: ${score}点/100点
- 支出トップ3: ${topCategories.map((c) => `${CATEGORY_LABELS[c.category] || c.category}(${c.percent}%)`).join("、")}

【カテゴリ別内訳】
${categoryText || "支出データがありません"}

【支出明細（一部）】
${expenseText || "支出データがありません"}

【レポート形式】
以下の構成で400文字以内で作成してください。必ず具体的な金額・割合を含めること：
1. 今月の総評（1〜2文、金額を含む）
2. 良かった点（2点、それぞれ具体的な金額で）
3. 気をつけたい点（2点、それぞれ具体的な金額・割合で）
4. 来月への提案（2点、「○○を○%削減すると月¥○○節約できます」形式）

絵文字は使わず、日本語で書いてください。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "今月の支出レポートを作成してください。" },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const report = typeof rawContent === "string" ? rawContent : "レポートの生成に失敗しました。";

        return { report, savedAmount, usagePercent, score };
      }),
  }),

  // ─── Analysis API ──────────────────────────────────────────────────────
  analysis: router({
    generate: publicProcedure
      .input(
        z.object({
          currentMonth: z.string(),
          monthlyTotal: z.number(),
          budget: z.number(),
          usagePercent: z.number(),
          score: z.number(),
          categoryBreakdown: categoryBreakdownSchema,
          recentExpenses: expenseItemSchema,
        })
      )
      .mutation(async ({ input }) => {
        const { currentMonth, monthlyTotal, budget, usagePercent, score, categoryBreakdown, recentExpenses } = input;

        const topCategory = [...categoryBreakdown].sort((a, b) => b.total - a.total)[0];
        const savedAmount = budget - monthlyTotal;

        const categoryText = categoryBreakdown
          .map((c) => `- ${CATEGORY_LABELS[c.category] || c.category}: ¥${c.total.toLocaleString()} (${c.percent}%)`)
          .join("\n");

        const systemPrompt = `あなたはMoneyCoachのAIアナリストです。支出データを分析し、簡潔なレポートを作成してください。

【${currentMonth}の支出データ】
- 支出合計: ¥${monthlyTotal.toLocaleString()}
- 月予算: ¥${budget.toLocaleString()}
- ${savedAmount >= 0 ? `節約額: ¥${savedAmount.toLocaleString()}` : `超過額: ¥${Math.abs(savedAmount).toLocaleString()}`}
- 予算使用率: ${usagePercent}%
- 支出スコア: ${score}点/100点
- 最多支出: ${topCategory ? (CATEGORY_LABELS[topCategory.category] || topCategory.category) + "（" + topCategory.percent + "%）" : "なし"}

【カテゴリ別内訳】
${categoryText || "支出データがありません"}

【出力形式】
以下の構成でJSONを返してください：
{
  "summary": "今月の総評（1〜2文、金額を含む）",
  "goodPoints": ["良い点1（具体的な金額）", "良い点2（具体的な金額）"],
  "warningPoints": ["気をつけたい点1（具体的な金額・割合）", "気をつけたい点2"],
  "suggestions": ["提案1（○%削減すると月¥○○節約）", "提案2", "提案3"]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "支出分析レポートをJSONで作成してください。" },
          ],
          response_format: { type: "json_object" },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        let parsed = {
          summary: "分析を完了しました。",
          goodPoints: [] as string[],
          warningPoints: [] as string[],
          suggestions: [] as string[],
        };

        if (typeof rawContent === "string") {
          try {
            parsed = JSON.parse(rawContent);
          } catch {
            parsed.summary = rawContent;
          }
        }

        return {
          summary: parsed.summary ?? "",
          goodPoints: parsed.goodPoints ?? [],
          warningPoints: parsed.warningPoints ?? [],
          suggestions: parsed.suggestions ?? [],
          topCategory: topCategory?.category ?? null,
          topCategoryPercent: topCategory?.percent ?? 0,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
