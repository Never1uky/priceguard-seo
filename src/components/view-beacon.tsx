'use client';

import { useEffect } from 'react';

/** Tiny client island: first-party 24h cookie + one view hit (ISR-safe). */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    const safe = slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (!safe) return;
    const cookieName = `seo_v_${safe}`;
    if (document.cookie.split('; ').some((c) => c.startsWith(`${cookieName}=`))) {
      return;
    }
    document.cookie = `${cookieName}=1; Max-Age=86400; Path=/; SameSite=Lax`;
    void fetch('/api/view-hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
