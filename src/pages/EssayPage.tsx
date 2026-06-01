import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { t } from '@/lib/i18n';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, PenLine, Sparkles, Image, FileText, Loader2 } from 'lucide-react';
import CorrectionResult from '@/components/common/CorrectionResult';
import AiLoading from '@/components/common/AiLoading';
import { useAiCorrect } from '@/hooks/useAiCorrect';

export default function EssayPage() {
  const { language } = useLanguage();
  const { isActivated, openModal, trackApiCall } = useYuCode();
  const [text, setText]                   = useState('');
  const [uploading, setUploading]         = useState(false);
  const [tab, setTab]                     = useState<'text' | 'image'>('text');
  const [charFocus, setCharFocus]         = useState(false);
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [imageBase64, setImageBase64]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { loading, progress, result, correct, reset } = useAiCorrect({ module: 'essay', language });

  const L = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(L('图片不超过5MB', 'Image must be < 5MB', 'Размер < 5МБ')); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setUploading(false);
      toast.success(L('图片已就绪，点击提交批改', 'Image ready, click submit', 'Готово'));
    };
    reader.onerror = () => { toast.error('读取图片失败'); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!isActivated) { openModal(); return; }
    if (tab === 'text' && !text.trim()) {
      toast.error(L('请输入作文内容', 'Please enter your essay', 'Введите текст')); return;
    }
    if (tab === 'image' && !imageBase64) {
      toast.error(L('请先上传作文图片', 'Please upload an image', 'Загрузите изображение')); return;
    }
    const callCheck = await trackApiCall();
    if (!callCheck.ok) {
      if (callCheck.reason === 'limit_reached') toast.error(L('今日批改次数已用完，明天再来', 'Daily limit reached, try tomorrow', 'Дневной лимит исчерпан'));
      else if (callCheck.reason === 'expired') toast.error(L('小Yu码已到期，请联系老师续期', 'Yu Code expired, contact teacher', 'Код истёк'));
      else if (callCheck.reason === 'disabled') toast.error(L('小Yu码已被禁用，请联系老师', 'Yu Code disabled', 'Код заблокирован'));
      return;
    }
    if (tab === 'text') {
      await correct({ text: text.trim() });
    } else {
      await correct({ imageBase64: imageBase64!, text: L('请识别图片中的作文并进行批改', 'Read and correct the essay in the image', 'Исправьте сочинение') });
    }
  };

  /* ── 加载中 ── */
  if (loading && progress) return (
    <div className="max-w-3xl mx-auto">
      <div className="card-premium">
        <AiLoading progress={progress} moduleColor="from-blue-500 to-blue-600" />
      </div>
    </div>
  );

  /* ── 结果 ── */
  if (result) return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shrink-0">
            <PenLine className="w-4 h-4 text-white" />
          </div>
          <span className="truncate">{t('nav.essay', language)}</span>
        </h1>
        <button onClick={() => { reset(); setImagePreview(null); setImageBase64(null); setText(''); }}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground border border-border/60 px-3 md:px-4 py-2 rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 whitespace-nowrap">
          {L('重新批改', 'New', 'Заново')}
        </button>
      </div>
      <CorrectionResult
        radarData={result.radar_data}
        corrections={result.corrections || []}
        exercises={result.exercises || []}
        overallComment={result.overall_comment}
        module="essay"
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
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
          <PenLine className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold leading-tight">{t('nav.essay', language)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('module.essay.desc', language)}</p>
        </div>
      </div>

      {/* 输入卡片 */}
      <div className="card-premium overflow-hidden">
        <div className="flex border-b border-border/50 bg-muted/20">
          {[
            { key: 'text' as const, label: L('输入文字', 'Type Text', 'Текст'), Icon: FileText },
            { key: 'image' as const, label: L('上传图片', 'Upload Image', 'Фото'), Icon: Image },
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
            <div className={`relative rounded-xl transition-all duration-200 ${charFocus ? 'ring-2 ring-primary/30' : ''}`}>
              <Textarea value={text} onChange={e => setText(e.target.value)}
                onFocus={() => setCharFocus(true)} onBlur={() => setCharFocus(false)}
                placeholder={t('input.text_placeholder', language)}
                className="min-h-[220px] px-4 py-3.5 rounded-xl resize-none border-border/60 bg-muted/15 text-sm leading-relaxed focus-visible:ring-primary/30 transition-colors" />
              <div className="absolute bottom-3 right-3">
                <span className={`text-xs tabular-nums transition-colors ${text.length > 800 ? 'text-amber-500' : 'text-muted-foreground/50'}`}>{text.length}</span>
              </div>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-blue-400/30 group">
                  <img src={imagePreview} alt="作文预览" className="w-full max-h-64 object-contain bg-muted/10" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <p className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold transition-opacity">
                      {L('点击重新选择', 'Click to change', 'Нажмите для смены')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-[220px] rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-3 hover:border-blue-400/60 hover:bg-blue-500/3 transition-all duration-300 group">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 group-hover:bg-blue-500/10 flex items-center justify-center transition-colors duration-200">
                    <Upload className={`w-6 h-6 transition-colors duration-200 ${uploading ? 'text-blue-500 animate-bounce' : 'text-muted-foreground group-hover:text-blue-500'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {uploading ? L('处理中…', 'Processing…', 'Обработка…') : L('上传作文图片', 'Upload essay image', 'Загрузить фото')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {L('支持手写作文 · JPG · PNG · WEBP · 5MB', 'Handwriting OK · JPG · PNG · 5MB', 'JPG · PNG · 5МБ')}
                    </p>
                  </div>
                </div>
              )}
            </label>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="relative w-full h-12 rounded-xl text-sm font-bold text-white overflow-hidden transition-all duration-300 disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0 group"
            style={{
              background: 'linear-gradient(135deg,hsl(226,72%,44%) 0%,hsl(256,70%,56%) 100%)',
              boxShadow: '0 6px 20px hsl(226,72%,44%,0.35)',
            }}>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors duration-200 rounded-xl" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{L('准备中…', 'Starting…', 'Старт…')}</> : <><Sparkles className="w-4 h-4" />{t('input.submit', language)}</>}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
