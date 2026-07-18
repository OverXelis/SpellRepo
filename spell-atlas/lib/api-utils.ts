import { NextResponse } from 'next/server';

/**
 * Wraps a route handler so that any thrown error (e.g. the SQLite file
 * being unwritable, a permissions problem on the mounted data volume, a bad
 * request body) is returned as a JSON `{ error }` body with a real message
 * and logged server-side, instead of Next.js's generic HTML error page.
 *
 * This matters a lot for a self-hosted single-user app: without it, a
 * failing API route just looks like "stuck on Loading..." in the UI with
 * no way to tell what actually went wrong short of pulling container logs.
 * With it, the browser's Network tab shows the real cause directly.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[api error]', message, err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
