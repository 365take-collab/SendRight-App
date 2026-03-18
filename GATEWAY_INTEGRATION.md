# Vercel AI Gateway Integration

## 目的
- SendRight の AI 呼び出しを Vercel AI Gateway 経由へ寄せ、API キー管理を 1 本化する
- `AI_PROVIDER` を切り替えるだけで `openai` / `deepseek` / `anthropic` を選べる状態にする

## 追加した設定
- `AI_GATEWAY_API_KEY`: Vercel AI Gateway の認証キー。設定すると Gateway 経由を有効化
- `AI_GATEWAY_BASE_URL`: OpenAI 互換 API の上書き先。未設定時は `https://ai-gateway.vercel.sh/v1`
- `AI_GATEWAY_ANTHROPIC_BASE_URL`: Anthropic SDK 用の上書き先。未設定時は `https://ai-gateway.vercel.sh`
- `GATEWAY_OPENAI_MODEL`: OpenAI 系のモデル上書き。例: `openai/gpt-4o-mini`
- `GATEWAY_DEEPSEEK_MODEL`: DeepSeek 系のモデル上書き。例: `deepseek/deepseek-chat`
- `GATEWAY_ANTHROPIC_MODEL`: Anthropic 系のモデル上書き。例: `anthropic/claude-3-5-haiku-20241022`
- `GATEWAY_VISION_MODEL`: 画像抽出用モデル上書き。例: `openai/gpt-4o`

## ルーティング
- `AI_PROVIDER=openai`: `openai/gpt-4o-mini` を利用
- `AI_PROVIDER=deepseek`: `deepseek/deepseek-chat` を利用
- `AI_PROVIDER=anthropic`: `anthropic/claude-3-5-haiku-20241022` を利用
- 画像抽出 API は `openai/gpt-4o` を利用

## 動作仕様
- `AI_GATEWAY_API_KEY` がある場合、直接の `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` より Gateway を優先
- `AI_PROVIDER` の選択ポリシー自体は維持し、`ALLOW_ANTHROPIC=1` もそのまま必要
- 既存の直接接続に戻す場合は `AI_GATEWAY_API_KEY` を外すだけでよい

## 推奨設定例
```bash
AI_GATEWAY_API_KEY=vgw_xxx
AI_PROVIDER=deepseek
ALLOW_ANTHROPIC=1
GATEWAY_DEEPSEEK_MODEL=deepseek/deepseek-chat
GATEWAY_OPENAI_MODEL=openai/gpt-4o-mini
GATEWAY_ANTHROPIC_MODEL=anthropic/claude-3-5-haiku-20241022
GATEWAY_VISION_MODEL=openai/gpt-4o
```

## ロールバック
```bash
git stash
```
