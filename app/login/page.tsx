'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Utageログインページにリダイレクト
    router.replace('/auth/login-utage');
  }, [router]);
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-gray-300 text-lg">Utageログインページにリダイレクト中...</p>
      </div>
    </div>
  );
}






