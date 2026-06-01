import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { MessageSquare, Send, Clock, CheckCircle2, Loader2 } from 'lucide-react';

const LANG = {
  zh: {
    title: '意见反馈',
    subtitle: '你的每一条建议，都是我们进步的动力。',
    placeholder: '问题或建议',
    contact: '联系方式 (选填)',
    submit: '提交反馈',
    submitting: '提交中…',
    myFeedback: '我的反馈记录',
    noFeedback: '暂无反馈记录',
    submitted: '感谢你的反馈！',
    unread: '未读',
    read: '已读',
  },
  en: {
    title: 'Feedback',
    subtitle: 'Every suggestion helps us improve.',
    placeholder: 'Question or suggestion',
    contact: 'Contact (optional)',
    submit: 'Submit Feedback',
    submitting: 'Submitting…',
    myFeedback: 'My Feedback',
    noFeedback: 'No feedback yet',
    submitted: 'Thank you for your feedback!',
    unread: 'Unread',
    read: 'Read',
  },
  ru: {
    title: 'Обратная связь',
    subtitle: 'Каждое предложение помогает нам стать лучше.',
    placeholder: 'Вопрос или предложение',
    contact: 'Контакты (необязательно)',
    submit: 'Отправить',
    submitting: 'Отправка…',
    myFeedback: 'Мои отзывы',
    noFeedback: 'Нет отзывов',
    submitted: 'Спасибо за ваш отзыв!',
    unread: 'Новое',
    read: 'Прочитано',
  },
};

export default function FeedbackPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = LANG[language as keyof typeof LANG] || LANG.zh;

  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingHistory(true);
      supabase
        .from('feedbacks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setFeedbacks(data || []);
          setLoadingHistory(false);
        });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t.placeholder);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('feedbacks').insert({
      user_id: user?.id,
      content: content.trim(),
      contact: contact.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.submitted);
      setContent('');
      setContact('');
      // Refresh list
      if (user) {
        const { data } = await supabase
          .from('feedbacks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setFeedbacks(data || []);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* 提交表单 */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t.placeholder}
          rows={4}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all text-slate-800 placeholder-slate-400"
        />
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder={t.contact}
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all text-slate-800 placeholder-slate-400"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="h-10 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 shadow-lg shadow-amber-500/20"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t.submitting}</>
            ) : (
              <><Send className="w-3.5 h-3.5" />{t.submit}</>
            )}
          </button>
        </div>
      </div>

      {/* 历史记录 */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          {t.myFeedback}
        </h2>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{t.noFeedback}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feedbacks.map(f => (
              <div key={f.id} className="rounded-xl bg-white border border-slate-100 p-4 space-y-2">
                <p className="text-sm text-slate-700 leading-relaxed">{f.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {new Date(f.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${f.is_read ? 'text-emerald-500' : 'text-amber-500'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {f.is_read ? t.read : t.unread}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
