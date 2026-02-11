import crypto from 'crypto';

// レート制限の記録（メモリベース、本番環境ではRedisなどを推奨）
interface RateLimitRecord {
  userId: string;
  count: number;
  resetAt: number;
}

const rateLimitRecords: Map<string, RateLimitRecord> = new Map();

// 異常検出用のアクセス記録
interface AccessRecord {
  userId: string;
  path: string;
  timestamp: number;
  ip?: string;
}

const accessRecords: Map<string, AccessRecord[]> = new Map();

// レート制限の設定
// Groq APIの無料プラン制限（1分間に10-30リクエスト）を考慮
// 同時アクティブユーザー10人を想定: 3回/ユーザー × 10人 = 30回/分（安全）
export const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
export const RATE_LIMIT_MAX_REQUESTS = 3; // 1分間に3回まで（Groq API制限を考慮）

// リクエスト署名検証用のシークレット
const REQUEST_SIGNATURE_SECRET = (() => {
  if (process.env.REQUEST_SIGNATURE_SECRET) {
    return process.env.REQUEST_SIGNATURE_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REQUEST_SIGNATURE_SECRET is required in production');
  }
  return 'dev-only-secret';
})();

function safeTimingEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * レート制限をチェック
 * @param userId ユーザーID
 * @returns レート制限を超えている場合はtrue
 */
export function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `rate_limit:${userId}`;
  const record = rateLimitRecords.get(key);

  if (!record || now > record.resetAt) {
    // 新しいウィンドウを開始
    const newRecord: RateLimitRecord = {
      userId,
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    };
    rateLimitRecords.set(key, newRecord);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: newRecord.resetAt,
    };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  // カウントを増やす
  record.count++;
  rateLimitRecords.set(key, record);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * リクエストの署名を検証
 * @param body リクエストボディ
 * @param signature 署名
 * @param timestamp タイムスタンプ
 * @returns 署名が有効な場合はtrue
 */
export function verifyRequestSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  // タイムスタンプの有効期限をチェック（5分以内）
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  const timeDiff = Math.abs(now - requestTime);
  const maxTimeDiff = 5 * 60 * 1000; // 5分

  if (timeDiff > maxTimeDiff) {
    console.warn('リクエストのタイムスタンプが無効:', { requestTime, now, timeDiff });
    return false;
  }

  // 署名を生成
  const expectedSignature = crypto
    .createHmac('sha256', REQUEST_SIGNATURE_SECRET)
    .update(`${timestamp}:${body}`)
    .digest('hex');

  // 署名を比較（タイミング攻撃を防ぐため、定数時間比較を使用）
  return safeTimingEqual(signature, expectedSignature);
}

/**
 * リクエストの整合性をチェック
 * @param body リクエストボディ
 * @param contentHash コンテンツハッシュ
 * @returns 整合性が取れている場合はtrue
 */
export function verifyRequestIntegrity(body: string, contentHash?: string): boolean {
  if (!contentHash) {
    // コンテンツハッシュが提供されていない場合は、整合性チェックをスキップ（後方互換性のため）
    return true;
  }

  const expectedHash = crypto.createHash('sha256').update(body).digest('hex');
  return safeTimingEqual(contentHash, expectedHash);
}

/**
 * IPアドレスのホワイトリストをチェック（オプション）
 * @param ip IPアドレス
 * @returns ホワイトリストに含まれている場合はtrue
 */
export function checkIPWhitelist(ip: string): boolean {
  // 環境変数でIPホワイトリストを設定できる（オプション）
  const whitelist = process.env.IP_WHITELIST;
  if (!whitelist) {
    // ホワイトリストが設定されていない場合は、すべてのIPを許可
    return true;
  }

  const allowedIPs = whitelist.split(',').map(ip => ip.trim());
  return allowedIPs.includes(ip);
}

/**
 * 異常なアクセスパターンを検出
 * @param userId ユーザーID
 * @param requestPath リクエストパス
 * @param timestamp タイムスタンプ
 * @param ip IPアドレス（オプション）
 * @returns 異常なパターンの場合はtrue
 */
