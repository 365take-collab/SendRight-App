'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Flame, Trophy, Award, ArrowLeft, Gift, Clock, Heart, HelpCircle, Pause, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { getUserStats, UserStats, Badge } from '@/lib/api';

type CancelReason = 'price' | 'not_using' | 'not_working' | 'temporary' | 'other';

interface ReasonOption {
  id: CancelReason;
  label: string;
  description: string;
  offer?: {
    title: string;
    description: string;
    cta: string;
    action: () => void;
  };
}

export default function CancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'reason' | 'stats' | 'offer' | 'confirm'>('reason');
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
  const [stats, setStats] = useState<(UserStats & { badgeDetails: Badge[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  useEffect(() => {
    const fetchStats = async () => {
      if (isDevMode) {
        setStats({
          totalUsageCount: 47,
          successCount: 20,
          successRate: 42,
          level: 4,
          levelName: 'セミプロ',
          badges: ['first_use', 'streak_3', 'usage_10'],
          currentStreak: 12,
          longestStreak: 12,
          subscriptionType: 'pro',
          dailyUsageLimit: 50,
          todayUsageCount: 2,
          todayRemaining: 48,
          badgeDetails: [
            { id: 'first_use', name: '🎯 初使用', description: '初めてAIアドバイスを使った' },
            { id: 'streak_3', name: '🔥 3日連続', description: '3日連続で使用' },
            { id: 'usage_10', name: '📊 10回達成', description: '10回使用' },
          ],
        });
        return;
      }

      if (!token) return;
      
      try {
        const data = await getUserStats(token);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [token, isDevMode]);

  const reasonOptions: ReasonOption[] = [
    {
      id: 'price',
      label: '料金が高い',
      description: '月額料金が負担になっている',
      offer: {
        title: '🎁 特別割引オファー',
        description: '次の3ヶ月間、50%オフでご利用いただけます（月額6,980円 → 3,490円）',
        cta: '50%オフで継続する',
        action: () => {
          // Utageの割引決済ページにリダイレクト
          window.location.href = process.env.NEXT_PUBLIC_UTAGE_DISCOUNT_URL || '/subscribe?discount=50';
        },
      },
    },
    {
      id: 'not_using',
      label: '使いこなせていない',
      description: '機能の使い方がわからない',
      offer: {
        title: '📚 使い方ガイド',
        description: 'より効果的な使い方をご案内します。また、不明点があればサポートにお問い合わせください。',
        cta: '使い方ガイドを見る',
        action: () => {
          router.push('/help');
        },
      },
    },
    {
      id: 'not_working',
      label: '効果を感じない',
      description: '期待した結果が得られない',
      offer: {
        title: '💡 成功事例をご紹介',
        description: '多くのユーザーが成果を出しています。使い方のコツをお伝えします。',
        cta: '成功事例を見る',
        action: () => {
          router.push('/help#success-stories');
        },
      },
    },
    {
      id: 'temporary',
      label: '一時的に不要',
      description: '今は使う予定がない',
      offer: {
        title: '⏸️ 休会オプション',
        description: '最大3ヶ月間、プランを一時停止できます。再開時は同じ条件で継続できます。',
        cta: '休会する（データ保持）',
        action: () => {
          // 休会処理
          alert('休会機能は現在準備中です。サポートにお問い合わせください。');
        },
      },
    },
    {
      id: 'other',
      label: 'その他',
      description: '上記以外の理由',
    },
  ];

  const selectedOption = reasonOptions.find(o => o.id === selectedReason);

  const handleContinue = () => {
    if (step === 'reason' && selectedReason) {
      setStep('stats');
    } else if (step === 'stats') {
      if (selectedOption?.offer) {
        setStep('offer');
      } else {
        setStep('confirm');
      }
    } else if (step === 'offer') {
      setStep('confirm');
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      // Utageの解約ページにリダイレクト
      window.location.href = process.env.NEXT_PUBLIC_UTAGE_CANCEL_URL || '/';
    } catch (error) {
      console.error('Cancel error:', error);
      alert('解約処理中にエラーが発生しました。サポートにお問い合わせください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {/* 戻るボタン */}
        <button
          onClick={() => {
            if (step === 'reason') {
              router.back();
            } else if (step === 'stats') {
              setStep('reason');
            } else if (step === 'offer') {
              setStep('stats');
            } else {
              setStep('offer');
            }
          }}
          className="flex items-center text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </button>

        {/* Step 1: 理由選択 */}
        {step === 'reason' && (
          <div className="fade-in-up">
            <h1 className="text-3xl font-bold text-white mb-4">
              解約前に教えてください
            </h1>
            <p className="text-gray-400 mb-8">
              解約理由を選択してください。より良いサービスのために活用させていただきます。
            </p>

            <div className="space-y-4 mb-8">
              {reasonOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedReason(option.id)}
                  className={`w-full p-5 rounded-xl border text-left transition-all ${
                    selectedReason === option.id
                      ? 'bg-blue-900/30 border-blue-500/50'
                      : 'bg-gray-900/50 border-gray-800/50 hover:bg-gray-800/50'
                  }`}
                >
                  <p className="font-bold text-white">{option.label}</p>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedReason}
              className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        )}

        {/* Step 2: 統計表示（損失の可視化） */}
        {step === 'stats' && stats && (
          <div className="fade-in-up">
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mr-3" />
              <h1 className="text-2xl font-bold text-white">
                解約するとリセットされます
              </h1>
            </div>

            <p className="text-gray-400 mb-8">
              これまでの成果がすべて失われます。本当によろしいですか？
            </p>

            {/* 統計カード */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 rounded-2xl border border-red-900/30 p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center mb-2">
                    <Flame className="w-5 h-5 text-orange-400 mr-2" />
                    <span className="text-sm text-gray-400">連続使用</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.currentStreak}日</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center mb-2">
                    <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
                    <span className="text-sm text-gray-400">最長記録</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.longestStreak}日</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center mb-2">
                    <Award className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-sm text-gray-400">獲得バッジ</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.badges.length}個</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center mb-2">
                    <Heart className="w-5 h-5 text-red-400 mr-2" />
                    <span className="text-sm text-gray-400">成功率</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.successRate}%</p>
                </div>
              </div>

              {/* バッジ一覧 */}
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center text-gray-400 hover:text-white transition-colors text-sm mb-3"
                >
                  <span>獲得バッジを見る</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
                
                {showDetails && (
                  <div className="flex flex-wrap gap-2">
                    {stats.badgeDetails.map((badge) => (
                      <div
                        key={badge.id}
                        className="px-3 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 text-sm text-gray-300"
                      >
                        {badge.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
              >
                継続する
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 py-4 bg-gray-800 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition-all"
              >
                それでも解約する
              </button>
            </div>
          </div>
        )}

        {/* Step 3: オファー提示 */}
        {step === 'offer' && selectedOption?.offer && (
          <div className="fade-in-up">
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl border border-blue-500/30 p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                {selectedOption.offer.title}
              </h2>
              <p className="text-gray-300 mb-6">
                {selectedOption.offer.description}
              </p>
              <button
                onClick={selectedOption.offer.action}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Gift className="w-5 h-5" />
                {selectedOption.offer.cta}
              </button>
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-4 bg-gray-800 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition-all"
            >
              オファーを使わず解約する
            </button>
          </div>
        )}

        {/* Step 4: 最終確認 */}
        {step === 'confirm' && (
          <div className="fade-in-up">
            {/* ダウングレードオファー */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl border border-purple-500/30 p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-3">
                💡 ダウングレードという選択肢
              </h2>
              <p className="text-gray-300 mb-4">
                完全に解約する前に、ベーシックプランへのダウングレードはいかがですか？
              </p>
              <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
                <p className="text-white font-bold">ベーシックプラン</p>
                <p className="text-2xl font-bold text-green-400">月額2,980円</p>
                <p className="text-sm text-gray-400">1日10回まで使用可能・データ引き継ぎ</p>
              </div>
              <button
                onClick={() => {
                  window.location.href = process.env.NEXT_PUBLIC_UTAGE_BASIC_URL || '/subscribe?plan=basic';
                }}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition-all"
              >
                ベーシックプランに変更する
              </button>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-gray-900/80 rounded-2xl border border-red-900/30 p-8 mb-8">
              <div className="flex items-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400 mr-3" />
                <h1 className="text-2xl font-bold text-white">
                  最終確認
                </h1>
              </div>

              <ul className="space-y-3 mb-6 text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  すべての成果データがリセットされます
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  {stats?.currentStreak || 0}日連続のストリークが失われます
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  獲得したバッジがすべて失われます
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  現在の割引価格が適用されなくなる可能性があります
                </li>
              </ul>

              <p className="text-sm text-gray-400 mb-6">
                ※ 再度登録した場合、データは引き継がれません
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
              >
                やっぱり継続する
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-4 bg-red-900/50 border border-red-800/50 text-red-300 font-bold rounded-xl hover:bg-red-900/70 transition-all disabled:opacity-50"
              >
                {isLoading ? '処理中...' : '解約を確定する'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
