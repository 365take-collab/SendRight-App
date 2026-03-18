const OPENAI_COMPAT_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const ANTHROPIC_BASE_URL = 'https://ai-gateway.vercel.sh';

type GatewayProvider = 'openai' | 'deepseek' | 'anthropic' | 'vision';

const MODEL_ENV_MAP: Record<GatewayProvider, string> = {
  openai: 'GATEWAY_OPENAI_MODEL',
  deepseek: 'GATEWAY_DEEPSEEK_MODEL',
  anthropic: 'GATEWAY_ANTHROPIC_MODEL',
  vision: 'GATEWAY_VISION_MODEL',
};

export const gatewayEnabled = Boolean(process.env.AI_GATEWAY_API_KEY);

export function hasAiProviderKey(provider: 'openai' | 'deepseek' | 'anthropic'): boolean {
  if (gatewayEnabled) return true;

  const envMap = {
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };

  return Boolean(envMap[provider]);
}

export function getOpenAIClientConfig(provider: 'openai' | 'deepseek' | 'vision') {
  if (gatewayEnabled) {
    return {
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: process.env.AI_GATEWAY_BASE_URL || OPENAI_COMPAT_BASE_URL,
    };
  }

  if (provider === 'deepseek') {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    };
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
  };
}

export function getAnthropicClientConfig() {
  return gatewayEnabled
    ? {
        apiKey: process.env.AI_GATEWAY_API_KEY,
        baseURL: process.env.AI_GATEWAY_ANTHROPIC_BASE_URL || ANTHROPIC_BASE_URL,
      }
    : {
        apiKey: process.env.ANTHROPIC_API_KEY,
      };
}

export function resolveModel(provider: GatewayProvider, directModel: string): string {
  if (!gatewayEnabled) return directModel;

  const overrideModel = process.env[MODEL_ENV_MAP[provider]];
  if (overrideModel) return overrideModel;
  if (directModel.includes('/')) return directModel;

  const providerPrefix = provider === 'vision' ? 'openai' : provider;
  return `${providerPrefix}/${directModel}`;
}
