'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function UtageLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Utageからのアクセスのみを許可するため、ログイン処理をスキップして直接ホームページにリダイレクト
    // Utage側で既に認証されているため、SendRight側でのログイン処理は不要
    // ミドルウェアでUtageからのアクセスを確認し、Stripeのサブスクリプション状態を確認する
    
    // セッション情報を設定（Utageからのアクセスであることを示す）
    sessionStorage.setItem('utage_access', 'true');
    
    // クッキーにも設定（ミドルウェアで使用）
    document.cookie = 'utage_access=true; path=/; max-age=' + (30 * 24 * 60 * 60);
    
    // 直接ホームページにリダイレクト
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">SendRightアプリにアクセス中...</p>
        </div>
      </div>
    </div>
  );
}
