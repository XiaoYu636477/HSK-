import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/db/supabase';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Mic, Sparkles, Waves, FileText } from 'lucide-react';
import CorrectionResult from '@/components/common/CorrectionResult';
import AiLoading from '@/components/common/AiLoading';
import HskLevelSelector from '@/components/common/HskLevelSelector';
import { useAiCorrect } from '@/hooks/useAiCorrect';

export default function OralPage() {
  const { language } = useLanguage();
  const { isActivated, openModal, trackApiCall } = useYuCode();
  const [text, setText]       = useState('');
  const [uploading, setUploading] = useState(false);
  const [tab, setTab]         = useState<'text' | 'audio'>('text');
  const [focused, setFocused] = useState(false);
  const [hskLevel, setHskLevel] = useState('HSKK中级');

  const { loading, progress, result, correct, reset } = useAiCorrect({ module: 'oral', language });

  const L = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  const handleSubmit = async () => {
    if (loading) { toast.info(L('上一次批改正在进行中，请稍候查看结果', 'Previous correction is still processing, please wait', 'Идёт обработка, дождитесь результата')); return; }
    if (!isActivated) { openModal(); return; }
    if (!text.trim()) { toast.error(L('请输入口语文字稿', 'Please enter transcript', 'Введите текст')); return; }
    const callCheck = await trackApiCall();
    if (!callCheck.ok) {
      if (callCheck.reason === 'limit_reached') toast.error(L('今日分析次数已用完，明天再来', 'Daily limit reached', 'Дневной лимит исчерпан'));
      else if (callCheck.reason === 'expired')  toast.error(L('小Yu码已到期，请联系老师续期', 'Yu Code expired', 'Код истёк'));
      else if (callCheck.reason === 'disabled') toast.error(L('小Yu码已被禁用，请联系老师', 'Yu Code disabled', 'Код заблокирован'));
      return;
    }
    await correct({ text: text.trim(), hskLevel });
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fn = `oral_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('uploads').upload(fn, file, { contentType: file.type });
      if (error) throw error;
      toast.success(L('录音上传成功', 'Audio uploaded', 'Загружено'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally { setUploading(false); }
  };

  /* ── 加载中 ── */
  if (loading && progress) return (
    <div className="max-w-3xl mx-auto">
      <div className="card-premium">
        <AiLoading progress={progress} moduleColor="from-violet-500 to-violet-600" />
      </div>
    </div>
  );

  /* ── 结果 ── */
  if (result) return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="truncate">{t('nav.oral', language)}</span>
        </h1>
        <button onClick={() => { reset(); setText(''); }}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground border border-border/60 px-3 md:px-4 py-2 rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 whitespace-nowrap">
          {L('重新分析', 'New', 'Заново')}
        </button>
      </div>
      <CorrectionResult
        radarData={result.radar_data}
        corrections={result.corrections || []}
        exercises={result.exercises || []}
        overallComment={result.overall_comment}
        module="oral"
        scoreInfo={result.score_info}
        strengths={result.strengths}
        improvementTips={result.improvement_tips}
        modelAnswer={result.model_answer}
      />
    </div>
  );

  /* ── 输入 ── */
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold leading-tight">{t('nav.oral', language)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('module.oral.desc', language)}</p>
        </div>
      </div>

      <HskLevelSelector
        options={[
          { value: 'HSKK中级', label: L('HSKK中级', 'HSKK Mid', 'HSKK Средний') },
          { value: 'HSKK高级', label: L('HSKK高级', 'HSKK High', 'HSKK Высокий') },
        ]}
        value={hskLevel}
        onChange={setHskLevel}
      />

      <div className="card-premium overflow-hidden">
        <div className="flex border-b border-border/50 bg-muted/20">
          {[
            { key: 'text' as const, label: L('文字稿', 'Transcript', 'Текст'), Icon: FileText },
            { key: 'audio' as const, label: L('录音文件', 'Audio File', 'Аудио'), Icon: Waves },
          ].map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all duration-200 ${
                tab === tb.key ? 'text-primary border-b-2 border-primary bg-card' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <tb.Icon className="w-3.5 h-3.5" />{tb.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'text' ? (
            <div className={`relative rounded-xl transition-all duration-200 ${focused ? 'ring-2 ring-violet-500/25' : ''}`}>
              <Textarea value={text} onChange={e => setText(e.target.value)}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                placeholder={t('input.text_placeholder', language)}
                className="min-h-[200px] px-4 py-3.5 rounded-xl resize-none border-border/60 bg-muted/15 text-sm leading-relaxed focus-visible:ring-violet-500/25" />
              <div className="absolute bottom-3 right-3">
                <span className="text-xs tabular-nums text-muted-foreground/40">{text.length}</span>
              </div>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              <div className="h-[200px] rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-3 hover:border-violet-400/60 hover:bg-violet-500/3 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 group-hover:bg-violet-500/10 flex items-center justify-center transition-colors">
                  <Waves className={`w-5 h-5 transition-colors ${uploading ? 'text-violet-500 animate-pulse' : 'text-muted-foreground group-hover:text-violet-500'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {uploading ? L('上传中…', 'Uploading…', 'Загрузка…') : L('上传口语录音', 'Upload audio', 'Загрузить запись')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">MP3 · WAV · M4A</p>
                </div>
              </div>
            </label>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="relative w-full h-12 rounded-xl text-sm font-bold text-white overflow-hidden transition-all duration-300 disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0 group"
            style={{
              background: 'linear-gradient(135deg,hsl(280,62%,50%) 0%,hsl(300,58%,54%) 100%)',
              boxShadow: '0 6px 20px hsl(280,62%,50%,0.30)',
            }}>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors rounded-xl" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{L('准备中…', 'Starting…', 'Старт…')}</> : <><Sparkles className="w-4 h-4" />{t('input.submit', language)}</>}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
