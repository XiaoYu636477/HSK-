import { useState } from 'react';
import type { ExamAnalysisData, VocabItem, ExamPoint, QuestionAnalysis, Hsk3Change } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, ChevronDown, ChevronUp, Sparkles, AlertTriangle,
  CheckCircle2, Lightbulb, Target, TrendingUp, BookMarked,
  Volume2, Pencil, FileText, GraduationCap,
} from 'lucide-react';

// ── Section 可折叠容器 ──────────────────────────────────────────────────────────
function Section({
  icon, title, badge, defaultOpen = true, accent = 'primary', children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  accent?: 'primary' | 'violet' | 'amber' | 'emerald' | 'rose';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentMap = {
    primary:  'from-primary to-primary/70',
    violet:   'from-violet-500 to-purple-600',
    amber:    'from-amber-500 to-orange-500',
    emerald:  'from-emerald-500 to-teal-500',
    rose:     'from-rose-500 to-pink-500',
  };
  return (
    <Card className="border-border/50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/50 text-muted-foreground">
              {badge}
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="border-t border-border/40">{children}</div>}
    </Card>
  );
}

// ── 词汇卡片 ────────────────────────────────────────────────────────────────────
function VocabCard({ item }: { item: VocabItem }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 space-y-1.5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-base font-bold text-foreground">{item.word}</span>
          <span className="ml-2 text-xs text-muted-foreground font-mono">{item.pinyin}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.new_in_hsk3 && (
            <Badge className="text-[9px] h-4 px-1 bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 border">
              NEW
            </Badge>
          )}
          {item.hsk_level && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 border-border/50 text-muted-foreground">
              {item.hsk_level}
            </Badge>
          )}
        </div>
      </div>
      <p className="text-xs text-primary font-medium leading-snug">{item.meaning}</p>
      <p className="text-xs text-muted-foreground leading-relaxed italic">{item.example}</p>
    </div>
  );
}

