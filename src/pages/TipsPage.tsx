import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Lightbulb, Target, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LearningPlan } from '@/types/types';

export default function TipsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const msg = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  useEffect(() => {
    if (!user) return;
    supabase.from('corrections').select('id').eq('user_id', user.id).limit(1)
      .then(({ data }) => setHasData((data?.length ?? 0) > 0));
    supabase.from('learning_plans').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setPlan(data as LearningPlan); });
  }, [user]);

  const generatePlan = async () => {
    if (!user) { toast.error(msg('请先登录', 'Please login first', 'Войдите в систему')); return; }
    setLoading(true);
    try {
      const { data: corrections } = await supabase
        .from('corrections').select('radar_data').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(10);
      const { data: resp, error } = await supabase.functions.invoke('ai-learning', {
        body: { corrections, language },
      });
      if (error) throw error;
      setPlan(resp as LearningPlan);
      toast.success(msg('学习计划生成完毕！', 'Plan generated!', 'План создан!'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '生成失败');
    } finally { setLoading(false); }
  };

  // 从结构化数据中提取维度名
  const weakDimNames = plan?.weak_dimensions?.map(w => w.dimension) ?? [];
  const dailyTasks = plan?.plan_content?.daily_tasks ?? [];
  const resources: string[] = [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-rose-500" />
          </div>
          <h1 className="text-lg md:text-xl font-bold truncate">{t('tips.title', language)}</h1>
        </div>
        {hasData && (
          <button
            onClick={generatePlan}
            disabled={loading}
            className="shrink-0 h-9 px-3 md:px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5 md:gap-2 disabled:opacity-50 transition-all duration-200 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,hsl(348,80%,52%),hsl(20,90%,55%))', boxShadow: '0 4px 12px hsl(348,80%,52%,0.3)' }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t('tips.generate', language)}</span>
            <span className="sm:hidden">{language === 'zh' ? '生成' : language === 'ru' ? 'Генер.' : 'Gen.'}</span>
          </button>
        )}
      </div>

      {!hasData ? (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold mb-1">{t('tips.no_data', language)}</p>
              <p className="text-sm text-muted-foreground">
                {msg(
                  '完成批改任务后，AI将为您生成个性化学习计划',
                  'After corrections, AI will generate your personalized plan',
                  'После проверок ИИ создаст персональный план',
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {msg('AI 正在分析学习数据...', 'AI is analyzing your data...', 'ИИ анализирует данные...')}
            </p>
          </CardContent>
        </Card>
      ) : plan ? (
        <div className="space-y-4">
          {/* 薄弱维度 */}
          {weakDimNames.length > 0 && (
            <Card className="rounded-2xl border-rose-500/20 bg-gradient-to-br from-rose-500/8 to-rose-600/3">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-rose-500" />
                  <h2 className="font-semibold text-sm">{t('tips.weak', language)}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weakDimNames.map((d, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium border border-rose-500/20">
                      {d}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 每日任务 */}
          {dailyTasks.length > 0 && (
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">{t('tips.daily', language)}</h2>
                </div>
                <div className="space-y-2">
                  {dailyTasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{task.task}</p>
                        {task.duration && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.duration}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 计划概述 */}
          {plan.plan_content?.description && (
            <Card className="rounded-2xl border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-blue-600/3">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-blue-500" />
                  <h2 className="font-semibold text-sm">
                    {msg('学习计划概述', 'Plan Overview', 'Обзор плана')}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{plan.plan_content.description}</p>
              </CardContent>
            </Card>
          )}

          {/* 推荐资源（预留） */}
          {resources.length > 0 && (
            <Card className="rounded-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-emerald-600/3">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-semibold text-sm">{msg('推荐资源', 'Resources', 'Ресурсы')}</h2>
                </div>
                <div className="space-y-2">
                  {resources.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{r}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {msg('点击上方按钮生成个性化学习计划', 'Click the button above to generate your plan', 'Нажмите кнопку выше')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
