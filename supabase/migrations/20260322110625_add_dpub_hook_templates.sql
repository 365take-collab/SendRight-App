BEGIN;

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS hook_type text;

WITH template_seed AS (
  SELECT
    v.name,
    v.email_type,
    v.hook_type,
    v.subject_template,
    v.body_template,
    jsonb_build_object(
      'subscriber_name', '受信者名',
      'target_audience', '対象読者',
      'problem', '課題',
      'product_name', '商品名',
      'authority_statement', '権威付け',
      'social_proof', '社会的証明',
      'benefit_1', 'ベネフィット1',
      'benefit_2', 'ベネフィット2',
      'benefit_3', 'ベネフィット3',
      'cta_url', 'CTAリンク',
      'urgency_statement', '希少性・緊急性',
      'ps_angle', 'PS訴求',
      'sender_name', '送信者名',
      'sender_address', '送信者住所',
      'unsubscribe_url', '配信停止URL',
      'solution', '一般的な解決策',
      'product_category', '商品カテゴリ',
      'common_belief', 'よくある思い込み',
      'bad_practice', '避けるべき施策',
      'statistic', '統計値',
      'common_approach', '一般的な取り組み',
      'industry', '業界名',
      'metric', '指標',
      'benefit', '便益',
      'time', '時間'
    ) AS placeholder_schema
  FROM (
    VALUES
      (
        'DPUB Why 01 Why Question',
        'dpub_why_question',
        'why',
        'なぜ{{target_audience}}の90%は{{problem}}に悩むのか？',
        $template${{subscriber_name}}さん

なぜ{{target_audience}}の90%は{{problem}}に悩むのか？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Why 02 Three Reasons',
        'dpub_why_three_reasons',
        'why',
        '{{product_name}}が選ばれる3つの理由',
        $template${{subscriber_name}}さん

{{product_name}}が選ばれる3つの理由

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

詳細はこちらからご確認ください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Why 03 Root Cause',
        'dpub_why_root_cause',
        'why',
        '{{problem}}の本当の原因を知っていますか？',
        $template${{subscriber_name}}さん

{{problem}}の本当の原因を知っていますか？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

原因と対策を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Why 04 Paradox',
        'dpub_why_paradox',
        'why',
        'なぜ{{solution}}をやっても{{problem}}が解決しないのか？',
        $template${{subscriber_name}}さん

なぜ{{solution}}をやっても{{problem}}が解決しないのか？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

失敗を避ける方法を今すぐ見てください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Why 05 Historical',
        'dpub_why_historical',
        'why',
        'なぜトップ企業は今{{product_category}}に投資するのか？',
        $template${{subscriber_name}}さん

なぜトップ企業は今{{product_category}}に投資するのか？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

先行企業の動きを確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Belief 01 Common Sense Break',
        'dpub_belief_denial_common_sense',
        'belief_denial',
        '{{common_belief}}は間違いです',
        $template${{subscriber_name}}さん

{{common_belief}}は間違いです

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

誤解を解く方法を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Belief 02 Expert Denial',
        'dpub_belief_denial_expert',
        'belief_denial',
        'プロが絶対にやらない{{bad_practice}}、あなたはやっていませんか？',
        $template${{subscriber_name}}さん

プロが絶対にやらない{{bad_practice}}、あなたはやっていませんか？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

今すぐ見直しポイントを確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Belief 03 Statistic Denial',
        'dpub_belief_denial_statistic',
        'belief_denial',
        '{{statistic}}%の企業が{{common_approach}}で失敗している事実',
        $template${{subscriber_name}}さん

{{statistic}}%の企業が{{common_approach}}で失敗している事実

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

数字の裏側を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Belief 04 Experience Denial',
        'dpub_belief_denial_experience',
        'belief_denial',
        '「{{product_category}}は難しい」と思っていませんか？それ、誤解です',
        $template${{subscriber_name}}さん

「{{product_category}}は難しい」と思っていませんか？それ、誤解です

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

誤解を解く具体策を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Belief 05 Future Denial',
        'dpub_belief_denial_future',
        'belief_denial',
        '来年、{{industry}}の常識が完全に変わります',
        $template${{subscriber_name}}さん

来年、{{industry}}の常識が完全に変わります

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

変化に先回りする方法を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Quiz 01 Two Choice',
        'dpub_quiz_two_choice',
        'quiz',
        'AとB、{{metric}}が3倍になるのはどちら？',
        $template${{subscriber_name}}さん

AとB、{{metric}}が3倍になるのはどちら？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

答えを今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Quiz 02 Three Choice',
        'dpub_quiz_three_choice',
        'quiz',
        '次の3つのうち、最も{{benefit}}なのは？',
        $template${{subscriber_name}}さん

次の3つのうち、最も{{benefit}}なのは？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

正解と理由を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Quiz 03 Fill Blank',
        'dpub_quiz_fill_blank',
        'quiz',
        '成功する{{target_audience}}に共通するたった1つの___とは？',
        $template${{subscriber_name}}さん

成功する{{target_audience}}に共通するたった1つの___とは？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

空欄の答えを今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Quiz 04 Ranking',
        'dpub_quiz_ranking',
        'quiz',
        '{{product_category}}で最も効果が高い方法、第1位は？',
        $template${{subscriber_name}}さん

{{product_category}}で最も効果が高い方法、第1位は？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

ランキングの詳細を今すぐ確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      ),
      (
        'DPUB Quiz 05 Yes No',
        'dpub_quiz_yes_no',
        'quiz',
        'たった{{time}}で{{benefit}}できる方法、信じますか？',
        $template${{subscriber_name}}さん

たった{{time}}で{{benefit}}できる方法、信じますか？

{{authority_statement}}。{{social_proof}}。

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

今すぐ方法を確認してください
→ {{cta_url}}

{{urgency_statement}}

PS: {{ps_angle}}

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}$template$
      )
  ) AS v(name, email_type, hook_type, subject_template, body_template)
)
INSERT INTO public.email_templates (
  name,
  email_type,
  hook_type,
  brand_voice,
  emotion_tag,
  subject_template,
  body_template,
  placeholder_schema,
  source_pattern_ids,
  performance_score
)
SELECT
  template_seed.name,
  template_seed.email_type,
  template_seed.hook_type,
  'dpub',
  template_seed.hook_type,
  template_seed.subject_template,
  template_seed.body_template,
  template_seed.placeholder_schema,
  '[]'::jsonb,
  NULL
FROM template_seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_templates existing
  WHERE existing.email_type = template_seed.email_type
);

COMMIT;
