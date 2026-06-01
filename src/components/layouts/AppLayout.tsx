import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import type { Language, CorrectionRecord } from '@/types/types';
import { supabase } from '@/db/supabase';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PenLine, BookOpen, Mic, BarChart3, Lightbulb, History,
  LogOut, LogIn, Menu, Globe, Home, ChevronRight,
  ChevronLeft, GraduationCap,
  Dumbbell, FileText, Search, X, Clock, BookMarked, BookOpenCheck, Rocket,
  Shield,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// 顶层常量
// ─────────────────────────────────────────────────────────
const navItems = [
  { key: 'nav.home',     path: '/',        icon: Home },
  { key: 'nav.essay',    path: '/essay',   icon: PenLine },
  { key: 'nav.homework', path: '/homework', icon: BookOpen },
  { key: 'nav.oral',     path: '/oral',    icon: Mic },
  { key: 'nav.exam',     path: '/exam',    icon: BookOpenCheck },
  { key: 'nav.profile',  path: '/profile', icon: Rocket },
  { key: 'nav.score',    path: '/score',   icon: BarChart3 },
  { key: 'nav.tips',     path: '/tips',    icon: Lightbulb },
  { key: 'nav.history',  path: '/history', icon: History },
];

const knowledgeItems: { zh: string; en: string; ru: string; path: string }[] = [
  { zh: '阅读理解技巧',  en: 'Reading comprehension',   ru: 'Понимание текста',       path: '/tips' },
  { zh: '听力备考方法',  en: 'Listening exam tips',     ru: 'Советы по аудированию',  path: '/tips' },
  { zh: '作文写作框架',  en: 'Essay writing framework', ru: 'Шаблон эссе',            path: '/essay' },
  { zh: '口语表达句型',  en: 'Oral sentence patterns',  ru: 'Устные фразы',           path: '/oral' },
  { zh: '语法难点汇总',  en: 'Grammar difficulties',    ru: 'Трудная грамматика',     path: '/tips' },
  { zh: '词汇记忆方法',  en: 'Vocabulary memorization', ru: 'Методы запоминания',     path: '/tips' },
  { zh: '成绩薄弱分析',  en: 'Weak area analysis',      ru: 'Анализ слабых мест',     path: '/score' },
  { zh: '备考模板下载',  en: 'Exam prep templates',     ru: 'Шаблоны для экзамена',   path: '/templates' },
  { zh: '专项练习题库',  en: 'Practice question bank',  ru: 'Банк упражнений',        path: '/practice' },
  { zh: 'HSK 6级作文',  en: 'HSK 6 essay writing',     ru: 'HSK 6 написание эссе',   path: '/essay' },
];

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'zh', label: '中文',    flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

// ─────────────────────────────────────────────────────────
// 独立搜索组件（拥有自己的 state，避免父组件重渲染导致失焦）
// ─────────────────────────────────────────────────────────
interface SidebarSearchProps {
  language: Language;
  userId?: string;
  onSelect: (path: string) => void;
}

