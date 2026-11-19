/** Placeholder until Firestore jobs collection is wired up. */

export type JobStatus = 'draft' | 'open' | 'filled' | 'closed' | 'cancelled';

export const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'filled', label: 'Filled' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export type JobInput = {
  corporateId: string;
  corporateName: string;
  title: string;
  location: string;
  description: string;
  salary: string;
  requirements: string[];
  eventDate: string;
  eventTime: string;
  slotsMale: string;
  slotsFemale: string;
};

export type Job = JobInput & {
  id: string;
  jobId: string;
  status: JobStatus;
  /** When the job was posted (yyyy-mm-dd). Falls back to event date in UI if omitted. */
  postedOn?: string;
};

export function emptyJobInput(): JobInput {
  return {
    corporateId: '',
    corporateName: '',
    title: '',
    location: '',
    description: '',
    salary: '',
    requirements: [''],
    eventDate: '',
    eventTime: '',
    slotsMale: '',
    slotsFemale: '',
  };
}

export function jobToInput(job: Job): JobInput {
  return {
    corporateId: job.corporateId,
    corporateName: job.corporateName,
    title: job.title,
    location: job.location,
    description: job.description,
    salary: job.salary,
    requirements: job.requirements.length ? job.requirements : [''],
    eventDate: job.eventDate,
    eventTime: job.eventTime,
    slotsMale: job.slotsMale,
    slotsFemale: job.slotsFemale,
  };
}

const DUMMY_JOBS: Job[] = [
  {
    id: 'job-1',
    jobId: 'JOB-1001',
    corporateId: 'demo-1',
    corporateName: 'Nova Retail Group',
    title: 'Event Usher — Product Launch',
    location: '1 Expo Drive, Singapore 486150',
    description:
      'Greet guests at the product launch, manage queue flow at registration, and direct attendees to demo zones. You will coordinate with the events team on stage cues and keep the foyer organised throughout the day.',
    salary: 'SGD 20 / hr',
    requirements: [
      'Must arrive 15 minutes before call time',
      'Smart casual attire (black pants, plain top)',
      'Comfortable standing for 6+ hours',
      'Basic English communication',
    ],
    eventDate: '2026-02-14',
    eventTime: '9:00 AM – 5:00 PM',
    slotsMale: '6',
    slotsFemale: '4',
    status: 'open',
    postedOn: '2026-01-10',
  },
  {
    id: 'job-2',
    jobId: 'JOB-1002',
    corporateId: 'demo-2',
    corporateName: 'Summit Foods Pte Ltd',
    title: 'Brand Ambassador',
    location: '313 Orchard Road, ION Orchard, Singapore 238895',
    description:
      'Represent Summit Foods at an in-store tasting booth. Offer samples, answer product questions, and encourage shoppers to sign up for the loyalty programme. Light merchandising setup at shift start.',
    salary: 'SGD 18 / hr',
    requirements: [
      'Food handling awareness certificate preferred',
      'Friendly and approachable manner',
      'Available for full shift without leaving the booth unattended',
    ],
    eventDate: '2026-02-20',
    eventTime: '10:00 AM – 6:00 PM',
    slotsMale: '5',
    slotsFemale: '5',
    status: 'open',
    postedOn: '2026-02-01',
  },
  {
    id: 'job-3',
    jobId: 'JOB-1003',
    corporateId: 'demo-3',
    corporateName: 'Horizon Events',
    title: 'Registration Desk Staff',
    location: '10 Bayfront Avenue, Marina Bay Sands Expo, Singapore 018956',
    description:
      'Staff the registration counter for a corporate conference. Verify attendee details, print badges, hand out lanyards, and assist with wayfinding to breakout rooms.',
    salary: 'SGD 95 / day',
    requirements: [
      'Prior event or front-desk experience preferred',
      'Proficient with laptops and label printers',
      'Calm under peak arrival rush',
    ],
    eventDate: '2026-01-28',
    eventTime: '8:00 AM – 4:00 PM',
    slotsMale: '3',
    slotsFemale: '3',
    status: 'filled',
    postedOn: '2026-01-05',
  },
  {
    id: 'job-4',
    jobId: 'JOB-1004',
    corporateId: 'demo-1',
    corporateName: 'Nova Retail Group',
    title: 'Logistics Helper',
    location: '20 Tuas Avenue 3, Warehouse 7, Singapore 639408',
    description:
      'Support the retail roadshow crew with moving cartons, counting stock, and preparing display kits before dispatch. Some lifting up to 15 kg required.',
    salary: 'SGD 110 / day',
    requirements: [
      'Safety shoes required',
      'Able to lift and carry event materials',
      'Forklift licence is a plus but not mandatory',
    ],
    eventDate: '2026-03-05',
    eventTime: '7:00 AM – 3:00 PM',
    slotsMale: '8',
    slotsFemale: '2',
    status: 'draft',
    postedOn: '2026-02-18',
  },
  {
    id: 'job-5',
    jobId: 'JOB-1005',
    corporateId: 'demo-4',
    corporateName: 'City Marathon SG',
    title: 'Crowd Control',
    location: 'Nicoll Highway, Course segment near Stadium MRT, Singapore 397693',
    description:
      'Help keep spectator areas safe along the marathon route. Guide foot traffic, report incidents to the lead marshal, and support runners at water points as directed.',
    salary: 'SGD 150 / day',
    requirements: [
      'Basic first-aid certification is a plus',
      'Must complete safety briefing at 4:30 AM',
      'High-visibility vest provided on site',
      'No photography in restricted zones',
    ],
    eventDate: '2025-12-01',
    eventTime: '5:00 AM – 1:00 PM',
    slotsMale: '10',
    slotsFemale: '0',
    status: 'closed',
    postedOn: '2025-11-10',
  },
];

