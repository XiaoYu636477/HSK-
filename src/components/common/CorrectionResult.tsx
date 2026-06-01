import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import type { RadarData, Correction, Exercise, ScoreInfo, ImprovementTip } from '@/types/types';
import RadarChart from './RadarChart';
import TrendChart from './TrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle, CheckCircle2, ChevronRight, BookOpen, Info, Sparkles,
  Trophy, Star, TrendingUp, Target, Lightbulb, FileText, ChevronDown, GraduationCap,
} from 'lucide-react';

interface CorrectionResultProps {
  radarData: RadarData;
  corrections: Correction[];
  exercises: Exercise[];
  overallComment?: string;
  suggestions?: string;
  trendData?: { date: string; score: number }[];
  module: string;
  // 新模板字段
  scoreInfo?: ScoreInfo;
  strengths?: string[];
  improvementTips?: ImprovementTip[];
  modelAnswer?: string;
}

/** 数字滚动动画 */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

// ── 颜色工具 ──────────────────────────────────────────────────────────────────
function scoreColors(score: number) {
  if (score >= 80) return { text: 'text-emerald-500', border: 'border-emerald-500/25', bg: 'from-emerald-500/10 via-emerald-500/5 to-transparent', bar: 'linear-gradient(90deg,hsl(142,68%,42%),hsl(160,60%,48%))' };
  if (score >= 60) return { text: 'text-amber-500',   border: 'border-amber-500/25',   bg: 'from-amber-500/10 via-amber-500/5 to-transparent',   bar: 'linear-gradient(90deg,hsl(38,88%,50%),hsl(48,88%,55%))' };
  return              { text: 'text-rose-500',   border: 'border-rose-500/25',   bg: 'from-rose-500/10 via-rose-500/5 to-transparent',   bar: 'linear-gradient(90deg,hsl(0,78%,52%),hsl(20,78%,58%))' };
}

// ── 可折叠区块 ────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, accent, children, defaultOpen = true }:
  { title: string; icon: React.ElementType; accent: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-premium overflow-hidden animate-fade-up">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="flex-1 text-left text-sm font-bold">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-border/40">{children}</div>}
    </div>
  );
}

