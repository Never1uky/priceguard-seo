import { NextResponse } from 'next/server';
import { seoPagesEndpoint } from '@/lib/config';

export const dynamic = 'force-dynamic';

function cookieNameForSlug(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return `seo_v_${safe}`;
}

export async function POST(req: Request) {
  let slug = '';
  try {
    const body = (await req.json()) as { slug?: string };
    slug = String(body.slug ?? '').trim().slice(0, 120);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 });
  }

  const cookieName = cookieNameForSlug(slug);
  const cookieHeader = req.headers.get('cookie') ?? '';
  if (cookieHeader.split('; ').some((c) => c.startsWith(`${cookieName}=`))) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const endpoint = seoPagesEndpoint();
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Cookie: `${cookieName}=1`,
        },
        body: JSON.stringify({ action: 'hit', slug }),
        cache: 'no-store',
      });
    } catch {
      // best-effort
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, '1', {
    maxAge: 86400,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}
