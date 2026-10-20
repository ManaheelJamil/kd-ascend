'use client';

import { useMemo, useState } from 'react';

type Point = { label: string; value: number };

/** Smooth area chart (Revenue Overview style) for monthly sign-ups. */
export default function SignupsChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 230;
  const pad = { l: 44, r: 12, t: 12, b: 30 };

  const { max, ticks } = useMemo(() => {
    const top = Math.max(4, ...data.map((d) => d.value));
    const step = Math.ceil(top / 4);
    return { max: step * 4, ticks: [0, step, step * 2, step * 3, step * 4] };
  }, [data]);

  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);

  // Catmull-Rom → cubic Bézier for a smooth line.
  const line = pts.reduce((acc, [px, py], i) => {
    if (i === 0) return `M ${px} ${py}`;
    const [x0, y0] = pts[i - 2] ?? pts[i - 1];
    const [x1, y1] = pts[i - 1];
    const [x3, y3] = pts[i + 1] ?? [px, py];
    const c1x = x1 + (px - x0) / 6;
    const c1y = y1 + (py - y0) / 6;
    const c2x = px - (x3 - x1) / 6;
    const c2y = py - (y3 - y1) / 6;
    return `${acc} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${px} ${py}`;
  }, '');
  const area = pts.length ? `${line} L ${pts[pts.length - 1][0]} ${H - pad.b} L ${pts[0][0]} ${H - pad.b} Z` : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly sign-ups">
      <defs>
        <linearGradient id="signupFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff7d4d" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ff7d4d" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#f3f4f6" />
          <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5e5e5e">
            {t}
          </text>
        </g>
      ))}
      {area ? <path d={area} fill="url(#signupFill)" /> : null}
      {line ? <path d={line} fill="none" stroke="#ff7d4d" strokeWidth="2.5" strokeLinecap="round" /> : null}
      {data.map((d, i) => (
        <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={x(i) - 24} y={pad.t} width={48} height={H - pad.t - pad.b} fill="transparent" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5e5e5e">
            {d.label}
          </text>
          {hover === i ? (
            <>
              <line x1={x(i)} x2={x(i)} y1={pad.t} y2={H - pad.b} stroke="#ff7d4d" strokeDasharray="3 3" strokeOpacity="0.5" />
              <circle cx={x(i)} cy={y(d.value)} r="5" fill="#fff" stroke="#ff7d4d" strokeWidth="2.5" />
              <g transform={`translate(${Math.min(Math.max(x(i), pad.l + 40), W - 50)}, ${Math.max(y(d.value) - 34, 4)})`}>
                <rect x="-40" y="0" width="80" height="24" rx="6" fill="#060702" />
                <text x="0" y="16" textAnchor="middle" fontSize="11.5" fill="#fff" fontWeight="600">
                  {d.value} sign-up{d.value === 1 ? '' : 's'}
                </text>
              </g>
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
