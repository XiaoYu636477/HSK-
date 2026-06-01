import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import {
  PenLine, BookOpen, Mic, BarChart3, Lightbulb, History, BookOpenCheck, Rocket,
  ArrowRight, Sparkles, Zap, Target, BookMarked,
  Languages, Infinity as InfinityIcon, Wand2,
} from 'lucide-react';

const modules = [
  {
    key: 'nav.essay', desc: 'module.essay.desc', path: '/essay',
    icon: PenLine,
    grad: 'from-blue-500 to-blue-600',
    bg: 'from-blue-500/12 to-blue-600/4',
    border: 'border-blue-400/20',
    glow: 'hover:shadow-blue-500/12',
  },
  {
    key: 'nav.homework', desc: 'module.homework.desc', path: '/homework',
    icon: BookOpen,
    grad: 'from-emerald-500 to-emerald-600',
    bg: 'from-emerald-500/12 to-emerald-600/4',
    border: 'border-emerald-400/20',
    glow: 'hover:shadow-emerald-500/12',
  },
  {
    key: 'nav.oral', desc: 'module.oral.desc', path: '/oral',
    icon: Mic,
    grad: 'from-violet-500 to-violet-600',
    bg: 'from-violet-500/12 to-violet-600/4',
    border: 'border-violet-400/20',
    glow: 'hover:shadow-violet-500/12',
  },
  {
    key: 'nav.exam', desc: 'module.exam.desc', path: '/exam',
    icon: BookOpenCheck,
    grad: 'from-purple-500 to-purple-600',
    bg: 'from-purple-500/12 to-purple-600/4',
    border: 'border-purple-400/20',
    glow: 'hover:shadow-purple-500/12',
  },
  {
    key: 'nav.score', desc: 'module.score.desc', path: '/score',
    icon: BarChart3,
    grad: 'from-amber-500 to-amber-600',
    bg: 'from-amber-500/12 to-amber-600/4',
    border: 'border-amber-400/20',
    glow: 'hover:shadow-amber-500/12',
  },
  {
    key: 'nav.tips', desc: 'module.tips.desc', path: '/tips',
    icon: Lightbulb,
    grad: 'from-rose-500 to-rose-600',
    bg: 'from-rose-500/12 to-rose-600/4',
    border: 'border-rose-400/20',
    glow: 'hover:shadow-rose-500/12',
  },
  {
    key: 'nav.history', desc: 'module.history.desc', path: '/history',
    icon: History,
    grad: 'from-sky-500 to-sky-600',
    bg: 'from-sky-500/12 to-sky-600/4',
    border: 'border-sky-400/20',
    glow: 'hover:shadow-sky-500/12',
  },
  {
    key: 'nav.profile', desc: 'module.profile.desc', path: '/profile',
    icon: Rocket,
    grad: 'from-indigo-500 to-indigo-600',
    bg: 'from-indigo-500/12 to-indigo-600/4',
    border: 'border-indigo-400/20',
    glow: 'hover:shadow-indigo-500/12',
  },
];

const steps = [
  {
    icon: Target,
    zh: '诊断', en: 'Diagnose', ru: 'Диагноз',
    descZh: '六维雷达图精准定位薄弱环节，可视化能力全貌',
    descEn: '6-axis radar pinpoints weaknesses, visualize full skill map',
    descRu: 'Радар с 6 измерениями точно находит слабые места',
    iconGrad: 'from-rose-500 to-rose-600',
    shadow: 'shadow-rose-500/25',
    numColor: 'text-rose-500/20',
    num: '01',
    path: '/score',
  },
  {
    icon: Zap,
    zh: '分析', en: 'Analyze', ru: 'Анализ',
    descZh: 'AI 逐句批改对照，错误原因清晰透明，一目了然',
    descEn: 'AI corrects sentence by sentence with transparent explanations',
    descRu: 'ИИ исправляет каждое предложение с пояснениями',
    iconGrad: 'from-amber-500 to-amber-600',
    shadow: 'shadow-amber-500/25',
    numColor: 'text-amber-500/20',
    num: '02',
    path: '/essay',
  },
  {
    icon: Sparkles,
    zh: '提升', en: 'Improve', ru: 'Рост',
    descZh: '精准生成针对性练习题，闭环强化薄弱知识点',
    descEn: 'Auto-generated targeted exercises close your learning loop',
    descRu: 'Автоматические упражнения закрывают пробелы в знаниях',
    iconGrad: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/25',
    numColor: 'text-emerald-500/20',
    num: '03',
    path: '/tips',
  },
];

