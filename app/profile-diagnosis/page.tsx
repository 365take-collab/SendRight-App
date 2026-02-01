'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  FileText, 
  User, 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  Trophy, 
  AlertTriangle, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  RefreshCw
} from 'lucide-react';

interface CheckItem {
  id: string;
  category: 'photo' | 'bio' | 'info';
  title: string;
  description: string;
  tips?: string;
  ngExample?: string;
}

const checkItems: CheckItem[] = [
  // 写真チェック（10項目）
  { id: 'photo_1', category: 'photo', title: '顔がはっきり見える', description: '正面か斜め45度、顔の50%以上が見えている', ngExample: 'マスク、サングラスはNG' },
  { id: 'photo_2', category: 'photo', title: '明るい場所で撮影', description: '自然光がベスト、室内でも明るい場所で', ngExample: '暗い場所、逆光はNG' },
  { id: 'photo_3', category: 'photo', title: '笑顔がある', description: '自然な笑顔、歯を見せなくてもOK', ngExample: '無表情、キメ顔はNG' },
  { id: 'photo_4', category: 'photo', title: '清潔感がある', description: '髪型が整っている、服がシワシワじゃない', ngExample: 'ヨレヨレの服、寝起き風はNG' },
  { id: 'photo_5', category: 'photo', title: '1人で写っている', description: '他の人が写っていない', ngExample: '友達と、元カノとのトリミングはNG' },
  { id: 'photo_6', category: 'photo', title: '全身写真がある', description: '体型が分かる写真、服装のセンスが分かる', tips: 'サブ写真に1枚以上推奨' },
  { id: 'photo_7', category: 'photo', title: '趣味の写真がある', description: '旅行、スポーツ、食事など話題のきっかけになる写真', tips: 'サブ写真に1枚以上推奨' },
  { id: 'photo_8', category: 'photo', title: '日常の写真がある', description: 'カフェ、公園などリラックスした雰囲気', tips: 'サブ写真に1枚以上推奨' },
  { id: 'photo_9', category: 'photo', title: '加工しすぎていない', description: 'フィルター控えめ', ngExample: '別人レベルの加工はNG' },
  { id: 'photo_10', category: 'photo', title: '最近の写真を使っている', description: '1年以内がベスト', ngExample: '3年以上前の写真はNG' },
  
  // 自己紹介文チェック（5項目）
  { id: 'bio_1', category: 'bio', title: '200文字以上ある', description: '短すぎると興味を持ってもらえない', tips: '300〜400文字が理想' },
  { id: 'bio_2', category: 'bio', title: '趣味が3つ以上書いてある', description: '話題のきっかけになる', tips: '「映画」→「洋画、特にSF」など具体的に' },
  { id: 'bio_3', category: 'bio', title: '具体的なエピソードがある', description: '「最近〇〇に行った」「週末は△△をしている」など', tips: '共感を生む内容' },
  { id: 'bio_4', category: 'bio', title: 'ネガティブな表現がない', description: '前向きな内容で書く', ngExample: '「いいね来ない」「〇〇な人は×」など排除表現はNG' },
  { id: 'bio_5', category: 'bio', title: '話しかけやすい話題がある', description: '「〇〇が好きな方、話しましょう！」など', tips: 'メッセージのきっかけを作る' },
  
  // 基本情報チェック（5項目）
  { id: 'info_1', category: 'info', title: '身長を正確に記載', description: 'サバ読みは会った時にバレる', tips: '2cm以内の誤差はOK' },
  { id: 'info_2', category: 'info', title: '職業を記載', description: '具体的すぎなくてOK', tips: '「IT系」「営業職」などでOK' },
  { id: 'info_3', category: 'info', title: '居住地を記載', description: 'デートの場所を想像させる', tips: '「〇〇区」まで書くと◎' },
  { id: 'info_4', category: 'info', title: '年収は空欄でもOK', description: '年収で選ぶ人を避けられる', tips: '書くなら正確に' },
  { id: 'info_5', category: 'info', title: '最終ログインが24時間以内', description: 'アクティブユーザーと見なされる', tips: '毎日1回はログイン' },
];

