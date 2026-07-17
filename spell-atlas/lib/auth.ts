// Lightweight single-passphrase gate. This app is designed to be reached
// only over your Tailscale network (or another private network you
// control), so this is intentionally simple: a shared secret cookie, not a
// full auth system. If APP_PASSWORD is unset, the app is open -- fine for
// local development, but you should set it for anything reachable beyond
// localhost.

export const SESSION_COOKIE_NAME = 'spell_atlas_session';

export function isAuthRequired(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function checkPassword(password: string): boolean {
  const secret = process.env.APP_PASSWORD;
  if (!secret) return true;
  return password === secret;
}

export function isValidSessionCookie(value: string | undefined | null): boolean {
  const secret = process.env.APP_PASSWORD;
  if (!secret) return true;
  return value === secret;
}

export function getSessionCookieValue(): string | null {
  return process.env.APP_PASSWORD ?? null;
}
