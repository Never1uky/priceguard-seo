import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { revalidateSecret } from '@/lib/config';

export const dynamic = 'force-dynamic';

function authorized(req: Request, bodySecret?: string): boolean {
  const expected = revalidateSecret();
  if (!expected) return false;
  const header = req.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const xSecret = req.headers.get('x-revalidate-secret')?.trim() || '';
  return bearer === expected || xSecret === expected || bodySecret === expected;
}

export async function POST(req: Request) {
  let body: { paths?: string[]; secret?: string; tags?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!authorized(req, body.secret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
    : [];

  if (!paths.length) {
    return NextResponse.json({ ok: false, error: 'paths required' }, { status: 400 });
  }

  const revalidated: string[] = [];
  for (const path of paths) {
    revalidatePath(path);
    revalidated.push(path);
  }

  return NextResponse.json({ ok: true, revalidated });
}
