export interface AnalysisContext {
  currentMonth: string;
  monthlyTotal: number;
  budget: number;
  usagePercent: number;
  score: number;
  categoryBreakdown: { category: string; total: number; percent: number }[];
}

export interface AnalysisResponse {
  summary: string;
  goodPoints: string[];
  warningPoints: string[];
  suggestions: string[];
  topCategory: string | null;
  topCategoryPercent: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "食費",
  convenience: "コンビニ",
  transport: "交通費",
  hobby: "趣味",
  beauty: "美容",
  subscription: "サブスク",
  other: "その他",
};

// カテゴリに応じた具体的な「行動」と「具体的な削減額」を算出するヘルパー
function getConcreteSuggestions(cat: string, total: number, remainingDays: number, budget: number): string[] {
  const label = CATEGORY_LABELS[cat] || cat;
  
  switch (cat) {
    case "food": {
      const eatOutCost = 1500;
      const reduceCount = Math.max(1, Math.round(total * 0.15 / eatOutCost));
      const saved = reduceCount * eatOutCost;
      return [
        `外食（1回平均¥${eatOutCost.toLocaleString()}想定）を月${reduceCount}回減らして自炊に変えるだけで、¥${saved.toLocaleString()}を即座に削減できます。`,
        `週末に3日分の食材（想定予算¥2,000）をまとめ買いして小分け冷凍し、平日の買い物回数を減らしてついで買いを防止しましょう。`,
        `買い出しに行く前に、冷蔵庫の残り物だけで作れる「スープやカレー」のクリーンアップ日を週1回設けると、食費の約10%（¥${Math.round(total * 0.1).toLocaleString()}）を浮かせられます。`
      ];
    }
    case "convenience": {
      const drinkCost = 160;
      const count = Math.max(2, Math.round(total * 0.35 / drinkCost));
      const saved = count * drinkCost;
      return [
        `コンビニでの飲み物購入（1本¥${drinkCost}）をマイボトル持参に変え、月に${count}回控えるだけで、¥${saved.toLocaleString()}節約できます。`,
        `ホットスナックやデザート（1回平均¥250）のついで買いを週${Math.max(1, Math.round(count / 4))}回我慢することで、月額¥${Math.round(total * 0.4).toLocaleString()}をカットできます。`,
        `コンビニでのお弁当購入をスーパーの総菜（約30%安価）に変更し、購入ルートを切り替えるだけで月¥${Math.round(total * 0.3).toLocaleString()}の差額が生まれます。`
      ];
    }
    case "hobby": {
      const singleSpend = Math.max(1000, Math.round(total / 5));
      const reduceCount = Math.max(1, Math.round(total * 0.2 / singleSpend));
      return [
        `趣味娯楽のうち、衝動的に欲しくなったデジタルコンテンツやグッズ（1回¥${singleSpend.toLocaleString()}想定）を月${reduceCount}回見送ることで、¥${Math.round(singleSpend * reduceCount).toLocaleString()}を削減できます。`,
        `趣味予算は、専用のサブ口座やプリペイドカードに移し、今月の残りの使用上限を¥${Math.round(total * 0.7).toLocaleString()}（30%削減）に設定して物理的に管理しましょう。`,
        `定額の趣味系イベントや課金要素は「本当に今月楽しんだか」を評価し、来月は月額予算を10%引き下げてスタートしましょう。`
      ];
    }
    case "subscription": {
      const avgSub = 980;
      const count = Math.max(1, Math.round(total / avgSub));
      return [
        `現在契約中のサブスク（月額¥${total.toLocaleString()}）のうち、直近1ヶ月で使用頻度が低かったものを${count}つ解約するだけで、年間で¥${(total * 12).toLocaleString()}が自動的に貯まります。`,
        `無料トライアル期間中のサービスがないか確認し、解約忘れによる月額¥${avgSub}の自動引き落としを防止するカレンダー通知を設定しましょう。`,
        `類似している配信サービス（音楽、動画など）を1つに集約することで、月額固定費を約15%削減できます。`
      ];
    }
    case "transport": {
      return [
        `短距離（2km未満）の移動において、タクシーや一駅区間の電車利用を徒歩や自転車に変えることで、1回につき約¥${total > 5000 ? 800 : 200}を浮かせられます。`,
        `通勤・通学の定期券範囲外への移動がある場合、あらかじめ最も安いルートを検索し、乗り換え回数を減らすことで月額交通費をセーブしましょう。`,
        `出かける日をまとめて交通機関に乗る回数を削減し、ついでに発生する外出先での出費をカットしましょう。`
      ];
    }
    case "beauty": {
      return [
        `美容院やサロンの訪問サイクルを現在の「毎月」から「1.5ヶ月に1回」に延ばすだけで、年間の美容費を約30%（年間で数万円規模）削減できます。`,
        `プチプラ（安価で高品質な化粧品）での代用が可能な消耗品がないかリストアップし、購入単価を抑えましょう。`,
        `セール期間やサロンのオンライン予約限定クーポンを徹底比較し、1回あたりの施術料を約10%引き下げる工夫を導入しましょう。`
      ];
    }
    default: {
      return [
        `「その他」の雑費（月合計 ¥${total.toLocaleString()}）を分析し、100円ショップやネットでの衝動買いなど、少額の買い物のレシートを週1回見直しましょう。`,
        `日用品などの消耗品は、ネットショッピングの特売日やドラッグストアのポイント倍増日に大容量でまとめ買いし、購入頻度を減らします。`,
        `支払いを特定のキャッシュレス決済にまとめてポイント還元率を上げ、実質的な支出を年間で数千円抑えましょう。`
      ];
    }
  }
}

