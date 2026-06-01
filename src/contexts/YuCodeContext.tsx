import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from './AuthContext';

// ─── 类型 ──────────────────────────────────────────────────────────────────────
export interface YuCodeState {
  code: string;
  nickname: string | null;
  status: string;
  dailyLimit: number;
  callsToday: number;
  expiresAt: string | null;
  activatedAt: string;
}

interface YuCodeContextType {
  yuCode: YuCodeState | null;
  isActivated: boolean;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  activate: (code: string) => Promise<{ ok: boolean; error?: string }>;
  deactivate: () => void; // Usually mapping to sign out now, but let's keep it
  trackApiCall: () => Promise<{ ok: boolean; reason?: string }>;
  loading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const YuCodeContext = createContext<YuCodeContextType | undefined>(undefined);

export function YuCodeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [yuCode, setYuCode] = useState<YuCodeState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isActivated = yuCode !== null;
  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const fetchYuCode = useCallback(async () => {
    if (!user) {
      setYuCode(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('bound_user_id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      setYuCode({
        code: data.code,
        nickname: data.nickname,
        status: data.status,
        dailyLimit: data.daily_limit,
        callsToday: data.calls_today,
        expiresAt: data.expires_at,
        activatedAt: data.activated_at,
      });
    } else {
      setYuCode(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchYuCode();
  }, [fetchYuCode]);

  const activate = useCallback(async (rawCode: string): Promise<{ ok: boolean; error?: string }> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { ok: false, error: '请输入小Yu码 / Введите код Yu' };

    const { data, error } = await supabase.rpc('bind_yucode', {
      p_code: code,
    });

    if (error) return { ok: false, error: error.message };

    const result = data as { ok: boolean; error?: string };
    if (!result.ok) return { ok: false, error: result.error };

    // 绑定成功后重新拉取状态
    await fetchYuCode();
    setModalOpen(false);
    return { ok: true };
  }, [fetchYuCode]);

  const deactivate = useCallback(() => {
    setYuCode(null);
  }, []);

  // 每次 AI 调用后计数
  const trackApiCall = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!yuCode) return { ok: false, reason: 'no_code' };
    const { data, error } = await supabase.rpc('increment_api_call');
    if (error) return { ok: false, reason: error.message };
    const res = data as { ok: boolean; reason?: string };
    return res;
  }, [yuCode]);

  return (
    <YuCodeContext.Provider value={{
      yuCode, isActivated, modalOpen,
      openModal, closeModal,
      activate, deactivate,
      trackApiCall,
      loading
    }}>
      {children}
    </YuCodeContext.Provider>
  );
}

export function useYuCode() {
  const ctx = useContext(YuCodeContext);
  if (!ctx) throw new Error('useYuCode must be used within YuCodeProvider');
  return ctx;
}
