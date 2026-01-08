'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, subscribe, User } from '@/lib/api';
import { Crown, Check, Loader2, ArrowLeft } from 'lucide-react';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      loadUser(storedToken);
    } else {
      router.push('/auth/login-utage');
    }
  }, [router]);

  const loadUser = async (userToken: string) => {
    try {
      const data = await getCurrentUser(userToken);
      setUser(data.user);
    } catch (err) {
      console.error('Failed to load user:', err);
      localStorage.removeItem('token');
      router.push('/auth/login-utage');
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!token) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await subscribe(token, plan);
      setSuccess('サブスクリプションが有効になりました！');
      await loadUser(token);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サブスクリプションの処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const plans = [
    {
      id: 'monthly',
      name: '月額プラン',
      price: '¥6,980',
      period: '月',
      features: [
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
        {user.isSubscribed && (
          <div className="mb-8 p-8 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-800/50 rounded-2xl text-green-300 fade-in-up">
            <div className="flex items-center">
              <Crown className="w-6 h-6 mr-3 text-green-400" />
              <p className="text-lg font-semibold">
                あなたは既に会員です。有効期限: {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString('ja-JP') : '無期限'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-8 bg-gradient-to-r from-red-900/40 to-rose-900/40 border border-red-800/50 rounded-2xl text-red-300 fade-in-up">
            <p className="text-lg font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 p-8 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-800/50 rounded-2xl text-green-300 fade-in-up">
            <div className="flex items-center">
              <Check className="w-6 h-6 mr-3 text-green-400" />
              <p className="text-lg font-semibold">{success}</p>
            </div>
          </div>
        )}

        <div className="text-center mb-24 fade-in-up">
          <h2 className="text-6xl sm:text-7xl md:text-8xl font-bold text-white mb-8 tracking-tight gradient-text">
            Send Rightで<br />会話をスムーズに
          </h2>
          <p className="text-2xl sm:text-3xl text-gray-300 font-medium">
            適切な返信をAIが即座に提案します
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`apple-card apple-glow p-12 relative fade-in-up ${
                plan.id === 'yearly' 
                  ? 'border-blue-500/50 md:scale-105 md:-mt-4 shadow-2xl' 
                  : 'border-gray-800/50'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.id === 'yearly' && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white px-8 py-3 rounded-full text-base font-bold shadow-2xl z-10 animate-pulse">
                  <span className="text-lg">{plan.discount}</span>
                  <span className="ml-2 text-sm opacity-90">お得</span>
                </div>
              )}
              
              <div className="text-center mb-12">
                <h3 className="text-4xl font-bold text-white mb-6 tracking-tight gradient-text-strong">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-6xl font-bold text-white gradient-text">{plan.price}</span>
                  <span className="text-gray-400 ml-3 text-2xl font-medium">/{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <div className="mt-4">
                    <span className="text-gray-500 line-through text-xl font-medium">{plan.originalPrice}</span>
                    <span className="ml-3 text-blue-400 font-semibold">年間で¥23,960お得</span>
                  </div>
                )}
                {plan.id === 'monthly' && (
                  <div className="mt-4 text-gray-400 text-lg">
                    月額 ¥6,980
                  </div>
                )}
              </div>

              <div className="mb-12">
                <div className="space-y-5">
                  {plan.features.map((feature, featureIndex) => (
                    <div 
                      key={featureIndex} 
                      className="flex items-start group"
                      style={{ animationDelay: `${(index * 0.1) + (featureIndex * 0.05)}s` }}
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
                disabled={isLoading || user.isSubscribed}
                className={`w-full apple-button ${
                  plan.id === 'yearly'
                    ? 'apple-button-primary text-lg py-4'
                    : 'bg-gray-800/80 text-white border-2 border-gray-700/50 hover:bg-gray-700/80 hover:border-gray-600/50 text-lg py-4'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    <span>処理中...</span>
                  </>
                ) : user.isSubscribed ? (
                  <>
                    <Check className="w-6 h-6 mr-2" />
                    <span>既に会員です</span>
                  </>
                ) : (
                  <span>今すぐ登録</span>
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
        
        {/* 比較セクション */}
        <div className="mt-24 max-w-4xl mx-auto fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="apple-card p-10">
            <h3 className="text-3xl font-bold text-white mb-8 text-center gradient-text">
              プラン比較
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="text-left py-4 text-gray-400 font-semibold">機能</th>
                    <th className="text-center py-4 text-gray-400 font-semibold">月額プラン</th>
                    <th className="text-center py-4 text-blue-400 font-semibold">年額プラン</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800/30">
                    <td className="py-4 text-gray-300">無制限の返信生成</td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800/30">
                    <td className="py-4 text-gray-300">会話履歴の保存</td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800/30">
                    <td className="py-4 text-gray-300">優先サポート</td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 text-gray-300">早期アクセス機能</td>
                    <td className="text-center py-4">
                      <span className="text-gray-500">-</span>
                    </td>
                    <td className="text-center py-4">
                      <Check className="w-5 h-5 text-blue-400 mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center text-gray-500 text-base">
          <p>※ 本サービスはデモ版です。実際の決済処理は実装されていません。</p>
          <p>本番環境では、Stripe等の決済サービスと統合してください。</p>
        </div>
      </main>
      </div>
    </div>
  );
}






