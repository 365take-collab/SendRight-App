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
    const token = searchParams.get('token');
    const customerId = searchParams.get('customerId');
    const email = searchParams.get('email');

    console.log('ログインページ - パラメータ確認:', { token, customerId, email });

    if (!email) {
      console.error('メールアドレスが取得できませんでした');
      setStatus('error');
      setErrorMessage('必要なパラメータが不足しています');
      return;
    }

    console.log('ログイン処理を開始します');
    handleLogin(token || '', customerId || '', email);
  }, [searchParams]);

  const handleLogin = async (token: string, customerId: string, email: string) => {
    try {
      console.log('APIリクエストを送信します:', { email, customerId: customerId || 'なし', token: token ? 'あり' : 'なし' });
      
      const response = await fetch('/api/auth/utage-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, customerId, token }),
      });

      console.log('APIレスポンス受信:', { status: response.status, ok: response.ok });

      const data = await response.json();
      console.log('APIレスポンスデータ:', data);

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error || 'ログインに失敗しました');
        return;
      }

      // トークンを保存
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);

      setStatus('success');
      
      // iframe内で動作している場合は、親フレームに通知
      if (window.self !== window.top) {
        // iframe内で動作している場合
        // 親フレームにログイン成功を通知
        window.parent.postMessage({ type: 'premierdate-login-success', token: data.token, userId: data.user.id }, '*');
        
        // iframe内でホームページを表示
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        // 通常のページとして動作している場合
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      setStatus('error');
      setErrorMessage('ログインに失敗しました');
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
            {errorMessage.includes('Subscription is not active') && (
              <p className="text-sm text-gray-500 mt-4">
                サブスクリプションが有効ではありません。<br />
                お問い合わせください。
              </p>
            )}
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
