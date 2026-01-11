'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateAIResponse, getCurrentUser, User, extractTextFromImage, AlternativeResponse, getUsageLimit } from '@/lib/api';
import { MessageSquare, LogOut, Crown, Loader2, Mic, MicOff, Image as ImageIcon, X, User as UserIcon, ChevronDown, ChevronUp, Save, Sparkles, ThumbsUp, ThumbsDown, RefreshCw, HelpCircle, Flame, Zap, ClipboardCheck } from 'lucide-react';
import OnboardingModal from '@/app/components/OnboardingModal';
import Dashboard from '@/app/components/Dashboard';
import { recordSuccess } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [herMessage, setHerMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fullConversationText, setFullConversationText] = useState<string>(''); // 画像から抽出した会話全体のテキスト
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileInfo, setProfileInfo] = useState({
    name: '',
    age: '',
    relationship: '',
    interests: '',
    personality: '',
    context: '',
  });
  const [alternativeResponses, setAlternativeResponses] = useState<AlternativeResponse[]>([]);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number | null>(null);
  const [usageInfo, setUsageInfo] = useState<{ todayCount: number; limit: number; remaining: number } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';


  useEffect(() => {
    // ローカルストレージから前提情報を読み込む
    const savedProfileInfo = localStorage.getItem('profileInfo');
    if (savedProfileInfo) {
      try {
        setProfileInfo(JSON.parse(savedProfileInfo));
      } catch (e) {
        console.error('Failed to load profile info:', e);
      }
    }

    // Utage決済完了後のコールバック処理
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('upgrade_success') === 'true') {
      const limit = urlParams.get('limit');
      if (limit) {
        alert(`使用回数制限を${limit}回に増やしました！`);
        // URLパラメータをクリーンアップ
        window.history.replaceState({}, '', window.location.pathname);
        // 使用回数情報を再取得
        const currentToken = token || localStorage.getItem('token');
        if (currentToken && !isDevMode) {
          getUsageLimit(currentToken)
            .then(data => {
              setUsageInfo(data.usageInfo);
            })
            .catch(err => {
              console.error('Failed to get usage limit:', err);
            });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空の依存配列で一度だけ実行

  useEffect(() => {
    // Utageからのアクセスかチェック
    const isUtageAccess = sessionStorage.getItem('utage_access') === 'true' || 
                          document.referrer.includes('utage-system.com') ||
                          document.referrer.includes('utage.jp') ||
                          document.referrer.includes('utage.co.jp');

    // 開発環境では認証をスキップ
    if (isDevMode) {
      // 開発モード: ダミーユーザーを設定
      setUser({
        id: 'dev-user',
        email: 'dev@example.com',
        isSubscribed: true,
      });
      setToken('dev-token');
    } else if (isUtageAccess) {
      // Utageからのアクセス: 認証をスキップしてダミーユーザーを設定
      // Utage側で既に認証されているため、SendRight側でのログイン処理は不要
      setUser({
        id: 'utage-user',
        email: 'utage@example.com',
        isSubscribed: true, // Utage側でサブスクリプション状態を管理
      });
      setToken('utage-token');
    } else {
      // Utage以外からのアクセス: 拒否（ミドルウェアで既に拒否されているはず）
      router.push('/auth/login-utage');
    }

    // 使用回数情報を取得（開発モードでない場合）
    if (!isDevMode) {
      // tokenが設定されるまで待つ
      const fetchUsageInfo = async () => {
        const currentToken = token || localStorage.getItem('token');
        if (currentToken) {
          try {
            const data = await getUsageLimit(currentToken);
            setUsageInfo(data.usageInfo);
          } catch (err) {
            console.error('Failed to get usage limit:', err);
            // エラーが発生した場合でも、デフォルト値を設定
            setUsageInfo({
              todayCount: 0,
              limit: 50,
              remaining: 50,
            });
          }
        } else {
          // tokenがない場合でも、デフォルト値を設定（表示用）
          setUsageInfo({
            todayCount: 0,
            limit: 50,
            remaining: 50,
          });
        }
      };
      
      // 少し遅延させてから実行（tokenが設定されるのを待つ）
      setTimeout(fetchUsageInfo, 100);
    }

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const hasWebkit = 'webkitSpeechRecognition' in window;
      const hasStandard = 'SpeechRecognition' in window;
      
      if (hasWebkit || hasStandard) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition() as any;
          recognition.lang = 'ja-JP';
          recognition.continuous = false;
          recognition.interimResults = false;

          recognition.onstart = () => {
            console.log('音声認識を開始しました');
            setIsListening(true);
            setError('');
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log('音声認識結果:', event);
            if (event.results && event.results.length > 0 && event.results[0].length > 0) {
              const transcript = event.results[0][0].transcript;
              console.log('認識されたテキスト:', transcript);
              setHerMessage((prev) => prev + (prev ? ' ' : '') + transcript);
            }
            setIsListening(false);
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error, event.message);
            let errorMessage = '音声認識エラーが発生しました';
            
            switch (event.error) {
              case 'no-speech':
                errorMessage = '音声が検出されませんでした。もう一度お試しください。';
                break;
              case 'audio-capture':
                errorMessage = 'マイクが見つかりません。マイクが接続されているか確認してください。';
                break;
              case 'not-allowed':
                errorMessage = 'マイクの使用が許可されていません。ブラウザの設定でマイクへのアクセスを許可してください。';
                break;
              case 'network':
                errorMessage = 'ネットワークエラーが発生しました。';
                break;
              case 'aborted':
                errorMessage = '音声認識が中断されました。';
                break;
              default:
                errorMessage = `音声認識エラー: ${event.error}`;
            }
            
            setError(errorMessage);
            setIsListening(false);
          };

          recognition.onend = () => {
            console.log('音声認識が終了しました');
            setIsListening(false);
          };

          recognitionRef.current = recognition;
          setIsSpeechSupported(true);
          console.log('音声認識が初期化されました');
        } catch (err) {
          console.error('音声認識の初期化に失敗しました:', err);
          setError('音声認識の初期化に失敗しました');
          setIsSpeechSupported(false);
        }
      } else {
        console.warn('このブラウザでは音声認識がサポートされていません');
        setIsSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [router, isDevMode]);

  const loadUser = async (userToken: string) => {
    try {
      const data = await getCurrentUser(userToken);
      setUser(data.user);
      if (!data.user.isSubscribed) {
        setError('有効なサブスクリプションが必要です');
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      // ユーザーが見つからない場合は、トークンをクリアしてログインページにリダイレクト
      localStorage.removeItem('token');
      // エラーメッセージを表示してからリダイレクト
      if (err instanceof Error && err.message.includes('ユーザーが見つかりません')) {
        alert('セッションが切れました。再度ログインしてください。\n\n※ 開発環境では、サーバー再起動時にデータがリセットされます。');
      }
      router.push('/auth/login-utage');
    }
  };

  const handleGenerate = async () => {
    if (!herMessage.trim()) {
      setError('メッセージを入力してください');
      return;
    }

    // 無料プランでも使用可能（制限付き）
    if (!isDevMode && !token) {
      setError('ログインが必要です');
      return;
    }
    
    // 使用回数制限のチェック
    if (!isDevMode && usageInfo && usageInfo.remaining === 0) {
      setError('今日の無料アドバイスを使い切りました。アップグレードするか、明日またお試しください。');
      return;
    }

    setIsLoading(true);
    setError('');
    setAiResponse('');
    setAiExplanation('');

    try {
      // 前提情報を文字列に変換
      const profileContext = Object.values(profileInfo).some(v => v.trim()) 
        ? `【前提情報】\n${profileInfo.name ? `名前: ${profileInfo.name}\n` : ''}${profileInfo.age ? `年齢: ${profileInfo.age}\n` : ''}${profileInfo.relationship ? `関係性: ${profileInfo.relationship}\n` : ''}${profileInfo.interests ? `趣味・好み: ${profileInfo.interests}\n` : ''}${profileInfo.personality ? `性格・特徴: ${profileInfo.personality}\n` : ''}${profileInfo.context ? `会話の文脈・背景: ${profileInfo.context}\n` : ''}`
        : undefined;
      
      // 会話全体のテキストがある場合はそれを使用（画像から抽出した会話全体）
      const result = await generateAIResponse(
        token || 'dev-token', 
        herMessage, 
        undefined, // 会話履歴は使わない
        undefined, // toneは使わない
        fullConversationText || undefined, // 画像から抽出した会話全体のテキストを渡す
        profileContext // 前提情報を渡す
      );
      setAiResponse(result.response);
      setAiExplanation(result.explanation);
      setAlternativeResponses(result.alternatives || []);
      setSelectedResponseIndex(null);
      
      // 使用回数情報を更新
      if (result.usageInfo) {
        setUsageInfo(result.usageInfo);
      } else if (!isDevMode) {
        // usageInfoが返されない場合、再度取得を試みる
        const currentToken = token || localStorage.getItem('token');
        if (currentToken) {
          getUsageLimit(currentToken)
            .then(data => {
              setUsageInfo(data.usageInfo);
            })
            .catch(err => {
              console.error('Failed to get usage limit after generation:', err);
            });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '返信の生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login-utage');
  };

  const handleStartListening = async () => {
    if (!recognitionRef.current) {
      setError('このブラウザでは音声認識がサポートされていません。Chrome、Edge、またはSafariをお使いください。');
      return;
    }

    // マイクの許可を確認
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 許可確認後すぐに停止
      console.log('マイクの許可が確認されました');
    } catch (err: any) {
      console.error('マイクの許可エラー:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('マイクの使用が許可されていません。ブラウザの設定でマイクへのアクセスを許可してください。');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('マイクが見つかりません。マイクが接続されているか確認してください。');
      } else {
        setError(`マイクアクセスエラー: ${err.message || err.name}`);
      }
      return;
    }

    try {
      console.log('音声認識を開始します...');
      recognitionRef.current.start();
      setError('');
    } catch (err: any) {
      console.error('音声認識の開始に失敗:', err);
      if (err.name === 'InvalidStateError') {
        setError('音声認識は既に実行中です。');
      } else {
        setError(`音声認識を開始できませんでした: ${err.message || err.name}`);
      }
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('画像サイズは10MB以下にしてください');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      // 画像をJPEG形式に変換し、サイズを最適化する関数
      const convertToJpeg = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          const reader = new FileReader();
          
          reader.onload = (e) => {
            img.onload = () => {
              // 最大幅を1920pxに制限
              const maxWidth = 1920;
              const maxHeight = 1920;
              let { width, height } = img;
              
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }
              
              // Canvasで画像を変換
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                reject(new Error('Canvas context を取得できませんでした'));
                return;
              }
              
              // 白い背景を描画（透過PNG対策）
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
              
              // 画像を描画
              ctx.drawImage(img, 0, 0, width, height);
              
              // JPEG形式でBase64に変換（品質85%）
              const jpegBase64 = canvas.toDataURL('image/jpeg', 0.85);
              resolve(jpegBase64);
            };
            
            img.onerror = () => {
              reject(new Error('画像の読み込みに失敗しました'));
            };
            
            img.src = e.target?.result as string;
          };
          
          reader.onerror = () => {
            reject(new Error('ファイルの読み込みに失敗しました'));
          };
          
          reader.readAsDataURL(file);
        });
      };

      // 画像をJPEG形式に変換
      const base64String = await convertToJpeg(file);
      setUploadedImage(base64String);

      // Extract text from image
      try {
        console.log('画像からテキストを抽出中...', { hasToken: !!token, isDevMode });
        const result = await extractTextFromImage(token || 'dev-token', base64String);
        console.log('抽出結果:', result);
        if (result.message && result.message.length > 0) {
          setHerMessage(result.message);
          // 会話全体のテキストを保存（返信生成時に使用）
          if (result.extractedText && result.extractedText.length > 0) {
            setFullConversationText(result.extractedText);
            console.log('会話全体のテキストを保存:', result.extractedText.substring(0, 100) + '...');
          }
          setError('');
          
          // 自動的に返信を生成
          setTimeout(async () => {
            try {
              setIsLoading(true);
              setError('');
              setAiResponse('');
              setAiExplanation('');
              
              // 前提情報を文字列に変換
              const profileContext = Object.values(profileInfo).some(v => v.trim()) 
                ? `【前提情報】\n${profileInfo.name ? `名前: ${profileInfo.name}\n` : ''}${profileInfo.age ? `年齢: ${profileInfo.age}\n` : ''}${profileInfo.relationship ? `関係性: ${profileInfo.relationship}\n` : ''}${profileInfo.interests ? `趣味・好み: ${profileInfo.interests}\n` : ''}${profileInfo.personality ? `性格・特徴: ${profileInfo.personality}\n` : ''}${profileInfo.context ? `会話の文脈・背景: ${profileInfo.context}\n` : ''}`
                : undefined;
              
              const responseResult = await generateAIResponse(
                token || 'dev-token', 
                result.message, 
                undefined,
                undefined,
                result.extractedText || undefined,
                profileContext
              );
              setAiResponse(responseResult.response);
              setAiExplanation(responseResult.explanation);
              setAlternativeResponses(responseResult.alternatives || []);
            } catch (err) {
              setError(err instanceof Error ? err.message : '返信の生成に失敗しました');
            } finally {
              setIsLoading(false);
            }
          }, 500); // 少し待ってから実行（UI更新のため）
        } else {
          // エラーメッセージがある場合はそれを使用、ない場合はデフォルトメッセージ
          const errorMsg = result.error || 'メッセージを抽出できませんでした。\n\n以下の点を確認してください：\n1. 画像がLINEやDMの会話画面であること\n2. 画像が鮮明で、テキストが読み取れること\n3. メッセージが表示されていること\n4. 画像サイズが10MB以下であること';
          setError(errorMsg);
        }
      } catch (err) {
        console.error('テキスト抽出エラー:', err);
        const errorMessage = err instanceof Error ? err.message : 'テキストの抽出に失敗しました';
        setError(`${errorMessage}\n\n画像を確認して、再度お試しください。`);
      } finally {
        setIsExtracting(false);
      }
    } catch (err) {
      setError('画像の処理に失敗しました');
      setIsExtracting(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfileInfo = () => {
    localStorage.setItem('profileInfo', JSON.stringify(profileInfo));
    alert('前提情報を保存しました');
  };

  if (!user && !isDevMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 背景の微細なグラデーション効果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black via-purple-950/20 to-black pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* パーティクル背景 */}
      <div className="particle-bg">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10">
      <nav className="glass-effect border-b border-gray-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3">
                <img 
                  src="/sendright-logo.svg" 
                  alt="SendRight" 
                  className="h-12 w-auto"
                />
              </Link>
              <Link
                href="/help"
                className="flex items-center text-gray-400 hover:text-white transition-colors"
                title="使い方ガイド"
              >
                <HelpCircle className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              {(user || isDevMode) ? (
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-base text-gray-300 font-medium">
                    {user?.isSubscribed ? (
                      <Crown className="w-5 h-5 mr-2 text-yellow-400" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2 text-blue-400" />
                    )}
                    {isDevMode ? '開発モード' : user?.isSubscribed ? 'プロ会員' : '無料プラン'}
                  </span>
                  {usageInfo && !isDevMode && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center text-sm text-gray-400 font-medium">
                        <span className="mr-1">今日の使用回数:</span>
                        <span className={`font-bold ${usageInfo.remaining <= 10 ? 'text-red-400' : usageInfo.remaining <= 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {usageInfo.todayCount}/{usageInfo.limit}回
                        </span>
                        <span className="ml-1 text-gray-500">(残り{usageInfo.remaining}回)</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        1日の制限: {usageInfo.limit}回
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                !isDevMode && (
                  <button
                    onClick={() => router.push('/subscribe')}
                    className="apple-button-primary"
                  >
                    会員登録
                  </button>
                )
              )}
              {!isDevMode && (
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-300 hover:text-white transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  ログアウト
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <OnboardingModal />
        
        {/* ダッシュボード（ストリーク・統計表示） */}
        <div className="mb-8">
          <Dashboard token={token} isDevMode={isDevMode} />
        </div>
        
        {/* プロフィール診断へのリンク */}
        <Link
          href="/profile-diagnosis"
          className="mb-8 block p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl border border-purple-700/30 hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <ClipboardCheck className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                  🎁 プロフィール診断（特典）
                </h3>
                <p className="text-sm text-gray-400">20項目チェックでマッチング率UP</p>
              </div>
            </div>
            <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
        
        <div className="apple-card apple-glow p-10 sm:p-12 fade-in-up">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-5xl sm:text-6xl font-bold text-white tracking-tight gradient-text">
              返信を生成
            </h2>
            <Link
              href="/help"
              className="flex items-center text-gray-400 hover:text-white transition-colors text-sm"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              使い方を見る
            </Link>
          </div>

          {error && (
            <div className="mb-8 p-6 bg-red-900/30 border border-red-800/50 rounded-2xl text-red-300">
              <p className="mb-4 text-lg">{error}</p>
              {usageInfo && usageInfo.remaining === 0 && !isDevMode && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full text-sm hover:from-blue-400 hover:to-purple-400 transition-all"
                >
                  アップグレードして制限を解除
                </button>
              )}
            </div>
          )}

          <div className="space-y-10">
            {/* 前提情報セクション */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden fade-in-up" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() => setShowProfileInfo(!showProfileInfo)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-all duration-300 bg-gradient-to-r from-gray-900/60 to-gray-950/60 rounded-2xl border border-gray-800/50 hover:border-blue-500/30 hover:shadow-lg"
              >
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-5 h-5 text-blue-400 float-animation" />
                  <span className="text-lg font-bold text-white tracking-tight gradient-text-strong">
                    パーソナライズ設定
                  </span>
                </div>
                {showProfileInfo ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 transition-transform duration-300" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 transition-transform duration-300" />
                )}
              </button>
              
              {showProfileInfo && (
                <div className="px-6 py-6 space-y-6 border-t border-gray-800/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        名前
                      </label>
                      <input
                        type="text"
                        value={profileInfo.name}
                        onChange={(e) => setProfileInfo({ ...profileInfo, name: e.target.value })}
                        placeholder="例: 美咲"
                        className="apple-tv-input w-full px-4 py-3 text-white rounded-xl placeholder:text-gray-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        年齢
                      </label>
                      <input
                        type="text"
                        value={profileInfo.age}
                        onChange={(e) => setProfileInfo({ ...profileInfo, age: e.target.value })}
                        placeholder="例: 24歳"
                        className="apple-tv-input w-full px-4 py-3 text-white rounded-xl placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      関係性
                    </label>
                    <input
                      type="text"
                      value={profileInfo.relationship}
                      onChange={(e) => setProfileInfo({ ...profileInfo, relationship: e.target.value })}
                      placeholder="例: 知人、友人、デート中、付き合っている、など"
                      className="apple-tv-input w-full px-4 py-3 text-white rounded-xl placeholder:text-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      趣味・好み
                    </label>
                    <textarea
                      value={profileInfo.interests}
                      onChange={(e) => setProfileInfo({ ...profileInfo, interests: e.target.value })}
                      placeholder="例: カフェ巡り、映画鑑賞、読書、スポーツ観戦など"
                      rows={2}
                      className="apple-tv-input w-full px-4 py-3 text-white rounded-xl placeholder:text-gray-500 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      性格・特徴
                    </label>
                    <textarea
                      value={profileInfo.personality}
                      onChange={(e) => setProfileInfo({ ...profileInfo, personality: e.target.value })}
                      placeholder="例: 明るい、控えめ、積極的、など"
                      rows={2}
                      className="apple-tv-input w-full px-4 py-3 text-white rounded-xl placeholder:text-gray-500 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      会話の文脈・背景
                    </label>
                    <textarea
                      value={profileInfo.context}
                      onChange={(e) => setProfileInfo({ ...profileInfo, context: e.target.value })}
                      placeholder="例: 最近知り合った、共通の友人がいる、仕事関係、など"
                      rows={2}
                      className="apple-tv-input w-full px-4 py-3 text-white rounded-xl placeholder:text-gray-500 resize-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleSaveProfileInfo}
                    className="w-full apple-button-primary flex items-center justify-center"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    前提情報を保存
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-semibold text-white tracking-tight">
                  彼女からのメッセージ
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    テキスト
                  </span>
                  <span className="flex items-center">
                    <Mic className="w-4 h-4 mr-1" />
                    音声
                  </span>
                  <span className="flex items-center">
                    <ImageIcon className="w-4 h-4 mr-1" />
                    画像
                  </span>
                </div>
              </div>
              
              {/* 画像アップロード */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={(!user && !isDevMode) || isExtracting || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center px-6 py-3.5 border rounded-full cursor-pointer transition-all duration-300 font-medium ${
                    (!user && !isDevMode) || isExtracting || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)
                      ? 'bg-gray-900 text-gray-500 cursor-not-allowed border-gray-800'
                      : 'bg-gray-900/50 text-gray-200 hover:bg-gray-800/70 border-gray-700 hover:border-gray-600 active:scale-95'
                  }`}
                >
                  <ImageIcon className="w-5 h-5 mr-3" />
                  {isExtracting ? 'テキスト抽出中...' : 'スクリーンショットをアップロード'}
                </label>
                {uploadedImage && (
                  <div className="mt-6 relative inline-block">
                    <img
                      src={uploadedImage}
                      alt="アップロードされた画像"
                      className="max-w-full h-auto max-h-80 rounded-2xl border border-gray-800 shadow-2xl"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-400 transition-all active:scale-95 shadow-xl"
                      disabled={isExtracting}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {isExtracting && (
                  <div className="mt-4 flex items-center text-blue-400">
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span className="text-base font-medium">画像からテキストを抽出中...</span>
                  </div>
                )}
                {fullConversationText && (
                  <div className="mt-6 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
                    <p className="text-sm text-gray-400 mb-3 font-medium">📝 会話全体を読み取りました（返信生成時に使用されます）</p>
                    <div className="text-sm text-gray-300 max-h-[300px] min-h-[50px] overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap leading-relaxed pr-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                      <div className="pb-2">
                        {fullConversationText}
                      </div>
                    </div>
                    <button
                      onClick={() => setFullConversationText('')}
                      className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      クリア
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={herMessage}
                  onChange={(e) => setHerMessage(e.target.value)}
                  placeholder="例: おはよう！今日は何してる？"
                  className="apple-tv-input w-full px-6 py-4 pr-14 text-white rounded-2xl resize-none placeholder:text-gray-500 text-lg"
                  rows={5}
                  disabled={(!user && !isDevMode) || isLoading || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                />
                <button
                  type="button"
                  onClick={isListening ? handleStopListening : handleStartListening}
                  disabled={(!user && !isDevMode) || isLoading || !isSpeechSupported || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                  className={`absolute right-4 top-4 p-3 rounded-full transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-400'
                      : isSpeechSupported
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                  } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                  title={
                    !isSpeechSupported
                      ? 'このブラウザでは音声認識がサポートされていません'
                      : isListening
                      ? '音声認識を停止'
                      : '音声入力'
                  }
                >
                  {isListening ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </button>
              </div>
              {isListening && (
                <p className="mt-4 text-base text-blue-400 flex items-center font-medium">
                  <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full mr-3 animate-pulse"></span>
                  音声を聞いています...
                </p>
              )}
            </div>

            <div className="space-y-3">
              {usageInfo && !isDevMode && usageInfo.remaining <= 5 && usageInfo.remaining > 0 && (
                <div className="p-4 bg-yellow-900/30 border border-yellow-800/50 rounded-xl text-yellow-300">
                  <p className="text-sm font-medium mb-2">
                    ⚠️ 残り使用回数が少なくなっています: {usageInfo.remaining}回（制限: {usageInfo.limit}回/日）
                  </p>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs underline hover:no-underline text-yellow-400"
                  >
                    追加課金で使用回数を増やす
                  </button>
                </div>
              )}
              {usageInfo && !isDevMode && usageInfo.remaining === 0 && (
                <div className="p-5 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl">
                  <div className="flex items-start">
                    <Zap className="w-6 h-6 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold mb-1">
                        今日の無料アドバイスを使い切りました
                      </p>
                      <p className="text-sm text-gray-400 mb-3">
                        {usageInfo.limit === 3 ? (
                          <>プロプランにアップグレードすると、1日50回まで使えます</>
                        ) : (
                          <>明日またお試しいただくか、プランをアップグレードしてください</>
                        )}
                      </p>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full text-sm hover:from-blue-400 hover:to-purple-400 transition-all active:scale-95"
                      >
                        アップグレードする
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={(!user && !isDevMode) || isLoading || !herMessage.trim() || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                className="w-full apple-button-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    <span className="text-lg">生成中...</span>
                  </>
                ) : (
                  <span className="text-lg relative z-10">返信を生成</span>
                )}
              </button>
            </div>

            {aiResponse && (
              <>
                <div className="mt-10 fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white tracking-tight gradient-text">返信候補（3案）</h3>
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const profileContext = Object.values(profileInfo).some(v => v.trim()) 
                            ? `【前提情報】\n${profileInfo.name ? `名前: ${profileInfo.name}\n` : ''}${profileInfo.age ? `年齢: ${profileInfo.age}\n` : ''}${profileInfo.relationship ? `関係性: ${profileInfo.relationship}\n` : ''}${profileInfo.interests ? `趣味・好み: ${profileInfo.interests}\n` : ''}${profileInfo.personality ? `性格・特徴: ${profileInfo.personality}\n` : ''}${profileInfo.context ? `会話の文脈・背景: ${profileInfo.context}\n` : ''}`
                            : undefined;
                          const result = await generateAIResponse(
                            token || 'dev-token', 
                            herMessage, 
                            undefined,
                            undefined,
                            fullConversationText || undefined,
                            profileContext
                          );
                          setAiResponse(result.response);
                          setAiExplanation(result.explanation);
                          setAlternativeResponses(result.alternatives || []);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : '返信の再生成に失敗しました');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="flex items-center px-4 py-2 bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-full hover:bg-gray-700/50 transition-all text-sm"
                      disabled={isLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      再生成
                    </button>
                  </div>
                  
                  {/* 全ての返信候補を同列で表示 */}
                  <div className="space-y-4">
                    {/* メインの返信候補（候補1） */}
                    <div className={`p-6 rounded-xl border transition-all ${
                      selectedResponseIndex === null
                        ? 'bg-blue-900/30 border-blue-500/50'
                        : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                    }`}>
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-2 font-medium">候補1</p>
                        <p className="text-gray-100 whitespace-pre-wrap text-lg font-medium mb-3">{aiResponse}</p>
                      </div>
                      <div className="pt-3 border-t border-gray-700/50">
                        <p className="text-sm text-gray-400 mb-2 font-medium">📝 解説</p>
                        <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{aiExplanation}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-700/50">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiResponse);
                            alert('クリップボードにコピーしました');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-800/80 border border-gray-700/50 text-gray-200 rounded-full hover:bg-gray-700/80 hover:border-gray-600 transition-all active:scale-95 text-sm font-medium"
                        >
                          コピー
                        </button>
                          <button
                            onClick={async () => {
                              const feedback = { response: aiResponse, rating: 'good', timestamp: Date.now() };
                              const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                              savedFeedback.push(feedback);
                              localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                              
                              // 成功を記録（バッジ獲得のため）
                              if (token && !isDevMode) {
                                try {
                                  const result = await recordSuccess(token);
                                  if (result.newBadges && result.newBadges.length > 0) {
                                    alert(`🎉 新しいバッジを獲得しました！\n${result.newBadgeDetails.map(b => b.name).join(', ')}`);
                                  } else {
                                    alert('評価を保存しました！成功率: ' + result.successRate + '%');
                                  }
                                } catch (err) {
                                  console.error('Failed to record success:', err);
                                  alert('評価を保存しました');
                                }
                              } else {
                                alert('評価を保存しました');
                              }
                            }}
                            className="px-3 py-2 bg-green-900/30 border border-green-800/50 text-green-300 rounded-full hover:bg-green-900/40 transition-all active:scale-95"
                            title="この返信が良かった"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                        <button
                          onClick={() => {
                            const feedback = { response: aiResponse, rating: 'bad', timestamp: Date.now() };
                            const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                            savedFeedback.push(feedback);
                            localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                            alert('評価を保存しました。改善に活用します。');
                          }}
                          className="px-3 py-2 bg-red-900/30 border border-red-800/50 text-red-300 rounded-full hover:bg-red-900/40 transition-all active:scale-95"
                          title="この返信を改善したい"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* 代替返信候補（候補2、3） */}
                    {alternativeResponses.map((alt, idx) => (
                      <div
                        key={idx}
                        className={`p-6 rounded-xl border transition-all ${
                          selectedResponseIndex === idx
                            ? 'bg-blue-900/30 border-blue-500/50'
                            : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2 font-medium">候補{idx + 2}</p>
                          <p className="text-gray-100 whitespace-pre-wrap text-lg font-medium mb-3">{alt.response}</p>
                        </div>
                        <div className="pt-3 border-t border-gray-700/50">
                          <p className="text-sm text-gray-400 mb-2 font-medium">📝 解説</p>
                          <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{alt.explanation}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-700/50">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(alt.response);
                              alert('クリップボードにコピーしました');
                            }}
                            className="flex-1 px-4 py-2 bg-gray-800/80 border border-gray-700/50 text-gray-200 rounded-full hover:bg-gray-700/80 hover:border-gray-600 transition-all active:scale-95 text-sm font-medium"
                          >
                            コピー
                          </button>
                          <button
                            onClick={() => {
                              const feedback = { response: alt.response, rating: 'good', timestamp: Date.now() };
                              const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                              savedFeedback.push(feedback);
                              localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                              alert('評価を保存しました');
                            }}
                            className="px-3 py-2 bg-green-900/30 border border-green-800/50 text-green-300 rounded-full hover:bg-green-900/40 transition-all active:scale-95"
                            title="この返信が良かった"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const feedback = { response: alt.response, rating: 'bad', timestamp: Date.now() };
                              const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                              savedFeedback.push(feedback);
                              localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                              alert('評価を保存しました。改善に活用します。');
                            }}
                            className="px-3 py-2 bg-red-900/30 border border-red-800/50 text-red-300 rounded-full hover:bg-red-900/40 transition-all active:scale-95"
                            title="この返信を改善したい"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* 追加課金モーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">使用回数を増やす</h3>
            <p className="text-gray-400 mb-4">
              現在の制限: <span className="font-bold text-white">{usageInfo?.limit || 50}回/日</span>
            </p>
            <p className="text-gray-500 text-sm mb-6">
              ※ 追加課金は現在のプラン（月額/年額）に合わせて適用されます
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={async () => {
                  if (!token) return;
                  try {
                    const response = await fetch('/api/usage-limit', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ newLimit: 100 }),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      if (data.checkoutUrl) {
                        // Utageの決済ページにリダイレクト
                        window.location.href = data.checkoutUrl;
                      } else {
                        // フォールバック（直接更新の場合）
                        setUsageInfo(data.usageInfo);
                        setShowUpgradeModal(false);
                        alert(`使用回数制限を100回に増やしました！`);
                      }
                    } else {
                      const error = await response.json();
                      alert(error.error || '更新に失敗しました');
                    }
                  } catch (err) {
                    alert('エラーが発生しました');
                  }
                }}
                className="w-full p-4 bg-blue-900/30 border border-blue-800/50 rounded-xl text-left hover:bg-blue-900/40 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">100回/日プラン</p>
                    <p className="text-sm text-gray-400">月額 +¥6,980</p>
                  </div>
                  <span className="text-blue-400 font-bold">+50回</span>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!token) return;
                  try {
                    const response = await fetch('/api/usage-limit', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ newLimit: 150 }),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      } else {
                        setUsageInfo(data.usageInfo);
                        setShowUpgradeModal(false);
                        alert(`使用回数制限を150回に増やしました！`);
                      }
                    } else {
                      const error = await response.json();
                      alert(error.error || '更新に失敗しました');
                    }
                  } catch (err) {
                    alert('エラーが発生しました');
                  }
                }}
                className="w-full p-4 bg-green-900/30 border border-green-800/50 rounded-xl text-left hover:bg-green-900/40 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">150回/日プラン</p>
                    <p className="text-sm text-gray-400">月額 +¥13,960（2倍）</p>
                  </div>
                  <span className="text-green-400 font-bold">+100回</span>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!token) return;
                  try {
                    const response = await fetch('/api/usage-limit', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ newLimit: 200 }),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      } else {
                        setUsageInfo(data.usageInfo);
                        setShowUpgradeModal(false);
                        alert(`使用回数制限を200回に増やしました！`);
                      }
                    } else {
                      const error = await response.json();
                      alert(error.error || '更新に失敗しました');
                    }
                  } catch (err) {
                    alert('エラーが発生しました');
                  }
                }}
                className="w-full p-4 bg-purple-900/30 border border-purple-800/50 rounded-xl text-left hover:bg-purple-900/40 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">200回/日プラン</p>
                    <p className="text-sm text-gray-400">月額 +¥20,940（3倍）</p>
                  </div>
                  <span className="text-purple-400 font-bold">+150回</span>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!token) return;
                  try {
                    const response = await fetch('/api/usage-limit', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ newLimit: 250 }),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      } else {
                        setUsageInfo(data.usageInfo);
                        setShowUpgradeModal(false);
                        alert(`使用回数制限を250回に増やしました！`);
                      }
                    } else {
                      const error = await response.json();
                      alert(error.error || '更新に失敗しました');
                    }
                  } catch (err) {
                    alert('エラーが発生しました');
                  }
                }}
                className="w-full p-4 bg-yellow-900/30 border border-yellow-800/50 rounded-xl text-left hover:bg-yellow-900/40 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">250回/日プラン</p>
                    <p className="text-sm text-gray-400">月額 +¥27,920（4倍）</p>
                  </div>
                  <span className="text-yellow-400 font-bold">+200回</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}