export default function CorrectionResult({
  radarData, corrections, exercises, overallComment, suggestions, trendData, module: mod,
  scoreInfo, strengths, improvementTips, modelAnswer,
}: CorrectionResultProps) {
  const { language } = useLanguage();
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const isNewTemplate = !!(scoreInfo);
  const vals = Object.values(radarData);
  const avgScore = scoreInfo?.total ?? (vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0);
  const displayScore = useCountUp(avgScore, 900);
  const c = scoreColors(avgScore);

  const filteredCorrections = selectedDimension
    ? corrections.filter(x => x.dimension === selectedDimension)
    : corrections;

  const L = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  const levelColor = (level?: string) => {
    if (!level) return 'bg-muted text-muted-foreground';
    if (level === '优秀' || level === 'Excellent' || level === 'Отлично') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
    if (level === '良好' || level === 'Good'      || level === 'Хорошо')  return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
    if (level === '合格' || level === 'Pass'       || level === 'Зачёт')   return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
  };

  // ── 评分细则弹窗（按模块展示不同权重） ────────────────────────────────────────
  const isOral = mod === 'oral';
  const rubricRows = isOral ? [
    { dim: L('流利度',  'Fluency',     'Беглость'),   weight: '35%', desc: L('语速自然、连贯，少停顿', 'Natural pace, coherent', 'Темп, связность') },
    { dim: L('语法',    'Grammar',     'Грамматика'), weight: '25%', desc: L('句型正确，无影响理解的语法错', 'Correct structures',  'Правильные структуры') },
    { dim: L('词汇',    'Vocabulary',  'Словарь'),    weight: '20%', desc: L('用词准确、丰富，达到该级别水平', 'Rich & accurate vocab', 'Точная лексика') },
    { dim: L('发音',    'Pronunciation','Произн.'),   weight: '15%', desc: L('声母韵母准确，轻微口音不扣分', 'Clear initials/finals', 'Чёткое произношение') },
    { dim: L('声调',    'Tones',       'Тоны'),       weight: '5%',  desc: L('四声基本正确，侧重可理解性', 'Mostly correct tones', 'Основные тоны') },
  ] : [
    { dim: L('语法',    'Grammar',     'Грамматика'), weight: '30%', desc: L('句型正确，无病句成分残缺', 'Correct structures', 'Правильные структуры') },
    { dim: L('词汇',    'Vocabulary',  'Словарь'),    weight: '25%', desc: L('词汇量达到该级别，搭配准确', 'Level-appropriate vocab', 'Точная лексика') },
    { dim: L('结构',    'Structure',   'Структура'),  weight: '20%', desc: L('层次清晰，有引出、展开、总结', 'Clear intro/body/end', 'Вступление, осн. часть, вывод') },
    { dim: L('表达',    'Expression',  'Выражение'),  weight: '15%', desc: L('流畅自然，关联词使用恰当', 'Fluent, connectors used', 'Связки, плавность') },
    { dim: L('逻辑',    'Logic',       'Логика'),     weight: '8%',  desc: L('论点清晰，前后一致', 'Clear arguments', 'Чёткая аргументация') },
    { dim: L('书写',    'Writing',     'Письмо'),     weight: '2%',  desc: L('汉字规范，标点正确', 'Neat chars & punctuation', 'Аккуратные иероглифы') },
  ];

  const gradeRows = [
    { grade: L('优秀', 'Excellent', 'Отлично'), range: '90–100', color: 'text-emerald-500', dot: 'bg-emerald-500' },
    { grade: L('良好', 'Good',      'Хорошо'),  range: '75–89',  color: 'text-blue-500',    dot: 'bg-blue-500' },
    { grade: L('合格', 'Pass',      'Зачёт'),   range: '60–74',  color: 'text-amber-500',   dot: 'bg-amber-500' },
    { grade: L('不合格','Fail',     'Незачёт'), range: '0–59',   color: 'text-rose-500',    dot: 'bg-rose-500' },
  ];

  const ScoringRubricButton = () => (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/40 bg-background/60 hover:bg-primary/5 px-2 py-1 rounded-lg transition-all duration-200 shrink-0"
          title={L('查看评分细则', 'Scoring criteria', 'Критерии')}
        >
          <Info className="w-3 h-3" />
          <span className="hidden sm:inline">{L('评分细则', 'Rubric', 'Критерии')}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Info className="w-3.5 h-3.5 text-white" />
            </div>
            {L('HSK 3.0 评分细则', 'HSK 3.0 Scoring Rubric', 'Критерии HSK 3.0')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {/* 维度权重表 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {L('评分维度与权重', 'Dimensions & Weights', 'Параметры и вес')}
            </p>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              {rubricRows.map((row, i) => (
                <div key={row.dim} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                  <div className="w-16 shrink-0">
                    <span className="text-xs font-bold text-foreground">{row.dim}</span>
                  </div>
                  <div className="w-10 shrink-0">
                    <span className="text-xs font-black tabular-nums text-primary">{row.weight}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug flex-1 min-w-0">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 等级标准 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {L('等级标准', 'Grade Standards', 'Стандарты оценок')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {gradeRows.map(g => (
                <div key={g.grade} className="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 bg-muted/10">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                  <div>
                    <p className={`text-xs font-bold ${g.color}`}>{g.grade}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{g.range} {L('分', 'pts', 'б.')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 因材施教说明 */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5 flex gap-2.5">
            <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {L(
                'AI 会先自动判断你的汉语水平（初级 / 中级 / 高级），再按该水平的标准打分——让评分更公平，不同程度的学生都能得到准确反馈。',
                'AI first detects your Chinese level (beginner / intermediate / advanced), then scores you relative to that level — so the feedback is always fair and meaningful.',
                'ИИ сначала определяет ваш уровень (начальный / средний / продвинутый), затем оценивает относительно этого уровня — для справедливой и точной обратной связи.'
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ══ 新模板：顶部评分卡 ══════════════════════════════════════════════════ */}
      {isNewTemplate ? (
        <div className={`card-premium relative overflow-hidden bg-gradient-to-br ${c.bg} border ${c.border}`}>
          {/* 背景装饰光圈 */}
          <div className="absolute right-0 top-0 w-48 h-48 rounded-full opacity-8 -translate-y-1/2 translate-x-1/2 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'}, transparent)` }} />

          <div className="relative p-5">
            {/* 顶行：分数 + 等级 + 是否合格 */}
            <div className="flex items-start gap-5 mb-4">
              {/* 环形分数 */}
              <div className="shrink-0 relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="url(#scoreArcNew)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - avgScore / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s' }} />
                  <defs>
                    <linearGradient id="scoreArcNew" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'} />
                      <stop offset="100%" stopColor={avgScore >= 80 ? '#34d399' : avgScore >= 60 ? '#fbbf24' : '#f87171'} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black leading-none ${c.text}`}>{displayScore}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">{L('分', 'pts', 'б.')}</span>
                </div>
              </div>

              {/* 等级信息 */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${levelColor(scoreInfo?.level)}`}>
                    {scoreInfo?.level}
                  </span>
                  {scoreInfo?.passed !== undefined && (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      scoreInfo.passed
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                    }`}>
                      {scoreInfo.passed
                        ? <><CheckCircle2 className="w-3 h-3" />{L('合格', 'PASS', 'Зачёт')}</>
                        : <><AlertCircle className="w-3 h-3" />{L('不合格', 'FAIL', 'Незачёт')}</>
                      }
                    </span>
                  )}
                  {/* AI 检测级别标签 */}
                  {scoreInfo?.detected_level && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-primary/8 text-primary border border-primary/20">
                      <GraduationCap className="w-3 h-3" />
                      {scoreInfo.detected_level}
                    </span>
                  )}
                  {/* 评分细则按钮 */}
                  <ScoringRubricButton />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {overallComment || L('分析完成，查看下方详细报告。', 'Analysis complete.', 'Анализ завершён.')}
                </p>
              </div>
            </div>

            {/* 各维度得分条 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(radarData).map(([dim, score]) => {
                const dc = scoreColors(score);
                return (
                  <div key={dim} className="bg-background/50 rounded-xl px-3 py-2.5 border border-border/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">{dim}</span>
                      <span className={`text-xs font-bold tabular-nums ${dc.text}`}>{score}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: dc.bar, transition: 'width 1s cubic-bezier(0.22,1,0.36,1) 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── 旧模板评分卡（score 模块保留原样式） ── */
        <div className={`card-premium relative overflow-hidden bg-gradient-to-br ${c.bg} border ${c.border}`}>
          <div className="absolute right-0 top-0 w-40 h-40 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'}, transparent)` }} />
          <div className="relative p-5 flex items-center gap-5">
            <div className="shrink-0 relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="url(#scoreArc)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - avgScore / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) 0.2s' }} />
                <defs><linearGradient id="scoreArc" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'} />
                  <stop offset="100%" stopColor={avgScore >= 80 ? '#34d399' : avgScore >= 60 ? '#fbbf24' : '#f87171'} />
                </linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black leading-none ${c.text}`}>{displayScore}</span>
                <span className="text-[9px] text-muted-foreground font-medium mt-0.5">{language === 'zh' ? '分' : 'pts'}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('result.overall', language)}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                {overallComment || (language === 'zh' ? '分析完成，查看下方详细报告。' : 'Analysis complete.')}
              </p>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${avgScore}%`, background: c.bar, transition: 'width 1s cubic-bezier(0.22,1,0.36,1) 0.3s' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ 新模板：6 模块展示 ══════════════════════════════════════════════════ */}
      {isNewTemplate ? (
        <div className="space-y-3">

          {/* ── ① 核心优点 ── */}
          {strengths && strengths.length > 0 && (
            <Section title={L('✅ 核心优点', '✅ Key Strengths', '✅ Сильные стороны')} icon={Star} accent="bg-gradient-to-br from-emerald-500 to-emerald-600">
              <ul className="p-5 space-y-2.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/12 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{s}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ── ② 错误与扣分点 ── */}
          {corrections.length > 0 && (
            <Section title={L('❌ 错误与扣分点', '❌ Errors & Deductions', '❌ Ошибки и баллы')} icon={AlertCircle} accent="bg-gradient-to-br from-rose-500 to-rose-600">
              <div className="p-4 space-y-3">
                {/* 维度过滤 */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedDimension(null)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 font-medium ${
                      !selectedDimension ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}>
                    {L('全部', 'All', 'Все')}
                  </button>
                  {[...new Set(corrections.map(x => x.dimension))].map(dim => (
                    <button key={dim}
                      onClick={() => setSelectedDimension(prev => prev === dim ? null : dim)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 font-medium ${
                        selectedDimension === dim ? 'bg-rose-500 text-white border-rose-500' : 'border-border/60 text-muted-foreground hover:border-rose-400/50 hover:text-foreground'
                      }`}>
                      {dim}
                    </button>
                  ))}
                </div>

                {/* 错误列表 */}
                {filteredCorrections.map((c, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-border/50 animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
                    {/* 维度标签行 */}
                    <div className="px-4 py-2.5 bg-muted/30 flex items-center gap-2 border-b border-border/40">
                      <Badge variant="outline" className="text-[10px] rounded-lg border-rose-400/30 text-rose-500 bg-rose-500/8 cursor-pointer hover:bg-rose-500 hover:text-white transition-colors"
                        onClick={() => setSelectedDimension(prev => prev === c.dimension ? null : c.dimension)}>
                        {c.dimension}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{L('错误分析', 'Error Analysis', 'Анализ ошибки')}</span>
                    </div>
                    {/* 原句 vs 修改 */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="p-4 bg-rose-50/60 dark:bg-rose-950/15 border-b md:border-b-0 md:border-r border-border/40">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">{L('原句', 'Original', 'Оригинал')}</p>
                        <p className="text-sm font-medium leading-relaxed text-foreground/90">&ldquo;{c.original}&rdquo;</p>
                      </div>
                      <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/15">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">{L('修改为', 'Corrected', 'Исправление')}</p>
                        <p className="text-sm font-medium leading-relaxed text-foreground/90">&ldquo;{c.corrected}&rdquo;</p>
                      </div>
                    </div>
                    {/* 解释 */}
                    <div className="px-4 py-3 bg-muted/15 border-t border-border/40 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{c.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── ③ 提升建议 ── */}
          {improvementTips && improvementTips.length > 0 && (
            <Section title={L('🎯 提升建议', '🎯 Improvement Tips', '🎯 Советы')} icon={TrendingUp} accent="bg-gradient-to-br from-blue-500 to-blue-600">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {improvementTips.map((tip, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-blue-500/6 border border-blue-500/15 animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <Target className="w-3 h-3 text-blue-500" />
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{tip.dimension}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── ④ 针对性练习 ── */}
          {exercises.length > 0 && (
            <Section title={L('📝 针对性练习', '📝 Targeted Exercises', '📝 Упражнения')} icon={BookOpen} accent="bg-gradient-to-br from-violet-500 to-violet-600">
              <div className="p-4 space-y-3">
                {exercises.map((ex, i) => (
                  <div key={i} className="rounded-xl border border-border/50 overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                    {/* 题头 */}
                    <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-white text-xs font-bold">{i + 1}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] rounded-lg border-violet-400/25 text-violet-500">{ex.type}</Badge>
                      {ex.hint && <span className="ml-auto text-[10px] text-muted-foreground italic">{ex.hint}</span>}
                    </div>

                    <div className="p-4 space-y-3">
                      <p className="text-sm font-semibold leading-relaxed">{ex.question}</p>

                      {ex.options && (
                        <div className="space-y-1.5">
                          {ex.options.map((opt, oi) => {
                            const isCorrect = ex.answer ? opt.startsWith(ex.answer) : false;
                            return (
                              <div key={oi} className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border text-sm transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                                  : 'bg-muted/20 border-border/40 text-muted-foreground'
                              }`}>
                                {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                                <span className={isCorrect ? 'font-medium' : ''}>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {ex.keyword && (
                        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-400/20">
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">{L('关键词', 'Keyword', 'Ключевое слово')}</p>
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{ex.keyword}</p>
                          {ex.sample_answer && (
                            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-blue-400/20">
                              <span className="font-medium text-foreground/60">{L('参考答案：', 'Answer: ', 'Ответ: ')}</span>{ex.sample_answer}
                            </p>
                          )}
                        </div>
                      )}

                      {ex.text && (
                        <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-400/20">
                          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">{ex.text}</p>
                          {ex.pinyin && <p className="text-xs text-muted-foreground mt-1.5 tracking-wider font-mono">{ex.pinyin}</p>}
                        </div>
                      )}

                      {ex.explanation && (
                        <div className="flex items-start gap-2 pt-1">
                          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{ex.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── ⑤ 高分示范版本 ── */}
          {modelAnswer && (
            <Section title={L('💡 高分示范版本', '💡 Model Answer', '💡 Образцовый ответ')} icon={Lightbulb} accent="bg-gradient-to-br from-amber-500 to-amber-600">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    {L('以下为满分标准参考版本，可直接背诵练习', 'Reference model answer for full marks', 'Образцовый ответ для полных баллов')}
                  </span>
                </div>
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-amber-500/8 to-amber-600/3 border border-amber-500/20">
                  {/* 左侧装饰线 */}
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 ml-4" />
                  <p className="pl-5 text-sm leading-loose text-foreground/85 whitespace-pre-wrap">{modelAnswer}</p>
                </div>
              </div>
            </Section>
          )}

          {/* ── ⑥ 雷达图（折叠查看详细能力分布） ── */}
          <Section title={L('📊 能力雷达图', '📊 Skill Radar', '📊 Радар навыков')} icon={Sparkles} accent="bg-gradient-to-br from-primary to-primary/80" defaultOpen={false}>
            <div className="p-5">
              <p className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse-glow" />
                {t('result.click_hint', language)}
              </p>
              <RadarChart data={radarData}
                onDimensionClick={dim => setSelectedDimension(prev => prev === dim ? null : dim)}
                selectedDimension={selectedDimension} />
              {selectedDimension && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDimension(null)}
                    className="rounded-xl h-8 text-xs border-primary/30 text-primary hover:bg-primary/8">
                    {L('清除筛选', 'Clear', 'Сбросить')}
                  </Button>
                </div>
              )}
            </div>
          </Section>
        </div>
      ) : (
        /* ══ 旧模板：score 模块继续用 Tabs 展示 ══════════════════════════════ */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl p-1 bg-muted/60">
            {[
              { value: 'overview',    label: t('result.radar', language),        count: 0 },
              { value: 'corrections', label: t('result.corrections', language),  count: corrections.length },
              { value: 'exercises',   label: t('result.exercises', language),    count: exercises.length },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="rounded-lg text-xs font-semibold transition-all duration-200 data-[state=active]:shadow-sm">
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                    activeTab === tab.value ? 'bg-primary text-primary-foreground' : 'bg-primary/12 text-primary'
                  }`}>{tab.count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4 animate-fade-up">
            <div className="card-premium p-5">
              <p className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse-glow" />
                {t('result.click_hint', language)}
              </p>
              <RadarChart data={radarData}
                onDimensionClick={dim => setSelectedDimension(prev => prev === dim ? null : dim)}
                selectedDimension={selectedDimension} />
            </div>
            {trendData && trendData.length > 0 && (
              <Card className="rounded-2xl border-border/60 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold">{t('result.trend', language)}</CardTitle></CardHeader>
                <CardContent className="pb-4 px-5"><TrendChart data={trendData} /></CardContent>
              </Card>
            )}
            {suggestions && (
              <div className="card-premium p-5 bg-gradient-to-br from-blue-500/8 to-blue-600/3 border-blue-500/20">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/12 flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-blue-500" /></div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{t('result.suggestions', language)}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{suggestions}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="corrections" className="mt-4 space-y-3 animate-fade-up">
            {filteredCorrections.length === 0 ? (
              <div className="card-premium p-10 flex flex-col items-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60" />
                <p className="text-sm text-muted-foreground">{L('该维度表现很棒，暂无错误！', 'No errors!', 'Ошибок нет!')}</p>
              </div>
            ) : filteredCorrections.map((c2, i) => (
              <div key={i} className="card-premium overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-4 bg-rose-50/80 dark:bg-rose-950/15 border-b md:border-b-0 md:border-r border-border/50">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{t('result.original', language)}</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">{c2.original}</p>
                  </div>
                  <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/15">
                    <div className="flex items-center gap-2 mb-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t('result.corrected', language)}</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">{c2.corrected}</p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-muted/25 border-t border-border/50 flex items-start gap-2.5">
                  <Badge variant="secondary" className="shrink-0 cursor-pointer text-[10px] rounded-lg hover:bg-primary hover:text-primary-foreground transition-all border border-border/60"
                    onClick={() => setSelectedDimension(c2.dimension)}>{c2.dimension}</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c2.explanation}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="exercises" className="mt-4 space-y-4 animate-fade-up">
            {exercises.map((ex, i) => (
              <div key={i} className="card-premium overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="px-5 py-3 border-b border-border/50 bg-muted/20 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] rounded-lg border-primary/20 text-primary font-semibold">{ex.type}</Badge>
                </div>
                <div className="p-5 space-y-3.5">
                  <p className="font-semibold text-sm leading-relaxed">{ex.question}</p>
                  {ex.options && (
                    <div className="space-y-2">
                      {ex.options.map((opt, oi) => {
                        const isCorrect = ex.answer ? opt.startsWith(ex.answer) : false;
                        return (
                          <div key={oi} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                            isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400/40 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'bg-muted/25 border-border/50 text-muted-foreground'
                          }`}>
                            {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                            <span className={isCorrect ? 'font-medium' : ''}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {ex.explanation && (
                    <div className="flex items-start gap-2 pt-1">
                      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{ex.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
