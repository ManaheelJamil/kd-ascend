'use client';

import { Card, PageShell, PageTitle, cn, ui } from './ui';

/** Placeholder for sidebar sections that are designed but not built yet. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <PageShell>
      <PageTitle title={title} />
      <Card pad="lg" className="grid min-h-[320px] place-items-center text-center">
        <div>
          <p className={ui.sectionTitleSm}>{title} is coming soon</p>
          <p className={cn('mt-1.5', ui.bodyMuted)}>This section is in the design and will be built in a later phase.</p>
        </div>
      </Card>
    </PageShell>
  );
}
