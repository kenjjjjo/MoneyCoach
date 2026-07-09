export interface CoachingContext {
  monthlyTotal: number;
  budget: number;
  remainingDays: number;
  usagePercent: number;
  categoryBreakdown: { category: string; total: number; percent: number }[];
  userMessage?: string;
}

const TEMPLATES = [
  // Budget Status: Safe
  {
    condition: (ctx: CoachingContext) => ctx.usagePercent <= 50 && ctx.remainingDays <= 15,
    messages: [
      "今のところ予算内に収まっていますね！この調子でいきましょう！",
      "ペース配分が完璧です！今月は余裕を持って過ごせそうですね。",
      "支出が抑えられています！余った予算は貯金に回すチャンスです。"
    ]
  },
  // Budget Status: Warning
  {
    condition: (ctx: CoachingContext) => ctx.usagePercent > 80 && ctx.usagePercent <= 100 && ctx.remainingDays > 5,
    messages: [
      "予算の80%を超えました。残りの日数は少し節約を意識してみましょう！",
      "今月は少しペースが早めです。今週末は出費を抑える工夫ができると良いですね。",
      "あと少しで予算上限です。本当に必要なものか見極めてから買いましょう！"
    ]
  },
  // Budget Status: Danger/Over
  {
    condition: (ctx: CoachingContext) => ctx.usagePercent > 100,
    messages: [
      "予算をオーバーしてしまいましたね…。来月はどの支出を減らせるか、一緒に見直しましょう！",
      "今月は少し使いすぎたようです。トップの支出カテゴリを来月は意識して減らすと良さそうです。",
      "予算オーバーです！まずは固定費や無駄遣いがないか、履歴をチェックしてみてください。"
    ]
  },
  // Category specific: Food
  {
    condition: (ctx: CoachingContext) => {
      const top = [...ctx.categoryBreakdown].sort((a, b) => b.total - a.total)[0];
      return top?.category === "food" && top?.percent > 40;
    },
    messages: [
      "食費の割合が高めですね。週末に作り置きをするなど、自炊の頻度を少し上げると節約につながりますよ！",
      "外食が続いていませんか？1食だけでも自炊に切り替えると、目に見えて節約できます！",
      "食費が支出のトップです。買い物に行く前にリストを作ると、無駄買いを防げます。"
    ]
  },
  // Category specific: Convenience
  {
    condition: (ctx: CoachingContext) => {
      const top = [...ctx.categoryBreakdown].sort((a, b) => b.total - a.total)[0];
      return top?.category === "convenience" && top?.total > 3000;
    },
    messages: [
      "コンビニでの出費が少しずつ積み重なっているようです。飲み物はスーパーでまとめ買いするとお得ですよ！",
      "ついついコンビニに寄っていませんか？行く回数を週1回減らすだけでも効果大です！",
      "コンビニ代が目立ちます。マイボトルを持ち歩くなど、小さな工夫から始めてみましょう。"
    ]
  },
  // Default fallback
  {
    condition: () => true,
    messages: [
      "記録お疲れ様です！この調子で家計簿をつける習慣を続けていきましょう。",
      "日々の記録が節約の第一歩です！気になる支出があればタップして見直せます。",
      "コツコツ記録できていて素晴らしいです！月末の分析レポートを楽しみにしていてくださいね。"
    ]
  }
];

export function generateTemplateResponse(ctx: CoachingContext): string {
  // マッチする条件を上から順に探し、最初に合致したグループからランダムに1つ選ぶ
  const matchedTemplate = TEMPLATES.find(t => t.condition(ctx));
  
  if (matchedTemplate) {
    const randomIndex = Math.floor(Math.random() * matchedTemplate.messages.length);
    let reply = matchedTemplate.messages[randomIndex];
    
    // もしユーザーのメッセージがあれば、共感する一言を前につける簡易ロジック
    if (ctx.userMessage && ctx.userMessage.trim().length > 0) {
      const msg = ctx.userMessage.toLowerCase();
      if (msg.includes("節約") || msg.includes("減らす")) {
        reply = `節約意識が高くて素晴らしいですね！\n${reply}`;
      } else if (msg.includes("やばい") || msg.includes("使いすぎ")) {
        reply = `焦らなくても大丈夫ですよ。\n${reply}`;
      } else {
        reply = `なるほど、承知しました！\n${reply}`;
      }
    }
    
    return reply;
  }
  
  return "家計の記録を続けていきましょう！";
}
