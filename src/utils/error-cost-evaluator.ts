export type ErrorCostLevel = 'low' | 'medium' | 'high' | 'critical';

export type ErrorControlDecision = 'prompt_sufficient' | 'rules_recommended' | 'both_required';

export type TaskFrequency = 'low' | 'medium' | 'high';

export interface ErrorCostEvaluatorContext {
  /** 個人情報(PII)を扱うか */
  handlesPII?: boolean;
  /** シークレット/APIキー/トークン等を扱うか */
  touchesSecrets?: boolean;
  /** 課金/決済/返金など金銭に関わるか */
  touchesPayments?: boolean;
  /** 本番データに触れる可能性があるか */
  touchesProductionData?: boolean;
  /** ユーザー向けの動線/体験に直接影響するか */
  isUserFacing?: boolean;
  /** ロールバックや復旧手段が明確にあるか */
  hasRollback?: boolean;
  /** 定常的に自動実行される(スケールしやすい)か */
  isAutomated?: boolean;
  /** 実行頻度 */
  frequency?: TaskFrequency;
}

export interface ErrorCostEvaluatorInput {
  /** タスク(ドメイン)の種類。例: "send_email", "update_user_profile", "rotate_api_key" */
  taskType: string;
  /** 操作の種類。例: "read", "create", "update", "delete", "deploy", "migrate" */
  operationType: string;
  /** 任意の追加文脈。未指定でも保守的に評価する */
  context?: ErrorCostEvaluatorContext;
}

export interface ErrorCostBreakdown {
  /** データ損失/破壊のリスク */
  dataLoss: 0 | 1 | 2 | 3;
  /** セキュリティ/プライバシー(PII/権限/秘匿情報)のリスク */
  securityPrivacy: 0 | 1 | 2 | 3;
  /** 金銭的損失(課金/返金/請求)のリスク */
  financial: 0 | 1 | 2 | 3;
  /** 可用性/安定性(停止/障害/復旧)のリスク */
  availability: 0 | 1 | 2 | 3;
  /** UX/レピュテーション(誤送信/炎上/不快体験)のリスク */
  uxReputation: 0 | 1 | 2 | 3;
}

export interface ErrorCostEvaluationResult {
  score: number; // 0-100
  level: ErrorCostLevel;
  decision: ErrorControlDecision;
  decisionLabel: string;
  reasons: string[];
  recommendedActions: string[];
  breakdown: ErrorCostBreakdown;
  inferred: {
    normalizedTaskType: string;
    normalizedOperationType: string;
    operationFamily: OperationFamily;
    uncertaintyPenaltyApplied: boolean;
  };
}

type OperationFamily =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'send'
  | 'execute'
  | 'deploy'
  | 'migrate'
  | 'auth'
  | 'permission'
  | 'payment'
  | 'config'
  | 'unknown';

const WEIGHTS: Record<keyof ErrorCostBreakdown, number> = {
  dataLoss: 5,
  securityPrivacy: 6,
  financial: 5,
  availability: 4,
  uxReputation: 3,
};

const OP_FAMILY_KEYWORDS: Array<{ family: OperationFamily; keywords: string[] }> = [
  { family: 'delete', keywords: ['delete', 'remove', 'drop', 'truncate', 'purge', 'erase'] },
  { family: 'migrate', keywords: ['migrate', 'migration', 'schema', 'ddl'] },
  { family: 'deploy', keywords: ['deploy', 'release', 'rollback', 'rollout'] },
  { family: 'permission', keywords: ['permission', 'role', 'grant', 'revoke', 'admin', 'acl'] },
  { family: 'auth', keywords: ['auth', 'login', 'logout', 'token', 'jwt', 'oauth', 'password', 'session'] },
  { family: 'payment', keywords: ['payment', 'billing', 'charge', 'refund', 'invoice', 'checkout', 'subscription'] },
  { family: 'config', keywords: ['config', 'setting', 'env', 'flag', 'feature_flag'] },
  { family: 'send', keywords: ['send', 'email', 'sms', 'notify', 'notification', 'message', 'newsletter'] },
  { family: 'execute', keywords: ['execute', 'run', 'job', 'cron', 'schedule', 'batch'] },
  { family: 'update', keywords: ['update', 'edit', 'patch', 'set', 'modify', 'upsert'] },
  { family: 'create', keywords: ['create', 'add', 'insert', 'register', 'new'] },
  { family: 'read', keywords: ['read', 'get', 'list', 'fetch', 'search', 'view'] },
];

