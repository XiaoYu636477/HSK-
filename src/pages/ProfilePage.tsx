import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  PenLine, BookOpen, Mic, BookOpenCheck, Dumbbell,
  KeyRound, Sparkles, ChevronRight, CheckCircle2,
  Rocket, BookMarked, BarChart3, Lightbulb, History,
  Clock, ShieldCheck, Loader2, LogOut,
  Pencil, Settings, MessageSquare,
} from 'lucide-react';

const useL = (language: string) =>
  (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

const MODULES = [
  { key: 'essay',    path: '/essay',    icon: PenLine,       grad: ['#6366f1','#4f46e5'], zh: '作文批改',  en: 'Essay Review',   ru: 'Эссе',         descZh: 'AI逐句精批·六维评分',      descEn: 'AI sentence scoring',    descRu: '6-осевая оценка' },
  { key: 'homework', path: '/homework', icon: BookOpen,      grad: ['#10b981','#059669'], zh: '作业批改',  en: 'Homework',       ru: 'Задание',      descZh: '短文答题·语法纠错',         descEn: 'Grammar & vocabulary',   descRu: 'Грамматика' },
  { key: 'oral',     path: '/oral',     icon: Mic,           grad: ['#8b5cf6','#7c3aed'], zh: '口语分析',  en: 'Oral Analysis',  ru: 'Устная речь',  descZh: '发音·流利度·准确性',        descEn: 'Pronunciation & fluency',descRu: 'Произношение' },
  { key: 'exam',     path: '/exam',     icon: BookOpenCheck, grad: ['#f59e0b','#d97706'], zh: '考题解析',  en: 'Exam Analysis',  ru: 'Экзамен',      descZh: 'HSK真题详解·难点击破',     descEn: 'HSK past papers',        descRu: 'Разбор HSK' },
  { key: 'practice', path: '/practice', icon: Dumbbell,      grad: ['#ef4444','#dc2626'], zh: '练习题库',  en: 'Practice',       ru: 'Практика',     descZh: 'AI针对薄弱点动态出题',      descEn: 'AI-targeted drills',     descRu: 'ИИ-упражнения' },
  { key: 'score',    path: '/score',    icon: BarChart3,     grad: ['#0ea5e9','#0284c7'], zh: '成绩分析',  en: 'Score Analysis', ru: 'Оценки',       descZh: '上传成绩·智能诊断',         descEn: 'Smart diagnosis',        descRu: 'Диагностика' },
  { key: 'tips',     path: '/tips',     icon: Lightbulb,     grad: ['#84cc16','#65a30d'], zh: '学习技巧',  en: 'Study Tips',     ru: 'Советы',       descZh: 'HSK高分策略·备考精华',     descEn: 'HSK exam strategies',    descRu: 'Стратегии HSK' },
  { key: 'history',  path: '/history',  icon: History,       grad: ['#94a3b8','#64748b'], zh: '历史记录',  en: 'History',        ru: 'История',      descZh: '批改记录·错误归因·复习',    descEn: 'Review corrections',     descRu: 'Записи · повторение' },
];

// ─── 激活页 ─────────────────────────────────────────────────────────────────────
function ActivationPage({ L, activate }: {
  L: ReturnType<typeof useL>;
  activate: (code: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [shake, setShake]     = useState(false);
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
      setError(result.error ?? L('激活失败', 'Activation failed', 'Ошибка активации'));
      setShake(true); setTimeout(() => setShake(false), 500);
    } else {
      toast.success(L('绑定成功！', 'Bind successful!', 'Успешно!'));
    }
  };

  const steps = [
    { n: '01', zh: '收到老师给你的小Yu码', en: 'Get your Yu Code from teacher', ru: 'Получите код от учителя' },
    { n: '02', zh: '输入下方激活框并点击激活', en: 'Enter below and click Activate', ru: 'Введите код и нажмите активацию' },
    { n: '03', zh: '进入学习舱，开启AI学习之旅', en: 'Enter cockpit and start learning', ru: 'Войдите в учебный кабинет и начните учёбу' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(160deg, #f0f7ff 0%, #e0effe 50%, #f5f9ff 100%)' }}>

      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)', boxShadow: '0 12px 40px rgba(14,165,233,0.3)' }}>
            <Rocket className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {L('HSK 学习舱', 'HSK Learning Cockpit', 'Учебный кабинет HSK')}
            </h1>
            <p className="text-sm mt-1.5 text-slate-500">
              {L('AI驱动的全科智能学习平台', 'AI-powered all-in-one HSK platform', 'ИИ-платформа для изучения HSK')}
            </p>
          </div>
        </div>

        {/* 激活卡片 */}
        <div className="rounded-3xl overflow-hidden bg-white shadow-xl border border-sky-100">
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1, #8b5cf6, #ec4899)' }} />
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-800">
                {L('输入你的小Yu码', 'Enter Your Yu Code', 'Введите ваш код Yu')}
              </h2>
            </div>
            <div className="space-y-3">
              <input
                ref={codeRef}
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                maxLength={20}
                placeholder="YU-XXXXXX"
                spellCheck={false}
                autoComplete="off"
                className={`w-full h-14 px-4 text-center text-2xl font-mono font-black tracking-[0.25em] rounded-xl outline-none transition-all bg-sky-50 border-2 ${shake ? 'animate-shake border-red-400' : error ? 'border-red-300' : 'border-sky-200 focus:border-indigo-400'} text-slate-800 placeholder-slate-300`}
              />
              {error && <p className="text-center text-xs font-medium text-red-500 animate-fadeIn">{error}</p>}
              <button onClick={handleActivate} disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 shadow-lg shadow-indigo-500/25"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{L('验证中…', 'Verifying…', 'Проверка…')}</>
                  : <><Sparkles className="w-4 h-4" />{L('激活学习舱', 'Activate Cockpit', 'Активировать')}</>}
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-400">
              {L('没有小Yu码？请联系你的老师', "No Yu Code? Contact your teacher", 'Нет кода? Обратитесь к учителю')}
            </p>
          </div>
        </div>

        {/* 步骤 */}
        <div className="space-y-2">
          {steps.map(s => (
            <div key={s.n} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/70 border border-sky-100">
              <span className="text-xs font-black mt-0.5 tabular-nums text-sky-500">{s.n}</span>
              <span className="text-sm text-slate-600">{L(s.zh, s.en, s.ru)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 模块卡片 ─────────────────────────────────────────────────────────────────────
function ModuleCard({ mod, onClick, L }: {
  mod: typeof MODULES[0]; onClick: () => void; L: ReturnType<typeof useL>;
}) {
  const Icon = mod.icon;
  return (
    <button onClick={onClick}
      className="group flex flex-col gap-3 p-4 rounded-2xl text-left transition-all duration-200 hover:-translate-y-1 bg-white border border-slate-100 hover:border-sky-200 hover:shadow-lg h-full">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
        style={{ background: `linear-gradient(135deg,${mod.grad[0]},${mod.grad[1]})` }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-bold text-slate-800">{L(mod.zh, mod.en, mod.ru)}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{L(mod.descZh, mod.descEn, mod.descRu)}</p>
      </div>
      <div className="flex items-center gap-1 mt-auto text-slate-300 group-hover:text-sky-500 transition-colors">
        <span className="text-[10px] font-medium">{L('进入', 'Open', 'Открыть')}</span>
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

// ─── 个人资料卡 ──────────────────────────────────────────────────────────────────
function ProfileCard({ L }: { L: ReturnType<typeof useL> }) {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.username || user?.user_metadata?.username || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !nickname.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: nickname.trim() })
      .eq('id', user.id);
    if (error) {
      toast.error(L('保存失败', 'Save failed', 'Ошибка сохранения'));
    } else {
      toast.success(L('昵称已更新', 'Nickname updated', 'Ник обновлён'));
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-sm mx-auto w-full">
      <div className="rounded-2xl bg-white border border-sky-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {(profile?.username || user?.email || 'U')[0].toUpperCase()}
            </div>
            {editing ? (
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-sky-200 bg-sky-50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 w-32"
                placeholder={L('昵称', 'Nickname', 'Ник')}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-800">{profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400">{profile?.role === 'admin' ? L('管理员', 'Admin', 'Админ') : user?.email}</p>
              </div>
            )}
          </div>
          {editing ? (
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving}
                className="h-7 px-3 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : L('保存', 'Save', 'Сохр')}
              </button>
              <button onClick={() => { setEditing(false); setNickname(profile?.username || ''); }}
                className="h-7 px-2 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition-colors">
                ✕
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 驾驶舱主视图 ───────────────────────────────────────────────────────────────
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0f7ff 0%, #e0effe 50%, #f5f9ff 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)', boxShadow: '0 12px 40px rgba(14,165,233,0.3)' }}>
            <Rocket className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 text-balance">
              {yuCode?.nickname
                ? L(`${yuCode.nickname} 的学习舱`, `${yuCode.nickname}'s Cockpit`, `Кабина ${yuCode.nickname}`)
                : L('我的学习舱', 'My Learning Cockpit', 'Мой учебный кабинет')}
            </h1>
            <p className="text-sm md:text-base mt-2 text-slate-500">
              {L('AI 驱动 · HSK 全科智能学习中枢', 'AI-powered all-in-one HSK hub', 'ИИ-центр изучения HSK')}
            </p>
          </div>

          {/* 状态条 */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 px-4 py-2 rounded-2xl mx-auto bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">
              {L('学习舱已激活', 'Cockpit Activated', 'Кабина активирована')}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700">
              {yuCode?.code}
            </span>
            {daysLeft !== null && (
              <span className="text-xs text-slate-500">
                {L(`${daysLeft}天后到期`, `${daysLeft}d left`, `ещё ${daysLeft}д`)}
              </span>
            )}
          </div>

          {/* 每日使用进度条 */}
          {yuCode && yuCode.dailyLimit > 0 && (
            <div className="max-w-sm mx-auto w-full space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {L('今日用量', 'Daily Usage', 'Расход')}
                </span>
                <span className={`font-bold tabular-nums ${yuCode.callsToday >= yuCode.dailyLimit ? 'text-red-500' : 'text-sky-600'}`}>
                  {yuCode.callsToday} / {yuCode.dailyLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((yuCode.callsToday / yuCode.dailyLimit) * 100, 100)}%`,
                    background: yuCode.callsToday >= yuCode.dailyLimit
                      ? 'linear-gradient(90deg, #ef4444, #f97316)'
                      : 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                  }}
                />
              </div>
              {yuCode.callsToday >= yuCode.dailyLimit && (
                <p className="text-[11px] text-red-500 font-medium text-center">
                  {L('今日次数已用完，明天0点重置', 'Daily limit reached, resets at midnight', 'Дневной лимит исчерпан')}
                </p>
              )}
            </div>
          )}

          {/* 个人资料卡 */}
          <ProfileCard L={L} />
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { icon: BookMarked, val: '8+',  label: L('学习模块', 'Modules',  'Модулей'), color: 'text-sky-500' },
            { icon: Sparkles,   val: 'AI',  label: L('实时批改', 'Real-time','В реальном'), color: 'text-indigo-500' },
            { icon: Clock,      val: expiryStr ? `${daysLeft}天` : '∞', label: L('剩余天数', 'Days left', 'Дней'), color: 'text-emerald-500' },
          ].map(({ icon: Icon, val, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xl font-black text-slate-800">{val}</span>
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* 分割线 */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {L('全部学习模块', 'All Modules', 'Все модули')}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* 模块网格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODULES.map(mod => (
            <ModuleCard key={mod.key} mod={mod} onClick={() => navigate(mod.path)} L={L} />
          ))}
        </div>

        {/* 底部 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px]">
              {L(`到期：${expiryStr ?? '永久'}`, `Expires: ${expiryStr ?? 'Never'}`, `Истекает: ${expiryStr ?? 'Никогда'}`)}
            </span>
          </div>
          <button onClick={deactivate} className="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-3 h-3" />
            <span className="text-[11px]">{L('退出激活', 'Deactivate', 'Деактивировать')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { language } = useLanguage();
  const { isActivated, activate } = useYuCode();
  const L = useL(language);

  if (!isActivated) {
    return <ActivationPage L={L} activate={activate} />;
  }

  return <CockpitView L={L} />;
}
