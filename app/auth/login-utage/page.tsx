'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function UtageLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'input' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [inputEmail, setInputEmail] = useState<string>('');

  useEffect(() => {
    const email = searchParams.get('email');

    console.log('ログインページ - パラメータ確認:', { email });

    // メールアドレスがない、または%mail%のままの場合は入力フォームを表示
    if (!email || email === '%mail%' || email.includes('%')) {
      console.log('メールアドレスが無効なため、入力フォームを表示');
      setStatus('input');
      return;
    }

    // メールアドレスの形式をチェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('メールアドレス形式が無効なため、入力フォームを表示');
      setStatus('input');
      return;
    }

    console.log('ログイン処理を開始します');
    handleLogin(email);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputEmail.trim()) {
      setStatus('loading');
      handleLogin(inputEmail.trim());
    }
  };

  const handleLogin = async (email: string) => {
    try {
      console.log('APIリクエストを送信します:', { email });
      
      const response = await fetch('/api/auth/utage-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('APIレスポンス受信:', { status: response.status, ok: response.ok });

      const data = await response.json();
      console.log('APIレスポンスデータ:', data);

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error || 'ログインに失敗しました');
        return;
      }

      // トークンを保存（クッキーとローカルストレージ両方）
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=lax`;
      document.cookie = `userId=${data.user.id}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=lax`;
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);

      // Utageアクセスフラグも設定（クッキーとsessionStorage両方）
      document.cookie = `utage_access=true; path=/; max-age=${24 * 60 * 60}; secure; samesite=lax`;
      document.cookie = `utage_access_timestamp=${Date.now()}; path=/; max-age=${24 * 60 * 60}; secure; samesite=lax`;
      sessionStorage.setItem('utage_access', 'true');

      setStatus('success');
      
      // ホームページにリダイレクト（即座に）
      window.location.href = '/';
    } catch (error) {
      console.error('Login error:', error);
      setStatus('error');
      setErrorMessage('ログインに失敗しました。しばらく経ってから再度お試しください。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-900 rounded-2xl border border-gray-800">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">SendRightアプリにログイン中...</p>
          </div>
        )}

        {status === 'input' && (
          <div className="text-center">
            <div className="text-blue-400 text-5xl mb-4">📧</div>
            <h2 className="text-gray-200 font-semibold text-xl mb-2">SendRightにログイン</h2>
            <p className="text-sm text-gray-400 mb-6">購入時に登録したメールアドレスを入力してください</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium"
              >
                ログイン
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <p className="text-gray-300 text-lg">ログイン成功しました</p>
            <p className="text-sm text-gray-500 mt-2">ホームページに移動します...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-400 text-5xl mb-4">✗</div>
            <p className="text-gray-200 font-semibold text-lg">ログインに失敗しました</p>
            <p className="text-sm text-gray-400 mt-2">{errorMessage}</p>
            <div className="mt-6">
              <a 
                href={process.env.NEXT_PUBLIC_UTAGE_MEMBER_URL || 'https://utage-system.com/members/prUSVju86L5m/home'}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
              >
                会員ページに戻る
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">読み込み中...</p>
        </div>
      </div>
    </div>
  );
}

export default function UtageLoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UtageLoginContent />
    </Suspense>
  );
}
