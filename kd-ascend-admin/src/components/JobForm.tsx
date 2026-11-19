'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Clock, Plus, Search, X } from 'lucide-react';
import { FormSuccessModal } from '@/components/FormSuccessModal';
import { JobStatusPicker } from '@/components/JobBits';
import { JobStatusConfirmDialog } from '@/components/JobDialogs';
import { Button, Card, DateInput, ErrorNote, Field, PageShell, TextArea, TextInput, cn, control, controlHeight, ui } from '@/components/ui';
import { subscribeCorporates, type Corporate } from '@/lib/corporates';
import {
  createJob,
  emptyJobInput,
  jobStatusLabel,
  jobToInput,
  updateJob,
  type Job,
  type JobInput,
  type JobStatus,
} from '@/lib/jobs';

type JobFormProps = { mode: 'create' } | { mode: 'edit'; job: Job };

type JobErrors = Partial<Record<keyof JobInput, string>>;

function validate(form: JobInput, publish: boolean): JobErrors {
  const errors: JobErrors = {};
  if (!form.corporateId) errors.corporateId = 'Select a corporate partner.';
  if (!form.title.trim()) errors.title = 'Enter a job title.';
  if (!publish) return errors;
  if (!form.location.trim()) errors.location = 'Enter the event location.';
  if (!form.description.trim()) errors.description = 'Enter a job description.';
  if (!form.salary.trim()) errors.salary = 'Enter salary per hour.';
  if (!form.eventDate) errors.eventDate = 'Pick the event date.';
  if (!form.eventTime.trim()) errors.eventTime = 'Enter event time.';
  if (!form.slotsMale.trim()) errors.slotsMale = 'Enter slots for men.';
  else if (!/^\d+$/.test(form.slotsMale.trim())) errors.slotsMale = 'Use a whole number.';
  if (!form.slotsFemale.trim()) errors.slotsFemale = 'Enter slots for women.';
  else if (!/^\d+$/.test(form.slotsFemale.trim())) errors.slotsFemale = 'Use a whole number.';
  return errors;
}

