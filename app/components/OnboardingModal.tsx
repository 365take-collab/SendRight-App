'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

interface OnboardingStep {
  title: string;
  content: string;
  image?: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'SendRightへようこそ！',
    content: 'SendRightは、AIがあなたの代わりに最適な返信を生成するサービスです。\n\nメッセージを入力するだけで、3つの返信候補が自動生成されます。',
  },
  {
    title: 'メッセージの入力方法',
    content: 'メッセージは3つの方法で入力できます：\n\n1. テキスト入力：直接メッセージを入力\n2. 音声入力：マイクボタンで音声を入力\n3. 画像アップロード：LINEやDMのスクリーンショットをアップロード',
  },
  {
    title: 'パーソナライズ設定',
    content: '「パーソナライズ設定」で、相手の情報を入力すると、より適切な返信が生成されます。\n\n名前、年齢、関係性、趣味・好み、性格などを設定できます。',
  },
  {
    title: '返信候補の選び方',
    content: '生成された3つの返信候補から、最適なものを選んでください。\n\n各候補には「解説」が付いているので、なぜその返信が適切かを理解できます。\n\n「コピー」ボタンで返信をコピーして、そのまま送信できます。',
  },
];

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 初回訪問かチェック
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-pink-100 max-w-2xl w-full mx-4 p-8 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-pink-500 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {steps[currentStep].title}
            </h2>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded ${
                    index <= currentStep ? 'bg-pink-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-pink-50/50 rounded-xl p-6 mb-6 border border-pink-100">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {steps[currentStep].content}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-pink-500 transition-colors text-sm"
          >
            スキップ
          </button>

          <div className="flex items-center gap-4">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                前へ
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-gradient-to-r from-pink-500 to-coral-500 text-white rounded-lg hover:from-pink-400 hover:to-coral-400 transition-colors font-medium shadow-md"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  始める
                </>
              ) : (
                <>
                  次へ
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
