import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dumbbell, Sparkles, ChevronRight, CheckCircle2, XCircle,
  RotateCcw, Trophy, AlertCircle, LogIn, ChevronLeft,
  Brain, BookOpen, Loader2,
} from 'lucide-react';
import type { CorrectionRecord, PracticeQuestion, PracticeSession } from '@/types/types';

// ─── 常量 ────────────────────────────────────────────────────────────────────
const HSK_LEVELS   = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
const ALL_DIMS     = ['词汇', '语法', '结构', '表达', '内容', '流利度', '发音', '准确性'];
const COUNT_OPTIONS = [5, 10, 15];

// ─── 薄弱维度计算（复用 ProfilePage 逻辑）────────────────────────────────────
function detectWeakDims(records: CorrectionRecord[]): string[] {
  const sum: Record<string, number> = {};
  const cnt: Record<string, number> = {};
  for (const r of records) {
    if (!r.radar_data) continue;
    for (const [k, v] of Object.entries(r.radar_data)) {
      if (typeof v === 'number') { sum[k] = (sum[k] ?? 0) + v; cnt[k] = (cnt[k] ?? 0) + 1; }
    }
  }
  return Object.entries(sum)
    .map(([k, v]) => ({ k, avg: v / (cnt[k] ?? 1) }))
    .filter(d => d.avg < 72)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4)
    .map(d => d.k);
}

// ─── 题目选项字母 ─────────────────────────────────────────────────────────────
const optionLetter = (opt: string) => opt.charAt(0).toUpperCase();

// ─── 阶段枚举 ─────────────────────────────────────────────────────────────────
type Stage = 'setup' | 'loading' | 'quiz' | 'result';

