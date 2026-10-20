import { Card, PageTitle } from './ui';

/** Placeholder for sidebar sections that are designed but not built yet. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-[27px]">
      <PageTitle title={title} />
      <Card className="grid min-h-[320px] place-items-center p-10 text-center">
        <div>
          <p className="text-lg font-semibold text-ink">{title} is coming soon</p>
          <p className="mt-1.5 text-[15px] text-muted">This section is in the design and will be built in a later phase.</p>
        </div>
      </Card>
    </div>
  );
}
