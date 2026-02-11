import { describe, expect, it } from 'vitest';

import { evaluateErrorCost, formatErrorCostEvaluation } from './error-cost-evaluator';

describe('error-cost-evaluator', () => {
  it('低リスクの参照系は「プロンプトで十分」になる', () => {
    const result = evaluateErrorCost({
      taskType: 'get_profile',
      operationType: 'read',
    });

    expect(result.decision).toBe('prompt_sufficient');
    expect(result.level).toBe('low');
    expect(result.score).toBeLessThan(25);
  });

  it('配信/マーケ系は「ルール化推奨」以上になる', () => {
    const result = evaluateErrorCost({
      taskType: 'marketing_newsletter_send',
      operationType: 'send_email',
    });

    expect(['rules_recommended', 'both_required']).toContain(result.decision);
    expect(result.breakdown.uxReputation).toBeGreaterThanOrEqual(2);
  });

  it('削除(ロールバック無し)は「両方必要」になる', () => {
    const result = evaluateErrorCost({
      taskType: 'delete_user_data',
      operationType: 'delete',
      context: { hasRollback: false },
    });

    expect(result.decision).toBe('both_required');
    expect(result.breakdown.dataLoss).toBe(3);
  });

  it('認証/秘匿情報は「両方必要」になる', () => {
    const result = evaluateErrorCost({
      taskType: 'rotate_api_key',
      operationType: 'update',
    });

    expect(result.decision).toBe('both_required');
    expect(result.breakdown.securityPrivacy).toBe(3);
  });

  it('日本語入力でも最低限の推定ができる', () => {
    const result = evaluateErrorCost({
      taskType: 'ユーザーの個人情報を削除',
      operationType: '削除',
    });

    expect(result.decision).toBe('both_required');
    expect(result.breakdown.securityPrivacy).toBeGreaterThanOrEqual(2);
    expect(result.breakdown.dataLoss).toBe(3);
  });

  it('フォーマッタは例外を出さずに要約を返す', () => {
    const result = evaluateErrorCost({
      taskType: 'unknown_task',
      operationType: 'unknown_op',
    });

    const text = formatErrorCostEvaluation(result);
    expect(text).toMatch(/score=/);
    expect(text).toMatch(/breakdown:/);
  });
});