export default function PracticePage() {
  const { language } = useLanguage();
  const { user }     = useAuth();
  const { isActivated, openModal, trackApiCall } = useYuCode();
  const L = (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

  // ── 设置状态 ──────────────────────────────────────────────────────────────
  const [stage,         setStage]         = useState<Stage>('setup');
  const [hskLevel,      setHskLevel]      = useState('HSK4');
  const [selectedDims,  setSelectedDims]  = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [autoDetected,  setAutoDetected]  = useState<string[]>([]);
  const [histLoading,   setHistLoading]   = useState(false);

  // ── 题目状态 ──────────────────────────────────────────────────────────────
  const [questions,   setQuestions]   = useState<PracticeQuestion[]>([]);
  const [current,     setCurrent]     = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showAnswer,  setShowAnswer]  = useState(false);
  const [fillInput,   setFillInput]   = useState('');

  // ── 从历史记录自动检测薄弱维度 ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setHistLoading(true);
    supabase
      .from('corrections')
      .select('radar_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const recs = Array.isArray(data) ? (data as CorrectionRecord[]) : [];
        const weak = detectWeakDims(recs);
        setAutoDetected(weak);
        if (weak.length > 0) setSelectedDims(weak);
        setHistLoading(false);
      });
  }, [user]);

  const toggleDim = (d: string) =>
    setSelectedDims(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  // ── 生成题目 ──────────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!isActivated) { openModal(); return; }
    if (selectedDims.length === 0) {
      toast.error(L('请至少选择一个练习维度', 'Select at least one dimension', 'Выберите хотя бы одно измерение'));
      return;
    }
    const callCheck = await trackApiCall();
    if (!callCheck.ok) {
      if (callCheck.reason === 'limit_reached') toast.error(L('今日练习次数已用完，明天再来', 'Daily limit reached', 'Дневной лимит исчерпан'));
      else if (callCheck.reason === 'expired')  toast.error(L('小Yu码已到期，请联系老师续期', 'Yu Code expired', 'Код истёк'));
      else if (callCheck.reason === 'disabled') toast.error(L('小Yu码已被禁用，请联系老师', 'Yu Code disabled', 'Код заблокирован'));
      return;
    }
    setStage('loading');
    try {
      const { data, error } = await supabase.functions.invoke('ai-practice', {
        body: { hskLevel, dimensions: selectedDims, questionCount, language },
      });
      if (error) throw error;
      const qs: PracticeQuestion[] = (data as { questions: PracticeQuestion[] }).questions ?? [];
      if (qs.length === 0) throw new Error('No questions returned');
      setQuestions(qs);
      setCurrent(0);
      setUserAnswers({});
      setShowAnswer(false);
      setFillInput('');
      setStage('quiz');
    } catch (e) {
      console.error(e);
      toast.error(L('题目生成失败，请重试', 'Generation failed, please retry', 'Ошибка генерации, попробуйте снова'));
      setStage('setup');
    }
  }, [hskLevel, selectedDims, questionCount, language, isActivated, openModal, trackApiCall]);

  // ── 提交答案 ──────────────────────────────────────────────────────────────
  const submitAnswer = (answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questions[current].id]: answer }));
    setShowAnswer(true);
  };

  const submitFill = () => {
    if (!fillInput.trim()) return;
    submitAnswer(fillInput.trim());
  };

  // ── 下一题 ────────────────────────────────────────────────────────────────
  const nextQuestion = () => {
    setShowAnswer(false);
    setFillInput('');
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
    } else {
      finishSession();
    }
  };

  // ── 完成，保存历史 ────────────────────────────────────────────────────────
  const finishSession = useCallback(async () => {
    const correct = questions.filter(q => {
      const ans = userAnswers[q.id] ?? '';
      return ans.trim().toUpperCase().startsWith(q.answer.trim().toUpperCase()) ||
             ans.trim() === q.answer.trim();
    }).length;
    const score = Math.round((correct / questions.length) * 100);

    const session: PracticeSession = {
      summary:     { level: hskLevel, focus: selectedDims, total: questions.length },
      questions,
      userAnswers,
      score,
      correct,
      completedAt: new Date().toISOString(),
    };

    setStage('result');

    if (user) {
      await supabase.from('corrections').insert({
        user_id:       user.id,
        module:        'practice',
        input_text:    `${hskLevel} · ${selectedDims.join('/')} · ${questions.length}题`,
        hsk_level:     hskLevel,
        module_type:   selectedDims.join('/'),
        practice_data: session,
        suggestions:   `得分 ${score}分，答对 ${correct}/${questions.length} 题`,
      });
      toast.success(L('练习记录已保存到历史', 'Session saved to history', 'Сессия сохранена в историю'));
    }
  }, [questions, userAnswers, hskLevel, selectedDims, user]);

  // ── 结果页计算 ────────────────────────────────────────────────────────────
  const correct = questions.filter(q => {
    const ans = userAnswers[q.id] ?? '';
    return ans.trim().toUpperCase().startsWith(q.answer.trim().toUpperCase()) ||
           ans.trim() === q.answer.trim();
  }).length;
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 未登录
  if (!user) return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl border border-border/60 bg-card p-12 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <LogIn className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {L('请登录后使用练习题库', 'Please login to use the practice bank', 'Войдите для доступа к упражнениям')}
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 设置页
  if (stage === 'setup') return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* 标题 */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Dumbbell className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold">{L('AI 练习题库', 'AI Practice Bank', 'Банк упражнений ИИ')}</h1>
          <p className="text-xs text-muted-foreground">{L('根据薄弱维度自动出题，针对性强化', 'Auto-generates questions based on weak points', 'Авто-генерация на основе слабых мест')}</p>
        </div>
      </div>

      {/* 薄弱维度检测结果 */}
      {histLoading ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : autoDetected.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <Brain className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {L('根据你的历史记录，以下维度需要加强：', 'Based on your history, these dimensions need work:', 'На основе вашей истории, эти измерения требуют работы:')}
            </p>
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {autoDetected.map(d => (
                <Badge key={d} className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/30 rounded-lg">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            {L('完成几次批改后，系统将自动检测薄弱维度', 'Complete some corrections first to auto-detect weak points', 'Выполните несколько проверок для авто-определения')}
          </p>
        </div>
      )}

      {/* HSK 级别选择 */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">{L('选择 HSK 级别', 'Select HSK Level', 'Выберите уровень HSK')}</p>
          <div className="flex flex-wrap gap-2">
            {HSK_LEVELS.map(lv => (
              <button
                key={lv}
                onClick={() => setHskLevel(lv)}
                className={`h-8 px-4 rounded-xl text-sm font-medium border transition-all ${
                  hskLevel === lv
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/40 border-border/60 hover:border-primary/40'
                }`}
              >{lv}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 练习维度选择 */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{L('选择练习维度', 'Select Dimensions', 'Выберите измерения')}</p>
            <span className="text-xs text-muted-foreground">{L(`已选 ${selectedDims.length} 个`, `${selectedDims.length} selected`, `Выбрано: ${selectedDims.length}`)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_DIMS.map(d => (
              <button
                key={d}
                onClick={() => toggleDim(d)}
                className={`h-8 px-3 rounded-xl text-sm font-medium border transition-all ${
                  selectedDims.includes(d)
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-400/40'
                    : 'bg-muted/40 border-border/60 hover:border-rose-400/30'
                }`}
              >
                {d}
                {autoDetected.includes(d) && <span className="ml-1 text-amber-500">●</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{L('● 表示检测到的薄弱维度', '● = detected weak point', '● = обнаруженное слабое место')}</p>
        </CardContent>
      </Card>

      {/* 题目数量选择 */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">{L('题目数量', 'Number of Questions', 'Количество вопросов')}</p>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`h-9 px-5 rounded-xl text-sm font-medium border transition-all ${
                  questionCount === n
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/40 border-border/60 hover:border-primary/40'
                }`}
              >{n} {L('题', 'Q', 'воп.')}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 开始按钮 */}
      <Button
        onClick={generate}
        disabled={selectedDims.length === 0}
        className="w-full h-12 text-sm font-bold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/25 rounded-xl disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {L('AI 生成专项练习题', 'Generate AI Practice Questions', 'Сгенерировать упражнения ИИ')}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 加载中
  if (stage === 'loading') return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-6 py-20">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="font-semibold text-base">{L('AI 正在为你出题…', 'AI is generating questions…', 'ИИ генерирует вопросы…')}</p>
        <p className="text-sm text-muted-foreground">
          {L(`针对 ${selectedDims.join('、')} 出 ${questionCount} 道 ${hskLevel} 级题目`, `Generating ${questionCount} ${hskLevel} questions on ${selectedDims.join(', ')}`, `Генерация ${questionCount} вопросов ${hskLevel}`)}
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 答题页
  if (stage === 'quiz') {
    const q       = questions[current];
    const userAns = userAnswers[q.id];
    const isCorrect = userAns !== undefined && (
      userAns.trim().toUpperCase().startsWith(q.answer.trim().toUpperCase()) ||
      userAns.trim() === q.answer.trim()
    );

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="shrink-0">{L(`第 ${current + 1} / ${questions.length} 题`, `Question ${current + 1} / ${questions.length}`, `Вопрос ${current + 1} / ${questions.length}`)}</span>
            <span className="truncate max-w-[55%] text-right">{q.dimension} · {q.knowledge_point}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 题卡 */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5 space-y-4">
            {/* 徽章 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs rounded-lg">{q.type === 'choice' ? L('单选题', 'Multiple Choice', 'Выбор') : q.type === 'judge' ? L('判断题', 'True/False', 'Верно/Неверно') : L('填空题', 'Fill in', 'Заполни')}</Badge>
              <Badge variant="outline" className="text-xs rounded-lg text-rose-500 border-rose-400/30">{q.dimension}</Badge>
            </div>

            {/* 题目 */}
            <p className="text-base font-medium leading-relaxed">{q.question}</p>

            {/* 选项区 */}
            {q.type !== 'fill' && q.options ? (
              <div className="space-y-2">
                {q.options.map(opt => {
                  const letter = optionLetter(opt);
                  const isSelected = userAns === letter;
                  const isAnswer   = q.answer.trim().toUpperCase() === letter;
                  let cls = 'rounded-xl border p-3 text-sm cursor-pointer transition-all flex items-start gap-2.5';
                  if (!showAnswer) {
                    cls += isSelected
                      ? ' border-primary bg-primary/10 text-foreground'
                      : ' border-border/60 hover:border-primary/40 bg-muted/20';
                  } else {
                    if (isAnswer)       cls += ' border-emerald-500 bg-emerald-500/10 text-foreground';
                    else if (isSelected) cls += ' border-rose-500 bg-rose-500/10 text-foreground';
                    else                 cls += ' border-border/40 bg-muted/10 text-muted-foreground';
                  }
                  return (
                    <button key={opt} className={cls}
                      disabled={showAnswer}
                      onClick={() => !showAnswer && submitAnswer(letter)}>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        showAnswer && isAnswer ? 'bg-emerald-500 border-emerald-500 text-white'
                        : showAnswer && isSelected && !isAnswer ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-current'
                      }`}>{letter}</span>
                      <span className="flex-1 text-left">{opt.slice(2).trim()}</span>
                      {showAnswer && isAnswer  && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                      {showAnswer && isSelected && !isAnswer && <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* 填空题 */
              <div className="space-y-2">
                <input
                  type="text"
                  value={fillInput}
                  onChange={e => setFillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !showAnswer && submitFill()}
                  disabled={showAnswer}
                  placeholder={L('输入你的答案…', 'Type your answer…', 'Введите ответ…')}
                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
                {!showAnswer && (
                  <Button size="sm" onClick={submitFill} disabled={!fillInput.trim()}
                    className="h-8 px-4 text-xs rounded-lg">
                    {L('提交', 'Submit', 'Ответить')}
                  </Button>
                )}
              </div>
            )}

            {/* 解析区 */}
            {showAnswer && (
              <div className={`rounded-xl p-3.5 space-y-1.5 ${isCorrect ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-rose-500/8 border border-rose-500/20'}`}>
                <div className="flex items-center gap-2">
                  {isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle      className="w-4 h-4 text-rose-500 shrink-0" />}
                  <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isCorrect
                      ? L('回答正确！', 'Correct!', 'Правильно!')
                      : L(`正确答案：${q.answer}`, `Correct answer: ${q.answer}`, `Правильный ответ: ${q.answer}`)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 下一题按钮 */}
        {showAnswer && (
          <Button onClick={nextQuestion}
            className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20">
            {current + 1 < questions.length
              ? <>{L('下一题', 'Next Question', 'Следующий вопрос')} <ChevronRight className="w-4 h-4 ml-1" /></>
              : <>{L('查看结果', 'View Results', 'Посмотреть результаты')} <Trophy className="w-4 h-4 ml-1" /></>}
          </Button>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 结果页
  if (stage === 'result') {
    const rank = score >= 90 ? { label: L('优秀', 'Excellent', 'Отлично'), color: 'text-emerald-500' }
               : score >= 70 ? { label: L('良好', 'Good', 'Хорошо'),      color: 'text-blue-500' }
               : score >= 50 ? { label: L('一般', 'Fair', 'Удовл.'),      color: 'text-amber-500' }
               :               { label: L('需加强', 'Needs work', 'Нужно'),  color: 'text-rose-500' };

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* 总分卡 */}
        <Card className="rounded-2xl border-border/60 overflow-hidden">
          <div className="bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{L('本次得分', 'Your Score', 'Ваш результат')}</p>
              <p className={`text-6xl font-black ${rank.color}`}>{score}</p>
              <Badge className={`mt-1 text-sm rounded-lg ${rank.color} bg-current/10 border-current/20`}>{rank.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {L(`答对 ${correct} / ${questions.length} 题`, `${correct} / ${questions.length} correct`, `Правильно: ${correct} / ${questions.length}`)}
              {' · '}{hskLevel}{' · '}{selectedDims.join('/')}
            </p>
          </div>
        </Card>

        {/* 逐题回顾 */}
        <div className="space-y-2">
          <p className="text-sm font-semibold px-1">{L('答题回顾', 'Question Review', 'Обзор ответов')}</p>
          {questions.map((q, i) => {
            const ans = userAnswers[q.id] ?? '';
            const ok  = ans.trim().toUpperCase().startsWith(q.answer.trim().toUpperCase()) || ans.trim() === q.answer.trim();
            return (
              <div key={q.id} className={`rounded-xl border p-3.5 space-y-1.5 ${ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
                  {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                  <Badge variant="outline" className="text-xs rounded-md">{q.dimension}</Badge>
                  <span className="text-xs text-muted-foreground">{q.knowledge_point}</span>
                </div>
                <p className="text-sm leading-snug">{q.question}</p>
                {!ok && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {L(`你的答案：${ans || '—'}，正确答案：${q.answer}`, `Your answer: ${ans || '—'} · Correct: ${q.answer}`, `Ваш ответ: ${ans || '—'} · Правильный: ${q.answer}`)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
              </div>
            );
          })}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setStage('setup'); setQuestions([]); }}
            className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2">
            <ChevronLeft className="w-4 h-4" /> {L('重新设置', 'New Session', 'Новая сессия')}
          </Button>
          <Button onClick={generate}
            className="flex-1 h-11 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20 gap-2">
            <RotateCcw className="w-4 h-4" /> {L('再练一组', 'Practice Again', 'Практиковать снова')}
          </Button>
        </div>

        {/* 保存提示 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 px-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {L('本次练习已自动保存到历史记录', 'This session has been saved to your history', 'Эта сессия сохранена в историю')}
        </div>
      </div>
    );
  }

  return null;
}
