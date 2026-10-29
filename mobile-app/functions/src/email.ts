import nodemailer, { type Transporter } from 'nodemailer';

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  appName: string;
};

let transporter: Transporter | null = null;
let transporterKey = '';

function getTransport(cfg: MailConfig) {
  const key = `${cfg.host}:${cfg.port}:${cfg.user}`;
  if (!transporter || key !== transporterKey) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    transporterKey = key;
  }
  return transporter;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Brand colours from the app: dark #242239, orange #FF8241. */
function codeEmail(appName: string, heading: string, intro: string, code: string, outro: string) {
  const digits = code
    .split('')
    .map(
      (d) =>
        `<td style="width:44px;height:52px;border:1px solid #D0D0D0;border-radius:12px;text-align:center;font:600 24px Arial,sans-serif;color:#060702">${d}</td>`,
    )
    .join('<td style="width:8px"></td>');

  const html = `<!doctype html>
<html><body style="margin:0;background:#F6F6F6;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F6;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden">
        <tr><td style="background:#242239;padding:28px 24px;text-align:center;color:#D7A86E;font:600 22px Arial,sans-serif;letter-spacing:4px">${escape(appName.toUpperCase())}</td></tr>
        <tr><td style="padding:32px 28px 8px">
          <h1 style="margin:0 0 8px;font:600 22px Arial,sans-serif;color:#060702">${escape(heading)}</h1>
          <p style="margin:0;font:400 15px/1.5 Arial,sans-serif;color:#5E5E5E">${escape(intro)}</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 28px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
        </td></tr>
        <tr><td style="padding:0 28px 32px">
          <p style="margin:0;font:400 13px/1.5 Arial,sans-serif;color:#5E5E5E">${escape(outro)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font:400 12px Arial,sans-serif;color:#A7A7A7">© ${new Date().getFullYear()} ${escape(appName)}</p>
    </td></tr>
  </table>
</body></html>`;
  const textBody = `${heading}\n\n${intro}\n\nYour code: ${code}\n\n${outro}`;
  return { html, text: textBody };
}

export async function sendVerificationEmail(cfg: MailConfig, to: string, code: string) {
  const { html, text } = codeEmail(
    cfg.appName,
    'Verify your email address',
    `Use this code to verify your ${cfg.appName} account. It expires in 10 minutes.`,
    code,
    "If you didn't create an account, you can ignore this email.",
  );
  await getTransport(cfg).sendMail({
    from: cfg.from,
    to,
    subject: `${code} is your ${cfg.appName} verification code`,
    html,
    text,
  });
}

export async function sendResetEmail(cfg: MailConfig, to: string, code: string) {
  const { html, text } = codeEmail(
    cfg.appName,
    'Reset your password',
    'Use this code to reset your password. It expires in 10 minutes.',
    code,
    "If you didn't ask to reset your password, you can ignore this email — your password won't change.",
  );
  await getTransport(cfg).sendMail({
    from: cfg.from,
    to,
    subject: `${code} is your ${cfg.appName} password reset code`,
    html,
    text,
  });
}
