import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Globe, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Language } from '@/types/types';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const msg = (zh: string, en: string, ru: string) =>
    language === 'zh' ? zh : language === 'ru' ? ru : en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error(msg('请填写用户名和密码', 'Please enter username and password', 'Введите имя и пароль'));
      return;
    }
    if (isRegister) {
      if (password !== confirmPassword) {
        toast.error(msg('两次密码不一致', 'Passwords do not match', 'Пароли не совпадают'));
        return;
      }
      if (!agreed) {
        toast.error(msg('请同意用户协议', 'Please agree to the terms', 'Примите соглашение'));
        return;
      }
      setLoading(true);
      const { error } = await signUp(username, password);
      setLoading(false);
      if (error) { toast.error(error.message); }
      else { toast.success(msg('注册成功！', 'Registered!', 'Регистрация успешна!')); navigate('/'); }
    } else {
      setLoading(true);
      const { error } = await signIn(username, password);
      setLoading(false);
      if (error) { toast.error(error.message); }
      else { navigate('/'); }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,hsl(224,48%,5%) 0%,hsl(226,62%,11%) 50%,hsl(260,52%,9%) 100%)' }}
    >
      {/* 背景网格 */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.7) 1px,transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* 光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.06] pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle,hsl(226,72%,62%),transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-[0.05] pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle,hsl(280,62%,62%),transparent 70%)', animationDelay: '1.5s' }} />

      {/* 语言切换 */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 bg-white/8 hover:bg-white/14 text-white/70 text-sm px-3.5 py-2 rounded-xl border border-white/12 transition-all duration-200 backdrop-blur-sm">
              <Globe className="w-3.5 h-3.5" />
              {languages.find(l => l.code === language)?.flag}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl">
            {languages.map(l => (
              <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)}
                className={`gap-2 rounded-lg ${language === l.code ? 'bg-accent font-semibold' : ''}`}>
                <span>{l.flag}</span><span>{l.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 卡片 */}
      <div
        className="relative w-full max-w-[420px] rounded-2xl overflow-hidden animate-card-in"
        style={{
          background: 'hsl(224,42%,8%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* 顶部彩条 */}
        <div className="h-[3px] w-full"
          style={{ background: 'linear-gradient(90deg,hsl(226,72%,56%),hsl(256,68%,60%),hsl(290,62%,56%),hsl(320,60%,56%))' }} />

        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg,hsl(226,72%,52%),hsl(260,68%,60%))',
                boxShadow: '0 8px 24px hsl(226,72%,42%,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-white mb-1">
              {t(isRegister ? 'nav.register' : 'login.title', language)}
            </h1>
            <p className="text-sm text-white/35">HSK AI · {t('app.subtitle', language)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名/邮箱 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/45 uppercase tracking-[0.12em]">
                {msg('用户名/邮箱', 'Username / Email', 'Имя пользователя / Email')}
              </label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={msg('输入用户名或邮箱', 'Enter username or email', 'Введите имя или email')}
                className="h-11 px-4 bg-white/[0.055] border-white/10 text-white placeholder:text-white/22 focus:bg-white/[0.09] focus:border-white/22 rounded-xl transition-all duration-200"
              />
            </div>

            {/* 密码 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/45 uppercase tracking-[0.12em]">
                {t('login.password', language)}
              </label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.password', language)}
                  className="h-11 px-4 pr-11 bg-white/[0.055] border-white/10 text-white placeholder:text-white/22 focus:bg-white/[0.09] focus:border-white/22 rounded-xl transition-all duration-200"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/28 hover:text-white/60 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 确认密码 & 协议 */}
            {isRegister && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/45 uppercase tracking-[0.12em]">
                    {t('login.confirm_password', language)}
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={t('login.confirm_password', language)}
                    className="h-11 px-4 bg-white/[0.055] border-white/10 text-white placeholder:text-white/22 focus:bg-white/[0.09] focus:border-white/22 rounded-xl transition-all duration-200"
                  />
                </div>
                <div className="flex items-start gap-3 pt-1">
                  <Checkbox id="agree" checked={agreed} onCheckedChange={v => setAgreed(v === true)}
                    className="mt-0.5 border-white/25 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label htmlFor="agree" className="text-xs text-white/38 leading-relaxed cursor-pointer hover:text-white/55 transition-colors">
                    {t('login.agreement', language)}
                  </label>
                </div>
              </>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-12 rounded-xl text-sm font-bold text-white mt-2 flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg,hsl(226,72%,50%),hsl(260,68%,58%))',
                boxShadow: '0 6px 22px hsl(226,72%,42%,0.45)',
              }}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors rounded-xl" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{msg('处理中…', 'Processing…', 'Обработка…')}</>
                ) : (
                  t(isRegister ? 'login.register_btn' : 'login.submit', language)
                )}
              </span>
            </button>
          </form>

          {/* 切换 */}
          <div className="mt-6 text-center">
            <span className="text-sm text-white/30">
              {t(isRegister ? 'login.has_account' : 'login.no_account', language)}
            </span>
            <button type="button" onClick={() => setIsRegister(!isRegister)}
              className="ml-1.5 text-sm font-semibold transition-colors"
              style={{ color: 'hsl(226,72%,68%)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'hsl(226,72%,78%)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'hsl(226,72%,68%)')}
            >
              {t(isRegister ? 'login.submit' : 'login.register_btn', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
