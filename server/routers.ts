import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateTemplateResponse } from "../lib/ai/templateEngine";
import { generateTemplateAnalysis } from "../lib/ai/analysisTemplate";
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

    // チャット（Gemini API使用）
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

        const categoryText = categoryBreakdown
          .map((c) => `- ${CATEGORY_LABELS[c.category] || c.category}: ¥${c.total.toLocaleString()} (${c.percent}%)`)
          .join("\n");

        const expenseText = recentExpenses
          .slice(0, 10)
          .map((e) => `- ${e.date}: ${CATEGORY_LABELS[e.category] || e.category} ¥${e.amount.toLocaleString()}${e.memo ? ` (${e.memo})` : ""}`)
          .join("\n");

        const systemPrompt = `あなたは優秀なAI家計簿コーチ「MoneyCoach」です。
ユーザーは家計について相談しています。以下のデータを参考にして、優しく具体的、かつ実践的なアドバイス（チャット形式）を行ってください。

【今月の家計状況】
- 今月の支出合計: ¥${monthlyTotal.toLocaleString()}
- 予算: ¥${budget.toLocaleString()}
- 残り予算: ¥${remainingBudget.toLocaleString()}
- 今月残り日数: ${remainingDays}日
- 今日の目標予算: ¥${todayBudget.toLocaleString()}
- 月末着地予測: ¥${projectedTotal.toLocaleString()} (${projectedTotal > budget ? "予算超過見込み" : "予算内収まる見込み"})
- 予算使用率: ${usagePercent}%

【カテゴリ別支出内訳】
${categoryText || "支出データがありません"}

【最近の支出履歴（一部）】
${expenseText || "支出データがありません"}

【アドバイス方針】
- ユーザーに寄り添う親しみやすい口調（〜ですよ、〜しましょうね、など）で回答してください。
- 必要に応じて具体的な数字（目標金額、削れる額、残額など）を出して説明してください。
- 150文字程度で簡潔に分かりやすく答えてください。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
        });

        const reply = response.choices?.[0]?.message?.content || "すみません、少し考え込んでしまいました。もう一度話しかけてみてください！";
        return { reply };
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
        const { currentMonth, monthlyTotal, budget, usagePercent, score, categoryBreakdown } = input;
        
        // 50のテンプレートパターンから最適かつランダムなものをローカルで高速生成（Geminiトークンゼロ）
        const result = generateTemplateAnalysis({
          currentMonth,
          monthlyTotal,
          budget,
          usagePercent,
          score,
          categoryBreakdown,
        });

        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
