import nodemailer, { type Transporter } from 'nodemailer';
import { renderEmail, type TemplateName, type TemplateVars } from './emailTemplates';

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  appName: string;
  supportEmail: string | null;
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

/** Renders one template from emailTemplates.ts and sends it. */
export async function sendTemplate(cfg: MailConfig, to: string, template: TemplateName, vars: TemplateVars = {}) {
  const { subject, html, text } = renderEmail(template, {
    appName: cfg.appName,
    supportEmail: cfg.supportEmail,
    ...vars,
  });
  await getTransport(cfg).sendMail({ from: cfg.from, to, subject, html, text });
}

export const sendVerificationEmail = (cfg: MailConfig, to: string, code: string, name?: string | null) =>
  sendTemplate(cfg, to, 'verifyEmail', { code, name });

export const sendResetEmail = (cfg: MailConfig, to: string, code: string, name?: string | null) =>
  sendTemplate(cfg, to, 'resetCode', { code, name });