// 统计数据配置（含语义图标）
const stats = [
  { n: '6+', icon: BookMarked,  zhLabel: '学习模块', enLabel: 'Modules',    ruLabel: 'Модулей' },
  { n: '∞',  icon: InfinityIcon, zhLabel: 'AI 批改',  enLabel: 'Corrections', ruLabel: 'Проверок' },
  { n: '3',  icon: Languages,   zhLabel: '语言支持', enLabel: 'Languages',  ruLabel: 'Языков' },
];

export default function HomePage() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const L = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  // 用户名显示
  const displayName = user?.user_metadata?.username
    || user?.email?.split('@')[0]
    || null;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-10">

      {/* ══════════════════════════════════
          Hero
      ══════════════════════════════════ */}
      <div
        className="relative rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: 'linear-gradient(135deg, hsl(226,72%,34%) 0%, hsl(256,68%,44%) 55%, hsl(290,60%,38%) 100%)',
          boxShadow: '0 28px 72px hsl(226,72%,34%,0.32), 0 8px 24px hsl(256,68%,44%,0.16)',
        }}
      >
        {/* 网格底纹 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        {/* 右上光晕 */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none opacity-18"
          style={{ background: 'radial-gradient(circle,hsl(280,72%,72%),transparent 68%)' }} />
        {/* 左下光晕 */}
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none opacity-12"
          style={{ background: 'radial-gradient(circle,hsl(200,82%,78%),transparent 68%)' }} />

        <div className="relative px-5 py-8 md:px-12 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">

            {/* 左侧主文案 */}
            <div className="max-w-lg">
              {/* 个性化欢迎 / AI 标签 */}
              <div className="glass-dark inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5">
                {/* 高质感笔+魔法图标组合 */}
                <span className="relative flex items-center shrink-0">
                  <PenLine className="w-3.5 h-3.5 text-white/80" />
                  <Wand2 className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-yellow-300/90" />
                </span>
                {displayName ? (
                  <span className="text-xs font-semibold text-white/85 tracking-wide">
                    {L(`欢迎回来，${displayName}！`, `Welcome back, ${displayName}!`, `С возвращением, ${displayName}!`)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-white/85 tracking-wide">
                    {L('AI 智能批改 · 高效备考', 'AI Correction · Smart Exam Prep', 'ИИ-проверка · Умная подготовка')}
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>

              {/* 主标题 — 使用真实文案 */}
              <h1 className="text-2xl md:text-[2.35rem] font-black text-white mb-3 leading-[1.18] text-balance">
                {t('home.title', language)}
              </h1>

              {/* 副标题 — 关键词高亮拆分 */}
              {language === 'zh' && (
                <p className="text-white/72 text-sm md:text-[0.9375rem] leading-relaxed max-w-md text-pretty">
                  <span
                    className="font-bold"
                    style={{ background: 'linear-gradient(90deg,hsl(200,90%,75%),hsl(226,85%,80%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >AI 智能批改</span>
                  <span className="text-white/55"> 与 </span>
                  <span
                    className="font-bold"
                    style={{ background: 'linear-gradient(90deg,hsl(280,80%,78%),hsl(310,75%,80%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >备考分析</span>
                  <span className="text-white/55">，助你</span>
                  <span className="text-white font-semibold"> 高效通过</span>
                  <span className="text-white/55"> 汉语水平考试</span>
                </p>
              )}
              {language === 'en' && (
                <p className="text-white/72 text-sm md:text-[0.9375rem] leading-relaxed max-w-md text-pretty">
                  <span
                    className="font-bold"
                    style={{ background: 'linear-gradient(90deg,hsl(200,90%,75%),hsl(226,85%,80%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >AI-powered correction</span>
                  <span className="text-white/55"> & </span>
                  <span
                    className="font-bold"
                    style={{ background: 'linear-gradient(90deg,hsl(280,80%,78%),hsl(310,75%,80%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >exam analysis</span>
                  <span className="text-white/55"> to help you </span>
                  <span className="text-white font-semibold">pass HSK efficiently</span>
                </p>
              )}
              {language === 'ru' && (
                <p className="text-white/72 text-sm md:text-[0.9375rem] leading-relaxed max-w-md text-pretty">
                  <span
                    className="font-bold"
                    style={{ background: 'linear-gradient(90deg,hsl(200,90%,75%),hsl(226,85%,80%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >ИИ-проверка</span>
                  <span className="text-white/55"> и </span>
                  <span
                    className="font-bold"
                    style={{ background: 'linear-gradient(90deg,hsl(280,80%,78%),hsl(310,75%,80%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >анализ</span>
                  <span className="text-white/55"> для </span>
                  <span className="text-white font-semibold">успешной сдачи HSK</span>
                </p>
              )}

              {/* 功能标签徽章 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {(language === 'zh'
                  ? ['✦ 秒级批改', '✦ 六维分析', '✦ 个性化提升']
                  : language === 'ru'
                  ? ['✦ Мгновенная проверка', '✦ 6D анализ', '✦ Персонализация']
                  : ['✦ Instant Feedback', '✦ 6D Analysis', '✦ Personalized']
                ).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.10)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.70)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >{tag}</span>
                ))}
              </div>

              {/* CTA 按钮组 */}
              <div className="flex flex-wrap gap-3 mt-7">
                <Link
                  to="/essay"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                  }}
                >
                  {/* 笔+AI 图标组合 */}
                  <span className="relative flex items-center">
                    <PenLine className="w-4 h-4" />
                    <Sparkles className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-yellow-300" />
                  </span>
                  {t('home.cta.start', language)}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <Link
                  to="/history"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white/80 transition-all duration-200 hover:text-white hover:-translate-y-0.5 active:scale-[0.97]"
                  style={{
                    background: 'rgba(255,255,255,0.09)',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >
                  <History className="w-4 h-4" />
                  {t('home.cta.history', language)}
                </Link>
              </div>
            </div>

            {/* 右侧统计卡片（含图标） */}
            <div className="hidden md:flex flex-col gap-2.5 shrink-0">
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="glass-dark px-5 py-3.5 rounded-2xl flex items-center gap-3.5 min-w-[148px] animate-float"
                  style={{ animationDelay: `${i * 0.38}s` }}
                >
                  {/* 语义图标 */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.14)' }}
                  >
                    <s.icon className="w-4 h-4 text-white/85" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-white leading-tight">{s.n}</div>
                    <div className="text-[10px] text-white/55 font-medium mt-0.5">
                      {language === 'zh' ? s.zhLabel : language === 'ru' ? s.ruLabel : s.enLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          智能学习闭环（3步）
      ══════════════════════════════════ */}
      <div className="animate-fade-up delay-100">
        {/* 区块标题 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
            {t('home.loop.title', language)}
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 步骤间连接线（桌面） */}
          <div className="hidden md:block absolute top-1/2 left-[33%] right-[33%] h-px -translate-y-1/2 pointer-events-none z-0"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent)' }} />

          {steps.map((s, i) => (
            <Link
              key={i}
              to={s.path}
              className="card-premium relative overflow-hidden p-4 md:p-5 z-10 animate-card-in group transition-all duration-250 hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.98] cursor-pointer block"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              {/* 品牌色半透明序号 */}
              <div
                className={`absolute top-3 right-4 text-6xl font-black leading-none select-none pointer-events-none ${s.numColor}`}
              >
                {s.num}
              </div>

              {/* 图标 */}
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.iconGrad} flex items-center justify-center mb-4 shadow-lg ${s.shadow} transition-transform duration-250 group-hover:scale-105`}
              >
                <s.icon className="w-5 h-5 text-white" />
              </div>

              <h3 className="font-black text-base mb-1.5 group-hover:text-primary transition-colors duration-200">
                {language === 'zh' ? s.zh : language === 'ru' ? s.ru : s.en}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                {language === 'zh' ? s.descZh : language === 'ru' ? s.descRu : s.descEn}
              </p>

              {/* 底部 ArrowRight 入口指引 */}
              <div className="flex items-center justify-end mt-4">
                <div className="w-6 h-6 rounded-full bg-foreground/5 group-hover:bg-primary/12 flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </div>

              {/* 移动端步骤箭头（前两个） */}
              {i < 2 && (
                <div className="md:hidden flex items-center justify-end mt-1 -mb-1">
                  <ArrowRight className="w-4 h-4 text-muted-foreground/25" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════
          功能模块网格
      ══════════════════════════════════ */}
      <div className="animate-fade-up delay-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
            {t('home.modules.title', language)}
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {modules.map((m, i) => (
            <Link
              key={m.path}
              to={m.path}
              className={`group card-premium relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br ${m.bg} border ${m.border} ${m.glow} hover:shadow-lg animate-card-in transition-all duration-250 hover:-translate-y-1.5 active:scale-[0.98]`}
              style={{ animationDelay: `${0.1 + i * 0.07}s` }}
            >
              {/* hover 光波 */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 28% 38%, rgba(255,255,255,0.07), transparent 68%)' }} />

              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${m.grad} flex items-center justify-center shrink-0 shadow-md transition-transform duration-250 group-hover:scale-110 group-hover:rotate-[-3deg]`}
                >
                  <m.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs md:text-sm mb-0.5 md:mb-1 text-foreground group-hover:text-primary transition-colors duration-200 text-balance">
                    {t(m.key, language)}
                  </h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed line-clamp-2 text-pretty hidden md:block">
                    {t(m.desc, language)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end mt-3">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-foreground/5 group-hover:bg-primary/12 flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
