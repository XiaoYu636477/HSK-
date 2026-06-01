import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Target, Zap, Sparkles, X, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'hsk_onboarded_v1';

const steps = [
  { icon: Target,   titleKey: 'onboard.step1.title', descKey: 'onboard.step1.desc', grad: 'from-rose-500 to-rose-600',   glow: 'shadow-rose-500/30' },
  { icon: Zap,      titleKey: 'onboard.step2.title', descKey: 'onboard.step2.desc', grad: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/30' },
  { icon: Sparkles, titleKey: 'onboard.step3.title', descKey: 'onboard.step3.desc', grad: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/30' },
];

export default function OnboardingTour() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // 延迟 800ms 展示，避免与页面动画冲突
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, '1');
    }, 300);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  if (!visible) return null;

  const s = steps[step];

  return (
    <>
      {/* 遮罩 */}
      <div
        className={`fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[998] transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
        onClick={dismiss}
      />

      {/* 浮层卡片 */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] w-full max-w-[calc(100%-2rem)] md:max-w-sm transition-all duration-300 ${
          exiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
        }`}
        style={{
          background: 'hsl(224,42%,8%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1.25rem',
          boxShadow: '0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* 顶部彩条 */}
        <div className="h-[2px] rounded-t-[1.25rem]"
          style={{ background: 'linear-gradient(90deg,hsl(226,72%,56%),hsl(280,65%,60%),hsl(320,60%,56%))' }} />

        <div className="p-5">
          {/* 头部：进度 + 关闭 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <button onClick={dismiss}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/8 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 步骤内容 */}
          <div className="flex gap-4 items-start">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center shrink-0 shadow-lg ${s.glow} animate-float`}
            >
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-base text-white mb-1.5">
                {t(s.titleKey, language)}
              </h3>
              <p className="text-xs text-white/55 leading-relaxed text-pretty">
                {t(s.descKey, language)}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between mt-5">
            <button onClick={dismiss}
              className="text-xs text-white/30 hover:text-white/55 transition-colors px-2 py-1">
              {t('onboard.skip', language)}
            </button>

            <button
              onClick={next}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg,hsl(226,72%,50%),hsl(260,68%,58%))',
                boxShadow: '0 4px 14px hsl(226,72%,42%,0.35)',
              }}
            >
              {step < steps.length - 1 ? t('onboard.next', language) : t('onboard.done', language)}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
