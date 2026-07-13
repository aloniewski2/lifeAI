import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl text-ink-50">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-300">
          {subtitle}
        </p>
      </div>
      {action}
    </header>
  );
}
