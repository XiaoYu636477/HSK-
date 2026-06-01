import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/db/supabase';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, BarChart3, Sparkles, Upload, Image, FileText } from 'lucide-react';
import CorrectionResult from '@/components/common/CorrectionResult';
import type { RadarData, Correction, Exercise } from '@/types/types';

type Result = {
  radar_data: RadarData;
  corrections: Correction[];
  exercises: Exercise[];
  overall_comment: string;
  suggestions?: string;
  trend_data?: { date: string; score: number }[];
};

export default function ScorePage() {
  const { language } = useLanguage();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [focused, setFocused] = useState(false);
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const L = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  const placeholder = L(
    '请输入成绩数据，例如：\n2026-01: 听力78, 阅读82, 写作70\n2026-02: 听力80, 阅读84, 写作75\n\n或直接描述你的学习情况…',
    'Enter score data, e.g.:\n2026-01: Listening 78, Reading 82, Writing 70\n2026-02: Listening 80, Reading 84, Writing 75\n\nOr describe your learning progress…',
    'Введите данные оценок:\n2026-01: Слушание 78, Чтение 82, Письмо 70\n…',
  );

  // 图片转 base64
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(L('图片不超过 5MB', 'Image must be < 5MB', 'Размер < 5МБ'));
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setUploading(false);
      toast.success(L('图片已就绪，点击提交分析', 'Image ready, click submit', 'Готово, нажмите отправить'));
    };
    reader.onerror = () => { toast.error('读取图片失败'); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (tab === 'text' && !text.trim()) {
      toast.error(L('请输入成绩数据', 'Please enter score data', 'Введите оценки'));
      return;
    }
    if (tab === 'image' && !imageBase64) {
      toast.error(L('请先上传图片', 'Please upload an image first', 'Загрузите изображение'));
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = { module: 'score', language };
      if (tab === 'text') {
        body.text = text.trim();
      } else {
        body.imageBase64 = imageBase64!;
        body.text = L('请识别成绩单图片并进行分析', 'Analyze the score report image', 'Анализ изображения');
      }
      const { data, error } = await supabase.functions.invoke('ai-correct', { body });
      if (error) { const m = await error?.context?.text?.(); throw new Error(m || error.message); }
      setResult(data);
      toast.success(L('分析完成！', 'Done!', 'Готово!'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '分析失败');
    } finally { setLoading(false); }
  };

  if (result) return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="truncate">{t('nav.score', language)}</span>
        </h1>
        <button onClick={() => { setResult(null); setImagePreview(null); setImageBase64(null); }}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground border border-border/60 px-3 md:px-4 py-2 rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 whitespace-nowrap">
          {L('重新分析', 'New', 'Заново')}
        </button>
      </div>
      <CorrectionResult radarData={result.radar_data} corrections={result.corrections || []}
        exercises={result.exercises || []} overallComment={result.overall_comment}
        suggestions={result.suggestions} trendData={result.trend_data} module="score" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold leading-tight">{t('nav.score', language)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('module.score.desc', language)}</p>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        {/* 标签栏 */}
        <div className="flex border-b border-border/50 bg-muted/20">
          {[
            { key: 'text' as const, label: L('输入数据', 'Enter Data', 'Ввод данных'), Icon: FileText },
            { key: 'image' as const, label: L('上传成绩单', 'Upload Report', 'Загрузить'), Icon: Image },
          ].map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all duration-200 ${
                tab === tb.key
                  ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <tb.Icon className="w-3.5 h-3.5" />
              {tb.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'text' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {L('成绩数据', 'Score Data', 'Данные оценок')}
                </span>
                <div className="flex-1 h-px bg-border/50" />
                <span className={`text-xs tabular-nums font-mono transition-colors ${text.length > 500 ? 'text-amber-500' : 'text-muted-foreground/40'}`}>
                  {text.length}
                </span>
              </div>
              <div className={`relative rounded-xl transition-all duration-200 ${focused ? 'ring-2 ring-amber-500/25' : ''}`}>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={placeholder}
                  className="min-h-[220px] px-4 py-3.5 rounded-xl resize-none border-border/60 bg-muted/15 text-sm leading-relaxed font-mono focus-visible:ring-amber-500/25"
                />
              </div>
            </>
          ) : (
            /* 图片上传区 */
            <label className="block cursor-pointer">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-amber-400/30 group">
                  <img src={imagePreview} alt="成绩单预览" className="w-full max-h-64 object-contain bg-muted/10" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <p className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold transition-opacity">
                      {L('点击重新选择', 'Click to change', 'Нажмите для смены')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-[220px] rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-3 hover:border-amber-400/60 hover:bg-amber-500/3 transition-all duration-300 group">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors duration-200">
                    <Upload className={`w-6 h-6 transition-colors duration-200 ${uploading ? 'text-amber-500 animate-bounce' : 'text-muted-foreground group-hover:text-amber-500'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {uploading ? L('处理中…', 'Processing…', 'Обработка…') : L('上传成绩单图片', 'Upload score report', 'Загрузить отчёт')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {L('支持手写成绩单 · JPG · PNG · 5MB', 'Handwritten OK · JPG · PNG · 5MB', 'JPG · PNG · 5МБ')}
                    </p>
                  </div>
                </div>
              )}
            </label>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="relative w-full h-12 rounded-xl text-sm font-bold text-white overflow-hidden transition-all duration-300 disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0 group"
            style={{
              background: loading ? 'linear-gradient(135deg,hsl(38,60%,44%),hsl(30,60%,48%))' : 'linear-gradient(135deg,hsl(38,88%,44%) 0%,hsl(28,85%,50%) 100%)',
              boxShadow: loading ? 'none' : '0 6px 20px hsl(38,88%,44%,0.30)',
            }}>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors rounded-xl" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{L('AI 分析中…', 'Analyzing…', 'Анализ…')}
                  <span className="flex gap-1 ml-1">{[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-white/70 animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</span>
                </>
              ) : (<><Sparkles className="w-4 h-4" />{t('input.submit', language)}</>)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
