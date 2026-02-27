'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { generateAIResponse, getCurrentUser, User, extractTextFromImage, AlternativeResponse, getUsageLimit, GOALS, GoalId, GoalDrivenInfo, TONE_PRESETS, TonePreset, submitResponseFeedback } from '@/lib/api';
import { MessageSquare, LogOut, Crown, Loader2, Mic, MicOff, Image as ImageIcon, X, User as UserIcon, ChevronDown, ChevronUp, Save, Sparkles, ThumbsUp, ThumbsDown, RefreshCw, HelpCircle, Flame, Zap, Gift, Target, AlertTriangle } from 'lucide-react';
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
  // ゴール駆動型の状態
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);
  const [selectedTone, setSelectedTone] = useState<TonePreset>('default');
  const [goalDrivenInfo, setGoalDrivenInfo] = useState<GoalDrivenInfo | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 20}s`,
        animationDuration: `${15 + Math.random() * 10}s`,
      })),
    []
  );


  useEffect(() => {
    // URLパラメータを取得
    const urlParams = new URLSearchParams(window.location.search);
    
    // ローカルストレージから前提情報を読み込む
    const savedProfileInfo = localStorage.getItem('profileInfo');
    if (savedProfileInfo) {
      try {
        setProfileInfo(JSON.parse(savedProfileInfo));
      } catch (e) {
        console.error('Failed to load profile info:', e);
      }
    }

    // 決済完了後のコールバック処理
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
    // 開発環境では認証をスキップ
    if (isDevMode) {
      // 開発モード: ダミーユーザーを設定
      setUser({
        id: 'dev-user',
        email: 'dev@example.com',
        isSubscribed: true,
      });
      setToken('dev-token');
    }
    // ローカルストレージにユーザー情報があれば復元される（別のuseEffectで処理）

    // 使用回数情報を取得（開発モードでない場合）
    let usageTimeoutId: ReturnType<typeof setTimeout> | null = null;
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
      usageTimeoutId = setTimeout(fetchUsageInfo, 100);
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
      if (usageTimeoutId) {
        clearTimeout(usageTimeoutId);
      }
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
      router.push('/login');
    }
  };

  const handleGenerate = async () => {
    if (!herMessage.trim()) {
      setError('メッセージを入力してください');
      return;
    }

    if (!isDevMode && !token) {
      setError('ログインが必要です');
      return;
    }

    if (!isDevMode && user && !user.isSubscribed) {
      setError('有効なサブスクリプションが必要です');
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
    setGoalDrivenInfo(null);
    setResponseId(null);

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
        profileContext, // 前提情報を渡す
        selectedGoal || undefined, // ゴールを渡す
        selectedTone // トーンを渡す
      );
      setAiResponse(result.response);
      setAiExplanation(result.explanation);
      setAlternativeResponses(result.alternatives || []);
      setSelectedResponseIndex(null);
      setResponseId(result.responseId ?? null);
      // ゴール駆動型の情報を設定
      if (result.goalDriven) {
        setGoalDrivenInfo(result.goalDriven);
      }
      
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
    // すべてのストレージをクリア
    localStorage.removeItem('token');
    localStorage.removeItem('sendright_user');
    setUser(null);
    setToken(null);
    // Cookieクリア（middleware.tsの認証用）
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'userId=; path=/; max-age=0';
    // 注意: setUser(null)により、ログイン/登録ページが表示される
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

    if (!isDevMode && user && !user.isSubscribed) {
      setError('有効なサブスクリプションが必要です');
      return;
    }

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
              setGoalDrivenInfo(null);
              setResponseId(null);
              
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
                profileContext,
                selectedGoal || undefined,
                selectedTone
              );
              setAiResponse(responseResult.response);
              setAiExplanation(responseResult.explanation);
              setAlternativeResponses(responseResult.alternatives || []);
              setSelectedResponseIndex(null);
              setResponseId(responseResult.responseId ?? null);
              // ゴール駆動型の情報を設定
              if (responseResult.goalDriven) {
                setGoalDrivenInfo(responseResult.goalDriven);
              }
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

  // ログアウト処理（トークン無効時に自動呼び出し）
  const handleAutoLogout = () => {
    // すべてのストレージをクリア
    localStorage.removeItem('token');
    localStorage.removeItem('sendright_user');
    setUser(null);
    setToken(null);
  };

  // エラーが「無効なトークンです」の場合、自動ログアウト
  useEffect(() => {
    if (error === '無効なトークンです') {
      handleAutoLogout();
    }
  }, [error]);

  // メール登録フォーム用の状態
  const [registerEmail, setRegisterEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // メール登録処理
  const handleRegister = async () => {
    if (!registerEmail || !registerEmail.includes('@')) {
      setRegisterError('有効なメールアドレスを入力してください');
      return;
    }

    setIsRegistering(true);
    setRegisterError('');

    try {
      // 紹介コードを取得（URLパラメータ または localStorage）
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref') || localStorage.getItem('sendright_referral_code') || undefined;
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail, referralCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      // ローカルストレージに保存
      localStorage.setItem('sendright_email', registerEmail);
      localStorage.setItem('sendright_user', JSON.stringify(data.user));
      
      // ユーザー状態を更新
      setUser({
        id: data.user.id,
        email: data.user.email,
        isSubscribed: data.user.isSubscribed,
      });
      
      // 使用回数情報を設定
      setUsageInfo({
        todayCount: 0,
        limit: data.user.dailyUsageLimit || 3,
        remaining: data.user.dailyUsageLimit || 3,
      });
      
      // トークンを設定（メール登録ユーザー用）
      setToken(`email-${data.user.id}`);
      
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setIsRegistering(false);
    }
  };

  // 初回ロード時にローカルストレージから復元
  useEffect(() => {
    // パスワードログイン時のトークンから復元
    const savedToken = localStorage.getItem('token');
    if (savedToken && !user) {
      setToken(savedToken);
      loadUser(savedToken);
      return;
    }

    const savedEmail = localStorage.getItem('sendright_email');
    const savedUser = localStorage.getItem('sendright_user');
    if (savedEmail && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser({
          id: userData.id,
          email: userData.email,
          isSubscribed: userData.isSubscribed,
        });
        setToken(`email-${userData.id}`);
        setUsageInfo({
          todayCount: 0,
          limit: userData.dailyUsageLimit || 3,
          remaining: userData.dailyUsageLimit || 3,
        });
      } catch (e) {
        console.error('Failed to restore user:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ログインしていない場合、ログイン/登録ページを表示
  if (!user && !isDevMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white relative overflow-hidden flex items-center justify-center">
        {/* 背景 */}
        <div className="absolute inset-0 pointer-events-none"></div>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-coral-200/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
          {/* ロゴ */}
          <div className="mb-8">
            <Image
              src="/sendright-logo.svg"
              alt="SendRight"
              width={256}
              height={64}
              className="h-16 w-auto mx-auto"
              priority
            />
          </div>
          
          {/* ログイン/登録 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-pink-100 shadow-xl shadow-pink-100/30 p-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              SendRightへようこそ
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              AIがあなたの代わりに<br />
              <span className="text-pink-500 font-bold">最適な返信</span>を生成します
            </p>
            
            {/* 7日間無料トライアル */}
            <div className="bg-gradient-to-r from-pink-50 to-coral-50 border border-pink-200 rounded-xl p-6 mb-6">
              <p className="text-gray-800 font-bold text-lg mb-2">🎁 7日間無料トライアル</p>
              <p className="text-sm text-gray-600 mb-4">
                今なら<span className="text-pink-500 font-bold">7日間無料</span>でお試しいただけます<br />
                1日50回まで使い放題！
              </p>
              <a
                href="/subscribe"
                className="inline-block w-full py-4 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all text-center shadow-lg shadow-pink-200"
              >
                7日間無料で試す →
              </a>
            </div>
            
            {/* 区切り線 */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-gray-400 text-sm">既に会員の方</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
            
            {/* 既存会員向けリンク */}
            <a
              href="/login"
              className="inline-block w-full py-3 bg-white border-2 border-pink-300 text-pink-500 font-bold rounded-xl hover:bg-pink-50 transition-all text-center"
            >
              ログインする
            </a>
          </div>
          
          {/* フッター */}
          <p className="text-xs text-gray-500 mt-8">
            © 2025 SendRight. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white relative overflow-hidden">
      {/* 背景の微細なグラデーション効果 */}
      <div className="absolute inset-0 pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-pink-200/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-coral-200/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-pink-100/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* パーティクル背景 */}
      <div className="particle-bg">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: particle.left,
              animationDelay: particle.animationDelay,
              animationDuration: particle.animationDuration,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10">
      <nav className="glass-effect border-b border-pink-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3">
                <Image
                  src="/sendright-logo.svg"
                  alt="SendRight"
                  width={192}
                  height={48}
                  className="h-12 w-auto"
                />
              </Link>
              <Link
                href="/help"
                className="flex items-center text-gray-500 hover:text-pink-500 transition-colors"
                title="使い方ガイド"
              >
                <HelpCircle className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              {(user || isDevMode) ? (
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-base text-gray-700 font-medium">
                    {user?.isSubscribed ? (
                      <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2 text-pink-500" />
                    )}
                    {isDevMode ? '開発モード' : user?.isSubscribed ? 'プロ会員' : '未契約'}
                  </span>
                  {usageInfo && !isDevMode && user?.isSubscribed && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center text-sm text-gray-600 font-medium">
                        <span className="mr-1">今日の使用回数:</span>
                        <span className={`font-bold ${usageInfo.remaining <= 10 ? 'text-red-500' : usageInfo.remaining <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
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
              {!isDevMode && user && (
                <Link
                  href="/mypage"
                  className="flex items-center text-gray-600 hover:text-pink-500 transition-colors font-medium"
                >
                  <UserIcon className="w-5 h-5 mr-2" />
                  マイページ
                </Link>
              )}
              {!isDevMode && user && (
                <Link
                  href="/referral"
                  className="flex items-center text-gray-600 hover:text-pink-500 transition-colors font-medium"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  紹介で割引
                </Link>
              )}
              {!isDevMode && (
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-600 hover:text-pink-500 transition-colors font-medium"
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
        
        {/* プロフィール診断へのリンクは削除（1回限りの特典としてメールで案内） */}
        
        <div className="apple-card apple-glow p-10 sm:p-12 fade-in-up">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-5xl sm:text-6xl font-bold text-gray-800 tracking-tight">
              返信を生成
            </h2>
            <Link
              href="/help"
              className="flex items-center text-gray-500 hover:text-pink-500 transition-colors text-sm"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              使い方を見る
            </Link>
          </div>

          {error && (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-600">
              <p className="mb-4 text-lg">{error}</p>
              {usageInfo && usageInfo.remaining === 0 && !isDevMode && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold rounded-full text-sm hover:from-pink-400 hover:to-coral-400 transition-all"
                  >
                    上限アップについて
                  </button>
              )}
            </div>
          )}

          <div className="space-y-10">
            {/* 前提情報セクション */}
            <div className="bg-white/80 rounded-2xl border border-pink-100 overflow-hidden fade-in-up shadow-sm" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() => setShowProfileInfo(!showProfileInfo)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-pink-50/50 transition-all duration-300 bg-gradient-to-r from-white to-pink-50/30 rounded-2xl border border-pink-100 hover:border-pink-200 hover:shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-5 h-5 text-pink-500 float-animation" />
                  <span className="text-lg font-bold text-gray-800 tracking-tight gradient-text-strong">
                    パーソナライズ設定
                  </span>
                </div>
                {showProfileInfo ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 transition-transform duration-300" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300" />
                )}
              </button>
              
              {showProfileInfo && (
                <div className="px-6 py-6 space-y-6 border-t border-pink-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        名前
                      </label>
                      <input
                        type="text"
                        value={profileInfo.name}
                        onChange={(e) => setProfileInfo({ ...profileInfo, name: e.target.value })}
                        placeholder="例: 美咲"
                        className="apple-tv-input w-full px-4 py-3 text-gray-800 rounded-xl placeholder:text-gray-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        年齢
                      </label>
                      <input
                        type="text"
                        value={profileInfo.age}
                        onChange={(e) => setProfileInfo({ ...profileInfo, age: e.target.value })}
                        placeholder="例: 24歳"
                        className="apple-tv-input w-full px-4 py-3 text-gray-800 rounded-xl placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      関係性
                    </label>
                    <input
                      type="text"
                      value={profileInfo.relationship}
                      onChange={(e) => setProfileInfo({ ...profileInfo, relationship: e.target.value })}
                      placeholder="例: 知人、友人、デート中、付き合っている、など"
                      className="apple-tv-input w-full px-4 py-3 text-gray-800 rounded-xl placeholder:text-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      趣味・好み
                    </label>
                    <textarea
                      value={profileInfo.interests}
                      onChange={(e) => setProfileInfo({ ...profileInfo, interests: e.target.value })}
                      placeholder="例: カフェ巡り、映画鑑賞、読書、スポーツ観戦など"
                      rows={2}
                      className="apple-tv-input w-full px-4 py-3 text-gray-800 rounded-xl placeholder:text-gray-400 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性格・特徴
                    </label>
                    <textarea
                      value={profileInfo.personality}
                      onChange={(e) => setProfileInfo({ ...profileInfo, personality: e.target.value })}
                      placeholder="例: 明るい、控えめ、積極的、など"
                      rows={2}
                      className="apple-tv-input w-full px-4 py-3 text-gray-800 rounded-xl placeholder:text-gray-400 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会話の文脈・背景
                    </label>
                    <textarea
                      value={profileInfo.context}
                      onChange={(e) => setProfileInfo({ ...profileInfo, context: e.target.value })}
                      placeholder="例: 最近知り合った、共通の友人がいる、仕事関係、など"
                      rows={2}
                      className="apple-tv-input w-full px-4 py-3 text-gray-800 rounded-xl placeholder:text-gray-400 resize-none"
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
            
            {/* ゴール選択セクション */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6 fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center space-x-3 mb-4">
                <Target className="w-6 h-6 text-purple-500" />
                <label className="text-lg font-bold text-gray-800 tracking-tight">
                  🎯 ゴールを選択（オプション）
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                ゴールを選ぶと、AIが戦略を立てて「次の一手」まで提案します
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      selectedGoal === goal.id
                        ? 'bg-purple-100 border-purple-400 text-purple-700 shadow-md'
                        : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    <span className="text-xl mr-2">{goal.icon}</span>
                    <span className="font-medium text-sm">{goal.label}</span>
                  </button>
                ))}
              </div>
              {selectedGoal && (
                <p className="mt-4 text-sm text-purple-600 font-medium">
                  ✅ 選択中: {GOALS.find(g => g.id === selectedGoal)?.label}
                </p>
              )}
            </div>

            {/* 返信トーン選択 */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl border border-sky-200 p-6 fade-in-up" style={{ animationDelay: '0.18s' }}>
              <div className="flex items-center space-x-3 mb-4">
                <Sparkles className="w-6 h-6 text-sky-500" />
                <label className="text-lg font-bold text-gray-800 tracking-tight">
                  ✨ 返信トーン（オプション）
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                トーンを選ぶと返信の雰囲気を調整できます
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TONE_PRESETS.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      selectedTone === tone.id
                        ? 'bg-sky-100 border-sky-400 text-sky-700 shadow-md'
                        : 'bg-white border-gray-200 hover:border-sky-200 hover:bg-sky-50'
                    }`}
                  >
                    <span className="font-medium text-sm">{tone.label}</span>
                  </button>
                ))}
              </div>
              {selectedTone !== 'default' && (
                <p className="mt-4 text-sm text-sky-600 font-medium">
                  ✅ 選択中: {TONE_PRESETS.find(t => t.id === selectedTone)?.label}
                </p>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-semibold text-gray-800 tracking-tight">
                  彼女からのメッセージ
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-500">
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
                  disabled={(!user && !isDevMode) || (!isDevMode && user && !user.isSubscribed) || isExtracting || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center px-6 py-3.5 border rounded-full cursor-pointer transition-all duration-300 font-medium ${
                    (!user && !isDevMode) || (!isDevMode && user && !user.isSubscribed) || isExtracting || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white text-gray-700 hover:bg-pink-50 border-gray-200 hover:border-pink-300 active:scale-95 shadow-sm'
                  }`}
                >
                  <ImageIcon className="w-5 h-5 mr-3" />
                  {isExtracting ? 'テキスト抽出中...' : 'スクリーンショットをアップロード'}
                </label>
                {uploadedImage && (
                  <div className="mt-6 relative inline-block">
                    <Image
                      src={uploadedImage}
                      alt="アップロードされた画像"
                      width={320}
                      height={320}
                      className="max-w-full h-auto max-h-80 rounded-2xl border border-gray-200 shadow-lg object-contain"
                      unoptimized
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-400 transition-all active:scale-95 shadow-lg"
                      disabled={isExtracting}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {isExtracting && (
                  <div className="mt-4 flex items-center text-pink-500">
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span className="text-base font-medium">画像からテキストを抽出中...</span>
                  </div>
                )}
                {fullConversationText && (
                  <div className="mt-6 p-6 bg-pink-50/50 rounded-2xl border border-pink-100">
                    <p className="text-sm text-gray-600 mb-3 font-medium">📝 会話全体を読み取りました（返信生成時に使用されます）</p>
                    <div className="text-sm text-gray-700 max-h-[300px] min-h-[50px] overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap leading-relaxed pr-3 scrollbar-thin">
                      <div className="pb-2">
                        {fullConversationText}
                      </div>
                    </div>
                    <button
                      onClick={() => setFullConversationText('')}
                      className="mt-4 text-sm text-pink-500 hover:text-pink-600 transition-colors font-medium"
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
                  className="apple-tv-input w-full px-6 py-4 pr-14 text-gray-800 rounded-2xl resize-none placeholder:text-gray-400 text-lg"
                  rows={5}
                  disabled={(!user && !isDevMode) || (!isDevMode && user && !user.isSubscribed) || isLoading || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                />
                <button
                  type="button"
                  onClick={isListening ? handleStopListening : handleStartListening}
                  disabled={(!user && !isDevMode) || (!isDevMode && user && !user.isSubscribed) || isLoading || !isSpeechSupported || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
                  className={`absolute right-4 top-4 p-3 rounded-full transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-400'
                      : isSpeechSupported
                      ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                <p className="mt-4 text-base text-pink-500 flex items-center font-medium">
                  <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full mr-3 animate-pulse"></span>
                  音声を聞いています...
                </p>
              )}
            </div>

            <div className="space-y-3">
              {!isDevMode && user && !user.isSubscribed && (
                <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                  <div className="flex items-start">
                    <Crown className="w-6 h-6 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-800 font-bold mb-1">
                        有効なサブスクリプションが必要です
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        課金後にすべての機能が利用できます
                      </p>
                      <button
                        onClick={() => router.push('/subscribe')}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full text-sm hover:from-purple-400 hover:to-pink-400 transition-all active:scale-95"
                      >
                        今すぐ申し込む
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {usageInfo && !isDevMode && user?.isSubscribed && usageInfo.remaining <= 5 && usageInfo.remaining > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700">
                  <p className="text-sm font-medium mb-2">
                    ⚠️ 残り使用回数が少なくなっています: {usageInfo.remaining}回（制限: {usageInfo.limit}回/日）
                  </p>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs underline hover:no-underline text-yellow-600"
                  >
                    追加課金で使用回数を増やす
                  </button>
                </div>
              )}
              {usageInfo && !isDevMode && user?.isSubscribed && usageInfo.remaining === 0 && (
                <div className="p-5 bg-gradient-to-r from-pink-50 to-coral-50 border border-pink-200 rounded-xl">
                  <div className="flex items-start">
                    <Zap className="w-6 h-6 text-pink-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-800 font-bold mb-1">
                        今日の無料アドバイスを使い切りました
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        {usageInfo.limit === 3 ? (
                          <>プロプランにアップグレードすると、1日50回まで使えます</>
                        ) : (
                          <>明日またお試しいただくか、プランをアップグレードしてください</>
                        )}
                      </p>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold rounded-full text-sm hover:from-pink-400 hover:to-coral-400 transition-all active:scale-95"
                      >
                        アップグレードする
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={(!user && !isDevMode) || (!isDevMode && user && !user.isSubscribed) || isLoading || !herMessage.trim() || (usageInfo !== null && !isDevMode && usageInfo.remaining === 0)}
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

            {/* ゴール駆動型の戦略表示 */}
            {goalDrivenInfo && (
              <div className="mt-10 space-y-6 fade-in-up" style={{ animationDelay: '0.25s' }}>
                <h3 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center">
                  <Target className="w-6 h-6 mr-2 text-purple-500" />
                  🎯 {GOALS.find(g => g.id === selectedGoal)?.label} 戦略
                </h3>
                
                {/* 状態分析 */}
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center">
                    📊 現在の状態分析
                  </h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">温度感</p>
                      <p className="text-2xl font-bold text-blue-600">{goalDrivenInfo.analysis.temperature}/10</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">ゴールまでの距離</p>
                      <p className="text-lg font-bold text-blue-600">
                        {goalDrivenInfo.analysis.distanceToGoal === 'close' ? '🔥 近い' :
                         goalDrivenInfo.analysis.distanceToGoal === 'medium' ? '📍 中程度' : '🏃 遠い'}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">タイミング</p>
                      <p className="text-lg font-bold text-blue-600">
                        {goalDrivenInfo.analysis.timing === 'now' ? '⚡ 今すぐ' :
                         goalDrivenInfo.analysis.timing === 'soon' ? '⏰ もう少し' : '⏳ まだ早い'}
                      </p>
                    </div>
                  </div>
                  <p className="text-blue-700 whitespace-pre-wrap">{goalDrivenInfo.analysis.summary}</p>
                </div>
                
                {/* 戦略 */}
                <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="font-bold text-purple-800 mb-3">🎯 戦略</h4>
                  <p className="text-purple-700 whitespace-pre-wrap">{goalDrivenInfo.strategy}</p>
                </div>
                
                {/* 次の展開 */}
                <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                  <h4 className="font-bold text-green-800 mb-3">📌 次の展開</h4>
                  <div className="space-y-3">
                    {goalDrivenInfo.nextSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start p-3 bg-white rounded-lg">
                        <span className="text-green-600 mr-2 mt-1">•</span>
                        <div>
                          <span className="text-gray-600 text-sm">{step.condition}</span>
                          <p className="text-gray-800 font-medium mt-1">→ {step.response}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {aiResponse && (
              <>
                <div className="mt-10 fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">
                      {goalDrivenInfo ? '📝 今送るべきメッセージ' : '返信候補（3案）'}
                    </h3>
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        setGoalDrivenInfo(null);
                        setResponseId(null);
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
                            profileContext,
                            selectedGoal || undefined,
                            selectedTone
                          );
                          setAiResponse(result.response);
                          setAiExplanation(result.explanation);
                          setAlternativeResponses(result.alternatives || []);
                          setSelectedResponseIndex(null);
                          setResponseId(result.responseId ?? null);
                          // ゴール駆動型の情報を設定
                          if (result.goalDriven) {
                            setGoalDrivenInfo(result.goalDriven);
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : '返信の再生成に失敗しました');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-pink-50 hover:border-pink-200 transition-all text-sm shadow-sm"
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
                        ? 'bg-pink-50/70 border-pink-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="mb-3">
                        <p className="text-xs text-pink-500 mb-2 font-medium">候補1</p>
                        <p className="text-gray-800 whitespace-pre-wrap text-lg font-medium mb-3">{aiResponse}</p>
                      </div>
                      <div className="pt-3 border-t border-pink-100">
                        <p className="text-sm text-gray-500 mb-2 font-medium">📝 解説</p>
                        <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{aiExplanation}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-pink-100">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiResponse);
                            alert('クリップボードにコピーしました');
                          }}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-pink-50 hover:border-pink-200 transition-all active:scale-95 text-sm font-medium shadow-sm"
                        >
                          コピー
                        </button>
                          <button
                            onClick={async () => {
                              const feedback = { response: aiResponse, rating: 'good', timestamp: Date.now() };
                              const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                              savedFeedback.push(feedback);
                              localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));

                              if (token && responseId && !isDevMode) {
                                try {
                                  await submitResponseFeedback(token, {
                                    responseId,
                                    rating: 'good',
                                    tags: ['primary'],
                                  });
                                } catch (err) {
                                  console.error('Failed to submit feedback:', err);
                                }
                              }
                              
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
                            className="px-3 py-2 bg-green-50 border border-green-200 text-green-600 rounded-full hover:bg-green-100 transition-all active:scale-95"
                            title="この返信が良かった"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                        <button
                          onClick={async () => {
                            const feedback = { response: aiResponse, rating: 'bad', timestamp: Date.now() };
                            const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                            savedFeedback.push(feedback);
                            localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                            if (token && responseId && !isDevMode) {
                              try {
                                await submitResponseFeedback(token, {
                                  responseId,
                                  rating: 'bad',
                                  tags: ['primary'],
                                });
                              } catch (err) {
                                console.error('Failed to submit feedback:', err);
                              }
                            }
                            alert('評価を保存しました。改善に活用します。');
                          }}
                          className="px-3 py-2 bg-red-50 border border-red-200 text-red-500 rounded-full hover:bg-red-100 transition-all active:scale-95"
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
                            ? 'bg-pink-50/70 border-pink-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2 font-medium">候補{idx + 2}</p>
                          <p className="text-gray-800 whitespace-pre-wrap text-lg font-medium mb-3">{alt.response}</p>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-500 mb-2 font-medium">📝 解説</p>
                          <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{alt.explanation}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(alt.response);
                              alert('クリップボードにコピーしました');
                            }}
                            className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-pink-50 hover:border-pink-200 transition-all active:scale-95 text-sm font-medium shadow-sm"
                          >
                            コピー
                          </button>
                          <button
                            onClick={async () => {
                              const feedback = { response: alt.response, rating: 'good', timestamp: Date.now() };
                              const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                              savedFeedback.push(feedback);
                              localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                              if (token && responseId && !isDevMode) {
                                try {
                                  await submitResponseFeedback(token, {
                                    responseId,
                                    rating: 'good',
                                    tags: ['alternative', `index:${idx + 2}`],
                                  });
                                } catch (err) {
                                  console.error('Failed to submit feedback:', err);
                                }
                              }
                              alert('評価を保存しました');
                            }}
                            className="px-3 py-2 bg-green-50 border border-green-200 text-green-600 rounded-full hover:bg-green-100 transition-all active:scale-95"
                            title="この返信が良かった"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const feedback = { response: alt.response, rating: 'bad', timestamp: Date.now() };
                              const savedFeedback = JSON.parse(localStorage.getItem('responseFeedback') || '[]');
                              savedFeedback.push(feedback);
                              localStorage.setItem('responseFeedback', JSON.stringify(savedFeedback.slice(-100)));
                              if (token && responseId && !isDevMode) {
                                try {
                                  await submitResponseFeedback(token, {
                                    responseId,
                                    rating: 'bad',
                                    tags: ['alternative', `index:${idx + 2}`],
                                  });
                                } catch (err) {
                                  console.error('Failed to submit feedback:', err);
                                }
                              }
                              alert('評価を保存しました。改善に活用します。');
                            }}
                            className="px-3 py-2 bg-red-50 border border-red-200 text-red-500 rounded-full hover:bg-red-100 transition-all active:scale-95"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">使用回数を増やす</h3>
            <p className="text-gray-600 mb-4">
              現在の制限: <span className="font-bold text-gray-800">{usageInfo?.limit || 50}回/日</span>
            </p>
            <p className="text-gray-500 text-sm mb-6">
              ※ 追加課金による上限アップは現在停止中です
            </p>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700 mb-6">
              上限アップをご希望の場合は、運営までお問い合わせください。
            </div>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
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
