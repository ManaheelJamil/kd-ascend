/**
 * Email template module — every email the platform sends is built here.
 *
 * Layout follows the Figma "email" frames (Mobile App page, 263:593 / 316:164):
 * 544px card, dark header with the KD Ascend logo and a white title, centred 18px body text,
 * the code in six outlined boxes on a peach panel, and the illustration at the bottom.
 *
 * Images are served from this site's /public/email folder, so they need an absolute URL
 * (EMAIL_ASSET_URL or APP_URL, defaulting to the live dashboard).
 */

export type TemplateName =
  | 'verifyEmail'
  | 'resetCode'
  | 'passwordChanged'
  | 'accountApproved'
  | 'accountRejected'
  | 'accountBlacklisted'
  | 'accountRestored';

export type TemplateVars = {
  appName?: string;
  /** Recipient's first name; "there" when unknown. */
  name?: string | null;
  code?: string;
  reason?: string | null;
  /** Shown in "If this wasn't you, contact …" lines. */
  supportEmail?: string | null;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export const TEMPLATE_LIST: { name: TemplateName; label: string; when: string }[] = [
  { name: 'verifyEmail', label: 'Email verification code', when: 'A new user verifies their email in the app' },
  { name: 'resetCode', label: 'Password reset code', when: 'A user taps Forgot Password and picks Email' },
  { name: 'passwordChanged', label: 'Password changed', when: 'Right after a password reset succeeds' },
  { name: 'accountApproved', label: 'Account approved', when: 'An admin approves a user' },
  { name: 'accountRejected', label: 'Application rejected', when: 'An admin rejects a user' },
  { name: 'accountBlacklisted', label: 'Account blocked', when: 'An admin blacklists a user' },
  { name: 'accountRestored', label: 'Account restored', when: 'An admin removes a user from the blacklist' },
];

export const isTemplateName = (v: string): v is TemplateName => TEMPLATE_LIST.some((t) => t.name === v);

const NAVY = '#242239';
const INK = '#060702';
const MUTED = '#5E5E5E';
const ORANGE = '#FF8241';
const PEACH = '#FFF6ED';
const FONT = "'Plus Jakarta Sans',Arial,Helvetica,sans-serif";

export function assetBase() {
  const raw = process.env.EMAIL_ASSET_URL || process.env.APP_URL || 'https://kd-ascend.vercel.app';
  return raw.replace(/\/+$/, '');
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "Nawal Khan" → "Nawal". */
export function firstName(full?: string | null) {
  const n = (full ?? '').trim().split(/\s+/)[0];
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

type Block = { title: string; paragraphs: string[]; code?: string; after?: string[]; illustration?: boolean; button?: { label: string; href: string } };

function codeBoxes(code: string) {
  const cells = code
    .split('')
    .map(
      (d) =>
        `<td align="center" valign="middle" width="55" height="63" style="width:55px;height:61px;border:1px solid ${NAVY};border-radius:12px;font:400 24px/32px ${FONT};color:${NAVY}">${esc(d)}</td>`,
    )
    .join('<td width="11" style="width:11px;font-size:0;line-height:0">&nbsp;</td>');
  return `<tr><td class="cw" style="padding:24px 41px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PEACH};border-radius:14px">
      <tr><td align="center" style="padding:20px 10px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function para(html: string, top: number) {
  return `<tr><td class="p" align="center" style="padding:${top}px 46px 0;font:400 18px/27px ${FONT};color:${INK};text-align:center">${html}</td></tr>`;
}

/** The header (pattern, logo and title in Plus Jakarta Sans) is one image per template, so it looks
 * identical to Figma in Gmail, Outlook and phone mail apps, which ignore web fonts and background images. */
function layout(name: TemplateName, appName: string, b: Block) {
  const base = assetBase();
  const body = [
    para(b.paragraphs[0], 46),
    ...b.paragraphs.slice(1).map((p) => para(p, 27)),
    b.code ? codeBoxes(b.code) : '',
    b.button
      ? `<tr><td align="center" style="padding:24px 41px 0">
          <a href="${esc(b.button.href)}" style="display:block;background:${ORANGE};border-radius:12px;padding:14px 20px;font:500 16px/24px ${FONT};color:#FFFFFF;text-decoration:none;text-align:center">${esc(b.button.label)} &rarr;</a>
        </td></tr>`
      : '',
    ...(b.after ?? []).map((p, i) => para(p, i === 0 ? 24 : 16)),
    b.illustration
      ? `<tr><td align="center" style="padding:8px 17px 0"><img src="${base}/email/reset-illustration.jpg" width="510" alt="" style="display:block;width:100%;max-width:510px;height:auto;border:0"></td></tr>`
      : `<tr><td style="height:46px;font-size:0;line-height:0">&nbsp;</td></tr>`,
  ].join('\n');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(b.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @media (max-width:560px){ .card{width:100%!important;border-radius:0!important} .p{padding-left:22px!important;padding-right:22px!important} .cw{padding-left:16px!important;padding-right:16px!important} }
</style>
</head>
<body style="margin:0;padding:0;background:#F6F6F6;-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F6">
    <tr><td align="center" style="padding:24px 0">
      <table role="presentation" class="card" width="544" cellpadding="0" cellspacing="0" style="width:544px;max-width:544px;background:#FFFFFF;border-radius:20px;overflow:hidden">
        <tr><td style="background:${NAVY};font-size:0;line-height:0">
          <img src="${base}/email/header-${name}.jpg" width="544" alt="${esc(appName)} — ${esc(b.title)}"
            style="display:block;width:100%;max-width:544px;height:auto;border:0;color:#FFFFFF;font:600 22px/30px ${FONT};text-align:center">
        </td></tr>
        ${body}
      </table>
      <p style="margin:16px 0 0;font:400 12px/18px ${FONT};color:#A7A7A7">© ${new Date().getFullYear()} ${esc(appName)}. This is an automated message.</p>
    </td></tr>
  </table>
</body></html>`;
}

const toText = (b: Block) =>
  [b.title, '', ...b.paragraphs.map(strip), b.code ? `\nYour code: ${b.code}\n` : '', ...(b.after ?? []).map(strip)]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

function strip(html: string) {
  return html
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Builds the subject, HTML and plain-text body for one template. */
export function renderEmail(name: TemplateName, vars: TemplateVars = {}): RenderedEmail {
  const appName = vars.appName || 'KD Ascend';
  const hello = `Hey, ${esc(firstName(vars.name) || 'there')} 👋`;
  const code = (vars.code ?? '').replace(/\D/g, '').slice(0, 6);
  const reason = vars.reason?.trim() ? `<br><b>Reason:</b> ${esc(vars.reason.trim())}` : '';
  const contact = vars.supportEmail
    ? `please contact us at <a href="mailto:${esc(vars.supportEmail)}" style="color:${ORANGE}">${esc(vars.supportEmail)}</a>`
    : 'please contact the admin team';

  let subject: string;
  let b: Block;
  switch (name) {
    case 'verifyEmail':
      subject = `${code} is your ${appName} verification code`;
      b = {
        title: 'Verify Your Email',
        paragraphs: [hello, `Thanks for signing up to ${esc(appName)}. Use the code below to verify your email address.`],
        code,
        after: [
          "This verification code will expire in 10 minutes for security reasons. If you didn't create an account, you can safely ignore this email.",
        ],
        illustration: true,
      };
      break;
    case 'resetCode':
      subject = `${code} is your ${appName} password reset code`;
      b = {
        title: 'Your Verification Code',
        paragraphs: [hello, 'We received a request to reset your account password. Use the code below to verify.'],
        code,
        after: [
          "This verification code will expire in 10 minutes for security reasons. If you didn't request a password reset, you can safely ignore this email.",
        ],
        illustration: true,
      };
      break;
    case 'passwordChanged':
      subject = `Your ${appName} password was changed`;
      b = {
        title: 'Password Changed',
        paragraphs: [
          hello,
          'Your password has been updated successfully. You can now log in to the app using your new password.',
        ],
        after: [`If you didn't change your password, ${contact} straight away.`],
      };
      break;
    case 'accountApproved':
      subject = `Your ${appName} account is approved`;
      b = {
        title: 'Account Approved',
        paragraphs: [
          hello,
          `Good news — your ${esc(appName)} account has been reviewed and approved. Open the app and log in to get started.`,
        ],
      };
      break;
    case 'accountRejected':
      subject = `Update on your ${appName} application`;
      b = {
        title: 'Application Update',
        paragraphs: [hello, `We’ve reviewed your ${esc(appName)} application and unfortunately can’t approve it at this time.${reason}`],
        after: [`If you think this is a mistake, ${contact}.`],
      };
      break;
    case 'accountBlacklisted':
      subject = `Your ${appName} account has been blocked`;
      b = {
        title: 'Account Blocked',
        paragraphs: [hello, `Your ${esc(appName)} account has been blocked by an administrator.${reason}`],
        after: [`If you think this is a mistake, ${contact}.`],
      };
      break;
    case 'accountRestored':
      subject = `Your ${appName} account is active again`;
      b = {
        title: 'Account Restored',
        paragraphs: [hello, `Your ${esc(appName)} account has been unblocked. You can log in to the app again.`],
      };
      break;
  }
  return { subject, html: layout(name, appName, b), text: toText(b) };
}

/** Sample values used by the dashboard preview. */
export const SAMPLE_VARS: TemplateVars = {
  name: 'Nawal',
  code: '059426',
  reason: 'The identity document was not clear enough to read.',
};
