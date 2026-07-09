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
  
  // カテゴリ別の具体的な節約行動テンプレート集（実際の数値から金額や回数を計算）
  switch (cat) {
    case "food": {
      const eatOutCost = 1500; // 外食1回あたりの想定金額
      const reduceCount = Math.max(1, Math.round(total * 0.15 / eatOutCost));
      const saved = reduceCount * eatOutCost;
      return [
        `外食（1回平均¥${eatOutCost.toLocaleString()}想定）を月${reduceCount}回減らして自炊に変えるだけで、¥${saved.toLocaleString()}を即座に削減できます。`,
        `週末に3日分の食材（想定予算¥2,000）をまとめ買いして小分け冷凍し、平日の買い物回数を減らしてついで買いを防止しましょう。`,
        `買い出しに行く前に、冷蔵庫の残り物だけで作れる「スープやカレー」のクリーンアップ日を週1回設けると、食費の約10%（¥${Math.round(total * 0.1).toLocaleString()}）を浮かせられます。`
      ];
    }
    case "convenience": {
      const drinkCost = 160; // コンビニドリンク1本あたり想定
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
  // -------------------------------------------------------------
  // GROUP A: 予算にかなりの余裕がある健全家計 (usagePercent <= 50%) (15パターン)
  // -------------------------------------------------------------
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: i + 1,
    condition: (p: number, tc: string) => p <= 50,
    summary: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number, curMonth: string) => {
      const summaries = [
        `今月のやりくりは非常に順調です。予算枠の半分以下に収まっており、¥${sav.toLocaleString()}の貯金枠がしっかり残っています。`,
        `無駄な支出が徹底して省かれた美しい家計簿です。最多支出は${label}（¥${ttot.toLocaleString()}）ですが、全く問題のない比率です。`,
        `計画的なマネーコントロールができています。現在の消化率は${p}%と非常に優秀で、将来に向けた先取り貯蓄が期待できます。`,
        `家計全体の基礎体力が非常に高い状態です。最大の出費である${label}も、他のカテゴリがスリムなため安全圏にあります。`,
        `今月のお金の使い方は理想的です。余剰金が¥${sav.toLocaleString()}もあり、急な出費や投資の原資として活用できる余裕があります。`,
        `ストレスのない適正な節約が実行されています。${label}への適度な配分（全体の${tp}%）を含め、バランスが絶妙です。`,
        `貯蓄スピードが最速のペースを維持しています。無駄なコンビニ代やサブスクの垂れ流しがないことが功を奏しています。`,
        `お手本のような生活防衛家計です。最多支出項目が${label}ですが、予算上限の50%以内に抑えられており非常に堅実です。`,
        `素晴らしい収支バランスです。現在の支出合計¥${tot.toLocaleString()}は、予算¥${bud.toLocaleString()}に対して十分低水準です。`,
        `日常の購買における取捨選択がハッキリしています。最多の${label}の単価管理も徹底されていることが読み取れます。`,
        `今月は大幅な黒字で着地予定です。節約できた¥${sav.toLocaleString()}をそのまま寝かさず、有意義に活用するフェーズです。`,
        `生活コストが自然と低く抑えられており、家計の機動性がとても高いです。特に${label}の管理能力が高い状態です。`,
        `支出全体に対する${label}（¥${ttot.toLocaleString()}）の配分がスマートで、メリハリのある使い方が評価できます。`,
        `家計簿をつける習慣が完全に貯蓄力向上につながっています。今月は残り日数に対しても予算に十分すぎる空きがあります。`,
        `素晴らしい成果です！最多の${label}の購入サイクルを適切にキープしつつ、¥${sav.toLocaleString()}のバッファを有しています。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const points = [
        [
          `予算残高¥${sav.toLocaleString()}を確保し、今月はかなりの貯蓄を上乗せできています。`,
          `最多支出の${label}（¥${ttot.toLocaleString()}）の消化率を低く抑え、家計を逼迫させていません。`
        ],
        [
          `日常の基本出費を最小化し、不要な小額の支出（ついで買い等）が完璧にブロックされています。`,
          `今月は大きな衝動買いが発生しておらず、月全体の支出総額が¥${tot.toLocaleString()}で極めて安定しています。`
        ],
        [
          `最多支出項目が生活の基本である${label}（全体の${tp}%）に留まり、健全な比率を維持しています。`,
          `予算枠に対して${Math.round(100 - p)}%もの広大なセーフ領域（¥${sav.toLocaleString()}）を残せています。`
        ]
      ];
      return points[i % points.length];
    },
    warningPoints: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const warns = [
        [
          `大きな問題はありませんが、予算が余っているからと月末に不要なセール品を衝動買いしないよう警戒しましょう。`,
          `口座の残高に余裕があると油断して、来月に繰り越す支払いを増やさないように気をつけます。`
        ],
        [
          `食費や日常支出を無理に削りすぎて、体調管理や栄養のバランスを崩していないかだけ注意してください。`,
          `水道光熱費やスマートフォンの基本プランなど、一度見直すと効果が永続する固定費の確認を怠らないようにします。`
        ],
        [
          `クレジットカードのポイント失効や、銀行の引き出し手数料などの小さな「見えないロス」がないか確認しましょう。`,
          `来月以降に大きなイベントや旅行を控えている場合、その分のバッファを現在の余裕から差し引いて考えます。`
        ]
      ];
      return warns[i % warns.length];
    },
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const basicSugs = getConcreteSuggestions(label, ttot, 15, bud);
      return [
        `貯まった¥${sav.toLocaleString()}のうち、¥${Math.round(sav * 0.4).toLocaleString()}を投資や先取り貯金用口座へ自動送金する設定をしましょう。`,
        ...basicSugs.slice(0, 2)
      ];
    }
  })),

  // -------------------------------------------------------------
  // GROUP B: 予算消化率がやや高く、調整が必要な警戒家計 (50% < usagePercent <= 90%) (15パターン)
  // -------------------------------------------------------------
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: i + 16,
    condition: (p: number, tc: string) => p > 50 && p <= 90,
    summary: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number, curMonth: string) => {
      const summaries = [
        `予算上限に近づきつつあり、現在の消化ペースは${p}%です。最多支出の${label}（¥${ttot.toLocaleString()}）を抑えることが、残りの日数を乗り切る鍵になります。`,
        `イエローサインが灯っています。残り予算が¥${sav.toLocaleString()}となっているため、月末にかけて無駄な出費の徹底的な排除が必要です。`,
        `少し支出のスピードが早めです。生活の大部分を占める${label}（比率${tp}%）の中に、見直せる余地が隠れています。`,
        `現時点では予算内ですが、少額の買い物が積み重なって予算上限を脅かしつつあります。最大の項目は${label}です。`,
        `支出合計¥${tot.toLocaleString()}は、予算¥${bud.toLocaleString()}の${p}%に達しています。ここからの数日間のやりくりが極めて重要です。`,
        `やや警告状態に近い推移です。特に日常費である${label}が全体の家計比率を引き上げてしまっています。`,
        `予算オーバーを防ぐための防衛期間に入りました。残り期間で削れる変動費、特に${label}の買い出しを見直しましょう。`,
        `残高にそれなりの余裕はありますが、月末に向けて気が緩むと一気に予算上限を突破する危険性があるバランスです。`,
        `何気なく使っているお金が多発している形跡があります。最多項目の${label}（¥${ttot.toLocaleString()}）の勢いを落とす時期です。`,
        `現在のペースだと、来月に向けての貯金目標に達しない恐れがあります。まずは${label}の単価を下げる工夫から始めましょう。`,
        `家計全体の進捗率は${p}%で踏みとどまっていますが、月末の固定引き落とし分を残しておく必要があります。`,
        `少し出費の波が大きくなっています。特に高額になりがちな${label}の購入頻度とルールを再確認してください。`,
        `予算残高は¥${sav.toLocaleString()}です。大きな買い物は来月に見送り、日々のランニングコストを最優先にすべき状態です。`,
        `記録はしっかりできていますが、支出の伸びが目立ちます。最多の${label}を中心に、あと一歩の自制心が必要です。`,
        `計画予算の${p}%を消費しています。ここからのお金の使い方次第で、今月が黒字か赤字かが決まります。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const points = [
        [
          `現時点では予算を完全にオーバーすることなく、目標の枠内に収まり続けています。`,
          `無駄なローンや高額な分割払いがなく、変動費の調整だけで簡単に軌道修正ができる構造です。`
        ],
        [
          `家計簿に日々の全ての出費が即座に記録されているため、何が使いすぎの原因かすぐに特定できます。`,
          `食費や日常日用品など、削りやすい変動費カテゴリ（${label}）にのみ支出が集中している点です。`
        ],
        [
          `固定費（通信費や保険など）の肥大化がなく、自制次第で翌月以降に大きな改善が狙える余地があります。`,
          `一時的なピンチに気づいており、予算残高¥${sav.toLocaleString()}を意識した行動が取れています。`
        ]
      ];
      return points[i % points.length];
    },
    warningPoints: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const warns = [
        [
          `残された予算は¥${sav.toLocaleString()}のみであり、ちょっとした外食や日用品の重複買いで簡単に赤字に転落します。`,
          `最多支出の${label}の増加率が高く、買い出しの回数と1回あたりの購入単価が上昇傾向にあります。`
        ],
        [
          `「1回あたり数百円」という手軽なキャッシュレス決済の連発が、知らない間に合計¥${tot.toLocaleString()}まで膨らむ罠になっています。`,
          `月末までに発生するスマートフォンの料金やサブスクなど、口座引き落とし予定金額が考慮されていません。`
        ],
        [
          `お腹が空いている時間帯やストレスが溜まっているときに、不要な甘いものなどを衝動買いする傾向があります。`,
          `特売だからと余計な量を購入し、結果的に使い切れずに一部の食材をムダにしていないか振り返りが必要です。`
        ]
      ];
      return warns[i % warns.length];
    },
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const basicSugs = getConcreteSuggestions(label, ttot, 10, bud);
      return [
        `今月が終わるまでの残り日数、1日の使用上限を ¥${Math.floor(sav / 10).toLocaleString()} と定めてこれを超える決済を完全に防ぎましょう。`,
        ...basicSugs.slice(0, 2)
      ];
    }
  })),

  // -------------------------------------------------------------
  // GROUP C: 予算オーバー状態または極めてピンチな赤字家計 (usagePercent > 90%) (20パターン)
  // -------------------------------------------------------------
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: i + 31,
    condition: (p: number, tc: string) => p > 90,
    summary: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number, curMonth: string) => {
      const isOver = tot > bud;
      const amountDiff = Math.abs(sav);
      const summaries = [
        `今月はすでに予算を消化しきっており、${isOver ? `¥${amountDiff.toLocaleString()}の赤字` : "予算限界のピンチ"}となっています。主な原因は最多の${label}（¥${ttot.toLocaleString()}）への過剰な出費です。`,
        `危険な状態です。残額が極めて少なく、最多支出の${label}が全体の${tp}%を占め、家計全体を押し潰しています。`,
        `完全に予算上限を突破しました。特に${label}の購入頻度が高く、コストの歯止めが機能しなかったことが主要因です。`,
        `家計改善が最も必要な状況です。月予算¥${bud.toLocaleString()}に対して、現在の進捗率は${p}%を超えています。`,
        `今月は非常事態です。最も多くの割合を占める${label}（¥${ttot.toLocaleString()}）の出費を即座に「ゼロ」に近づける必要があります。`,
        `お財布が赤信号です。無計画な出費の蓄積、特に高価な${label}の割合が重くのしかかっています。`,
        `予算の上限を超過しており、来月以降のおサイフ事情への影響が確定的です。${label}の見直しが急務です。`,
        `コントロールを失いつつあります。今月の赤字¥${isOver ? amountDiff.toLocaleString() : "寸前"}を真摯に受け止め、対策を講じましょう。`,
        `基本生活費である${label}が暴走してしまっています。全体の予算対比が${p}%と、非常に厳しい実績です。`,
        `今月は赤字決算です。一番金額の大きい${label}への支払いが、家計を大きく歪めてしまった元凶です。`,
        `予算消化がすでに極限に達しており、来月の先取り貯金を切り崩さざるを得ない危険な局面です。`,
        `最も高い出費が割高になりがちな${label}であるため、同じやり方を続けると来月も同様にオーバーします。`,
        `今月の総支出¥${tot.toLocaleString()}は、完全にあなたの設定予算を超過しています。早急な対策が必要です。`,
        `予算のクッションが完全に消滅しました。ここからの全ての出費は来月からの借金になる状態です。`,
        `食費や日常費に該当する${label}が当初予定の倍近くに膨れ上がったため、大赤字になっています。`,
        `家計防衛力が非常に低下しています。まずは最多の${label}（全体の${tp}%）に潜む無駄を徹底解剖しましょう。`,
        `予算を¥${isOver ? amountDiff.toLocaleString() : "大幅に"}超えており、貯金蓄積どころか資産の流出が起きています。`,
        `最多支出の${label}のペース配分が今月は完全に崩れてしまいました。行動パターンの転換が必要です。`,
        `非常に危機的な月です。生活コストが高くなりすぎているため、今すぐブレーキを踏む必要があります。`,
        `計画予算額を大きく突破してしまいました。これを一時的な例外に留めるため、直近の購買記録を見直します。`
      ];
      return summaries[i % summaries.length];
    },
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const points = [
        [
          `家計簿の記録を中断せず、赤字の数値現実から目を背けずに最後まで入力し続けている点は素晴らしいです。`,
          `無駄な固定費（使っていないサブスク等）の無駄払いは少なく、問題の焦点が変動費（${label}）に明確に絞られている点です。`
        ],
        [
          `支出の全履歴が金額つきで可視化されているため、来月に向けた「やめるべき無駄」のリストアップが簡単におこなえます。`,
          `家賃や保険料など、削減の難しいインフラ支出そのものは安全に抑えられています。`
        ],
        [
          `過去の支出明細から「どこで浪費したか」のピーク（高額支払いの日）を正確に検知できています。`,
          `今すぐ削減可能なカテゴリ（${label}）が出費のトップを占めているため、やるべき改善策が非常にシンプルです。`
        ]
      ];
      return points[i % points.length];
    },
    warningPoints: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
      const amountDiff = Math.abs(sav);
      const warns = [
        [
          `予算上限をオーバーして¥${amountDiff.toLocaleString()}超過しており、生活防衛資金を切り崩してしまう悪循環にあります。`,
          `最多支出の${label}（¥${ttot.toLocaleString()}）は、日常的な買い物回数の多さが生んだ「チリツモ無駄」の集合体です。`
        ],
        [
          `クレジットカードの利用枠や決済口座の引き落としが来月以降にずれている場合、さらなる実質赤字が重なります。`,
          `「安さ」や「便利さ」を理由に、同じような物を重複して買っている食材ロスや日用品ロスがあります。`
        ],
        [
          `ATMでの引き出し手数料やコンビニ手数料など、数回重なれば数百円〜数千円になる細かなコストへの意識が低下しています。`,
          `お酒やコンビニスイーツなど、ストレスを発散するための「習慣的浪費」が定着してしまっています。`
        ]
      ];
      return warns[i % warns.length];
    },
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number, tp: number) => {
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
    summary: selectedTemplate.summary(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent, ctx.currentMonth),
    goodPoints: selectedTemplate.goodPoints(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    warningPoints: selectedTemplate.warningPoints(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    suggestions: selectedTemplate.suggestions(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    topCategory: topCatName,
    topCategoryPercent: topCatPercent,
  };
}