let jobs = [...DUMMY_JOBS];

function nextJobId(): string {
  const nums = jobs.map((j) => parseInt(j.jobId.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `JOB-${next}`;
}

export function getJob(id: string): Job | null {
  return jobs.find((j) => j.id === id) ?? null;
}

export function getAllJobs(): Job[] {
  return [...jobs];
}

export function subscribeJobs(onData: (list: Job[]) => void, _onError: (e: Error) => void): () => void {
  const t = window.setTimeout(() => onData([...jobs]), 250);
  return () => window.clearTimeout(t);
}

export async function createJob(input: JobInput, status: JobStatus): Promise<string> {
  const id = `job-${Date.now()}`;
  jobs = [
    {
      ...input,
      requirements: input.requirements.map((r) => r.trim()).filter(Boolean),
      id,
      jobId: nextJobId(),
      status,
    },
    ...jobs,
  ];
  return id;
}

export type JobStatusUpdateResult = { createdPayouts: number };

export function jobClosePayoutToast(baseMessage: string, createdPayouts: number): string {
  if (createdPayouts === 0) return `${baseMessage} No approved applicants — no payout drafts created.`;
  return `${baseMessage} Created ${createdPayouts} payout draft${createdPayouts === 1 ? '' : 's'}.`;
}

async function payoutsOnJobClose(id: string): Promise<number> {
  const job = getJob(id);
  if (!job) throw new Error('Job not found.');
  try {
    const { createPayoutsForClosedJob } = await import('./payments');
    const ids = await createPayoutsForClosedJob(job);
    return ids.length;
  } catch {
    throw new Error('Job closed but payouts could not be created.');
  }
}

export async function updateJob(id: string, input: JobInput, status: JobStatus): Promise<JobStatusUpdateResult> {
  const prev = jobs.find((j) => j.id === id);
  if (!prev) throw new Error('Job not found.');
  jobs = jobs.map((j) =>
    j.id === id
      ? { ...j, ...input, requirements: input.requirements.map((r) => r.trim()).filter(Boolean), status }
      : j,
  );
  if (status === 'closed' && prev.status !== 'closed') {
    try {
      const createdPayouts = await payoutsOnJobClose(id);
      return { createdPayouts };
    } catch (e) {
      jobs = jobs.map((j) => (j.id === id ? { ...j, status: prev.status } : j));
      throw e;
    }
  }
  return { createdPayouts: 0 };
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<JobStatusUpdateResult> {
  const prev = jobs.find((j) => j.id === id);
  if (!prev) throw new Error('Job not found.');
  const priorStatus = prev.status;
  jobs = jobs.map((j) => (j.id === id ? { ...j, status } : j));
  if (status === 'closed' && priorStatus !== 'closed') {
    try {
      const createdPayouts = await payoutsOnJobClose(id);
      return { createdPayouts };
    } catch (e) {
      jobs = jobs.map((j) => (j.id === id ? { ...j, status: priorStatus } : j));
      throw e;
    }
  }
  return { createdPayouts: 0 };
}

export async function deleteJob(id: string): Promise<void> {
  jobs = jobs.filter((j) => j.id !== id);
}