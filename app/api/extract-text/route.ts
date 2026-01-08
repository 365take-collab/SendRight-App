import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, checkSubscription, canUseService, incrementUsageCount, getUsageInfo } from '@/lib/auth';
import { checkRateLimit, verifyRequestSignature, verifyRequestIntegrity, checkIPWhitelist, detectAnomalousPattern, RATE_LIMIT_MAX_REQUESTS } from '@/lib/security';
import OpenAI from 'openai';
import { z } from 'zod';

// 画像抽出用のOpenAI API（Vision APIが必要なため）
// 返信生成はGroq API（無料）を使用
// APIキーが設定されている場合のみ初期化
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const extractSchema = z.object({
  image: z.string().min(1, '画像データが必要です'),
});

export async function POST(request: NextRequest) {
  try {
    // 開発環境では認証をスキップ
    const isDevMode = process.env.DEV_MODE === 'true' ||
                      request.nextUrl.hostname === 'localhost' ||
                      request.nextUrl.hostname.includes('ngrok');

    // 本番環境でのみUtageからのアクセスのみを許可
    if (!isDevMode) {
      const referer = request.headers.get('referer') || request.headers.get('referrer');
      const origin = request.headers.get('origin');
      const allowedUtageDomains = [
        'utage-system.com',
        'utage.jp',
        'utage.co.jp',
      ];

      const isFromUtage = (referer && allowedUtageDomains.some(domain => referer.includes(domain))) ||
                          (origin && allowedUtageDomains.some(domain => origin.includes(domain)));

      // Utage以外からのアクセスを拒否（Utageからのアクセスのみ許可）
      if (!isFromUtage) {
        console.warn('Utage以外からのAPIアクセスを拒否:', { referer, origin, hostname: request.nextUrl.hostname });
        return NextResponse.json(
          { error: 'このAPIへのアクセスはUtageからのみ許可されています', extractedText: '', message: '' },
          { status: 403 }
        );
      }
    }

    // IPアドレスのホワイトリストをチェック（開発環境ではスキップ）
    if (!isDevMode) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       request.ip || 
                       'unknown';
      
      if (!checkIPWhitelist(clientIP)) {
        console.warn('IPホワイトリストに含まれていないIPからのアクセスを拒否:', { ip: clientIP });
        return NextResponse.json(
          { error: 'このIPアドレスからのアクセスは許可されていません', extractedText: '', message: '' },
          { status: 403 }
        );
      }
    }

    // 開発環境では認証をスキップ（isDevModeは上で定義済み）
    if (!isDevMode) {
      // Check authentication
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json(
          { error: '無効なトークンです' },
          { status: 401 }
        );
      }

      const user = await findUserById(decoded.userId);
      if (!user) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      // Utageからのログインで作成されたユーザーのみ許可
      if (!user.isUtageUser) {
        console.warn('Utage以外からのログインで作成されたユーザーのアクセスを拒否:', { userId: user.id, email: user.email });
        return NextResponse.json(
          { error: 'このアプリへのアクセスはUtageからのログインのみ許可されています', extractedText: '', message: '' },
          { status: 403 }
        );
      }

      // Check subscription
      const hasActiveSubscription = checkSubscription(user);
      if (!hasActiveSubscription) {
        return NextResponse.json(
          { error: 'この機能を使用するには有効なサブスクリプションが必要です' },
          { status: 403 }
        );
      }

      // Check daily usage limit (1日50回まで - Groq API制限を考慮)
      // 画像抽出も使用回数にカウント
      const usageCheck = canUseService(user.id);
      if (!usageCheck.canUse) {
        const usageInfo = getUsageInfo(user.id);
        return NextResponse.json(
          { 
            error: `1日の使用回数制限（${usageInfo.limit}回）に達しました。明日またお試しください。`,
            usageInfo,
            extractedText: '',
            message: ''
          },
          { status: 429 }
        );
      }

      // レート制限をチェック（1分間に3回まで - Groq API制限を考慮）
      const rateLimit = checkRateLimit(user.id);
      if (!rateLimit.allowed) {
        const resetTime = new Date(rateLimit.resetAt).toISOString();
        return NextResponse.json(
          { 
            error: `レート制限に達しました。${resetTime}までお待ちください。`,
            rateLimit: {
              remaining: rateLimit.remaining,
              resetAt: resetTime,
            },
            extractedText: '',
            message: ''
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            }
          }
        );
      }

      // 異常なアクセスパターンを検出
      if (detectAnomalousPattern(user.id, request.nextUrl.pathname, Date.now())) {
        console.warn('異常なアクセスパターンを検出:', { userId: user.id, path: request.nextUrl.pathname });
        return NextResponse.json(
          { error: '異常なアクセスパターンが検出されました', extractedText: '', message: '' },
          { status: 403 }
        );
      }
    }

    // リクエストボディを取得（署名検証のため、文字列として保持）
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // リクエストの署名を検証（オプション、Utage側で署名を送信する場合）
    const signature = request.headers.get('x-utage-signature');
    const timestamp = request.headers.get('x-utage-timestamp');
    const contentHash = request.headers.get('x-content-hash');

    if (signature && timestamp) {
      if (!verifyRequestSignature(rawBody, signature, timestamp)) {
        console.warn('リクエストの署名検証に失敗:', { signature, timestamp });
        return NextResponse.json(
          { error: 'リクエストの署名が無効です', extractedText: '', message: '' },
          { status: 403 }
        );
      }
    }

    // リクエストの整合性をチェック（オプション）
    if (contentHash) {
      if (!verifyRequestIntegrity(rawBody, contentHash)) {
        console.warn('リクエストの整合性チェックに失敗:', { contentHash });
        return NextResponse.json(
          { error: 'リクエストの整合性が確認できませんでした', extractedText: '', message: '' },
          { status: 403 }
        );
      }
    }
    // Validate request body
    const { image } = extractSchema.parse(body);

    // 画像データの検証
    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { 
          error: '無効な画像データです。画像ファイルを選択してください。',
          extractedText: '',
          message: ''
        },
        { status: 400 }
      );
    }

    console.log('画像データ受信:', {
      hasImage: !!image,
      imageType: image.substring(0, 50),
      imageLength: image.length
    });

    // OpenAI APIキーのチェック（画像抽出機能のみ使用）
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { 
          error: '画像抽出機能を使用するには、OPENAI_API_KEYの設定が必要です。\n\n画像抽出はOpenAI Vision APIを使用します（返信生成はGroq API（無料）を使用します）。\n\n画像抽出機能を使わない場合は、テキスト入力で返信生成が可能です。',
          extractedText: '',
          message: ''
        },
        { status: 400 }
      );
    }

    // Extract text from image using OpenAI Vision API
    // gpt-4oはより高精度な画像認識が可能
    // 注意: 画像抽出のみOpenAI APIを使用（返信生成はGroq API（無料）を使用）
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `あなたは画像からテキストを読み取る専門家です。この画像はLINEやDM（マッチングアプリ含む）の会話画面のスクリーンショットです。

【最優先タスク】
画像内に表示されている**実際のメッセージのみ**を読み取り、会話の全体と相手（女性）からの最新のメッセージを抽出してください。

【重要な除外ルール】
以下のUI要素や説明欄は**一切抽出しないでください**：
- ❌ アプリの説明欄、説明文、ヘルプテキスト、ガイド文
- ❌ ボタンのラベル（「送信」「削除」「返信」など）
- ❌ 入力欄のプレースホルダー（「メッセージを入力」など）
- ❌ アプリのメニュー項目、設定項目
- ❌ 通知、アラート、エラーメッセージ
- ❌ タイムスタンプ、日付表示
- ❌ ユーザー名、プロフィール名（メッセージ内容以外）
- ❌ その他のUI要素やシステムメッセージ

**抽出するのは、実際に送信されたメッセージの内容のみです。**
**注意**: 「説明」という単語だけのメッセージは、実際のメッセージ内容の可能性があるため、抽出してください。

【実行手順】

1. 画像全体をスキャン
   - 画像のすべての領域を確認
   - **実際のメッセージバブルやメッセージテキストのみ**を識別
   - UI要素や説明欄は無視する
   - メッセージアプリの画面であることを確認

2. 会話の構造を理解
   - メッセージの配置を確認（通常は上から下、または下から上）
   - 送信者（自分）と受信者（相手・女性）のメッセージを区別
   - 時系列を把握（最新のメッセージは通常画面の下の方）

3. 会話全体を抽出
   - **実際に送信されたメッセージのみ**を時系列順に抽出
   - 送信者（自分）と受信者（相手・女性）を区別して記録
   - 各メッセージの全文を正確に抽出（絵文字、スタンプ、改行も含む）
   - UI要素や説明欄は一切含めない

4. 最新メッセージを特定
   - 画面内で最も新しい（最後に送信された）相手からのメッセージを見つける
   - そのメッセージの全文を確認
   - 説明欄やUI要素は除外する

【必須出力形式】
以下の形式で必ず出力してください。他の形式は使用しないでください：

会話履歴:
[送信者名]: [メッセージ内容]
[送信者名]: [メッセージ内容]
...

最新のメッセージ: [ここに相手からの最新メッセージの全文をそのまま貼り付け]

【重要なルール】
1. **実際のメッセージのみ**を抽出してください（UI要素や説明欄は除外）
2. 画像が暗い、小さい、ぼやけている場合でも、可能な限りメッセージを読み取ってください
3. 推測や要約は一切せず、実際のメッセージ内容をそのまま抽出してください
4. 部分的な抽出は避け、メッセージの全文を正確に抽出してください
5. 絵文字、スタンプ、改行、記号も正確に含めてください
6. メッセージが見つからない場合のみ、「メッセージが見つかりませんでした」と出力してください
7. 「申し訳ありません」や「抽出できません」などの言い訳は一切不要です。必ず抽出を試みてください
8. **説明欄、ボタン、プレースホルダー、UI要素は一切抽出しないでください**

【出力例】
画像に「おはよう！今日は何してる？😊」というメッセージが表示されている場合：
最新のメッセージ: おはよう！今日は何してる？😊

画像に「ありがとう💕」というメッセージが表示されている場合：
最新のメッセージ: ありがとう💕

必ず上記の形式で出力してください。`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'high', // 高詳細度で画像を分析
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.0, // 最も確定的な出力
    });

    const extractedText = response.choices[0]?.message?.content || '';
    console.log('OpenAI抽出結果:', extractedText);

    // エラーメッセージのチェック（より柔軟に）
    const errorKeywords = [
      '申し訳ありません',
      '抽出することはできません',
      'メッセージが見つかりませんでした',
      '抽出できません',
      '読み取れません',
      '認識できません',
      '不明です',
      'わかりません'
    ];
    
    const hasError = errorKeywords.some(keyword => extractedText.includes(keyword));
    
    if (hasError && extractedText.length < 100) {
      // エラーメッセージが短い場合は、実際にエラーと判断
      console.error('メッセージ抽出失敗:', extractedText);
      return NextResponse.json(
        { 
          error: '画像からメッセージを抽出できませんでした。\n\n以下の点を確認してください：\n1. 画像がLINEやDMの会話画面であること\n2. 画像が鮮明で、テキストが読み取れること\n3. メッセージが表示されていること\n4. 画像が正しくアップロードされていること',
          extractedText: extractedText,
          message: ''
        },
        { status: 400 }
      );
    }

    // UI要素や説明欄を除外するフィルター関数
    const isUIElement = (text: string): boolean => {
      // 実際のメッセージとして扱うべき短いテキスト（1-3文字程度）は除外しない
      if (text.trim().length <= 3) {
        return false;
      }
      
      const uiKeywords = [
        '説明欄', '説明文', 'ガイド', 'ヘルプ', '使い方',
        '送信', '削除', '返信', 'コピー', '共有',
        'メッセージを入力', '入力', 'プレースホルダー',
        '設定', 'メニュー', '通知', 'アラート',
        'タイムスタンプ', '日付', '時刻',
        'ユーザー名', 'プロフィール', 'アカウント',
        'この機能を使用するには', '会員登録', 'サブスクリプション',
        'クリック', 'タップ', 'スワイプ',
        'エラー', '警告', '注意',
      ];
      
      // 複合語や長いUI要素テキストのみを検出
      // 「説明」単独は実際のメッセージの可能性があるため除外しない
      const lowerText = text.toLowerCase();
      return uiKeywords.some(keyword => {
        // キーワードがテキスト全体と一致する、または複合語として含まれる場合のみ
        if (keyword === '説明欄' || keyword === '説明文') {
          return lowerText.includes(keyword.toLowerCase());
        }
        // その他のキーワードは、テキストが短すぎる場合は除外しない
        if (text.trim().length <= 5 && keyword.length > 2) {
          return false;
        }
        return lowerText.includes(keyword.toLowerCase());
      });
    };
    
    // メッセージ抽出のロジックを改善
    let message = '';
    
    // パターン1: 「最新のメッセージ:」形式（最も優先）
    const latestMessageMatch = extractedText.match(/最新のメッセージ[：:]\s*([\s\S]+?)(?:\n\n|\n【|$)/i) ||
                               extractedText.match(/最新のメッセージ[：:]\s*([\s\S]+)/i);
    
    if (latestMessageMatch) {
      message = latestMessageMatch[1].trim();
      
      // UI要素や説明欄を除外
      if (isUIElement(message)) {
        message = '';
      }
    } else {
      // パターン2: 「相手からのメッセージ:」形式
      const herMessageMatch = extractedText.match(/相手からのメッセージ[：:]\s*([\s\S]+?)(?:\n\n|\n【|$)/i) ||
                             extractedText.match(/相手からのメッセージ[：:]\s*([\s\S]+)/i);
      
      if (herMessageMatch) {
        message = herMessageMatch[1].trim();
        // UI要素や説明欄を除外
        if (isUIElement(message)) {
          message = '';
        }
      } else {
        // パターン3: 「メッセージ:」形式
        const messageMatch = extractedText.match(/メッセージ[：:]\s*([\s\S]+?)(?:\n\n|\n【|$)/i) ||
                            extractedText.match(/メッセージ[：:]\s*([\s\S]+)/i);
        
        if (messageMatch) {
          message = messageMatch[1].trim();
          // UI要素や説明欄を除外
          if (isUIElement(message)) {
            message = '';
          }
        } else {
          // パターン4: 引用符で囲まれたメッセージ（複数行対応）
          const quotedMatch = extractedText.match(/["'「]([\s\S]+?)["'」]/);
          if (quotedMatch) {
            message = quotedMatch[1].trim();
            // UI要素や説明欄を除外
            if (isUIElement(message)) {
              message = '';
            }
          } else {
            // パターン5: 最初の意味のある段落を抽出
            const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
            // 「最新のメッセージ:」などのラベル行をスキップ
            const contentLines = lines.filter(line => 
              !line.match(/^(最新のメッセージ|相手からのメッセージ|メッセージ|【|注意事項|ステップ|必須)/i) &&
              line.trim().length >= 3 &&
              !line.match(/^[：:]/) // コロンで始まる行もスキップ
            );
            
            if (contentLines.length > 0) {
              // 最初の意味のある行から、空行まで、または最後まで
              let messageLines = [];
              for (let i = 0; i < contentLines.length; i++) {
                if (contentLines[i].trim().length === 0) break;
                // UI要素や説明欄を除外
                if (!isUIElement(contentLines[i])) {
                  messageLines.push(contentLines[i]);
                }
              }
              message = messageLines.join('\n').trim();
              
              // 最終チェック: UI要素でないか確認
              if (isUIElement(message)) {
                message = '';
              }
            } else {
              // 最後の手段: 抽出されたテキスト全体を使用（ただし、明らかにエラーメッセージでない場合）
              const cleanText = extractedText.trim();
              if (cleanText.length > 0 && !cleanText.match(/^(申し訳|抽出|メッセージが見つかりません)/)) {
                message = cleanText;
              }
            }
          }
        }
      }
    }
    
    // メッセージが空または短すぎる場合の処理
    if (!message || message.length < 2) {
      // エラーメッセージでない場合は、抽出されたテキスト全体を使用
      const cleanText = extractedText.trim();
      if (cleanText.length > 0 && 
          !cleanText.match(/^(申し訳|抽出|メッセージが見つかりません|最新のメッセージ|相手からのメッセージ)/) &&
          !isUIElement(cleanText)) {
        message = cleanText;
      }
    }
    
    // 最終チェック: 抽出されたメッセージがUI要素でないか確認
    if (message && isUIElement(message)) {
      console.log('UI要素として検出されたため、メッセージを除外:', message);
      message = '';
    }
    
    // 最終チェック: メッセージが有効かどうか
    if (!message || message.length < 1) {
      return NextResponse.json(
        { 
          error: '画像からメッセージを抽出できませんでした。画像を確認してください。',
          extractedText: extractedText,
          message: ''
        },
        { status: 400 }
      );
    }

    // 会話履歴を抽出
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // 「会話履歴:」セクションを探す
    const historyMatch = extractedText.match(/会話履歴[：:]\s*([\s\S]+?)(?:\n\n最新のメッセージ|$)/i);
    if (historyMatch) {
      const historyText = historyMatch[1].trim();
      const lines = historyText.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        // 「[送信者名]: [メッセージ]」形式をパース
        const messageMatch = line.match(/^(.+?)[：:]\s*(.+)$/);
        if (messageMatch) {
          const sender = messageMatch[1].trim();
          const content = messageMatch[2].trim();
          
          // 送信者名から自分か相手かを判断（簡易的な判定）
          if (sender.includes('自分') || sender.includes('私') || sender.includes('user') || sender.includes('User')) {
            conversationHistory.push({ role: 'user', content });
          } else {
            conversationHistory.push({ role: 'assistant', content });
          }
        }
      }
    }
    
    // 会話履歴が空の場合、抽出されたテキストから推測を試みる
    if (conversationHistory.length === 0 && extractedText.length > 50) {
      // 簡易的な会話履歴抽出（「会話履歴:」セクションがない場合）
      const lines = extractedText.split('\n').filter(line => line.trim().length > 5);
      for (const line of lines) {
        if (line.includes(':') || line.includes('：')) {
          const parts = line.split(/[：:]/);
          if (parts.length >= 2) {
            const sender = parts[0].trim();
            const content = parts.slice(1).join(':').trim();
            if (content.length > 0) {
              if (sender.includes('自分') || sender.includes('私') || sender.includes('user')) {
                conversationHistory.push({ role: 'user', content });
              } else if (!sender.includes('最新') && !sender.includes('メッセージ')) {
                conversationHistory.push({ role: 'assistant', content });
              }
            }
          }
        }
      }
    }

    // 使用回数を増やす（開発環境ではスキップ）
    let usageInfo = null;
    if (!isDevMode) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
          const user = await findUserById(decoded.userId);
          if (user) {
            incrementUsageCount(user.id);
            usageInfo = getUsageInfo(user.id);
          }
        }
      }
    }

    return NextResponse.json({
      extractedText: extractedText, // 会話全体のテキスト
      message: message, // 最新のメッセージ
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      usageInfo, // 使用回数情報を返す
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: error.errors[0].message,
          extractedText: '',
          message: ''
        },
        { status: 400 }
      );
    }
    console.error('Extract text error:', error);
    
    // OpenAI APIキーが設定されていない場合のエラー
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { 
          error: '画像抽出機能を使用するには、OPENAI_API_KEYの設定が必要です。\n\n画像抽出はOpenAI Vision APIを使用します（返信生成はGroq API（無料）を使用します）。\n\n画像抽出機能を使わない場合は、テキスト入力で返信生成が可能です。',
          extractedText: '',
          message: ''
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'テキストの抽出に失敗しました',
        extractedText: '',
        message: ''
      },
      { status: 500 }
    );
  }
}

