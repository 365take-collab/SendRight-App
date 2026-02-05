'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, ChevronDown, Play, Pause, Volume2, VolumeX, MessageSquare, Zap, Shield, Clock, Star, ArrowRight, X } from 'lucide-react'

export default function LandingPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showVSLModal, setShowVSLModal] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const vslVideoRef = useRef<HTMLVideoElement>(null)

  // VSLモーダル用の動画制御
  useEffect(() => {
    if (showVSLModal && vslVideoRef.current) {
      vslVideoRef.current.play()
    }
  }, [showVSLModal])

  // 自動再生（ミュート状態で）
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // 自動再生がブロックされた場合は何もしない
      })
    }
  }, [])

  const testimonials = [
    {
      text: '「マジで返信に悩まなくなった」',
      detail: '今まで1通の返信に30分かけてたのが、10秒で終わる。しかも返信率も上がって、先月ついに彼女ができました。',
      author: '28歳 会社員',
      rating: 5,
    },
    {
      text: '「解説が神」',
      detail: 'なぜこの返信がいいのか、理由がわかるのがいい。使ってるうちに、自分でも判断できるようになってきた。',
      author: '34歳 エンジニア',
      rating: 5,
    },
    {
      text: '「誰にもバレずに使える」',
      detail: 'こんなことで悩んでるなんて友達に言えないけど、SendRightなら誰にも知られずにプロのアドバイスがもらえる。',
      author: '25歳 学生',
      rating: 5,
    },
  ]

  // 証言の自動切り替え
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ナビゲーション - 固定ヘッダー */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/sendright-logo.svg"
                alt="SendRight"
                width={140}
                height={35}
                className="h-8 w-auto"
              />
            </Link>
            <Link
              href="/subscribe"
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold text-sm rounded-full hover:opacity-90 transition-all shadow-lg shadow-pink-200/50"
            >
              7日間無料で試す
            </Link>
          </div>
        </div>
      </nav>

      {/* ファーストビュー - VSL Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 bg-gradient-to-b from-white via-pink-50/30 to-white relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-coral-200/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          {/* メインヘッドライン */}
          <div className="text-center mb-8">
            <p className="text-pink-500 font-bold text-sm mb-4 tracking-wide">
              700人斬りのナンパ師が開発した恋愛AI
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              <span className="text-pink-500">「また既読スルー…」</span>を<br />
              終わらせる。
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 font-medium">
              返信の正解を<span className="text-pink-500 font-bold">10秒</span>で。
            </p>
          </div>

          {/* VSL動画エリア */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <div 
              className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
              onClick={() => setShowVSLModal(true)}
            >
              {/* サムネイル or プレビュー動画 */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-coral-500/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-pink-500 ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 inline-block">
                  🎬 3分で分かる SendRight（音声あり）
                </p>
              </div>
              {/* プレビュー用の静止画やGIF */}
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-6xl">
                📱💬
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/subscribe"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold text-lg rounded-full hover:opacity-90 transition-all shadow-xl shadow-pink-200/50"
            >
              7日間無料で試す
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <p className="text-gray-500 text-sm mt-3">
              ※ クレジットカード登録不要
            </p>
          </div>

          {/* 下矢印 */}
          <div className="text-center mt-12">
            <button
              onClick={() => scrollToSection('pain')}
              className="text-gray-400 hover:text-pink-500 transition-colors animate-bounce"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
          </div>
        </div>
      </section>

      {/* セクション1: 共感（痛みの提示） */}
      <section id="pain" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            こんな経験、ありませんか？
          </h2>
          
          <div className="space-y-4">
            {[
              '返信を考えすぎて、気づいたら深夜2時',
              '送った後も「これでよかったのか…」とモヤモヤする',
              'マッチするのに、メッセージで関係が終わる',
              '既読がついた瞬間、祈るような気持ちでスマホを見つめている',
              'アプリに毎月課金してるのに、一度もデートできていない',
              '友達には相談できない。こんなことで悩んでるなんて…',
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-start p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-6 h-6 rounded border-2 border-pink-300 mr-4 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-pink-50 rounded-2xl border border-pink-100">
            <p className="text-gray-700 text-center leading-relaxed">
              返信を間違えるたびに、彼女候補が1人ずつ消えていく。
              <br />
              <br />
              あなたのせいじゃない。<span className="font-bold text-pink-600">正解を知らなかっただけ。</span>
            </p>
          </div>
        </div>
      </section>

      {/* セクション2: 敵の設定（常識の否定） */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            「センスがないから」は<span className="text-pink-500">嘘</span>です
          </h2>
          
          <div className="space-y-6 text-left">
            <p className="text-gray-600 text-lg leading-relaxed">
              「恋愛はセンス」「自分で考えろ」
              <br />
              そう言われて、何度も傷ついてきたはず。
            </p>
            
            <p className="text-gray-600 text-lg leading-relaxed">
              でも、それは<span className="font-bold text-gray-900">間違った常識</span>です。
            </p>
            
            <p className="text-gray-600 text-lg leading-relaxed">
              実は、女性が「いいな」と思う返信には<span className="font-bold text-pink-500">パターン</span>がある。
              <br />
              正解は存在する。あなたには見えていなかっただけ。
            </p>
          </div>
        </div>
      </section>

      {/* セクション3: ブランドストーリー */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            開発者の話を聞いてください
          </h2>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="prose prose-lg max-w-none text-gray-600">
              <p>
                僕もかつては、全く女性と話せませんでした。
              </p>
              <p>
                マッチングアプリで何十人とマッチしても、
                メッセージで全員に既読スルーされる。
              </p>
              <p className="text-gray-800 font-medium">
                「俺のどこがダメなんだ」
              </p>
              <p>
                毎晩、スマホを握りしめて悩んでいました。
              </p>
              <p>
                でも、数え切れない失敗の末、気づいたんです。
                <br />
                <span className="text-pink-500 font-bold">「正解のパターン」は存在する。</span>
              </p>
              <p>
                それを体系化して実践した結果、
                <span className="font-bold text-gray-900">700人以上</span>の女性と関係を築くことができました。
              </p>
              <p>
                自分が何年もかけて身につけた「正解」を、
                AIに学習させることで、誰でも一瞬で使えるようにしたい。
              </p>
              <p className="text-gray-900 font-bold">
                そう思って作ったのが、SendRightです。
              </p>
            </div>
            
            {/* 権威バッジ */}
            <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-gray-100">
              <div className="flex items-center px-4 py-2 bg-pink-50 rounded-full">
                <Star className="w-5 h-5 text-pink-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">700人斬りの実績</span>
              </div>
              <div className="flex items-center px-4 py-2 bg-pink-50 rounded-full">
                <Zap className="w-5 h-5 text-pink-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">恋愛コミュニケーション研究5年</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* セクション4: ソリューション提示 */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
            SendRightとは？
          </h2>
          <p className="text-center text-gray-500 mb-12">
            恋愛のプロが10秒であなたの代わりに考えるAI
          </p>
          
          {/* 3ステップ */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { step: 1, title: 'コピペ', desc: '相手のメッセージをコピペ', icon: '📋' },
              { step: 2, title: '10秒待つ', desc: 'AIが3つの返信候補を生成', icon: '⚡' },
              { step: 3, title: '選んで送信', desc: '好きな返信を選んで送信', icon: '✨' },
            ].map((item) => (
              <div key={item.step} className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-pink-500 font-bold text-sm mb-2">STEP {item.step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          
          {/* 特徴 */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Clock className="w-8 h-8 text-pink-500" />,
                title: '10秒で正解がわかる',
                desc: '30分悩んでいた返信が、10秒で決まる。もう深夜まで返信で悩む必要はありません。',
              },
              {
                icon: <MessageSquare className="w-8 h-8 text-pink-500" />,
                title: '3つの候補から選べる',
                desc: 'AIが3パターンの返信を提案。それぞれに「なぜこの返信がいいのか」の解説付き。',
              },
              {
                icon: <Zap className="w-8 h-8 text-pink-500" />,
                title: '使うほど上達する',
                desc: '解説を読むうちに、「いい返信」がわかるようになる。いつかはAIなしでも自信を持って返信できる男に。',
              },
            ].map((item, index) => (
              <div key={index} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="mb-4">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* セクション5: デモ / 使用イメージ */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
            実際の画面を見てください
          </h2>
          <p className="text-center text-gray-500 mb-12">
            テキスト、音声、画像、どれでも入力OK
          </p>
          
          {/* デモ画面モックアップ */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto">
            <div className="bg-gradient-to-r from-pink-500 to-coral-500 p-4 text-white text-center font-bold">
              SendRight
            </div>
            <div className="p-6 space-y-4">
              {/* 相手のメッセージ */}
              <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                <p className="text-gray-800">今度どこか行きたいですね〜☺️</p>
              </div>
              
              {/* AI候補 */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">💡 AIの返信候補</p>
                {[
                  { text: 'いいですね！最近気になってるカフェがあるんですけど、よかったら一緒にどうですか？☕', label: '積極的' },
                  { text: '行きたい！どんなところが好きですか？合わせますよ😊', label: '聞き上手' },
                  { text: 'ぜひ！美味しいもの食べに行きましょう🍝', label: 'カジュアル' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border ${index === 0 ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-pink-500 font-medium">候補{index + 1}</span>
                      <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                    <p className="text-gray-800 text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* セクション6: ベネフィット */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            SendRightを使うと、こうなります
          </h2>
          
          {/* Before / After */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-6 bg-gray-100 rounded-2xl">
              <h3 className="text-lg font-bold text-gray-500 mb-4">Before 😔</h3>
              <ul className="space-y-3">
                {[
                  '返信に30分悩む',
                  '既読スルーの連続',
                  '友達に相談できない',
                  '自信がない',
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 bg-pink-50 rounded-2xl border-2 border-pink-200">
              <h3 className="text-lg font-bold text-pink-500 mb-4">After 😊</h3>
              <ul className="space-y-3">
                {[
                  '10秒で決まる',
                  '「楽しみにしてます！」の返信が来る',
                  '誰にも知られずプロのアドバイス',
                  '「俺でもいけるんだ」という実感',
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-pink-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* 感情的ベネフィット */}
          <div className="p-8 bg-gradient-to-r from-pink-50 to-coral-50 rounded-2xl text-center">
            <p className="text-gray-700 text-lg leading-relaxed">
              朝起きてスマホを見たら、彼女から返信が来ている。
              <br />
              <span className="font-bold text-pink-500">「楽しみにしてます！」</span>
              <br />
              <br />
              思わずガッツポーズ。
              <br />
              <br />
              <span className="font-bold text-gray-900">その瞬間を、毎回味わえるとしたら？</span>
            </p>
          </div>
        </div>
      </section>

      {/* セクション7: 社会的証明（お客様の声） */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            利用者の声
          </h2>
          
          {/* カルーセル風の証言 */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-xl font-bold text-gray-900 mb-4">
                {testimonials[currentTestimonial].text}
              </p>
              <p className="text-gray-600 mb-4">
                {testimonials[currentTestimonial].detail}
              </p>
              <p className="text-sm text-gray-500">
                - {testimonials[currentTestimonial].author}
              </p>
            </div>
            
            {/* インジケーター */}
            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-pink-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* セクション8: 料金 / オファー */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
            まずは7日間、無料で試してください
          </h2>
          <p className="text-center text-gray-500 mb-12">
            合わなければいつでも解約OK
          </p>
          
          {/* 料金カード */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 月額プラン */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">月額プラン</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">¥6,980</span>
                <span className="text-gray-500">/月</span>
              </div>
              <ul className="space-y-2 mb-6">
                {['1日50回まで使い放題', '3つの返信候補+解説', '音声・画像入力対応'].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-600 text-sm">
                    <Check className="w-4 h-4 text-pink-500 mr-2" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/subscribe"
                className="block w-full py-3 bg-white border-2 border-pink-500 text-pink-500 font-bold text-center rounded-full hover:bg-pink-50 transition-colors"
              >
                7日間無料で試す
              </Link>
            </div>
            
            {/* 年額プラン */}
            <div className="p-6 bg-gradient-to-br from-pink-50 to-coral-50 rounded-2xl border-2 border-pink-300 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-pink-500 text-white text-xs font-bold rounded-full">
                29%OFF
              </div>
              <h3 className="font-bold text-gray-900 mb-2">年額プラン</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-gray-900">¥59,800</span>
                <span className="text-gray-500">/年</span>
              </div>
              <p className="text-sm text-pink-500 font-medium mb-4">
                月あたり¥4,983
              </p>
              <ul className="space-y-2 mb-6">
                {['1日50回まで使い放題', '3つの返信候補+解説', '音声・画像入力対応', '優先サポート'].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-600 text-sm">
                    <Check className="w-4 h-4 text-pink-500 mr-2" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/subscribe?plan=yearly"
                className="block w-full py-3 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold text-center rounded-full hover:opacity-90 transition-opacity"
              >
                7日間無料で試す
              </Link>
            </div>
          </div>
          
          {/* リスクリバーサル */}
          <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { icon: <Shield className="w-5 h-5" />, text: '7日間は完全無料' },
                { icon: <X className="w-5 h-5" />, text: '合わなければいつでも解約OK' },
                { icon: <Zap className="w-5 h-5" />, text: '解約はワンクリック' },
              ].map((item, index) => (
                <div key={index} className="flex items-center text-gray-600 text-sm">
                  <div className="text-pink-500 mr-2">{item.icon}</div>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
          
          {/* 価値スタッキング */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-2">
              <span className="text-gray-900 font-bold">マッチングアプリに毎月¥4,000払って成果ゼロ</span>
            </p>
            <p className="text-gray-500">vs</p>
            <p className="text-pink-500 font-bold">
              SendRightに¥6,980払って彼女候補と毎週デート
            </p>
          </div>
        </div>
      </section>

      {/* セクション9: FAQ */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            よくある質問
          </h2>
          
          <div className="space-y-4">
            {[
              {
                q: '本当に10秒で返信が作れますか？',
                a: 'はい。メッセージを貼り付けるだけで、AIが即座に3つの候補を生成します。',
              },
              {
                q: 'どんなアプリでも使えますか？',
                a: 'Tinder、Pairs、with、Omiai、タップルなど、主要なマッチングアプリすべてに対応。LINEでの会話にも使えます。',
              },
              {
                q: 'AIが作った返信だとバレませんか？',
                a: 'バレません。あなたのパーソナライズ設定（年齢、性格、話し方）を反映した自然な文章を生成します。',
              },
              {
                q: '解約は簡単ですか？',
                a: 'ワンクリックで解約できます。引き止めや電話は一切ありません。',
              },
              {
                q: 'スマホだけで使えますか？',
                a: 'はい。スマホのブラウザからアクセスするだけ。アプリのダウンロードは不要です。',
              },
            ].map((item, index) => (
              <details key={index} className="group bg-white rounded-xl border border-gray-200">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">{item.q}</span>
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-gray-600">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* セクション10: 最終CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            次のマッチを逃す前に
          </h2>
          
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            今夜も、返信で悩み続けますか？
            <br />
            それとも、10秒で正解を手に入れますか？
            <br />
            <br />
            7日間無料。合わなければ即解約OK。
            <br />
            <span className="font-bold text-gray-900">リスクはゼロです。</span>
          </p>
          
          <Link
            href="/subscribe"
            className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-pink-500 to-coral-500 text-white font-bold text-xl rounded-full hover:opacity-90 transition-all shadow-xl shadow-pink-200/50"
          >
            7日間無料で始める
            <ArrowRight className="w-6 h-6 ml-2" />
          </Link>
          
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span>※ クレジットカード登録不要</span>
            <span>※ 1分で登録完了</span>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-12 px-4 sm:px-6 bg-gray-900 text-gray-400">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
            <Link href="/legal" className="hover:text-white transition-colors">特定商取引法に基づく表記</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
            <Link href="/contact" className="hover:text-white transition-colors">お問い合わせ</Link>
          </div>
          <p className="text-center text-sm">
            © 2024 SendRight. All rights reserved.
          </p>
        </div>
      </footer>

      {/* VSLモーダル */}
      {showVSLModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => {
              setShowVSLModal(false)
              if (vslVideoRef.current) {
                vslVideoRef.current.pause()
              }
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            {/* 実際の動画がある場合はここにvideo要素を配置 */}
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-2xl mb-4">🎬 VSL動画</p>
                <p className="text-gray-400 text-sm">
                  （動画ファイルを /public/vsl.mp4 に配置してください）
                </p>
              </div>
            </div>
            
            {/* 動画コントロール */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