// 50通りの超具体的なシナリオテンプレート
const TEMPLATES = [
  // ==========================================
  // GROUP 1: SAFE (usagePercent <= 60%) - FOOD TOP (10 templates)
  // ==========================================
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const summaries = [
        `今月は予算を十分に抑えられており、家計管理が極めて順調です。最も高い支出は${label}ですが、予算全体の範囲内に綺麗に収まっています。`,
        `非常に計画的なお金の使い方ができています。${label}がメインの支出ですが、無駄遣いがなく非常に健全な状態です。`,
        `スマートな家計簿記録と高い節約意識が功を奏しています。${label}が最多支出ですが、予算のゆとりは十分にあります。`,
        `安定した家計バランスです。最多支出が日常的な${label}であることは極めて自然で、大きな心配はありません。`,
        `素晴らしい進捗です。${label}への投資はあなたの生活の質の基盤ですので、予算内に収まっている限り最適です。`,
        `全体的に非常にミニマルにまとまっています。${label}が最も多い項目ですが、非常に経済的です。`,
        `安心の予算進捗率です。${label}も平均値を大きく下回る計画的な水準を維持しています。`,
        `家計管理のお手本のような月です。最も多くの割合を占めるのが健康の元である${label}なのは健康的です。`,
        `非常に優れたコストコントロールです。${label}は誰しも大きな負担になる中、ここまで低水準にできているのは素晴らしいです。`,
        `とても順調に今月の家計が推移しています。${label}のコントロールが全体の高いパフォーマンスにつながっています。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `全体の支出を予算の半分以下に抑え、¥${sav.toLocaleString()}の貯蓄余力を生み出せています。`,
      `最も高額な${label}（¥${ttot.toLocaleString()}）も全体のペースに悪影響を与えていません。`
    ],
    warningPoints: () => [
      `大きな問題はありませんが、自炊の割合を維持して外食による急な出費増を防止しましょう。`,
      `支出が抑えられている時こそ、次の大きな出費に備えて先取り貯金を検討してください。`
    ],
    suggestions: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月もこの調子を維持するため、週に1回だけまとめ買いの日を設けて支出の変動を抑えましょう。`,
      `節約できた¥${Math.round(sav * 0.5).toLocaleString()}を投資や貯蓄に回す設定を行いましょう。`,
      `${label}をあと5%削減すると、来月はさらに¥${Math.round(ttot * 0.05).toLocaleString()}を浮かせることができます。`
    ]
  })),

  // ==========================================
  // GROUP 2: SAFE (usagePercent <= 60%) - CONVENIENCE TOP (10 templates)
  // ==========================================
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: i + 11,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const summaries = [
        `予算全体は抑えられていますが、最も高額な項目が${label}になっています。全体の管理が良いだけに、ここを改善すればさらに貯金できます。`,
        `家計全体はセーフですが、最多支出が${label}です。時間効率とコストのバランスを見直す余地があります。`,
        `全体予算は順調に推移しています。しかし、${label}がトップなので、改善の大きな伸び代があります。`,
        `順調な家計簿記録です。ただ、最も高額なのが単価の高い${label}である点は、少し勿体ないポイントです。`,
        `家計全体は非常に低コストで安全ですが、${label}が一番の出費です。時間の節約と引き換えにお金を多く払っている状態です。`,
        `全体支出は低く抑えられており極めて健全です。しかし、最多支出が${label}なため、これをスーパーに切り替えるだけで家計はさらに劇的に改善します。`,
        `予算は十分守られています。ただ、${label}への依存度が他と比較して高くなっています。`,
        `とてもクリーンな家計簿です。最も割合が大きいのが日常の${label}ですが、スーパーに代用すれば今月の貯蓄率はMAXになります。`,
        `家計全体はセーフゾーンですが、もっと貯蓄力を伸ばせます。なぜなら、単価の高い${label}が支出トップだからです。`,
        `今月は非常にお金をコントロールできています。ただ、やはり${label}（¥${ttot.toLocaleString()}）はより削減可能な項目です。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に達することなく、計画的に家計全体をコントロールできています。`,
      `他の娯楽や大きな買い物がなく、全体の基礎的な生活コストは非常に低いです。`
    ],
    warningPoints: () => [
      `コンビニは割高な商品が多い（ドリンク、お菓子等）ため、小さな無駄が積もり積もっています。`,
      `便利さに依存して、スーパーで安く買えるものまで高値で買っている傾向があります。`
    ],
    suggestions: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `コンビニに行くのは「週に2回まで」とし、用事がない時は店内に入らないようにしましょう。`,
      `コンビニで買っていた飲み物を、スーパーのまとめ買いやネット通販での箱買いに変えるだけで、月額の大幅な節約になります。`,
      `マイボトルに自宅で沸かしたお茶を入れ、毎日の飲み物代をすべてゼロに抑えましょう。`
    ]
  })),

  // ==========================================
  // GROUP 3: SAFE (usagePercent <= 60%) - OTHER TOP / HOBBY etc. (10 templates)
  // ==========================================
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: i + 21,
    condition: (p: number, tc: string) => p <= 60,
    summary: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const summaries = [
        `全体の支出がかなり低く抑えられていて優秀です。最も出費が多かったのは${label}ですが、予算のゆとりは極めて大きいです。`,
        `非常にミニマムな家計で素晴らしいです。最多項目が${label}なのは、生活に必要な他の基礎コストが劇的に抑えられているからです。`,
        `スマートなマネーコントロールです。最も大きい${label}も、他の項目の節約によって完全にカバーされています。`,
        `大変わ安定した家計推移で文句ありません。特に、最多項目が${label}であっても余裕があるのが強力です。`,
        `計画的で健全なお金の管理です。最多支出項目が${label}になっていますが、予算への影響は微々たるものです。`,
        `非常に素晴らしいマネーコントロールです。最多支出である${label}を含めて、すべての項目がスマートです。`,
        `安心して見ていられる家計状況です。最も高額な項目が${label}ですが、予算全体への圧迫はまったくありません。`,
        `非常に高いスコアで家計簿が運営されています。最多項目が${label}ですが、全体的に完璧なバランスです。`,
        `非常に理想的な黒字家計です。最も多く使ったのが${label}ですが、予算の消化ペースは極めて安全です。`,
        `極めて安定した家計実績を達成した月です。最も多くの費用を割いたのが${label}ですが、他がスリムなので理想的です。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して大きなバッファを持ち、¥${sav.toLocaleString()}の余剰を確保しています。`,
      `固定費や家賃、サブスク代金など、生活の固定部分が肥大化していないのが最大の強みです。`
    ],
    warningPoints: () => [
      `大きな問題はありませんが、予算が余っているからと月末に不要なセール品を衝動買いしないよう警戒しましょう。`,
      `特定のカテゴリのみにお金が集中しやすいため、全体のバランス感覚を維持しましょう。`
    ],
    suggestions: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const basicSugs = getConcreteSuggestions(label, ttot, 15, bud);
      return [
        `今月残った¥${sav.toLocaleString()}の一部を「特別費」としてプールし、旅行などの一時支出に備えましょう。`,
        ...basicSugs.slice(0, 2)
      ];
    }
  })),

  // ==========================================
  // GROUP 4: CAUTION/WARNING (60% < usagePercent <= 90%) (10 templates)
  // ==========================================
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: i + 31,
    condition: (p: number, tc: string) => p > 60 && p <= 90,
    summary: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const summaries = [
        `予算上限に近づきつつあり、現在の消化ペースは${p}%です。最多支出の${label}（¥${ttot.toLocaleString()}）を抑えることが、残りの日数を乗り切る鍵になります。`,
        `イエローサインが灯っています。残り予算が¥${sav.toLocaleString()}となっているため、月末にかけて無駄な出費の徹底的な排除が必要です。`,
        `少し支出のスピードが早めです。生活の大部分を占める${label}の中に、見直せる余地が隠れています。`,
        `現時点では予算内ですが、少額の買い物が積み重なって予算上限を脅かしつつあります。最大の項目は${label}です。`,
        `支出合計¥${tot.toLocaleString()}は、予算¥${bud.toLocaleString()}の${p}%に達しています。ここからの数日間のやりくりが極めて重要です。`,
        `やや警告状態に近い推移です。特に日常費である${label}が全体の家計比率を引き上げてしまっています。`,
        `予算オーバーを防ぐための防衛期間に入りました。残り期間で削れる変動費、特に${label}の買い出しを見直しましょう。`,
        `残高にそれなりの余裕はありますが、月末に向けて気が緩むと一気に予算上限を突破する危険性があるバランスです。`,
        `何気なく使っているお金が多発している形跡があります。最多項目の${label}（¥${ttot.toLocaleString()}）の勢いを落とす時期です。`,
        `現在のペースだと、来月に向けての貯金目標に達しない恐れがあります。まずは${label}の単価を下げる工夫から始めましょう。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点では予算を完全にオーバーすることなく、目標の枠内に収まり続けています。`,
      `無駄なローンや高額な分割払いがなく、変動費の調整だけで簡単に軌道修正ができる構造です。`
    ],
    warningPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `残された予算は¥${sav.toLocaleString()}のみであり、ちょっとした外食や日用品の重複買いで簡単に赤字に転落します。`,
      `最多支出の${label}の増加率が高く、買い出しの回数と1回あたりの購入単価が上昇傾向にあります。`
    ],
    suggestions: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const basicSugs = getConcreteSuggestions(label, ttot, 10, bud);
      return [
        `今月が終わるまでの残り日数、1日の使用上限を ¥${Math.floor(sav / 10).toLocaleString()} と定めてこれを超える決済を完全に防ぎましょう。`,
        ...basicSugs.slice(0, 2)
      ];
    }
  })),

  // ==========================================
  // GROUP 5: OVER BUDGET (usagePercent > 90%) (10 templates)
  // ==========================================
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: i + 41,
    condition: (p: number, tc: string) => p > 90,
    summary: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const isOver = tot > bud;
      const amountDiff = Math.abs(sav);
      const summaries = [
        `今月はすでに予算を消化しきっており、${isOver ? `¥${amountDiff.toLocaleString()}の赤字` : "予算限界のピンチ"}となっています。主な原因は最多の${label}（¥${ttot.toLocaleString()}）への出費です。`,
        `危険な状態です。残額が極めて少なく、最多支出の${label}が全体を押し潰しています。`,
        `完全に予算上限を突破しました。特に${label}の購入頻度が高く、コストの歯止めが機能しなかったことが主要因です。`,
        `家計改善が最も必要な状況です。月予算¥${bud.toLocaleString()}に対して、現在の進捗率は${p}%を超えています。`,
        `今月は非常事態です。最も多くの割合を占める${label}（¥${ttot.toLocaleString()}）の出費を即座に「ゼロ」に近づける必要があります。`,
        `お財布が赤信号です。無計画な出費の蓄積、特に高価な${label}の割合が重くのしかかっています。`,
        `予算の上限を超過しており、来月以降のおサイフ事情への影響が確定的です。${label}の見直しが急務です。`,
        `コントロールを失いつつあります。今月の赤字¥${isOver ? amountDiff.toLocaleString() : "寸前"}を真摯に受け止め、対策を講じましょう。`,
        `基本生活費である${label}が暴走してしまっています。全体の予算対比が${p}%と、非常に厳しい実績です。`,
        `今月は赤字決算です。一番金額の大きい${label}への支払いが、家計を大きく歪めてしまった元凶です。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家計簿の記録を中断せず、赤字の数値現実から目を背けずに最後まで入力し続けている点は素晴らしいです。`,
      `問題がある項目が${label}に集中しているため、対策を立てるべきポイントが明確です。`
    ],
    warningPoints: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限をオーバーして¥${Math.abs(sav).toLocaleString()}超過しており、生活防衛資金を切り崩してしまう悪循環にあります。`,
      `最多支出の${label}（¥${ttot.toLocaleString()}）は、日常的な買い物回数の多さが生んだ「チリツモ無駄」の集合体です。`
    ],
    suggestions: (p: number, tot: number, bud: number, sav: number, label: string, ttot: number) => {
      const basicSugs = getConcreteSuggestions(label, ttot, 5, bud);
      return [
        `来月の最初の1週間は、生活必需品（食品・日用品）以外の買い物を完全に禁止する「ノーマネーデー（出費ゼロ日）」を強制的に2回設けましょう。`,
        ...basicSugs.slice(0, 2)
      ];
    }
  }))
];

export function generateTemplateAnalysis(ctx: AnalysisContext): AnalysisResponse {
  const topCategory = [...ctx.categoryBreakdown].sort((a, b) => b.total - a.total)[0];
  const topCatName = topCategory?.category ?? "other";
  const topCatLabel = CATEGORY_LABELS[topCatName] || topCatName;
  const topCatPercent = topCategory?.percent ?? 0;
  const topCatTotal = topCategory?.total ?? 0;
  const savedAmount = ctx.budget - ctx.monthlyTotal;

  // 条件に合致するすべてのテンプレートを抽出
  const matches = TEMPLATES.filter(t => t.condition(ctx.usagePercent, topCatName));

  // もしマッチするものがあればランダムに1つ選ぶ、なければデフォルトの50番目のテンプレートを使用
  const selectedTemplate = matches.length > 0 
    ? matches[Math.floor(Math.random() * matches.length)] 
    : TEMPLATES[TEMPLATES.length - 1];

  return {
    summary: selectedTemplate.summary(ctx.usagePercent, ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    goodPoints: selectedTemplate.goodPoints(ctx.usagePercent, ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal),
    warningPoints: selectedTemplate.warningPoints(ctx.usagePercent, ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal),
    suggestions: selectedTemplate.suggestions(ctx.usagePercent, ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal),
    topCategory: topCatName,
    topCategoryPercent: topCatPercent,
  };
}
