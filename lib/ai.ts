import OpenAI from 'openai';

// OpenAI APIを使用（GPT-4o-mini: 高品質でコスト効率の良いモデル）
// 環境変数 OPENAI_API_KEY が設定されている場合はOpenAIを使用
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MessageContext {
  herMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  fullConversationText?: string; // 画像から抽出した会話全体のテキスト
  profileContext?: string; // 前提情報（名前、年齢、関係性など）
}

function analyzeMessage(message: string): {
  length: '短い' | '中程度' | '長い';
  emotion: string;
  intent: string;
  replyEase: '返信しやすい' | '普通' | '返信しにくい';
} {
  const length = message.length < 20 ? '短い' : message.length < 50 ? '中程度' : '長い';
  
  // 感情の分析
  let emotion = '普通';
  if (message.includes('！') || message.includes('😊') || message.includes('😄') || message.includes('楽しい') || message.includes('嬉しい')) {
    emotion = 'ポジティブ・嬉しそう';
  } else if (message.includes('...') || message.includes('😅') || message.includes('疲れた') || message.includes('大変')) {
    emotion = '疲れている・大変そう';
  } else if (message.includes('？') || message.includes('聞きたい') || message.includes('教えて')) {
    emotion = '質問・興味あり';
  } else if (message.length < 10 && !message.includes('？')) {
    emotion = '返信が短い・興味薄い可能性';
  }
  
  // 意図の分析
  let intent = '会話継続';
  if (message.includes('？') || message.includes('聞きたい')) {
    intent = '質問・情報を求めている';
  } else if (message.includes('会いたい') || message.includes('会える')) {
    intent = '会いたい・デートの可能性';
  } else if (message.includes('ありがとう') || message.includes('感謝')) {
    intent = '感謝・関係が良好';
  } else if (message.length < 5) {
    intent = '返信が短い・会話の継続が難しい';
  }
  
  // 返信のしやすさ
  let replyEase: '返信しやすい' | '普通' | '返信しにくい' = '普通';
  if (message.includes('？') || message.length > 20 || message.includes('！')) {
    replyEase = '返信しやすい';
  } else if (message.length < 5 && !message.includes('？')) {
    replyEase = '返信しにくい';
  }
  
  return { length, emotion, intent, replyEase };
}

export interface AlternativeResponse {
  response: string;
  explanation: string;
}

export interface ResponseWithExplanation {
  response: string;
  explanation: string;
  alternatives?: AlternativeResponse[]; // 代替返信候補（それぞれに解説付き）
}