const getScoreEvaluation = (score: number) => {
  if (score >= 18) return { emoji: '🥇', label: '優秀', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', borderColor: 'border-yellow-700/50', message: 'このまま継続！返信に集中しましょう' };
  if (score >= 14) return { emoji: '🥈', label: '良い', color: 'text-gray-300', bgColor: 'bg-gray-800/50', borderColor: 'border-gray-600/50', message: '1〜2項目を改善するだけで◎' };
  if (score >= 10) return { emoji: '🥉', label: '普通', color: 'text-orange-400', bgColor: 'bg-orange-900/30', borderColor: 'border-orange-700/50', message: '写真と自己紹介文を見直しましょう' };
  if (score >= 6) return { emoji: '⚠️', label: '改善必要', color: 'text-red-400', bgColor: 'bg-red-900/30', borderColor: 'border-red-700/50', message: 'まず写真を5枚以上にしましょう' };
  return { emoji: '🚨', label: '要大幅改善', color: 'text-red-500', bgColor: 'bg-red-900/40', borderColor: 'border-red-600/50', message: '全体的に見直しが必要です' };
};

const getPriorityAdvice = (score: number, checkedItems: string[]) => {
  const uncheckedPhotos = checkItems.filter(item => item.category === 'photo' && !checkedItems.includes(item.id));
  const uncheckedBio = checkItems.filter(item => item.category === 'bio' && !checkedItems.includes(item.id));
  const uncheckedInfo = checkItems.filter(item => item.category === 'info' && !checkedItems.includes(item.id));
  
  const advice: string[] = [];
  
  if (score < 10) {
    // 最優先: メイン写真の改善
    if (uncheckedPhotos.slice(0, 5).length > 0) {
      advice.push('📸 メイン写真を改善しましょう：笑顔・明るい場所・清潔感を意識');
    }
    if (uncheckedPhotos.slice(5).length > 0) {
      advice.push('📷 サブ写真を3枚以上追加しましょう：全身・趣味・日常の写真');
    }
  }
  
  if (score < 14 && uncheckedBio.length > 0) {
    advice.push('✏️ 自己紹介文を充実させましょう：300文字以上、趣味3つ以上、具体的なエピソード');
  }
  
  if (uncheckedInfo.length > 0) {
    advice.push('📝 基本情報を埋めましょう：職業・居住地は必須');
  }
  
  return advice;
};

export default function ProfileDiagnosisPage() {
  const router = useRouter();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('photo');
  const [showResult, setShowResult] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 認証チェック（簡易版）
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('token');

    if (isDevMode || hasToken) {
      setIsAuthenticated(true);
    } else {
      router.push('/login');
    }
    
    // ローカルストレージから診断結果を読み込み
    const savedChecks = localStorage.getItem('profileDiagnosisChecks');
    if (savedChecks) {
      setCheckedItems(JSON.parse(savedChecks));
    }
  }, [router]);

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const newChecked = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      // ローカルストレージに保存
      localStorage.setItem('profileDiagnosisChecks', JSON.stringify(newChecked));
      return newChecked;
    });
  };

  const score = checkedItems.length;
  const evaluation = getScoreEvaluation(score);
  const priorityAdvice = getPriorityAdvice(score, checkedItems);

  const photoChecked = checkItems.filter(item => item.category === 'photo' && checkedItems.includes(item.id)).length;
  const bioChecked = checkItems.filter(item => item.category === 'bio' && checkedItems.includes(item.id)).length;
  const infoChecked = checkItems.filter(item => item.category === 'info' && checkedItems.includes(item.id)).length;

  const resetDiagnosis = () => {
    setCheckedItems([]);
    localStorage.removeItem('profileDiagnosisChecks');
    setShowResult(false);
    setExpandedCategory('photo');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 背景効果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black via-purple-950/20 to-black pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* ヘッダー */}
        <nav className="glass-effect border-b border-gray-900/50 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>戻る</span>
              </Link>
              <h1 className="text-xl font-bold text-white">プロフィール診断</h1>
              <button
                onClick={resetDiagnosis}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                <span>リセット</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* スコアカード */}
          <div className={`${evaluation.bgColor} border ${evaluation.borderColor} rounded-2xl p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{evaluation.emoji}</span>
                <div>
                  <p className={`text-2xl font-bold ${evaluation.color}`}>{score}/20点</p>
                  <p className="text-gray-400">{evaluation.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">診断結果</p>
                <p className="text-white font-medium">{evaluation.message}</p>
              </div>
            </div>
            
            {/* カテゴリ別進捗 */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <Camera className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <p className="text-lg font-bold text-white">{photoChecked}/10</p>
                <p className="text-xs text-gray-400">写真</p>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <FileText className="w-5 h-5 mx-auto mb-1 text-green-400" />
                <p className="text-lg font-bold text-white">{bioChecked}/5</p>
                <p className="text-xs text-gray-400">自己紹介文</p>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <User className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <p className="text-lg font-bold text-white">{infoChecked}/5</p>
                <p className="text-xs text-gray-400">基本情報</p>
              </div>
            </div>
          </div>

          {/* 優先改善アドバイス */}
          {priorityAdvice.length > 0 && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/30 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
                優先して改善すべきポイント
              </h3>
              <ul className="space-y-3">
                {priorityAdvice.map((advice, idx) => (
                  <li key={idx} className="text-gray-300 flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    {advice}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* チェックリスト */}
          <div className="space-y-4">
            {/* 写真チェック */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === 'photo' ? null : 'photo')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Camera className="w-6 h-6 text-blue-400" />
                  <span className="text-lg font-bold text-white">📸 写真チェック</span>
                  <span className="text-sm text-gray-400">({photoChecked}/10)</span>
                </div>
                {expandedCategory === 'photo' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedCategory === 'photo' && (
                <div className="px-6 pb-6 space-y-3">
                  {checkItems.filter(item => item.category === 'photo').map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        checkedItems.includes(item.id)
                          ? 'bg-green-900/30 border-green-700/50'
                          : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {checkedItems.includes(item.id) ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${checkedItems.includes(item.id) ? 'text-green-300' : 'text-white'}`}>
                            {idx + 1}. {item.title}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          {item.ngExample && (
                            <p className="text-xs text-red-400 mt-1">❌ {item.ngExample}</p>
                          )}
                          {item.tips && (
                            <p className="text-xs text-blue-400 mt-1">💡 {item.tips}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 自己紹介文チェック */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === 'bio' ? null : 'bio')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-green-400" />
                  <span className="text-lg font-bold text-white">✏️ 自己紹介文チェック</span>
                  <span className="text-sm text-gray-400">({bioChecked}/5)</span>
                </div>
                {expandedCategory === 'bio' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedCategory === 'bio' && (
                <div className="px-6 pb-6 space-y-3">
                  {checkItems.filter(item => item.category === 'bio').map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        checkedItems.includes(item.id)
                          ? 'bg-green-900/30 border-green-700/50'
                          : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {checkedItems.includes(item.id) ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${checkedItems.includes(item.id) ? 'text-green-300' : 'text-white'}`}>
                            {idx + 11}. {item.title}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          {item.ngExample && (
                            <p className="text-xs text-red-400 mt-1">❌ {item.ngExample}</p>
                          )}
                          {item.tips && (
                            <p className="text-xs text-blue-400 mt-1">💡 {item.tips}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 基本情報チェック */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === 'info' ? null : 'info')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6 text-purple-400" />
                  <span className="text-lg font-bold text-white">📝 基本情報チェック</span>
                  <span className="text-sm text-gray-400">({infoChecked}/5)</span>
                </div>
                {expandedCategory === 'info' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedCategory === 'info' && (
                <div className="px-6 pb-6 space-y-3">
                  {checkItems.filter(item => item.category === 'info').map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        checkedItems.includes(item.id)
                          ? 'bg-green-900/30 border-green-700/50'
                          : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {checkedItems.includes(item.id) ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${checkedItems.includes(item.id) ? 'text-green-300' : 'text-white'}`}>
                            {idx + 16}. {item.title}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          {item.ngExample && (
                            <p className="text-xs text-red-400 mt-1">❌ {item.ngExample}</p>
                          )}
                          {item.tips && (
                            <p className="text-xs text-blue-400 mt-1">💡 {item.tips}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 写真撮影のコツ */}
          <div className="mt-8 bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2 text-blue-400" />
              📸 写真撮影のコツ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">おすすめの場所</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• カフェの窓際</li>
                  <li>• 公園の木陰</li>
                  <li>• 美術館・博物館</li>
                  <li>• 旅行先</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">おすすめの時間帯</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 午前10時〜午後2時（自然光がベスト）</li>
                  <li>• 曇りの日がベスト（影が柔らかい）</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">服装</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 白か青のシャツ（清潔感）</li>
                  <li>• シンプルなジャケット</li>
                  <li className="text-red-400">❌ 派手な柄、黒一色は避ける</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">表情のコツ</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 「チーズ」ではなく「ウイスキー」と言うと自然な笑顔に</li>
                  <li>• 少し口角を上げる意識</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/30 rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">プロフィールを改善したら</h3>
            <p className="text-gray-400 mb-4">次は「返信」で差をつけましょう</p>
            <Link
              href="/"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full hover:from-blue-400 hover:to-purple-400 transition-all active:scale-95"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AIアドバイスを使う
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
