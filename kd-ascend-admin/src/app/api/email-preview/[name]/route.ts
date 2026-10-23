import { isTemplateName, renderEmail, SAMPLE_VARS } from '@/server/emailTemplates';

/**
 * GET /api/email-preview/<template> — the email rendered with sample data (Nawal, 059426),
 * used by Settings → Email Templates. Contains no real user data.
 */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isTemplateName(name)) return new Response('Unknown template', { status: 404 });
  const { subject, html } = renderEmail(name, {
    ...SAMPLE_VARS,
    appName: process.env.APP_NAME || 'KD Ascend',
    supportEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_USER || null,
  });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-email-subject': encodeURIComponent(subject),
      'cache-control': 'no-store',
    },
  });
}
