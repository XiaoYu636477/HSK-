import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ── 随机码生成 ─────────────────────────────────────────────────────────────────
function generateCode(prefix = 'YU'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seg = '';
  for (let i = 0; i < 6; i++) seg += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${seg}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // ── 管理员密码验证 ──────────────────────────────────────────────────────────
  const adminSecret = Deno.env.get('ADMIN_SECRET') ?? '';
  const reqSecret   = req.headers.get('x-admin-secret') ?? '';
  if (!adminSecret || reqSecret !== adminSecret) {
    return new Response(JSON.stringify({ error: '无权访问 / Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Supabase service-role 客户端 ────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const url    = new URL(req.url);
  const action = url.searchParams.get('action') ?? (await req.json().catch(() => ({}))).action;

  try {
    // ── list_users ─────────────────────────────────────────────────────────────
    if (action === 'list_users') {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('id, code, status, nickname, daily_limit, calls_today, total_calls, last_call_date, created_at, activated_at, expires_at, note')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, data }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json() : {};

    // ── generate_codes ─────────────────────────────────────────────────────────
    if (action === 'generate_codes') {
      const count       = Math.min(Number(body.count ?? 10), 100);
      const note        = body.note   ?? null;
      const expiresDays = Number(body.expires_days ?? 30);
      const dailyLimit  = Number(body.daily_limit  ?? 20);
      const expiresAt   = new Date(Date.now() + expiresDays * 86400_000).toISOString();

      // 生成唯一码（带重试）
      const codes: string[] = [];
      let attempts = 0;
      while (codes.length < count && attempts < count * 5) {
        attempts++;
        const c = generateCode();
        if (!codes.includes(c)) codes.push(c);
      }

      const rows = codes.map(code => ({
        code, note,
        expires_at:  expiresAt,
        daily_limit: dailyLimit,
        status:      'unused',
      }));

      const { data, error } = await supabase
        .from('invitation_codes')
        .insert(rows)
        .select('code');
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, codes: data?.map((r: { code: string }) => r.code) ?? [] }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── update_user ────────────────────────────────────────────────────────────
    if (action === 'update_user') {
      const { code, daily_limit, expires_at, status, nickname, note } = body;
      if (!code) throw new Error('code is required');

      const updates: Record<string, unknown> = {};
      if (daily_limit  !== undefined) updates.daily_limit = Number(daily_limit);
      if (expires_at   !== undefined) updates.expires_at  = expires_at || null;
      if (status       !== undefined) updates.status      = status;
      if (nickname     !== undefined) updates.nickname    = nickname || null;
      if (note         !== undefined) updates.note        = note || null;

      const { error } = await supabase
        .from('invitation_codes')
        .update(updates)
        .eq('code', code);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── reset_calls ────────────────────────────────────────────────────────────
    if (action === 'reset_calls') {
      const { code } = body;
      if (!code) throw new Error('code is required');
      const { error } = await supabase
        .from('invitation_codes')
        .update({ calls_today: 0, last_call_date: null })
        .eq('code', code);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── delete_code ────────────────────────────────────────────────────────────
    if (action === 'delete_code') {
      const { code } = body;
      if (!code) throw new Error('code is required');
      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('code', code);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
