export interface AopuaEmailTemplate {
  subject: string;
  body: string;
  /** 何分後に送るか（subscribe時点からの相対） */
  delayMinutes: number;
  /** 差出人名（任意） */
  fromName?: string;
}

/** サイトURL（本番ドメインに合わせて env 側でも上書き可） */
const SITE = 'https://aopua.jp';

/**
 * 青PUA 15通 — dpub 構造（hook → 権威/具体 → 箇条 → CTA → PS）
 * Kennedy 3ステップ相当を3サイクル（1–3, 4–6, 7–9）＋教育6通（10–15）
 */
export const AOPUA_TEMPLATES = {
  aopua_01: {
    subject: '（登録あり）週1は動いてるのに、会話で止まるあなたへ',
    body: `<p>はじめまして。青PUAです。</p>
<p>もしあなたが、週に1回は現場に出ているのに、会話が3分で切れる／LINEが続かないなら——このメールはあなた向けです。</p>
<p>原因は「才能」じゃない。次の一言と、ログの取り方が整っていないだけです。</p>
<p><a href="${SITE}/blog">無料記事はこちら</a></p>
<p style="font-size:12px;color:#6b7280;">P.S. まずは文体と方向性を確かめてください。</p>`,
    delayMinutes: 0,
    fromName: '青PUA',
  },
  aopua_02: {
    subject: '【2/15】「教材どおり」で再現できない理由、1つだけ',
    body: `<p>ネットの型は、誰かの成功例の切り抜きです。</p>
<p>あなたの声のトーンや、その日の場所までは入っていない。だから空回りする。</p>
<p>青PUAの出発点は、現場をその日のうちに3行で残すこと。試行の残り方が、商品の中身です。</p>
<p><a href="${SITE}">トップの「5本柱」も読めます</a></p>`,
    delayMinutes: 24 * 60,
    fromName: '青PUA',
  },
  aopua_03: {
    subject: '【3/15】今週の1回だけ、型に置き換えてみる',
    body: `<p>いきなり全部は変えなくていい。</p>
<p>今週の声かけを1本だけ、記事の型に置き換えてみてください。</p>
<p>会員では週1の記事とQ&Aで、その一言を差し替えていきます。</p>
<p><a href="${SITE}/membership">月額メンバーシップの詳細</a></p>`,
    delayMinutes: 2 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_04: {
    subject: '【4/15】沈黙のあと、言える一言が決まっているだけで違う',
    body: `<p>立ち話が10秒で終わる。LINEは既読のまま沈む。</p>
<p>そのあとの自己嫌悪が、週末を重くします。</p>
<p>次の一言が先に決まっているだけで、帰り道は一段ラクになります。</p>
<p><a href="${SITE}/blog">無料記事で「切り返し」の例を見る</a></p>`,
    delayMinutes: 3 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_05: {
    subject: '【5/15】断られを「データ」に変える書き方',
    body: `<p>断られを人格攻撃にしない。睡眠や服装まで含めて、行動前の状態をログに残す。</p>
<p>「練習1回」で出ると、断られがデータに変わります。その日のメンタルが違います。</p>
<p><a href="${SITE}">マインドの柱（トップページ）</a></p>`,
    delayMinutes: 4 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_06: {
    subject: '【6/15】主戦場は1つに絞る——週1でいい理由',
    body: `<p>主戦場を週1つに絞ると、1文目が口から出ます。迷子のストナンが終わります。</p>
<p>1文目は3パターン。考えながら声をかけると負けます。</p>
<p><a href="${SITE}/notes">有料noteで深掘りする</a></p>`,
    delayMinutes: 5 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_07: {
    subject: '【7/15】「尋問」に見えない会話の順番',
    body: `<p>事実→感想の順番を守ると、尋問っぽさが消えます。</p>
<p>短く返された／冗談／警戒、それぞれ一言で切り替える型があります。</p>
<p><a href="${SITE}/blog">会話まわりの無料記事</a></p>`,
    delayMinutes: 6 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_08: {
    subject: '【8/15】2択で日程を出す——「いつでも」で困らせない',
    body: `<p>クロージングは2択で日程を出す。断られたあとも畳める一言を先に決めます。</p>
<p>空気を切らずに畳めると、自分のメンタルも守れます。</p>
<p><a href="${SITE}">5本柱の一覧</a></p>`,
    delayMinutes: 7 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_09: {
    subject: '【9/15】自分用に整えるなら、個別コンサル',
    body: `<p>ログを見ながら「次の一言」を一緒に決めにいくのが、コンサルです。</p>
<p>一般論ではなく、あなたの場面に合わせて診断します。</p>
<p><a href="${SITE}/consulting">コンサル詳細・料金</a></p>
<p style="font-size:12px;color:#6b7280;">単発から3ヶ月伴走まで選べます。</p>`,
    delayMinutes: 8 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_10: {
    subject: '【10/15】7年・数百回のログから残した「型」だけ',
    body: `<p>うまくいかなかったパターンは捨て、残した型だけをサイトにまとめています。</p>
<p>転売のノウハウではなく、試行の残り方が中身です。</p>
<p><a href="${SITE}">トップをもう一度読む</a></p>`,
    delayMinutes: 9 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_11: {
    subject: '【11/15】ログの1行目の書き方（テンプレ）',
    body: `<p>その日のうちに3行で残す。①言ったこと ②相手の反応 ③次に変える一言。</p>
<p>完璧じゃなくていい。止まった理由が見えるようになります。</p>
<p><a href="${SITE}/blog">実例は無料記事で</a></p>`,
    delayMinutes: 10 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_12: {
    subject: '【12/15】会員に入ると何が手に入るか',
    body: `<p>週1・会員限定記事と、月1・Q&A。</p>
<p>読んだその日の出撃に使える手順で、詰まっている一言を外から差し替えます。</p>
<p><a href="${SITE}/membership">メンバーシップ（月額の目安あり）</a></p>`,
    delayMinutes: 11 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_13: {
    subject: '【13/15】まだ無料だけで十分な人へ',
    body: `<p>まだ1回も行動していない方は、先に無料記事で十分です。</p>
<p>週1は動いているが、独学の限界を感じている——その段階で会員が刺さります。</p>
<p><a href="${SITE}/blog">無料記事一覧</a></p>`,
    delayMinutes: 12 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_14: {
    subject: '【14/15】来週も同じ失敗を繰り返すほうが、高くつく',
    body: `<p>月額は1回の飲み会より安くない日もあります。</p>
<p>それでも、同じ会話で週末を溶かすほうが、時間とメンタルの負担は大きい——という見方もできます。</p>
<p><a href="${SITE}/membership">型を更新し続ける（会員）</a></p>`,
    delayMinutes: 13 * 24 * 60,
    fromName: '青PUA',
  },
  aopua_15: {
    subject: '【最後】この15通で伝えたかったこと、1つだけ',
    body: `<p>センスの問題じゃなく、手順とログの問題として扱えば、次の一手は見えます。</p>
<p>無料記事・note・会員・コンサル、どの入口でも構いません。まず一歩だけ試してください。</p>
<p><a href="${SITE}/blog">無料記事</a> · <a href="${SITE}/membership">会員</a> · <a href="${SITE}/consulting">コンサル</a></p>
<p style="font-size:12px;color:#6b7280;">P.S. このシリーズはここまでです。またサイトで会いましょう。</p>`,
    delayMinutes: 14 * 24 * 60,
    fromName: '青PUA',
  },
} as const satisfies Record<string, AopuaEmailTemplate>;

export type AopuaEmailType = keyof typeof AOPUA_TEMPLATES;

export const AOPUA_EMAIL_TYPES = Object.keys(AOPUA_TEMPLATES) as AopuaEmailType[];

export function wrapAopuaEmail(body: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #111; background: #fff; }
      .container { max-width: 680px; margin: 0 auto; padding: 24px; }
      .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; }
      .footer { margin-top: 18px; font-size: 12px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        ${body}
      </div>
      <div class="footer">
        <p>このメールは自動送信です。</p>
      </div>
    </div>
  </body>
</html>`;
}
