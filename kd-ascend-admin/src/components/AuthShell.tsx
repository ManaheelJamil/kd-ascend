import Image from 'next/image';

/** Centered card used by the login and first-time setup pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="KD Ascend" width={274} height={54} priority className="h-11 w-auto sm:h-[54px]" />
        </div>
        <div className="rounded-card border border-line bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-[22px] leading-7 sm:text-[27px] sm:leading-8 font-bold text-ink">{title}</h1>
          <p className="mt-1.5 text-[15.8px] text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