function SidebarSearch({ language, userId, onSelect }: SidebarSearchProps) {
  const [query, setQuery]               = useState('');
  const [focused, setFocused]           = useState(false);
  const [historyResults, setHistoryResults] = useState<CorrectionRecord[]>([]);
  const [searching, setSearching]       = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const blurTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moduleLabel: Record<string, string> = {
    essay:    language === 'zh' ? '作文批改'   : language === 'ru' ? 'Эссе'              : 'Essay',
    homework: language === 'zh' ? '作业批改'   : language === 'ru' ? 'Домашнее задание'  : 'Homework',
    oral:     language === 'zh' ? '口语分析'   : language === 'ru' ? 'Устная речь'       : 'Oral',
    score:    language === 'zh' ? '成绩分析'   : language === 'ru' ? 'Оценки'            : 'Score',
  };

  const searchHistory = useCallback(async (q: string) => {
    if (!userId || !q.trim()) { setHistoryResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('corrections')
        .select('id, module, input_text, created_at, suggestions')
        .eq('user_id', userId)
        .ilike('input_text', `%${q.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      setHistoryResults((data as CorrectionRecord[]) ?? []);
    } catch {
      setHistoryResults([]);
    } finally {
      setSearching(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) searchHistory(query);
      else setHistoryResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchHistory]);

  const knowledgeResults = query.trim()
    ? knowledgeItems.filter(item => {
        const q = query.toLowerCase();
        return item.zh.includes(q) || item.en.toLowerCase().includes(q) || item.ru.toLowerCase().includes(q);
      }).slice(0, 3)
    : [];

  const hasResults  = historyResults.length > 0 || knowledgeResults.length > 0;
  const showDropdown = focused && query.trim().length > 0;

  const handleSelect = (path: string) => {
    setQuery('');
    setFocused(false);
    onSelect(path);
  };

  const keepFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  return (
    <div className="px-2.5 pt-2.5 pb-1.5 border-b border-white/[0.06] relative">
      {/* 输入框 */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200"
        style={{
          background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 160); }}
          placeholder={
            language === 'zh' ? '搜历史批改 / 学习内容…' :
            language === 'ru' ? 'Поиск записей / контента…' :
            'Search history / content…'
          }
          className="flex-1 bg-transparent text-[11px] text-white/70 placeholder-white/22 outline-none min-w-0"
        />
        {query && (
          <button
            onMouseDown={() => { setQuery(''); inputRef.current?.focus(); }}
            className="shrink-0"
          >
            <X className="w-3 h-3 text-white/30 hover:text-white/60 transition-colors" />
          </button>
        )}
      </div>

      {/* 搜索结果浮层 */}
      {showDropdown && (
        <div
          onMouseDown={keepFocus}
          className="absolute left-2.5 right-2.5 top-full mt-1 rounded-xl z-50 overflow-hidden"
          style={{
            background: 'hsl(228,58%,9%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
          }}
        >
          {/* 历史批改结果 */}
          {userId && (
            <>
              <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                <Clock className="w-3 h-3 text-white/25 shrink-0" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  {language === 'zh' ? '历史批改' : language === 'ru' ? 'История' : 'History'}
                </span>
                {searching && (
                  <span className="ml-auto text-[9px] text-white/20 animate-pulse">
                    {language === 'zh' ? '搜索中…' : '…'}
                  </span>
                )}
              </div>
              {historyResults.length === 0 && !searching ? (
                <div className="px-3 pb-2 text-[11px] text-white/25">
                  {language === 'zh' ? '无匹配批改记录' : language === 'ru' ? 'Нет записей' : 'No records found'}
                </div>
              ) : (
                historyResults.map(rec => (
                  <button
                    key={rec.id}
                    onMouseDown={() => handleSelect('/history')}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-white/[0.06] transition-colors group"
                  >
                    <Clock className="w-3 h-3 text-white/25 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold text-primary/70 shrink-0">
                          {moduleLabel[rec.module] ?? rec.module}
                        </span>
                        <span className="text-[9px] text-white/20 shrink-0">
                          {new Date(rec.created_at).toLocaleDateString(
                            language === 'zh' ? 'zh-CN' : 'en-US',
                            { month: 'short', day: 'numeric' }
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/55 group-hover:text-white/80 transition-colors truncate leading-relaxed">
                        {rec.input_text?.slice(0, 40) ?? (language === 'zh' ? '（图片/音频内容）' : '(media content)')}
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 shrink-0 mt-0.5 transition-all group-hover:translate-x-0.5" />
                  </button>
                ))
              )}
            </>
          )}

          {/* 学习内容知识库结果 */}
          {knowledgeResults.length > 0 && (
            <>
              <div className={`flex items-center gap-1.5 px-3 pb-1 ${userId ? 'pt-2 border-t border-white/[0.06]' : 'pt-2.5'}`}>
                <BookMarked className="w-3 h-3 text-white/25 shrink-0" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  {language === 'zh' ? '学习内容' : language === 'ru' ? 'Контент' : 'Content'}
                </span>
              </div>
              {knowledgeResults.map((item, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleSelect(item.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.06] transition-colors group"
                >
                  <BookMarked className="w-3 h-3 text-violet-400/40 group-hover:text-violet-300/70 shrink-0 transition-colors" />
                  <span className="text-[11px] text-white/55 group-hover:text-white/82 transition-colors flex-1 truncate">
                    {language === 'zh' ? item.zh : language === 'ru' ? item.ru : item.en}
                  </span>
                  <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 shrink-0 transition-all group-hover:translate-x-0.5" />
                </button>
              ))}
            </>
          )}

          {/* 无任何结果 */}
          {!hasResults && !searching && (
            <div className="px-3 py-3 text-center text-[11px] text-white/25">
              {language === 'zh' ? '未找到相关内容' : language === 'ru' ? 'Ничего не найдено' : 'Nothing found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 主布局组件
// ─────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  const curLang = languages.find(l => l.code === language)!;

  // 欢迎语：区分登录/未登录，三语言，有温度
  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || '';
  const welcomeMsg = displayName
    ? (
        language === 'zh' ? `欢迎回来，亲爱的 ${displayName}！` :
        language === 'ru' ? `С возвращением, дорогой ${displayName}!` :
        `Welcome back, dear ${displayName}!`
      )
    : (
        language === 'zh' ? '欢迎来到HSK AI，开启你的备考之旅~' :
        language === 'ru' ? 'Добро пожаловать в HSK AI, начни своё подготовку!' :
        'Welcome to HSK AI, start your prep journey!'
      );

  // ── 侧边栏内容 ──
  const NavContent = ({ mini = false }: { mini?: boolean }) => (
    <div
      className="flex flex-col h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, hsl(226,55%,13%) 0%, hsl(228,62%,7%) 100%)' }}
    >
      {/* 背景光晕 */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-[0.07]"
        style={{ background: 'radial-gradient(circle,hsl(256,80%,70%),transparent 70%)', transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-24 left-0 w-28 h-28 rounded-full pointer-events-none opacity-[0.05]"
        style={{ background: 'radial-gradient(circle,hsl(200,80%,70%),transparent 70%)', transform: 'translate(-40%,0)' }} />

      {/* ── Logo 区 ── */}
      <div className={`relative border-b border-white/[0.07] ${mini ? 'px-3 pt-4 pb-3' : 'px-4 pt-5 pb-4'}`}>

        {/* Logo 行：图标 + 文字 + 折叠按钮 */}
        <div className={`flex items-center ${mini ? 'justify-between' : 'gap-2.5'}`}>
          <Link
            to="/"
            className={`flex items-center gap-2.5 group flex-1 min-w-0 ${mini ? 'justify-center' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {/* 精致 Logo 图标 —— GraduationCap + 渐变底座 */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
              style={{
                background: 'linear-gradient(145deg,hsl(220,80%,58%) 0%,hsl(258,72%,62%) 60%,hsl(286,60%,58%) 100%)',
                boxShadow: '0 3px 12px hsl(238,72%,48%,0.40),inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              <GraduationCap className="w-4 h-4 text-white drop-shadow-sm" />
            </div>

            {!mini && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-200">
                <p className="text-sm font-black text-white tracking-wide leading-tight">HSK AI</p>
              </div>
            )}
          </Link>

          {/* 折叠/展开按钮 —— 顶部Logo区右侧，ChevronLeft 旋转动画 */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.10] transition-all duration-200"
            title={collapsed ? t('sidebar.expand', language) : t('sidebar.collapse', language)}
          >
            <ChevronLeft
              className="w-3.5 h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
        </div>

        {/* 欢迎语 —— 直接在 Logo 下方 */}
        {!mini && (
          <div className="mt-2.5 space-y-1 animate-in fade-in duration-200">
            {displayName ? (
              <>
                <p className="text-[11px] text-white/55 leading-tight">
                  {language === 'zh' ? '欢迎回来，亲爱的' : language === 'ru' ? 'С возвращением,' : 'Welcome back,'}
                </p>
                <p className="text-[13px] font-bold text-white/90 leading-tight truncate">
                  {displayName} 👋
                </p>
              </>
            ) : (
              <p className="text-[11.5px] text-white/60 leading-snug">
                {language === 'zh' ? '欢迎来到 HSK AI，开启备考之旅 🚀' : language === 'ru' ? 'Добро пожаловать в HSK AI 🚀' : 'Welcome to HSK AI, start your prep 🚀'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 侧边栏搜索框（顶部，快速批改上方） ── */}
      {!mini && (
        <SidebarSearch
          language={language}
          userId={user?.id}
          onSelect={(path) => { navigate(path); setMobileOpen(false); }}
        />
      )}

      {/* ── 导航 ── */}
      <ScrollArea className="flex-1 py-3">
        <nav className={`${mini ? 'px-1.5' : 'px-2.5'} space-y-1`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={mini ? t(item.key, language) : undefined}
                className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                  mini ? 'justify-center p-3' : 'gap-3 px-3 py-3'
                } ${
                  isActive ? 'text-white' : 'text-white/45 hover:text-white/90 hover:bg-white/[0.055]'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg,hsl(226,72%,42%,0.65),hsl(260,62%,50%,0.45))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12),0 2px 8px hsl(226,72%,30%,0.25)',
                } : undefined}
              >
                {/* 激活左边光条 */}
                {isActive && !mini && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: 'linear-gradient(180deg,hsl(226,72%,70%),hsl(260,65%,75%))' }}
                  />
                )}
                <item.icon
                  className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                    isActive ? 'text-white/95' : 'text-white/30 group-hover:text-white/70'
                  }`}
                />
                {!mini && <span className="flex-1 truncate animate-in fade-in duration-150">{t(item.key, language)}</span>}
                {!mini && isActive && <ChevronRight className="w-3 h-3 text-white/40 shrink-0 animate-in fade-in duration-150" />}
              </Link>
            );
          })}

          {/* 管理员后台入口 - 仅管理员可见 */}
          {profile?.role === 'admin' && (
            <Link
              to="/yuteacher"
              onClick={() => setMobileOpen(false)}
              title={mini ? (language === 'zh' ? '管理后台' : language === 'ru' ? 'Админ' : 'Admin') : undefined}
              className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                mini ? 'justify-center p-3' : 'gap-3 px-3 py-3'
              } text-white/45 hover:text-amber-400 hover:bg-amber-500/10`}
            >
              <Shield className="w-4 h-4 shrink-0 text-amber-400/60 group-hover:text-amber-400 transition-colors" />
              {!mini && <span className="flex-1 truncate text-amber-300/80">{language === 'zh' ? '管理后台' : language === 'ru' ? 'Админ' : 'Admin'}</span>}
            </Link>
          )}
        </nav>

        {/* ── 快捷入口卡片 ── */}
        {!mini && (
          <div className="animate-in fade-in duration-200">
            <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* 双快捷入口卡片 */}
            <div
              className="mx-2.5 p-2.5 rounded-xl"
              style={{
                background: 'linear-gradient(135deg,hsl(226,72%,42%,0.18),hsl(280,60%,42%,0.10))',
                border: '1px solid hsl(226,72%,52%,0.15)',
              }}
            >
              {/* 卡片头部：状态指示 */}
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest">
                  {language === 'zh' ? '快捷入口' : language === 'ru' ? 'Быстрый доступ' : 'Quick Access'}
                </span>
              </div>

              {/* 两个迷你按钮 */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* 练习题库 */}
                <Link
                  to="/practice"
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07] active:scale-[0.96]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Dumbbell className="w-3 h-3 text-blue-400/70 group-hover:text-blue-300 shrink-0 transition-colors" />
                  <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 transition-colors truncate leading-none">
                    {language === 'zh' ? '练习题库' : language === 'ru' ? 'Упражнения' : 'Practice'}
                  </span>
                </Link>

                {/* 备考模板 */}
                <Link
                  to="/templates"
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07] active:scale-[0.96]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <FileText className="w-3 h-3 text-violet-400/70 group-hover:text-violet-300 shrink-0 transition-colors" />
                  <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 transition-colors truncate leading-none">
                    {language === 'zh' ? '备考模板' : language === 'ru' ? 'Шаблоны' : 'Templates'}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* ── 底部 ── */}
      <div className={`border-t border-white/[0.07] ${mini ? 'px-1.5 py-2 space-y-1' : 'px-2.5 py-3 space-y-0.5'}`}>
        {/* 用户邮箱（非迷你） */}
        {user && !mini && (
          <div className="px-3 py-1.5 mb-0.5">
            <p className="text-[11px] text-white/30 truncate">{user.email}</p>
          </div>
        )}

        {/* 语言切换 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center rounded-xl text-sm text-white/45 hover:bg-white/[0.055] hover:text-white/80 transition-all duration-200 ${
                mini ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              }`}
              title={mini ? curLang.label : undefined}
            >
              <Globe className="w-4 h-4 shrink-0" />
              {!mini && <span className="flex-1 text-left text-sm">{curLang.flag}&nbsp;{t('lang.' + language, language)}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-36 rounded-xl">
            {languages.map(l => (
              <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)}
                className={`gap-2 rounded-lg ${language === l.code ? 'bg-accent font-semibold' : ''}`}>
                <span>{l.flag}</span><span>{l.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 登录/退出 */}
        {user ? (
          <button
            onClick={signOut}
            className={`w-full flex items-center rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${
              mini ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            }`}
            title={mini ? t('nav.logout', language) : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!mini && <span>{t('nav.logout', language)}</span>}
          </button>
        ) : (
          <Link to="/login" onClick={() => setMobileOpen(false)} className="block">
            <button
              className={`w-full flex items-center rounded-xl text-sm text-white/40 hover:bg-white/[0.055] hover:text-white/80 transition-all duration-200 ${
                mini ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              }`}
              title={mini ? t('nav.login', language) : undefined}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!mini && <span>{t('nav.login', language)}</span>}
            </button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">

      {/* ── 桌面侧边栏（可折叠） ── */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 ${collapsed ? 'w-[60px]' : 'w-60'}`}
        style={{
          boxShadow: '2px 0 20px rgba(0,0,0,0.18)',
          transition: 'width 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <NavContent mini={collapsed} />
      </aside>

      {/* ── 移动侧滑 ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 border-0">
          <NavContent mini={false} />
        </SheetContent>

        {/* ── 主内容区 ── */}
        <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col bg-background">

          {/* 移动端顶栏（粘性，替代悬浮汉堡） */}
          <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 shrink-0
            border-b border-border/40 bg-background/90 backdrop-blur-md">
            <SheetTrigger asChild>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center
                border border-border/60 bg-card/80 shadow-sm transition-all
                hover:border-primary/40 hover:bg-primary/5 active:scale-95">
                <Menu className="w-4 h-4 text-foreground" />
              </button>
            </SheetTrigger>

            {/* Logo 文字 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg,hsl(220,80%,58%),hsl(258,72%,62%),hsl(286,60%,58%))' }}>
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-black text-foreground tracking-wide">HSK AI</span>
            </div>

            {/* 移动端语言快切（紧凑版） */}
            <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 shrink-0">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                    language === l.code
                      ? 'bg-card shadow-sm text-foreground border border-border/50'
                      : 'text-muted-foreground'
                  }`}
                >
                  {l.flag}
                </button>
              ))}
            </div>
          </header>

          {/* 桌面顶部导航栏 */}
          <header className="hidden lg:flex items-center justify-end px-6 py-2.5 border-b border-border/40 bg-card/60 backdrop-blur-sm shrink-0 gap-2">
            <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    language === l.code
                      ? 'bg-card shadow-sm text-foreground border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-border/40">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {(user.user_metadata?.username || user.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground max-w-[140px] truncate">
                  {user.user_metadata?.username || user.email}
                </span>
              </div>
            )}
          </header>

          {/* 顶部光条 */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent shrink-0" />

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </Sheet>
    </div>
  );
}
