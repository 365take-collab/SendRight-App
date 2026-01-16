'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Referral {
  id: string;
  referred_email: string;
  status: string;
  reward_percent: number;
  created_at: string;
  converted_at: string | null;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  currentDiscount: number;
  nextDiscount: { referralsNeeded: number; discount: number } | null;
  referrals: Referral[];
}

export default function ReferralPage() {
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        // localStorageからトークンを取得
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('sendright_user');
        const savedEmail = localStorage.getItem('sendright_email');
        
        let userEmail = '';
        
        // savedUserがあればそこからemailを取得
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            userEmail = parsedUser.email;
          } catch {
            // パースに失敗した場合は無視
          }
        }
        
        // savedEmailがあればそれを使う
        if (!userEmail && savedEmail) {
          userEmail = savedEmail;
        }
        
        // トークンがある場合は/api/auth/meで確認
        if (token && !userEmail) {
          const authRes = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (authRes.ok) {
            const { user } = await authRes.json();
            userEmail = user.email;
          }
        }
        
        // メールアドレスが取得できなかった場合はトップページにリダイレクト
        if (!userEmail) {
          router.push('/');
          return;
        }

        // 紹介データを取得
        const refRes = await fetch(`/api/referral?email=${encodeURIComponent(userEmail)}`);
        if (refRes.ok) {
          const refData = await refRes.json();
          setData(refData);
        }
      } catch (error) {
        console.error('Error fetching referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [router]);

  const copyLink = async () => {
    if (data?.referralLink) {
      try {
        await navigator.clipboard.writeText(data.referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // フォールバック
        const textArea = document.createElement('textarea');
        textArea.value = data.referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const copyMessage = async () => {
    const message = `マッチングアプリで返信に悩んでたら、このサービスいいよ。

俺も使ってるけど、返信に悩む時間が減った。

AIが「何を返せばいいか」と「なぜその返信が良いのか」を教えてくれるから、30分悩んでたのが10秒で返せるようになる。

14日間無料で試せるから、とりあえず見てみて。

${data?.referralLink || 'https://sendright.jp'}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">データを取得できませんでした</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold mb-2">🎁 友達紹介プログラム</h1>
          <p className="text-gray-400">
            友達を紹介すると、翌月の料金が割引になります
          </p>
        </div>

        {/* 現在の報酬 */}
        <div className="bg-gradient-to-r from-purple-600 via-red-500 to-orange-400 p-0.5 rounded-2xl mb-6">
          <div className="bg-black rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">あなたの紹介実績</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-white">{data.referralCount}</div>
                <div className="text-gray-400 text-sm">紹介人数</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-green-400">{data.currentDiscount}%</div>
                <div className="text-gray-400 text-sm">翌月の割引</div>
              </div>
            </div>
            {data.nextDiscount && (
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <p className="text-gray-400">
                  あと<span className="text-white font-bold"> {data.nextDiscount.referralsNeeded}人 </span>
                  紹介で<span className="text-green-400 font-bold"> {data.nextDiscount.discount}%OFF </span>
                  {data.nextDiscount.discount === 100 && '（無料！）'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 報酬ルール */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">報酬ルール</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span>1人紹介</span>
              <span className="text-green-400">翌月10%OFF</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span>2人紹介</span>
              <span className="text-green-400">翌月20%OFF</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span>3人紹介</span>
              <span className="text-green-400">翌月50%OFF</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>5人紹介</span>
              <span className="text-green-400 font-bold">翌月無料！</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            ※ 紹介された友達が有料会員になった場合に報酬が発生します
          </p>
        </div>

        {/* 紹介リンク */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">紹介リンク</h2>
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <code className="text-sm text-gray-300 break-all">{data.referralLink}</code>
          </div>
          <button
            onClick={copyLink}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-red-500 to-orange-400 rounded-full font-semibold"
          >
            {copied ? '✓ コピーしました！' : '紹介リンクをコピー'}
          </button>
        </div>

        {/* 友達に送るメッセージ */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">友達に送るメッセージ</h2>
          <div className="bg-gray-800 rounded-xl p-4 mb-4 text-sm text-gray-300 whitespace-pre-line">
            マッチングアプリで返信に悩んでたら、このサービスいいよ。{'\n\n'}
            俺も使ってるけど、返信に悩む時間が減った。{'\n\n'}
            AIが「何を返せばいいか」と「なぜその返信が良いのか」を教えてくれるから、30分悩んでたのが10秒で返せるようになる。{'\n\n'}
            14日間無料で試せるから、とりあえず見てみて。{'\n\n'}
            {data.referralLink}
          </div>
          <button
            onClick={copyMessage}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-full font-semibold transition-colors"
          >
            {copiedMessage ? '✓ コピーしました！' : 'メッセージをコピー'}
          </button>
        </div>

        {/* シェアボタン */}
        <div className="flex gap-4 mb-6">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              'マッチングアプリで返信に悩んでたら、このサービスいいよ。14日間無料で試せるから、とりあえず見てみて。'
            )}&url=${encodeURIComponent(data.referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-[#1DA1F2] rounded-full text-center font-semibold"
          >
            Xでシェア
          </a>
          <a
            href={`https://line.me/R/msg/text/?${encodeURIComponent(
              `マッチングアプリで返信に悩んでたら、このサービスいいよ。14日間無料で試せるから、とりあえず見てみて。\n${data.referralLink}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-[#00B900] rounded-full text-center font-semibold"
          >
            LINEでシェア
          </a>
        </div>

        {/* 紹介履歴 */}
        {data.referrals.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">紹介履歴</h2>
            <div className="space-y-3">
              {data.referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex justify-between items-center py-3 border-b border-gray-800 last:border-b-0"
                >
                  <div>
                    <div className="text-gray-300">
                      {referral.referred_email.replace(/(.{2}).*(@.*)/, '$1***$2')}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {new Date(referral.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <div>
                    {referral.status === 'converted' ? (
                      <span className="text-green-400 text-sm">
                        ✓ 有料転換（{referral.reward_percent}%OFF獲得）
                      </span>
                    ) : (
                      <span className="text-yellow-400 text-sm">トライアル中</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