export function detectAnomalousPattern(
  userId: string,
  requestPath: string,
  timestamp: number,
  ip?: string
): { isAnomalous: boolean; reason?: string } {
  const now = timestamp;
  const key = `access:${userId}`;
  
  // 過去のアクセス記録を取得
  let records = accessRecords.get(key) || [];
  
  // 5分以上前の記録を削除（メモリ節約）
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  records = records.filter(r => r.timestamp > fiveMinutesAgo);
  
  // 現在のアクセスを記録
  records.push({
    userId,
    path: requestPath,
    timestamp: now,
    ip,
  });
  
  // 最新100件のみ保持
  if (records.length > 100) {
    records = records.slice(-100);
  }
  
  accessRecords.set(key, records);
  
  // 異常検出のチェック
  
  // 1. 短時間に大量のリクエスト（1分間に30回以上）
  const oneMinuteAgo = now - 60 * 1000;
  const recentRequests = records.filter(r => r.timestamp > oneMinuteAgo);
  if (recentRequests.length > 30) {
    console.warn('異常検出: 短時間に大量のリクエスト', {
      userId,
      count: recentRequests.length,
      path: requestPath,
    });
    return { isAnomalous: true, reason: 'too_many_requests' };
  }
  
  // 2. 不自然なパスへの連続アクセス（同じパスに1秒以内に5回以上）
  const oneSecondAgo = now - 1000;
  const samePathRequests = records.filter(
    r => r.timestamp > oneSecondAgo && r.path === requestPath
  );
  if (samePathRequests.length > 5) {
    console.warn('異常検出: 同じパスへの連続アクセス', {
      userId,
      path: requestPath,
      count: samePathRequests.length,
    });
    return { isAnomalous: true, reason: 'rapid_same_path_access' };
  }
  
  // 3. 複数のIPアドレスからの同時アクセス（5分以内に3つ以上の異なるIP）
  if (ip) {
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const recentIPs = new Set(
      records
        .filter(r => r.timestamp > fiveMinutesAgo && r.ip)
        .map(r => r.ip!)
    );
    if (recentIPs.size > 3) {
      console.warn('異常検出: 複数のIPアドレスからの同時アクセス', {
        userId,
        ipCount: recentIPs.size,
        ips: Array.from(recentIPs),
      });
      return { isAnomalous: true, reason: 'multiple_ips' };
    }
  }
  
  // 4. 不自然なパスパターン（APIエンドポイントへの異常なアクセス）
  const suspiciousPaths = [
    '/api/generate-response',
  ];
  if (suspiciousPaths.includes(requestPath)) {
    // これらのパスへの異常に頻繁なアクセスをチェック
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const suspiciousRequests = records.filter(
      r => r.timestamp > tenMinutesAgo && suspiciousPaths.includes(r.path)
    );
    if (suspiciousRequests.length > 20) {
      console.warn('異常検出: 機密APIへの異常なアクセス', {
        userId,
        path: requestPath,
        count: suspiciousRequests.length,
      });
      return { isAnomalous: true, reason: 'suspicious_api_access' };
    }
  }
  
  return { isAnomalous: false };
}

/**
 * セッションの有効期限をチェック
 * @param sessionTimestamp セッションのタイムスタンプ
 * @returns セッションが有効な場合はtrue
 */
export function isSessionValid(sessionTimestamp: number): boolean {
  const now = Date.now();
  const sessionMaxAge = 24 * 60 * 60 * 1000; // 1日（セキュリティ強化）
  return (now - sessionTimestamp) < sessionMaxAge;
}

/**
 * セッションをリフレッシュする必要があるかチェック
 * @param sessionTimestamp セッションのタイムスタンプ
 * @returns リフレッシュが必要な場合はtrue（残り時間が50%以下）
 */
export function shouldRefreshSession(sessionTimestamp: number): boolean {
  const now = Date.now();
  const sessionMaxAge = 24 * 60 * 60 * 1000; // 1日
  const sessionAge = now - sessionTimestamp;
  const halfMaxAge = sessionMaxAge / 2;
  return sessionAge > halfMaxAge;
}

/**
 * IPアドレスを取得（プロキシ経由の場合も考慮）
 * @param requestHeaders リクエストヘッダー
 * @returns IPアドレス
 */
export function getClientIP(requestHeaders: Headers): string {
  // X-Forwarded-Forヘッダーから取得（最初のIPがクライアントのIP）
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  
  // X-Real-IPヘッダーから取得
  const realIP = requestHeaders.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}
