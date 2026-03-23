---
name: dpub-template-generator
description: dpub 式メールテンプレートを 3 型 x 5 バリエーションで必ず生成する
---

# dpub Template Generator

## 目的
- dpub で勝ちやすい 3 つのフック型を固定し、毎回 15 テンプレートを生成する
- 各テンプレートは `email_templates` に保存できる形式で、`email_type` `hook_type` `subject_template` `body_template` を必ず持つ

## 必須ルール
1. 生成結果には必ず 15 件を含める
2. `hook_type` は `why` 5 件、`belief_denial` 5 件、`quiz` 5 件に固定する
3. 各 `subject_template` は以下のフックをそのまま使う

### Why (`hook_type='why'`)
1. `なぜ{{target_audience}}の90%は{{problem}}に悩むのか？`
2. `{{product_name}}が選ばれる3つの理由`
3. `{{problem}}の本当の原因を知っていますか？`
4. `なぜ{{solution}}をやっても{{problem}}が解決しないのか？`
5. `なぜトップ企業は今{{product_category}}に投資するのか？`

### Belief Denial (`hook_type='belief_denial'`)
1. `{{common_belief}}は間違いです`
2. `プロが絶対にやらない{{bad_practice}}、あなたはやっていませんか？`
3. `{{statistic}}%の企業が{{common_approach}}で失敗している事実`
4. `「{{product_category}}は難しい」と思っていませんか？それ、誤解です`
5. `来年、{{industry}}の常識が完全に変わります`

### Quiz (`hook_type='quiz'`)
1. `AとB、{{metric}}が3倍になるのはどちら？`
2. `次の3つのうち、最も{{benefit}}なのは？`
3. `成功する{{target_audience}}に共通するたった1つの___とは？`
4. `{{product_category}}で最も効果が高い方法、第1位は？`
5. `たった{{time}}で{{benefit}}できる方法、信じますか？`

## 本文構造
すべての `body_template` は次の順序を守る

```text
{{subscriber_name}}さん

[フック]

[権威 or 社会的証明（1-2文）]

✅ {{benefit_1}}
✅ {{benefit_2}}
✅ {{benefit_3}}

[CTA（1つの明確な行動指示）]
→ {{cta_url}}

[希少性 or 緊急性（1文）]

PS: [別角度の訴求]

---
{{sender_name}} | {{sender_address}}
配信停止: {{unsubscribe_url}}
```

## 出力要件
- `email_type` はテンプレートごとに一意の識別子を付ける
- `placeholder_schema` には件名と本文で使うプレースホルダを含める
- `brand_voice` は `dpub` を既定値とする
