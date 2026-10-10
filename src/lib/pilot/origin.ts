/** Next's internal bind address can differ from the browser's localhost/LAN host. */
export function allowedRequestOrigin(origin: string | null, internalOrigin: string, host: string | null, publicUrl?: string): boolean {
 if (!origin) return true;
 if (origin === 'https://appassets.androidplatform.net') return true;
 try {
  const candidate = new URL(origin);
  if (candidate.origin !== origin || !['http:', 'https:'].includes(candidate.protocol)) return false;
  if (publicUrl && candidate.origin === new URL(publicUrl).origin) return true;
  const internal = new URL(internalOrigin);
  if (candidate.origin === internal.origin) return true;
  return Boolean(host && candidate.origin === new URL(`${internal.protocol}//${host}`).origin);
 } catch { return false; }
}
