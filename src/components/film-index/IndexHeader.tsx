import Link from "next/link";

interface IndexHeaderProps {
  countLabel: string;
}

export function IndexHeader({ countLabel }: IndexHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-end gap-x-[28px] gap-y-[14px] pt-[22px] text-sm tracking-[0.01em]">
      <span className="text-muted">{countLabel}</span>
      <nav>
        <Link href="/actors" className="flex items-center gap-[9px] border-b border-ink pb-px">
          <span className="inline-block h-[9px] w-[9px] rounded-full bg-ink" />
          Actor network
        </Link>
      </nav>
    </header>
  );
}
