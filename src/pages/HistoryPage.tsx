import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  History, PenLine, BookOpen, Mic, BarChart3, LogIn,
  ChevronRight, Sparkles, BookOpenCheck, FileText,
} from 'lucide-react';
import CorrectionResult from '@/components/common/CorrectionResult';
import ExamAnalysisResult from '@/components/common/ExamAnalysisResult';
import type { CorrectionRecord } from '@/types/types';

/* ── 模块配置 ───────────────────────────────────────────── */
const MODULE_CONFIG = {
  essay:    { icon: PenLine,        color: 'text-blue-500',   bg: 'bg-blue-500/10',   tabKey: 'nav.essay' },
  homework: { icon: BookOpen,       color: 'text-emerald-500', bg: 'bg-emerald-500/10', tabKey: 'nav.homework' },
  oral:     { icon: Mic,            color: 'text-violet-500', bg: 'bg-violet-500/10',  tabKey: 'nav.oral' },
  score:    { icon: BarChart3,      color: 'text-amber-500',  bg: 'bg-amber-500/10',   tabKey: 'nav.score' },
  exam:     { icon: BookOpenCheck,  color: 'text-purple-500', bg: 'bg-purple-500/10',  tabKey: 'nav.exam' },
} as const;

type ModuleKey = keyof typeof MODULE_CONFIG;

const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

export default function HistoryPage() {
  const { language } = useLanguage();
  const { user }     = useAuth();
  const [records,  setRecords]  = useState<CorrectionRecord[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [module,   setModule]   = useState<string>('all');
  const [hskLevel, setHskLevel] = useState<string>('all');
  const [selected, setSelected] = useState<CorrectionRecord | null>(null);

  const L = (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

  const moduleLabel = useCallback((key: string) => {
    const cfg = MODULE_CONFIG[key as ModuleKey];
    return cfg ? t(cfg.tabKey, language) : key;
  }, [language]);

  /* 查询 */
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from('corrections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);
    if (module !== 'all') q = q.eq('module', module);
    if (hskLevel !== 'all') q = q.eq('hsk_level', hskLevel);
    q.then(({ data }) => {
      setRecords(Array.isArray(data) ? (data as CorrectionRecord[]) : []);
      setLoading(false);
    });
  }, [user, module, hskLevel]);

  /* 综合分 */
  const avgScore = (rec: CorrectionRecord) => {
    const vals = Object.values(rec.radar_data ?? {}).filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-500' : s >= 60 ? 'text-amber-500' : 'text-rose-500';

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString(
      language === 'zh' ? 'zh-CN' : language === 'ru' ? 'ru-RU' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    );

  /* 未登录 */
  if (!user) return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl border border-border/60 bg-card p-12 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <LogIn className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {L('请登录后查看历史记录', 'Please login to view history', 'Войдите для просмотра')}
        </p>
      </div>
    </div>
  );

  /* ── 模块 Tab 列表 ─────────────────────────────────────── */
  const tabs: { value: string; label: string; icon?: React.ElementType }[] = [
    { value: 'all', label: L('全部', 'All', 'Все'), icon: FileText },
    ...Object.entries(MODULE_CONFIG).map(([key, cfg]) => ({
      value: key,
      label: t(cfg.tabKey, language),
      icon:  cfg.icon,
    })),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── 标题 ────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <History className="w-4 h-4 text-sky-500" />
        </div>
        <h1 className="text-lg md:text-xl font-bold">{t('nav.history', language)}</h1>
      </div>

      {/* ── 筛选条 ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* 模块 Tabs */}
        <Tabs value={module} onValueChange={(v) => { setModule(v); setHskLevel('all'); }} className="flex-1 min-w-0">
          <TabsList className="h-9 rounded-xl flex-wrap gap-0.5 bg-muted/60 w-full md:w-auto overflow-x-auto whitespace-nowrap">
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {tab.icon && <tab.icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* HSK 级别筛选（仅考题解析有意义，其他模块也可用） */}
        <Select value={hskLevel} onValueChange={setHskLevel}>
          <SelectTrigger className="w-full md:w-32 rounded-xl h-9 text-sm border-border/60 shrink-0">
            <SelectValue placeholder={L('HSK 级别', 'HSK Level', 'Уровень')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{L('全部级别', 'All Levels', 'Все уровни')}</SelectItem>
            {HSK_LEVELS.map(lv => (
              <SelectItem key={lv} value={lv}>{lv}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── 列表区 ──────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2 bg-gradient-to-br from-primary/10 to-primary/5">
              <History className="w-9 h-9 text-primary/40" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base">{t('history.empty.title', language)}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{t('history.empty.desc', language)}</p>
            </div>
            <Link to="/essay"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.97] bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Sparkles className="w-4 h-4" />
              {t('history.empty.cta', language)}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {records.map((rec) => {
            const cfg = MODULE_CONFIG[rec.module as ModuleKey] ?? MODULE_CONFIG.essay;
            const s   = avgScore(rec);
            const isExam = rec.module === 'exam';
            return (
              <div key={rec.id}
                className="group rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-px transition-all duration-200"
                onClick={() => setSelected(rec)}>

                {/* 图标 */}
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                </div>

                {/* 主内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs rounded-lg">{moduleLabel(rec.module)}</Badge>
                    {isExam && rec.hsk_level && (
                      <Badge variant="outline" className={`text-xs rounded-lg border-purple-400/40 ${cfg.color}`}>
                        {rec.hsk_level}
                      </Badge>
                    )}
                    {isExam && rec.module_type && (
                      <Badge variant="outline" className="text-xs rounded-lg border-purple-400/20 text-purple-500/80">
                        {rec.module_type}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{fmtDate(rec.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {isExam
                      ? (rec.exam_data?.passage?.slice(0, 60) ?? rec.input_text?.slice(0, 60) ?? '—')
                      : (rec.input_text?.slice(0, 60) ?? '—')}
                  </p>
                </div>

                {/* 分数 / 统计 */}
                <div className="text-right shrink-0">
                  {isExam ? (
                    <div className="text-xs text-muted-foreground leading-5">
                      <p className={`text-lg font-black ${cfg.color}`}>
                        {rec.exam_data?.vocab_list?.length ?? '—'}
                      </p>
                      <p className="text-muted-foreground/70">
                        {L('词汇', 'Vocab', 'Слов')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className={`text-xl md:text-2xl font-black ${scoreColor(s)}`}>{s || '—'}</div>
                      <p className="text-xs text-muted-foreground">{L('综合分', 'Score', 'Балл')}</p>
                    </>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* ── 详情弹窗 ────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              {selected && (() => {
                const cfg = MODULE_CONFIG[selected.module as ModuleKey] ?? MODULE_CONFIG.essay;
                return (
                  <>
                    <div className={`w-6 h-6 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                      <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    {moduleLabel(selected.module)}
                    {selected.hsk_level && (
                      <Badge variant="outline" className="text-xs ml-1">{selected.hsk_level}</Badge>
                    )}
                    {selected.module_type && (
                      <Badge variant="outline" className="text-xs">{selected.module_type}</Badge>
                    )}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            selected.module === 'exam' && selected.exam_data
              ? <ExamAnalysisResult data={selected.exam_data} language={language} />
              : <CorrectionResult
                  radarData={selected.radar_data || {}}
                  corrections={selected.corrections_data || []}
                  exercises={selected.exercises_data || []}
                  overallComment={selected.suggestions ?? undefined}
                  trendData={selected.score_data ?? undefined}
                  module={selected.module}
                />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
