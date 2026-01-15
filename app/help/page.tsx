'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, MessageSquare, Mic, Image as ImageIcon, User, Copy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>('login');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <Link
          href="/"
          className="inline-flex items-center text-gray-500 hover:text-pink-500 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          ホームに戻る
        </Link>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-pink-100 p-8 sm:p-12 shadow-lg">
          <div className="flex items-center mb-8">
            <HelpCircle className="w-8 h-8 text-pink-500 mr-4" />
            <h1 className="text-3xl font-bold text-gray-800">使い方ガイド</h1>
          </div>

          {/* ログイン方法 */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('login')}
              className="w-full flex items-center justify-between p-4 bg-pink-50/50 rounded-xl hover:bg-pink-100/50 transition-colors text-left border border-pink-100"
            >
              <div className="flex items-center">
                <User className="w-5 h-5 text-pink-500 mr-3" />
                <span className="text-lg font-semibold text-gray-800">ログイン方法</span>
              </div>
              {openSection === 'login' ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openSection === 'login' && (
              <div className="mt-4 p-6 bg-white rounded-xl border border-pink-100">
                <ol className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-3 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Utageの会員ページにアクセス</p>
                      <p className="text-sm text-gray-500">Utageの会員ページからSendRightにアクセスしてください。</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-3 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 mb-1">SendRightにログイン</p>
                      <p className="text-sm text-gray-500">会員ページからSendRightのリンクをクリックすると、自動的にログインされます。</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-3 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 mb-1">URLから直接アクセス可能</p>
                      <p className="text-sm text-gray-500">ログイン後は、SendRightのURLに直接アクセスして使用できます。セッションは1日間有効です。</p>
                    </div>
                  </li>
                </ol>
                <div className="mt-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                  <p className="text-sm text-pink-700">
                    <strong>注意：</strong> セッションの有効期限が切れた場合は、Utageの会員ページから再度ログインしてください。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* メッセージの入力方法 */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('input')}
              className="w-full flex items-center justify-between p-4 bg-pink-50/50 rounded-xl hover:bg-pink-100/50 transition-colors text-left border border-pink-100"
            >
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-pink-500 mr-3" />
                <span className="text-lg font-semibold text-gray-800">メッセージの入力方法</span>
              </div>
              {openSection === 'input' ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openSection === 'input' && (
              <div className="mt-4 p-6 bg-white rounded-xl border border-pink-100">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <span className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-3 text-sm">
                        1
                      </span>
                      テキスト入力
                    </h3>
                    <p className="text-gray-600 ml-11">メッセージ入力欄に直接テキストを入力します。最も基本的な方法です。</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <Mic className="w-5 h-5 text-pink-500 mr-3" />
                      音声入力
                    </h3>
                    <p className="text-gray-600 ml-8">マイクボタンをクリックして、音声でメッセージを入力します。Chrome、Edge、Safariで利用可能です。</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <ImageIcon className="w-5 h-5 text-pink-500 mr-3" />
                      画像アップロード
                    </h3>
                    <p className="text-gray-600 ml-8">LINEやDMのスクリーンショットをアップロードすると、自動的にメッセージが抽出されます。会話全体の文脈も考慮されます。</p>
                    <div className="mt-3 ml-8 p-3 bg-pink-50 rounded-lg border border-pink-100">
                      <p className="text-sm text-gray-600">
                        <strong>推奨：</strong> 画像は鮮明で、テキストが読み取れるものを使用してください。サイズは10MB以下にしてください。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* パーソナライズ設定 */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('personalize')}
              className="w-full flex items-center justify-between p-4 bg-pink-50/50 rounded-xl hover:bg-pink-100/50 transition-colors text-left border border-pink-100"
            >
              <div className="flex items-center">
                <User className="w-5 h-5 text-pink-500 mr-3" />
                <span className="text-lg font-semibold text-gray-800">パーソナライズ設定</span>
              </div>
              {openSection === 'personalize' ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openSection === 'personalize' && (
              <div className="mt-4 p-6 bg-white rounded-xl border border-pink-100">
                <p className="text-gray-600 mb-4">
                  「パーソナライズ設定」で相手の情報を入力すると、より適切な返信が生成されます。
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-pink-50 rounded-lg border border-pink-100">
                    <p className="text-sm font-medium text-gray-800 mb-1">設定できる項目</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 名前</li>
                      <li>• 年齢</li>
                      <li>• 関係性（知人、友人、デート中など）</li>
                      <li>• 趣味・好み</li>
                      <li>• 性格・特徴</li>
                      <li>• 会話の文脈・背景</li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-500">
                    設定した情報はブラウザに保存され、次回アクセス時も使用されます。「前提情報を保存」ボタンで保存できます。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 返信の使い方 */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('response')}
              className="w-full flex items-center justify-between p-4 bg-pink-50/50 rounded-xl hover:bg-pink-100/50 transition-colors text-left border border-pink-100"
            >
              <div className="flex items-center">
                <Copy className="w-5 h-5 text-pink-500 mr-3" />
                <span className="text-lg font-semibold text-gray-800">返信の使い方</span>
              </div>
              {openSection === 'response' ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openSection === 'response' && (
              <div className="mt-4 p-6 bg-white rounded-xl border border-pink-100">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">3つの返信候補</h3>
                    <p className="text-gray-600 text-sm">
                      生成された返信は3つの候補が表示されます。各候補には「解説」が付いているので、なぜその返信が適切かを理解できます。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <Copy className="w-4 h-4 mr-2 text-pink-500" />
                      コピー機能
                    </h3>
                    <p className="text-gray-600 text-sm">
                      各返信候補の「コピー」ボタンをクリックすると、返信がクリップボードにコピーされます。そのままLINEやDMに貼り付けて送信できます。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 text-pink-500" />
                      再生成
                    </h3>
                    <p className="text-gray-600 text-sm">
                      「再生成」ボタンをクリックすると、同じメッセージに対して別の返信候補が生成されます。気に入った返信が見つかるまで何度でも再生成できます。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">評価機能</h3>
                    <p className="text-gray-600 text-sm">
                      各返信候補には「いいね」「改善」ボタンがあります。フィードバックを送ることで、今後の返信品質向上に役立ちます。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* よくある質問 */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('faq')}
              className="w-full flex items-center justify-between p-4 bg-pink-50/50 rounded-xl hover:bg-pink-100/50 transition-colors text-left border border-pink-100"
            >
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 text-pink-500 mr-3" />
                <span className="text-lg font-semibold text-gray-800">よくある質問</span>
              </div>
              {openSection === 'faq' ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openSection === 'faq' && (
              <div className="mt-4 p-6 bg-white rounded-xl border border-pink-100 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Q: 使用回数制限はありますか？</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    A: 1日あたり50回まで使用できます（デフォルト）。使用回数と残り回数はヘッダーに表示されます。
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>追加課金で使用回数を増やすことができます（100回ごとに倍額）：</strong>
                  </p>
                  <ul className="text-gray-600 text-sm ml-4 mt-2 space-y-1">
                    <li>• 100回/日プラン（月額+¥6,980、+50回）</li>
                    <li>• 150回/日プラン（月額+¥13,960、+100回・2倍）</li>
                    <li>• 200回/日プラン（月額+¥20,940、+150回・3倍）</li>
                    <li>• 250回/日プラン（月額+¥27,920、+200回・4倍）</li>
                  </ul>
                  <p className="text-gray-500 text-xs mt-2">
                    ※ 50回ごとに¥6,980追加（基本プラン月額¥6,980に追加）
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    制限に達した場合や残り回数が少ない場合、警告メッセージから追加課金で使用回数を増やすことができます。
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Q: セッションが切れた場合はどうすればいいですか？</h3>
                  <p className="text-gray-600 text-sm">
                    A: Utageの会員ページから再度SendRightにアクセスしてください。セッションは1日間有効です。
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Q: 音声入力が使えません</h3>
                  <p className="text-gray-600 text-sm">
                    A: 音声入力はChrome、Edge、Safariで利用可能です。マイクの使用許可が必要です。ブラウザの設定でマイクへのアクセスを許可してください。
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Q: 画像からテキストが抽出できません</h3>
                  <p className="text-gray-600 text-sm">
                    A: 画像が鮮明で、テキストが読み取れることを確認してください。LINEやDMの会話画面であることも必要です。画像サイズは10MB以下にしてください。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