// ── 考点条目 ────────────────────────────────────────────────────────────────────
function ExamPointRow({ point, idx }: { point: ExamPoint; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 text-left transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{point.type}</span>
            {point.is_new_hsk3 && (
              <Badge className="text-[9px] h-4 px-1.5 bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                HSK3.0新增
              </Badge>
            )}
          </div>
          {!open && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{point.description}</p>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed pl-8">{point.description}</p>
          {point.strategy && (
            <div className="ml-8 flex items-start gap-2 rounded-lg bg-amber-500/8 border border-amber-500/15 px-3 py-2">
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">{point.strategy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 题目解析卡 ──────────────────────────────────────────────────────────────────
function QuestionCard({ q, idx }: { q: QuestionAnalysis; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 text-left transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-white">{q.question_no ?? idx + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{q.question_text}</p>
          {q.key_point && !open && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              考点：{q.key_point}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-emerald-500 tabular-nums">答：{q.answer}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* 选项 */}
          {q.options && q.options.length > 0 && (
            <div className="ml-9 space-y-1.5">
              {q.options.map((opt, oi) => {
                const letter = opt.charAt(0).toUpperCase();
                const isCorrect = q.answer.toUpperCase().includes(letter);
                return (
                  <div key={oi} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                    isCorrect
                      ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'bg-muted/30 text-muted-foreground'
                  }`}>
                    {isCorrect && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* 解析 */}
          {q.explanation && (
            <div className="ml-9 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-primary mb-1">解析</p>
              <p className="text-xs text-foreground leading-relaxed">{q.explanation}</p>
            </div>
          )}
          {/* 考点标签 */}
          {q.key_point && (
            <div className="ml-9 flex items-center gap-1.5">
              <Target className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">核心考点：</span>
              <span className="text-[11px] font-medium text-foreground">{q.key_point}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── HSK3.0 变化卡 ───────────────────────────────────────────────────────────────
function ChangeCard({ change }: { change: Hsk3Change }) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge className="text-[10px] px-2 py-0.5 bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25">
          {change.aspect}
        </Badge>
        <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold">HSK3.0 新变化</span>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{change.change}</p>
      {change.impact && (
        <div className="flex items-start gap-2 rounded-lg bg-background/60 border border-border/40 px-2.5 py-2">
          <TrendingUp className="w-3 h-3 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{change.impact}</p>
        </div>
      )}
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────────────────────
interface Props {
  data: ExamAnalysisData;
  language: string;
}

export default function ExamAnalysisResult({ data, language }: Props) {
  const L = (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

  const moduleIcon = data.module_type === '听力' || data.module_type === 'Listening' || data.module_type === 'Аудирование'
    ? <Volume2 className="w-3 h-3 text-white" />
    : data.module_type === '书写' || data.module_type === 'Writing' || data.module_type === 'Письмо'
    ? <Pencil className="w-3 h-3 text-white" />
    : <BookOpen className="w-3 h-3 text-white" />;

  return (
    <div className="space-y-4">
      {/* ── 概览卡 ──────────────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-muted/20 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                {moduleIcon}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{data.hsk_level}</p>
                <p className="text-[11px] text-muted-foreground">{data.module_type}</p>
              </div>
            </div>
            {data.total_questions !== undefined && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {L('标准题量', 'Standard count', 'Кол-во')}：
                  <strong className="text-foreground">{data.total_questions}</strong>
                  {L('题', '', '')}
                </span>
              </div>
            )}
            {data.exam_points?.some(p => p.is_new_hsk3) && (
              <Badge className="text-[10px] px-2 py-0.5 bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                含 HSK3.0 新考点
              </Badge>
            )}
          </div>

          {/* 综合建议 */}
          {data.overall_tip && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
              <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{data.overall_tip}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 阅读/听力原文 ────────────────────────────────────────────────────────── */}
      {data.passage && (
        <Section
          icon={<BookMarked className="w-3 h-3 text-white" />}
          title={L('原文 / 听力文本', 'Passage / Listening Text', 'Текст')}
          accent="emerald"
          defaultOpen={false}
        >
          <div className="p-4 space-y-3">
            {data.passage_summary && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  {L('要点摘要', 'Summary', 'Краткое содержание')}
                </p>
                <p className="text-xs text-foreground leading-relaxed">{data.passage_summary}</p>
              </div>
            )}
            <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{data.passage}</p>
            </div>
          </div>
        </Section>
      )}

      {/* ── 词汇解析 ────────────────────────────────────────────────────────────── */}
      {data.vocab_list?.length > 0 && (
        <Section
          icon={<BookOpen className="w-3 h-3 text-white" />}
          title={L('词汇解析', 'Vocabulary Analysis', 'Анализ словаря')}
          badge={`${data.vocab_list.length} ${L('词', 'words', 'слов')}`}
          accent="primary"
        >
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.vocab_list.map((item, i) => (
              <VocabCard key={i} item={item} />
            ))}
          </div>
        </Section>
      )}

      {/* ── 考点分析 ────────────────────────────────────────────────────────────── */}
      {data.exam_points?.length > 0 && (
        <Section
          icon={<Target className="w-3 h-3 text-white" />}
          title={L('考点分析', 'Exam Point Analysis', 'Анализ тем')}
          badge={`${data.exam_points.length} ${L('个考点', 'points', 'тем')}`}
          accent="violet"
        >
          {data.exam_points.map((p, i) => (
            <ExamPointRow key={i} point={p} idx={i} />
          ))}
        </Section>
      )}

      {/* ── 题目逐题解析 ─────────────────────────────────────────────────────────── */}
      {data.questions?.length > 0 && (
        <Section
          icon={<Sparkles className="w-3 h-3 text-white" />}
          title={L('题目解析', 'Question Analysis', 'Разбор заданий')}
          badge={`${data.questions.length} ${L('题', 'questions', 'заданий')}`}
          accent="amber"
        >
          {data.questions.map((q, i) => (
            <QuestionCard key={i} q={q} idx={i} />
          ))}
        </Section>
      )}

      {/* ── HSK3.0 变化 ──────────────────────────────────────────────────────────── */}
      {data.hsk3_changes?.length > 0 && (
        <Section
          icon={<AlertTriangle className="w-3 h-3 text-white" />}
          title={L('HSK3.0 新变化', 'HSK3.0 Changes', 'Изменения HSK3.0')}
          badge={`${data.hsk3_changes.length} ${L('项', 'items', 'пункта')}`}
          accent="rose"
          defaultOpen={false}
        >
          <div className="p-4 space-y-3">
            {data.hsk3_changes.map((c, i) => (
              <ChangeCard key={i} change={c} />
            ))}
          </div>
        </Section>
      )}

      {/* ── 答题策略 ────────────────────────────────────────────────────────────── */}
      {data.strategies?.length > 0 && (
        <Section
          icon={<Lightbulb className="w-3 h-3 text-white" />}
          title={L('答题策略', 'Strategies', 'Стратегии')}
          badge={`${data.strategies.length} ${L('条', 'tips', 'советов')}`}
          accent="emerald"
          defaultOpen={false}
        >
          <div className="p-4 space-y-2">
            {data.strategies.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/20 border border-border/40 px-3 py-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-emerald-600">{i + 1}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
