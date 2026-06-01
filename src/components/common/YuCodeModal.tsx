import { useState, useRef, useEffect } from 'react';
import { useYuCode } from '@/contexts/YuCodeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, KeyRound, X, Sparkles, ShieldCheck, User } from 'lucide-react';

const FEATURES = [
  { icon: '✍️', zh: '作文AI批改', en: 'AI Essay Review', ru: 'Проверка эссе' },
  { icon: '🎯', zh: '考题解析',   en: 'Exam Analysis',   ru: 'Анализ экзамена' },
  { icon: '🎙️', zh: '口语分析',  en: 'Oral Analysis',   ru: 'Анализ речи' },
  { icon: '🧠', zh: '学习舱数据', en: 'Cockpit Data',    ru: 'Данные кабины' },
];

export default function YuCodeModal() {
  const { modalOpen, closeModal, activate } = useYuCode();
  const { language } = useLanguage();
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (modalOpen) { setCode(''); setError(''); setTimeout(() => codeRef.current?.focus(), 80); } }, [modalOpen]);

  const L = (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

  const handleActivate = async () => {
    if (!code.trim()) { setError(L('请输入小Yu码', 'Please enter your Yu Code', 'Введите код Yu')); return; }
    setLoading(true); setError('');
    const result = await activate(code);
    setLoading(false);
    if (!result.ok) setError(result.error ?? L('激活失败，请检查码是否正确', 'Activation failed', 'Ошибка активации'));
  };

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)' }}>
      <div className="relative w-full max-w-[400px] rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg,hsl(250,40%,9%) 0%,hsl(260,48%,6%) 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7,#ec4899)' }} />

        <button onClick={closeModal}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}>
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="p-6 space-y-5">
          {/* Hero */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 10px 30px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-black text-white">
              {L('输入小Yu码·解锁学习舱', 'Enter Yu Code · Unlock Cockpit', 'Введите код Yu')}
            </h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {L('一次激活，全功能开放', 'Activate once, unlock everything', 'Активируйте один раз')}
            </p>
          </div>

          {/* 功能预览 */}
          <div className="grid grid-cols-2 gap-1.5">
            {FEATURES.map(f => (
              <div key={f.zh} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm">{f.icon}</span>
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{L(f.zh, f.en, f.ru)}</span>
              </div>
            ))}
          </div>

          {/* 输入区 */}
          <div className="space-y-2.5">
            {/* 激活码 */}
            <input
              ref={codeRef}
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '')); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
              maxLength={20}
              placeholder="YU-XXXXXX"
              spellCheck={false}
              autoComplete="off"
              className="w-full h-12 px-4 text-center text-lg font-mono font-bold tracking-[0.2em] rounded-xl outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            />

            {error && <p className="text-center text-xs font-medium" style={{ color: '#f87171' }}>{error}</p>}

            <button onClick={handleActivate} disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />{L('验证中…', 'Verifying…', 'Проверка…')}</>
                : <><Sparkles className="w-4 h-4" />{L('激活学习舱', 'Activate Cockpit', 'Активировать')}</>}
            </button>
          </div>

          <div className="flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.18)' }} />
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {L('没有小Yu码？联系老师获取', "No code? Contact your teacher", 'Нет кода? Обратитесь к учителю')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
