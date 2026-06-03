import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  KeyRound, Plus, RefreshCw, Copy, Check, Pencil, Trash2,
  ShieldOff, ShieldCheck, Loader2, ChevronDown, ChevronUp,
  Users, Zap, AlertCircle, LogOut, X,
} from 'lucide-react';

// ─── 类型 ──────────────────────────────────────────────────────────────────────
interface CodeRecord {
  id: string;
  code: string;
  status: 'unused' | 'used' | 'disabled';
  nickname: string | null;
  daily_limit: number;
  calls_today: number;
  total_calls: number;
  last_call_date: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  note: string | null;
}

// ─── 工具函数 ───────────────────────────────────────────────────────────────
function generateCode(prefix = 'YU'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seg = '';
  for (let i = 0; i < 6; i++) seg += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${seg}`;
}

// ─── API helper (Replaced by direct supabase calls) ───────────────────────────
async function listUsers() {
  const { data, error } = await supabase
    .from('invitation_codes')
    .select('id, code, status, nickname, daily_limit, calls_today, total_calls, last_call_date, created_at, activated_at, expires_at, note')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

async function generateCodes(body: any) {
  const count = Math.min(Number(body.count ?? 10), 100);
  const note = body.note ?? null;
  const expiresDays = Number(body.expires_days ?? 30);
  const dailyLimit = Number(body.daily_limit ?? 20);
  const expiresAt = new Date(Date.now() + expiresDays * 86400_000).toISOString();

  const codes: string[] = [];
  let attempts = 0;
  while (codes.length < count && attempts < count * 5) {
    attempts++;
    const c = generateCode();
    if (!codes.includes(c)) codes.push(c);
  }

  const rows = codes.map(code => ({
    code, note,
    expires_at: expiresAt,
    daily_limit: dailyLimit,
    status: 'unused',
  }));

  const { data, error } = await supabase.from('invitation_codes').insert(rows).select('code');
  if (error) return { ok: false, error: error.message };
  return { ok: true, codes: data?.map((r: any) => r.code) ?? [] };
}

async function updateUser(body: any) {
  const { code, ...updates } = body;
  const { error } = await supabase.from('invitation_codes').update(updates).eq('code', code);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function resetCalls(code: string) {
  const { error } = await supabase.from('invitation_codes').update({ calls_today: 0, last_call_date: null }).eq('code', code);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function deleteCode(code: string) {
  const { error } = await supabase.from('invitation_codes').delete().eq('code', code);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── 密码验证门禁 (改用AuthContext角色验证) ──────────────────────────────────
function PasswordGate() {
  const { user, profile, loading } = useAuth();
  
  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,hsl(250,40%,8%) 0%,hsl(260,48%,6%) 100%)' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.05] pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle,hsl(260,72%,62%),transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-[360px] p-8 rounded-3xl animate-card-in text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>
          <ShieldOff className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-black text-white mb-2 tracking-wide">无权访问</h1>
        <p className="text-xs mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>当前账号非管理员或未登录</p>

        <button onClick={() => window.location.href = '/login'}
          className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          返回登录
        </button>
      </div>
    </div>
  );
}

// ─── 状态徽章 ─────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CodeRecord['status'] }) {
  const cfg = {
    unused:   { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc', label: '未激活' },
    used:     { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7', label: '已激活' },
    disabled: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)', text: '#fca5a5', label: '已禁用' },
  }[status];
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

// ─── 编辑弹窗 ─────────────────────────────────────────────────────────────────
function EditModal({
  row, onClose, onSaved,
}: { row: CodeRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nickname:    row.nickname    ?? '',
    daily_limit: String(row.daily_limit),
    expires_at:  row.expires_at ? row.expires_at.split('T')[0] : '',
    status:      row.status,
    note:        row.note ?? '',
  });
  const [saving, setSaving] = useState(false);

  const field = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const res = await updateUser({
      code:        row.code,
      nickname:    form.nickname    || null,
      daily_limit: Number(form.daily_limit),
      expires_at:  form.expires_at  || null,
      status:      form.status,
      note:        form.note        || null,
    });
    setSaving(false);
    if (!res.ok) { toast.error(`保存失败: ${res.error}`); return; }
    toast.success('已保存');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-[440px] rounded-2xl overflow-hidden"
        style={{ background: 'hsl(250,40%,8%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">编辑用户</h3>
              <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.code}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {[
            { label: '昵称', key: 'nickname' as const, type: 'text', placeholder: '学生姓名' },
            { label: '每日次数上限', key: 'daily_limit' as const, type: 'number', placeholder: '20' },
            { label: '到期日期', key: 'expires_at' as const, type: 'date', placeholder: '' },
            { label: '备注', key: 'note' as const, type: 'text', placeholder: '内部备注' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => field(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-9 px-3 text-sm rounded-lg outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>
          ))}

          {/* 状态 */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>状态</label>
            <div className="flex gap-2">
              {(['unused', 'used', 'disabled'] as const).map(s => (
                <button key={s} onClick={() => field('status', s)}
                  className="flex-1 h-8 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: form.status === s ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.status === s ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: form.status === s ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  }}>
                  {s === 'unused' ? '未激活' : s === 'used' ? '已激活' : '已禁用'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 h-9 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              取消
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 h-9 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 16px rgba(99,102,241,0.35)' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />保存中</> : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 生成码面板 ───────────────────────────────────────────────────────────────
function GeneratePanel({ onGenerated }: { onGenerated: () => void }) {
  const [count,       setCount]       = useState('10');
  const [expDays,     setExpDays]     = useState('30');
  const [dailyLimit,  setDailyLimit]  = useState('20');
  const [note,        setNote]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [newCodes,    setNewCodes]    = useState<string[]>([]);
  const [copied,      setCopied]      = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await generateCodes({
      count:        Number(count),
      expires_days: Number(expDays),
      daily_limit:  Number(dailyLimit),
      note:         note || undefined,
    });
    setLoading(false);
    if (!res.ok || !res.codes) { toast.error(`生成失败: ${res.error}`); return; }
    setNewCodes(res.codes);
    toast.success(`已生成 ${res.codes.length} 个小Yu码`);
    onGenerated();
  };

  const copyAll = () => {
    navigator.clipboard.writeText(newCodes.join('\n'));
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };
  const focusStyle = { borderColor: 'rgba(139,92,246,0.5)' };
  const blurStyle  = { borderColor: 'rgba(255,255,255,0.1)' };

  return (
    <div className="rounded-2xl p-5 space-y-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Plus className="w-4 h-4" style={{ color: '#8b5cf6' }} />批量生成小Yu码
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '生成数量',  val: count,      set: setCount,      type: 'number', min: '1', max: '100' },
          { label: '有效天数',  val: expDays,    set: setExpDays,    type: 'number', min: '1' },
          { label: '每日次数',  val: dailyLimit, set: setDailyLimit, type: 'number', min: '1' },
          { label: '备注批次',  val: note,       set: setNote,       type: 'text',   placeholder: '如：春季班' },
        ].map(f => (
          <div key={f.label} className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.label}</label>
            <input
              type={f.type}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              min={'min' in f ? f.min : undefined}
              max={'max' in f ? f.max : undefined}
              placeholder={'placeholder' in f ? f.placeholder : f.val}
              className="w-full h-9 px-3 text-sm rounded-lg outline-none transition-all"
              style={inputStyle}
              onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={e  => Object.assign(e.currentTarget.style, blurStyle)}
            />
          </div>
        ))}
      </div>

      <button onClick={generate} disabled={loading}
        className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />生成中…</> : <><Zap className="w-4 h-4" />生成 {count} 个小Yu码</>}
      </button>

      {newCodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              新生成 {newCodes.length} 个码，复制后发给学生：
            </span>
            <button onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
              {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制全部</>}
            </button>
          </div>
          <div className="rounded-xl p-3 font-mono text-sm leading-relaxed overflow-y-auto max-h-40"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: '#a5b4fc' }}>
            {newCodes.map(c => <div key={c}>{c}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 用户表格 ─────────────────────────────────────────────────────────────────
function UsersTable({
  rows, onRefresh,
}: { rows: CodeRecord[]; onRefresh: () => void }) {
  const [editing,  setEditing]  = useState<CodeRecord | null>(null);
  const [sortKey,  setSortKey]  = useState<keyof CodeRecord>('created_at');
  const [sortAsc,  setSortAsc]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleSort = (k: keyof CodeRecord) => {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(false); }
  };

  const filtered = rows
    .filter(r =>
      !search ||
      r.code.includes(search.toUpperCase()) ||
      (r.nickname ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.note ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  const handleDelete = async (code: string) => {
    if (!confirm(`确认删除码 ${code}？此操作不可撤销。`)) return;
    setDeleting(code);
    const res = await deleteCode(code);
    setDeleting(null);
    if (!res.ok) { toast.error(`删除失败: ${res.error}`); return; }
    toast.success('已删除');
    onRefresh();
  };

  const handleResetCalls = async (code: string) => {
    const res = await resetCalls(code);
    if (!res.ok) { toast.error(`重置失败: ${res.error}`); return; }
    toast.success('今日调用次数已重置');
    onRefresh();
  };

  const thStyle = 'px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors hover:text-white';
  const tdStyle = 'px-3 py-2.5 text-sm whitespace-nowrap';

  const SortIcon = ({ k }: { k: keyof CodeRecord }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
      : null;

  const statsRow = {
    total:    rows.length,
    unused:   rows.filter(r => r.status === 'unused').length,
    used:     rows.filter(r => r.status === 'used').length,
    disabled: rows.filter(r => r.status === 'disabled').length,
  };

  return (
    <>
      {editing && (
        <EditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}

      {/* 统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: '全部码',  val: statsRow.total,    color: '#a5b4fc' },
          { label: '已激活',  val: statsRow.used,     color: '#6ee7b7' },
          { label: '未激活',  val: statsRow.unused,   color: 'rgba(255,255,255,0.45)' },
          { label: '已禁用',  val: statsRow.disabled, color: '#fca5a5' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-2xl font-black" style={{ color: s.color }}>{s.val}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索：码、昵称、备注…"
          className="w-full h-9 pl-4 pr-4 text-sm rounded-xl outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)'; }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />
      </div>

      {/* 表格 */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <tr>
                {[
                  { label: '小Yu码',    k: 'code'        },
                  { label: '昵称',      k: 'nickname'    },
                  { label: '状态',      k: 'status'      },
                  { label: '今日/总计', k: 'calls_today' },
                  { label: '日上限',   k: 'daily_limit' },
                  { label: '到期日期', k: 'expires_at'  },
                  { label: '激活时间', k: 'activated_at'},
                ].map(col => (
                  <th key={col.k} className={thStyle} style={{ color: 'rgba(255,255,255,0.35)' }}
                    onClick={() => toggleSort(col.k as keyof CodeRecord)}>
                    {col.label}<SortIcon k={col.k as keyof CodeRecord} />
                  </th>
                ))}
                <th className={`${thStyle} text-right`} style={{ color: 'rgba(255,255,255,0.35)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    暂无数据
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => {
                const isOverLimit = row.calls_today >= row.daily_limit && row.daily_limit > 0;
                return (
                  <tr key={row.id}
                    style={{
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                    <td className={tdStyle}>
                      <span className="font-mono font-bold text-xs" style={{ color: '#c4b5fd' }}>{row.code}</span>
                    </td>
                    <td className={tdStyle} style={{ color: row.nickname ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                      {row.nickname ?? '—'}
                    </td>
                    <td className={tdStyle}><StatusBadge status={row.status} /></td>
                    <td className={tdStyle}>
                      <span style={{ color: isOverLimit ? '#fca5a5' : 'rgba(255,255,255,0.7)' }}>
                        {row.calls_today}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.25)' }}> / {row.total_calls}</span>
                    </td>
                    <td className={tdStyle} style={{ color: 'rgba(255,255,255,0.6)' }}>{row.daily_limit}</td>
                    <td className={tdStyle} style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {row.expires_at ? new Date(row.expires_at).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className={tdStyle} style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {row.activated_at ? new Date(row.activated_at).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className={`${tdStyle} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        {/* 重置今日调用 */}
                        {row.status === 'used' && (
                          <button onClick={() => handleResetCalls(row.code)}
                            title="重置今日调用次数"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {/* 禁用/启用 */}
                        <button
                          onClick={() => updateUser({
                            code: row.code,
                            status: row.status === 'disabled' ? 'unused' : 'disabled',
                          }).then(r => { if (r.ok) { toast.success(row.status === 'disabled' ? '已启用' : '已禁用'); onRefresh(); } else toast.error(r.error); })}
                          title={row.status === 'disabled' ? '启用' : '禁用'}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                          style={{
                            background: row.status === 'disabled' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            border: `1px solid ${row.status === 'disabled' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.22)'}`,
                            color: row.status === 'disabled' ? '#6ee7b7' : '#fca5a5',
                          }}>
                          {row.status === 'disabled' ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                        </button>
                        {/* 编辑 */}
                        <button onClick={() => setEditing(row)}
                          title="编辑"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', color: '#a5b4fc' }}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        {/* 删除 */}
                        <button onClick={() => handleDelete(row.code)} disabled={deleting === row.code}
                          title="删除"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                          {deleting === row.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
        共 {filtered.length} / {rows.length} 条
      </p>
    </>
  );
}



// ─── Tab ──────────────────────────────────────────────────────────────────────
type Tab = 'users' | 'generate';

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [rows,    setRows]    = useState<CodeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState<Tab>('users');

  const loadAllUsers = useCallback(async () => {
    setLoading(true);
    const res = await listUsers();
    setLoading(false);
    if (!res.ok) { toast.error(`加载失败: ${res.error}`); return; }
    setRows((res.data as CodeRecord[]) ?? []);
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAllUsers();
    }
  }, [profile?.role, loadAllUsers]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (authLoading || profile?.role !== 'admin') {
    return <PasswordGate />;
  }

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(160deg,hsl(250,40%,5%) 0%,hsl(260,48%,4%) 100%)' }}>
      {/* 背景网格 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.018]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 20px rgba(99,102,241,0.35)' }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-black text-white truncate">小Yu码 管理后台</h1>
              <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>HSK 智能学习平台</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={loadAllUsers} disabled={loading}
              className="flex items-center gap-1.5 px-2.5 md:px-3 h-8 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">刷新</span>
            </button>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-2.5 md:px-3 h-8 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">退出</span>
            </button>
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-2 p-1 rounded-xl w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['users', Users, '用户管理'], ['generate', KeyRound, '生成码']] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-4 h-8 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t ? 'rgba(139,92,246,0.2)' : 'transparent',
                border:     tab === t ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
                color:      tab === t ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
              }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">加载中…</span>
          </div>
        ) : tab === 'users' ? (
          <UsersTable rows={rows} onRefresh={loadAllUsers} />
        ) : (
          <GeneratePanel onGenerated={loadAllUsers} />
        )}

        {/* 说明 */}
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>操作说明</p>
              <ul className="text-[11px] space-y-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <li>• 生成码后直接复制发给学生，无需登录账号</li>
                <li>• 每个码激活后绑定设备（localStorage），换浏览器需重新输入</li>
                <li>• 禁用后学生立即无法使用，重新启用即可恢复</li>
                <li>• 今日调用次数每天自动重置，也可手动重置</li>
                <li>• 修改每日上限后立即生效（下次调用时检查）</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