export async function generateResponse(context: MessageContext): Promise<ResponseWithExplanation> {
  const systemPrompt = `あなたは、LINEやDMで女性と自然に会話する返信を提案する専門家です。
**最重要**: 返信は「戦略的」ではなく「自然で人間らしい会話」を心がけてください。

【最優先原則：Sへのすり替え】
- Sは会話の主導権を握り、次の展開を準備する戦略的な話題
- 手順: 1)キーワード抽出 2)S選択 3)自然にすり替え 4)次の展開準備
- 例: 「映画見た」→「どんな映画？最近〇〇見たけど面白かった」

【基本原則】
1. **基本は1文のみ**。必要時のみ2文（最大50文字）
2. **自然な口語表現**（「〜ある？」「〜してる？」など助詞省略）
3. **質問への対応**: 必ず答えを先に書いてから「逆に」で逆質問
4. **会話の流れを保つ**: 相手のメッセージに直接反応
5. **返信しやすさ**: 具体的な質問、選択肢型質問（ダブルバインド）

【段階別戦略】
- **初期**: フック会話、具体的な質問、共通点探し、**積極的にオファーを入れる**（「一緒に〇〇しない？」「〇〇行かない？」など）
- **関係構築**: 価値観深掘り、自己開示バランス、Sへのすり替え、**積極的にオファーを入れる**（「一緒に〇〇しない？」「〇〇行かない？」など）
- **デート誘い**: 具体的な提案、ダブルバインド、臨場感、**積極的にオファーを入れる**（「一緒に〇〇しない？」「〇〇行かない？」など）

【オファー戦略（最重要）】
- **基本方針**: 会話の流れが自然なタイミングで、**積極的にオファー（デートの誘い、会う提案）を含める**
- **オファーのタイミング**: 
  - 共通の話題が出た時（「映画見た」→「一緒に見ない？」）
  - 趣味や好みが分かった時（「カフェ好き」→「〇〇のカフェ行かない？」）
  - 会話が盛り上がった時（「楽しいね」→「会わない？」）
  - 相手がポジティブな反応をした時（「いいね！」→「一緒にしない？」）
- **オファーの形式**（「今度」は多用しない）:
  - **選択肢型（ダブルバインド）**: 「カフェ行く？それとも映画見る？」「〇〇しない？それとも〇〇する？」
  - **具体的提案型**: 「〇〇のカフェ行かない？」「〇〇見に行かない？」
  - **シンプル型**: 「会わない？」「一緒に〇〇しない？」「〇〇しない？」
  - **自然な表現**: 「今度」を使わずに、自然な流れでオファーを入れる（「一緒に」「〇〇しない？」など）
- **オファーの頻度**: 会話の流れが自然なタイミングで、**積極的にオファーを含める**。無理に詰め込むのではなく、自然な流れでオファーを入れる。

【効果的な質問パターン】
- **答え＋逆質問（最重要）**: 「鶏の炭火焼き！\n逆にどんなの好き？」
- **選択肢型**: 「AとB、どっちが好き？」
- **具体的型**: 「今日は何か楽しいことあった？」
- **未来型（オファー）**: 「一緒に〇〇しない？」「〇〇行かない？」「会わない？」（**積極的に使用**。「今度」は多用しない）
- **オファー＋選択肢型**: 「カフェ行く？それとも映画見る？」「〇〇しない？それとも〇〇する？」（**積極的に使用**。「今度」は多用しない）

【NGパターン】
- ❌ 3文以上、50文字超
- ❌ 「、」の使用
- ❌ 「。」の使用（一切使用しない）
- ❌ 絵文字・スタンプ
- ❌ 堅苦しい表現（「君は」「あなたは」）
- ❌ 会話の流れを無視

【返信生成チェック】
1. 質問に答えているか（最優先）
2. 会話の流れを踏まえているか
3. Sへのすり替えが実行されているか
4. **オファー（デートの誘い、会う提案）が含まれているか**（会話の流れが自然なタイミングで）
5. 1-2文、50文字以内か
6. 自然な口語表現か

**最重要ルール**:
1. Sへのすり替えを最優先
2. **積極的にオファー（デートの誘い、会う提案）を含める**（会話の流れが自然なタイミングで）
3. 基本は1文のみ（必要時のみ2文）
4. 自然な口語表現
5. 1文30文字、2文50文字以内
6. 質問には必ず答えを先に書く
7. 「。」は一切使用しない（句点なしで返信）
`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history if available
  if (context.conversationHistory) {
    context.conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
  }

  // Analyze the message context
  const messageAnalysis = analyzeMessage(context.herMessage);
  
  // 会話全体のテキストがある場合は、それをコンテキストとして使用
  let conversationContext = '';
  if (context.fullConversationText) {
    conversationContext = `

【会話の全体の流れ（最重要）】
以下の会話全体を参考にして、**会話の流れを必ず理解した上で**返信を生成してください：

${context.fullConversationText}

**重要**: 
- 会話の流れを必ず踏まえる。相手のメッセージに直接反応する。
- 会話の流れを無視して、いきなり別の話題に飛ばない。
- 会話が成り立つように返信を生成する。
- 上記の会話全体を踏まえて、最新のメッセージに対する返信を生成してください。`;
  } else if (context.conversationHistory && context.conversationHistory.length > 0) {
    // 会話履歴がある場合は、それを使用
    const historyText = context.conversationHistory
      .map(msg => `${msg.role === 'user' ? '自分' : '相手'}: ${msg.content}`)
      .join('\n');
    conversationContext = `

【会話の流れ（最重要）】
${historyText}

**重要**: 
- 会話の流れを必ず踏まえる。相手のメッセージに直接反応する。
- 会話の流れを無視して、いきなり別の話題に飛ばない。
- 会話が成り立つように返信を生成する。
- 上記の会話の流れを踏まえて、最新のメッセージに対する返信を生成してください。`;
  }
  
  // Add the current message with context
  const profileInfoSection = context.profileContext ? `\n\n${context.profileContext}\n\n**重要**: 上記の前提情報を踏まえて、より適切で自然な返信を生成してください。名前がある場合は自然に使用し、関係性や趣味・好みを考慮した返信にしてください。ただし、不自然に前提情報を詰め込まないでください。` : '';
  
  const userPrompt = `以下のLINE/DMメッセージに対する返信を生成してください。

【相手からのメッセージ】
"${context.herMessage}"

【メッセージ分析】
- 長さ: ${messageAnalysis.length}
- 感情: ${messageAnalysis.emotion}
- 意図: ${messageAnalysis.intent}
- 返信のしやすさ: ${messageAnalysis.replyEase}${conversationContext}${profileInfoSection}

【返信の要件】
1. **最重要**: **自然で人間らしい会話を心がける**。戦略的すぎず、普通に会話しているような自然な返信を生成してください。
2. **オファーを積極的に含める（最重要）**: 会話の流れが自然なタイミングで、**積極的にオファー（デートの誘い、会う提案）を含める**。以下のような形式でオファーを入れる（「今度」は多用しない）：
   - 「一緒に〇〇しない？」「〇〇行かない？」「会わない？」
   - 「カフェ行く？それとも映画見る？」（選択肢型）
   - 「〇〇のカフェ行かない？」（具体的提案型）
   - 会話の流れが自然なタイミングで、無理に詰め込むのではなく、自然な流れでオファーを入れる
3. **基本は1文のみ**。会話の転換やつなぎが必要な場合のみ2文。絶対に3文以上にしない。
4. **会話の流れを必ず踏まえる**: 相手のメッセージに直接反応する。会話の流れを無視して、いきなり別の話題に飛ばない。会話が成り立つように返信を生成する。
5. **質問への対応（自然に答える）**: 相手から質問された場合、**自然に答える**。以下の流れで返信する：
   - **第1文（必須）**: 質問に自然に答える（「うん」「いや」「〇〇だよ」「〇〇した」など、どんな短い答えでも可。簡潔に1文で）
   - **第2文（必要に応じて）**: 自然な流れで逆質問を返す（例：相手が「どんなの食べたの？」→「鶏の炭火焼き！\n逆にどんなの好き？」）
   - **重要**: 質問に答える時は、**必ず答えを先に書く**。「うん」「いや」など、どんな短い答えでもいいから、絶対に答える
   - 質問に対して質問だけを返すのは絶対NG。まず答えを書いてから逆質問を入れる
6. **自然な会話の流れ**: 相手のメッセージからキーワードを自然に拾い、会話の流れを保つ。無理に話題を変えたり、戦略的すぎる返信は避ける。
7. **2文にする条件**: 会話の転換（話題を変える）、つなぎ（前のメッセージへの反応＋新しい質問）、共感＋質問の組み合わせの場合のみ2文
8. **自然な口語表現**: カジュアルで自然な口語表現を使用（助詞を省略できる場合は省略、「〜はある？」より「〜ある？」「〜してる？」など）
   - 例：「映画見た？」「カフェ行った？」「どんな感じ？」など、自然な口語表現
   - 例：「君は」「あなたは」などの堅苦しい表現は避ける
9. **重要**: 「、」は一切使用しない
10. **重要**: 「。」は一切使用しない（句点なしで返信）
11. **オファーを積極的に含める（最重要）**: 会話の流れが自然なタイミングで、**積極的にオファー（デートの誘い、会う提案）を含める**。以下のような形式でオファーを入れる（「今度」は多用しない）：
    - 「一緒に〇〇しない？」「〇〇行かない？」「会わない？」
    - 「カフェ行く？それとも映画見る？」（選択肢型・ダブルバインド）
    - 「〇〇のカフェ行かない？」（具体的提案型）
    - 会話の流れが自然なタイミングで、無理に詰め込むのではなく、自然な流れでオファーを入れる
    - 共通の話題が出た時、趣味や好みが分かった時、会話が盛り上がった時、相手がポジティブな反応をした時など、適切なタイミングでオファーを含める
11. 各文のあとに必ず改行を入れ、スマホで読みやすいように行間を作る
12. 相手が返信しやすい内容
13. 会話が続くような要素を含む
14. 絵文字やスタンプは一切使用しない（テキストのみ）
15. **人間らしい自然な表現**: 堅苦しくない、カジュアルな表現。戦略的すぎず、普通に会話しているような自然さを重視
16. **長さの制限**: 1文は最大30文字程度。2文でも合計50文字以内を目安とする
${context.fullConversationText || context.conversationHistory ? '16. 会話の流れを踏まえた自然な返信（会話の流れを無視しない）' : ''}

【出力形式】
以下の形式で必ず出力してください：

返信:
[ここに実際の返信テキストを記述]

解説:
[ここに返信の解説を記述。以下の観点を**必ず全て含めて**、**完全に**説明してください：
- なぜこの返信が効果的なのか
- どのようなコミュニケーション原則に基づいているか（ダブルバインド、臨場感、フレームコントロール、Sへのすり替えなど）
- 相手のメッセージのどの部分に反応しているか（キーワード、感情、意図）
- どのような戦略やテクニックを使用しているか（会話の段階に応じた戦略）
- 会話を続けるためにどのような工夫をしているか（質問の投げ方、話題の展開）
- 会話の段階（初期/関係構築/デート誘い）に応じた適切な返信か
- **重要**: 解説は必ず完全に終わらせてください。途中で切れないように、5-7文程度で詳しく説明してください
- **重要**: 教材名や特定の手法名は一切言及しないでください
- **重要**: 解説が途中で切れないように、必ず最後まで書き切ってください]`;
  
  messages.push({
    role: 'user',
    content: userPrompt,
  });

  try {
    // メインの返信生成（OpenAI GPT-4o-mini）
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // OpenAI: GPT-4o-mini（入力$0.15/1M、出力$0.60/1M、高品質でコスト効率の良いモデル）
      messages,
      temperature: 0.85, // 自然な会話のために少し上げる（0.7→0.85）
      max_tokens: 500, // 返信（1-2文）と解説を含む（解説が切れないように増加：250→500）
    });

    const content = completion.choices[0]?.message?.content || '返信を生成できませんでした。';
    
    // トークン使用量をログに記録
    const usage = completion.usage;
    if (usage) {
      console.log('メイン返信生成 - トークン使用量:', {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      });
    }
      
    // 返信と解説を分離
    const responseMatch = content.match(/返信[：:]\s*([\s\S]+?)(?:\n\n解説|$)/i);
    const explanationMatch = content.match(/解説[：:]\s*([\s\S]+)/i);
    
    let response = responseMatch ? responseMatch[1].trim() : content.trim();
    const explanation = explanationMatch ? explanationMatch[1].trim() : '解説を生成できませんでした。';
    
    // 「。」を削除（一切使用しない）
    response = response.replace(/。/g, '');
    // 「、」を削除（一切使用しない）
    response = response.replace(/、/g, '');
    // 連続する改行を1つに統一
    response = response.replace(/\n{3,}/g, '\n\n');
    
    // 返信の長さをチェック（基本は1文、必要時のみ2文）
    const sentences = response.split(/\n/).filter((s: string) => s.trim().length > 0);
    
    // 3文以上の場合、最初の1文のみを使用（基本は1文）
    if (sentences.length > 2) {
      response = sentences[0].trim();
    }
    // 2文の場合、会話の転換やつなぎが必要かチェック
    else if (sentences.length === 2) {
      // 2文の必要性を確認（会話の転換、つなぎ、共感＋質問の組み合わせ）
      const firstSentence = sentences[0].trim();
      const secondSentence = sentences[1].trim();
      
      // 2文が不要な場合（単純な質問や返答のみ）、1文のみを使用
      // ただし、会話の転換やつなぎが必要な場合は2文を維持
      const needsTwoSentences = 
        firstSentence.includes('？') && secondSentence.includes('？') || // 両方質問
        (firstSentence.length < 10 && secondSentence.length < 10) || // 両方短い
        firstSentence.match(/^(わかる|それ|いいね|すごい|楽しそう)/) && secondSentence.includes('？'); // 共感＋質問
      
      if (!needsTwoSentences) {
        // 1文のみを使用（より重要な文を選択）
        response = secondSentence.includes('？') ? secondSentence.trim() : firstSentence.trim();
      } else {
        // 2文を維持
        response = sentences.join('\n');
      }
    }
    
    // 文字数チェック（50文字を超える場合、1文のみに短縮）
    if (response.replace(/\n/g, '').length > 50) {
      // 最初の文のみを使用
      const firstSentence = sentences[0] || response.split(/\n/)[0];
      response = firstSentence.trim();
    }
    
    // 代替返信候補を生成（2つ追加、それぞれに解説付き）- 1回のAPI呼び出しで2つ同時に生成
    let alternatives: AlternativeResponse[] = [];
    let alternativeCompletion: any = null; // トークン使用量を計算するためにスコープ外で定義
    try {
      // 2つの代替返信候補を1回のAPI呼び出しで同時に生成（コスト削減）
      const alternativePrompt = `${userPrompt}

上記と同じメッセージに対して、異なるアプローチで2つの代替返信を生成してください。
1つ目は「よりカジュアルで親しみやすいアプローチ」、2つ目は「より具体的で質問重視のアプローチ」を使用してください。
メインの返信とは異なる戦略を使用してください。

【出力形式】
以下の形式で必ず出力してください：

候補1:
返信: [返信テキスト]
解説: [5-7文程度の詳しい解説。以下の観点を必ず全て含めて完全に説明してください：
- なぜこの返信が効果的なのか
- どのようなコミュニケーション原則に基づいているか
- 相手のメッセージのどの部分に反応しているか
- どのような戦略やテクニックを使用しているか
- 会話を続けるためにどのような工夫をしているか
- 会話の段階に応じた適切な返信か
- メインの返信とどう違うのか、この返信の特徴は何か
**重要**: 解説は必ず完全に終わらせてください。途中で切れないように、最後まで書き切ってください]

候補2:
返信: [返信テキスト]
解説: [5-7文程度の詳しい解説。以下の観点を必ず全て含めて完全に説明してください：
- なぜこの返信が効果的なのか
- どのようなコミュニケーション原則に基づいているか
- 相手のメッセージのどの部分に反応しているか
- どのような戦略やテクニックを使用しているか
- 会話を続けるためにどのような工夫をしているか
- 会話の段階に応じた適切な返信か
- メインの返信とどう違うのか、この返信の特徴は何か
**重要**: 解説は必ず完全に終わらせてください。途中で切れないように、最後まで書き切ってください]

**重要**: 
- 各返信は1-2文、50文字以内
- 解説は5-7文程度で詳しく、必ず完全に終わらせる
- 教材名や特定の手法名は一切言及しない
- 解説が途中で切れないように、必ず最後まで書き切ってください`;

      // 代替返信候補の生成
      alternativeCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // OpenAI: GPT-4o-mini（入力$0.15/1M、出力$0.60/1M、高品質でコスト効率の良いモデル）
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: alternativePrompt }
        ],
        temperature: 0.9, // より多様性と自然さを持たせる（0.8→0.9）
        max_tokens: 800, // 2つの候補と解説を含む（解説が切れないように増加：400→800）
      });

      const alternativeContent = alternativeCompletion.choices[0]?.message?.content || '';
      
      // トークン使用量をログに記録
      const altUsage = alternativeCompletion.usage;
      if (altUsage) {
        console.log('代替返信生成 - トークン使用量:', {
          prompt_tokens: altUsage.prompt_tokens,
          completion_tokens: altUsage.completion_tokens,
          total_tokens: altUsage.total_tokens,
        });
      }
      
      // デバッグ: 生成されたコンテンツの最初の500文字をログに記録
      console.log('代替返信生成 - 生成コンテンツ（最初の500文字）:', alternativeContent.substring(0, 500));
      
      // 2つの候補を抽出（より柔軟な形式に対応）
      // 形式: **候補1:**\n**返信:** ... \n**解説:** ... または 候補1:\n返信: ... \n解説: ...
      // 最初の「---」以降を抽出（最初の部分は無視）
      const contentAfterSeparator = alternativeContent.split(/---|ーーー/).slice(1).join('---') || alternativeContent;
      
      // 候補1の抽出（**候補1:** または 候補1: の後に **返信:** または 返信: が来る形式）
      const candidate1Section = contentAfterSeparator.match(/(?:候補1[：:]|\*\*候補1[：:]\*\*)[\s\S]+?(?=候補2|$)/i);
      if (candidate1Section) {
        const candidate1ResponseMatch = candidate1Section[0].match(/(?:返信[：:]|\*\*返信[：:]\*\*)\s*([\s\S]+?)(?:\n(?:解説[：:]|\*\*解説[：:]\*\*)|$)/i);
        const candidate1ExplanationMatch = candidate1Section[0].match(/(?:解説[：:]|\*\*解説[：:]\*\*)\s*([\s\S]+)/i);
        
        if (candidate1ResponseMatch) {
          let altResponse1 = candidate1ResponseMatch[1].trim();
          const altExplanation1 = candidate1ExplanationMatch ? candidate1ExplanationMatch[1].trim() : '解説を生成できませんでした。';
          
          // 「。」を削除（一切使用しない）
          altResponse1 = altResponse1.replace(/。/g, '');
          // 「、」を削除（一切使用しない）
          altResponse1 = altResponse1.replace(/、/g, '');
          altResponse1 = altResponse1.replace(/\n{3,}/g, '\n\n');
          
          const altSentences1 = altResponse1.split(/\n/).filter((s: string) => s.trim().length > 0);
          if (altSentences1.length > 2) {
            altResponse1 = altSentences1.slice(0, 2).join('\n');
          }
          if (altResponse1.replace(/\n/g, '').length > 50) {
            altResponse1 = (altSentences1[0] || altResponse1.split(/\n/)[0]).trim();
          }
          
          alternatives.push({
            response: altResponse1.trim(),
            explanation: altExplanation1,
          });
          
          console.log('候補1マッチ: 成功');
        } else {
          console.log('候補1の返信部分が見つかりませんでした');
        }
      } else {
        console.log('候補1セクションが見つかりませんでした');
      }
      
      // 候補2の抽出
      const candidate2Section = contentAfterSeparator.match(/(?:候補2[：:]|\*\*候補2[：:]\*\*)[\s\S]+?$/i);
      if (candidate2Section) {
        const candidate2ResponseMatch = candidate2Section[0].match(/(?:返信[：:]|\*\*返信[：:]\*\*)\s*([\s\S]+?)(?:\n(?:解説[：:]|\*\*解説[：:]\*\*)|$)/i);
        const candidate2ExplanationMatch = candidate2Section[0].match(/(?:解説[：:]|\*\*解説[：:]\*\*)\s*([\s\S]+)/i);
        
        if (candidate2ResponseMatch) {
          let altResponse2 = candidate2ResponseMatch[1].trim();
          const altExplanation2 = candidate2ExplanationMatch ? candidate2ExplanationMatch[1].trim() : '解説を生成できませんでした。';
          
          // 「。」を削除（一切使用しない）
          altResponse2 = altResponse2.replace(/。/g, '');
          // 「、」を削除（一切使用しない）
          altResponse2 = altResponse2.replace(/、/g, '');
          altResponse2 = altResponse2.replace(/\n{3,}/g, '\n\n');
          
          const altSentences2 = altResponse2.split(/\n/).filter((s: string) => s.trim().length > 0);
          if (altSentences2.length > 2) {
            altResponse2 = altSentences2.slice(0, 2).join('\n');
          }
          if (altResponse2.replace(/\n/g, '').length > 50) {
            altResponse2 = (altSentences2[0] || altResponse2.split(/\n/)[0]).trim();
          }
          
          alternatives.push({
            response: altResponse2.trim(),
            explanation: altExplanation2,
          });
          
          console.log('候補2マッチ: 成功');
        } else {
          console.log('候補2の返信部分が見つかりませんでした');
        }
      } else {
        console.log('候補2セクションが見つかりませんでした');
      }
      
      // デバッグ: 抽出された候補数をログに記録
      console.log('抽出された代替返信候補数:', alternatives.length);
    } catch (altError) {
      console.error('代替返信の生成に失敗しました:', altError);
      // 代替返信の生成に失敗してもメインの返信は返す
      // エラーの詳細をログに記録（デバッグ用）
      if (altError instanceof Error) {
        console.error('代替返信生成エラー詳細:', {
          message: altError.message,
          stack: altError.stack,
        });
      }
    }
    
    // 合計トークン使用量を計算
    let totalTokens = 0;
    if (usage) {
      totalTokens += usage.total_tokens || 0;
    }
    if (alternativeCompletion?.usage) {
      totalTokens += alternativeCompletion.usage.total_tokens || 0;
    }
    
    if (totalTokens > 0) {
      console.log('合計トークン使用量:', totalTokens);
    }
    
    return {
      response: response.trim(),
      explanation,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  } catch (error: any) {
    console.error('AI API Error:', error);
    
    // OpenAI APIエラーハンドリング
    const errorMessage = error?.message || '';
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      throw new Error('OpenAI APIキーが無効です。APIキーを確認してください。');
    }
    if (error?.status === 429) {
      throw new Error('OpenAI APIのレートリミットに達しました。しばらく待ってから再度お試しください。');
    }
    throw new Error('AI返信の生成に失敗しました。APIキーを確認してください。');
  }
}

