import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Eye, Layers, BookMarked, PenLine, ChevronDown, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const L = (lang: string, zh: string, en: string, ru: string) =>
  lang === 'zh' ? zh : lang === 'ru' ? ru : en;

const templates = [
  {
    zh: 'HSK 作文万能框架', en: 'HSK Essay Universal Framework', ru: 'Универсальный шаблон эссе HSK',
    descZh: '适用于 HSK 4-6 级议论文，三段式结构，配有过渡句模板',
    descEn: 'Applies to HSK 4-6 argumentative essays with 3-part structure',
    descRu: 'Подходит для эссе HSK 4-6, трёхчастная структура',
    icon: PenLine, grad: 'from-blue-500 to-blue-600',
    border: 'border-blue-400/20', bg: 'from-blue-500/10 to-blue-600/5',
    levelZh: 'HSK 4-6',
    items: {
      zh: ['开头段：引出话题 + 表明立场（2-3句）', '主体段：论点 + 论据 + 举例（4-6句）', '结尾段：总结观点 + 升华主题（2句）', '20个高频议论文过渡句模板', '评分标准与扣分点详解'],
      en: ['Intro: introduce topic + state position (2-3 sentences)', 'Body: argument + evidence + examples (4-6 sentences)', 'Conclusion: summarize + elevate theme (2 sentences)', '20 high-frequency transition sentence templates', 'Scoring criteria & common deductions'],
      ru: ['Вступление: тема + позиция (2-3 предл.)', 'Основная часть: аргументы + примеры (4-6 предл.)', 'Заключение: итог + обобщение (2 предл.)', '20 шаблонов переходных фраз', 'Критерии оценивания и штрафные пункты'],
    },
  },
  {
    zh: '六维能力提升计划表', en: '6-Dimension Skill Improvement Plan', ru: 'План развития по 6 навыкам',
    descZh: '全面梳理听说读写译六维能力，制定个性化提升路线图',
    descEn: 'Comprehensive 6-skill roadmap: listening, speaking, reading, writing, translation',
    descRu: 'Комплексная карта навыков: аудирование, речь, чтение, письмо, перевод',
    icon: Layers, grad: 'from-amber-500 to-amber-600',
    border: 'border-amber-400/20', bg: 'from-amber-500/10 to-amber-600/5',
    levelZh: '全级别',
    items: {
      zh: ['听力：精听 vs 泛听策略分配', '口语：发音纠正 + 流利度训练计划', '阅读：速读技巧 + 精读深度训练', '写作：词汇量提升 + 语法强化路径', '四周滚动学习计划模板', 'AI 推荐薄弱项强化节奏'],
      en: ['Listening: intensive vs extensive strategy', 'Speaking: pronunciation & fluency plan', 'Reading: speed reading + deep reading', 'Writing: vocabulary & grammar roadmap', '4-week rolling study plan template', 'AI-recommended weak area rhythm'],
      ru: ['Аудирование: интенсивное vs экстенсивное', 'Говорение: произношение и беглость', 'Чтение: скоростное и углублённое', 'Письмо: лексика и грамматика', 'Скользящий план на 4 недели', 'ИИ-ритм для слабых навыков'],
    },
  },
  {
    zh: '口语表达常用句型', en: 'Oral Expression Sentence Patterns', ru: 'Типовые фразы для устной речи',
    descZh: '30 个高频口语句型，附使用场景说明和示例对话',
    descEn: '30 high-frequency oral patterns with usage contexts',
    descRu: '30 устойчивых выражений с примерами диалогов',
    icon: BookMarked, grad: 'from-violet-500 to-violet-600',
    border: 'border-violet-400/20', bg: 'from-violet-500/10 to-violet-600/5',
    levelZh: 'HSK 3-5',
    items: {
      zh: ['表达观点：我认为…、依我看…（6句）', '举例说明：比如说…、以…为例（5句）', '转折递进：虽然…但是…、不仅…而且…（6句）', '总结归纳：总的来说…、综上所述…（4句）', '礼貌请求与婉拒常用句（9句）'],
      en: ['Expressing opinions: I think / In my view (6 patterns)', 'Giving examples: For example / Take ... as an example (5 patterns)', 'Contrast & progression: Although / Not only...but also (6 patterns)', 'Summarizing: In general / To sum up (4 patterns)', 'Polite requests & polite refusals (9 patterns)'],
      ru: ['Мнение: я считаю / по-моему (6 фраз)', 'Примеры: например / возьмём за пример (5 фраз)', 'Противопоставление: хотя / не только...но и (6 фраз)', 'Итог: в целом / подводя итог (4 фразы)', 'Вежливые просьбы и отказы (9 фраз)'],
    },
  },
  {
    zh: '个性化学习计划表', en: 'Personalized Study Plan', ru: 'Персональный план обучения',
    descZh: '可根据目标考试日期倒推，每周任务清单自动分配',
    descEn: 'Backward-plan from your exam date with auto-distributed weekly tasks',
    descRu: 'Обратное планирование от даты экзамена с еженедельными задачами',
    icon: FileText, grad: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-400/20', bg: 'from-emerald-500/10 to-emerald-600/5',
    levelZh: '全级别',
    items: {
      zh: ['考前 8 周冲刺计划框架', '每日学习时长 & 模块分配建议', '单词记忆艾宾浩斯复习节奏表', '模拟考试安排与错题复盘模板', '考前一周心态调整与高效复习策略'],
      en: ['8-week pre-exam sprint framework', 'Daily study time & module allocation', 'Vocabulary Ebbinghaus review schedule', 'Mock exam plan & error review template', 'Final week mindset & efficient review strategy'],
      ru: ['8-недельный план перед экзаменом', 'Ежедневное время и распределение модулей', 'График повторения по Эббингаузу', 'Пробные экзамены и разбор ошибок', 'Финальная неделя: настрой и стратегия'],
    },
  },
];

