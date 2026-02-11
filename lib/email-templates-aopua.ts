export interface AopuaEmailTemplate {
  subject: string;
  body: string;
  /** 何分後に送るか（subscribe時点からの相対） */
  delayMinutes: number;
  /** 差出人名（任意） */
  fromName?: string;
}

// NOTE: 実運用の本文は別途差し替え前提。ここでは型と最小限のテンプレートのみ用意する。
export const AOPUA_TEMPLATES = {
  aopua_01: {
    subject: '【青PUA】ステップ1',
    body: '<p>ステップ1の内容（プレースホルダー）</p>',
    delayMinutes: 0,
    fromName: 'SendRight',
  },
  aopua_02: {
    subject: '【青PUA】ステップ2',
    body: '<p>ステップ2の内容（プレースホルダー）</p>',
    delayMinutes: 24 * 60,
    fromName: 'SendRight',
  },
  aopua_03: {
    subject: '【青PUA】ステップ3',
    body: '<p>ステップ3の内容（プレースホルダー）</p>',
    delayMinutes: 2 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_04: {
    subject: '【青PUA】ステップ4',
    body: '<p>ステップ4の内容（プレースホルダー）</p>',
    delayMinutes: 3 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_05: {
    subject: '【青PUA】ステップ5',
    body: '<p>ステップ5の内容（プレースホルダー）</p>',
    delayMinutes: 4 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_06: {
    subject: '【青PUA】ステップ6',
    body: '<p>ステップ6の内容（プレースホルダー）</p>',
    delayMinutes: 5 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_07: {
    subject: '【青PUA】ステップ7',
    body: '<p>ステップ7の内容（プレースホルダー）</p>',
    delayMinutes: 6 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_08: {
    subject: '【青PUA】ステップ8',
    body: '<p>ステップ8の内容（プレースホルダー）</p>',
    delayMinutes: 7 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_09: {
    subject: '【青PUA】ステップ9',
    body: '<p>ステップ9の内容（プレースホルダー）</p>',
    delayMinutes: 8 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_10: {
    subject: '【青PUA】ステップ10',
    body: '<p>ステップ10の内容（プレースホルダー）</p>',
    delayMinutes: 9 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_11: {
    subject: '【青PUA】ステップ11',
    body: '<p>ステップ11の内容（プレースホルダー）</p>',
    delayMinutes: 10 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_12: {
    subject: '【青PUA】ステップ12',
    body: '<p>ステップ12の内容（プレースホルダー）</p>',
    delayMinutes: 11 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_13: {
    subject: '【青PUA】ステップ13',
    body: '<p>ステップ13の内容（プレースホルダー）</p>',
    delayMinutes: 12 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_14: {
    subject: '【青PUA】ステップ14',
    body: '<p>ステップ14の内容（プレースホルダー）</p>',
    delayMinutes: 13 * 24 * 60,
    fromName: 'SendRight',
  },
  aopua_15: {
    subject: '【青PUA】ステップ15',
    body: '<p>ステップ15の内容（プレースホルダー）</p>',
    delayMinutes: 14 * 24 * 60,
    fromName: 'SendRight',
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

