// premium-sync: keeps profiles.is_pro / pro_expires_at in line with RevenueCat.
//
// Two callers, one endpoint (deployed with verify_jwt = false; both paths authenticate here):
//  - RevenueCat webhook: `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>` (set in the RevenueCat
//    dashboard). Every Supabase user id found in the event is re-synced.
//  - The app, after sign-in / purchase / restore: `Authorization: Bearer <user JWT>`. Re-syncs that user.
//
// In both cases the truth is read from the RevenueCat REST API rather than trusted from the
// request body, so a forged webhook payload can't grant premium.
//
// Secrets: REVENUECAT_SECRET_API_KEY, REVENUECAT_WEBHOOK_AUTH, optional PREMIUM_ENTITLEMENT_ID.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are provided by the platform.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ENTITLEMENT_ID = Deno.env.get('PREMIUM_ENTITLEMENT_ID') ?? 'animedex_premium_monthly';
const RC_SECRET = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? '';
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Constant-time comparison for the webhook secret
const safeEqual = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

type Entitlement = { expires_date: string | null; grace_period_expires_date?: string | null };

/** Reads the user's entitlement from RevenueCat and writes it to their profile. */
const syncUser = async (userId: string) => {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${RC_SECRET}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const body = await res.json();
  const ent: Entitlement | undefined = body?.subscriber?.entitlements?.[ENTITLEMENT_ID];

  let isPro = false;
  let expiresAt: string | null = null;
  if (ent) {
    // Billing grace period keeps access; lifetime entitlements have no expiry
    const end = ent.grace_period_expires_date ?? ent.expires_date;
    isPro = end === null || new Date(end).getTime() > Date.now();
    expiresAt = end;
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_pro: isPro, pro_expires_at: isPro ? expiresAt : null })
    .eq('id', userId);
  if (error) throw error;
  return { isPro, expiresAt };
};

/** Supabase user ids mentioned by a RevenueCat webhook event (current id, aliases, transfers). */
const userIdsFromEvent = (event: Record<string, unknown>): string[] => {
  const ids = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === 'string' && UUID_RE.test(v)) ids.add(v.toLowerCase());
  };
  add(event.app_user_id);
  add(event.original_app_user_id);
  for (const key of ['aliases', 'transferred_from', 'transferred_to']) {
    const list = event[key];
    if (Array.isArray(list)) list.forEach(add);
  }
  return [...ids];
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!RC_SECRET) return json({ error: 'not configured' }, 500);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  try {
    // 1. RevenueCat webhook
    if (WEBHOOK_AUTH && safeEqual(token, WEBHOOK_AUTH)) {
      const payload = await req.json().catch(() => null);
      const event = payload?.event;
      if (!event) return json({ error: 'bad payload' }, 400);
      if (event.type === 'TEST') return json({ ok: true, test: true });

      const ids = userIdsFromEvent(event);
      const results = await Promise.allSettled(ids.map(syncUser));
      const failed = results.filter(r => r.status === 'rejected').length;
      // 5xx makes RevenueCat retry the delivery later
      return json({ ok: failed === 0, synced: ids.length - failed }, failed ? 500 : 200);
    }

    // 2. Signed-in app user
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);
    const result = await syncUser(data.user.id);
    return json({ ok: true, is_pro: result.isPro, expires_at: result.expiresAt });
  } catch (e) {
    console.error('premium-sync failed', e);
    return json({ error: 'sync failed' }, 500);
  }
});