export default function TemplatesPage() {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [copied, setCopied] = useState(false);

  const teacherWeChat = 'XiaoYu636477'; // 微信/老师ID

  const handleTemplateClick = (i: number, tpl: typeof templates[0]) => {
    if (expanded === i) {
      setExpanded(null);
      return;
    }
    setExpanded(i);
    setDialogTitle(L(language, tpl.zh, tpl.en, tpl.ru));
    setDialogOpen(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(teacherWeChat).then(() => {
      setCopied(true);
      toast.success(L(language, '已复制！', 'Copied!', 'Скопировано!'));
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error(L(language, '复制失败，请手动记录', 'Copy failed', 'Ошибка копирования'));
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* 页头 */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,hsl(290,60%,48%),hsl(256,68%,56%))' }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">
              {L(language, '备考模板', 'Exam Templates', 'Шаблоны для экзамена')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {L(language, '独立知识库 · 精选 HSK 备考资料，开箱即用', 'Independent knowledge base · Curated HSK prep resources', 'База знаний · Готовые ресурсы для подготовки к HSK')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Badge variant="secondary" className="text-xs gap-1.5">
            <Eye className="w-3 h-3" />
            {L(language, '4 份模板', '4 Templates', '4 шаблона')}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1.5">
            <Download className="w-3 h-3" />
            {L(language, '持续更新', 'Updated regularly', 'Регулярно обновляется')}
          </Badge>
        </div>
      </div>

      {/* 模板卡片列表（可展开） */}
      <div className="space-y-3 animate-fade-up delay-100">
        {templates.map((tpl, i) => {
          const isOpen = expanded === i;
          return (
            <div
              key={i}
              className={`card-premium relative overflow-hidden bg-gradient-to-br ${tpl.bg} border ${tpl.border} transition-all duration-250`}
            >
              {/* 卡片头部（点击展开） */}
              <button
                onClick={() => handleTemplateClick(i, tpl)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tpl.grad} flex items-center justify-center shrink-0 shadow-md transition-transform duration-250 ${isOpen ? 'scale-105 -rotate-2' : ''}`}>
                  <tpl.icon className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-sm text-foreground">
                      {L(language, tpl.zh, tpl.en, tpl.ru)}
                    </h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 h-4 border-border/60">
                      {tpl.levelZh}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed text-pretty line-clamp-1">
                    {L(language, tpl.descZh, tpl.descEn, tpl.descRu)}
                  </p>
                </div>

                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <Card className="rounded-2xl border-border/40 animate-fade-up delay-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookMarked className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {L(language,
              '以上模板均为独立知识库内容，与批改模块分开管理。完成批改后，AI 会根据你的薄弱点自动推荐对应模板。',
              'All templates are part of the independent knowledge base, separate from the correction modules. After corrections, AI recommends matching templates based on your weak areas.',
              'Все шаблоны — независимая база знаний, отдельная от модулей проверки. После проверки ИИ рекомендует подходящие шаблоны.'
            )}
          </p>
        </CardContent>
      </Card>

      {/* 联系老师弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {L(language,
                  '本模板为小鱼老师的专属学习资料，请联系老师获取完整版。添加微信，领取更多 HSK 备考资源！',
                  'This template is exclusive material from Teacher XiaoYu. Please contact the teacher for the full version. Add WeChat to get more HSK prep resources!',
                  'Этот шаблон — эксклюзивный материал учителя XiaoYu. Добавьте учителя в WeChat для получения полной версии и дополнительных материалов HSK!'
                )}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {L(language, '老师微信 / Teacher WeChat', '老师微信 / Teacher WeChat', 'WeChat учителя')}
                </span>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-3 text-xs gap-1.5 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied
                    ? L(language, '已复制', 'Copied', 'Скопировано')
                    : L(language, '复制', 'Copy', 'Копировать')}
                </Button>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background border border-border/30">
                <span className="font-bold text-foreground tracking-wide select-all">{teacherWeChat}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {L(language,
                '添加好友时请备注"HSK学习"，小鱼老师看到后会第一时间通过并发送资料给你～',
                'Please note "HSK study" when adding. Teacher XiaoYu will approve and send you the materials ASAP~',
                'При добавлении укажите "HSK обучение". Учитель XiaoYu подтвердит заявку и пришлёт материалы~'
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
