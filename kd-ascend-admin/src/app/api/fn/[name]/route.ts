import { NextResponse } from 'next/server';
import { adminAuth, configStatus, ConfigError } from '@/server/admin';
import { FnError, handlers } from '@/server/otp';

/**
 * HTTPS endpoint for the mobile app: POST /api/fn/<functionName>
 *   headers: Authorization: Bearer <Firebase ID token>   (when signed in)
 *   body:    { "data": { ... } }
 * Responds { "result": ... } or { "error": { "code", "message" } } — the same shape as a
 * Firebase callable, so the app's existing error handling keeps working.
 *
 * GET /api/fn/health shows whether the server settings are filled in.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = {
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'failed-precondition': 412,
  unavailable: 503,
  internal: 500,
};

function fail(code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status: STATUS[code] ?? 500 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (name !== 'health') return fail('not-found', 'Unknown function.');
  const status = configStatus();
  return NextResponse.json({ ok: Object.values(status).every(Boolean), ...status });
}

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const handler = Object.prototype.hasOwnProperty.call(handlers, name) ? handlers[name] : undefined;
  // "not-found" without "no account" in the message = endpoint missing (the app shows "server not ready").
  if (!handler) return fail('not-found', `Unknown function "${name}".`);

  let data: Record<string, unknown> = {};
  try {
    const body = (await req.json().catch(() => ({}))) as { data?: unknown };
    if (body && typeof body.data === 'object' && body.data !== null) data = body.data as Record<string, unknown>;
  } catch {
    return fail('invalid-argument', 'Invalid request body.');
  }

  try {
    let uid: string | null = null;
    const header = req.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) {
      try {
        uid = (await adminAuth().verifyIdToken(token)).uid;
      } catch (e) {
        if (e instanceof ConfigError) throw e;
        return fail('unauthenticated', 'Your session has ended. Please sign in again.');
      }
    }
    const result = await handler(data, uid);
    return NextResponse.json({ result });
  } catch (e) {
    if (e instanceof FnError) return fail(e.code, e.message);
    if (e instanceof ConfigError) {
      console.error('[api/fn] server not configured:', e.message);
      return fail('unavailable', 'The email service isn’t set up yet. Please try again later.');
    }
    console.error(`[api/fn/${name}]`, e);
    return fail('internal', 'Something went wrong. Please try again.');
  }
}
