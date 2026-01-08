'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function UtageLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const email = searchParams.get('email');

    console.log('ログインページ - パラメータ確認:', { email });

    if (!email) {
      console.error('メールアドレスが取得できませんでした');
      setStatus('error');
      setErrorMessage('メールアドレスが取得できませんでした。会員ページから再度アクセスしてください。');
      return;
    }

    console.log('ログイン処理を開始します');
    handleLogin(email);
  }, [searchParams]);

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

      // Utageアクセスフラグも設定
      document.cookie = `utage_access=true; path=/; max-age=${24 * 60 * 60}; secure; samesite=lax`;
      document.cookie = `utage_access_timestamp=${Date.now()}; path=/; max-age=${24 * 60 * 60}; secure; samesite=lax`;

      setStatus('success');
      
      // ホームページにリダイレクト
      setTimeout(() => {
        router.push('/');
      }, 1000);
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
