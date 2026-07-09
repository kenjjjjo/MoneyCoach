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

// 50の多様な分析テンプレートを定義
const TEMPLATES = [
  // ==========================================
  // GROUP 1: SAFE (usagePercent <= 60%) - FOOD TOP (10 templates)
  // ==========================================
  {
    id: 1,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今月は予算を十分に抑えられており、家計管理が極めて順調です。最も高い支出は${label}ですが、予算全体の範囲内に綺麗に収まっています。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `全体の支出を予算の半分以下に抑え、¥${sav.toLocaleString()}の貯蓄余力を生み出せています。`,
      `最も高額な${label}（¥${ttot.toLocaleString()}）も全体のペースに悪影響を与えていません。`
    ],
    warningPoints: () => [
      `大きな問題はありませんが、自炊の割合を維持して外食による急な出費増を防止しましょう。`,
      `支出が抑えられている時こそ、次の大きな出費に備えて先取り貯金を検討してください。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月もこの調子を維持するため、週に1回だけまとめ買いの日を設けて支出の変動を抑えましょう。`,
      `節約できた¥${Math.round(sav * 0.5).toLocaleString()}を投資や貯蓄に回す設定を行いましょう。`,
      `${label}をあと5%削減すると、来月はさらに¥${Math.round(ttot * 0.05).toLocaleString()}を浮かせることができます。`
    ]
  },
  {
    id: 2,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `非常に計画的なお金の使い方ができています。${label}がメインの支出ですが、無駄遣いがなく非常に健全な状態です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点で予算に対して¥${sav.toLocaleString()}のプラスを維持しています。`,
      `日頃の食生活に無駄な費用をかけず、堅実な選択ができている証拠です。`
    ],
    warningPoints: () => [
      `特にありませんが、栄養バランスに偏りが出ないよう、健康的な自炊を心がけましょう。`,
      `余裕があるからと月末に自分への大きなご褒美を衝動買いしないよう注意が必要です。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `食材の冷凍保存を活用し、廃棄ゼロを維持してさらに無駄を減らしましょう。`,
      `¥${Math.round(sav * 0.3).toLocaleString()}を自己投資の本代や趣味に少し割り振るのもおすすめです。`,
      `マイバッグを常備し、買い物時の不要なレジ袋代や少額のついで買いをカットしましょう。`
    ]
  },
  {
    id: 3,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `スマートな家計簿記録と高い節約意識が功を奏しています。${label}が最多支出ですが、予算のゆとりは十分にあります。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して大幅なゆとりを持っており、今月はボーナス貯金が期待できます。`,
      `食費を無闇に削りすぎることなく、心地よい範囲でのやりくりが成立しています。`
    ],
    warningPoints: () => [
      `月末に向けて気が緩み、セール品などを「お得だから」と余分に買ってしまわないよう警戒しましょう。`,
      `固定費が今後上がった場合も現在のやりくりを維持できるか、定期的な確認が必要です。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来期に向けて、ふるさと納税などを活用して実質的な${label}（食材）の負担を減らしましょう。`,
      `外食の回数を週に1回調整するだけで、月¥${Math.round(ttot * 0.1).toLocaleString()}の余裕が上乗せできます。`,
      `現在の家計簿をベースラインとし、来月の目標予算を少し引き下げる挑戦もおすすめです。`
    ]
  },
  {
    id: 4,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `安定した家計バランスです。最多支出が日常的な${label}であることは極めて自然で、大きな心配はありません。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `食生活を十分に充実させつつ、予算を¥${sav.toLocaleString()}も余らせる優秀な管理体制です。`,
      `他の娯楽費や衝動買いが抑えられているため、基本支出が非常に安定しています。`
    ],
    warningPoints: () => [
      `まとめ買いをした際に賞味期限切れで食材をロスしていないか、冷蔵庫内を確認してください。`,
      `突発的な飲み会や会食などの交際費が重なったときのバッファを意識しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `買い物前に必ず冷蔵庫のストックの写真を撮り、同じ調味料などの重複買いを防ぎましょう。`,
      `現在の余剰金の一部を積立口座に移し、自動的にお金が貯まる仕組みを強化しましょう。`,
      `${label}をあと3%削減するだけで、追加で¥${Math.round(ttot * 0.03).toLocaleString()}のゆとりが生まれます。`
    ]
  },
  {
    id: 5,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `素晴らしい進捗です。${label}への投資はあなたの生活の質の基盤ですので、予算内に収まっている限り最適です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して約${Math.round(100 - (tot/bud)*100)}%ものゆとりを残して推移しています。`,
      `生活満足度を下げることなく、自制的な家計管理ができているのが強みです。`
    ],
    warningPoints: () => [
      `調味料や保存食など、長期保存できるものの余分な買い溜めに注意しましょう。`,
      `コンビニでのちょっとしたデザート購入などが${label}をじわじわ圧迫しないようにしましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `スーパーの特売日を把握し、お肉などは安い日に買って冷凍保存する習慣をつけましょう。`,
      `今月浮いた分から¥${Math.round(sav * 0.2).toLocaleString()}を健康管理のためのジムやサプリに充てるのが好適です。`,
      `買い物の支払い方法をキャッシュレスに統一し、還元ポイントを賢く活用しましょう。`
    ]
  },
  {
    id: 6,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `全体的に非常にミニマルにまとまっています。${label}が最も多い項目ですが、非常に経済的です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `全体の生活コストが低く抑えられており、家計の機動性がとても高いです。`,
      `日々の買い出しにおいて、特売品や価格比較を上手に行えている様子が伺えます。`
    ],
    warningPoints: () => [
      `過度な節約によるストレスや栄養の偏りには十分注意してください。`,
      `急な冠婚葬祭などの特別支出に対する予備費は別に確保されているか確認しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `週末にスープなどの作り置きをしておくことで、平日の忙しい日の外食を楽に回避しましょう。`,
      `浮いた¥${sav.toLocaleString()}を緊急用の貯金口座に自動振込されるように設定しましょう。`,
      `${label}をあと8%効率化すれば、来月はさらに¥${Math.round(ttot * 0.08).toLocaleString()}を浮かせられます。`
    ]
  },
  {
    id: 7,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `安心の予算進捗率です。${label}も平均値を大きく下回る計画的な水準を維持しています。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点のやりくりが完璧であり、将来に向けた資産形成が非常にスムーズに進むレベルです。`,
      `支出全体に対する${label}のバランスが適切で、無理のない節約設計になっています。`
    ],
    warningPoints: () => [
      `生活にゆとりがあるため、ついつい無用なネットショッピングをしてしまわないようにしましょう。`,
      `季節の変わり目に増えがちな衣服費や美容代など、他カテゴリへの波及を意識しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `レシピアプリを活用し、冷蔵庫に余っている食材だけで作れる献立を検索する癖をつけましょう。`,
      `貯まった¥${sav.toLocaleString()}で、QOLが向上する時短家電の購入を検討してみるのも良いでしょう。`,
      `定期的なカフェ利用があればマイボトルを持参し、コーヒー代を節約しましょう。`
    ]
  },
  {
    id: 8,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `家計管理のお手本のような月です。最も多くの割合を占めるのが健康の元である${label}なのは健康的です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して十分に余裕があり、今月は大きな貯金を作ることができています。`,
      `食費（¥${ttot.toLocaleString()}）の使い方が計画的で、無駄なロスが少ない証拠です。`
    ],
    warningPoints: () => [
      `現在の低い支出水準が一時的なものに終わらないよう、習慣化を目指しましょう。`,
      `通信費や定額サブスクなど、見落としがちな固定費が残っていないか再度チェックしましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `スーパーへ行く回数を現在の半分にし、その分まとめ買いを徹底してついで買いを防止しましょう。`,
      `毎月の最低貯金額を設定し、手元に残る¥${sav.toLocaleString()}から自動天引きするようにしましょう。`,
      `調味料などを大容量パックで購入するようにし、単価を下げる工夫を取り入れましょう。`
    ]
  },
  {
    id: 9,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `非常に優れたコストコントロールです。${label}は誰しも大きな負担になる中、ここまで低水準にできているのは素晴らしいです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算の約4割を余剰資金（¥${sav.toLocaleString()}）として残せる健全な財政状態です。`,
      `日々の買い物の単価意識が非常に高く、無計画な高額出費がありません。`
    ],
    warningPoints: () => [
      `過剰なこだわりによる食事制限などがないよう、健康優先で予算を活用してください。`,
      `セールなどで安いからと大量に買いすぎて、使い切れずに破棄することがないよう注意します。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `よく使う食材の底値をメモしておき、それを超える場合は別の代替食材を選ぶ習慣をつけましょう。`,
      `余った予算の一部で、料理のモチベーションが上がる調理器具を購入してみるのも手です。`,
      `買い物の回数が増えると誘惑も増えるため、週2回までにルール化してみましょう。`
    ]
  },
  {
    id: 10,
    condition: (p: number, tc: string) => p <= 60 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `とても順調に今月の家計が推移しています。${label}のコントロールが全体の高いパフォーマンスにつながっています。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `支出全体をコンパクトに保ちつつ、¥${sav.toLocaleString()}のバッファを有しています。`,
      `高額な単発出費がなく、日々の細かな買い物もしっかり管理できています。`
    ],
    warningPoints: () => [
      `ここまでの節約がストレスにならないよう、たまには息抜きの外食なども取り入れましょう。`,
      `クレジットカードでの引き落としが来月以降にずれているものがないか確認しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `スーパーのプライベートブランド（PB）商品を積極的に選び、同じ品質で安く済ませましょう。`,
      `余剰資金をNISA口座など長期の資産運用枠に回して将来の資産を拡大しましょう。`,
      `外食時は水やお茶を持参する習慣を身につけ、ドリンク代での無駄を防ぎましょう。`
    ]
  },

  // ==========================================
  // GROUP 2: SAFE (usagePercent <= 60%) - CONVENIENCE TOP (10 templates)
  // ==========================================
  {
    id: 11,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算全体は抑えられていますが、最も高額な項目が${label}になっています。全体の管理が良いだけに、ここを改善すればさらに貯金できます。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に達することなく、計画的に家計全体をコントロールできています。`,
      `他の娯楽や大きな買い物がなく、全体の基礎的な生活コストは非常に低いです。`
    ],
    warningPoints: () => [
      `${label}は割高な商品が多いため、小さな無駄（ドリンク、ホットスナック等）が積もり積もっています。`,
      `便利さに依存して、スーパーで安く買えるものまで高値で買っている傾向があります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `コンビニに行くのは「週に2回まで」とし、用事がない時は店内に入らないようにしましょう。`,
      `コンビニで買っていた飲み物を、スーパーのまとめ買いやネット通販での箱買いに変えるだけで、月¥${Math.round(ttot * 0.4).toLocaleString()}浮かせられます。`,
      `コンビニの会計をプリペイドカードやスマホ決済に統一し、チャージ額だけでやりくりするルールを作りましょう。`
    ]
  },
  {
    id: 12,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `家計全体はセーフですが、最多支出が${label}です。時間効率とコストのバランスを見直す余地があります。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算に対する余裕が十分にあり、¥${sav.toLocaleString()}の貯蓄余地があります。`,
      `無駄なローンや大きなサブスクリプションを回避できており、全体的には身軽です。`
    ],
    warningPoints: () => [
      `夜間や朝のちょっとしたついで買いが日常習慣化して、気づかぬうちに固定化しています。`,
      `「1回あたり数百円」という心理的なハードルの低さが落とし穴になっています。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `水筒やマイボトルを持参し、1日あたり1〜2本買っているペットボトル飲料代をゼロにしましょう。`,
      `コンビニでのホットスナック購入を我慢し、その分スーパーでお惣菜を買いましょう。`,
      `朝食やランチを事前にスーパーや薬局（ドラッグストア）で調達し、コンビニ利用率を半減させましょう。`
    ]
  },
  {
    id: 13,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `全体予算は順調に推移しています。しかし、${label}（¥${tot.toLocaleString()}中の一部）がトップなので、改善の大きな伸び代があります。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限を意識した買い物ができており、破綻のないやりくりを継続できています。`,
      `趣味や大きな出費を抑え、現金のクッション（¥${sav.toLocaleString()}）をしっかり確保しています。`
    ],
    warningPoints: () => [
      `お腹が空いた状態でコンビニに行くと、不必要なデザートや新商品を買いがちになります。`,
      `自動販売機やコンビニの手軽さに慣れてしまい、価格に対する感覚が麻痺する恐れがあります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `コンビニでの買い物メモを徹底し、メモに書かれていない新商品などは決して買わないようにしましょう。`,
      `普段よく買うアイテムをドラッグストアで買い置きし、コンビニに行く回数を3分の1に減らしましょう。`,
      `コンビニ代を月¥${Math.round(ttot * 0.3).toLocaleString()}削減し、その分を自分の本当に行きたいレストランの費用に充てましょう。`
    ]
  },
  {
    id: 14,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `順調な家計簿記録です。ただ、最も高額なのが単価の高い${label}である点は、少し勿体ないポイントです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `毎月の予算をオーバーせず、常に一定の黒字（¥${sav.toLocaleString()}）を維持する習慣があります。`,
      `無計画な高額ショッピングがなく、支出の波が穏やかです。`
    ],
    warningPoints: () => [
      `ATM手数料の発生や、小腹満たしのお菓子購入など、少額の「チリツモ無駄遣い」が発生しています。`,
      `コンビニ弁当の継続は、食費だけでなく健康面でも将来的なコスト上昇に繋がるリスクがあります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `どうしてもコンビニに行くときは、レジ横の揚げ物コーナーを見ないように徹底しましょう。`,
      `夜食用のスナックやカップ麺は事前にスーパーで安く買い、自宅にストックしておきましょう。`,
      `${label}をあと15%削減して、浮いた¥${Math.round(ttot * 0.15).toLocaleString()}を来月の特別予算にしましょう。`
    ]
  },
  {
    id: 15,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `家計全体は非常に低コストで安全ですが、${label}が一番の出費です。時間の節約と引き換えにお金を多く払っている状態です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して大きなバッファを持ち、¥${sav.toLocaleString()}の余剰を確保しています。`,
      `他の固定費（サブスクや美容等）がよく抑えられており、家計構造はスマートです。`
    ],
    warningPoints: () => [
      `平日のランチをすべてコンビニ調達にすると、知らず知らずのうちに月数万円の支出になります。`,
      `コンビニの利便性に惹かれ、家から少し歩けばスーパーがあるのに行かない状態になっています。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `週の初めに簡単な食材を買い出し、平日のランチ代を節約するサイクルを作ってみましょう。`,
      `コンビニに入る際は、1品のみ（目的のものだけ）買って30秒以内に退店するルールを作りましょう。`,
      `マイボトルに自宅で沸かしたお茶を入れ、毎日の飲み物代をすべてゼロに抑えましょう。`
    ]
  },
  {
    id: 16,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `全体支出は低く抑えられており極めて健全です。しかし、最多支出が${label}なため、これをスーパーに切り替えるだけで家計はさらに劇的に改善します。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算の約半分程度しか使っておらず、¥${sav.toLocaleString()}もの黒字が確定的です。`,
      `大きな無駄がないため、ベースの家計防衛力はすでに非常に高い状態です。`
    ],
    warningPoints: () => [
      `深夜のコンビニ訪問など、突発的な欲求に従った支出の癖がついている可能性があります。`,
      `コンビニのキャッシュレス決済は簡単すぎるため、お金を払っている感覚が薄れやすいです。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `夕食を食べた後にコンビニに行かないよう、夜間の寄り道を厳格に制限しましょう。`,
      `同じお弁当やサラダでも、スーパーで買うと1個あたり100円〜200円安くなるので、極力スーパーを使いましょう。`,
      `浮いた¥${sav.toLocaleString()}を一部別の投資や貯蓄にまわす先取り管理を行いましょう。`
    ]
  },
  {
    id: 17,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算は十分守られています。ただ、${label}への依存度が他と比較して高くなっています。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `大きな出費（趣味、ファッションなど）を適切にコントロールし、無駄遣いを未然に防げています。`,
      `毎月の生活予算の枠から大きく逸脱しない安心感があります。`
    ],
    warningPoints: () => [
      `雨の日や疲れた日など、「自分へのご褒美」と称した甘いデザートの買いすぎに注意しましょう。`,
      `タバコや特定の飲料など、習慣化している項目が全体の${label}を押し上げていないかチェックします。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `お菓子などはコンビニではなく、スーパーのファミリーパックを買い置きして少しずつ食べましょう。`,
      `コンビニのポイント利用などを徹底し、現金の持ち出しを可能な限り削減しましょう。`,
      `${label}にかける金額をあらかじめ週ごとに別枠で制限してみましょう。`
    ]
  },
  {
    id: 18,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `とてもクリーンな家計簿です。最も割合が大きいのが日常の${label}ですが、スーパーに代用すれば今月の貯蓄率はMAXになります。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `月の予算が¥${bud.toLocaleString()}の中、かなりの余裕を維持できているのは見事です。`,
      `衝動的なブランド品の購入や無駄な飲み会などが完璧にシャットアウトされています。`
    ],
    warningPoints: () => [
      `一度に何千円も使わないものの、1回数百円の決済が多数の件数となっており管理が複雑化します。`,
      `コンビニに立ち寄ることが、ストレス解消の代わりになっていないか客観的に振り返りましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `コンビニに行く代わりに、静かなカフェでの読書など、お金がかからない別のリフレッシュ習慣を見つけましょう。`,
      `コンビニでよく買うお茶は家で作り、サーモスのマグボトルで毎日持ち歩くようにします。`,
      `浮いた¥${sav.toLocaleString()}を来月に向けてさらに有益な資格勉強などの自己投資に充ててみましょう。`
    ]
  },
  {
    id: 19,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `家計全体はセーフゾーンですが、もっと貯蓄力を伸ばせます。なぜなら、単価の高い${label}が支出トップだからです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限までかなり遠く、¥${sav.toLocaleString()}もの十分なキャッシュバッファがあります。`,
      `サブスクリプションなどの固定費が無駄に契約されておらず、変動費主体のスリムな構成です。`
    ],
    warningPoints: () => [
      `コンビニの新商品パッケージに惹かれて、不要な食べ物をついつい購入してしまいがちです。`,
      `レジ付近に置いてあるガムや小物などのついで買いが定着していないか見直します。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `「仕事帰りにコンビニに寄る」というルートを意図的に避け、まっすぐ帰宅する行動パターンを試しましょう。`,
      `必要な日用品はすべて週末にドラッグストアでまとめて購入し、平日のコンビニを完全スルーしましょう。`,
      `浮いたお金で、家でより美味しくご飯を食べられる食材をスーパーで購入するようにしましょう。`
    ]
  },
  {
    id: 20,
    condition: (p: number, tc: string) => p <= 60 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今月は非常にお金をコントロールできています。ただ、やはり${label}（¥${ttot.toLocaleString()}）はより削減可能な項目です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算の約半分に抑えて生活できており、¥${sav.toLocaleString()}を確実に貯金に回せています。`,
      `交際費や不要な趣味費が極めて低く、非常にシンプルなライフスタイルが伺えます。`
    ],
    warningPoints: () => [
      `コンビニでポイントを貯めるために、無理に買い物を足してしまわないように注意しましょう。`,
      `ちょっとしたおつまみやアルコールのコンビニ購入が、毎日の習慣になっていないか注意しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `お酒や炭酸水はスーパーのネットスーパー等で箱買いし、自宅から持参・消費しましょう。`,
      `コンビニの代わりに近くの公園やフリースペースで小休止し、無駄な出費なしに気分転換しましょう。`,
      `来月は${label}を半分以下の¥${Math.round(ttot * 0.5).toLocaleString()}に収めることをターゲットにしましょう。`
    ]
  },

  // ==========================================
  // GROUP 3: SAFE (usagePercent <= 60%) - OTHER TOP / HOBBY etc. (10 templates)
  // ==========================================
  {
    id: 21,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `全体の支出がかなり低く抑えられていて優秀です。最も出費が多かったのは${label}ですが、予算のゆとりは極めて大きいです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `食費や日常支出が計画的であり、予算を¥${sav.toLocaleString()}も残して貯金体質が身についています。`,
      `最多の${label}（¥${ttot.toLocaleString()}）も予算内で計画的に楽しめているため良好です。`
    ],
    warningPoints: () => [
      `特定のカテゴリのみにお金が集中しやすいため、全体のバランス感覚を維持しましょう。`,
      `お金を使っていないように見えても、来月以降に回ってくる支払いや高額イベントの有無を確認してください。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今月残った¥${sav.toLocaleString()}の一部を「特別費」としてプールし、旅行などの一時支出に備えましょう。`,
      `${label}にかける金額の比率を事前にルール化し、過度な集中を防ぎましょう。`,
      `家計簿アプリの予算通知を設定し、一定値に達した段階で確認する体制を作りましょう。`
    ]
  },
  {
    id: 22,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `非常にミニマムな家計で素晴らしいです。最多項目が${label}なのは、生活に必要な他の基礎コストが劇的に抑えられているからです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に全く圧迫されておらず、金銭的なゆとりと精神の安定が保たれています。`,
      `固定費やサブスク代金が必要最小限になっており、無駄な流出がほとんどありません。`
    ],
    warningPoints: () => [
      `生活全般の支出を削りすぎていないか、たまには適正な自己投資ができているか確認しましょう。`,
      `今月抑えられた反動で、来月一気に趣味費などが跳ね上がらないよう安定を維持します。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `余った予算を積み立てることで、将来のための安心をより強固なものにしていきましょう。`,
      `${label}の中で、「本当に自分の幸福度に貢献した出費」だったかを定期的に振り返りましょう。`,
      `買い物時に必ずポイントやキャンペーンを活用し、もう数パーセントの生活メリットを獲得しましょう。`
    ]
  },
  {
    id: 23,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `スマートなマネーコントロールです。最も大きい${label}も、他の項目の節約によって完全にカバーされています。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算全体に対して¥${sav.toLocaleString()}の大幅な黒字を記録しています。`,
      `無計画な日常のお菓子の購入やちょっとした贅沢がしっかり管理されています。`
    ],
    warningPoints: () => [
      `予算が大きく余っているため、月末に不要なセール品を買ってしまわないように注意します。`,
      `家族や友人との食事など、豊かな人間関係のための交際費まで削りすぎないようにします。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今月の支出ログを見直し、来月同じクオリティを維持しながら少しだけ予算を減らす検討をしましょう。`,
      `節約できた¥${sav.toLocaleString()}のうち一部を自己啓発の教材や本代に割り振るのがおすすめです。`,
      `日々の支払いをまとめてクレジットカードのポイント還元のメリットを最大化しましょう。`
    ]
  },
  {
    id: 24,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `大変安定した家計推移で文句ありません。特に、最多項目が${label}であっても余裕があるのが強力です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して約${Math.round(100 - (tot/bud)*100)}%ものゆとりを残せており、素晴らしいです。`,
      `基礎出費の引き締めができているため、お金が貯まりやすい黄金パターンを築けています。`
    ],
    warningPoints: () => [
      `サブスクの無料期間切れのまま継続してしまっているサービスがないか、今一度チェックします。`,
      `電気・ガスなどの水道光熱費やスマートフォンの料金プランが最適か、見直しの余地はあります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `毎月の生活費を完全に把握できたので、来月からは自動で貯蓄用口座にお金が移る設定をしましょう。`,
      `普段何気なく支払っている銀行の振込手数料や引き出し手数料を完全にゼロにする口座選びをしましょう。`,
      `現在の家計簿の状態をベースに、来月に向けて欲しいものを買うための「購入積立ルール」を作りましょう。`
    ]
  },
  {
    id: 25,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `計画的で健全なお金の管理です。最多支出項目が${label}になっていますが、予算への影響は微々たるものです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算に対して¥${sav.toLocaleString()}の大幅なプラスを維持して貯金力を大幅に上げています。`,
      `普段の食費などの基本コストの無駄が少なく、家計の基礎代謝が良い状態です。`
    ],
    warningPoints: () => [
      `欲しいものを欲しい時に買う「プチ衝動買い」が蓄積していないか確認しましょう。`,
      `生活コストが低い今の状態に慢心せず、定期的な家計簿チェックは怠らないようにします。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月の予算を設定する際、今月の実費に近い低めの基準で設定すると、さらに貯金スピードが加速します。`,
      `普段使う日常消耗品は、ネットの特売セール時に大容量でまとめ買いして年間コストを下げましょう。`,
      `現在の高いコントロール能力を維持し、貯まった現金を投資に一部振り向ける準備をしましょう。`
    ]
  },
  {
    id: 26,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `非常に素晴らしいマネーコントロールです。最多支出である${label}を含めて、すべての項目がスマートです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `生活に過度な窮屈さを感じさせることなく、¥${sav.toLocaleString()}の貯蓄バッファを作れています。`,
      `固定費や家賃、サブスク代金など、生活の固定部分が肥大化していないのが最大の強みです。`
    ],
    warningPoints: () => [
      `日々の支払いで現金を使う割合が多い場合は、ポイントや記録のしやすさを考えてキャッシュレス移行を推奨します。`,
      `セール期間中の「今買わないと損」という感情による買い物をしていないか点検しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月の貯蓄目標をあと¥5,000引き上げ、その分固定費などの小さなプラン見直しで補うアプローチをしましょう。`,
      `今月の大幅な黒字分から¥${Math.round(sav * 0.3).toLocaleString()}を来年用の旅行積立に振り分けましょう。`,
      `無駄のない生活習慣を自分の日常標準として完全にパターン化しましょう。`
    ]
  },
  {
    id: 27,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `安心して見ていられる家計状況です。最も高額な項目が${label}ですが、予算全体への圧迫はまったくありません。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `全体のやりくりが非常に緻密で、月全体の支出が予算全体の半分以下に抑えられています。`,
      `単発の高額な購入がなく、日々の買い物の自制心がしっかりと機能しています。`
    ],
    warningPoints: () => [
      `将来的に大きな支払い（税金や保険料の年払いなど）が控えていないか、年間の支出予定を考慮します。`,
      `ネットショッピングで、買う必要がないのに送料無料にするために余分な商品を足さないようにします。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今月購入したもののなかで、あまり使わなかったものがないかを確認し、来月の同じ失敗をゼロにします。`,
      `余った¥${sav.toLocaleString()}を一部投資枠に移し、中長期的なお金の成長サイクルを開始しましょう。`,
      `家計簿アプリにアラート機能を設定し、カテゴリ別の予算管理を自動化していきましょう。`
    ]
  },
  {
    id: 28,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `非常に高いスコアで家計簿が運営されています。最多項目が${label}ですが、全体的に完璧なバランスです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算枠に対して¥${sav.toLocaleString()}の極めて安全なマージンを確保できており素晴らしいです。`,
      `無駄な外食やふらっと寄るコンビニのついで買いといった「小さな浪費」が排除されています。`
    ],
    warningPoints: () => [
      `家計管理が完璧であるため、逆にお金を使うことに対して罪悪感を感じすぎないようにしましょう。`,
      `必要経費はしっかり使い、本当に価値を感じる部分にお金を配分しましょう。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今月の節約分を活用して、日々の睡眠の質を高めるための高級な寝具やタオルの導入などを検討します。`,
      `格安SIMや電気会社のプランなどの固定費用の定期的な点検を行い、さらに基本コストを下げましょう。`,
      `日々の支払いを特定のポイント経済圏に集約し、生活実質コストを低下させましょう。`
    ]
  },
  {
    id: 29,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `非常に理想的な黒字家計です。最も多く使ったのが${label}ですが、予算の消化ペースは極めて安全です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算上限に対して約${Math.round(100 - (tot/bud)*100)}%ものゆとりを残して推移しているため、将来設計が非常に容易です。`,
      `日々の買い物の取捨選択がハッキリしており、無駄なお金が一切出ていません。`
    ],
    warningPoints: () => [
      `特に大きなマイナス点はありませんが、クレジットカードのポイント失効などがないかだけ見ておきましょう。`,
      `現在の高いコントロールレベルを保ち、定期的な家計分析の習慣を完全に根付かせます。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月の貯金額を今月より少し多く設定し、給与受取直後に先取りで別口座に移す仕組みを作りましょう。`,
      `よく使う日用品の在庫管理を徹底し、同じものの複数ストックなどによる死蔵品を防ぎます。`,
      `浮いた¥${sav.toLocaleString()}の一部で、今後のスキルアップに役立つオンライン教材などの購入を検討しましょう。`
    ]
  },
  {
    id: 30,
    condition: (p: number, tc: string) => p <= 60,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `極めて安定した家計実績を達成した月です。最も多くの費用を割いたのが${label}ですが、他がスリムなので理想的です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `無駄なお金の漏れがほぼゼロであり、¥${sav.toLocaleString()}をまるごと投資や貯蓄に割り当て可能です。`,
      `高額なショッピングの誘惑に屈せず、自分の生活目標に基づいた自律的な管理ができています。`
    ],
    warningPoints: () => [
      `生活費用が抑えられているため、突発的に「大きなものを買いたい」欲求が強まる波に用心します。`,
      `来月にかけて旅行や大型連休などのイベントがある場合、その出費が予算枠を侵食しないか見越します。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `週末に余った食材を活用する冷蔵庫クリーンアップデーを作り、今月の良い結果を来月に引き継ぎましょう。`,
      `毎月の生活費に変動が少なくなったため、予算額の設定自体を適正化してさらに貯蓄効率を高めましょう。`,
      `現在の家計の健全さを誇りに思い、来月に向けての節約行動をさらに楽しんで継続しましょう。`
    ]
  },

  // ==========================================
  // GROUP 4: CAUTION/WARNING (60% < usagePercent <= 100%) (10 templates)
  // ==========================================
  {
    id: 31,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今月は予算内に収まってはいますが、やや消化スピードが早く、残りの日数で自制が必要です。最も支出が大きいのは${label}です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点では赤字にならず、予算の枠内で踏みとどまることができています。`,
      `何にいくら使ったのかが正確に記録されているため、すぐに軌道修正が可能な状態です。`
    ],
    warningPoints: () => [
      `残りのゆとりが¥${sav.toLocaleString()}しかないため、これ以上のイレギュラーな高額出費は即座に予算オーバーに繋がります。`,
      `最も高額な${label}の増加ペースをここで防ぐ必要があります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今月が終わるまでは、新しい服や趣味のアイテムなど、緊急性のないお買い物はすべて来月に延期しましょう。`,
      `最多項目である${label}をあと10%削減できれば、追加で¥${Math.round(ttot * 0.1).toLocaleString()}の安全なゆとりが生み出せます。`,
      `スーパーでの買い物時に、事前に購入金額を決めてカゴに入れるように徹底しましょう。`
    ]
  },
  {
    id: 32,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算上限が近づきつつあります。最多支出の${label}の費用が、全体を引き上げている大きな要因です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点で予算に対する消化率が${Math.round((tot/bud)*100)}%であり、かろうじてセーフゾーンにとどまっています。`,
      `他の項目（固定費など）が肥大化していないため、個人の努力で全体の支出をコントロール可能です。`
    ],
    warningPoints: () => [
      `日常の細かい出費（コンビニやちょっとした買い物）が累積し、知らず知らずのうちに予算を圧迫しています。`,
      `月末に向けてのイベントや必要な支払いが残っている場合、赤字に転落するリスクが極めて高いです。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今月が終わるまでコンビニエンスストアへの出入りを「完全禁止」とし、すべての買い出しをスーパーかドラッグストアに統一しましょう。`,
      `不要になったサブスクリプションを1つ解約するだけで、毎月の基本コストを即座に下げることができます。`,
      `外食の代わりに、冷凍食品やお惣菜を活用して手軽かつ安価に食事を済ませる日を作りましょう。`
    ]
  },
  {
    id: 33,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `注意が必要なペースです。最多支出が${label}であるため、ここに対する小さな意識変化が月全体の収支を決定づけます。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家計簿が漏れなく記録されているため、どのカテゴリが原因なのかが一目瞭然です。`,
      `残りの日数を少し引き締めれば、十分予算内での着地が可能な余地が残っています。`
    ],
    warningPoints: () => [
      `予算の余裕金が¥${sav.toLocaleString()}となっており、少し高額な日用品をまとめ買いするだけで枠を超えてしまいます。`,
      `最も出費の多い${label}（¥${ttot.toLocaleString()}）に対して、明確な予算上限ルールが設定されていません。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来週の買い物は、冷蔵庫に残っているすべての食材を使い切るまで「一切行かない」クリーンアップに挑戦しましょう。`,
      `${label}をあと15%引き下げることで、来月はさらに¥${Math.round(ttot * 0.15).toLocaleString()}を貯金に回すことができます。`,
      `カフェ利用や自動販売機でのドリンク購入を一時中止し、すべて自宅からの持ち込みで対応しましょう。`
    ]
  },
  {
    id: 34,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `イエローサインが点灯しています。${label}への支出が多く、全体的にお金の流出が活発になっています。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算の総額を守るという意識は維持されており、ギリギリですが赤字回避体制です。`,
      `基礎支出以外の衝動的なブランド品購入などはしっかりとセーブできています。`
    ],
    warningPoints: () => [
      `お菓子やタバコ、缶コーヒーなどの「なんとなく」の買い物が多発し、合計金額が無視できない額になっています。`,
      `このまま残り日数を同じペースで過ごすと、高確率で月末に予算上限を突破してしまいます。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `スマホの決済履歴を見直し、過去1週間で「本当に必要なかったもの」にマークをつけて、次は買わない意識を高めましょう。`,
      `スーパーの買い物カゴに物を入れる前に、「これは本当に今日の生活に不可欠か？」と3秒間自問自答する習慣をつけてください。`,
      `浮いている残金¥${sav.toLocaleString()}を上限とし、一日の使用限度額を計算してそれを超えないようにしましょう。`
    ]
  },
  {
    id: 35,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `支出スピードが予算を少し超える勢いを見せています。トップである${label}の見直しが、現時点の最優先事項です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家計簿がリアルタイムで更新されており、現在のピンチ状態に早期に気づくことができています。`,
      `他の娯楽カテゴリやサブスク費用がとても適正に抑えられているのは良いポイントです。`
    ],
    warningPoints: () => [
      `予算枠に対して残されたマージンが少なくなっており、日々の出費への警戒感が必要です。`,
      `最多の${label}の中に、付き合いだけの無駄な交際費や不要なまとめ買いが混入していないか確認します。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `今週いっぱいは買い出しを一度もおこなわず、冷蔵庫や冷凍庫のストックだけで生活するレシピを組み立てましょう。`,
      `毎日の自動販売機での飲み物購入を止め、粉末のお茶などをマイボトルに詰めて持参しましょう。`,
      `${label}にかける金額を週単位で細かく管理するようにルール変更してみましょう。`
    ]
  },
  {
    id: 36,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `あと一歩で予算オーバーになる警戒ラインです。主な要因は${label}ですので、ここを抑えれば安全に着地できます。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `大きな出費がありつつも、何とか予算全体のボーダーラインの下で耐えています。`,
      `無駄な分割払いやサブスクが少なく、日常の微調整だけでコントロールできる範囲内に留まっています。`
    ],
    warningPoints: () => [
      `予算の進捗がかなり逼迫しており、突発的な事故や必要経費の発生に耐えられない可能性があります。`,
      `${label}（¥${ttot.toLocaleString()}）の勢いを弱めるための明確な歯止めが必要です。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `月末までスーパーの特売品のみを買い、ブランド食材や高額な冷凍食品はすべて棚に戻しましょう。`,
      `無駄なATM手数料の支払いや電子マネーの過剰な自動オートチャージを今すぐ解除しましょう。`,
      `${label}をあと5%スリムにして、¥${Math.round(ttot * 0.05).toLocaleString()}の安全なクッションを作りましょう。`
    ]
  },
  {
    id: 37,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今月は予算を維持していますが、最多支出の${label}が家計の柔軟性をかなり奪っています。少し警戒が必要です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算に対する安全枠を最低限残しており、現時点でオーバーしていないのは評価できます。`,
      `家計簿の全履歴が可視化されているため、反省と来月への対策がとても立てやすい状態です。`
    ],
    warningPoints: () => [
      `「少しくらいなら」という気持ちの積み重ねが、全体支出を予算限界付近まで引き上げてしまった要因です。`,
      `今後予定されている支払いや引き落としがある場合、残額¥${sav.toLocaleString()}では足りなくなる危険性があります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `欲しいものリストを作成し、リストアップしてから最低3日間は購入を決定しない「冷却期間ルール」を導入します。`,
      `コンビニ弁当をやめて、前日の残り物やスーパーの割引惣菜を活用したお手軽ランチに変えましょう。`,
      `無駄な固定サブスクを一括で見直し、使っていないサービスは即座に解約手続きをおこないます。`
    ]
  },
  {
    id: 38,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算の壁がすぐ目の前に迫っています。最も大きな${label}（¥${ttot.toLocaleString()}）の勢いをすぐに落とす必要があります。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点の支出総額が予算内に留まっており、かろうじて目標を死守できているのは立派です。`,
      `無駄な衝動買いを最小限に止め、実用的な出費を優先してここまで耐え抜いています。`
    ],
    warningPoints: () => [
      `使える残り予算が¥${sav.toLocaleString()}と少なく、不意の支出に対応しづらい脆弱な状態です。`,
      `日常の自炊を少しサボりがちになり、外食などの単価高めな支払いが連鎖している傾向があります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `毎日のペットボトル飲料の購入を止め、自宅で淹れた麦茶をマイボトルで持参して毎日¥150節約しましょう。`,
      `スーパーの最も安い時間帯（夕方以降）を狙って買い物に行き、惣菜や生鮮食品を安価に入手します。`,
      `月末までクレジットカードの使用を停止し、残高が目視できる現金やプリペイドカードのみで過ごしましょう。`
    ]
  },
  {
    id: 39,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `支出全体が少し多めで推移しています。最多の${label}を中心に、残された日々での緊急支出抑制が必要な時期です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `完全にコントロールを失う前に、家計簿の警告ステータスでブレーキをかけることができています。`,
      `基礎料金以外のオプション費用などを削ることで、全体のコストを下げる調整が可能です。`
    ],
    warningPoints: () => [
      `日々のこまごまとした日用品の過剰購入が、予算を圧迫する静かな犯人になっている恐れがあります。`,
      `予算上限に対する残りが少なくなっており、精神的にも焦りが生じやすい財政バランスです。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家にある全てのストック（非常食や缶詰含む）を確認し、それらを消化するレシピで数日間しのぎましょう。`,
      `休日に無料の公園や図書館などの施設を利用し、お金を使わないエンタメで週末を充実させましょう。`,
      `${label}にかける金額の総枠をあらかじめ設定し、それを超えそうなときは別カテゴリから融通しましょう。`
    ]
  },
  {
    id: 40,
    condition: (p: number, tc: string) => p > 60 && p <= 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算オーバーを防ぐための最後の防衛戦です。最多支出である${label}の引き締めが、今月の成功の鍵です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `現時点の支出ペースを正確に把握できており、無計画なオーバーに至っていないのが優良な点です。`,
      `娯楽品や衣服などの高額変動費が徹底してセーブされており、家計防衛に徹しています。`
    ],
    warningPoints: () => [
      `今月の残高が極めてタイトであり、ちょっとしたお祝いや突然の医療費などで簡単に赤字に転落します。`,
      `最多の${label}の支払いが一定のベースを超えているため、固定的な習慣の見直しが不可欠です。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `スーパーのまとめ買いリストを作成し、それにないものは絶対に購入しない強い意志を持ちましょう。`,
      `通信費や使っていない古いサービスの解約を進め、毎月の自動引き落とし額自体を減らします。`,
      `月末が終わるまで高級食材やお酒の購入を自粛し、お財布と体に優しい食事を心がけましょう。`
    ]
  },

  // ==========================================
  // GROUP 5: OVER BUDGET (usagePercent > 100%) (10 templates)
  // ==========================================
  {
    id: 41,
    condition: (p: number, tc: string) => p > 100 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `残念ながら今月の予算をオーバーしてしまいました。主な原因は最多支出である${label}の過剰な膨らみです。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `予算はオーバーしたものの、家計簿の記録を諦めず最後までつけ通していることは素晴らしい姿勢です。`,
      `支出明細が全て残っているため、どこを削るべきか具体的なアクションプランを組み立てられます。`
    ],
    warningPoints: () => [
      `予算枠に対して¥${Math.abs(sav).toLocaleString()}も使いすぎており、来月以降の貯蓄計画にマイナスの影響が出ます。`,
      `特に${label}（¥${ttot.toLocaleString()}）は、外食や無駄な買い物の蓄積で完全にコントロールを失っています。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月は「外食の回数をこれまでの半分」にし、その浮いた分で今回の赤字を確実に補填しましょう。`,
      `買い物の支払いルールを事前に設定し、予算の8割に達した時点で通知が来るように設定を変更しましょう。`,
      `自炊の割合を増やすため、簡単に作れる「マイ定番節約レシピ」を3つ確立しておきましょう。`
    ]
  },
  {
    id: 42,
    condition: (p: number, tc: string) => p > 100 && tc === "food",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算を大きく消化し赤字になってしまっています。日常のベースである${label}が想定を大幅に超えているのが主な原因です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家計簿をつけることで、予算オーバーの実態と向き合い、具体的な原因を数値として特定できています。`,
      `他の娯楽出費などはよく我慢できており、原因は特定のカテゴリに明確に絞り込めています。`
    ],
    warningPoints: () => [
      `全体の生活支出が予算の${Math.round((tot/bud)*100)}%に達しており、来月はかなりの引き締めが必要です。`,
      `食材の無駄な廃棄や、賞味期限切れによるロスが日常的に起きていないか振り返る必要があります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `週に1回、冷蔵庫の残り物だけで乗り切る「食材使い切りデー」をカレンダーに設定して強制実行しましょう。`,
      `来月の${label}の初期予算を今月より¥${Math.round(ttot * 0.15).toLocaleString()}低く設定し、計画的なやりくりを開始しましょう。`,
      `日常の飲み物やスナックをスーパーの特売で一括購入し、日々の細かな単価の高い支払いを削減します。`
    ]
  },
  {
    id: 43,
    condition: (p: number, tc: string) => p > 100 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算の制限を超過しています。最も不要で単価の高い${label}（コンビニ）が支出のトップを占めているのが極めて勿体ない点です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家計簿に記録がすべて記載されているため、コンビニへの過剰な依存度を数字で冷静に認識できています。`,
      `他のカテゴリ（趣味や交通費など）がしっかり抑えられているのは今後の大きな救いです。`
    ],
    warningPoints: () => [
      `予算枠に対して¥${Math.abs(sav).toLocaleString()}の超過があり、コンビニでの少額なチリツモ浪費が原因であることは明らかです。`,
      `利便性の対価として非常に高い手数料的支出を日常的に支払っています。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月はコンビニに行くのを「緊急時のみ、週1回」に厳格制限し、それ以外は一切入店しないようにします。`,
      `ペットボトル飲料をすべてスーパーでのまとめ買いか、マイボトルの持参に完全シフトして毎月¥5,000以上浮かせましょう。`,
      `コンビニの代わりにスーパーやドラッグストアを利用することで、同じ商品でも全体の買い出し費用を3割カットできます。`
    ]
  },
  {
    id: 44,
    condition: (p: number, tc: string) => p > 100 && tc === "convenience",
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算オーバーが発生しています。最大の要因は手軽だからとついつい使ってしまう${label}への累積的な出費です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `自分の支出の弱点（${label}への依存）が正確に把握できたことは、今後の改善に向けた第一歩です。`,
      `大きな負債などのトラブルはなく、変動費のちょっとした意識改革だけで即座に建て直せる状態です。`
    ],
    warningPoints: () => [
      `「1回の買い物は少額」というコンビニの心理的盲点が原因で、知らず知らずのうちに大金を失っています。`,
      `予算枠を¥${Math.abs(sav).toLocaleString()}超過し、来月のおサイフ計画への影響が避けられません。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `コンビニ支払いに使っているアプリの自動チャージ設定をオフにし、チャージ額を超えたら買えないようにします。`,
      `小腹が空いた時用のナッツや軽食を事前にスーパーで安く買い、オフィスの引き出しやバッグに常備しましょう。`,
      `来月の${label}の総目標を¥3,000以内に設定し、それを超えたらゲーム感覚でペナルティを自分に課しましょう。`
    ]
  },
  {
    id: 45,
    condition: (p: number, tc: string) => p > 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今月は残念ながら赤字での着地となりました。最も出費が多かったのは${label}であり、ここが予算圧迫の主要因です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `赤字になってしまっても記録を止めず、家計簿に向き合っていることが今後の黒字化の重要な布石です。`,
      `どのイベントや時期に支出が急増したかがカレンダーから読み取れるため、次回の予防策が作れます。`
    ],
    warningPoints: () => [
      `予算制限を¥${Math.abs(sav).toLocaleString()}オーバーしており、生活防衛資金を削ってしまっている危険性があります。`,
      `最多の${label}のほかに、見落としがちな固定サブスクなどが全体を底上げしている恐れがあります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月は全体の予算を強制的に10%引き下げ、基本に立ち返ってスリムな家計からスタートしましょう。`,
      `クレジットカードの引き落とし日までに、今回の赤字分に相当する金額を先取りして口座に補填しておきましょう。`,
      `本当に必要か判断がつかないサブスクリプションは、今月中にとりあえずすべて一時解約をおこなってください。`
    ]
  },
  {
    id: 46,
    condition: (p: number, tc: string) => p > 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今月の予算上限を超過し、家計簿が警告状態にあります。最も比率の大きい${label}の大幅なスリム化が必要です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `支出の内訳が完璧に記録されているため、何が無駄だったかをカテゴリ別に明確に振り返ることができます。`,
      `基礎支出以外の衝動買いなどのトリガーがどこにあったか、冷静に分析可能な情報が揃っています。`
    ],
    warningPoints: () => [
      `予算の約${Math.round((tot/bud)*100)}%を消費してしまっており、お金の流れをもう一度引き締め直す必要があります。`,
      `最も大きな${label}（¥${ttot.toLocaleString()}）の勢いを落とすルールが不足している点です。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月は${label}にかける金額の総枠を今月の実績の半分にし、徹底的な自炊や代用で凌ぐ週を設けましょう。`,
      `ATMでの時間外手数料や不要なオプション費用がないか明細をチェックし、すぐに無駄を削りましょう。`,
      `日常の買い物において、購入前に「本当にこれを今すぐ使うか」必ず自問自答する習慣をつけてください。`
    ]
  },
  {
    id: 47,
    condition: (p: number, tc: string) => p > 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `今回の予算はオーバーとなりました。特に最多の${label}のペースが早く、全体を引っ張ってしまった形です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `赤字の現実から目を背けずに家計簿を更新し続けられたことは、今後の黒字復帰に向けた大きな強みです。`,
      `支出ログのおかげで、月末の突発的な浪費など、どの行動が引き金になったかを正確に検知できます。`
    ],
    warningPoints: () => [
      `予算に対して¥${Math.abs(sav).toLocaleString()}の赤字になっており、来月の使えるお金を先食いしている状態です。`,
      `日常的な細かな無駄遣いや、ついつい買ってしまうついで買いが大きな割合を占めています。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月の開始日に自動で先取り貯金を設定し、残ったお金だけで絶対にやりくりする仕組みに強制移行しましょう。`,
      `お菓子や不要なドリンクなどの嗜好品にかけるお金を、来月は半額の予算枠に収める計画を立てましょう。`,
      `普段の買い出しを「週に1回、まとめ買い」に固定し、スーパーへの訪問回数自体を最小化しましょう。`
    ]
  },
  {
    id: 48,
    condition: (p: number, tc: string) => p > 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算の境界を越えて赤字となってしまいました。特に日常で頻繁に使う${label}のコントロールが不十分だったことが主な原因です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `何のためにどれだけ使ったのかが全てデータとして残っているため、来月の計画を非常に立てやすい状況です。`,
      `問題がある項目が${label}に集中しているため、対策を立てるべきポイントが明確です。`
    ],
    warningPoints: () => [
      `予算を¥${Math.abs(sav).toLocaleString()}超過しており、お金が手元に残りにくい家計構造になっています。`,
      `「これくらいは大丈夫」という小規模な出費が何回も重なり、合計金額が肥大化しています。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `お買い物メモにない商品は絶対にレジに持っていかない「ノーメモ・ノーバイ」のルールを徹底してください。`,
      `家にある不要品をフリマアプリ等で売却し、今月の赤字分を少しでも現金で補填するアクションを取りましょう。`,
      `来月の${label}の初期設定予算を適正化し、無理のない節約計画から再スタートしましょう。`
    ]
  },
  {
    id: 49,
    condition: (p: number, tc: string) => p > 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `予算オーバーが発生しています。最大の出費となった${label}の見直しが、来月に向けての最大の課題です。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `最後まで家計簿の全出費を逃さず記録できたことは、家計改善に欠かせない素晴らしい習慣です。`,
      `他のカテゴリが適正な範囲に収まっており、全体のマネー管理の基礎はしっかりできています。`
    ],
    warningPoints: () => [
      `全体の消化率が予算上限の${Math.round((tot/bud)*100)}%に達しており、来月は引き締めのスタートになります。`,
      `日々の支払いでいくら使ったのかに対するアンテナが、月末にかけて少し弱まってしまっていた形跡があります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月の最初の1週間は「完全ノーマネーデー（お金を全く使わない日）」を2日間設け、支出のリズムを取り戻しましょう。`,
      `スーパーやお弁当の代わりに、手軽な自炊（ご飯を炊いて冷凍しておく等）から生活コストを下げましょう。`,
      `来月に向けて、固定費（特に使っていないサブスク）を今一度見直し、即座にカットします。`
    ]
  },
  {
    id: 50,
    condition: (p: number, tc: string) => p > 100,
    summary: (tot: number, bud: number, sav: number, label: string) => 
      `残念ながら予算が赤字転落となりました。最も大きな負担は${label}ですので、ここをテコ入れすれば即座に立て直せます。`,
    goodPoints: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `家計簿のデータが精緻に残されているため、オーバーの全貌を数値で把握し、前向きな反省ができます。`,
      `特定の大きな支払いが引き金だったことが明確なため、来月はそれを見越した予算配分が可能です。`
    ],
    warningPoints: () => [
      `当初予算に対して¥${Math.abs(sav).toLocaleString()}超過しており、お金の貯まりやすさに一時的なブレーキがかかっています。`,
      `コンビニのついで買いや、小さな飲み会などの積み重ねが最後の一押しとなってしまった恐れがあります。`
    ],
    suggestions: (tot: number, bud: number, sav: number, label: string, ttot: number) => [
      `来月はクレジットカードの利用枠や決済アプリの利用制限を設定し、物理的にお金を使いすぎない仕組みを取り入れましょう。`,
      `スーパーで買い物をする際は大容量の徳用パックなどを賢く選び、日々の単価をしっかりと下げていきましょう。`,
      `今回の結果に落ち込むことなく、来月から心機一転、新しい気持ちでやりくりを楽しんでいきましょう！`
    ]
  }
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
    summary: selectedTemplate.summary(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    goodPoints: selectedTemplate.goodPoints(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    warningPoints: selectedTemplate.warningPoints(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    suggestions: selectedTemplate.suggestions(ctx.monthlyTotal, ctx.budget, savedAmount, topCatLabel, topCatTotal, topCatPercent),
    topCategory: topCatName,
    topCategoryPercent: topCatPercent,
  };
}