function CorporateSearchSelect({
  corporates,
  value,
  onChange,
  invalid,
  disabled,
}: {
  corporates: Corporate[];
  value: string;
  onChange: (id: string, name: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = corporates.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return corporates;
    return corporates.filter((c) =>
      [c.name, c.industry, c.location, c.contactEmail].filter(Boolean).join(' ').toLowerCase().includes(needle),
    );
  }, [corporates, q]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          control,
          controlHeight,
          'flex w-full items-center justify-between gap-2 text-left',
          !selected && 'text-[#0a0a0a]/50',
          invalid && 'border-danger',
          disabled && 'opacity-60',
        )}
      >
        <span className="truncate">{selected ? selected.name : 'Search and select corporate…'}</span>
        <ChevronDown className={cn('size-5 shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-control border border-line bg-white shadow-lg">
          <div className="relative border-b border-line p-2.5">
            <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search corporate name…"
              className="h-11 border-field bg-search pl-10 shadow-none"
              autoFocus
            />
          </div>
          <ul className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-[14px] text-muted">No corporates match your search.</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.id, c.name);
                      setOpen(false);
                      setQ('');
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[15px] hover:bg-page"
                  >
                    <span className="min-w-0 truncate font-medium text-ink">{c.name}</span>
                    {value === c.id ? <Check className="size-4 shrink-0 text-brand" /> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EventTimeInput({
  value,
  onChange,
  invalid,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <TextInput
        value={value}
        onChange={onChange}
        placeholder="e.g., 9:00 AM - 5:00 PM"
        className="pr-12"
        invalid={invalid}
        {...rest}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 grid size-[21px] -translate-y-1/2 place-items-center rounded-[5px] bg-brand">
        <Clock className="size-3.5 text-white" strokeWidth={2.5} />
      </span>
    </div>
  );
}

export function JobForm(props: JobFormProps) {
  const isEdit = props.mode === 'edit';
  const job = isEdit ? props.job : null;
  const router = useRouter();

  const [form, setForm] = useState<JobInput>(() => (isEdit && job ? jobToInput(job) : emptyJobInput()));
  const [status, setStatus] = useState<JobStatus>(() => (isEdit && job ? job.status : 'draft'));
  const [errors, setErrors] = useState<JobErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posted, setPosted] = useState<{ id: string; title: string; status: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<JobStatus | null>(null);
  const [corporates, setCorporates] = useState<Corporate[]>([]);

  useEffect(() => {
    const unsub = subscribeCorporates(
      (list) => setCorporates(list),
      () => setCorporates([]),
    );
    return () => unsub();
  }, []);

  const patch = (p: Partial<JobInput>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => {
      const next = { ...e };
      (Object.keys(p) as (keyof JobInput)[]).forEach((k) => delete next[k]);
      return next;
    });
  };

  const setRequirement = (index: number, value: string) => {
    setForm((f) => {
      const requirements = [...f.requirements];
      requirements[index] = value;
      return { ...f, requirements };
    });
  };

  const addRequirement = () => setForm((f) => ({ ...f, requirements: [...f.requirements, ''] }));

  const removeRequirement = (index: number) => {
    setForm((f) => {
      const requirements = f.requirements.filter((_, i) => i !== index);
      return { ...f, requirements: requirements.length ? requirements : [''] };
    });
  };

  const backHref = '/jobs';

  const save = async (targetStatus?: JobStatus) => {
    const nextStatus = isEdit ? status : (targetStatus ?? 'draft');
    setFormError(null);
    const publish = nextStatus !== 'draft';
    const errs = validate(form, publish);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError(
        publish
          ? 'Please fix the highlighted fields before posting or setting status to Open.'
          : 'Select a corporate and enter a job title to save a draft.',
      );
      return;
    }

    setSaving(true);
    try {
      if (isEdit && job) {
        await updateJob(job.id, form, nextStatus);
        setSaved(true);
      } else {
        const id = await createJob(form, nextStatus);
        setPosted({ id, title: form.title.trim(), status: jobStatusLabel(nextStatus) });
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell variant="detail">
      <div className="flex items-start gap-[18px]">
        <Link
          href={backHref}
          aria-label="Back"
          className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink hover:bg-line"
        >
          <ArrowLeft className="size-[22px]" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={ui.pageHeading}>{isEdit ? 'Edit Job' : 'Add Job'}</h1>
            {isEdit ? (
              <JobStatusPicker
                value={status}
                onChange={(next) => {
                  if (next === status) return;
                  setStatusConfirm(next);
                }}
                busy={saving}
              />
            ) : null}
          </div>
          <p className={ui.pageSubheading}>{isEdit ? 'Update this job posting' : 'Post a new job for a corporate partner'}</p>
        </div>
      </div>

      <div className="grid gap-[27px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-[27px]">
          <Card pad="lg">
            <h2 className={ui.sectionTitleSm}>Job Information</h2>
            <div className="mt-[27px] grid gap-[27px] md:grid-cols-2">
              <Field label="Corporate" required error={errors.corporateId} className="md:col-span-2">
                <CorporateSearchSelect
                  corporates={corporates}
                  value={form.corporateId}
                  onChange={(corporateId, corporateName) => patch({ corporateId, corporateName })}
                  invalid={!!errors.corporateId}
                  disabled={saving}
                />
              </Field>
              <Field label="Job Title" required error={errors.title} className="md:col-start-1 md:row-start-2">
                <TextInput
                  placeholder="e.g., Campus Ambassador"
                  value={form.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  invalid={!!errors.title}
                />
              </Field>
              <Field label="Description" required error={errors.description} className="md:col-start-2 md:row-start-2 md:row-span-2">
                <TextArea
                  placeholder="Describe the job role, responsibilities, and what you're looking for..."
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  invalid={!!errors.description}
                  className="min-h-[220px]"
                />
              </Field>
              <Field label="Location" required error={errors.location} className="md:col-start-1 md:row-start-3">
                <TextInput
                  placeholder="Full event address"
                  value={form.location}
                  onChange={(e) => patch({ location: e.target.value })}
                  invalid={!!errors.location}
                />
              </Field>
              <Field label="Salary/hr" required error={errors.salary} className="md:col-start-1 md:row-start-4">
                <TextInput
                  placeholder="e.g., $20/hr"
                  value={form.salary}
                  onChange={(e) => patch({ salary: e.target.value })}
                  invalid={!!errors.salary}
                />
              </Field>
              <div className="flex flex-col gap-3 md:col-start-2 md:row-start-4">
                <span className="text-[13.5px] font-medium text-muted">Requirements</span>
                <div className="flex flex-col gap-3">
                  {form.requirements.map((req, i) => (
                    <div key={i} className="flex gap-2">
                      <TextInput
                        placeholder="Enter a requirement"
                        value={req}
                        onChange={(e) => setRequirement(i, e.target.value)}
                        className="flex-1"
                      />
                      {form.requirements.length > 1 ? (
                        <button
                          type="button"
                          aria-label="Remove requirement"
                          onClick={() => removeRequirement(i)}
                          className="grid size-[52px] shrink-0 place-items-center rounded-control border border-field text-muted hover:text-danger"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addRequirement}
                  className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand hover:underline"
                >
                  <Plus className="size-4" />
                  Add Requirement
                </button>
              </div>
            </div>
          </Card>

          <Card pad="lg">
            <h2 className={ui.sectionTitleSm}>Job Details</h2>
            <div className="mt-[27px] grid gap-[27px] md:grid-cols-2">
              <Field label="Date" required error={errors.eventDate}>
                <DateInput value={form.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} invalid={!!errors.eventDate} />
              </Field>
              <Field label="Event Time" required error={errors.eventTime}>
                <EventTimeInput value={form.eventTime} onChange={(e) => patch({ eventTime: e.target.value })} invalid={!!errors.eventTime} />
              </Field>
              <div className="md:col-span-2">
                <span className="text-[13.5px] font-medium text-muted">Total Slots</span>
                <div className="mt-3 grid gap-[27px] md:grid-cols-2">
                  <Field label="Man" required error={errors.slotsMale}>
                    <TextInput
                      inputMode="numeric"
                      placeholder="e.g., 10"
                      value={form.slotsMale}
                      onChange={(e) => patch({ slotsMale: e.target.value })}
                      invalid={!!errors.slotsMale}
                    />
                  </Field>
                  <Field label="Female" required error={errors.slotsFemale}>
                    <TextInput
                      inputMode="numeric"
                      placeholder="e.g., 10"
                      value={form.slotsFemale}
                      onChange={(e) => patch({ slotsFemale: e.target.value })}
                      invalid={!!errors.slotsFemale}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </Card>

          {formError ? <ErrorNote>{formError}</ErrorNote> : null}

          <div className="flex flex-wrap items-center gap-[14px]">
            <Button variant="outline" className={ui.formCancel} onClick={() => router.push(backHref)} disabled={saving}>
              Cancel
            </Button>
            {isEdit ? (
              <Button className="h-[51px] min-w-[162px] font-semibold" onClick={() => save()} loading={saving}>
                Save changes
              </Button>
            ) : (
              <>
                <Button variant="outline" className="h-[51px] min-w-[140px] font-semibold" onClick={() => save('draft')} loading={saving}>
                  Save as Draft
                </Button>
                <Button className="h-[51px] min-w-[140px] font-semibold" onClick={() => save('open')} loading={saving}>
                  Post Job
                </Button>
              </>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-card bg-linear-to-b from-navy to-navy-2 p-[27px] text-white xl:sticky xl:top-[135px]">
          <h2 className={cn(ui.sectionTitleSm, 'text-white')}>Instructions</h2>
          <div className="mt-6 flex flex-col gap-[22px] text-[13.5px] leading-[18px]">
            <div>
              <p className="font-semibold">Required Fields</p>
              <p className="mt-2 text-white/90">Fields marked with * are required when you post the job. Drafts only need a corporate and title.</p>
            </div>
            <div>
              <p className="font-semibold">Corporate</p>
              <p className="mt-2 text-white/90">Search and pick the partner this job belongs to. Only corporates in your list appear here.</p>
            </div>
            <div>
              <p className="font-semibold">Job details</p>
              <p className="mt-2 text-white/90">Set the event date, time window, and how many male and female slots you need filled.</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <p className="mt-2 text-white/90">
                <b className="font-semibold">Draft</b> — not visible in the app (unpublished). <b className="font-semibold">Open</b> — published; members can apply.{' '}
                <b className="font-semibold">Filled</b> — slots full. <b className="font-semibold">Closed</b> — event ended or taken down. Use the status menu on the jobs list or
                next to the title when editing.
              </p>
            </div>
            <div>
              <p className="font-semibold">Draft vs post</p>
              <p className="mt-2 text-white/90">Save as Draft to finish later. Post Job sets Open. To unpublish, change Open → Draft from the list or edit screen.</p>
            </div>
          </div>
        </aside>
      </div>

      <FormSuccessModal
        open={!!posted}
        onClose={() => setPosted(null)}
        title="Job posted"
        description="The job is on your jobs list and ready for staffing."
        details={
          posted
            ? [
                { label: 'Title', value: posted.title },
                { label: 'Status', value: posted.status },
              ]
            : undefined
        }
        secondaryAction={{
          label: 'Add another',
          onClick: () => {
            setPosted(null);
            setForm(emptyJobInput());
            setErrors({});
            setFormError(null);
          },
        }}
        primaryAction={{
          label: 'Back to jobs',
          onClick: () => router.push('/jobs'),
        }}
      />

      {isEdit && job ? (
        <JobStatusConfirmDialog
          job={job}
          currentStatus={status}
          nextStatus={statusConfirm}
          open={!!statusConfirm}
          onClose={() => setStatusConfirm(null)}
          onConfirm={async () => {
            if (statusConfirm) setStatus(statusConfirm);
          }}
        />
      ) : null}

      <FormSuccessModal
        open={saved}
        onClose={() => setSaved(false)}
        title="Job updated"
        description="Your changes were saved successfully."
        details={
          job
            ? [
                { label: 'Title', value: form.title.trim() || job.title },
                { label: 'Status', value: jobStatusLabel(status) },
              ]
            : undefined
        }
        secondaryAction={{ label: 'Keep editing', onClick: () => setSaved(false) }}
        primaryAction={{
          label: 'Back to jobs',
          onClick: () => router.push('/jobs'),
        }}
      />
    </PageShell>
  );
}