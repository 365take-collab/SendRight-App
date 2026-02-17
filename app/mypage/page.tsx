'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, Crown, Zap, Copy, Check, Loader2, LogOut, CreditCard, User as UserIcon } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  isSubscribed: boolean;
  subscriptionType?: string;
  referralCode?: string;
}

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 契約変更
  const [portalLoading, setPortalLoading] = useState(false);

  // 紹介コードコピー
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        if (!savedToken) {
          router.push('/login');
          return;
        }
        setToken(savedToken);

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (!res.ok) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'パスワードの変更に失敗しました');
        return;
      }

      setPasswordSuccess('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('パスワードの変更に失敗しました');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ returnUrl: '/mypage' }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || '契約管理ページを開けませんでした');
      }
    } catch {
      alert('契約管理ページを開けませんでした');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('sendright_user');
    localStorage.removeItem('sendright_email');
    localStorage.removeItem('profileInfo');
    router.push('/');
  };

  const copyReferralCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const getPlanLabel = (type?: string) => {
    switch (type) {
      case 'premium': return 'プレミアム会員';
      case 'pro': return 'プロ会員';
      case 'basic': return 'ベーシック会員';
      default: return '無料プラン';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ホームに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
        </div>

        {/* アカウント情報 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <UserIcon className="w-5 h-5 mr-2 text-pink-500" />
            アカウント情報
          </h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">メールアドレス</p>
                <p className="text-gray-900 font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center">
              {user?.isSubscribed ? (
                <Crown className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
              ) : (
                <Zap className="w-5 h-5 text-pink-500 mr-3 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-gray-500">プラン</p>
                <p className="text-gray-900 font-medium">{getPlanLabel(user?.subscriptionType)}</p>
              </div>
            </div>

            {user?.referralCode && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Copy className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">紹介コード</p>
                    <p className="text-gray-900 font-medium font-mono">{user.referralCode}</p>
                  </div>
                </div>
                <button
                  onClick={copyReferralCode}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-pink-500" />
            パスワード変更
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                {passwordSuccess}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在のパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8文字以上"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード（確認）
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  変更中...
                </>
              ) : (
                'パスワードを変更する'
              )}
            </button>
          </form>
        </div>

        {/* 契約管理 */}
        {user?.isSubscribed && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-pink-500" />
              契約管理
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              プラン変更・お支払い情報の確認・解約はこちらから行えます。
            </p>
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="w-full py-3 bg-white border-2 border-pink-300 text-pink-500 font-bold rounded-lg hover:bg-pink-50 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {portalLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  読み込み中...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  契約を管理する
                </>
              )}
            </button>
          </div>
        )}

        {/* 未契約の場合のアップグレード案内 */}
        {!user?.isSubscribed && (
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-200 p-8 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-500" />
              プロ会員にアップグレード
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              プロ会員になると、毎日の使用回数が大幅に増えます。
            </p>
            <Link
              href="/subscribe"
              className="block w-full py-3 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold rounded-lg hover:opacity-90 transition-all text-center"
            >
              プランを見る
            </Link>
          </div>
        )}

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-white border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center mb-8"
        >
          <LogOut className="w-5 h-5 mr-2" />
          ログアウト
        </button>

        {/* フッター */}
        <p className="text-xs text-gray-500 text-center">
          © 2024 SendRight. All rights reserved.
        </p>
      </div>
    </div>
  );
}
