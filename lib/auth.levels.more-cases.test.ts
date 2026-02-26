import { describe, expect, it } from 'vitest';
import { calculateLevel, getLevelName } from './auth';

describe('auth.ts level boundaries', () => {
  it('calculateLevel が閾値境界を正しく判定する', () => {
    const cases: Array<{ usage: number; level: number }> = [
      { usage: 0, level: 1 },
      { usage: 4, level: 1 },
      { usage: 5, level: 2 },
      { usage: 14, level: 2 },
      { usage: 15, level: 3 },
      { usage: 29, level: 3 },
      { usage: 30, level: 4 },
      { usage: 49, level: 4 },
      { usage: 50, level: 5 },
      { usage: 99, level: 5 },
      { usage: 100, level: 6 },
      { usage: 199, level: 6 },
      { usage: 200, level: 7 },
      { usage: 299, level: 7 },
      { usage: 300, level: 8 },
      { usage: 499, level: 8 },
      { usage: 500, level: 9 },
      { usage: 999, level: 9 },
      { usage: 1000, level: 10 },
    ];

    for (const { usage, level } of cases) {
      expect(calculateLevel(usage)).toBe(level);
    }
  });

  it('getLevelName は既知レベル名を返し、範囲外は神を返す', () => {
    expect(getLevelName(1)).toBe('初心者');
    expect(getLevelName(10)).toBe('神');
    expect(getLevelName(0)).toBe('神');
    expect(getLevelName(11)).toBe('神');
  });
});
