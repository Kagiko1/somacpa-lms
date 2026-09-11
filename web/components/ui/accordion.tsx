"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Accordion({
  title,
  meta,
  defaultOpen = false,
  children,
  className,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn("rounded-2xl border border-stone-200 bg-white", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-2">
          {meta}
          <span
            className={cn(
              "text-stone-400 transition-transform text-lg leading-none",
              open && "rotate-180"
            )}
          >
            ▾
          </span>
        </span>
      </button>
      {open && <div className="border-t border-stone-100 p-4 pt-3">{children}</div>}
    </div>
  );
}
