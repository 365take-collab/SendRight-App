import { createSuccessPattern, listSuccessPatternsForUser, type DbResponseHistory, type DbSuccessPattern } from '@/lib/supabase';

export interface SuccessPatternKnowledge {
  reason?: string | null;
  tags?: string[] | null;
  goalAchieved?: boolean | null;
  [key: string]: any;
}

export interface SuccessPattern {
  taskText: string;
  response: string;
  knowledge: SuccessPatternKnowledge;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForSimilarity(text: string): string[] {
  const t = normalizeText(text);
  if (!t) return [];

  // まずは空白区切り。日本語のように空白が少ない場合は2-gramにフォールバック。
  const words = t.split(' ').filter(Boolean);
  if (words.length <= 1 && t.length >= 4) {
    const chars = Array.from(t);
    const grams: string[] = [];
    for (let i = 0; i < chars.length - 1; i++) {
      grams.push(`${chars[i]}${chars[i + 1]}`);
    }
    return grams;
  }
  return words;
}

function jaccard(aTokens: string[], bTokens: string[]): number {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 || b.size === 0) return 0;

  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter++;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function toSuccessPattern(p: DbSuccessPattern): SuccessPattern {
  return {
    taskText: p.task_text,
    response: p.response,
    knowledge: (p.knowledge || {}) as SuccessPatternKnowledge,
  };
}

/**
 * 類似の成功パターン（過去の高評価）を返す。
 * 現状は、ユーザーの直近パターンから簡易類似度で上位を返す（高価な埋め込み等は使わない）。
 */
export async function findSimilarSuccessPatterns(input: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<SuccessPattern[]> {
  const limit = Math.max(1, Math.min(20, input.limit ?? 3));

  const candidates = await listSuccessPatternsForUser({ userId: input.userId, limit: 50 });
  if (candidates.length === 0) return [];

  const qTokens = tokenizeForSimilarity(input.query);
  const ranked = candidates
    .map((p) => {
      const s = jaccard(qTokens, tokenizeForSimilarity(`${p.task_text}\n${p.her_message}`));
      return { p, s };
    })
    .sort((a, b) => b.s - a.s);

  return ranked.slice(0, limit).map(r => toSuccessPattern(r.p));
}

/**
 * 「良かった」評価をもとに成功パターンをナレッジ化して保存する。
 * Best-effort: 保存に失敗しても呼び出し元で握りつぶせる前提。
 */
export async function ingestSuccessPatternFromFeedback(input: {
  userId: string;
  history: DbResponseHistory;
  feedback: {
    rating: 'good' | 'bad';
    reason?: string;
    tags?: string[];
    goalAchieved?: boolean;
  };
}): Promise<void> {
  if (input.feedback.rating !== 'good') return;

  const history = input.history;
  const taskText = [
    history.full_conversation_text ? `会話: ${history.full_conversation_text}` : null,
    history.profile_context ? `前提: ${history.profile_context}` : null,
    history.goal ? `ゴール: ${history.goal}` : null,
    history.tone ? `トーン: ${history.tone}` : null,
  ].filter(Boolean).join('\n') || history.her_message;

  const knowledge: SuccessPatternKnowledge = {
    reason: input.feedback.reason ?? null,
    tags: input.feedback.tags ?? null,
    goalAchieved: typeof input.feedback.goalAchieved === 'boolean' ? input.feedback.goalAchieved : null,
  };

  await createSuccessPattern({
    userId: input.userId,
    responseId: history.id,
    taskText,
    herMessage: history.her_message,
    response: history.response,
    knowledge,
  });
}
