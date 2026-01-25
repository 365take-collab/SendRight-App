'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'ログインに失敗しました');
        setIsLoading(false);
        return;
      }

      // トークンを保存
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);

      // ホームページにリダイレクト
      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('ログインに失敗しました');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            トップに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ログイン</h1>
          <p className="text-gray-600">SendRightにログインしてください</p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          {/* 区切り線 */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-gray-400 text-sm">まだ会員でない方</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* 会員登録リンク */}
          <Link
            href="/subscribe"
            className="block w-full py-3 bg-white border-2 border-pink-300 text-pink-500 font-bold rounded-lg hover:bg-pink-50 transition-all text-center"
          >
            会員登録する
          </Link>
        </div>

        {/* フッター */}
        <p className="text-xs text-gray-500 mt-6 text-center">
          © 2024 SendRight. All rights reserved.
        </p>
      </div>
    </div>
  );
}
