'use client';

import { useState } from 'react';
import { ExternalLink, Mail } from 'lucide-react';
import { Card, cn } from './ui';
import { TEMPLATE_LIST, type TemplateName } from '@/server/emailTemplates';

/** Settings → Email Templates: live preview of every email the platform sends (sample data). */
export default function EmailTemplatesCard() {
  const [active, setActive] = useState<TemplateName>('resetCode');
  const [loaded, setLoaded] = useState(false);
  const current = TEMPLATE_LIST.find((t) => t.name === active)!;
  const src = `/api/email-preview/${active}`;

  return (
    <Card className="flex flex-col gap-[22px] rounded-[18px] p-[28px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20.25px] leading-8 font-bold text-ink">Email Templates</h2>
          <p className="mt-1 text-[15px] text-muted">
            Emails sent automatically to app users. Previews use sample data (Nawal, code 059426).
          </p>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-control border border-field px-4 text-[15px] font-medium text-muted hover:bg-page"
        >
          <ExternalLink className="size-4" />
          Open full size
        </a>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {TEMPLATE_LIST.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => {
              if (t.name !== active) setLoaded(false);
              setActive(t.name);
            }}
            className={cn(
              'h-10 rounded-control border px-4 text-[14.5px] font-medium transition',
              t.name === active ? 'border-brand bg-brand text-white shadow-brand' : 'border-field bg-white text-muted hover:bg-page',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="flex items-center gap-2 text-[15px] text-muted">
        <Mail className="size-4 text-brand" />
        Sent when: <span className="text-ink">{current.when}</span>
      </p>

      <div className="relative overflow-hidden rounded-card border border-line bg-[#F6F6F6]">
        {!loaded ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading preview…</div>
        ) : null}
        <iframe
          key={active}
          src={src}
          title={`${current.label} preview`}
          onLoad={() => setLoaded(true)}
          className="block h-[760px] w-full"
          sandbox=""
        />
      </div>
    </Card>
  );
}
