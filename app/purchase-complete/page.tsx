'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, Zap, Star, ArrowRight, Clock, Check, Gift } from 'lucide-react';

// useSearchParamsを使用するコンポーネントを分離
function PurchaseCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15分 = 900秒
  const [showConfetti, setShowConfetti] = useState(true);
  
  const plan = searchParams.get('plan') || 'pro';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    // カウントダウンタイマー
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 紙吹雪エフェクトを3秒後に消す
    setTimeout(() => setShowConfetti(false), 3000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleUpgrade = () => {
    // Utageのアップセル決済ページにリダイレクト
    const upsellUrl = process.env.NEXT_PUBLIC_UTAGE_UPSELL_URL || '/subscribe?upgrade=true';
    window.location.href = upsellUrl;
  };

  const handleSkip = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-black to-purple-950/30"></div>
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"></div>
      
      {/* 紙吹雪エフェクト */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)],
                width: '10px',
                height: '10px',
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {/* 購入完了メッセージ */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            🎉 ご購入ありがとうございます！
          </h1>
          <p className="text-xl text-gray-300">
            SendRight {plan === 'premium' ? 'プレミアム' : 'プロ'}プランへようこそ
          </p>
        </div>

        {/* アップセルオファー */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 rounded-3xl border border-purple-500/30 p-8 mb-8 relative overflow-hidden">
          {/* 限定バッジ */}
          <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-2 rounded-bl-xl">
            🔥 今だけの特別オファー
          </div>

          <div className="text-center mb-8">
            <Gift className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              プレミアムプランへアップグレード
            </h2>
            <p className="text-gray-400">
              今アップグレードすると、ずっと割引価格で使えます
            </p>
          </div>

          {/* カウントダウンタイマー */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Clock className="w-5 h-5 text-red-400" />
            <span className="text-lg text-red-400 font-bold">
              残り時間: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* 価格比較 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-2">通常価格</p>
              <p className="text-2xl font-bold text-gray-500 line-through">¥14,800/月</p>
            </div>
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-500/30">
              <p className="text-sm text-blue-400 mb-2">特別価格（永久）</p>
              <p className="text-2xl font-bold text-white">¥9,800/月</p>
              <p className="text-xs text-green-400">年間60,000円お得！</p>
            </div>
          </div>

          {/* プレミアムプランの特典 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-400" />
              プレミアムプランに含まれるもの
            </h3>
            <ul className="space-y-3">
              {[
                'プロプランの全機能',
                '1日の使用回数が実質無制限（999回）',
                '月1回の個別コンサルティング（15分）',
                '優先サポート',
                'Premier Date プレミアム連携',
                '限定コンテンツ・新機能の先行アクセス',
              ].map((feature, i) => (
                <li key={i} className="flex items-center text-gray-300">
                  <Check className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAボタン */}
          <button
            onClick={handleUpgrade}
            className="w-full py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all active:scale-98 flex items-center justify-center gap-2 mb-4"
          >
            <Star className="w-5 h-5" />
            今すぐアップグレード
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <p className="text-center text-xs text-gray-500">
            ※ このオファーは今だけです。後から通常価格でアップグレードすることもできます。
          </p>
        </div>

        {/* スキップリンク */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors text-sm underline"
          >
            後で検討する（アプリを使い始める）
          </button>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ローディング表示
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">読み込み中...</div>
    </div>
  );
}

// メインコンポーネント（Suspenseでラップ）
export default function PurchaseComplete() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PurchaseCompleteContent />
    </Suspense>
  );
}
