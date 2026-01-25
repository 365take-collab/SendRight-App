'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Check, Loader2, ArrowLeft } from 'lucide-react';

export default function SubscribePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setIsLoading(true);
    setLoadingPlan(plan);
    setError('');

    try {
      // Stripe Checkout Sessionを作成（トークンなしで）
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout Sessionの作成に失敗しました');
      }

      const data = await response.json();
      
      // Stripe Checkoutページにリダイレクト
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Checkout URLが取得できませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サブスクリプションの処理に失敗しました');
      setIsLoading(false);
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'monthly',
      name: '月額プラン',
      price: '¥6,980',
      period: '月',
      features: [
        '7日間無料トライアル',
        '無制限の返信生成',
        '会話履歴の保存',
        '優先サポート',
      ],
    },
    {
      id: 'yearly',
      name: '年額プラン',
      price: '¥59,800',
      period: '年',
      originalPrice: '¥83,760',
      discount: '29% OFF',
      features: [
        '7日間無料トライアル',
        '無制限の返信生成',
        '会話履歴の保存',
        '優先サポート',
        '早期アクセス機能',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 背景の微細なグラデーション効果 */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-black pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="relative z-10">
      <nav className="glass-effect border-b border-gray-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-300 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              戻る
            </button>
            <div className="flex items-center space-x-3">
              <Crown className="w-7 h-7 text-blue-400" />
              <h1 className="text-2xl font-semibold text-white tracking-tight">会員登録</h1>
            </div>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        {error && (
          <div className="mb-8 p-8 bg-gradient-to-r from-red-900/40 to-rose-900/40 border border-red-800/50 rounded-2xl text-red-300 fade-in-up">
            <p className="text-lg font-semibold">{error}</p>
          </div>
        )}

        <div className="text-center mb-24 fade-in-up">
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-8 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SendRight
            </span>
            <span className="text-white">で</span>
            <br />
            <span className="text-white">会話をスムーズに</span>
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300 font-medium">
            適切な返信をAIが即座に提案します
          </p>
          <p className="text-lg text-blue-400 mt-4 font-semibold">
            🎁 7日間無料でお試しいただけます
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-12 relative transition-all duration-300 ${
                plan.id === 'yearly' 
                  ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-blue-500/50 md:scale-105 md:-mt-4 shadow-2xl shadow-blue-500/20' 
                  : 'bg-gray-900/60 border border-gray-800/50 hover:border-gray-700/50'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.id === 'yearly' && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white px-8 py-3 rounded-full text-base font-bold shadow-2xl z-10">
                  <span className="text-lg">{plan.discount}</span>
                  <span className="ml-2 text-sm opacity-90">お得</span>
                </div>
              )}
              
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-3 text-xl font-medium">/{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <div className="mt-4">
                    <span className="text-gray-500 line-through text-xl font-medium">{plan.originalPrice}</span>
                    <span className="ml-3 text-blue-400 font-semibold">年間で¥23,960お得</span>
                  </div>
                )}
              </div>

              <div className="mb-12">
                <div className="space-y-5">
                  {plan.features.map((feature, featureIndex) => (
                    <div 
                      key={featureIndex} 
                      className="flex items-start group"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mr-4 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                        <Check className="w-4 h-4 text-white font-bold" strokeWidth={3} />
                      </div>
                      <span className="text-gray-200 text-lg font-medium leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id as 'monthly' | 'yearly')}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center ${
                  plan.id === 'yearly'
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 shadow-xl shadow-blue-500/30'
                    : 'bg-gray-800 text-white border-2 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading && loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    <span>処理中...</span>
                  </>
                ) : (
                  <span>7日間無料で試す</span>
                )}
              </button>
              
              {plan.id === 'yearly' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-400">
                    <span className="text-blue-400 font-semibold">最も人気のプラン</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-20 text-center text-gray-500 text-base space-y-2">
          <p>※ 7日間の無料トライアル後、自動的に課金が開始されます</p>
          <p>※ 決済はStripeを通じて安全に処理されます</p>
          <p>解約・プラン変更はいつでも可能です</p>
        </div>
      </main>
      </div>
    </div>
  );
}
