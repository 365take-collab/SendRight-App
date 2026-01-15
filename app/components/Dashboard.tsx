'use client';

import { useState, useEffect } from 'react';
import { getUserStats, getStreakInfo, UserStats, StreakInfo, Badge } from '@/lib/api';
import { Flame, Trophy, Target, TrendingUp, Award, ChevronDown, ChevronUp, Zap, Crown, Star, Lock } from 'lucide-react';

interface DashboardProps {
  token: string | null;
  isDevMode: boolean;
}

export default function Dashboard({ token, isDevMode }: DashboardProps) {
  const [stats, setStats] = useState<(UserStats & { badgeDetails: Badge[] }) | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (isDevMode) {
        // 開発モード用のダミーデータ
        setStats({
          totalUsageCount: 47,
          successCount: 20,
          successRate: 42,
          level: 4,
          levelName: 'セミプロ',
          badges: ['first_use', 'streak_3', 'usage_10'],
          currentStreak: 5,
          longestStreak: 12,
          subscriptionType: 'free',
          dailyUsageLimit: 3,
          todayUsageCount: 2,
          todayRemaining: 1,
          badgeDetails: [
            { id: 'first_use', name: '🎯 初使用', description: '初めてAIアドバイスを使った' },
            { id: 'streak_3', name: '🔥 3日連続', description: '3日連続で使用' },
            { id: 'usage_10', name: '📊 10回達成', description: '10回使用' },
          ],
        });
        setStreakInfo({
          currentStreak: 5,
          longestStreak: 12,
          isActiveToday: true,
          willExpireSoon: false,
        });
        setIsLoading(false);
        return;
      }

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const [statsData, streakData] = await Promise.all([
          getUserStats(token),
          getStreakInfo(token),
        ]);
        setStats(statsData);
        setStreakInfo(streakData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, isDevMode]);

  if (isLoading) {
    return (
      <div className="bg-white/80 rounded-2xl border border-pink-100 p-6 animate-pulse shadow-sm">
        <div className="h-6 bg-pink-100 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-pink-100 rounded w-2/3"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const isPaidPlan = stats.subscriptionType !== 'free';
  const progressToNextLevel = Math.min(100, (stats.totalUsageCount % 50) * 2);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-pink-100 overflow-hidden fade-in-up shadow-sm">
      {/* ヘッダー部分（常に表示） */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-pink-50/50 transition-all duration-300"
      >
        <div className="flex items-center space-x-4">
          {/* ストリーク表示 */}
          <div className="flex items-center bg-gradient-to-r from-orange-50 to-red-50 px-4 py-2 rounded-full border border-orange-200">
            <Flame className="w-5 h-5 text-orange-500 mr-2" />
            <span className="text-lg font-bold text-gray-800">{stats.currentStreak}</span>
            <span className="text-sm text-gray-500 ml-1">日連続</span>
          </div>
          
          {/* レベル表示 */}
          <div className="flex items-center bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 rounded-full border border-purple-200">
            <Star className="w-5 h-5 text-purple-500 mr-2" />
            <span className="text-lg font-bold text-gray-800">Lv.{stats.level}</span>
            <span className="text-sm text-gray-500 ml-1">{stats.levelName}</span>
          </div>
          
          {/* 今日の使用回数 */}
          <div className="flex items-center bg-gradient-to-r from-pink-50 to-coral-50 px-4 py-2 rounded-full border border-pink-200">
            <Zap className="w-5 h-5 text-pink-500 mr-2" />
            <span className="text-lg font-bold text-gray-800">{stats.todayRemaining}</span>
            <span className="text-sm text-gray-500 ml-1">/{stats.dailyUsageLimit}回</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {isExpanded ? '閉じる' : '詳細を見る'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* ストリーク警告（途切れそうな場合） */}
      {streakInfo?.willExpireSoon && (
        <div className="mx-6 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-yellow-700 text-sm font-medium flex items-center">
            <Flame className="w-4 h-4 mr-2 animate-pulse" />
            今日使わないと{stats.currentStreak}日連続のストリークが途切れます！
          </p>
        </div>
      )}

      {/* 展開時の詳細表示 */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-pink-100 pt-6">
          {/* 統計カード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 総使用回数 */}
            <div className="bg-pink-50/50 rounded-xl p-4 border border-pink-100">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-pink-500" />
                <span className="text-xs text-gray-500">総計</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.totalUsageCount}</p>
              <p className="text-xs text-gray-500">回使用</p>
            </div>
            
            {/* 成功率 */}
            <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-xs text-gray-500">成功率</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.successRate}%</p>
              <p className="text-xs text-gray-500">{stats.successCount}回成功</p>
            </div>
            
            {/* 最長ストリーク */}
            <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-100">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-xs text-gray-500">最長記録</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.longestStreak}</p>
              <p className="text-xs text-gray-500">日連続</p>
            </div>
            
            {/* バッジ数 */}
            <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-gray-500">バッジ</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.badges.length}</p>
              <p className="text-xs text-gray-500">個獲得</p>
            </div>
          </div>

          {/* レベル進捗バー */}
          <div className="bg-pink-50/50 rounded-xl p-4 border border-pink-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">次のレベルまで</span>
              <span className="text-sm text-gray-500">{progressToNextLevel}%</span>
            </div>
            <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-coral-500 rounded-full transition-all duration-500"
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
          </div>

          {/* 獲得バッジ */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2 text-purple-500" />
              獲得バッジ
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.badgeDetails.map((badge) => (
                <div
                  key={badge.id}
                  className="px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-200 text-sm text-gray-700"
                  title={badge.description}
                >
                  <span>{badge.name}</span>
                </div>
              ))}
              {stats.badges.length === 0 && (
                <p className="text-sm text-gray-500">まだバッジを獲得していません</p>
              )}
            </div>
          </div>

          {/* プラン情報・アップグレード導線 */}
          {!isPaidPlan && (
            <div className="bg-gradient-to-r from-pink-50 to-coral-50 rounded-xl p-5 border border-pink-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                    プロプランにアップグレード
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-gray-400" />
                      1日50回まで使用可能（現在3回）
                    </li>
                    <li className="flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-gray-400" />
                      詳細な分析機能
                    </li>
                    <li className="flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-gray-400" />
                      履歴無制限
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    // Utageの決済ページにリダイレクト
                    window.location.href = process.env.NEXT_PUBLIC_UTAGE_CHECKOUT_URL || '/subscribe';
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold rounded-full hover:from-pink-400 hover:to-coral-400 transition-all active:scale-95 shadow-md"
                >
                  アップグレード
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
