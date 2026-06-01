import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { toast } from 'sonner';
import {
  PenLine, BookOpen, Mic, BookOpenCheck, Dumbbell,
  KeyRound, Sparkles, ChevronRight, CheckCircle2,
  Rocket, BookMarked, BarChart3, Lightbulb, History,
  Clock, ShieldCheck, User, Loader2, LogOut,
} from 'lucide-react';

// ─── 多语言 ───────────────────────────────────────────────────────────────────
const useL = (language: string) =>
  (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

// ─── 模块卡片配置 ─────────────────────────────────────────────────────────────
const MODULES = [
  { key: 'essay',    path: '/essay',    icon: PenLine,       grad: ['#6366f1','#4f46e5'], glow: 'rgba(99,102,241,0.4)',   zh: '作文批改',  en: 'Essay Review',   ru: 'Эссе',         descZh: 'AI逐句精批·六维评分',      descEn: 'AI sentence scoring',    descRu: '6-осевая оценка' },
  { key: 'homework', path: '/homework', icon: BookOpen,      grad: ['#10b981','#059669'], glow: 'rgba(16,185,129,0.4)',   zh: '作业批改',  en: 'Homework',       ru: 'Задание',      descZh: '短文答题·语法纠错',         descEn: 'Grammar & vocabulary',   descRu: 'Грамматика' },
  { key: 'oral',     path: '/oral',     icon: Mic,           grad: ['#8b5cf6','#7c3aed'], glow: 'rgba(139,92,246,0.4)',   zh: '口语分析',  en: 'Oral Analysis',  ru: 'Устная речь',  descZh: '发音·流利度·准确性',        descEn: 'Pronunciation & fluency',descRu: 'Произношение' },
  { key: 'exam',     path: '/exam',     icon: BookOpenCheck, grad: ['#f59e0b','#d97706'], glow: 'rgba(245,158,11,0.4)',   zh: '考题解析',  en: 'Exam Analysis',  ru: 'Экзамен',      descZh: 'HSK真题详解·难点击破',     descEn: 'HSK past papers',        descRu: 'Разбор HSK' },
  { key: 'practice', path: '/practice', icon: Dumbbell,      grad: ['#ef4444','#dc2626'], glow: 'rgba(239,68,68,0.4)',    zh: '练习题库',  en: 'Practice',       ru: 'Практика',     descZh: 'AI针对薄弱点动态出题',      descEn: 'AI-targeted drills',     descRu: 'ИИ-упражнения' },
  { key: 'score',    path: '/score',    icon: BarChart3,     grad: ['#06b6d4','#0891b2'], glow: 'rgba(6,182,212,0.4)',    zh: '成绩分析',  en: 'Score Analysis', ru: 'Оценки',       descZh: '上传成绩·智能诊断',         descEn: 'Smart diagnosis',        descRu: 'Диагностика' },
  { key: 'tips',     path: '/tips',     icon: Lightbulb,     grad: ['#84cc16','#65a30d'], glow: 'rgba(132,204,22,0.4)',   zh: '学习技巧',  en: 'Study Tips',     ru: 'Советы',       descZh: 'HSK高分策略·备考精华',     descEn: 'HSK exam strategies',    descRu: 'Стратегии HSK' },
  { key: 'history',  path: '/history',  icon: History,       grad: ['#94a3b8','#64748b'], glow: 'rgba(148,163,184,0.25)', zh: '历史记录',  en: 'History',        ru: 'История',      descZh: '批改记录·错误归因·复习',    descEn: 'Review corrections',     descRu: 'Записи · повторение' },
];

// ─── 激活页（内嵌输入框） ─────────────────────────────────────────────────────
function ActivationPage({ L, activate }: {
  L: ReturnType<typeof useL>;
  activate: (code: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const handleActivate = async () => {
    if (!code.trim()) {
      setError(L('请输入小Yu码', 'Please enter your Yu Code', 'Введите код Yu'));
      setShake(true); setTimeout(() => setShake(false), 500);
      codeRef.current?.focus();
      return;
    }
    setLoading(true); setError('');
    const result = await activate(code);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? L('激活失败，请检查码是否正确', 'Activation failed. Check your code.', 'Ошибка активации'));
      setShake(true); setTimeout(() => setShake(false), 500);
    } else {
      toast.success(L('绑定成功！', 'Bind successful!', 'Успешно!'));
    }
  };

  const steps = [
    { n: '01', zh: '收到老师给你的小Yu码', en: 'Get your Yu Code from teacher', ru: 'Получите код от учителя' },
    { n: '02', zh: '输入下方激活框并点击激活', en: 'Enter below and click Activate', ru: 'Введите код и нажмите активацию' },
    { n: '03', zh: '进入学习舱，开启AI学习之旅', en: 'Enter cockpit and start learning', ru: 'Войдите в кабину и начните учёбу' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10 relative"
      style={{ background: 'linear-gradient(160deg,hsl(250,40%,6%) 0%,hsl(260,48%,4%) 60%,hsl(220,40%,5%) 100%)' }}>

      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 w-[700px] h-[700px] rounded-full opacity-[0.05] -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">

        {/* Logo + 标题 */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 20px 60px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
            <Rocket className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {L('HSK 学习舱', 'HSK Learning Cockpit', 'Учебная кабина HSK')}
            </h1>
            <p className="text-sm mt-1.5 text-pretty" style={{ color: 'rgba(255,255,255,0.42)' }}>
              {L('AI驱动的全科智能学习平台', 'AI-powered all-in-one HSK platform', 'ИИ-платформа для изучения HSK')}
            </p>
          </div>
        </div>

        {/* 激活卡片 */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7,#ec4899)' }} />

          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5" style={{ color: '#8b5cf6' }} />
              <h2 className="text-base font-bold text-white">
                {L('输入你的小Yu码', 'Enter Your Yu Code', 'Введите ваш код Yu')}
              </h2>
            </div>

            <div className="space-y-3">
              {/* 激活码 */}
              <input
                ref={codeRef}
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                maxLength={20}
                placeholder="YU-XXXXXX"
                spellCheck={false}
                autoComplete="off"
                className={`w-full h-14 px-4 text-center text-2xl font-mono font-black tracking-[0.25em] rounded-xl outline-none transition-all ${shake ? 'animate-shake' : ''}`}
                style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}`, color: '#fff' }}
                onFocus={e => { e.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.7)' : 'rgba(139,92,246,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              />

              {error && (
                <p className="text-center text-xs font-medium animate-fadeIn" style={{ color: '#f87171' }}>{error}</p>
              )}

              <button onClick={handleActivate} disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.45)' }}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{L('验证中…', 'Verifying…', 'Проверка…')}</>
                  : <><Sparkles className="w-4 h-4" />{L('激活学习舱', 'Activate Cockpit', 'Активировать')}</>}
              </button>
            </div>

            <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {L('没有小Yu码？请联系你的老师', "No Yu Code? Contact your teacher", 'Нет кода? Обратитесь к учителю')}
            </p>
          </div>
        </div>

        {/* 使用步骤 */}
        <div className="space-y-2">
          {steps.map(s => (
            <div key={s.n} className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xs font-black mt-0.5 tabular-nums" style={{ color: 'rgba(139,92,246,0.8)' }}>{s.n}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{L(s.zh, s.en, s.ru)}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── 模块卡片 ─────────────────────────────────────────────────────────────────
function ModuleCard({ mod, onClick, L }: {
  mod: typeof MODULES[0]; onClick: () => void; L: ReturnType<typeof useL>;
}) {
  const Icon = mod.icon;
  return (
    <button onClick={onClick}
      className="group flex flex-col gap-3 p-4 rounded-2xl text-left transition-all duration-200 hover:-translate-y-1 focus:outline-none h-full"
      style={{ background: `${mod.glow.replace('0.4','0.07')}`, border: `1px solid ${mod.glow.replace('0.4','0.15')}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 40px ${mod.glow}`; (e.currentTarget as HTMLElement).style.borderColor = mod.glow.replace('0.4','0.3'); }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = mod.glow.replace('0.4','0.15'); }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg,${mod.grad[0]},${mod.grad[1]})`, boxShadow: `0 6px 16px ${mod.glow}` }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-bold text-white">{L(mod.zh, mod.en, mod.ru)}</p>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{L(mod.descZh, mod.descEn, mod.descRu)}</p>
      </div>
      <div className="flex items-center gap-1 mt-auto" style={{ color: 'rgba(255,255,255,0.22)' }}>
        <span className="text-[10px] font-medium">{L('进入', 'Open', 'Открыть')}</span>
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

// ─── 驾驶舱主视图（激活后） ───────────────────────────────────────────────────
function CockpitView({ L }: { L: ReturnType<typeof useL> }) {
  const { yuCode, deactivate } = useYuCode();
  const navigate = useNavigate();

  const daysLeft = yuCode?.expiresAt
    ? Math.max(0, Math.ceil((new Date(yuCode.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const expiryStr = yuCode?.expiresAt
    ? new Date(yuCode.expiresAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(160deg,hsl(250,40%,6%) 0%,hsl(260,48%,4%) 60%,hsl(220,40%,5%) 100%)' }}>

      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)', transform: 'translate(-50%,-40%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)', transform: 'translate(40%,40%)' }} />
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 20px 60px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
            <Rocket className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white text-balance">
              {yuCode?.nickname
                ? L(`${yuCode.nickname} 的学习舱`, `${yuCode.nickname}'s Cockpit`, `Кабина ${yuCode.nickname}`)
                : L('我的学习舱', 'My Learning Cockpit', 'Моя учебная кабина')}
            </h1>
            <p className="text-sm md:text-base mt-2 text-pretty" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {L('AI 驱动 · HSK 全科智能学习中枢', 'AI-powered all-in-one HSK hub', 'ИИ-центр изучения HSK')}
            </p>
          </div>

          {/* 状态条 */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 px-4 py-2 rounded-2xl mx-auto"
            style={{ background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.22)' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
            <span className="text-sm font-semibold" style={{ color: '#34d399' }}>
              {L('学习舱已激活', 'Cockpit Activated', 'Кабина активирована')}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: 'rgba(52,211,153,0.85)' }}>
              {yuCode?.code}
            </span>
            {daysLeft !== null && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {L(`${daysLeft}天后到期`, `${daysLeft}d left`, `ещё ${daysLeft}д`)}
              </span>
            )}
          </div>
        </div>

        {/* ── 统计小卡片 ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { icon: BookMarked, val: '8+',  label: L('学习模块', 'Modules',  'Модулей') },
            { icon: Sparkles,   val: 'AI',  label: L('实时批改', 'Real-time','В реальном') },
            { icon: Clock,      val: expiryStr ? `${daysLeft}天` : '∞', label: L('剩余天数', 'Days left', 'Дней') },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 py-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-xl font-black text-white">{val}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── 分割线 ─────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {L('全部学习模块', 'All Modules', 'Все модули')}
          </span>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>

        {/* ── 模块网格 ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODULES.map(mod => (
            <ModuleCard key={mod.key} mod={mod} onClick={() => navigate(mod.path)} L={L} />
          ))}
        </div>

        {/* ── 底部安全信息 ────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.18)' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {L(`到期：${expiryStr ?? '永久'}`, `Expires: ${expiryStr ?? 'Never'}`, `Истекает: ${expiryStr ?? 'Никогда'}`)}
            </span>
          </div>
          <button onClick={deactivate}
            className="flex items-center gap-1.5 transition-colors hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.18)' }}>
            <LogOut className="w-3 h-3" />
            <span className="text-[11px]">{L('退出激活', 'Deactivate', 'Деактивировать')}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── 主页面入口 ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { language } = useLanguage();
  const { isActivated, activate } = useYuCode();
  const L = useL(language);

  if (!isActivated) {
    return <ActivationPage L={L} activate={activate} />;
  }

  return <CockpitView L={L} />;
}
