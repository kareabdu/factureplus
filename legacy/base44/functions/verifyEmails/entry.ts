import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vérifie qu'une adresse mail peut recevoir du courrier :
// 1. syntaxe valide, 2. domaine résolvable, 3. enregistrement MX présent.
// Résolution DNS via DNS-over-HTTPS de Google (fiable dans le runtime Deno).
async function resolveRecords(domain: string, type: string): Promise<any[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: 'application/dns-json' } });
  if (!res.ok) throw new Error(`DNS HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.Answer) ? data.Answer : [];
}

async function checkEmail(email) {
  const addr = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(addr)) return { status: 'invalid_syntax', mx: false };
  const domain = addr.split('@')[1];
  try {
    const mx = await resolveRecords(domain, 'MX');
    if (mx.length > 0) return { status: 'valid', mx: true };
    // Fallback : un domaine sans MX mais avec un enregistrement A peut recevoir du courrier.
    const a = await resolveRecords(domain, 'A');
    return { status: a.length > 0 ? 'valid' : 'no_mx', mx: false };
  } catch (e) {
    return { status: 'invalid_domain', mx: false };
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const emails = Array.isArray(body?.emails) ? body.emails : [];
    const results: Record<string, { status: string; mx: boolean }> = {};
    await Promise.all(emails.map(async (e) => {
      results[String(e).toLowerCase()] = await checkEmail(e);
    }));
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}