const DOMAIN_KEYWORDS = {
  db: ['db', 'database', 'supabase', 'postgres', 'mysql', 'table', 'row', 'record', 'sql'],
  pii: ['pii', 'personal', 'email', 'phone', 'address', 'name', 'dob', 'birthday'],
  secrets: ['secret', 'apikey', 'api_key', 'token', 'jwt', 'password', 'credential', 'private_key'],
  payments: ['stripe', 'payment', 'billing', 'invoice', 'checkout', 'refund', 'subscription', 'price'],
  marketing: ['newsletter', 'marketing', 'campaign', 'promo', 'promotion'],
  deploy: ['deploy', 'release', 'rollout', 'incident', 'outage', 'downtime'],
};

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\\s\\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function tokenize(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split('_').filter(Boolean);
}

function buildPhrases(tokens: string[]): Set<string> {
  const phrases = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t0 = tokens[i];
    phrases.add(t0);
    if (i + 1 < tokens.length) {
      phrases.add(`${t0}_${tokens[i + 1]}`);
    }
    if (i + 2 < tokens.length) {
      phrases.add(`${t0}_${tokens[i + 1]}_${tokens[i + 2]}`);
    }
  }
  return phrases;
}

function clamp3(n: number): 0 | 1 | 2 | 3 {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function maxAxis(a: 0 | 1 | 2 | 3, b: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  return (a > b ? a : b) as 0 | 1 | 2 | 3;
}

function hasAny(phrases: Set<string>, keywords: string[]): boolean {
  return keywords.some(k => phrases.has(k));
}

function includesAny(raw: string, keywords: string[]): boolean {
  return keywords.some(k => raw.includes(k));
}

function inferOperationFamilyFromRaw(raw: string): OperationFamily {
  // 日本語入力が来ても最低限推定できるようにする（UI/プロンプトから来るケース想定）
  const jaRules: Array<{ family: OperationFamily; keywords: string[] }> = [
    { family: 'delete', keywords: ['削除', '消去'] },
    { family: 'update', keywords: ['更新', '変更', '修正', '編集'] },
    { family: 'create', keywords: ['作成', '登録', '追加'] },
    { family: 'read', keywords: ['参照', '閲覧', '取得', '検索', '一覧'] },
    { family: 'send', keywords: ['送信', '配信', '通知', 'メール', 'メッセージ'] },
    { family: 'deploy', keywords: ['デプロイ', 'リリース', '公開'] },
    { family: 'migrate', keywords: ['マイグレーション', '移行', 'スキーマ'] },
    { family: 'permission', keywords: ['権限', 'ロール', '管理者'] },
    { family: 'auth', keywords: ['認証', 'ログイン', 'トークン', 'パスワード'] },
    { family: 'payment', keywords: ['決済', '課金', '請求', '返金', '支払い'] },
    { family: 'config', keywords: ['設定', '構成', '環境変数', 'フラグ'] },
  ];
  for (const entry of jaRules) {
    if (includesAny(raw, entry.keywords)) return entry.family;
  }
  return 'unknown';
}

function inferOperationFamily(phrases: Set<string>, raw: string): OperationFamily {
  for (const entry of OP_FAMILY_KEYWORDS) {
    if (hasAny(phrases, entry.keywords)) return entry.family;
  }

  const ja = inferOperationFamilyFromRaw(raw);
  if (ja !== 'unknown') return ja;

  return 'unknown';
}

function buildBreakdown(input: ErrorCostEvaluatorInput): {
  breakdown: ErrorCostBreakdown;
  operationFamily: OperationFamily;
  uncertaintyPenaltyApplied: boolean;
  uncertaintyPenalty: number;
  reasonSignals: string[];
} {
  const normalizedTaskType = normalize(input.taskType);
  const normalizedOperationType = normalize(input.operationType);
  const taskTokens = tokenize(normalizedTaskType);
  const opTokens = tokenize(normalizedOperationType);
  const allTokensOrdered = [...taskTokens, ...opTokens];
  const phrases = buildPhrases(allTokensOrdered);
  const rawText = `${input.taskType} ${input.operationType}`;

  const operationFamily = inferOperationFamily(phrases, rawText);

  const reasonSignals: string[] = [];

  let dataLoss: number = 0;
  let securityPrivacy: number = 0;
  let financial: number = 0;
  let availability: number = 0;
  let uxReputation: number = 0;

  // Operation-based baseline
  switch (operationFamily) {
    case 'read':
      break;
    case 'create':
      dataLoss = Math.max(dataLoss, 1);
      break;
    case 'update':
      dataLoss = Math.max(dataLoss, 2);
      break;
    case 'delete':
      dataLoss = Math.max(dataLoss, 3);
      availability = Math.max(availability, 1);
      break;
    case 'migrate':
      dataLoss = Math.max(dataLoss, 3);
      availability = Math.max(availability, 2);
      break;
    case 'deploy':
      availability = Math.max(availability, 3);
      break;
    case 'auth':
    case 'permission':
      securityPrivacy = Math.max(securityPrivacy, 3);
      break;
    case 'payment':
      financial = Math.max(financial, 3);
      break;
    case 'send':
      uxReputation = Math.max(uxReputation, 2);
      break;
    case 'execute':
      availability = Math.max(availability, 2);
      break;
    case 'config':
      availability = Math.max(availability, 2);
      break;
    case 'unknown':
      break;
    default: {
      const _exhaustive: never = operationFamily;
      return _exhaustive;
    }
  }

  // Domain signals
  if (hasAny(phrases, DOMAIN_KEYWORDS.db) || includesAny(rawText, ['DB', 'データベース', 'テーブル', 'レコード', 'SQL', 'Supabase'])) {
    dataLoss = Math.max(dataLoss, 1);
    availability = Math.max(availability, 1);
    reasonSignals.push('db');
  }
  if (hasAny(phrases, DOMAIN_KEYWORDS.pii) || includesAny(rawText, ['個人情報', 'メール', '電話', '住所', '氏名', '生年月日'])) {
    securityPrivacy = Math.max(securityPrivacy, 2);
    uxReputation = Math.max(uxReputation, 1);
    reasonSignals.push('pii');
  }
  if (hasAny(phrases, DOMAIN_KEYWORDS.secrets) || includesAny(rawText, ['APIキー', '秘密鍵', 'シークレット', 'トークン', 'パスワード'])) {
    securityPrivacy = Math.max(securityPrivacy, 3);
    reasonSignals.push('secrets');
  }
  if (hasAny(phrases, DOMAIN_KEYWORDS.payments) || includesAny(rawText, ['Stripe', '決済', '課金', '請求', '返金'])) {
    financial = Math.max(financial, 3);
    reasonSignals.push('payments');
  }
  if (hasAny(phrases, DOMAIN_KEYWORDS.marketing) || includesAny(rawText, ['メルマガ', 'キャンペーン', 'マーケティング', 'プロモ'])) {
    uxReputation = Math.max(uxReputation, 3);
    securityPrivacy = Math.max(securityPrivacy, 2); // 送信先の取り扱い等
    reasonSignals.push('marketing');
  }
  if (hasAny(phrases, DOMAIN_KEYWORDS.deploy) || includesAny(rawText, ['デプロイ', '障害', '停止', 'ダウンタイム'])) {
    availability = Math.max(availability, 3);
    reasonSignals.push('deploy');
  }

  // Context modifiers
  const ctx = input.context;
  if (ctx?.touchesSecrets) {
    securityPrivacy = Math.max(securityPrivacy, 3);
    reasonSignals.push('touchesSecrets');
  }
  if (ctx?.handlesPII) {
    securityPrivacy = Math.max(securityPrivacy, 2);
    uxReputation = Math.max(uxReputation, 1);
    reasonSignals.push('handlesPII');
  }
  if (ctx?.touchesPayments) {
    financial = Math.max(financial, 3);
    reasonSignals.push('touchesPayments');
  }
  if (ctx?.touchesProductionData) {
    dataLoss = Math.min(3, dataLoss + 1);
    availability = Math.min(3, availability + 1);
    reasonSignals.push('touchesProductionData');
  }
  if (ctx?.isUserFacing) {
    uxReputation = Math.max(uxReputation, 1);
    reasonSignals.push('isUserFacing');
  }
  if (ctx?.isAutomated) {
    availability = Math.min(3, availability + 1);
    uxReputation = Math.min(3, uxReputation + 1);
    reasonSignals.push('isAutomated');
  }
  if (ctx?.hasRollback) {
    // 復旧性があれば、不可逆性の一部を緩和
    dataLoss = Math.max(0, dataLoss - 1);
    availability = Math.max(0, availability - 1);
    reasonSignals.push('hasRollback');
  }

  // Unknown penalty (保守的評価)
  // 完全に未知の種別は、評価ミスのリスクがあるため一定のペナルティを加える。
  let uncertaintyPenalty = 0;
  const hasSignal = reasonSignals.length > 0;
  if (operationFamily === 'unknown' && !hasSignal) {
    uncertaintyPenalty = 15;
    reasonSignals.push('unknownType');
  }

  // Human-readable signals (optional)
  if (operationFamily === 'delete' || operationFamily === 'migrate') {
    reasonSignals.push('destructive');
  }

  const breakdown: ErrorCostBreakdown = {
    dataLoss: clamp3(dataLoss),
    securityPrivacy: clamp3(securityPrivacy),
    financial: clamp3(financial),
    availability: clamp3(availability),
    uxReputation: clamp3(uxReputation),
  };

  return {
    breakdown,
    operationFamily,
    uncertaintyPenaltyApplied: uncertaintyPenalty > 0,
    uncertaintyPenalty,
    reasonSignals,
  };
}

function computeScore(breakdown: ErrorCostBreakdown, uncertaintyPenalty: number): number {
  const maxRaw = 3 * Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const raw =
    breakdown.dataLoss * WEIGHTS.dataLoss +
    breakdown.securityPrivacy * WEIGHTS.securityPrivacy +
    breakdown.financial * WEIGHTS.financial +
    breakdown.availability * WEIGHTS.availability +
    breakdown.uxReputation * WEIGHTS.uxReputation;

  const baseScore = Math.round((raw / maxRaw) * 100);
  return Math.max(0, Math.min(100, baseScore + uncertaintyPenalty));
}

function levelFromScore(score: number): ErrorCostLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function decisionLabel(decision: ErrorControlDecision): string {
  switch (decision) {
    case 'prompt_sufficient':
      return 'プロンプトで十分';
    case 'rules_recommended':
      return 'ルール化推奨';
    case 'both_required':
      return '両方必要';
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

function deriveDecision(input: ErrorCostEvaluatorInput, breakdown: ErrorCostBreakdown, score: number, operationFamily: OperationFamily): ErrorControlDecision {
  const ctx = input.context;

  // 重大領域は原則「両方必要」
  if (breakdown.securityPrivacy === 3) return 'both_required';
  if (breakdown.financial === 3) return 'both_required';

  // データ破壊でロールバック無しは「両方必要」
  if ((operationFamily === 'delete' || operationFamily === 'migrate') && !ctx?.hasRollback) return 'both_required';

  // 配信/マーケは事故りやすく影響も広がりやすいので、スコアが中寄りでもルール化を推奨
  if (operationFamily === 'send' && breakdown.uxReputation >= 3) return 'rules_recommended';

  // 総合的に臨界なら「両方必要」
  if (score >= 75) return 'both_required';

  // 中〜高は「ルール化推奨」寄り（運用/検証でコントロールしやすい）
  if (score >= 35) return 'rules_recommended';

  // 頻度が高い場合は、低〜中でもルール化した方が安定する
  if (ctx?.frequency === 'high' && score >= 25) return 'rules_recommended';

  return 'prompt_sufficient';
}

function buildReasons(input: ErrorCostEvaluatorInput, breakdown: ErrorCostBreakdown, score: number, level: ErrorCostLevel, decision: ErrorControlDecision, operationFamily: OperationFamily, uncertaintyPenaltyApplied: boolean): string[] {
  const reasons: string[] = [];
  reasons.push(`エラーコストスコア: ${score}/100（${level}）`);
  reasons.push(`操作種別: ${operationFamily}`);

  const parts: Array<[keyof ErrorCostBreakdown, string]> = [
    ['dataLoss', 'データ損失'],
    ['securityPrivacy', 'セキュリティ/プライバシー'],
    ['financial', '金銭'],
    ['availability', '可用性'],
    ['uxReputation', 'UX/レピュテーション'],
  ];
  for (const [k, label] of parts) {
    const v = breakdown[k];
    if (v > 0) reasons.push(`${label}リスク: ${v}/3`);
  }

  if (input.context?.hasRollback) reasons.push('復旧手段あり（ロールバック可能）');
  if (input.context?.touchesProductionData) reasons.push('本番データに触れる可能性あり');
  if (input.context?.isAutomated) reasons.push('自動実行（影響がスケールしやすい）');

  if (uncertaintyPenaltyApplied) reasons.push('タスク/操作の種類が曖昧なため保守的に評価');

  // 判定の短い根拠
  switch (decision) {
    case 'prompt_sufficient':
      reasons.push('失敗しても影響が限定的なので、プロンプトでの制約提示で十分');
      break;
    case 'rules_recommended':
      reasons.push('一定の影響があるため、コード側のルール（検証/ガード）で事故率を下げるべき');
      break;
    case 'both_required':
      reasons.push('重大領域（セキュリティ/金銭/不可逆）を含むため、プロンプト指示とルールガードを併用すべき');
      break;
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }

  return reasons;
}

function buildRecommendedActions(decision: ErrorControlDecision, breakdown: ErrorCostBreakdown): string[] {
  const actions: string[] = [];

  if (decision === 'prompt_sufficient' || decision === 'both_required') {
    actions.push('プロンプトに「禁止事項」「出力形式」「成功/失敗例」を明記する');
    actions.push('曖昧な入力の場合は確認質問してから実行するよう指示する');
  }

  if (decision === 'rules_recommended' || decision === 'both_required') {
    actions.push('入力/出力をスキーマ検証し、許可リスト（allowlist）で制約する');
    actions.push('冪等性（idempotency）や二重実行防止を入れる');
    actions.push('監査ログ/トレースIDを残して原因追跡できるようにする');
  }

  // 軸別の追加アクション（必要最小限）
  if (breakdown.dataLoss >= 2 && (decision === 'rules_recommended' || decision === 'both_required')) {
    actions.push('破壊的操作は dry-run/二段階確認/バックアップ前提にする');
  }
  if (breakdown.securityPrivacy >= 2 && (decision === 'rules_recommended' || decision === 'both_required')) {
    actions.push('権限チェック（最小権限）と秘密情報のマスク/ログ禁止を徹底する');
  }
  if (breakdown.financial >= 2 && (decision === 'rules_recommended' || decision === 'both_required')) {
    actions.push('金銭系は上限・整合性チェック・二重請求防止を必須にする');
  }
  if (breakdown.availability >= 2 && (decision === 'rules_recommended' || decision === 'both_required')) {
    actions.push('リトライ/タイムアウト/アラートなど運用ガードを追加する');
  }
  if (breakdown.uxReputation >= 2 && (decision === 'rules_recommended' || decision === 'both_required')) {
    actions.push('誤送信防止（宛先検証/配信上限/サンドボックス切替）を入れる');
  }

  // 取りすぎないように最大8件に制限
  return actions.slice(0, 8);
}

export function evaluateErrorCost(input: ErrorCostEvaluatorInput): ErrorCostEvaluationResult {
  const normalizedTaskType = normalize(input.taskType);
  const normalizedOperationType = normalize(input.operationType);

  const { breakdown, operationFamily, uncertaintyPenaltyApplied, uncertaintyPenalty } = buildBreakdown(input);

  const score = computeScore(breakdown, uncertaintyPenalty);
  const level = levelFromScore(score);
  const decision = deriveDecision(input, breakdown, score, operationFamily);

  const reasons = buildReasons(input, breakdown, score, level, decision, operationFamily, uncertaintyPenaltyApplied);
  const recommendedActions = buildRecommendedActions(decision, breakdown);

  return {
    score,
    level,
    decision,
    decisionLabel: decisionLabel(decision),
    reasons,
    recommendedActions,
    breakdown,
    inferred: {
      normalizedTaskType,
      normalizedOperationType,
      operationFamily,
      uncertaintyPenaltyApplied,
    },
  };
}

/**
 * 人間向けの短い要約（ログ表示等に便利）
 */
export function formatErrorCostEvaluation(result: ErrorCostEvaluationResult): string {
  const top = `${result.decisionLabel}（score=${result.score}, level=${result.level}, op=${result.inferred.operationFamily}）`;
  const dims = `breakdown: dataLoss=${result.breakdown.dataLoss}, securityPrivacy=${result.breakdown.securityPrivacy}, financial=${result.breakdown.financial}, availability=${result.breakdown.availability}, uxReputation=${result.breakdown.uxReputation}`;
  return `${top}\n${dims}`;
}
