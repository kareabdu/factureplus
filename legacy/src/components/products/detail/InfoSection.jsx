import React from "react";

export default function InfoSection({ title, action, children, className = "" }) {
  return (
    <section className={className}>
      {title && (
        <div className="flex items-end justify-between px-1 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {action}
        </div>
      )}
      <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
        {children}
      </div>
    </section>
  );
}